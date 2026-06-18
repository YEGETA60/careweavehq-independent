// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const body = await req.json() as {
      period_start: string;
      period_end: string;
      mode?: "preview" | "commit"; // preview = dry run; commit = create invoices/claims
      strict?: boolean;             // default true: block on any issue
      include_timesheet_ids?: string[];
    };
    if (!body.period_start || !body.period_end) {
      return new Response(JSON.stringify({ error: "period_start and period_end required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const strict = body.strict ?? true;
    const mode = body.mode ?? "preview";

    // Resolve company: prefer profile.default_company_id, fall back to first company membership
    const { data: prof } = await sb.from("profiles").select("default_company_id").maybeSingle();
    let company_id: string | null = prof?.default_company_id ?? null;
    if (!company_id) {
      const { data: cu } = await sb
        .from("company_users")
        .select("company_id")
        .eq("user_id", userRes.user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      company_id = cu?.company_id ?? null;
      if (company_id) {
        await sb.from("profiles").update({ default_company_id: company_id }).eq("id", userRes.user.id);
      }
    }
    if (!company_id) {
      return new Response(JSON.stringify({ error: "No company associated with your account. Complete company onboarding first." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create / reuse run
    const { data: run, error: runErr } = await sb.from("billing_runs").insert({
      company_id,
      period_start: body.period_start,
      period_end: body.period_end,
      status: "running",
      ran_by: userRes.user.id,
      started_at: new Date().toISOString(),
      options: { strict, mode },
    }).select("*").single();
    if (runErr || !run) throw runErr ?? new Error("could not create run");

    // Pull candidate timesheets in window
    let tsq = sb.from("timesheets")
      .select("id, client_id, caregiver_id, period_start, period_end, status, evv_hours, approved_hours, evv_unresolved_count, totals, locked_at")
      .eq("company_id", company_id)
      .gte("period_start", body.period_start)
      .lte("period_end", body.period_end);
    if (body.include_timesheet_ids?.length) tsq = tsq.in("id", body.include_timesheet_ids);
    const { data: tsList, error: tsErr } = await tsq;
    if (tsErr) throw tsErr;

    // Skip already-billed timesheets
    const tsIds = (tsList ?? []).map(t => t.id);
    const { data: alreadyBilled } = tsIds.length
      ? await sb.from("invoices").select("timesheet_id").in("timesheet_id", tsIds)
      : { data: [] as any[] };
    const billedSet = new Set((alreadyBilled ?? []).map((r: any) => r.timesheet_id));

    // Pull supporting data
    const clientIds = [...new Set((tsList ?? []).map(t => t.client_id))];
    const caregiverIds = [...new Set((tsList ?? []).map(t => t.caregiver_id))];

    const [{ data: clients }, { data: caregivers }, { data: auths }, { data: rates }, { data: creds }] =
      await Promise.all([
        clientIds.length
          ? sb.from("clients").select("id,name,address,phone,hourly_rate,payer_id").in("id", clientIds)
          : Promise.resolve({ data: [] as any[] }),
        caregiverIds.length
          ? sb.from("caregivers").select("id,name,user_id").in("id", caregiverIds)
          : Promise.resolve({ data: [] as any[] }),
        clientIds.length
          ? sb.from("authorizations").select("id,client_id,payer_id,auth_number,service_code,units_approved,unit_minutes,hourly_rate,start_date,end_date,status")
              .in("client_id", clientIds).eq("status", "Active")
          : Promise.resolve({ data: [] as any[] }),
        sb.from("payer_rate_sheets").select("payer_id,service_code,hourly_rate,unit_minutes,effective_start,effective_end,active"),
        caregiverIds.length
          ? sb.from("credentials").select("caregiver_id,type,expiry_date").in("caregiver_id", caregiverIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

    const clientById = new Map((clients ?? []).map((c: any) => [c.id, c]));
    const caregiverById = new Map((caregivers ?? []).map((c: any) => [c.id, c]));
    const periodEnd = body.period_end;

    function findAuth(client_id: string) {
      return (auths ?? []).find((a: any) =>
        a.client_id === client_id && a.start_date <= periodEnd && a.end_date >= body.period_start
      );
    }
    function findRate(payer_id: string | null | undefined, service_code: string | null | undefined) {
      if (!payer_id) return null;
      return (rates ?? []).find((r: any) =>
        r.active && r.payer_id === payer_id &&
        (!service_code || r.service_code === service_code) &&
        r.effective_start <= periodEnd &&
        (!r.effective_end || r.effective_end >= body.period_start)
      );
    }

    let totalCharge = 0, totalUnits = 0, generated = 0, blocked = 0;
    const items: any[] = [];
    const blockers: any[] = [];

    for (const t of (tsList ?? [])) {
      const tsBlockers: string[] = [];
      if (t.status !== "locked" && t.status !== "signed") tsBlockers.push("timesheet not signed/locked");
      if ((t.evv_unresolved_count ?? 0) > 0) tsBlockers.push(`${t.evv_unresolved_count} unresolved EVV mismatch(es)`);
      if (billedSet.has(t.id)) tsBlockers.push("already billed");

      const client = clientById.get(t.client_id);
      if (!client) tsBlockers.push("client missing");
      const caregiver = caregiverById.get(t.caregiver_id);
      if (!caregiver) tsBlockers.push("caregiver missing");

      // Caregiver credentials current?
      const cgCreds = (creds ?? []).filter((c: any) => c.caregiver_id === t.caregiver_id);
      const expired = cgCreds.filter((c: any) => c.expiry_date && c.expiry_date < periodEnd);
      if (expired.length) tsBlockers.push(`${expired.length} expired credential(s)`);

      const auth = client ? findAuth(client.id) : null;
      const payer_id = auth?.payer_id ?? client?.payer_id ?? null;
      const service_code = auth?.service_code ?? null;
      const unit_minutes = auth?.unit_minutes ?? 60;

      // Compute hours from EVV totals
      const days = (t.totals?.days as any[]) ?? [];
      let hours = 0;
      for (const d of days) hours += Number(d.hours ?? hoursBetween(d.evvStart, d.evvEnd) ?? 0);
      if (hours <= 0) hours = Number(t.evv_hours ?? 0);
      if (hours <= 0) tsBlockers.push("no EVV verified hours");

      const rateRow = findRate(payer_id, service_code);
      const rate = rateRow?.hourly_rate ?? auth?.hourly_rate ?? client?.hourly_rate ?? 0;
      if (!rate || rate <= 0) tsBlockers.push("no rate (rate sheet / auth / client)");

      // Authorization burndown
      if (auth?.units_approved && unit_minutes > 0) {
        const unitsThis = (hours * 60) / unit_minutes;
        // Best-effort: compare to approved (do not refetch used units)
        if (unitsThis > Number(auth.units_approved)) tsBlockers.push("exceeds authorized units");
      } else if (!auth) {
        tsBlockers.push("no active authorization");
      }

      const units = unit_minutes > 0 ? (hours * 60) / unit_minutes : hours;
      const charge = +(hours * Number(rate || 0)).toFixed(2);

      const passed = tsBlockers.length === 0;
      const include = passed || !strict;

      items.push({
        company_id,
        billing_run_id: run.id,
        timesheet_id: t.id,
        client_id: t.client_id,
        caregiver_id: t.caregiver_id,
        status: passed ? "pending" : (strict ? "blocked" : "pending"),
        reason: tsBlockers.join("; ") || null,
        hours: +hours.toFixed(2),
        units: +units.toFixed(2),
        charge,
        blockers: tsBlockers,
        _meta: { payer_id, service_code, rate, auth_id: auth?.id ?? null, auth_number: auth?.auth_number ?? null },
      });

      if (!passed) {
        blocked++;
        blockers.push({ timesheet_id: t.id, client: client?.name, reasons: tsBlockers });
      }
      if (include) {
        totalCharge += charge;
        totalUnits += units;
      }
    }

    // Persist items (without _meta column) — keep meta in 'reason'/'blockers' for transparency
    const itemRows = items.map(({ _meta, ...rest }) => rest);
    if (itemRows.length) await sb.from("billing_run_items").insert(itemRows);

    // COMMIT MODE — create invoices + claims for unblocked items
    let invoiceCount = 0, claimCount = 0;
    if (mode === "commit") {
      for (const it of items) {
        if (strict && it.status === "blocked") continue;
        if (it.charge <= 0) continue;
        const meta = it._meta;
        const client = clientById.get(it.client_id);

        // Invoice
        const dueDate = new Date(body.period_end);
        dueDate.setDate(dueDate.getDate() + 30);
        const { data: inv } = await sb.from("invoices").insert({
          company_id,
          client_id: it.client_id,
          payer_id: meta?.payer_id,
          billing_run_id: run.id,
          timesheet_id: it.timesheet_id,
          period_start: body.period_start,
          period_end: body.period_end,
          service_code: meta?.service_code,
          hours: it.hours,
          units: it.units,
          rate: meta?.rate ?? 0,
          amount: it.charge,
          balance: it.charge,
          paid_amount: 0,
          status: "Pending",
          due_date: dueDate.toISOString().slice(0, 10),
          visit_ids: [],
          sent_at: new Date().toISOString(),
        }).select("id").single();
        invoiceCount++;

        // Claim if payer present (insurance route)
        let claimId: string | null = null;
        if (meta?.payer_id) {
          const claimNumber = `C-${run.id.slice(0, 8)}-${invoiceCount}`;
          const { data: cl } = await sb.from("claims").insert({
            company_id,
            claim_number: claimNumber,
            client_id: it.client_id,
            payer_id: meta.payer_id,
            authorization_id: meta.auth_id,
            invoice_id: inv?.id,
            billing_run_id: run.id,
            timesheet_id: it.timesheet_id,
            service_start: body.period_start,
            service_end: body.period_end,
            total_units: it.units,
            total_charge: it.charge,
            status: "draft",
          }).select("id").single();
          claimId = cl?.id ?? null;

          if (claimId) {
            await sb.from("claim_lines").insert({
              company_id,
              claim_id: claimId,
              service_date: body.period_end,
              service_code: meta.service_code ?? "T1019",
              units: it.units,
              unit_rate: meta.rate ?? 0,
              charge: it.charge,
              status: "pending",
            });
            claimCount++;
          }
        }

        await sb.from("billing_run_items").update({
          status: "generated",
          invoice_id: inv?.id,
          claim_id: claimId,
        }).eq("billing_run_id", run.id).eq("timesheet_id", it.timesheet_id);

        if (inv?.id && claimId) {
          await sb.from("invoices").update({ claim_id: claimId }).eq("id", inv.id);
        }
        generated++;
      }
    }

    await sb.from("billing_runs").update({
      status: mode === "commit"
        ? (blocked > 0 && strict ? "review" : "completed")
        : "review",
      total_timesheets: items.length,
      generated_count: generated,
      blocked_count: blocked,
      total_charge: +totalCharge.toFixed(2),
      total_units: +totalUnits.toFixed(2),
      blockers,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);

    return new Response(JSON.stringify({
      run_id: run.id,
      mode,
      summary: {
        total_timesheets: items.length,
        generated,
        blocked,
        invoices_created: invoiceCount,
        claims_created: claimCount,
        total_charge: +totalCharge.toFixed(2),
        total_units: +totalUnits.toFixed(2),
      },
      items: items.map(({ _meta, ...rest }) => rest),
      blockers,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});