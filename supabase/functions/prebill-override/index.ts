// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_REASONS = [
  "authorization_pending",
  "rate_documented_offline",
  "credential_renewal_in_progress",
  "evv_corrected_manually",
  "payer_exception_approved",
  "one_time_admin_approval",
  "other",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await sb.auth.getUser();
    if (!userRes.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Role gate: only admin/billing may run prebill overrides.
    const { data: callerRoleRows } = await sb
      .from("user_roles").select("role").eq("user_id", userRes.user.id);
    const callerRoleList: string[] = (callerRoleRows ?? []).map((r: any) => r.role);
    if (!callerRoleList.some((r) => ["admin", "billing"].includes(r))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as {
      action: "approve" | "reject" | "rerun";
      item_id: string;
      reason?: string;
      notes?: string;
    };
    if (!body.action || !body.item_id) {
      return new Response(JSON.stringify({ error: "action and item_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: item, error: itemErr } = await sb.from("billing_run_items").select("*").eq("id", body.item_id).maybeSingle();
    if (itemErr || !item) return new Response(JSON.stringify({ error: "item not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (body.action === "approve" || body.action === "rerun") {
      if (!body.reason || !VALID_REASONS.includes(body.reason)) {
        return new Response(JSON.stringify({ error: "valid reason code required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ===== Configurable override-limit enforcement (approve only) =====
    const alerts: any[] = [];
    let limitHit: { trigger: string; reason: string; details: any } | null = null;
    if (body.action === "approve") {
      // Caller's roles
      const { data: rolesRows } = await sb.from("user_roles").select("role").eq("user_id", userRes.user.id);
      const callerRoles: string[] = (rolesRows ?? []).map((r: any) => r.role);

      // Active limits for this reason matching any of caller's roles
      const { data: limits } = await sb
        .from("prebill_override_limits")
        .select("*")
        .eq("active", true)
        .eq("reason", body.reason)
        .in("role", callerRoles.length ? callerRoles : ["__none__"]);

      const charge = Number(item.charge ?? 0);
      const now = new Date();
      const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 7);

      // Tally caller's recent approvals for this reason
      const { data: recent } = await sb
        .from("prebill_override_log")
        .select("created_at, billing_run_item_id, action, reason")
        .eq("acted_by", userRes.user.id)
        .eq("action", "approve")
        .eq("reason", body.reason)
        .gte("created_at", weekStart.toISOString());

      const recentItemIds = (recent ?? []).map((r: any) => r.billing_run_item_id).filter(Boolean);
      const { data: recentItems } = recentItemIds.length
        ? await sb.from("billing_run_items").select("id,charge").in("id", recentItemIds)
        : { data: [] as any[] };
      const chargeMap = new Map((recentItems ?? []).map((x: any) => [x.id, Number(x.charge ?? 0)]));

      let dailyCount = 0;
      let weeklyAmount = 0;
      for (const r of recent ?? []) {
        const c = chargeMap.get((r as any).billing_run_item_id) ?? 0;
        if (new Date((r as any).created_at) >= dayStart) dailyCount++;
        weeklyAmount += c;
      }

      for (const lim of limits ?? []) {
        if (lim.max_single_amount != null && charge > Number(lim.max_single_amount)) {
          limitHit = { trigger: "limit_exceeded", reason: `Single charge $${charge.toFixed(2)} exceeds $${Number(lim.max_single_amount).toFixed(2)} for ${lim.role}/${lim.reason}`, details: { lim, charge } };
          break;
        }
        if (lim.max_daily_count != null && dailyCount + 1 > Number(lim.max_daily_count)) {
          limitHit = { trigger: "limit_exceeded", reason: `Daily approvals (${dailyCount + 1}) exceed cap ${lim.max_daily_count} for ${lim.role}/${lim.reason}`, details: { lim, dailyCount } };
          break;
        }
        if (lim.max_weekly_amount != null && weeklyAmount + charge > Number(lim.max_weekly_amount)) {
          limitHit = { trigger: "limit_exceeded", reason: `Weekly approved $${(weeklyAmount + charge).toFixed(2)} exceeds cap $${Number(lim.max_weekly_amount).toFixed(2)} for ${lim.role}/${lim.reason}`, details: { lim, weeklyAmount, charge } };
          break;
        }
        if (lim.requires_second_approver) {
          // require a second approver: only allow when item already has an override_by from a different user
          if (!item.override_by || item.override_by === userRes.user.id) {
            limitHit = { trigger: "requires_second_approver", reason: `Reason ${body.reason} requires a second approver`, details: { lim } };
            break;
          }
        }
      }

      if (limitHit) {
        // Log and notify supervisors, then block
        await notifySupervisors(sb, {
          trigger: limitHit.trigger,
          actorId: userRes.user.id,
          reason: body.reason!,
          amount: charge,
          notes: body.notes,
          details: limitHit.details,
        });
        return new Response(JSON.stringify({ error: limitHit.reason, blocked_by_limit: true }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Frequency / high-value heuristics → notify (do not block)
      const HIGH_VALUE = 1000;
      const HIGH_FREQ = 5; // 5+ approvals in last 24h
      if (charge >= HIGH_VALUE) alerts.push({ trigger: "high_value", details: { charge } });
      if (dailyCount >= HIGH_FREQ) alerts.push({ trigger: "frequency", details: { dailyCount } });
    }

    let newStatus = item.status;
    let resolved = item.resolved;
    let resolution: string | null = item.resolution ?? null;

    if (body.action === "approve") {
      newStatus = "approved";
      resolved = true;
      resolution = "approved";
      // Clear unresolved EVV count so signing/billing is unblocked
      if (item.timesheet_id) {
        await sb.from("timesheets").update({ evv_unresolved_count: 0 }).eq("id", item.timesheet_id);
      }
    } else if (body.action === "reject") {
      newStatus = "rejected";
      resolved = true;
      resolution = "rejected";
    } else if (body.action === "rerun") {
      newStatus = "pending";
      resolved = false;
      resolution = null;
    }

    const { error: upErr } = await sb.from("billing_run_items").update({
      status: newStatus,
      override_reason: body.reason ?? item.override_reason ?? null,
      override_notes: body.notes ?? item.override_notes ?? null,
      override_by: userRes.user.id,
      override_at: new Date().toISOString(),
      resolved,
      resolution,
    }).eq("id", item.id);
    if (upErr) throw upErr;

    await sb.from("prebill_override_log").insert({
      billing_run_item_id: item.id,
      timesheet_id: item.timesheet_id,
      action: body.action,
      reason: body.reason ?? null,
      notes: body.notes ?? null,
      blockers_snapshot: item.blockers ?? [],
      acted_by: userRes.user.id,
    });

    // Notify supervisors for high-value / unusual-frequency approvals
    for (const a of alerts) {
      await notifySupervisors(sb, {
        trigger: a.trigger,
        actorId: userRes.user.id,
        reason: body.reason ?? "other",
        amount: Number(item.charge ?? 0),
        notes: body.notes,
        details: a.details,
      });
    }

    // Re-run billing for this single timesheet (commit) when approved
    let rerun: any = null;
    if (body.action === "approve" && item.timesheet_id) {
      const { data: ts } = await sb.from("timesheets").select("period_start,period_end").eq("id", item.timesheet_id).maybeSingle();
      if (ts) {
        const { data: rerunData } = await sb.functions.invoke("auto-billing-run", {
          body: {
            period_start: ts.period_start,
            period_end: ts.period_end,
            mode: "commit",
            strict: false,
            include_timesheet_ids: [item.timesheet_id],
          },
          headers: { Authorization: auth },
        });
        rerun = rerunData;
      }
    }

    return new Response(JSON.stringify({ ok: true, item_id: item.id, status: newStatus, rerun }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function notifySupervisors(sb: any, p: { trigger: string; actorId: string; reason: string; amount: number; notes?: string; details: any }) {
  // Resolve actor name
  const { data: actorProfile } = await sb.from("profiles").select("full_name").eq("id", p.actorId).maybeSingle();
  const actorName = actorProfile?.full_name ?? "Admin";

  // Find supervisors / billing managers to notify
  const { data: supRoles } = await sb
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["supervisor", "operations_manager", "manager", "admin"]);
  const supIds = [...new Set((supRoles ?? []).map((r: any) => r.user_id))];
  if (!supIds.length) return;

  const { data: profs } = await sb.from("profiles").select("id, full_name").in("id", supIds);
  // Pull emails from auth.users via admin? We can't here — fall back to using a notifications mechanism if available.
  // Use auth admin via service role
  const sbAdmin = (await import("https://esm.sh/@supabase/supabase-js@2.45.0")).createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const recipients: { email: string; name?: string }[] = [];
  for (const id of supIds) {
    try {
      const { data: u } = await sbAdmin.auth.admin.getUserById(id);
      if (u?.user?.email) {
        const name = (profs ?? []).find((x: any) => x.id === id)?.full_name;
        recipients.push({ email: u.user.email, name });
      }
    } catch (_) { /* ignore */ }
  }

  let notified = 0;
  for (const r of recipients) {
    try {
      await sbAdmin.functions.invoke("send-transactional-email", {
        body: {
          template_name: "prebill-override-alert",
          to: r.email,
          purpose: "transactional",
          idempotency_key: `prebill-${p.trigger}-${p.actorId}-${Date.now()}-${r.email}`,
          data: {
            trigger: p.trigger,
            actorName,
            reason: p.reason,
            amount: p.amount?.toFixed(2),
            notes: p.notes,
            details: typeof p.details === "string" ? p.details : JSON.stringify(p.details ?? {}),
          },
        },
      });
      notified++;
    } catch (_) { /* keep going */ }
  }

  await sbAdmin.from("prebill_override_alerts").insert({
    trigger: p.trigger,
    acted_by: p.actorId,
    reason: p.reason,
    amount: p.amount,
    details: p.details ?? {},
    notified_count: notified,
  });
}