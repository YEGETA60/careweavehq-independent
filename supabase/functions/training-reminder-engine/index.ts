// Training Reminder Engine
// - Scans required training_courses for each user (by role)
// - Sends reminder emails when a completion is expired or expiring soon
// - Uses reminder_log to dedupe per user/course/period
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://careweavehq.com";

// Reminder windows (days before expiry). Each window is its own period bucket.
const WINDOWS = [30, 14, 7, 1, 0, -1]; // 0 = expires today, -1 = already expired

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
}

function bucketFor(days: number | null): string | null {
  if (days === null) return "missing"; // never completed
  if (days < 0) return "expired";
  if (days <= 1) return "due-1";
  if (days <= 7) return "due-7";
  if (days <= 14) return "due-14";
  if (days <= 30) return "due-30";
  return null;
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
  let queued = 0;
  let skipped = 0;

  // Build user-email map
  const { data: usersList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailByUserId = new Map<string, string>();
  for (const u of usersList?.users ?? []) if (u.email) emailByUserId.set(u.id, u.email);

  const [{ data: courses }, { data: completions }, { data: roles }] = await Promise.all([
    supabase.from("training_courses").select("id,title,external_url,required_for_roles,renewal_months,active").eq("active", true),
    supabase.from("training_completions").select("user_id,course_id,completed_at,expires_at"),
    supabase.from("user_roles").select("user_id,role"),
  ]);

  if (!courses || !roles) {
    return new Response(JSON.stringify({ ok: false, error: "data fetch failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // user -> roles
  const rolesByUser = new Map<string, string[]>();
  for (const r of roles) {
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(r.role);
    rolesByUser.set(r.user_id, arr);
  }

  // (user,course) -> latest completion
  const latestByKey = new Map<string, { completed_at: string; expires_at: string | null }>();
  for (const c of completions ?? []) {
    const key = `${c.user_id}:${c.course_id}`;
    const prev = latestByKey.get(key);
    if (!prev || new Date(c.completed_at) > new Date(prev.completed_at)) {
      latestByKey.set(key, { completed_at: c.completed_at, expires_at: c.expires_at });
    }
  }

  // For each user, build list of courses needing attention, then send one email per user
  type Item = { courseId: string; title: string; status: string; expiresOn?: string; bucket: string; url?: string };
  const itemsByUser = new Map<string, Item[]>();
  const courseBucketByUser = new Map<string, Map<string, string>>(); // for log dedupe

  for (const [userId, userRoles] of rolesByUser.entries()) {
    if (!emailByUserId.has(userId)) continue;
    for (const c of courses) {
      const required = (c.required_for_roles ?? []).some((r: string) => userRoles.includes(r));
      if (!required) continue;
      const latest = latestByKey.get(`${userId}:${c.id}`);
      const days = latest?.expires_at ? daysUntil(latest.expires_at) : (latest ? null : null);
      let bucket: string | null = null;
      let status = "";
      let expiresOn: string | undefined;
      if (!latest) {
        bucket = "missing";
        status = "not started";
      } else if (latest.expires_at) {
        bucket = bucketFor(days);
        expiresOn = latest.expires_at.slice(0, 10);
        if (bucket === "expired") status = "expired";
        else if (bucket) status = `expires in ${days} day${days === 1 ? "" : "s"}`;
      }
      if (!bucket) continue;
      const arr = itemsByUser.get(userId) ?? [];
      arr.push({ courseId: c.id, title: c.title, status, expiresOn, bucket, url: c.external_url ?? undefined });
      itemsByUser.set(userId, arr);
      const cb = courseBucketByUser.get(userId) ?? new Map();
      cb.set(c.id, bucket);
      courseBucketByUser.set(userId, cb);
    }
  }

  for (const [userId, items] of itemsByUser.entries()) {
    const email = emailByUserId.get(userId)!;
    // periodKey is a stable hash of (course:bucket) pairs so we don't repeat same digest
    const cb = courseBucketByUser.get(userId)!;
    const periodKey = [...cb.entries()].sort().map(([k, v]) => `${k}=${v}`).join("|").slice(0, 200);

    const { error: dupErr } = await supabase.from("reminder_log").insert({
      reminder_type: "training-expiration",
      entity_id: userId,
      period_key: periodKey,
      recipient_email: email,
      metadata: { count: items.length },
    });
    if (dupErr) { skipped += 1; continue; }

    const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "training-expiration",
        recipientEmail: email,
        idempotencyKey: `training-${userId}-${periodKey}`,
        templateData: {
          courses: items.map(i => ({ title: i.title, status: i.status, expiresOn: i.expiresOn, url: i.url })),
          appUrl: APP_URL,
        },
      },
    });
    if (!sendErr) queued += 1;
  }

  return new Response(
    JSON.stringify({ ok: true, queued, skipped, usersScanned: rolesByUser.size }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});