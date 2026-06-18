import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  priceId: string;
  customerEmail?: string;
  userId?: string;
  companyId?: string;
  returnUrl?: string;
}

export function StripeEmbeddedCheckout({ priceId, customerEmail, userId, companyId, returnUrl }: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const url = returnUrl ?? `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId, customerEmail, userId, companyId, returnUrl: url, environment: getStripeEnvironment() },
    });
    if (error || !data?.clientSecret) throw new Error(error?.message || "Failed to create checkout session");
    return data.clientSecret as string;
  };
  return (
    <div id="checkout" data-allow-readonly>
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}