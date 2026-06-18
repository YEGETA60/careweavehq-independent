import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Sheets = {
  caregivers?: any[];
  clients?: any[];
  payers?: any[];
  authorizations?: any[];
  recurring?: any[];
  careplans?: any[];
  balances?: any[];
};

function err(e: any) { return typeof e === "string" ? e : (e?.message ?? JSON.stringify(e)); }
function clean(v: any) { return v === undefined || v === null || v === "" ? null : v; }
function toArr(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  return String(v).split(/[;,]/).map((s) => s.trim()).filter(Boolean);
}
function toNum(v: any, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d; }
function toDate(v: any): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: ures } = await userClient.auth.getUser();
    const user = ures?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: prof } = await admin.from("profiles").select("default_company_id").eq("id", user.id).maybeSingle();
    const company_id = prof?.default_company_id;
    if (!company_id) return new Response(JSON.stringify({ error: "No default company" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isCompanyAdmin } = await admin.from("company_users").select("company_role").eq("user_id", user.id).eq("company_id", company_id).maybeSingle();
    const ok = isAdmin || ["owner", "admin"].includes(isCompanyAdmin?.company_role ?? "");
    if (!ok) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const mode: "validate" | "commit" = body.mode === "commit" ? "commit" : "validate";
    const sheets: Sheets = body.sheets ?? {};
    const errors: any[] = [];
    const summary: Record<string, { created: number; updated: number; skipped: number; failed: number }> = {};
    const bump = (k: string, f: keyof typeof summary[string]) => {
      summary[k] ??= { created: 0, updated: 0, skipped: 0, failed: 0 };
      summary[k][f]++;
    };
    const items: any[] = [];
    const refMap = { caregiver: new Map<string, string>(), client: new Map<string, string>(), payer: new Map<string, string>(), auth: new Map<string, string>() };

    let runId: string | null = null;
    if (mode === "commit") {
      const { data: run, error: re } = await admin.from("migration_runs").insert({
        company_id, started_by: user.id, mode, status: "running",
      }).select("id").single();
      if (re) throw re;
      runId = run.id;
    }

    // 1) caregivers
    for (const row of sheets.caregivers ?? []) {
      const ref = String(row.ref ?? row.external_ref ?? "").trim();
      const name = String(row.name ?? "").trim();
      if (!name) { errors.push({ sheet: "caregivers", ref, error: "name required" }); bump("caregivers", "failed"); continue; }
      if (mode === "validate") { bump("caregivers", "created"); continue; }
      const payload = {
        company_id, name, phone: clean(row.phone), email: clean(row.email),
        skills: toArr(row.skills), certifications: toArr(row.certifications),
        hourly_wage: toNum(row.hourly_wage, 16), status: row.status || "Available",
        external_ref: ref || null,
      };
      let id: string | null = null; let action = "created";
      if (ref) {
        const { data: existing } = await admin.from("caregivers").select("id").eq("company_id", company_id).eq("external_ref", ref).maybeSingle();
        if (existing) { id = existing.id; action = "updated"; await admin.from("caregivers").update(payload).eq("id", id); }
      }
      if (!id) {
        const { data: ins, error: ie } = await admin.from("caregivers").insert(payload).select("id").single();
        if (ie) { errors.push({ sheet: "caregivers", ref, error: err(ie) }); bump("caregivers", "failed"); items.push({ run_id: runId, sheet: "caregivers", external_ref: ref, action: "failed", error: err(ie) }); continue; }
        id = ins.id;
      }
      if (ref) refMap.caregiver.set(ref, id!);
      bump("caregivers", action === "updated" ? "updated" : "created");
      items.push({ run_id: runId, sheet: "caregivers", external_ref: ref, entity_id: id, action });
    }

    // 2) payers
    for (const row of sheets.payers ?? []) {
      const ref = String(row.ref ?? "").trim();
      const name = String(row.name ?? "").trim();
      if (!name) { errors.push({ sheet: "payers", ref, error: "name required" }); bump("payers", "failed"); continue; }
      if (mode === "validate") { bump("payers", "created"); continue; }
      const payload = { company_id, name, payer_type: row.payer_type || "Private", payer_id_external: clean(row.payer_id_external), contact_phone: clean(row.contact_phone), contact_email: clean(row.contact_email) };
      let id: string | null = null; let action = "created";
      const { data: existing } = await admin.from("payers").select("id").eq("company_id", company_id).eq("name", name).maybeSingle();
      if (existing) { id = existing.id; action = "updated"; }
      else {
        const { data: ins, error: ie } = await admin.from("payers").insert(payload).select("id").single();
        if (ie) { errors.push({ sheet: "payers", ref, error: err(ie) }); bump("payers", "failed"); continue; }
        id = ins.id;
      }
      if (ref) refMap.payer.set(ref, id!);
      refMap.payer.set(name.toLowerCase(), id!);
      bump("payers", action === "updated" ? "updated" : "created");
      items.push({ run_id: runId, sheet: "payers", external_ref: ref || name, entity_id: id, action });
    }

    // 3) clients
    for (const row of sheets.clients ?? []) {
      const ref = String(row.ref ?? row.external_ref ?? "").trim();
      const name = String(row.name ?? "").trim();
      if (!name) { errors.push({ sheet: "clients", ref, error: "name required" }); bump("clients", "failed"); continue; }
      if (mode === "validate") { bump("clients", "created"); continue; }
      const payload = {
        company_id, name, address: clean(row.address), phone: clean(row.phone),
        emergency_contact: clean(row.emergency_contact),
        care_level: row.care_level || "Medium", hourly_rate: toNum(row.hourly_rate, 25),
        status: row.status || "Active",
        care_plan: toArr(row.care_plan),
        lat: row.lat ? toNum(row.lat) : null, lng: row.lng ? toNum(row.lng) : null,
        external_ref: ref || null, intake_source: "migration",
      };
      let id: string | null = null; let action = "created";
      if (ref) {
        const { data: existing } = await admin.from("clients").select("id").eq("company_id", company_id).eq("external_ref", ref).maybeSingle();
        if (existing) { id = existing.id; action = "updated"; await admin.from("clients").update(payload).eq("id", id); }
      }
      if (!id) {
        const { data: ins, error: ie } = await admin.from("clients").insert(payload).select("id").single();
        if (ie) { errors.push({ sheet: "clients", ref, error: err(ie) }); bump("clients", "failed"); items.push({ run_id: runId, sheet: "clients", external_ref: ref, action: "failed", error: err(ie) }); continue; }
        id = ins.id;
      }
      if (ref) refMap.client.set(ref, id!);
      bump("clients", action === "updated" ? "updated" : "created");
      items.push({ run_id: runId, sheet: "clients", external_ref: ref, entity_id: id, action });
    }

    // 4) authorizations
    for (const row of sheets.authorizations ?? []) {
      const clientRef = String(row.client_ref ?? "").trim();
      const payerRef = String(row.payer_ref ?? row.payer ?? "").trim();
      const auth_number = String(row.auth_number ?? "").trim();
      const sd = toDate(row.start_date); const ed = toDate(row.end_date);
      if (!clientRef || !payerRef || !auth_number || !sd || !ed) {
        errors.push({ sheet: "authorizations", ref: auth_number, error: "client_ref, payer_ref, auth_number, start_date, end_date required" });
        bump("authorizations", "failed"); continue;
      }
      if (mode === "validate") { bump("authorizations", "created"); continue; }
      const client_id = refMap.client.get(clientRef);
      const payer_id = refMap.payer.get(payerRef) ?? refMap.payer.get(payerRef.toLowerCase());
      if (!client_id || !payer_id) { errors.push({ sheet: "authorizations", ref: auth_number, error: `unresolved ref(s): ${!client_id ? "client " : ""}${!payer_id ? "payer" : ""}` }); bump("authorizations", "failed"); continue; }
      const payload = {
        company_id, client_id, payer_id, auth_number,
        service_code: clean(row.service_code), units_approved: toNum(row.units_approved, 0),
        unit_minutes: toNum(row.unit_minutes, 60), hourly_rate: row.hourly_rate ? toNum(row.hourly_rate) : null,
        start_date: sd, end_date: ed, status: row.status || "Active", notes: clean(row.notes),
      };
      const { data: ins, error: ie } = await admin.from("authorizations").insert(payload).select("id").single();
      if (ie) { errors.push({ sheet: "authorizations", ref: auth_number, error: err(ie) }); bump("authorizations", "failed"); continue; }
      refMap.auth.set(auth_number, ins.id);
      bump("authorizations", "created");
      items.push({ run_id: runId, sheet: "authorizations", external_ref: auth_number, entity_id: ins.id, action: "created" });
    }

    // 5) recurring schedules → visit_series
    for (const row of sheets.recurring ?? []) {
      const clientRef = String(row.client_ref ?? "").trim();
      const cgRef = String(row.caregiver_ref ?? "").trim();
      const sd = toDate(row.start_date); const ed = toDate(row.end_date);
      const dows = toArr(row.days_of_week).map((d) => Number(d)).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
      if (!clientRef || !cgRef || !sd || !ed || dows.length === 0 || !row.start_time || !row.end_time) {
        errors.push({ sheet: "recurring", ref: `${clientRef}/${cgRef}`, error: "client_ref, caregiver_ref, dates, days_of_week, start_time, end_time required" });
        bump("recurring", "failed"); continue;
      }
      if (mode === "validate") { bump("recurring", "created"); continue; }
      const client_id = refMap.client.get(clientRef);
      const caregiver_id = refMap.caregiver.get(cgRef);
      if (!client_id || !caregiver_id) { errors.push({ sheet: "recurring", ref: `${clientRef}/${cgRef}`, error: "unresolved client or caregiver ref" }); bump("recurring", "failed"); continue; }
      const authorization_id = row.auth_number ? refMap.auth.get(String(row.auth_number).trim()) ?? null : null;
      const { data: ins, error: ie } = await admin.from("visit_series").insert({
        company_id, client_id, caregiver_id, authorization_id,
        start_date: sd, end_date: ed, start_time: String(row.start_time), end_time: String(row.end_time),
        days_of_week: dows, frequency: row.frequency || "weekly", notes: clean(row.notes),
      }).select("id").single();
      if (ie) { errors.push({ sheet: "recurring", ref: `${clientRef}/${cgRef}`, error: err(ie) }); bump("recurring", "failed"); continue; }
      bump("recurring", "created");
      items.push({ run_id: runId, sheet: "recurring", external_ref: `${clientRef}/${cgRef}`, entity_id: ins.id, action: "created" });
    }

    // 6) care plan tasks → updates clients.care_plan
    for (const row of sheets.careplans ?? []) {
      const clientRef = String(row.client_ref ?? "").trim();
      const tasks = toArr(row.tasks);
      if (!clientRef || tasks.length === 0) { errors.push({ sheet: "careplans", ref: clientRef, error: "client_ref and tasks required" }); bump("careplans", "failed"); continue; }
      if (mode === "validate") { bump("careplans", "updated"); continue; }
      const client_id = refMap.client.get(clientRef);
      if (!client_id) { errors.push({ sheet: "careplans", ref: clientRef, error: "unresolved client ref" }); bump("careplans", "failed"); continue; }
      const { error: ue } = await admin.from("clients").update({ care_plan: tasks }).eq("id", client_id);
      if (ue) { errors.push({ sheet: "careplans", ref: clientRef, error: err(ue) }); bump("careplans", "failed"); continue; }
      bump("careplans", "updated");
      items.push({ run_id: runId, sheet: "careplans", external_ref: clientRef, entity_id: client_id, action: "updated" });
    }

    // 7) opening AR balances → invoices marked Pending
    for (const row of sheets.balances ?? []) {
      const clientRef = String(row.client_ref ?? "").trim();
      const amt = toNum(row.amount, 0);
      const due = toDate(row.due_date) ?? toDate(row.invoice_date);
      if (!clientRef || !amt || !due) { errors.push({ sheet: "balances", ref: clientRef, error: "client_ref, amount, due_date required" }); bump("balances", "failed"); continue; }
      if (mode === "validate") { bump("balances", "created"); continue; }
      const client_id = refMap.client.get(clientRef);
      if (!client_id) { errors.push({ sheet: "balances", ref: clientRef, error: "unresolved client ref" }); bump("balances", "failed"); continue; }
      const { data: ins, error: ie } = await admin.from("invoices").insert({
        client_id, amount: amt, hours: toNum(row.hours, 0),
        status: row.status || "Pending", due_date: due, visit_ids: [],
      }).select("id").single();
      if (ie) { errors.push({ sheet: "balances", ref: clientRef, error: err(ie) }); bump("balances", "failed"); continue; }
      bump("balances", "created");
      items.push({ run_id: runId, sheet: "balances", external_ref: clientRef, entity_id: ins.id, action: "created" });
    }

    if (mode === "commit" && runId) {
      if (items.length) await admin.from("migration_run_items").insert(items);
      await admin.from("migration_runs").update({
        status: errors.length ? "completed_with_errors" : "completed",
        totals: summary, finished_at: new Date().toISOString(),
      }).eq("id", runId);
    }

    return new Response(JSON.stringify({ mode, summary, errors, runId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: err(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});