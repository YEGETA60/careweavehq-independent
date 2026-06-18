// EVV Alert Engine
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const LATE_THRESHOLD_MIN = 15;
const OVERTIME_THRESHOLD_HOURS = 40;

function isoWeekStart(d: Date): string {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = dt.getUTCDay() || 7;
  if (day !== 1) dt.setUTCDate(dt.getUTCDate() - (day - 1));
  return dt.toISOString().slice(0, 10);
}

function minutesBetween(dateStr: string, timeStr: string, now: Date): number {
  const sched = new Date(`${dateStr}T${timeStr}:00Z`);
  return (now.getTime() - sched.getTime()) / 60000;
}

function durationHours(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0;
  const s = new Date(`1970-01-01T${start}:00Z`).getTime();
  const e = new Date(`1970-01-01T${end}:00Z`).getTime();
  return Math.max(0, (e - s) / 3600000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Recipients: admin emails (service-role lookup)
  const { data: adminRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  const adminIds = new Set((adminRoles ?? []).map((r: any) => r.user_id));
  const recipients: string[] = [];
  if (adminIds.size > 0) {
    const { data: usersList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    for (const u of usersList?.users ?? []) {
      if (adminIds.has(u.id) && u.email) recipients.push(u.email);
    }
  }

  if (recipients.length === 0) {
    return new Response(JSON.stringify({ ok: true, queued: 0, reason: "no admin recipients" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const since = new Date(now.getTime() - 36 * 3600 * 1000).toISOString().slice(0, 10);
  const { data: visits, error: vErr } = await supabase
    .from("visits")
    .select("id,date,start_time,end_time,status,verified_start_time,caregiver_id,client_id")
    .gte("date", since)
    .lte("date", today);
  if (vErr) {
    return new Response(JSON.stringify({ error: vErr.message }), { status: 500, headers: corsHeaders });
  }

  const cgIds = [...new Set((visits ?? []).map((v: any) => v.caregiver_id).filter(Boolean))] as string[];
  const clIds = [...new Set((visits ?? []).map((v: any) => v.client_id).filter(Boolean))] as string[];
  const placeholder = ["00000000-0000-0000-0000-000000000000"];
  const [{ data: cgs }, { data: cls }] = await Promise.all([
    supabase.from("caregivers").select("id,name").in("id", cgIds.length ? cgIds : placeholder),
    supabase.from("clients").select("id,name").in("id", clIds.length ? clIds : placeholder),
  ]);
  const cgMap = new Map<string, string>((cgs ?? []).map((c: any) => [c.id, c.name]));
  const clMap = new Map<string, string>((cls ?? []).map((c: any) => [c.id, c.name]));

  let queued = 0;

  async function send(alertType: string, entityId: string, periodKey: string, templateName: string, templateData: any) {
    for (const recipient of recipients) {
      const { error: dupErr } = await supabase.from("evv_alerts").insert({
        alert_type: alertType,
        entity_id: entityId,
        period_key: periodKey,
        recipient_email: recipient,
        metadata: templateData,
      });
      if (dupErr) continue; // duplicate or error — skip
      const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName,
          recipientEmail: recipient,
          idempotencyKey: `${alertType}-${entityId}-${periodKey}-${recipient}`,
          templateData,
        },
      });
      if (sendErr) console.error("send failed", sendErr);
      else queued++;
    }
  }

  for (const v of visits ?? []) {
    if (v.status === "Cancelled") continue;
    const caregiverName = cgMap.get(v.caregiver_id) ?? "Caregiver";
    const clientName = clMap.get(v.client_id) ?? "Client";
    const startedMinAgo = minutesBetween(v.date, v.start_time, now);
    const endedMinAgo = minutesBetween(v.date, v.end_time, now);
    const hasClockIn = !!v.verified_start_time;

    if (!hasClockIn && endedMinAgo > 15) {
      await send("missed_visit", v.id, v.id, "missed-visit", {
        caregiverName, clientName,
        scheduledStart: v.start_time, scheduledEnd: v.end_time, visitDate: v.date,
      });
      continue;
    }
    if (!hasClockIn && startedMinAgo >= LATE_THRESHOLD_MIN && endedMinAgo <= 15) {
      await send("late_clock_in", v.id, v.id, "late-clock-in", {
        caregiverName, clientName,
        scheduledStart: v.start_time, minutesLate: Math.round(startedMinAgo), visitDate: v.date,
      });
    }
  }

  // Overtime by ISO week (verified hours only)
  const weekStart = isoWeekStart(now);
  const { data: weekVisits } = await supabase
    .from("visits")
    .select("caregiver_id,verified_start_time,verified_end_time,verification_status,status")
    .gte("date", weekStart)
    .lte("date", today);

  const totals = new Map<string, number>();
  for (const v of weekVisits ?? []) {
    if (!["Verified", "Manual-Override"].includes(v.verification_status ?? "")) continue;
    if (v.status !== "Completed") continue;
    totals.set(
      v.caregiver_id,
      (totals.get(v.caregiver_id) ?? 0) + durationHours(v.verified_start_time, v.verified_end_time),
    );
  }

  for (const [cgId, hours] of totals) {
    if (hours < OVERTIME_THRESHOLD_HOURS) continue;
    let caregiverName = cgMap.get(cgId);
    if (!caregiverName) {
      const { data } = await supabase.from("caregivers").select("name").eq("id", cgId).maybeSingle();
      caregiverName = data?.name ?? "Caregiver";
    }
    await send("overtime", cgId, weekStart, "overtime", {
      caregiverName, weekStart,
      verifiedHours: Math.round(hours * 10) / 10,
      threshold: OVERTIME_THRESHOLD_HOURS,
    });
  }

  return new Response(JSON.stringify({ ok: true, queued }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});