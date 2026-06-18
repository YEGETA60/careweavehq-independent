import { Link } from "react-router-dom";
import {
  Calendar, ShieldCheck, FileCheck2, Wallet, MessageSquareLock, MapPin,
  Bot, Stethoscope, Building2, HeartHandshake, Lock, Sparkles, ArrowRight,
  Check,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";

const featureGroups = [
  {
    title: "Scheduling & EVV",
    icon: Calendar,
    items: [
      { name: "Drag-and-drop scheduler", desc: "Build week-views in seconds with conflict, travel-time, and authorization checks baked in." },
      { name: "GPS-verified EVV", desc: "Clock-in and clock-out captured from the caregiver's phone with geofence and accuracy radius." },
      { name: "Telephony fallback", desc: "IVR clock-in for caregivers without smartphones, with caller-ID verification." },
      { name: "Live roster board", desc: "See who's clocked in, late, or missed — color-coded and refreshing in real time." },
    ],
  },
  {
    title: "Compliance & audit",
    icon: ShieldCheck,
    items: [
      { name: "HIPAA-grade audit log", desc: "Every read, write, and export is fingerprinted with user, IP, and PHI fields touched." },
      { name: "Role-based access", desc: "Granular roles for caregivers, schedulers, billers, and administrators — enforced at the database row level." },
      { name: "OIG & SAM exclusion checks", desc: "Automated monthly screening with alerts and a permanent record of each result." },
      { name: "Document expiration tracking", desc: "Licenses, CPR cards, TB tests, and trainings flagged before they lapse." },
    ],
  },
  {
    title: "Billing & payroll",
    icon: Wallet,
    items: [
      { name: "837P claim generation", desc: "Build, scrub, and submit professional claims with payer-specific rules and rejection workflows." },
      { name: "EVV-driven invoicing", desc: "Invoices are calculated from verified hours, never scheduled estimates — so revenue matches reality." },
      { name: "Multi-state payroll export", desc: "Overtime, travel time, and shift differentials computed per state law and delivered as a clean CSV." },
      { name: "Eligibility 270/271", desc: "Real-time eligibility checks against state Medicaid and Medicare systems before the visit happens." },
    ],
  },
  {
    title: "Care delivery",
    icon: HeartHandshake,
    items: [
      { name: "Digital care plans", desc: "Task lists tailored to each client with caregiver acknowledgement and outcome capture." },
      { name: "Visit notes & vitals", desc: "Structured notes, vitals, and incident reports captured at point of care." },
      { name: "Secure family portal", desc: "Loved ones see visit summaries and message the care team without seeing PHI they shouldn't." },
      { name: "Care coordination", desc: "Shared notes, alerts, and handoffs across nurses, schedulers, and family." },
    ],
  },
  {
    title: "Aggregator integrations",
    icon: Building2,
    items: [
      { name: "Sandata", desc: "Bidirectional batch export and acknowledgement reconciliation with full retry semantics." },
      { name: "HHAeXchange", desc: "Visit confirmations, member rosters, and authorization sync." },
      { name: "CareBridge & Tellus", desc: "State-specific adapters with rolling delivery windows and failure isolation." },
      { name: "Direct payer EDI", desc: "Submit 837P and reconcile 835 remittance for payers that accept direct file delivery." },
    ],
  },
  {
    title: "Intelligence",
    icon: Bot,
    items: [
      { name: "AI assistant", desc: "Ask plain-English questions about your agency and get answers grounded in your own data." },
      { name: "Anomaly detection", desc: "Late clock-ins, drift in travel time, and unusual overtime patterns surfaced automatically." },
      { name: "Revenue forecasting", desc: "Pipeline view of authorized hours, scheduled hours, and projected reimbursement." },
      { name: "Caregiver retention signals", desc: "Early warning when shift acceptance, hours, or response time start to slip." },
    ],
  },
];

export default function Features() {
  return (
    <MarketingLayout
      title="Features — CareWeaveHQ"
      description="Scheduling, EVV, billing, payroll, compliance, and care coordination — every workflow a home care agency runs, on one HIPAA-grade platform."
      canonicalPath="/features"
    >
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-12">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/60 px-3 py-1 text-xs">
            <Sparkles className="h-3.5 w-3.5" /> Built for home care, not retrofitted from generic EHR
          </div>
          <h1 className="mt-5 font-display text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            Every workflow your agency runs — on one connected fabric.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            CareWeaveHQ replaces the patchwork of EVV apps, billing tools, spreadsheets, and chat threads with a single
            system where scheduling, compliance, and revenue stay in sync.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/signup" className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:opacity-90 inline-flex items-center gap-2">
              Start your 45-day free trial <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/pricing" className="rounded-full border border-border px-6 py-3 text-sm font-medium hover:bg-white/60">
              See pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Feature groups */}
      <section className="mx-auto max-w-7xl px-6 pb-16 space-y-12">
        {featureGroups.map((g) => (
          <div key={g.title}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <g.icon className="h-5 w-5" />
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold">{g.title}</h2>
            </div>
            <div className="mt-5 grid md:grid-cols-2 gap-4">
              {g.items.map((it) => (
                <div key={it.name} className="rounded-2xl border border-border/60 bg-white/70 p-5">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold">{it.name}</div>
                      <p className="text-sm text-muted-foreground mt-1">{it.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-3xl bg-[hsl(220_45%_18%)] text-white p-10 md:p-14 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold">See it on your own data</h2>
          <p className="mt-3 text-white/80 max-w-2xl mx-auto">
            We migrate your roster, authorizations, and historical visits for you — no spreadsheets, no downtime.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="rounded-full bg-white text-slate-900 px-6 py-3 text-sm font-medium">Start 45-day free trial</Link>
            <Link to="/pricing" className="rounded-full border border-white/30 px-6 py-3 text-sm font-medium">Compare plans</Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}