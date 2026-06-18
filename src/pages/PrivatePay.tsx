import { Link } from "react-router-dom";
import { Wallet, CreditCard, HeartHandshake, Check, ArrowRight, Sparkles, MessageSquareLock, Calendar } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";

const features = [
  { icon: CreditCard, t: "Card, ACH, and recurring billing", d: "Charge clients on the card on file, schedule recurring weekly or monthly invoices, and dunning is handled for you." },
  { icon: Wallet, t: "Flexible rate sheets", d: "Hourly, live-in, overnight, holiday, and skilled-nursing rates — different per client if you need it." },
  { icon: Calendar, t: "Family-friendly scheduling", d: "Self-serve schedule changes for clients and adult children, with approval rules you control." },
  { icon: MessageSquareLock, t: "Family communication portal", d: "Loved ones see visit summaries and message the care team — without exposing PHI they shouldn't see." },
  { icon: HeartHandshake, t: "Concierge intake", d: "A polished digital intake flow with e-signatures, deposits, and instant scheduling — no PDFs flying around." },
  { icon: Sparkles, t: "AI-assisted matching", d: "Match clients to caregivers by skills, geography, and personality — and learn from each replacement." },
];

export default function PrivatePay() {
  return (
    <MarketingLayout
      title="Private Pay Home Care — CareWeaveHQ"
      description="Run a premium private-pay home care agency. Card on file billing, family portal, polished intake, and scheduling that earns referrals."
      canonicalPath="/private-pay"
    >
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-12">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/60 px-3 py-1 text-xs">
            <Sparkles className="h-3.5 w-3.5" /> Designed for premium private-pay agencies
          </div>
          <h1 className="mt-5 font-display text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            The polish your clients expect, the controls you need.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            CareWeaveHQ handles card-on-file billing, family communication, and concierge-grade intake — so your agency
            feels like a five-star service from the first call to the monthly invoice.
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

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { v: "94%", l: "of invoices paid in 7 days with card on file" },
            { v: "3.2x", l: "more 5-star Google reviews after switching" },
            { v: "12 min", l: "average time from inquiry to confirmed schedule" },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl border border-border/60 bg-white/70 p-6">
              <div className="font-display text-4xl font-bold">{s.v}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <h2 className="font-display text-3xl md:text-4xl font-semibold">Built for the way private pay actually works</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.t} className="rounded-2xl border border-border/60 bg-white/70 p-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-semibold text-lg">{f.t}</div>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-3xl bg-white border border-border/60 p-8 md:p-12">
          <h2 className="font-display text-2xl md:text-3xl font-semibold">From inquiry to invoice in one flow</h2>
          <ol className="mt-8 grid md:grid-cols-4 gap-6 text-sm">
            {[
              { n: "1", t: "Inquiry", d: "Website form or phone call creates a lead with assessment notes." },
              { n: "2", t: "Intake", d: "Digital agreement, e-signature, ACH or card on file captured." },
              { n: "3", t: "Care", d: "Scheduled visits delivered, EVV-verified, family notified." },
              { n: "4", t: "Invoice", d: "Charged automatically, receipt emailed, statement on the portal." },
            ].map((s) => (
              <li key={s.n} className="rounded-2xl border border-border/60 p-5">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">{s.n}</div>
                <div className="mt-3 font-semibold">{s.t}</div>
                <p className="mt-1 text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-3xl bg-[hsl(220_45%_18%)] text-white p-10 md:p-14 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold">Run the agency clients brag about.</h2>
          <p className="mt-3 text-white/80 max-w-2xl mx-auto">
            45-day free trial. White-glove data migration. No setup fee.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="rounded-full bg-white text-slate-900 px-6 py-3 text-sm font-medium">Start 45-day free trial</Link>
            <Link to="/pricing" className="rounded-full border border-white/30 px-6 py-3 text-sm font-medium">See pricing</Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}