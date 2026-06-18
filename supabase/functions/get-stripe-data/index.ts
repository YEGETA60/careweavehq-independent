import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const ZERO_DECIMAL = new Set([
  "bif","clp","djf","gnf","jpy","kmf","krw","mga","pyg","rwf","ugx","vnd","vuv","xaf","xof","xpf",
]);
const THREE_DECIMAL = new Set(["bhd","jod","kwd","omr","tnd"]);

function toMajor(amount: number | null | undefined, currency: string): number {
  const v = amount ?? 0;
  const c = (currency ?? "").toLowerCase();
  if (ZERO_DECIMAL.has(c)) return v;
  if (THREE_DECIMAL.has(c)) return v / 1000;
  return v / 100;
}

function iso(unix: number | null | undefined): string | null {
  return unix ? new Date(unix * 1000).toISOString() : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { companyId, environment } = await req.json();
    if (!companyId) throw new Error("Missing companyId");
    if (environment !== "sandbox" && environment !== "live") throw new Error("Invalid environment");

    // Verify caller belongs to the company before returning billing data.
    const { data: membership } = await supabase
      .from("company_users")
      .select("company_role")
      .eq("company_id", companyId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: sub } = await supabase
      .from("company_subscriptions")
      .select("external_customer_id")
      .eq("company_id", companyId)
      .eq("environment", environment)
      .maybeSingle();

    if (!sub?.external_customer_id) {
      return new Response(JSON.stringify({ invoices: [], customerId: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = createStripeClient(environment as StripeEnv);
    const list = await stripe.invoices.list({ customer: sub.external_customer_id, limit: 24 });

    const invoices = list.data.map((inv: any) => ({
      id: inv.id ?? "",
      number: inv.number ?? null,
      status: inv.status ?? null,
      amount_paid: toMajor(inv.amount_paid, inv.currency),
      amount_due: toMajor(inv.amount_due, inv.currency),
      currency: inv.currency,
      created: iso(inv.created),
      period_start: iso(inv.period_start),
      period_end: iso(inv.period_end),
      hosted_invoice_url: inv.hosted_invoice_url ?? null,
      pdf_url: inv.invoice_pdf ?? null,
    }));

    return new Response(JSON.stringify({ invoices, customerId: sub.external_customer_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("get-stripe-data error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});