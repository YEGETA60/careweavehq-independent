import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Link } from "react-router-dom";
import { Briefcase } from "lucide-react";

export default function Careers() {
  return (
    <MarketingLayout
      title="Careers at CareWeaveHQ | Coming Soon"
      description="We're not hiring just yet — open roles at CareWeaveHQ are coming soon. Check back for engineering, product, and customer success opportunities."
      canonicalPath="/careers"
    >
      <section className="mx-auto max-w-3xl px-6 py-24 md:py-32 text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Briefcase className="h-7 w-7 text-primary" />
        </div>
        <p className="mt-6 text-sm uppercase tracking-[0.2em] text-primary font-semibold">Careers</p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl font-bold tracking-tight">
          Coming soon.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          We&apos;re a small team building the next generation of home care software.
          Open roles aren&apos;t posted yet — check back here soon, or reach out if you think
          you&apos;d be a great fit.
        </p>
        <div className="mt-8">
          <Link
            to="/contact"
            className="inline-flex items-center rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90"
          >
            Get in touch
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}