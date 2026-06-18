// Visit Reminder Engine
// - Caregiver daily schedule digests (sent once per caregiver per day, after 5am local UTC scan)
// - Client/family visit reminders (sent ~24h before scheduled visit)
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function todayISO(now: Date) { return now.toISOString().slice(0, 10); }
function addDaysISO(now: Date, days: number) {
  const d = new Date(now.getTime() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || req.headers.get("x-cron-secret") !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const now = new Date();
  const today = todayISO(now);
  const tomorrow = addDaysISO(now, 1);

  let dailyQueued = 0;
  let reminderQueued = 0;

  async function recordAndSend(
    type: string, entityId: string, periodKey: string, recipient: string,
    templateName: string, templateData: any,
  ): Promise<boolean> {
    const { error: dupErr } = await supabase.from("reminder_log").insert({
      reminder_type: type, entity_id: entityId, period_key: periodKey,
      recipient_email: recipient, metadata: templateData,
    });
    if (dupErr) return false; // duplicate => skip
    const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName, recipientEmail: recipient,
        idempotencyKey: `${type}-${entityId}-${periodKey}-${recipient}`,
        templateData,
      },
    });
    return !sendErr;
  }

  // ---------- Build user-email map (admin-only API) ----------
  const { data: usersList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailByUserId = new Map<string, string>();
  for (const u of usersList?.users ?? []) if (u.email) emailByUserId.set(u.id, u.email);

  // ---------- 1) Caregiver daily schedule digests ----------
  const { data: todayVisits } = await supabase
    .from("visits")
    .select("id,date,start_time,end_time,client_id,caregiver_id,status")
    .eq("date", today)
    .neq("status", "Cancelled");

  const visitsByCaregiver = new Map<string, any[]>();
  for (const v of todayVisits ?? []) {
    if (!v.caregiver_id) continue;
    const arr = visitsByCaregiver.get(v.caregiver_id) ?? [];
    arr.push(v);
    visitsByCaregiver.set(v.caregiver_id, arr);
  }

  const cgIds = [...visitsByCaregiver.keys()];
  if (cgIds.length > 0) {
    const { data: cgs } = await supabase
      .from("caregivers").select("id,name,user_id").in("id", cgIds);
    const clientIds = [...new Set((todayVisits ?? []).map((v: any) => v.client_id).filter(Boolean))];
    const { data: cls } = await supabase
      .from("clients").select("id,name,address").in("id", clientIds.length ? clientIds : ["00000000-0000-0000-0000-000000000000"]);
    const clientMap = new Map<string, any>((cls ?? []).map((c: any) => [c.id, c]));

    for (const cg of cgs ?? []) {
      const email = cg.user_id ? emailByUserId.get(cg.user_id) : null;
      if (!email) continue;
      const list = (visitsByCaregiver.get(cg.id) ?? [])
        .sort((a: any, b: any) => (a.start_time ?? "").localeCompare(b.start_time ?? ""))
        .map((v: any) => {
          const cl = clientMap.get(v.client_id);
          return {
            startTime: v.start_time, endTime: v.end_time,
            clientName: cl?.name ?? "Client", address: cl?.address ?? undefined,
          };
        });
      const ok = await recordAndSend(
        "daily-schedule", cg.id, today, email,
        "daily-schedule", { caregiverName: cg.name, date: today, visits: list },
      );
      if (ok) dailyQueued += 1;
    }
  }

  // ---------- 2) Visit reminders to clients/families (~24h ahead) ----------
  const { data: tomorrowVisits } = await supabase
    .from("visits")
    .select("id,date,start_time,end_time,client_id,caregiver_id,status")
    .eq("date", tomorrow)
    .neq("status", "Cancelled");

  if ((tomorrowVisits ?? []).length > 0) {
    const cIds = [...new Set(tomorrowVisits!.map((v: any) => v.client_id).filter(Boolean))];
    const cgIds2 = [...new Set(tomorrowVisits!.map((v: any) => v.caregiver_id).filter(Boolean))];
    const placeholder = ["00000000-0000-0000-0000-000000000000"];
    const [{ data: cls }, { data: cgs }, { data: links }] = await Promise.all([
      supabase.from("clients").select("id,name").in("id", cIds.length ? cIds : placeholder),
      supabase.from("caregivers").select("id,name").in("id", cgIds2.length ? cgIds2 : placeholder),
      supabase.from("client_users").select("client_id,user_id").in("client_id", cIds.length ? cIds : placeholder),
    ]);
    const clMap = new Map<string, any>((cls ?? []).map((c: any) => [c.id, c]));
    const cgMap = new Map<string, any>((cgs ?? []).map((c: any) => [c.id, c]));
    const familyByClient = new Map<string, string[]>();
    for (const l of links ?? []) {
      const email = emailByUserId.get(l.user_id);
      if (!email) continue;
      const arr = familyByClient.get(l.client_id) ?? [];
      arr.push(email);
      familyByClient.set(l.client_id, arr);
    }

    for (const v of tomorrowVisits!) {
      const recipients = familyByClient.get(v.client_id) ?? [];
      if (recipients.length === 0) continue;
      const cl = clMap.get(v.client_id);
      const cg = v.caregiver_id ? cgMap.get(v.caregiver_id) : null;
      for (const recipient of recipients) {
        const ok = await recordAndSend(
          "visit-reminder", v.id, tomorrow, recipient,
          "visit-reminder",
          {
            clientName: cl?.name,
            caregiverName: cg?.name,
            visitDate: v.date,
            startTime: v.start_time,
            endTime: v.end_time,
          },
        );
        if (ok) reminderQueued += 1;
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, dailyQueued, reminderQueued }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});