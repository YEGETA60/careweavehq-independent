import { Link } from "react-router-dom";
import { BookOpen, FileText, GraduationCap, LifeBuoy, ShieldCheck, Newspaper, ArrowRight, Award, ExternalLink } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";

const articles = [
  {
    cat: "Guide",
    t: "The 2026 EVV compliance handbook",
    d: "A state-by-state breakdown of EVV requirements, aggregator choices, and the data your agency must capture.",
    icon: ShieldCheck,
  },
  {
    cat: "Playbook",
    t: "Migrating from a legacy home care platform",
    d: "A four-week migration plan covering data export, authorization mapping, EVV cutover, and staff training.",
    icon: GraduationCap,
  },
  {
    cat: "Article",
    t: "Why EVV-driven billing beats schedule-based billing",
    d: "Real-world examples of revenue leakage when invoices are built from scheduled (not verified) hours.",
    icon: Newspaper,
  },
  {
    cat: "Case study",
    t: "How Helping Hands scaled from 40 to 220 caregivers",
    d: "Inside a multi-state agency's path to faster scheduling, cleaner claims, and a 4.9-star Google rating.",
    icon: BookOpen,
  },
  {
    cat: "Guide",
    t: "Hiring and retaining home care caregivers in 2026",
    d: "Compensation benchmarks, shift design, and onboarding patterns that move retention from 50% to 80%.",
    icon: GraduationCap,
  },
  {
    cat: "Reference",
    t: "Glossary of home care billing terms",
    d: "837P, 835, 270/271, HCBS, MLTSS, IHSS, CDPAP — what every acronym means and when it matters.",
    icon: FileText,
  },
];

const quickLinks = [
  { t: "Product documentation", d: "Setup guides, API reference, integration walkthroughs.", to: "/docs", icon: BookOpen },
  { t: "HIPAA & security", d: "How we protect PHI, our subprocessors, and BAA details.", to: "/legal/hipaa", icon: ShieldCheck },
  { t: "Help center", d: "Day-to-day how-tos for schedulers, billers, and admins.", to: "/docs", icon: LifeBuoy },
  { t: "Terms & privacy", d: "Legal terms, privacy notice, and data processing addendum.", to: "/legal/terms", icon: FileText },
];

const industryLinks = [
  { t: "Alliance for Care at Home", d: "National advocacy for home care — merged NAHC + HCAOA. Legislative updates, research, and industry standards.", href: "https://allianceforcareathome.org", icon: Award },
];

export default function Resources() {
  return (
    <MarketingLayout
      title="Resources — CareWeaveHQ"
      description="Guides, playbooks, and references for running a modern home care agency — EVV compliance, billing, hiring, and migration."
      canonicalPath="/resources"
    >
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/60 px-3 py-1 text-xs">
            <BookOpen className="h-3.5 w-3.5" /> Operator-grade guides
          </div>
          <h1 className="mt-5 font-display text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            The home care operator's library.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Written by people who have actually billed Medicare and Medicaid, managed schedulers, and survived a state audit. No fluff.
          </p>
        </div>
      </section>

      {/* Articles */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6">Latest reading</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((a) => (
            <article key={a.t} className="rounded-2xl border border-border/60 bg-white/70 p-6 flex flex-col">
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 font-medium">{a.cat}</span>
              </div>
              <div className="mt-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <a.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg leading-snug">{a.t}</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground flex-1">{a.d}</p>
              <div className="mt-5 text-sm text-primary inline-flex items-center gap-1">Coming soon <ArrowRight className="h-3.5 w-3.5" /></div>
            </article>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6">Documentation & policies</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {quickLinks.map((q) => (
            <Link key={q.t} to={q.to} className="rounded-2xl border border-border/60 bg-white/70 p-6 hover:border-primary/50 transition-colors flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <q.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">{q.t}</div>
                <p className="mt-1 text-sm text-muted-foreground">{q.d}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Industry & Advocacy */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <h2 className="font-display text-2xl md:text-3xl font-semibold mb-6">Industry & Advocacy</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {industryLinks.map((l) => (
            <a key={l.t} href={l.href} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-border/60 bg-white/70 p-6 hover:border-primary/50 transition-colors flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <l.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-1">
                  {l.t}
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{l.d}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Newsletter / CTA */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-3xl bg-[hsl(220_45%_18%)] text-white p-10 md:p-14 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold">Ready to put this into practice?</h2>
          <p className="mt-3 text-white/80 max-w-2xl mx-auto">
            Start a 45-day free trial and we'll migrate your data while you read.
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