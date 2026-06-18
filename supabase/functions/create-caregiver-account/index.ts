// Creates an auth user for an orphan caregiver, links it to the caregiver row,
// grants the 'caregiver' role, sends an invite email, and auto-assigns trainings
// required for that role. Employment record is auto-created via DB trigger.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: ures } = await userClient.auth.getUser();
    const caller = ures?.user;
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Permission: must be admin/manager/ops/supervisor
    const allowedRoles = ["admin", "manager", "operations_manager", "supervisor"] as const;
    const { data: roleRows } = await admin
      .from("user_roles").select("role").eq("user_id", caller.id);
    const callerRoles = (roleRows ?? []).map((r: any) => r.role);
    if (!callerRoles.some((r: string) => (allowedRoles as readonly string[]).includes(r))) {
      return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const caregiver_id = String(body.caregiver_id ?? "").trim();
    if (!caregiver_id) return json({ error: "caregiver_id required" }, 400);

    const { data: cg, error: cgErr } = await admin
      .from("caregivers")
      .select("id, name, email, phone, user_id, company_id")
      .eq("id", caregiver_id)
      .maybeSingle();
    if (cgErr) return json({ error: cgErr.message }, 400);
    if (!cg) return json({ error: "Caregiver not found" }, 404);
    const { data: callerProf } = await admin
      .from("profiles").select("default_company_id").eq("id", caller.id).maybeSingle();
    if (!callerProf?.default_company_id || cg.company_id !== callerProf.default_company_id) {
      return json({ error: "Forbidden" }, 403);
    }
    if (cg.user_id) return json({ error: "Caregiver already linked to an account" }, 409);
    if (!cg.email) return json({ error: "Caregiver has no email on file. Add an email first." }, 400);

    const email = String(cg.email).trim().toLowerCase();
    let userId: string | null = null;

    // If a user with this email already exists, reuse it; otherwise invite.
    const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: cg.name },
    });
    if (invErr) {
      // Likely already registered — look it up.
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users?.find((u) => (u.email ?? "").toLowerCase() === email);
      if (!existing) return json({ error: invErr.message }, 400);
      userId = existing.id;
    } else {
      userId = invited?.user?.id ?? null;
    }
    if (!userId) return json({ error: "Failed to create user" }, 500);

    // Link caregiver -> user (trigger creates employment_record automatically)
    const { error: linkErr } = await admin
      .from("caregivers").update({ user_id: userId }).eq("id", caregiver_id);
    if (linkErr) return json({ error: `Link failed: ${linkErr.message}` }, 500);

    // Grant caregiver role (idempotent)
    await admin.from("user_roles")
      .upsert({ user_id: userId, role: "caregiver" }, { onConflict: "user_id,role" });

    // Ensure profile basics (handle_new_user covers new users; backfill phone)
    await admin.from("profiles").upsert({
      id: userId,
      full_name: cg.name,
      phone: cg.phone,
      default_company_id: cg.company_id,
    }, { onConflict: "id" });

    // Auto-assign all active trainings required for the caregiver role
    const { data: courses } = await admin
      .from("training_courses")
      .select("id, required_for_roles, active")
      .eq("active", true);
    const required = (courses ?? []).filter((c: any) =>
      Array.isArray(c.required_for_roles) && c.required_for_roles.includes("caregiver"),
    );
    let trainingsAssigned = 0;
    if (required.length) {
      const rows = required.map((c: any) => ({
        course_id: c.id, user_id: userId, assigned_by: caller.id,
      }));
      const { error: taErr, count } = await admin
        .from("training_assignments")
        .upsert(rows, { onConflict: "course_id,user_id", ignoreDuplicates: true, count: "exact" });
      if (!taErr) trainingsAssigned = count ?? rows.length;
    }

    return json({
      ok: true,
      user_id: userId,
      email,
      caregiver_id,
      trainings_assigned: trainingsAssigned,
      invited: !invErr,
    });
  } catch (e: any) {
    return json({ error: e?.message ?? String(e) }, 500);
  }
});