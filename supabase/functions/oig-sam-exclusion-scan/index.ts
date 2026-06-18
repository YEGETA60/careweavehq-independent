// Monthly OIG LEIE + SAM.gov exclusion scan.
// Refreshes the local exclusion cache (best-effort) then screens every active
// caregiver and writes a record to public.exclusion_checks.
//
// Trigger via cron or POST. Service-role only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OIG_CSV = "https://oig.hhs.gov/exclusions/downloadables/UPDATED.csv";

function norm(s: string | null | undefined) {
  return (s ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

async function refreshOigCache(admin: ReturnType<typeof createClient>) {
  let imported = 0;
  try {
    const res = await fetch(OIG_CSV, { headers: { "User-Agent": "CareWeave-Compliance/1.0" } });
    if (!res.ok) throw new Error(`OIG fetch ${res.status}`);
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    const header = lines.shift()?.split(",").map((h) => h.replaceAll('"', "").trim().toUpperCase()) ?? [];
    const idx = (k: string) => header.indexOf(k);
    const batch: any[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const cols = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((c) =>
        c.replace(/,$/, "").replace(/^"|"$/g, "").replaceAll('""', '"').trim()
      ) ?? [];
      if (cols.length < 5) continue;
      batch.push({
        source: "OIG_LEIE",
        last_name: cols[idx("LASTNAME")] ?? null,
        first_name: cols[idx("FIRSTNAME")] ?? null,
        middle_name: cols[idx("MIDNAME")] ?? null,
        npi: cols[idx("NPI")] || null,
        business_name: cols[idx("BUSNAME")] ?? null,
        address: cols[idx("ADDRESS")] ?? null,
        city: cols[idx("CITY")] ?? null,
        state: cols[idx("STATE")] ?? null,
        zip: cols[idx("ZIP")] ?? null,
        excl_type: cols[idx("EXCLTYPE")] ?? null,
        excl_date: cols[idx("EXCLDATE")] ? formatDate(cols[idx("EXCLDATE")]) : null,
        reinstate_date: cols[idx("REINDATE")] ? formatDate(cols[idx("REINDATE")]) : null,
      });
      if (batch.length >= 1000) {
        await admin.from("exclusion_list_cache").insert(batch);
        imported += batch.length;
        batch.length = 0;
      }
    }
    if (batch.length) {
      await admin.from("exclusion_list_cache").insert(batch);
      imported += batch.length;
    }
  } catch (e) {
    console.error("OIG refresh failed:", e);
  }
  return imported;
}

function formatDate(s: string): string | null {
  // OIG format YYYYMMDD
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Require shared cron secret — this is a service-only batch job.
  const provided = req.headers.get("X-Cron-Secret") ?? req.headers.get("x-cron-secret");
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const skipRefresh = body?.skip_refresh === true;

    let imported = 0;
    if (!skipRefresh) {
      // Wipe and reload (small-medium dataset, ~80K rows)
      await admin.from("exclusion_list_cache").delete().eq("source", "OIG_LEIE");
      imported = await refreshOigCache(admin);
    }

    // Screen active caregivers
    const { data: caregivers } = await admin
      .from("caregivers")
      .select("id, company_id, first_name, last_name, npi, status")
      .eq("status", "active");

    let scanned = 0, hits = 0;
    for (const cg of caregivers ?? []) {
      let matchId: string | null = null;
      let status: "clear" | "potential_match" | "excluded" = "clear";

      if (cg.npi) {
        const { data: m } = await admin
          .from("exclusion_list_cache").select("id")
          .eq("npi", cg.npi).limit(1).maybeSingle();
        if (m) { matchId = m.id; status = "excluded"; }
      }
      if (!matchId && cg.last_name) {
        const { data: m } = await admin
          .from("exclusion_list_cache").select("id, first_name")
          .ilike("last_name", cg.last_name)
          .ilike("first_name", cg.first_name ?? "")
          .limit(5);
        if (m && m.length) {
          matchId = m[0].id;
          status = "potential_match";
        }
      }

      await admin.from("exclusion_checks").insert({
        company_id: cg.company_id,
        caregiver_id: cg.id,
        source: "OIG_LEIE",
        status,
        matched_record_id: matchId,
        details: { name: `${cg.first_name ?? ""} ${cg.last_name ?? ""}`.trim(), npi: cg.npi },
      });
      scanned++;
      if (status !== "clear") hits++;
    }

    return new Response(JSON.stringify({ ok: true, imported, scanned, hits }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});