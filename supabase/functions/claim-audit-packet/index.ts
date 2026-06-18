// Per-claim audit packet generator.
// Bundles claim, line items, EVV, authorization, signed timesheet refs,
// care plan, credentials, and prior 837/999/277CA/835 acknowledgments
// into a single JSON document, signs it with a SHA-256 hash, and uploads
// it to the private `claim-files` bucket. Returns a signed URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return j({ error: "no_auth" }, 401);
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return j({ error: "invalid_token" }, 401);

    const { claim_id } = await req.json();
    if (!claim_id) return j({ error: "missing_claim_id" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [claim, lines, diagnoses, acks, submissions] = await Promise.all([
      admin.from("claims").select("*").eq("id", claim_id).maybeSingle(),
      admin.from("claim_lines").select("*").eq("claim_id", claim_id),
      admin.from("claim_diagnoses").select("*").eq("claim_id", claim_id),
      admin.from("claim_acknowledgments").select("*").eq("claim_id", claim_id),
      admin.from("claim_submission_claims").select("*, claim_submissions(*)").eq("claim_id", claim_id),
    ]);
    if (!claim.data) return j({ error: "claim_not_found" }, 404);
    const { data: prof } = await admin
      .from("profiles").select("default_company_id").eq("id", u.user.id).maybeSingle();
    if (!prof?.default_company_id || claim.data.company_id !== prof.default_company_id) {
      return j({ error: "forbidden" }, 403);
    }
    const { data: roleRows } = await admin
      .from("user_roles").select("role").eq("user_id", u.user.id);
    const allowed = ["admin", "billing", "operations_manager", "manager"];
    if (!roleRows?.some((r: any) => allowed.includes(r.role))) {
      return j({ error: "forbidden" }, 403);
    }

    const visitIds: string[] = (lines.data ?? []).map((l: any) => l.visit_id).filter(Boolean);
    const [visits, signatures, recon] = await Promise.all([
      visitIds.length ? admin.from("visits").select("*").in("id", visitIds) : Promise.resolve({ data: [] }),
      visitIds.length ? admin.from("timesheet_signatures").select("*").in("visit_id", visitIds) : Promise.resolve({ data: [] }),
      visitIds.length ? admin.from("timesheet_evv_recon").select("*").in("visit_id", visitIds) : Promise.resolve({ data: [] }),
    ]);

    const [client, caregiver, payer, authz] = await Promise.all([
      claim.data.client_id ? admin.from("clients").select("*").eq("id", claim.data.client_id).maybeSingle() : Promise.resolve({ data: null }),
      claim.data.caregiver_id ? admin.from("caregivers").select("*").eq("id", claim.data.caregiver_id).maybeSingle() : Promise.resolve({ data: null }),
      claim.data.payer_id ? admin.from("payers").select("*").eq("id", claim.data.payer_id).maybeSingle() : Promise.resolve({ data: null }),
      claim.data.authorization_id ? admin.from("authorizations").select("*").eq("id", claim.data.authorization_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    const credentials = caregiver.data
      ? (await admin.from("credentials").select("*").eq("caregiver_id", caregiver.data.id)).data
      : [];
    const exclusion = caregiver.data
      ? (await admin.from("exclusion_checks").select("*").eq("caregiver_id", caregiver.data.id).order("checked_at", { ascending: false }).limit(1)).data
      : [];

    const packet = {
      generated_at: new Date().toISOString(),
      generated_by: u.user.id,
      version: "1.0",
      claim: claim.data,
      diagnoses: diagnoses.data ?? [],
      lines: lines.data ?? [],
      visits: visits.data ?? [],
      timesheet_signatures: signatures.data ?? [],
      evv_reconciliation: recon.data ?? [],
      client: client.data,
      caregiver: caregiver.data,
      caregiver_credentials: credentials ?? [],
      caregiver_exclusion_check: exclusion ?? [],
      payer: payer.data,
      authorization: authz.data,
      submissions: submissions.data ?? [],
      acknowledgments: acks.data ?? [],
    };

    const json = JSON.stringify(packet, null, 2);
    const hash = await sha256(json);
    const path = `audit-packets/${claim.data.company_id}/${claim_id}-${Date.now()}.json`;
    const { error: upErr } = await admin.storage.from("claim-files").upload(path, new Blob([json], { type: "application/json" }), {
      contentType: "application/json",
      upsert: false,
    });
    if (upErr) return j({ error: upErr.message }, 500);

    const { data: signed } = await admin.storage.from("claim-files").createSignedUrl(path, 3600);

    await admin.from("phi_access_log").insert({
      user_id: u.user.id,
      company_id: claim.data.company_id,
      action: "export",
      entity: "claim_audit_packet",
      entity_id: claim_id,
      reason: "audit",
      metadata: { sha256: hash, path },
    });

    return j({ ok: true, sha256: hash, path, url: signed?.signedUrl, bytes: json.length });
  } catch (e) {
    return j({ error: String(e) }, 500);
  }
});

function j(p: unknown, status = 200) {
  return new Response(JSON.stringify(p), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}