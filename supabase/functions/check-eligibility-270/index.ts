// Real-time payer eligibility (270/271).
// Provider-agnostic: dispatches to ChangeHealthcare/Availity/Waystar based on
// secrets present, else returns a deterministic MOCK 271 (clearly labeled).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EligRequest { client_id: string; payer_id?: string; service_date?: string; service_type?: string; }

async function callClearinghouse(req: EligRequest, client: any, payer: any) {
  const ch = (Deno.env.get("CLEARINGHOUSE") ?? "mock").toLowerCase();
  // Real implementations would POST X12 270 to the chosen vendor and parse 271.
  // Stubs intentionally fall through to MOCK if vendor secrets are missing.
  if (ch === "changehealthcare" && Deno.env.get("CHC_CLIENT_ID")) {
    // TODO: real CHC call
  }
  if (ch === "availity" && Deno.env.get("AVAILITY_CLIENT_ID")) {
    // TODO: real Availity call
  }
  // MOCK 271
  const active = !!(client?.medicaid_id || client?.insurance_member_id);
  return {
    provider: "mock",
    status: active ? "active" : "inactive",
    is_active: active,
    member_id: client?.medicaid_id ?? client?.insurance_member_id ?? "UNKNOWN",
    group_number: payer?.group_number ?? null,
    plan_name: payer?.name ?? null,
    coverage_start: client?.coverage_start ?? null,
    coverage_end: client?.coverage_end ?? null,
    copay_amount: 0,
    deductible_remaining: 0,
    oop_remaining: 0,
    raw_271: { mock: true, generated_at: new Date().toISOString() },
  };
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

    const body: EligRequest = await req.json();
    if (!body.client_id) return j({ error: "missing_client_id" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: client } = await admin.from("clients").select("*").eq("id", body.client_id).maybeSingle();
    if (!client) return j({ error: "client_not_found" }, 404);
    const { data: prof } = await admin
      .from("profiles").select("default_company_id").eq("id", u.user.id).maybeSingle();
    if (!prof?.default_company_id || client.company_id !== prof.default_company_id) {
      return j({ error: "forbidden" }, 403);
    }
    const { data: roleRows } = await admin
      .from("user_roles").select("role").eq("user_id", u.user.id);
    const allowed = ["admin", "billing", "scheduler", "manager", "operations_manager"];
    if (!roleRows?.some((r: any) => allowed.includes(r.role))) {
      return j({ error: "forbidden" }, 403);
    }
    const { data: payer } = body.payer_id
      ? await admin.from("payers").select("*").eq("id", body.payer_id).maybeSingle()
      : { data: null };

    const result = await callClearinghouse(body, client, payer);

    const { data: row, error } = await admin.from("eligibility_checks").insert({
      company_id: client.company_id,
      client_id: client.id,
      payer_id: body.payer_id ?? null,
      service_date: body.service_date ?? new Date().toISOString().slice(0, 10),
      service_type: body.service_type ?? "30",
      status: result.status,
      is_active: result.is_active,
      member_id: result.member_id,
      group_number: result.group_number,
      plan_name: result.plan_name,
      coverage_start: result.coverage_start,
      coverage_end: result.coverage_end,
      copay_amount: result.copay_amount,
      deductible_remaining: result.deductible_remaining,
      oop_remaining: result.oop_remaining,
      raw_271: result.raw_271,
      provider: result.provider,
      checked_by: u.user.id,
    }).select().maybeSingle();
    if (error) return j({ error: error.message }, 500);

    await admin.from("phi_access_log").insert({
      user_id: u.user.id, company_id: client.company_id,
      action: "view", entity: "eligibility_check", entity_id: row?.id,
      reason: "treatment", metadata: { provider: result.provider },
    });
    return j({ ok: true, eligibility: row });
  } catch (e) {
    return j({ error: String(e) }, 500);
  }
});
function j(p: unknown, status = 200) {
  return new Response(JSON.stringify(p), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}