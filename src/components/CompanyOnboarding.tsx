import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { Building2, CreditCard, UserCheck, CheckCircle2, Sparkles } from "lucide-react";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { CompanyLogoUploader } from "@/components/CompanyLogoUploader";
import { isPaymentsConfigured } from "@/lib/stripe";

interface Tier {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  features: any;
}

export function CompanyOnboarding({ tiers, onComplete }: { tiers: Tier[]; onComplete: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const paymentsConfigured = isPaymentsConfigured();

  // Step 1 — company
  const [legal_name, setLegalName] = useState("");
  const [tax_id, setTaxId] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address_line1, setAddr] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setState] = useState("");
  const [postal_code, setPostal] = useState("");

  // Step 2 — tier
  const [tierId, setTierId] = useState(tiers[0]?.id ?? "");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const createCompanyAndContinue = async () => {
    if (!user) return;
    if (!legal_name.trim()) { toast({ title: "Legal company name is required", variant: "destructive" }); setStep(1); return; }
    if (!tierId) { toast({ title: "Select a plan", variant: "destructive" }); setStep(2); return; }
    setSaving(true);
    try {
      const chosenTier = tiers.find((t) => t.id === tierId);
      const { data: company, error: cErr } = await (supabase as any)
        .from("companies")
        .insert({ legal_name, tax_id, email, phone, website,
                  address_line1, city, state: stateVal, postal_code,
                  created_by: user.id,
                  settings: { signup_tier: chosenTier?.slug ?? "standard" } })
        .select().single();
      if (cErr) throw cErr;

      // Owner membership is created automatically by the
      // companies_bootstrap_owner trigger; no client insert needed.

      // Trigger bootstrap_company_trial has already created the subscription
      // (45-day trial on the chosen tier, or past_due if this org has used a trial before).
      // Just set billing_cycle preference if a trial row exists.
      const { error: subscriptionError } = await (supabase as any).from("company_subscriptions")
        .update({ billing_cycle: billingCycle, tier_id: tierId })
        .eq("company_id", company.id);
      if (subscriptionError) throw subscriptionError;

      const { error: profileError } = await (supabase as any).from("profiles").update({
        default_company_id: company.id, onboarding_completed: true,
      }).eq("id", user.id);
      if (profileError) throw profileError;
      window.dispatchEvent(new CustomEvent("cw:subscription-refresh"));

      // Default to "small" band on signup; webhook reconciles real band later.
      const priceId = `${chosenTier?.slug}_small_${billingCycle}`;
      setCreatedCompanyId(company.id);
      setCheckoutPriceId(priceId);
      setStep(4);
    } catch (e: any) {
      toast({ title: "Could not complete onboarding", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const continueToDashboard = () => {
    window.dispatchEvent(new CustomEvent("cw:subscription-refresh"));
    onComplete();
  };

  const StepIcon = ({ n, icon: I, label }: any) => (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
        step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {step > n ? <CheckCircle2 className="h-4 w-4" /> : <I className="h-4 w-4" />}
      </div>
      <span className={`text-sm hidden sm:inline ${step >= n ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome — let's set up your company</CardTitle>
          <CardDescription>Start your 45-day free trial on any plan — no card required. Each company gets one free trial.</CardDescription>
          <div className="flex items-center justify-between gap-2 pt-4">
            <StepIcon n={1} icon={Building2} label="Company" />
            <div className="flex-1 h-px bg-border" />
            <StepIcon n={2} icon={CreditCard} label="Plan" />
            <div className="flex-1 h-px bg-border" />
            <StepIcon n={3} icon={UserCheck} label="Confirm" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              <div><Label>Legal Company Name *</Label><Input value={legal_name} onChange={e=>setLegalName(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>EIN / Tax ID</Label><Input value={tax_id} onChange={e=>setTaxId(e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={phone} onChange={e=>setPhone(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Business Email</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
                <div><Label>Website</Label><Input value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://" /></div>
              </div>
              <div><Label>Street Address</Label><Input value={address_line1} onChange={e=>setAddr(e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>City</Label><Input value={city} onChange={e=>setCity(e.target.value)} /></div>
                <div><Label>State</Label><Input value={stateVal} onChange={e=>setState(e.target.value)} /></div>
                <div><Label>ZIP</Label><Input value={postal_code} onChange={e=>setPostal(e.target.value)} /></div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={()=>setStep(2)} disabled={!legal_name.trim()}>Continue</Button>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" />
                  45-day free trial — on any plan you choose
                </div>
                <ul className="grid sm:grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {[
                    "Unlimited staff, clients & caregivers",
                    "Scheduling, recurring visits & live map",
                    "EVV (GPS) clock in/out — Sandata-ready",
                    "Care plans, visit notes & clinical (eMAR)",
                    "AI scheduling intel & OT forecasting",
                    "Auto-billing, claims & revenue cycle",
                    "Payroll from EVV verified hours",
                    "Family portal & in-app messaging",
                  ].map((f) => (
                    <li key={f} className="flex gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />{f}</li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  One trial per company. Switch tiers any time during the 45 days. When the trial ends, your workspace becomes read-only until you choose a plan. No card required, no auto-charge.
                </p>
              </div>
              <RadioGroup value={tierId} onValueChange={setTierId}>
                {tiers.map(t => (
                  <label key={t.id} className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${tierId===t.id?'border-primary bg-primary/5':''}`}>
                    <RadioGroupItem value={t.id} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-semibold">{t.name}</span>
                        <span className="text-sm">
                          {t.monthly_price > 0 ? `$${t.monthly_price}/mo` : <span className="text-muted-foreground italic">Price coming soon</span>}
                        </span>
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                    </div>
                  </label>
                ))}
              </RadioGroup>
              <div>
                <Label>Billing cycle</Label>
                <RadioGroup value={billingCycle} onValueChange={(v)=>setBillingCycle(v as any)} className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2"><RadioGroupItem value="monthly" /> Monthly</label>
                  <label className="flex items-center gap-2"><RadioGroupItem value="yearly" /> Yearly</label>
                </RadioGroup>
              </div>
              <p className="text-xs text-muted-foreground">No credit card required for the 45-day trial. When the trial ends you'll add a payment method to keep your workspace active.</p>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={()=>setStep(1)}>Back</Button>
                <Button onClick={()=>setStep(3)}>Continue</Button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-3">
              <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                <div><strong>Company:</strong> {legal_name}</div>
                <div><strong>Plan:</strong> {tiers.find(t=>t.id===tierId)?.name} ({billingCycle})</div>
                <div><strong>Owner:</strong> {user?.email}</div>
                <div className="text-xs text-muted-foreground">You'll be the company owner with full admin rights.</div>
                <div className="text-xs text-muted-foreground">Next: your 45-day free trial starts on {tiers.find(t=>t.id===tierId)?.name}. You can switch tiers any time during the trial.</div>
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={()=>setStep(2)}>Back</Button>
                <Button onClick={createCompanyAndContinue} disabled={saving}>{saving?"Setting up…":"Continue to payment"}</Button>
              </div>
            </div>
          )}
          {step === 4 && checkoutPriceId && createdCompanyId && (
            <div className="space-y-3">
              <PaymentTestModeBanner />
              <div className="rounded-lg border p-3 bg-muted/30">
                <p className="text-sm font-medium mb-2">Add your company logo (optional)</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Your logo will appear on invoices, intake packets, and other printed documents.
                </p>
                <CompanyLogoUploader companyId={createdCompanyId} />
              </div>
              <p className="text-sm text-muted-foreground">
                Your 45-day full-access trial is active now. Adding a payment method is optional and you won't be charged during the trial.
              </p>
              {paymentsConfigured ? (
                <StripeEmbeddedCheckout
                  priceId={checkoutPriceId}
                  customerEmail={email || user?.email}
                  userId={user?.id}
                  companyId={createdCompanyId}
                />
              ) : (
                <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  Payments are not enabled yet. You can configure Stripe later without affecting your trial.
                </div>
              )}
              <Button onClick={continueToDashboard} className="w-full">
                Continue to dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
