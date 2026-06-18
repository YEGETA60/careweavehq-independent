// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOLERANCE_MIN = 7; // minutes

interface SandataRow {
  date: string; // YYYY-MM-DD
  start: string; // HH:MM (24h)
  end: string;
}

function toMin(t?: string | null) {
  if (!t) return null;
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}
function hoursBetween(a?: string | null, b?: string | null) {
  const ma = toMin(a), mb = toMin(b);
  if (ma == null || mb == null) return 0;
  return Math.max(0, (mb - ma) / 60);
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

    const body = await req.json() as { timesheet_id: string; sandata_rows?: SandataRow[]; batch_id?: string; auto_select?: boolean };
    const { timesheet_id } = body;
    if (!timesheet_id) {
      return new Response(JSON.stringify({ error: "timesheet_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: ts, error: tsErr } = await sb.from("timesheets")
      .select("id, client_id, caregiver_id, period_start, period_end, totals, evv_batch_ids").eq("id", timesheet_id).maybeSingle();
    if (tsErr || !ts) return new Response(JSON.stringify({ error: "Timesheet not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Resolve which sandata rows to use
    let sandata_rows: SandataRow[] = Array.isArray(body.sandata_rows) ? body.sandata_rows : [];
    let used_batch_id: string | null = body.batch_id ?? null;

    if (sandata_rows.length === 0) {
      // Pull from a batch — explicit, or auto-select by client/period overlap
      let q = sb.from("sandata_visit_rows")
        .select("visit_date,start_time,end_time,batch_id,client_id")
        .eq("client_id", ts.client_id)
        .gte("visit_date", ts.period_start)
        .lte("visit_date", ts.period_end);
      if (used_batch_id) q = q.eq("batch_id", used_batch_id);
      const { data: rows, error: rErr } = await q;
      if (rErr) throw rErr;
      if (rows && rows.length) {
        // Pick newest batch covering the period if multiple and not specified
        if (!used_batch_id) {
          const counts = new Map<string, number>();
          rows.forEach(r => counts.set(r.batch_id, (counts.get(r.batch_id) ?? 0) + 1));
          // Prefer batch with most matching rows
          used_batch_id = [...counts.entries()].sort((a,b) => b[1]-a[1])[0][0];
        }
        sandata_rows = rows
          .filter(r => r.batch_id === used_batch_id)
          .map(r => ({ date: r.visit_date as string, start: (r.start_time ?? "") as string, end: (r.end_time ?? "") as string }))
          .filter(r => r.date && r.start && r.end);
      }
    }
    const days = (ts.totals?.days as any[]) ?? [];
    const sandataByDate = new Map<string, SandataRow>();
    for (const r of sandata_rows) sandataByDate.set(r.date, r);

    // Clear previous recon rows for this timesheet
    await sb.from("timesheet_evv_recon").delete().eq("timesheet_id", timesheet_id);

    const reconRows: any[] = [];
    let mismatch = 0;
    const sysDates = new Set<string>();

    for (const d of days) {
      sysDates.add(d.date);
      const sd = sandataByDate.get(d.date);
      const sysStart = d.evvStart || null, sysEnd = d.evvEnd || null;
      const sysHrs = Number(d.hours) || 0;
      const startDelta = sd?.start && sysStart ? Math.abs((toMin(sd.start) ?? 0) - (toMin(sysStart) ?? 0)) : null;
      const endDelta = sd?.end && sysEnd ? Math.abs((toMin(sd.end) ?? 0) - (toMin(sysEnd) ?? 0)) : null;
      const sandHrs = sd ? hoursBetween(sd.start, sd.end) : null;
      let status = "matched";
      const notes: string[] = [];
      if (!sysStart && !sd) { continue; }
      if (!sd) { status = "missing_in_sandata"; notes.push("No Sandata record for this date"); }
      else if (!sysStart) { status = "missing_in_system"; notes.push("Sandata visit has no system match"); }
      else if ((startDelta ?? 0) > TOLERANCE_MIN || (endDelta ?? 0) > TOLERANCE_MIN) {
        status = "time_mismatch";
        if ((startDelta ?? 0) > TOLERANCE_MIN) notes.push(`Start off by ${startDelta} min`);
        if ((endDelta ?? 0) > TOLERANCE_MIN) notes.push(`End off by ${endDelta} min`);
      }
      if (status !== "matched") mismatch++;
      reconRows.push({
        timesheet_id, visit_date: d.date,
        system_start: sysStart, system_end: sysEnd, system_hours: sysHrs,
        sandata_start: sd?.start ?? null, sandata_end: sd?.end ?? null, sandata_hours: sandHrs,
        start_delta_min: startDelta, end_delta_min: endDelta,
        hours_delta: sandHrs != null ? Number((sysHrs - sandHrs).toFixed(2)) : null,
        status, notes: notes.join("; ") || null,
      });
    }
    // Sandata-only dates
    for (const r of sandata_rows) {
      if (!sysDates.has(r.date)) {
        mismatch++;
        reconRows.push({
          timesheet_id, visit_date: r.date,
          system_start: null, system_end: null, system_hours: 0,
          sandata_start: r.start, sandata_end: r.end, sandata_hours: hoursBetween(r.start, r.end),
          start_delta_min: null, end_delta_min: null, hours_delta: null,
          status: "missing_in_system", notes: "Sandata visit has no system match",
        });
      }
    }

    if (reconRows.length) {
      const { error: rErr } = await sb.from("timesheet_evv_recon").insert(reconRows);
      if (rErr) console.error("recon insert", rErr);
    }

    await sb.from("timesheets").update({
      evv_reconciled_at: new Date().toISOString(),
      evv_mismatch_count: mismatch,
      evv_unresolved_count: mismatch,
      evv_batch_ids: used_batch_id ? Array.from(new Set([...(ts.evv_batch_ids ?? []), used_batch_id])) : (ts.evv_batch_ids ?? []),
      evv_recon_summary: { tolerance_min: TOLERANCE_MIN, days_checked: reconRows.length, mismatches: mismatch },
    }).eq("id", timesheet_id);

    return new Response(JSON.stringify({ mismatch_count: mismatch, rows: reconRows, batch_id: used_batch_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});