import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Check, X, Sparkles, ShieldCheck, MapPin, Lock, Bot, ChevronRight,
} from "lucide-react";
import { ExperimentCTA } from "@/components/ExperimentCTA";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const PRICING_CTAS = {
  navSignup: [
    { id: "a", label: "Start 45-day free trial", helper: "No card required" },
    { id: "b", label: "Start 45-day free trial", helper: "No card required" },
  ],
  heroPrimary: [
    { id: "a", label: "Start 45-day free trial", helper: "No card required" },
    { id: "b", label: "Start 45-day free trial", helper: "No card required" },
  ],
  footerPrimary: [
    { id: "a", label: "Start 45-day free trial", helper: "No card required" },
    { id: "b", label: "Start 45-day free trial", helper: "No card required" },
  ],
  footerSecondary: [
    { id: "a", label: "Talk to our team", helper: "Replies in under an hour" },
    { id: "b", label: "Get a custom quote", helper: "Built for your client volume" },
  ],
};

const HERO_COPY = {
  eyebrow: "Pricing",
  headline: "Three plans. One platform. Zero surprises.",
  sub: "Try any plan free for 45 days — no card. One trial per company; switch tiers anytime during the trial.",
};

/* ── 3 tiers only ─────────────────────────── */
const TIERS: {
  slug: string;
  label: string;
  tagline: string;
  outcome: string;
  features: { text: string; isNew?: boolean }[];
  cta: { text: string; href: string };
  highlight?: boolean;
}[] = [
  {
    slug: "standard",
    label: "Standard",
    tagline: "$99/month — 5 clients max · 45-day free trial",
    outcome:
      "Get compliant, reduce manual admin, and confidently run day-to-day operations.",
    features: [
      { text: "Home-care scheduling & rostering" },
      { text: "GPS-verified EVV clock-in/out", isNew: true },
      { text: "Audit-ready visit records" },
      { text: "Caregiver mobile app" },
      { text: "Visit notes & care plans" },
      { text: "Team messaging with PHI redaction", isNew: true },
      { text: "Family Portal (read-only)" },
      { text: "Up to 5 clients" },
    ],
    cta: { text: "Start 45-day free trial", href: "/signup?tier=standard" },
  },
  {
    slug: "professional",
    label: "Professional",
    tagline: "$199/month — 25 clients max · 45-day free trial",
    outcome:
      "Scale schedules and billing with fewer errors and better caregiver utilization.",
    features: [
      { text: "Everything in Standard, plus…" },
      { text: "Claim-ready invoicing & auto-billing", isNew: true },
      { text: "Recurring visits & shift templates" },
      { text: "Payroll & payment runs from EVV hours" },
      { text: "Credentials & expiry reminders" },
      { text: "Payers & authorizations tracking" },
      { text: "Live map & geofence alerts" },
      { text: "Sandata reports & Documents vault" },
      { text: "Built for Medicare, Medicaid, HCBS & Waiver" },
    ],
    cta: { text: "Try Professional free for 45 days", href: "/signup?tier=professional" },
  },
  {
    slug: "enterprise",
    label: "Enterprise",
    tagline: "$299/month — 100 clients max · 45-day free trial",
    outcome:
      "Protect revenue, reduce audit risk, and build confidence with families and funders.",
    features: [
      { text: "Everything in Professional, plus…" },
      { text: "Clinical (eMAR, vitals, ADLs, assessments)" },
      { text: "Scheduling Intel — AI shift matching", isNew: true },
      { text: "AI-generated visit summaries", isNew: true },
      { text: "Revenue Cycle: 837P claims, 835 remits, denials, aging" },
      { text: "Prebill review queue with override limits" },
      { text: "Paid-invoice visit lock (financial integrity)", isNew: true },
      { text: "Eligibility 270/271 & claim-status 276" },
      { text: "Bulk migration & web admin" },
    ],
    cta: { text: "Try Enterprise free for 45 days", href: "/signup?tier=enterprise" },
    highlight: true,
  },
];

/* Comparison matrix — 3 columns (Standard, Professional, Enterprise) */
const MATRIX: { group: string; rows: { name: string; isNew?: boolean; tip?: string; values: (boolean | string)[] }[] }[] = [
  {
    group: "Care & Client Management",
    rows: [
      { name: "Clients included", values: ["2 max", "25 max", "100 max"] },
      { name: "Client & caregiver profiles", values: [true, true, true] },
      { name: "Visit notes & tasks", values: [true, true, true] },
      { name: "Care plans & goals", isNew: true, values: [true, true, true] },
      { name: "Incident reporting", values: [false, true, true] },
      { name: "eMAR medication tracking", isNew: true, values: [false, false, true] },
      { name: "Authorizations & funding balances", isNew: true, values: [false, true, true] },
      { name: "Family Portal", values: ["Read-only", true, true] },
    ],
  },
  {
    group: "Scheduling & Workforce",
    rows: [
      { name: "Scheduler & shift assignment", values: [true, true, true] },
      { name: "Recurring visits & templates", values: [false, true, true] },
      { name: "Caregiver mobile app (offline)", values: [true, true, true] },
      { name: "AI shift matching", isNew: true, tip: "Recommends caregivers using skills, geography, and history", values: [false, false, true] },
      { name: "Live map & geofence alerts", values: [false, true, true] },
      { name: "Overtime forecast & utilization", values: [false, true, true] },
      { name: "Open shift broadcast", values: [false, true, true] },
    ],
  },
  {
    group: "EVV & Visit Verification",
    rows: [
      { name: "GPS-verified clock-in / clock-out", isNew: true, values: [true, true, true] },
      { name: "Offline EVV", values: [true, true, true] },
      { name: "Telephony EVV fallback", values: [false, true, true] },
      { name: "Late clock-in alerts", values: [false, true, true] },
      { name: "Sandata batch ingest", values: [false, true, true] },
      { name: "HHAeXchange & state aggregator push", isNew: true, values: [false, false, true] },
      { name: "Audit-ready visit records", values: [true, true, true] },
    ],
  },
  {
    group: "Billing, Payroll & Revenue Cycle",
    rows: [
      { name: "Invoicing from EVV hours only", isNew: true, tip: "Billing uses GPS-verified hours, not scheduled estimates", values: [false, true, true] },
      { name: "Auto-billing run", values: [false, true, true] },
      { name: "Payroll from verified hours", values: [false, true, true] },
      { name: "Paid-invoice visit lock", isNew: true, tip: "Visits on paid invoices cannot be deleted or altered", values: [false, true, true] },
      { name: "Recalculation on EVV edits (unpaid only)", values: [false, true, true] },
      { name: "837P claim generation", values: [false, false, true] },
      { name: "835 remittance posting", values: [false, false, true] },
      { name: "Prebill review queue + override limits", values: [false, false, true] },
      { name: "Denials & aging dashboards", values: [false, false, true] },
      { name: "Eligibility 270/271, claim-status 276/277", values: [false, false, true] },
    ],
  },
  {
    group: "Compliance, Security & Communication",
    rows: [
      { name: "Role-based access control", values: [true, true, true] },
      { name: "Two-factor authentication", values: [true, true, true] },
      { name: "Session timeout & audit log", values: [true, true, true] },
      { name: "PHI-redacted messaging", isNew: true, tip: "Filters SSN, MRN, DOB, and PHI patterns before send", values: [true, true, true] },
      { name: "Secure attachments with PHI filename scan", isNew: true, values: [true, true, true] },
      { name: "OIG / SAM exclusion scan", values: [false, true, true] },
      { name: "Training & credential reminders", values: [false, true, true] },
    ],
  },
  {
    group: "Integrations & Support",
    rows: [
      { name: "Stripe payments", values: [true, true, true] },
      { name: "Email & SMS notifications", values: [true, true, true] },
      { name: "Sandata aggregator", values: [false, true, true] },
      { name: "HHAeXchange aggregator", values: [false, false, true] },
      { name: "Guided implementation & data migration", values: [false, false, "Self-serve"] },
      { name: "Support — docs & community", values: [true, true, true] },
      { name: "Email support SLA", tip: "Business-day response targets. Standard: self-serve first, then 48h email. Professional: 24h email + chat. Enterprise: 4h priority.", values: ["48h", "24h", "4h priority"] },
      { name: "Clearinghouse / 837P / eMAR troubleshooting", tip: "Hands-on help with claim rejections, eMAR setup, and RCM workflows is Enterprise-only. Standard and Professional are pointed to documentation.", values: [false, false, true] },
    ],
  },
];

const FALLBACK_PRICES: Record<string, { monthly: number; yearly: number }> = {
  standard: { monthly: 99, yearly: 990 },
  professional: { monthly: 199, yearly: 1990 },
  enterprise: { monthly: 299, yearly: 2990 },
};

function PriceDisplay({
  tier, db, cycle,
  isFeatured = false,
}: { tier: typeof TIERS[number]; db: any; cycle: "monthly" | "yearly"; isFeatured?: boolean }) {
  const row = db?.find?.((t: any) => t.slug === tier.slug);
  const fallback = FALLBACK_PRICES[tier.slug];
  const price = cycle === "yearly"
    ? (row?.yearly_price ?? fallback?.yearly)
    : (row?.monthly_price ?? fallback?.monthly);
  const hasPrice = price && Number(price) > 0;
  return (
    <div className="space-y-1">
      <div className={`font-display text-4xl font-semibold leading-none ${isFeatured ? "text-white" : "text-foreground"}`}>
        {hasPrice ? `$${Number(price).toLocaleString()}` : "Free"}
      </div>
      <div className={`text-sm ${isFeatured ? "text-white/70" : "text-muted-foreground"}`}>
        {hasPrice
          ? (cycle === "yearly" ? "per year, billed annually" : "per month, billed monthly")
          : "45-day trial, no card required"}
      </div>
    </div>
  );
}

function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <Check className="h-5 w-5 text-primary mx-auto" aria-label="Included" />;
  if (v === false) return <X className="h-4 w-4 text-muted-foreground/40 mx-auto" aria-label="Not included" />;
  return <span className="text-xs font-medium">{v}</span>;
}

function suggestTier(staff: number): string {
  if (staff <= 5) return "standard";
  if (staff <= 25) return "professional";
  return "enterprise";
}

export default function Pricing() {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [staff, setStaff] = useState<number>(5);
  const [tiersDb, setTiersDb] = useState<any[]>([]);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [resolvingCheckout, setResolvingCheckout] = useState<string | null>(null);

  const startCheckout = async (tierSlug: string) => {
    if (authLoading) return;
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent("/pricing")}`);
      return;
    }
    setResolvingCheckout(tierSlug);
    try {
      const { data: profile } = await (supabase as any)
        .from("profiles").select("default_company_id").eq("id", user.id).maybeSingle();
      if (!profile?.default_company_id) {
        navigate(`/signup?tier=${tierSlug}&cycle=${cycle}`);
        return;
      }
      setCheckoutPriceId(`${tierSlug}_small_${cycle}`);
      setCheckoutOpen(true);
    } catch (e: any) {
      toast({ title: "Could not start checkout", description: e.message, variant: "destructive" });
    } finally {
      setResolvingCheckout(null);
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("subscription_tiers").select("*").eq("active", true).order("sort_order");
      setTiersDb(data ?? []);
    })();
  }, []);

  const suggested = useMemo(() => suggestTier(staff), [staff]);

  return (
    <div className="min-h-screen bg-[hsl(36_45%_96%)] text-foreground">
      <Helmet>
        <title>CareWeaveHQ Pricing — Plans for Home Care Agencies</title>
        <meta name="description" content="Simple pricing for home care agencies. 45-day free trial on any plan. Standard $99/mo, Professional $199/mo, Enterprise $299/mo." />
        <link rel="canonical" href="https://careweavehq.com/pricing" />
        <meta property="og:title" content="CareWeaveHQ Pricing — Plans for Home Care Agencies" />
        <meta property="og:description" content="Simple pricing for home care agencies. 45-day free trial on any plan." />
        <meta property="og:url" content="https://careweavehq.com/pricing" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "CareWeaveHQ",
          "description": "Home care management platform with EVV, scheduling, billing, and payroll.",
          "brand": { "@type": "Organization", "name": "CareWeaveHQ" },
          "offers": { "@type": "AggregateOffer", "priceCurrency": "USD", "lowPrice": "0", "url": "https://careweavehq.com/pricing" }
        })}</script>
      </Helmet>
      {/* Local serif + chrome */}
      <style>{`
        .font-display{font-family:'Libre Baskerville','Playfair Display',ui-serif,Georgia,serif;letter-spacing:-0.015em}
        .font-mono-tight{font-family:'IBM Plex Mono',ui-monospace,SFMono-Regular,monospace;letter-spacing:0.02em}
        .grain{background-image:radial-gradient(hsl(220 45% 15% / 0.04) 1px,transparent 1px);background-size:3px 3px}
      `}</style>

      {/* Top nav */}
      <header className="sticky top-0 z-30 backdrop-blur bg-[hsl(220_45%_12%/_0.92)] border-b border-white/10 text-white">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl font-bold tracking-tight">CareWeaveHQ</Link>
          <nav className="hidden md:flex items-center gap-7 text-sm">
            <a href="#plans" className="text-white/80 hover:text-white">Plans</a>
            <a href="#compare" className="text-white/80 hover:text-white">Compare</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-sm text-white/80 hover:text-white hidden sm:inline">Sign in</Link>
            <ExperimentCTA
              ctaId="pricing_nav_signup"
              variants={PRICING_CTAS.navSignup}
              to="/signup"
              conversionIntent
              className="rounded-full bg-white text-[hsl(220_45%_15%)] hover:bg-white/90"
              helperClassName="hidden md:block"
            />
          </div>
        </div>
      </header>

      <main>
      {/* Hero — navy editorial */}
      <section className="relative bg-[hsl(220_45%_12%)] text-white overflow-hidden">
        <div className="absolute inset-0 grain opacity-60 pointer-events-none" />
        <div className="absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-[hsl(195_85%_72%/_0.18)] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-[hsl(220_85%_50%/_0.18)] blur-3xl pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-28 text-center">
        <div className="inline-flex items-center gap-2 text-[11px] font-mono-tight uppercase tracking-[0.22em] text-white/60 mb-6">
          <Sparkles className="h-3.5 w-3.5" /> {HERO_COPY.eyebrow} · 3 plans only
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[1.02] text-white">
          {HERO_COPY.headline}
        </h1>
        <p className="mt-6 text-lg text-white/70 max-w-2xl mx-auto">{HERO_COPY.sub}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ExperimentCTA
            ctaId="pricing_hero_primary"
            variants={PRICING_CTAS.heroPrimary}
            to="/signup"
            conversionIntent
            size="lg"
            className="rounded-full px-8 bg-white text-[hsl(220_45%_15%)] hover:bg-white/90 shadow-[0_10px_40px_-10px_hsl(195_85%_72%/_0.5)]"
          />
        </div>

        {/* Staff sizer + cycle toggle */}
        <div className="mt-16 grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
          <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur p-5 text-left">
            <label className="text-[11px] font-mono-tight uppercase tracking-[0.18em] text-white/60">
              How many staff do you have?
            </label>
            <div className="mt-2 flex items-center gap-3">
              <Input
                type="number"
                min={1}
                value={staff}
                onChange={(e) => setStaff(Math.max(1, Number(e.target.value || 1)))}
                className="w-24 text-center text-lg font-semibold bg-white/10 border-white/20 text-white"
              />
              <span className="text-sm text-white/60">admins + caregivers</span>
            </div>
            <p className="mt-2 text-xs text-white/70">
              We suggest{" "}
              <strong className="text-[hsl(195_85%_72%)]">
                {TIERS.find((t) => t.slug === suggested)?.label}
              </strong>{" "}
              for your team.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur p-5 text-left flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Pay annually</div>
              <div className="text-xs text-white/60">Save up to 20%</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm ${cycle === "monthly" ? "font-semibold text-white" : "text-white/50"}`}>Monthly</span>
              <Switch checked={cycle === "yearly"} onCheckedChange={(v) => setCycle(v ? "yearly" : "monthly")} />
              <span className={`text-sm ${cycle === "yearly" ? "font-semibold text-white" : "text-white/50"}`}>Yearly</span>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Tier cards — asymmetric, Professional featured */}
      <section id="plans" className="mx-auto max-w-7xl px-6 -mt-16 pb-20 relative z-10">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 items-stretch">
          {TIERS.map((t) => {
            const isFeatured = t.slug === "professional";
            const isSuggested = suggested === t.slug;
            const isHighlight = isFeatured || isSuggested;
            return (
              <div
                key={t.slug}
                className={`relative flex flex-col rounded-3xl border p-7 transition-all ${
                  isFeatured
                    ? "border-[hsl(220_45%_15%)] bg-[hsl(220_45%_12%)] text-white shadow-[0_30px_80px_-30px_hsl(220_45%_15%/_0.6)] lg:scale-[1.04] lg:-mt-2 lg:mb-2 z-20"
                    : isSuggested
                    ? "bg-card border-primary/50 shadow-lg ring-1 ring-primary/20"
                    : "bg-card border-border/60 hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                {(isFeatured || isSuggested) && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    isFeatured
                      ? "bg-[hsl(195_85%_72%)] text-[hsl(220_45%_15%)]"
                      : "bg-[hsl(220_45%_18%)] text-white"
                  }`}>
                    {isFeatured ? "Most popular" : "Suggested for you"}
                  </div>
                )}
                <div className={`font-mono-tight text-[11px] uppercase tracking-[0.22em] ${isFeatured ? "text-white/60" : "text-muted-foreground"}`}>
                  Tier {TIERS.indexOf(t) + 1} of 3
                </div>
                <div className={`font-display text-3xl font-semibold mt-2 ${isFeatured ? "text-white" : "text-foreground"}`}>{t.label}</div>
                <p className={`mt-2 text-sm min-h-[3rem] ${isFeatured ? "text-white/70" : "text-muted-foreground"}`}>{t.tagline}</p>
                <div className="mt-5">
                  <PriceDisplay tier={t} db={tiersDb} cycle={cycle} isFeatured={isFeatured} />
                </div>
                <Button
                  className={`mt-6 rounded-full ${
                    isFeatured ? "bg-[hsl(195_85%_72%)] text-[hsl(220_45%_15%)] hover:bg-[hsl(195_85%_78%)]" : ""
                  }`}
                  variant={isFeatured ? "default" : isSuggested ? "default" : "outline"}
                  onClick={() => startCheckout(t.slug)}
                  disabled={resolvingCheckout === t.slug || authLoading}
                >
                  {resolvingCheckout === t.slug ? "Loading…" : t.cta.text}
                </Button>
                <div className={`my-6 h-px ${isFeatured ? "bg-white/15" : "bg-border/60"}`} />
                <div className={`text-[11px] font-mono-tight uppercase tracking-[0.22em] mb-3 ${isFeatured ? "text-white/60" : "text-muted-foreground"}`}>
                  What you get
                </div>
                <ul className={`space-y-2 text-sm ${isFeatured ? "text-white" : "text-foreground"}`}>
                  {t.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${isFeatured ? "text-[hsl(195_85%_72%)]" : "text-primary"}`} />
                      <span className={isFeatured ? "text-white" : "text-foreground"}>
                        {f.text}{" "}
                        {f.isNew && (
                          <Badge variant="outline" className={`ml-1 text-[10px] font-semibold uppercase tracking-wider ${isFeatured ? "border-[hsl(195_85%_72%)]/60 text-[hsl(195_85%_72%)]" : "border-primary/40 text-primary"}`}>
                            New
                          </Badge>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className={`mt-6 pt-4 border-t text-sm italic ${isFeatured ? "border-white/15 text-white/70" : "border-border/60 text-muted-foreground"}`}>
                  {t.outcome}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-8 text-center text-xs font-mono-tight uppercase tracking-[0.18em] text-muted-foreground">
          All plans · 45-day free trial (one per company) · No credit card · Cancel anytime
        </p>
      </section>

      {/* Differentiators */}
      <section className="bg-[hsl(220_45%_15%)] text-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="text-xs uppercase tracking-[0.18em] text-white/60 mb-3">Why CareWeaveHQ</div>
            <h2 className="font-display text-3xl md:text-5xl font-semibold leading-tight">
              Audit-ready records. Claim-ready invoices. PHI-safe by default.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: MapPin, t: "GPS-verified hours", d: "Billing and payroll only ever use EVV-verified hours — never scheduled estimates." },
              { icon: ShieldCheck, t: "PHI-redacted messaging", d: "SSN, MRN, DOB, and other PHI patterns are blocked from messages and filenames before they ever send." },
              { icon: Lock, t: "Paid-invoice lock", d: "Once a visit is on a paid invoice, it can't be deleted. Unpaid invoices recalculate automatically on EVV edits." },
              { icon: Bot, t: "AI for care teams", d: "AI shift matching, visit summaries, and manual draft assistance keep schedulers and clinicians ahead." },
            ].map((d, i) => (
              <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <d.icon className="h-6 w-6 text-[hsl(195_85%_72%)]" />
                <div className="mt-4 font-display text-xl font-semibold">{d.t}</div>
                <p className="mt-2 text-sm text-white/70">{d.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison matrix */}
      <section id="compare" className="mx-auto max-w-7xl px-6 pb-20">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">Compare plans</div>
          <h2 className="font-display text-3xl md:text-4xl font-semibold">Every capability, side by side</h2>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
          <table className="w-full text-sm">
            <thead className="bg-[hsl(36_45%_94%)] sticky top-16 z-10">
              <tr>
                <th className="text-left p-4 font-semibold w-[34%]">Features</th>
                {TIERS.map((t) => (
                  <th key={t.slug} className="p-4 text-center font-semibold">
                    <div className="font-display text-base">{t.label}</div>
                    <div className="text-[11px] font-normal text-muted-foreground mt-0.5 max-w-[160px] mx-auto">
                      {t.tagline}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((group) => (
                <Section key={group.group} group={group} />
              ))}
            </tbody>
          </table>
        </div>

        {/* CTA strip */}
        <div className="mt-12 rounded-3xl bg-[hsl(220_45%_12%)] text-white p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[hsl(195_85%_72%/_0.2)] blur-3xl" />
          <h3 className="relative font-display text-3xl md:text-5xl font-semibold leading-tight">Ready to see CareWeaveHQ on your data?</h3>
          <p className="relative mt-4 text-white/70 max-w-xl mx-auto">
            Try any plan free for 45 days — no credit card. One trial per company. Switch between Standard, Professional, and Enterprise any time during the trial.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ExperimentCTA
              ctaId="pricing_footer_primary"
              variants={PRICING_CTAS.footerPrimary}
              to="/signup"
              conversionIntent
              size="lg"
              className="rounded-full px-7 bg-white text-[hsl(220_45%_15%)] hover:bg-white/90"
            />
            <ExperimentCTA
              ctaId="pricing_footer_secondary"
              variants={PRICING_CTAS.footerSecondary}
              href="mailto:sales@careweavehq.com"
              size="lg"
              variant="outline"
              className="rounded-full px-7 border-white/30 text-white hover:bg-white/10"
            />
          </div>
        </div>
      </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-[hsl(36_45%_94%)]">
        <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} CareWeaveHQ</div>
          <div className="flex items-center gap-6">
            <Link to="/legal/terms" className="hover:text-primary">Terms</Link>
            <Link to="/legal/privacy" className="hover:text-primary">Privacy</Link>
            <Link to="/legal/hipaa" className="hover:text-primary">HIPAA</Link>
            <Link to="/docs" className="hover:text-primary">Docs</Link>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6 pb-8 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">SLA Support:</span>{" "}
          Standard (Docs + Community + 48h email); Professional (24h email);
          Enterprise (4h priority + clearinghouse troubleshooting).
        </div>
      </footer>

      <Dialog open={checkoutOpen} onOpenChange={(o) => { setCheckoutOpen(o); if (!o) setCheckoutPriceId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Start your 45-day free trial</DialogTitle>
            <DialogDescription>
              No credit card required. One trial per company — you can switch plans at any time during the 45 days.
            </DialogDescription>
          </DialogHeader>
          <PaymentTestModeBanner />
          {checkoutPriceId && user && (
            <StripeEmbeddedCheckout
              priceId={checkoutPriceId}
              customerEmail={user.email ?? undefined}
              userId={user.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ group }: { group: typeof MATRIX[number] }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <tr className="border-t border-border/60 bg-[hsl(36_45%_97%)]">
        <td colSpan={4} className="p-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="w-full text-left font-display text-base font-semibold flex items-center gap-2"
          >
            <ChevronRight className={`h-4 w-4 transition ${open ? "rotate-90" : ""}`} />
            {group.group}
          </button>
        </td>
      </tr>
      {open && group.rows.map((row, i) => (
        <tr key={i} className="border-t border-border/40">
          <td className="p-3 pl-9">
            <span>{row.name}</span>
            {row.isNew && (
              <Badge variant="outline" className="ml-2 border-primary/40 text-[10px] font-semibold uppercase tracking-wider text-primary">
                New
              </Badge>
            )}
            {row.tip && (
              <div className="text-xs text-muted-foreground mt-0.5">{row.tip}</div>
            )}
          </td>
          {row.values.map((v, j) => (
            <td key={j} className="p-3 text-center">
              <Cell v={v} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
