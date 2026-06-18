import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

async function resolvePriceId(priceObj: any): Promise<string | null> {
  return priceObj?.metadata?.lovable_external_id || priceObj?.lookup_key || priceObj?.id || null;
}

async function lookupTier(priceId: string) {
  const sb = getSupabase();
  const { data } = await sb.from("subscription_price_map").select("tier_slug, billing_cycle").eq("price_id", priceId).maybeSingle();
  if (!data) return null;
  const { data: tier } = await sb.from("subscription_tiers").select("id").eq("slug", data.tier_slug).maybeSingle();
  return tier ? { tierId: tier.id, billingCycle: data.billing_cycle } : null;
}

async function notifyCompanyAdmins(companyId: string, title: string, body: string) {
  const sb = getSupabase();
  const { data: admins } = await sb.from("company_users").select("user_id").eq("company_id", companyId).in("company_role", ["owner", "admin"]);
  if (!admins?.length) return;
  const rows = admins.map((a: any) => ({ user_id: a.user_id, company_id: companyId, title, body, link: "/?tab=company", category: "billing" }));
  await sb.from("notifications").insert(rows);
}

async function queueWelcomeEmail(companyId: string, priceId: string) {
  const sb = getSupabase();
  const { data: company } = await sb.from("companies").select("legal_name, email").eq("id", companyId).maybeSingle();
  if (!company?.email) return;
  await sb.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      template: "welcome",
      to: company.email,
      data: { company_name: company.legal_name, plan: priceId },
    },
  });
}

async function handleSubscriptionCreated(sub: any, env: StripeEnv) {
  const companyId = sub.metadata?.companyId;
  if (!companyId) {
    console.error("No companyId in subscription metadata");
    return;
  }
  const item = sub.items?.data?.[0];
  const priceId = await resolvePriceId(item?.price);
  const periodStart = item?.current_period_start ?? sub.current_period_start;
  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  const tier = priceId ? await lookupTier(priceId) : null;

  await getSupabase().from("company_subscriptions").upsert(
    {
      company_id: companyId,
      tier_id: tier?.tierId ?? null,
      billing_cycle: tier?.billingCycle ?? "monthly",
      price_id: priceId,
      external_subscription_id: sub.id,
      external_customer_id: sub.customer,
      status: sub.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end || false,
      trial_ends_at: null,
      environment: env,
      pending_price_id: null,
    },
    { onConflict: "company_id" },
  );

  await notifyCompanyAdmins(companyId, "Subscription activated 🎉", `Your ${priceId ?? "plan"} subscription is now active.`);
  if (priceId) await queueWelcomeEmail(companyId, priceId).catch((e) => console.error("welcome email:", e));
}

async function handleSubscriptionUpdated(sub: any, env: StripeEnv) {
  const item = sub.items?.data?.[0];
  const priceId = await resolvePriceId(item?.price);
  const periodStart = item?.current_period_start ?? sub.current_period_start;
  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  const tier = priceId ? await lookupTier(priceId) : null;

  const update: Record<string, any> = {
    status: sub.status,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end || false,
  };
  if (priceId) {
    update.price_id = priceId;
    if (tier) {
      update.tier_id = tier.tierId;
      update.billing_cycle = tier.billingCycle;
    }
    update.pending_price_id = null;
  }

  await getSupabase().from("company_subscriptions").update(update).eq("external_subscription_id", sub.id).eq("environment", env);

  if (sub.cancel_at_period_end) {
    const companyId = sub.metadata?.companyId;
    if (companyId) await notifyCompanyAdmins(companyId, "Subscription set to cancel", `Access continues until ${update.current_period_end}.`);
  }
}

async function handleSubscriptionDeleted(sub: any, env: StripeEnv) {
  await getSupabase().from("company_subscriptions").update({ status: "canceled" }).eq("external_subscription_id", sub.id).eq("environment", env);
  const companyId = sub.metadata?.companyId;
  if (companyId) await notifyCompanyAdmins(companyId, "Subscription canceled", "Your account is now read-only. Re-subscribe to restore full access.");
}

async function handleInvoicePaymentFailed(invoice: any, env: StripeEnv) {
  const sb = getSupabase();
  const subscriptionId = invoice.subscription || invoice.parent?.subscription_details?.subscription;
  if (!subscriptionId) return;

  // Mirror Stripe's status onto our row so the in-app banner can surface dunning state.
  await sb
    .from("company_subscriptions")
    .update({ status: "past_due" })
    .eq("external_subscription_id", subscriptionId)
    .eq("environment", env);

  const { data: row } = await sb
    .from("company_subscriptions")
    .select("company_id")
    .eq("external_subscription_id", subscriptionId)
    .eq("environment", env)
    .maybeSingle();
  if (!row?.company_id) return;

  const amount = ((invoice.amount_due ?? 0) / 100).toFixed(2);
  const currency = (invoice.currency ?? "usd").toUpperCase();
  const nextAttempt = invoice.next_payment_attempt
    ? new Date(invoice.next_payment_attempt * 1000).toLocaleDateString()
    : null;
  const body = nextAttempt
    ? `Stripe couldn't charge your card for ${currency} ${amount}. Next retry: ${nextAttempt}. Update your payment method to avoid an interruption.`
    : `Stripe couldn't charge your card for ${currency} ${amount}. Update your payment method to avoid an interruption.`;
  await notifyCompanyAdmins(row.company_id, "Payment failed — action needed", body);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  const env: StripeEnv = rawEnv;
  try {
    const event = await verifyWebhook(req, env);
    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object, env);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object, env);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, env);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object, env);
        break;
      default:
        console.log("Unhandled event:", event.type);
    }
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});