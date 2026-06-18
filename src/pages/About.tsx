import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { ShieldCheck, HeartPulse, Sparkles } from "lucide-react";

export default function About() {
  return (
    <MarketingLayout
      title="About CareWeaveHQ | Home Care Software Built by Industry Veterans"
      description="CareWeaveHQ is a software company with over 10 years of hands-on home health care experience, building a single fabric for Medicaid, Medicare, HCBS and private-pay agencies."
      canonicalPath="/about"
    >
      <section className="mx-auto max-w-4xl px-6 py-16 md:py-24">
        <p className="text-sm uppercase tracking-[0.2em] text-primary font-semibold">About us</p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl font-bold tracking-tight">
          A software company with deep roots in home health care.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          CareWeaveHQ is built by a team that has spent <strong>more than 10 years</strong> inside the
          home health and home care industry — running operations, fixing EVV gaps,
          chasing Medicaid claims, and onboarding caregivers at 6 a.m. We know the work
          because we&apos;ve done the work.
        </p>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          We&apos;re a small, focused software company on a mission to give agencies a single,
          trustworthy fabric for scheduling, EVV, billing, payroll, and compliance —
          without the duct tape, rekeying, and spreadsheets that drain margin and
          burn out office staff.
        </p>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-border/60 bg-background p-6">
            <HeartPulse className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-semibold">10+ years in home care</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Built by people who have worked inside agencies — not outside software teams without home care experience.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background p-6">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-semibold">Compliance-first</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              HIPAA, EVV, and state aggregator rules treated as features, not afterthoughts.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background p-6">
            <Sparkles className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-semibold">Modern, opinionated software</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              One platform, audit trails everywhere, and AI assistance where it actually saves time.
            </p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}