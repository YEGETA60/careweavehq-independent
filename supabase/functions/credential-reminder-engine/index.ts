// Credential & License Expiration Reminder Engine
// Scans public.credentials, alerts caregivers (their own) and company admins (digest)
// when items expire in 30/14/7/1/0 days or are already expired.
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://careweavehq.com";

function bucketFor(days: number): string | null {
  if (days < 0) return "expired";
  if (days <= 7) return "due-7";
  if (days <= 30) return "due-30";
  if (days <= 60) return "due-60";
  return null;
}

function statusLabel(days: number): string {
  if (days < 0) return "expired";
  if (days === 0) return "expires today";
  return `expires in ${days} day${days === 1 ? "" : "s"}`;
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
  let queued = 0, skipped = 0;

  const { data: creds, error: cErr } = await supabase
    .from("credentials")
    .select("id,caregiver_id,company_id,type,number,expiry_date");
  if (cErr || !creds) {
    return new Response(JSON.stringify({ ok: false, error: cErr?.message ?? "no creds" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const today = new Date(); today.setHours(0,0,0,0);
  type Item = { credId: string; caregiver_id: string; company_id: string | null; type: string; number: string | null; expiresOn: string; days: number; bucket: string };
  const items: Item[] = [];
  for (const c of creds) {
    if (!c.expiry_date) continue;
    const d = new Date(c.expiry_date); d.setHours(0,0,0,0);
    const days = Math.round((d.getTime() - today.getTime()) / 86400000);
    const bucket = bucketFor(days);
    if (!bucket) continue;
    items.push({ credId: c.id, caregiver_id: c.caregiver_id, company_id: c.company_id, type: c.type, number: c.number, expiresOn: c.expiry_date, days, bucket });
  }

  // Resolve caregiver -> user_id, name + email
  const cgIds = [...new Set(items.map(i => i.caregiver_id))];
  const { data: caregivers } = await supabase.from("caregivers").select("id,name,user_id,company_id").in("id", cgIds.length ? cgIds : ["00000000-0000-0000-0000-000000000000"]);
  const cgById = new Map<string, { name: string; user_id: string | null; company_id: string | null }>();
  for (const cg of caregivers ?? []) cgById.set(cg.id, { name: cg.name, user_id: cg.user_id, company_id: cg.company_id });

  const { data: usersList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailByUserId = new Map<string, string>();
  for (const u of usersList?.users ?? []) if (u.email) emailByUserId.set(u.id, u.email);

  // ---- Per-caregiver reminders ----
  const byCaregiver = new Map<string, Item[]>();
  for (const it of items) {
    const arr = byCaregiver.get(it.caregiver_id) ?? [];
    arr.push(it); byCaregiver.set(it.caregiver_id, arr);
  }

  for (const [cgId, list] of byCaregiver.entries()) {
    const cg = cgById.get(cgId);
    if (!cg?.user_id) continue;
    const email = emailByUserId.get(cg.user_id);
    if (!email) continue;
    const periodKey = list.map(i => `${i.credId}=${i.bucket}`).sort().join("|").slice(0, 200);
    const { error: dupErr } = await supabase.from("reminder_log").insert({
      reminder_type: "credential-expiration", entity_id: cg.user_id,
      period_key: periodKey, recipient_email: email, metadata: { count: list.length },
      company_id: cg.company_id,
    });
    if (dupErr) { skipped++; continue; }
    const { error: sErr } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "credential-expiration",
        recipientEmail: email,
        idempotencyKey: `cred-${cg.user_id}-${periodKey}`,
        templateData: {
          recipientName: cg.name,
          audience: "caregiver",
          appUrl: APP_URL,
          credentials: list.map(i => ({ type: i.type, number: i.number ?? undefined, status: statusLabel(i.days), expiresOn: i.expiresOn })),
        },
      },
    });
    if (!sErr) queued++;
  }

  // ---- Per-company admin digest ----
  const byCompany = new Map<string, Item[]>();
  for (const it of items) {
    const k = it.company_id ?? "_none";
    const arr = byCompany.get(k) ?? [];
    arr.push(it); byCompany.set(k, arr);
  }

  for (const [companyId, list] of byCompany.entries()) {
    if (companyId === "_none") continue;
    // Find admin/manager users in company
    const { data: cu } = await supabase.from("company_users")
      .select("user_id,company_role").eq("company_id", companyId)
      .in("company_role", ["owner", "admin"]);
    const adminIds = (cu ?? []).map(r => r.user_id);
    if (adminIds.length === 0) continue;

    const periodKey = list.map(i => `${i.credId}=${i.bucket}`).sort().join("|").slice(0, 200);
    for (const uid of adminIds) {
      const email = emailByUserId.get(uid);
      if (!email) continue;
      const { error: dupErr } = await supabase.from("reminder_log").insert({
        reminder_type: "credential-expiration-admin", entity_id: uid,
        period_key: periodKey, recipient_email: email,
        metadata: { count: list.length, company_id: companyId },
        company_id: companyId,
      });
      if (dupErr) { skipped++; continue; }
      const { error: sErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "credential-expiration",
          recipientEmail: email,
          idempotencyKey: `cred-admin-${uid}-${periodKey}`,
          templateData: {
            audience: "admin",
            appUrl: APP_URL,
            credentials: list.map(i => ({
              caregiver: cgById.get(i.caregiver_id)?.name ?? "Unknown",
              type: i.type, number: i.number ?? undefined,
              status: statusLabel(i.days), expiresOn: i.expiresOn,
            })),
          },
        },
      });
      if (!sErr) queued++;
    }
  }

  return new Response(JSON.stringify({ ok: true, queued, skipped, scanned: items.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});