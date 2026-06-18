// Dispatches pending aggregator_outbound_events to the configured vendor.
// Cron-driven (every 2 min). Service-role only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { createHhaxAdapter } from "../_shared/aggregator/hhax.ts";
import { mapVisitToHhax } from "../_shared/aggregator/hhax.ts";
import { createSandataAdapter, mapVisitToSandata } from "../_shared/aggregator/sandata.ts";
import type { AggregatorAdapter, OutboundEventType } from "../_shared/aggregator/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BACKOFF_MIN = [1, 5, 15, 60, 360]; // minutes per attempt

function nextAttemptAt(attempts: number): string {
  const m = BACKOFF_MIN[Math.min(attempts, BACKOFF_MIN.length - 1)];
  return new Date(Date.now() + m * 60_000).toISOString();
}

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

  const limit = 50;
  const { data: events, error } = await supabase
    .from("aggregator_outbound_events")
    .select("*")
    .in("status", ["pending", "retry"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return json({ ok: false, error: error.message }, 500);
  }

  let processed = 0, accepted = 0, rejected = 0, retried = 0;

  for (const ev of events ?? []) {
    processed++;
    // Mark sending
    await supabase.from("aggregator_outbound_events")
      .update({ status: "sending", attempts: ev.attempts + 1 })
      .eq("id", ev.id);

    // Load connection + build adapter
    const { data: conn } = await supabase.from("aggregator_connections")
      .select("*").eq("id", ev.connection_id).maybeSingle();
    if (!conn) {
      await deadLetter(supabase, ev.id, "Connection not found");
      rejected++;
      continue;
    }

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
    const adapter: AggregatorAdapter =
      conn.vendor === "sandata" ? createSandataAdapter(cfg) : createHhaxAdapter(cfg);

    // Build payload — for visits, hydrate
    let payload = ev.payload as Record<string, unknown>;
    if (ev.source_table === "visits") {
      const { data: visit } = await supabase.from("visits").select("*").eq("id", ev.source_id).maybeSingle();
      if (visit) {
        const [{ data: client }, { data: caregiver }, { data: authorization }] = await Promise.all([
          supabase.from("clients").select("*").eq("id", visit.client_id).maybeSingle(),
          supabase.from("caregivers").select("*").eq("id", visit.caregiver_id).maybeSingle(),
          visit.authorization_id
            ? supabase.from("authorizations").select("*").eq("id", visit.authorization_id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        payload = conn.vendor === "sandata"
          ? mapVisitToSandata(visit, {
              client: client ?? undefined,
              caregiver: caregiver ?? undefined,
              authorization: authorization ?? undefined,
              account: (conn.config as Record<string, unknown> | null)?.account as string | undefined
                ?? conn.provider_id ?? undefined,
              group_code: (conn.config as Record<string, unknown> | null)?.group_code as string | undefined
                ?? conn.agency_id ?? undefined,
            })
          : mapVisitToHhax(visit, {
              client: client ?? undefined,
              caregiver: caregiver ?? undefined,
              authorization: authorization ?? undefined,
            });
      }
    }

    const ack = await adapter.push(ev.event_type as OutboundEventType, payload);
    const now = new Date().toISOString();

    if (ack.ok && (ack.status === "accepted" || ack.status === "pending")) {
      accepted++;
      await supabase.from("aggregator_outbound_events").update({
        status: ack.status === "accepted" ? "accepted" : "sent",
        sent_at: now,
        ack_at: ack.status === "accepted" ? now : null,
        vendor_ack_id: ack.vendor_ack_id ?? null,
        vendor_response: ack.raw ?? null,
        last_error: null,
      }).eq("id", ev.id);

      if (ev.source_table === "visits" && ack.status === "accepted") {
        await supabase.from("visits").update({
          aggregator_status: "accepted",
          aggregator_last_event_at: now,
          aggregator_vendor_visit_id: ack.vendor_ack_id ?? null,
        }).eq("id", ev.source_id);
      }
    } else {
      const attempts = ev.attempts + 1;
      if (attempts >= BACKOFF_MIN.length) {
        rejected++;
        await deadLetter(supabase, ev.id, ack.error ?? "Rejected by vendor");
        if (ev.source_table === "visits") {
          await supabase.from("visits").update({ aggregator_status: "rejected", aggregator_last_event_at: now })
            .eq("id", ev.source_id);
        }
      } else {
        retried++;
        await supabase.from("aggregator_outbound_events").update({
          status: "retry",
          last_error: ack.error ?? "unknown",
          next_attempt_at: nextAttemptAt(attempts),
          vendor_response: ack.raw ?? null,
        }).eq("id", ev.id);
      }
    }
  }

  return json({ ok: true, processed, accepted, rejected, retried });
});

async function deadLetter(supabase: ReturnType<typeof createClient>, id: string, msg: string) {
  await supabase.from("aggregator_outbound_events").update({
    status: "dead_letter",
    last_error: msg,
  }).eq("id", id);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}