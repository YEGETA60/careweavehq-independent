import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ExternalLink, FileText, CreditCard, Loader2 } from "lucide-react";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

interface InvoiceRow {
  id: string;
  number: string | null;
  status: string | null;
  amount_paid: number;
  amount_due: number;
  currency: string;
  created: string | null;
  period_start: string | null;
  period_end: string | null;
  hosted_invoice_url: string | null;
  pdf_url: string | null;
}

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  trialing: "bg-blue-100 text-blue-800 border-blue-200",
  past_due: "bg-amber-100 text-amber-900 border-amber-200",
  unpaid: "bg-red-100 text-red-800 border-red-200",
  canceled: "bg-zinc-100 text-zinc-700 border-zinc-200",
  incomplete: "bg-zinc-100 text-zinc-700 border-zinc-200",
  incomplete_expired: "bg-red-100 text-red-800 border-red-200",
  paused: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

function fmtMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AccountBilling() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const sub = useSubscription();
  const [invoices, setInvoices] = useState<InvoiceRow[] | null>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?redirect=/account/billing", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!sub.companyId || !isPaymentsConfigured()) {
        setInvoices([]);
        return;
      }
      setLoadingInvoices(true);
      try {
        const { data, error } = await supabase.functions.invoke("get-stripe-data", {
          body: { companyId: sub.companyId, environment: getStripeEnvironment() },
        });
        if (error) throw error;
        if (!cancelled) setInvoices(data?.invoices ?? []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setInvoices([]);
      } finally {
        if (!cancelled) setLoadingInvoices(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [sub.companyId]);

  async function openPortal() {
    if (!sub.companyId) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          companyId: sub.companyId,
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/account/billing`,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No portal URL returned");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast({
        title: "Couldn't open billing portal",
        description: e?.message ?? "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  }

  const statusLabel = sub.status ?? (sub.companyId ? "—" : "No company");
  const statusClass = (sub.status && STATUS_TONE[sub.status]) || "bg-zinc-100 text-zinc-700 border-zinc-200";

  return (
    <div className="min-h-screen bg-zinc-50">
      <Helmet>
        <title>Billing & Plan — CareWeave</title>
        <meta name="description" content="Manage your CareWeave plan, payment method, and invoices." />
      </Helmet>
      <PaymentTestModeBanner />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center text-sm text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </button>

        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Billing & Plan</h1>
        <p className="mt-1 text-zinc-600">View your current plan, manage payment methods, and download invoices.</p>

        {/* Plan summary */}
        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">Current plan</div>
              <div className="mt-1 text-2xl font-semibold text-zinc-900">
                {sub.loading ? "Loading…" : sub.tierName ?? "—"}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={statusClass}>{statusLabel}</Badge>
                {sub.isTrialing && sub.trialDaysLeft != null && (
                  <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-800">
                    {sub.trialDaysLeft} day{sub.trialDaysLeft === 1 ? "" : "s"} left in trial
                  </Badge>
                )}
                {sub.isReadOnly && (
                  <Badge variant="outline" className="border-red-200 bg-red-50 text-red-800">Read-only</Badge>
                )}
              </div>
              {sub.currentMonthlyPrice != null && sub.currentMonthlyPrice > 0 && (
                <div className="mt-3 text-sm text-zinc-600">
                  {fmtMoney(sub.currentMonthlyPrice, "usd")}/month · {fmtMoney(sub.currentYearlyPrice ?? 0, "usd")}/year
                </div>
              )}
              {sub.trialEndsAt && sub.isTrialing && (
                <div className="mt-1 text-sm text-zinc-600">Trial ends {fmtDate(sub.trialEndsAt)}</div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline">
                <Link to="/pricing">Change plan</Link>
              </Button>
              <Button onClick={openPortal} disabled={!sub.companyId || portalLoading}>
                {portalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                Manage billing
              </Button>
            </div>
          </div>

          {!isPaymentsConfigured() && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Payments aren't configured for this environment. The billing portal and invoices won't be available
              until checkout is enabled.
            </div>
          )}
        </Card>

        {/* Invoices */}
        <Card className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Invoices</h2>
              <p className="text-sm text-zinc-600">Receipts and PDFs for past charges.</p>
            </div>
            {invoices && invoices.length > 0 && (
              <Button variant="ghost" size="sm" onClick={openPortal} disabled={portalLoading}>
                View all in Stripe <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {loadingInvoices ? (
            <div className="flex items-center justify-center p-12 text-zinc-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading invoices…
            </div>
          ) : !invoices || invoices.length === 0 ? (
            <div className="p-12 text-center text-sm text-zinc-500">
              No invoices yet. Invoices will appear here once your trial converts and your first renewal charges.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-zinc-400" />
                      <span className="font-medium text-zinc-900">
                        {inv.number ?? inv.id.slice(0, 14)}
                      </span>
                      {inv.status && (
                        <Badge variant="outline" className={STATUS_TONE[inv.status] ?? "bg-zinc-100 text-zinc-700 border-zinc-200"}>
                          {inv.status}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {fmtDate(inv.created)}
                      {inv.period_start && inv.period_end && (
                        <> · {fmtDate(inv.period_start)} – {fmtDate(inv.period_end)}</>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-zinc-900">
                      {fmtMoney(inv.status === "paid" ? inv.amount_paid : inv.amount_due, inv.currency)}
                    </div>
                    <div className="mt-1 flex justify-end gap-3 text-xs">
                      {inv.hosted_invoice_url && (
                        <a className="text-blue-600 hover:underline" href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer">View</a>
                      )}
                      {inv.pdf_url && (
                        <a className="text-blue-600 hover:underline" href={inv.pdf_url} target="_blank" rel="noopener noreferrer">PDF</a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}