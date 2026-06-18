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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { companyId, returnUrl, environment } = await req.json();
    if (!companyId) throw new Error("Missing companyId");
    if (environment !== "sandbox" && environment !== "live") throw new Error("Invalid environment");

    const { data: sub } = await supabase
      .from("company_subscriptions")
      .select("external_customer_id")
      .eq("company_id", companyId)
      .eq("environment", environment)
      .maybeSingle();
    if (!sub?.external_customer_id) throw new Error("No subscription found");

    const stripe = createStripeClient(environment as StripeEnv);
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.external_customer_id,
      ...(returnUrl && { return_url: returnUrl }),
    });
    return new Response(JSON.stringify({ url: portal.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-portal-session error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});