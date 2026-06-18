import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  visit_id: string;
  event_type: "clock_in" | "clock_out";
  lat?: number;
  lng?: number;
  accuracy?: number;
  manual_reason?: string;
  notes?: string;
  tasks_completed?: string[];
}

function haversine(a: number, b: number, c: number, d: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(c - a);
  const dLng = toRad(d - b);
  const lat1 = toRad(a);
  const lat2 = toRad(c);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nowTime(): string {
  return new Date().toISOString().slice(11, 19);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "no_auth" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "invalid_token" }, 401);

    const body = (await req.json()) as Body;
    if (!body.visit_id || !["clock_in", "clock_out"].includes(body.event_type)) {
      return json({ error: "invalid_payload" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve caregiver
    const { data: cg } = await admin
      .from("caregivers").select("id, company_id")
      .eq("user_id", u.user.id).maybeSingle();
    if (!cg) return json({ error: "not_a_caregiver" }, 403);

    // Pre-visit gating: enforce credentials + exclusion check on clock-in
    if (body.event_type === "clock_in") {
      const { data: gate, error: gateErr } = await admin.rpc(
        "can_caregiver_clock_in",
        { _caregiver_id: cg.id },
      );
      if (gateErr) return json({ error: gateErr.message }, 500);
      const g = gate as {
        ok: boolean;
        missing_credentials: string[];
        expired_credentials: string[];
        excluded: boolean;
      };
      if (!g?.ok) {
        return json({
          error: "credentials_block",
          missing_credentials: g?.missing_credentials ?? [],
          expired_credentials: g?.expired_credentials ?? [],
          excluded: g?.excluded ?? false,
          message: g?.excluded
            ? "Caregiver is on a federal exclusion list. Clock-in blocked."
            : "Required credentials are missing or expired. Contact your supervisor.",
        }, 403);
      }
    }

    // Fetch visit + client
    const { data: visit } = await admin
      .from("visits")
      .select("id, caregiver_id, client_id, status, verified_start_time, clients:client_id(lat, lng, geofence_meters)")
      .eq("id", body.visit_id).maybeSingle();
    if (!visit || visit.caregiver_id !== cg.id) {
      return json({ error: "visit_not_found" }, 404);
    }

    const client: any = (visit as any).clients;
    let withinRadius: boolean | null = null;
    let distance: number | null = null;
    if (body.lat != null && body.lng != null && client?.lat && client?.lng) {
      distance = haversine(Number(client.lat), Number(client.lng), body.lat, body.lng);
      withinRadius = distance <= (client.geofence_meters ?? 150);
    }

    const verification_status = body.manual_reason
      ? "Manual-Override"
      : withinRadius === true
        ? "Verified"
        : withinRadius === false
          ? "Pending-Review"
          : "Pending-Review";

    const update: any = { verification_status };
    if (body.event_type === "clock_in") {
      update.verified_start_time = nowTime();
      update.clock_in_lat = body.lat ?? null;
      update.clock_in_lng = body.lng ?? null;
      update.status = "In Progress";
    } else {
      update.verified_end_time = nowTime();
      update.clock_out_lat = body.lat ?? null;
      update.clock_out_lng = body.lng ?? null;
      update.status = "Completed";
      if (body.tasks_completed) update.tasks_completed = body.tasks_completed;
    }
    const issues: string[] = [];
    if (withinRadius === false) issues.push(`Out of geofence (${Math.round(distance!)}m)`);
    if (body.manual_reason) issues.push(`Manual: ${body.manual_reason}`);
    if (issues.length) update.verification_issues = issues;

    const { error: upErr } = await admin.from("visits").update(update).eq("id", visit.id);
    if (upErr) return json({ error: upErr.message }, 500);

    if (body.event_type === "clock_out" && body.notes) {
      await admin.from("visit_notes").insert({
        visit_id: visit.id,
        company_id: cg.company_id,
        author_id: u.user.id,
        subjective: body.notes,
      });
    }

    return json({
      ok: true,
      verification_status,
      within_radius: withinRadius,
      distance_meters: distance,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(p: unknown, status = 200) {
  return new Response(JSON.stringify(p), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}