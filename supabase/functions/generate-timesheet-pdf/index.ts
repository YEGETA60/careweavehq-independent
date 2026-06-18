// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fmtTime(t: string | null | undefined) { return t ? t.slice(0,5) : ""; }
function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function diffHours(a: string, b: string) {
  if (!a || !b) return 0;
  const [ah,am] = a.split(":").map(Number); const [bh,bm] = b.split(":").map(Number);
  return Math.max(0, ((bh*60+bm)-(ah*60+am))/60);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await sb.auth.getUser();
    if (!userRes.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { client_id, caregiver_id, period_start, period_end } = await req.json();
    if (!client_id || !caregiver_id || !period_start || !period_end)
      return new Response(JSON.stringify({ error: "client_id, caregiver_id, period_start, period_end required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const [{ data: client }, { data: caregiver }, { data: visits }, { data: plan }] = await Promise.all([
      sb.from("clients").select("name, address").eq("id", client_id).single(),
      sb.from("caregivers").select("name").eq("id", caregiver_id).single(),
      sb.from("visits").select("id,date,start_time,end_time,verified_start_time,verified_end_time,verification_status,tasks_completed,status")
        .eq("client_id", client_id).eq("caregiver_id", caregiver_id)
        .gte("date", period_start).lte("date", period_end).order("date"),
      sb.from("care_plans").select("id, program_type, program_label, total_weekly_hours, authorization_number, case_manager_name, case_manager_agency, medicaid_id").eq("client_id", client_id).eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    let categories: any[] = [];
    if (plan?.id) {
      const { data: cats } = await sb.from("care_plan_categories").select("id,category_name,weekly_hours_approved").eq("care_plan_id", plan.id).order("sort_order");
      categories = cats ?? [];
    }

    // Build days array
    const start = new Date(period_start); const end = new Date(period_end);
    const days: any[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
      const iso = d.toISOString().slice(0,10);
      const v = (visits ?? []).find((x: any) => x.date === iso);
      const evvStart = v?.verified_start_time || v?.start_time || "";
      const evvEnd = v?.verified_end_time || v?.end_time || "";
      const hours = v ? diffHours(evvStart, evvEnd) : 0;
      const sched = v ? diffHours(v.start_time, v.end_time) : 0;
      days.push({ date: iso, day: d.toLocaleDateString("en-US",{weekday:"short"}), evvStart: fmtTime(evvStart), evvEnd: fmtTime(evvEnd), hours, sched, status: v?.verification_status, tasks: v?.tasks_completed ?? [] });
    }
    const totalHours = days.reduce((s,d)=>s+d.hours,0);
    const totalSched = days.reduce((s,d)=>s+d.sched,0);
    const approvedHours = (plan?.total_weekly_hours ?? 0) * (days.length/7);

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Timesheet</title>
<style>
body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px;}
h1{font-size:16px;margin:0 0 4px}h2{font-size:13px;margin:14px 0 6px}
table{width:100%;border-collapse:collapse;margin:6px 0}
th,td{border:1px solid #444;padding:4px 6px;text-align:left;vertical-align:top}
th{background:#eee}
.kv{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:11px}
.kv div b{display:inline-block;min-width:130px}
.flag{color:#b91c1c;font-weight:bold}.ok{color:#15803d}
.sig{margin-top:18px;border-top:1px solid #000;padding-top:4px;width:60%}
@media print{.noprint{display:none}}
</style></head><body>
<h1>Bi-Weekly Timesheet — EVV Reconciled</h1>
<div class="kv">
  <div><b>Client:</b>${esc(client?.name)}</div>
  <div><b>Caregiver:</b>${esc(caregiver?.name)}</div>
  <div><b>Address:</b>${esc(client?.address)}</div>
  <div><b>Medicaid ID:</b>${esc(plan?.medicaid_id)}</div>
  <div><b>Period:</b>${esc(period_start)} → ${esc(period_end)}</div>
  <div><b>Program:</b>${esc(plan?.program_label ?? plan?.program_type ?? "—")}</div>
  <div><b>Authorization #:</b>${esc(plan?.authorization_number ?? "—")}</div>
  <div><b>Case Manager:</b>${esc(plan?.case_manager_name ?? "—")} ${plan?.case_manager_agency ? "("+esc(plan.case_manager_agency)+")" : ""}</div>
</div>
<h2>Approved per Care Plan</h2>
<table><thead><tr><th>Category</th><th>Approved hrs/week</th></tr></thead><tbody>
${categories.map(c=>`<tr><td>${esc(c.category_name)}</td><td>${Number(c.weekly_hours_approved).toFixed(2)}</td></tr>`).join("") || `<tr><td colspan="2">No parsed categories.</td></tr>`}
<tr><th>Total approved (period, prorated)</th><th>${approvedHours.toFixed(2)} hrs</th></tr>
</tbody></table>
<h2>Daily Log (from EVV)</h2>
<table><thead><tr><th>Date</th><th>Day</th><th>EVV In</th><th>EVV Out</th><th>EVV Hours</th><th>Sched Hours</th><th>Variance</th><th>Status</th><th>Tasks</th></tr></thead><tbody>
${days.map(d=>{
  const v = d.hours - d.sched;
  return `<tr><td>${esc(d.date)}</td><td>${esc(d.day)}</td><td>${esc(d.evvStart||"—")}</td><td>${esc(d.evvEnd||"—")}</td><td>${d.hours.toFixed(2)}</td><td>${d.sched.toFixed(2)}</td><td class="${Math.abs(v)>0.25?"flag":"ok"}">${v.toFixed(2)}</td><td>${esc(d.status||"—")}</td><td>${esc((d.tasks||[]).join(", "))}</td></tr>`;
}).join("")}
<tr><th colspan="4">Totals</th><th>${totalHours.toFixed(2)}</th><th>${totalSched.toFixed(2)}</th><th class="${Math.abs(totalHours-totalSched)>0.5?"flag":"ok"}">${(totalHours-totalSched).toFixed(2)}</th><th colspan="2"></th></tr>
</tbody></table>
<h2>Reconciliation vs Care Plan</h2>
<p>EVV total: <b>${totalHours.toFixed(2)} hrs</b> &nbsp; • &nbsp; Care plan approved (period): <b>${approvedHours.toFixed(2)} hrs</b> &nbsp; • &nbsp; Variance: <b class="${totalHours>approvedHours?"flag":"ok"}">${(totalHours-approvedHours).toFixed(2)} hrs</b></p>
<div style="display:flex;gap:24px;margin-top:24px">
  <div class="sig">Caregiver signature / date</div>
  <div class="sig">Client / Representative signature / date</div>
</div>
<div class="sig">Supervisor signature / date</div>
<p style="margin-top:14px;color:#555;font-size:10px">Generated automatically from EVV verified clock in/out. Source: Sandata-compatible EVV. Confidential — retain for Medicaid audit and license renewal.</p>
<button class="noprint" onclick="window.print()" style="margin-top:8px;padding:6px 12px">Print</button>
</body></html>`;

    // Save / upsert draft timesheet for this period+caregiver+client
    const totals = { evv_hours: totalHours, scheduled_hours: totalSched, approved_hours: approvedHours, days };
    const variance = totalHours - approvedHours;
    const { data: existing } = await sb.from("timesheets").select("id, status")
      .eq("client_id", client_id).eq("caregiver_id", caregiver_id)
      .eq("period_start", period_start).eq("period_end", period_end).maybeSingle();
    let timesheetId = existing?.id;
    if (existing && existing.status !== "locked") {
      await sb.from("timesheets").update({
        evv_hours: totalHours, scheduled_hours: totalSched, approved_hours: approvedHours,
        variance_hours: variance, html_snapshot: html, totals, care_plan_id: plan?.id ?? null,
      }).eq("id", existing.id);
    } else if (!existing) {
      const { data: ins, error: insErr } = await sb.from("timesheets").insert({
        client_id, caregiver_id, care_plan_id: plan?.id ?? null,
        period_start, period_end,
        evv_hours: totalHours, scheduled_hours: totalSched, approved_hours: approvedHours,
        variance_hours: variance, html_snapshot: html, totals,
        created_by: userRes.user.id,
      }).select("id").single();
      if (insErr) console.error("timesheet insert", insErr);
      timesheetId = ins?.id;
    }

    return new Response(JSON.stringify({ html, totals, timesheet_id: timesheetId, locked: existing?.status === "locked" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
