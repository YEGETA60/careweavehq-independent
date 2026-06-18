// Polls the aggregator for inbound notifications (auth changes, rejections, etc.)
// and writes them to aggregator_inbound_events for admin review/auto-apply.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { createHhaxAdapter } from "../_shared/aggregator/hhax.ts";
import { createSandataAdapter } from "../_shared/aggregator/sandata.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || req.headers.get("x-cron-secret") !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: connections } = await supabase
    .from("aggregator_connections").select("*").eq("status", "active");

  let total = 0;
  for (const conn of connections ?? []) {
    const apiKey = conn.api_key_secret_ref ? Deno.env.get(conn.api_key_secret_ref) : undefined;
    const cfg = {
      vendor: conn.vendor,
      state: conn.state,
      environment: conn.environment,
      api_base_url: conn.api_base_url,
      agency_id: conn.agency_id,
      provider_id: conn.provider_id,
      api_key: apiKey,
      config: conn.config ?? {},
    };
    const adapter = conn.vendor === "sandata"
      ? createSandataAdapter(cfg)
      : createHhaxAdapter(cfg);
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const items = await adapter.pull(since).catch(() => []);
    for (const item of items) {
      await supabase.from("aggregator_inbound_events").insert({
        company_id: conn.company_id,
        connection_id: conn.id,
        event_type: item.event_type,
        payload: item.payload,
      });
      total++;
    }
    await supabase.from("aggregator_connections").update({ last_handshake_at: new Date().toISOString() })
      .eq("id", conn.id);
  }

  return new Response(JSON.stringify({ ok: true, ingested: total }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});