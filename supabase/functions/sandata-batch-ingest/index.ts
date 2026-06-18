// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InRow {
  visit_date: string;
  start_time: string;
  end_time: string;
  client_external_id?: string | null;
  medicaid_id?: string | null;
  client_name?: string | null;
  caregiver_name?: string | null;
  service_code?: string | null;
  payer?: string | null;
  raw?: Record<string, unknown>;
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

    const { company_id, label, period_start, period_end, program_type, payer, filename, rows, notes } =
      await req.json() as {
        company_id: string;
        label?: string; period_start: string; period_end: string;
        program_type?: string; payer?: string; filename?: string; notes?: string;
        rows: InRow[];
      };

    if (!company_id || !period_start || !period_end || !Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "company_id, period_start, period_end, rows required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: batch, error: bErr } = await sb.from("sandata_batches").insert({
      company_id, label: label ?? filename ?? `Sandata ${period_start} → ${period_end}`,
      period_start, period_end, program_type, payer, filename,
      uploaded_by: userRes.user.id, row_count: rows.length, notes,
    }).select().single();
    if (bErr || !batch) throw bErr ?? new Error("batch insert failed");

    // Match clients in this company by name (and care_plan medicaid_id when supplied)
    const { data: clients } = await sb.from("clients").select("id, name").eq("company_id", company_id);
    const byName = new Map<string, string>();
    (clients ?? []).forEach((c: any) => { if (c.name) byName.set(String(c.name).trim().toLowerCase(), c.id); });

    const { data: plansForMedicaid } = await sb.from("care_plans")
      .select("client_id, medicaid_id").not("medicaid_id", "is", null);
    const byMedicaid = new Map<string, string>();
    (plansForMedicaid ?? []).forEach((p: any) => {
      if (p.medicaid_id && p.client_id) byMedicaid.set(String(p.medicaid_id).trim().toLowerCase(), p.client_id);
    });

    const inserts = rows.map(r => {
      const m = (r.medicaid_id ?? "").trim().toLowerCase();
      const nm = (r.client_name ?? "").trim().toLowerCase();
      const client_id = (m && byMedicaid.get(m)) || (nm && byName.get(nm)) || null;
      return {
        batch_id: batch.id, company_id, client_id,
        client_external_id: r.client_external_id ?? null,
        medicaid_id: r.medicaid_id ?? null,
        client_name: r.client_name ?? null,
        caregiver_name: r.caregiver_name ?? null,
        program_type: program_type ?? null, payer: payer ?? r.payer ?? null,
        service_code: r.service_code ?? null,
        visit_date: r.visit_date, start_time: r.start_time, end_time: r.end_time,
        raw: r.raw ?? null,
      };
    });

    // chunk insert
    const chunkSize = 500;
    for (let i = 0; i < inserts.length; i += chunkSize) {
      const { error } = await sb.from("sandata_visit_rows").insert(inserts.slice(i, i + chunkSize));
      if (error) throw error;
    }

    const matched = inserts.filter(i => i.client_id).length;
    return new Response(JSON.stringify({ batch_id: batch.id, total: inserts.length, matched, unmatched: inserts.length - matched }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
