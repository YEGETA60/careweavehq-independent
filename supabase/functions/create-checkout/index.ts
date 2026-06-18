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
    // Require an authenticated caller; derive identity server-side and never trust
    // companyId/userId supplied in the request body.
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { priceId, returnUrl, environment } = await req.json();
    if (!priceId || !/^[a-zA-Z0-9_-]+$/.test(priceId)) throw new Error("Invalid priceId");
    if (environment !== "sandbox" && environment !== "live") throw new Error("Invalid environment");
    if (!returnUrl) throw new Error("Missing returnUrl");

    // Resolve company from the authenticated user's profile, then verify they
    // are an admin/owner of that company before letting them create a session.
    const { data: profile } = await supabase
      .from("profiles").select("default_company_id").eq("id", user.id).maybeSingle();
    const companyId = profile?.default_company_id ?? null;
    if (!companyId) throw new Error("No company on account");

    const { data: membership } = await supabase
      .from("company_users")
      .select("company_role")
      .eq("company_id", companyId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership || !["owner", "admin"].includes(membership.company_role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerEmail = user.email;
    const userId = user.id;

    const stripe = createStripeClient(environment as StripeEnv);
    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) throw new Error("Price not found");
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      ...(customerEmail && { customer_email: customerEmail }),
      metadata: { userId, companyId },
      ...(isRecurring && {
        // 45-day free trial — card is collected up front but not charged until trial ends.
        // Matches the DB-level pre-card trial in bootstrap_company_trial and all marketing copy.
        subscription_data: {
          trial_period_days: 45,
          metadata: { userId, companyId },
        },
      }),
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-checkout error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});