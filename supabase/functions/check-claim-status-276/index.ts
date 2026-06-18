// 276/277 Real-time Claim Status — clearinghouse-agnostic.
// Falls back to mock when CLEARINGHOUSE_API_URL is not configured.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "unauthorized" }, 401);

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );

  const { data: { user } } = await supa.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const claim_id = body?.claim_id;
  if (!claim_id) return json({ error: "claim_id required" }, 400);

  // Rate limit per user: 30 / minute
  const { data: ok } = await supa.rpc("rate_limit_check" as any, {
    _key: `claim-status:${user.id}`, _window_seconds: 60, _max_requests: 30,
  } as any).catch(() => ({ data: true } as any));
  if (ok === false) return json({ error: "rate_limited" }, 429);

  const { data: claim, error: claimErr } = await supa.from("claims")
    .select("id, claim_number, company_id, total_charge, service_start, service_end, status").eq("id", claim_id).maybeSingle();
  if (claimErr || !claim) return json({ error: "claim_not_found" }, 404);

  const apiUrl = Deno.env.get("CLEARINGHOUSE_276_URL");
  let statusPayload: any;

  if (apiUrl) {
    try {
      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("CLEARINGHOUSE_API_KEY") ?? ""}`,
        },
        body: JSON.stringify({
          claim_number: claim.claim_number,
          service_start: claim.service_start,
          service_end: claim.service_end,
          total_charge: claim.total_charge,
        }),
      });
      statusPayload = await resp.json();
    } catch (e) {
      statusPayload = { error: String(e), mock: true, ...mockResponse(claim) };
    }
  } else {
    statusPayload = mockResponse(claim);
  }

  const { data: inserted } = await supa.from("claim_status_checks").insert({
    company_id: claim.company_id,
    claim_id,
    status_code: statusPayload.status_code,
    status_category: statusPayload.status_category,
    status_description: statusPayload.status_description,
    effective_date: statusPayload.effective_date,
    payer_claim_control_number: statusPayload.payer_claim_control_number,
    raw_response: statusPayload,
    checked_by: user.id,
  }).select().maybeSingle();

  return json({ ok: true, status: statusPayload, record: inserted });
});

function mockResponse(claim: any) {
  // STC02/STC01 codes — mocked plausible response
  return {
    mock: true,
    status_code: "F1",
    status_category: "Finalized",
    status_description: "Finalized/Payment - The claim/encounter has been paid.",
    effective_date: claim.service_end,
    payer_claim_control_number: `MOCK-${claim.claim_number}`,
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}