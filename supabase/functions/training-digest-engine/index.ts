// Training Overdue Digest Engine
// - Aggregates expired / due-soon / missing training across all staff
// - Sends a weekly digest email to admins, managers, operations_managers, supervisors
// - Dedupes per (admin, week) via reminder_log
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://careweavehq.com";

const ADMIN_ROLES = ["admin", "manager", "operations_manager", "supervisor"];

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
}

function startOfWeekISO(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day; // Sunday
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff)).toISOString().slice(0, 10);
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
  const weekOf = startOfWeekISO();

  const { data: usersList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailByUserId = new Map<string, string>();
  const nameByUserId = new Map<string, string>();
  for (const u of usersList?.users ?? []) {
    if (u.email) emailByUserId.set(u.id, u.email);
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    const name = (meta.full_name as string) || (meta.name as string) || u.email || "Staff";
    nameByUserId.set(u.id, name);
  }

  const [{ data: courses }, { data: completions }, { data: roles }] = await Promise.all([
    supabase.from("training_courses").select("id,title,required_for_roles,company_id,active").eq("active", true),
    supabase.from("training_completions").select("user_id,course_id,completed_at,expires_at"),
    supabase.from("user_roles").select("user_id,role"),
  ]);

  if (!courses || !roles) {
    return new Response(JSON.stringify({ ok: false, error: "data fetch failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const rolesByUser = new Map<string, string[]>();
  for (const r of roles) {
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(r.role);
    rolesByUser.set(r.user_id, arr);
  }

  const latestByKey = new Map<string, { completed_at: string; expires_at: string | null }>();
  for (const c of completions ?? []) {
    const key = `${c.user_id}:${c.course_id}`;
    const prev = latestByKey.get(key);
    if (!prev || new Date(c.completed_at) > new Date(prev.completed_at)) {
      latestByKey.set(key, { completed_at: c.completed_at, expires_at: c.expires_at });
    }
  }

  type UserAgg = { name: string; email?: string; expired: number; dueSoon: number; missing: number; courses: string[] };
  const userAgg = new Map<string, UserAgg>();

  for (const [userId, userRoles] of rolesByUser.entries()) {
    if (!emailByUserId.has(userId)) continue;
    for (const c of courses) {
      const required = (c.required_for_roles ?? []).some((r: string) => userRoles.includes(r));
      if (!required) continue;
      const latest = latestByKey.get(`${userId}:${c.id}`);
      let bucket: "expired" | "dueSoon" | "missing" | null = null;
      if (!latest) bucket = "missing";
      else if (latest.expires_at) {
        const d = daysUntil(latest.expires_at);
        if (d !== null && d < 0) bucket = "expired";
        else if (d !== null && d <= 30) bucket = "dueSoon";
      }
      if (!bucket) continue;
      const agg = userAgg.get(userId) ?? {
        name: nameByUserId.get(userId) ?? "Staff",
        email: emailByUserId.get(userId),
        expired: 0, dueSoon: 0, missing: 0, courses: [],
      };
      agg[bucket] += 1;
      if (agg.courses.length < 8) agg.courses.push(c.title);
      userAgg.set(userId, agg);
    }
  }

  const users = [...userAgg.values()].sort((a, b) =>
    (b.expired - a.expired) || (b.dueSoon - a.dueSoon) || (b.missing - a.missing)
  );
  const totals = users.reduce(
    (acc, u) => ({ expired: acc.expired + u.expired, dueSoon: acc.dueSoon + u.dueSoon, missing: acc.missing + u.missing, usersAffected: acc.usersAffected + 1 }),
    { expired: 0, dueSoon: 0, missing: 0, usersAffected: 0 },
  );

  // Recipients = anyone with an admin/management role
  const recipientIds = new Set<string>();
  for (const r of roles) if (ADMIN_ROLES.includes(r.role)) recipientIds.add(r.user_id);

  let queued = 0, skipped = 0;
  for (const adminId of recipientIds) {
    const email = emailByUserId.get(adminId);
    if (!email) continue;
    const periodKey = `digest:${weekOf}`;

    const { error: dupErr } = await supabase.from("reminder_log").insert({
      reminder_type: "training-overdue-digest",
      entity_id: adminId,
      period_key: periodKey,
      recipient_email: email,
      metadata: { usersAffected: totals.usersAffected, weekOf },
    });
    if (dupErr) { skipped += 1; continue; }

    const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "training-overdue-digest",
        recipientEmail: email,
        idempotencyKey: `training-digest-${adminId}-${weekOf}`,
        templateData: {
          recipientName: nameByUserId.get(adminId),
          weekOf,
          totals,
          users: users.slice(0, 50),
          appUrl: APP_URL,
        },
      },
    });
    if (!sendErr) queued += 1;
  }

  return new Response(
    JSON.stringify({ ok: true, queued, skipped, recipients: recipientIds.size, totals }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});