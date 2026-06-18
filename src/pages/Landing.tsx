import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Input } from "@/components/ui/input";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ShieldCheck, MapPin, Lock, Bot, Sparkles, ArrowRight, Star,
  Calendar, FileCheck2, Wallet, MessageSquareLock, Stethoscope,
  HeartHandshake, Check,
} from "lucide-react";
import { ExperimentCTA } from "@/components/ExperimentCTA";
import { markPendingConversion, getVariant } from "@/lib/cta-experiments";

// Lightweight scroll-reveal: fades + lifts children into view once.
function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div" as any,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: any;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setShown(true); return; }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { setShown(true); io.disconnect(); break; }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

function RosterMockup() {
  const rows = [
    { initials: "MG", name: "Maria Garcia", color: "bg-blue-500", status: "Clocked In", statusCls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", clock: "8:02 AM", hours: "4h 38m" },
    { initials: "JL", name: "James Liu", color: "bg-emerald-500", status: "On Break", statusCls: "bg-amber-100 text-amber-700", dot: "bg-amber-500", clock: "7:55 AM", hours: "4h 45m" },
    { initials: "SP", name: "Sara Park", color: "bg-violet-500", status: "Late (12m)", statusCls: "bg-rose-100 text-rose-700", dot: "bg-rose-500", clock: "8:17 AM", hours: "4h 23m" },
    { initials: "RT", name: "Rob Torres", color: "bg-amber-500", status: "Not Clocked In", statusCls: "bg-slate-100 text-slate-600", dot: "bg-slate-400", clock: "—", hours: "—" },
    { initials: "AK", name: "Amy Kim", color: "bg-rose-500", status: "Clocked In", statusCls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", clock: "8:01 AM", hours: "4h 39m" },
  ];
  const stats = [
    { label: "Clocked In", value: "12", sub: "of 18 scheduled", color: "text-emerald-600" },
    { label: "Late Today", value: "3", sub: "> 5 min past shift", color: "text-amber-600" },
    { label: "Absent", value: "2", sub: "no clock-in", color: "text-rose-600" },
    { label: "Avg Hours Today", value: "6.2h", sub: "projected 8.1h", color: "text-slate-900" },
  ];
  return (
    <div className="rounded-3xl overflow-hidden shadow-2xl border border-border/60 bg-white text-slate-900">
      <div className="grid grid-cols-12">
        <aside className="hidden md:flex col-span-3 flex-col gap-1 border-r border-slate-200 p-4 bg-slate-50/60">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 px-2 mb-1">Overview</div>
          {["Dashboard", "Timesheets", "Scheduler", "Payroll Export"].map((l, i) => (
            <div key={l} className={`px-2.5 py-2 rounded-md text-sm transition-colors duration-150 ${i===0 ? "bg-white shadow-sm border border-slate-200 font-medium" : "text-slate-600 hover:bg-slate-100/80 cursor-default"}`}>{l}</div>
          ))}
          <div className="text-[10px] uppercase tracking-wider text-slate-500 px-2 mt-3 mb-1">Manage</div>
          <div className="px-2.5 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100/80 transition-colors duration-150 cursor-default">Employees</div>
        </aside>
        <div className="col-span-12 md:col-span-9 p-4 md:p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {stats.map((s) => (
              <div key={s.label} className="stat-bump rounded-lg border border-slate-200 bg-white p-3 cursor-default">
                <div className="text-[11px] font-medium text-slate-500">{s.label}</div>
                <div className={`mt-0.5 text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
                <div className="text-[11px] text-slate-500">{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <h3 className="font-semibold">Live Roster</h3>
            <span className="text-xs text-slate-500">· May 8, 2026</span>
          </div>
          <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-12 text-[10px] uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200 px-3 py-2">
              <div className="col-span-4">Employee</div>
              <div className="col-span-3">Status</div>
              <div className="col-span-2">Clock In</div>
              <div className="col-span-1">Loc</div>
              <div className="col-span-2 text-right">Hours</div>
            </div>
            {rows.map((r) => (
              <div key={r.name} className="row-glow grid grid-cols-12 items-center px-3 py-2.5 border-b border-slate-100 last:border-0 text-sm cursor-default">
                <div className="col-span-4 flex items-center gap-2">
                  <div className={`h-7 w-7 rounded-full ${r.color} text-white text-[10px] font-semibold flex items-center justify-center soft-scale`}>{r.initials}</div>
                  <span className="font-medium">{r.name}</span>
                </div>
                <div className="col-span-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${r.statusCls}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${r.dot}`} />{r.status}
                  </span>
                </div>
                <div className="col-span-2 tabular-nums text-slate-700">{r.clock}</div>
                <div className="col-span-1">
                  {r.clock !== "—" ? <span className="inline-block text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5 chip-hover cursor-pointer">View</span> : <span className="text-slate-400">—</span>}
                </div>
                <div className="col-span-2 text-right tabular-nums text-slate-700">{r.hours}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const LANDING_CTAS = {
  nav: [
    { id: "a", label: "Start 45-day free trial", helper: "No card required" },
    { id: "b", label: "Start 45-day free trial", helper: "No card required" },
  ],
  heroPrimary: [
    { id: "a", label: "Start 45-day free trial", helper: "No card required" },
    { id: "b", label: "Start 45-day free trial", helper: "No card required" },
  ],
  heroSecondary: [
    { id: "a", label: "See it in action", helper: "Book a 20-min walkthrough" },
    { id: "b", label: "Watch a live tour", helper: "Hosted by a care-ops lead" },
  ],
  darkPrimary: [
    { id: "a", label: "Start 45-day free trial", helper: "No card required" },
    { id: "b", label: "Start 45-day free trial", helper: "No card required" },
  ],
  darkSecondary: [
    { id: "a", label: "Explore plans", helper: "Side-by-side pricing" },
    { id: "b", label: "See what fits", helper: "Side-by-side pricing" },
  ],
  footerPrimary: [
    { id: "a", label: "Start 45-day free trial", helper: "No card required" },
    { id: "b", label: "Start 45-day free trial", helper: "No card required" },
  ],
  footerSecondary: [
    { id: "a", label: "Compare plans", helper: "Find your fit in 60 seconds" },
    { id: "b", label: "See pricing", helper: "Transparent · per-client billing" },
  ],
};

export default function Landing() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const startTrial = (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = getVariant({ cta_id: "landing_hero_primary", variants: LANDING_CTAS.heroPrimary });
    markPendingConversion("landing_hero_primary", v.id);
    nav(`/signup${email ? `?email=${encodeURIComponent(email)}` : ""}`);
  };

  return (
    <div className="min-h-screen surface-bone text-foreground">
      <Helmet>
        <title>CareWeaveHQ — Modern Home Care Management Powered by AI</title>
        <meta name="description" content="Run your home care agency on one AI-driven platform: EVV-verified visits, scheduling, billing, payroll, and family portal." />
        <link rel="canonical" href="https://careweavehq.com/" />
        <meta property="og:title" content="CareWeaveHQ — Modern Home Care Management" />
        <meta property="og:description" content="One platform for clients, caregivers, EVV, scheduling, billing, and payroll." />
        <meta property="og:url" content="https://careweavehq.com/" />
        <meta property="og:type" content="website" />
      </Helmet>
      <style>{`
        .font-display{font-family:'Playfair Display',ui-serif,Georgia,serif;letter-spacing:-0.018em}
        .eyebrow{display:inline-flex;align-items:center;gap:0.625rem;font-size:0.6875rem;font-weight:600;text-transform:uppercase;letter-spacing:0.22em;color:hsl(var(--muted-foreground))}
        .eyebrow::before{content:'';display:inline-block;width:1.5rem;height:1px;background:currentColor;opacity:0.5}
        .eyebrow-light{color:hsl(0 0% 100% / 0.6)}
        .display-h1{font-feature-settings:"ss01","ss02";text-wrap:balance}
        .display-h2{text-wrap:balance}
        .lede{text-wrap:pretty}
        @keyframes cw-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes cw-rise { from { opacity:0; transform: translateY(12px) } to { opacity:1; transform: translateY(0) } }
        .cw-float { animation: cw-float 5.5s ease-in-out infinite; }
        .cw-rise { animation: cw-rise 0.7s ease-out both; }
        .hover-underline { position: relative; display: inline-block; }
        .hover-underline::after { content:''; position:absolute; width:100%; height:1.5px; bottom:-1px; left:1px; background:currentColor; transform:scaleX( 0 ); transform-origin:bottom right; transition:transform 0.25s cubic-bezier(0.4,0,1,1); border-radius:1px; }
        .hover-underline:hover::after { transform:scaleX(1); transform-origin:bottom left; }
        .hover-lift { transition:transform 0.25s cubic-bezier(1,0.5,1,0.4), box-shadow 0.25s ease; }
        .hover-lift:hover { transform:translateY(-2px); }
        .icon-bump { transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1); }
        .group:hover .icon-bump { transform:scale(1.12); }
        .arrow-nudge { transition:transform 0.2s ease; }
        .group:hover .arrow-nudge { transform:translateX(3px); }
        .press { transition:transform 0.1s ease, box-shadow 0.15s ease; }
        .press:active { transform:scale(0.97); }
        .star-hover { transition:transform 0.15s ease, color 0.15s ease; }
        .star-hover:hover { transform:scale(1.18); }
        .row-glow { transition:background-color 0.18s ease; }
        .row-glow:hover { background-color:hsl(210 40% 96%); }
        .link-fade { transition:color 0.2s ease, opacity 0.2s ease; }
        .focus-glow { transition:box-shadow 0.2s ease, border-color 0.2s ease; }
        .focus-glow:focus-within { box-shadow:0 1px 10px -1px hsl(200 78% 58% / 0.22); border-color:hsl(200 78% 58% / 0.5); }
        .soft-scale { transition:transform 0.2s ease; }
        .soft-scale:hover { transform:scale(1.03); }
        .stat-bump { transition:transform  0.2s cubic-bezier(0.4,0,0.2,1); }
        .stat-bump:hover { transform:translateY(-3px) scale(1.02); }
        .chip-hover { transition:transform 0.2s ease, box-shadow 0.2s ease; }
        .chip-hover:hover { transform:translateY(-1px); box-shadow:0 4px 12px -2px rgba(0,0,0,0.08); }
        @media (prefers-reduced-motion: reduce) {
          .cw-float, .cw-rise { animation: none !important; }
          .hover-underline::after, .hover-lift, .icon-bump, .arrow-nudge, .press, .star-hover, .row-glow, .link-fade, .focus-glow, .soft-scale, .stat-bump, .chip-hover { transition: none !important; animation: none !important; transform: none !important; }
        }
      `}</style>

      {/* Promo strip */}
      <div className="surface-ink text-sm relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[hsl(195_85%_72%/_0.5)] to-transparent" />
        <div className="mx-auto max-w-7xl px-6 py-2.5 flex items-center justify-center gap-3 text-center">
          <span className="inline-flex items-center gap-2 text-white/70">
            <span className="brand-dot" />
            Moving from a legacy system?
          </span>
          <Link to="/pricing" className="hover-underline font-medium link-fade text-white">White-glove data transfer, on us →</Link>
        </div>
      </div>

      {/* Top nav */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[hsl(36_45%_96%/_0.78)] border-b border-border/50 shadow-[0_1px_0_0_hsl(var(--ink)/0.02)]">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="group inline-flex items-center gap-2.5 soft-scale">
            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--brand-aqua))] text-white shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.6)]">
              <span className="font-display text-base font-bold leading-none">C</span>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[hsl(var(--brand-aqua))] ring-2 ring-[hsl(36_45%_96%)]" />
            </span>
            <span className="font-display text-xl font-bold tracking-tight text-[hsl(var(--ink))]">CareWeaveHQ</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm">
            <Link to="/features" className="hover-underline link-fade hover:text-primary">Features</Link>
            <Link to="/pricing" className="hover-underline link-fade hover:text-primary">Pricing</Link>
            <Link to="/private-pay" className="hover-underline link-fade hover:text-primary">Private Pay</Link>
            <Link to="/resources" className="hover-underline link-fade hover:text-primary">Resources</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-sm hover-underline link-fade hover:text-primary px-2">Sign in</Link>
            <ExperimentCTA
              ctaId="landing_nav_signup"
              variants={LANDING_CTAS.nav}
              to="/signup"
              conversionIntent
              className="rounded-full press"
              helperClassName="sr-only"
            />
          </div>
        </div>
      </header>

      <main>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-20 md:pt-24 pb-24 md:pb-28 grid lg:grid-cols-2 gap-14 lg:gap-16 items-center">
        <div>
          <h1 className="cw-rise display-h1 font-display text-[2.75rem] sm:text-5xl md:text-6xl lg:text-[4.5rem] font-semibold leading-[1.02] tracking-tight text-[hsl(220_45%_15%)]" style={{ animationDelay: "60ms" }}>
            Smarter Home Care Management, Powered by <span className="text-primary">AI</span>
          </h1>
          <p className="cw-rise lede mt-7 text-lg md:text-xl leading-relaxed text-muted-foreground max-w-xl" style={{ animationDelay: "180ms" }}>
            Simplify scheduling, caregiver coordination, documentation, and daily operations—all in one modern platform.
          </p>

          <form onSubmit={startTrial} className="cw-rise mt-10 flex flex-wrap gap-3 max-w-xl" style={{ animationDelay: "300ms" }}>
            <div className="flex-1 min-w-[320px] rounded-full bg-card border border-border/60 px-2 pr-1 py-1 flex items-center shadow-sm focus-glow">
              <Input
                type="email"
                placeholder="Enter your work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0 shadow-none h-10 min-w-0 flex-1"
              />
              <ExperimentCTA
                ctaId="landing_hero_primary"
                variants={LANDING_CTAS.heroPrimary}
                type="submit"
                className="rounded-full h-10 px-5 press"
                helperClassName="sr-only"
              />
            </div>
            <ExperimentCTA
              ctaId="landing_hero_secondary"
              variants={LANDING_CTAS.heroSecondary}
              to="/demo"
              variant="outline"
              className="rounded-full h-12 px-6 border-border/60 press hover-lift"
            />
          </form>
          <p className="cw-rise mt-4 text-xs tracking-wide text-muted-foreground" style={{ animationDelay: "420ms" }}>
            45-day free trial · Card-free signup · Cancel anytime.
          </p>

          {/* Trust strip */}
          <div className="cw-rise mt-12 pt-8 border-t border-border/50" style={{ animationDelay: "540ms" }}>
            <p className="text-sm font-medium text-foreground/80">
              Relied on by home care providers in <span className="font-semibold">CA, CO, NY, OH, PA, FL, TX</span> and growing.
            </p>
          </div>
        </div>

        {/* Hero product montage */}
        <div className="relative cw-rise" style={{ animationDelay: "240ms" }}>
          {/* premium glow behind mockup */}
          <div aria-hidden className="pointer-events-none absolute -inset-6 -z-10 bg-[radial-gradient(60%_60%_at_50%_40%,hsl(var(--primary)/0.18),transparent_70%)] blur-2xl" />
          <div className="cw-float chip-hover absolute -top-6 -right-2 z-10 rounded-2xl bg-card shadow-premium border border-border/60 px-4 py-3 flex items-center gap-2 cursor-default">
            <Sparkles className="h-4 w-4 text-primary icon-bump" />
            <span className="text-sm font-semibold">AI co-pilot inside</span>
          </div>
          <div className="rounded-3xl shadow-premium">
            <RosterMockup />
          </div>
          {/* Floating testimonial chip */}
          <div className="cw-float chip-hover absolute -bottom-8 -left-4 max-w-xs bg-card border border-border/60 rounded-2xl shadow-premium p-4 hidden md:block cursor-default" style={{ animationDelay: "1.2s" }}>
            <div className="flex items-center gap-1 text-warning">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-warning star-hover" />)}
            </div>
            <p className="mt-2 text-sm text-foreground/90">
              "We went from invoicing every other week to clean weekly drops — and EVV reviews finish themselves."
            </p>
            <p className="mt-2 text-xs font-semibold">Eagle Health · Director of Operations</p>
          </div>
        </div>
      </section>

      {/* Logo / outcomes strip */}
      <section className="surface-ink relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 py-14 md:py-16 grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6 text-center">
          {[
            { n: "100%", l: "of invoices anchored to GPS-verified visits" },
            { n: "<3 days", l: "typical claim-submitted-to-paid window" },
            { n: "0", l: "PHI slips across chats, files, or notes" },
            { n: "24/7", l: "mobile EVV that keeps running offline" },
          ].map((s, i) => (
            <div key={i} className="cursor-default">
              <div className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-[hsl(195_85%_72%)]">{s.n}</div>
              <p className="mt-2 text-xs md:text-sm leading-relaxed text-white/60 max-w-[20ch] mx-auto">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature pillars */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24 md:py-28">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="eyebrow mb-5">One platform</div>
          <h2 className="display-h2 font-display text-4xl md:text-5xl lg:text-[3.25rem] font-semibold leading-[1.08] tracking-tight">
            Every system your agency depends on — woven into one<span className="text-primary">.</span>
          </h2>
          <p className="lede mt-6 text-base md:text-lg leading-relaxed text-muted-foreground">
            From referral to remittance, every step ties back to the same verified visit. No duplicate keying, no Friday-night spreadsheet rescue.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Calendar, t: "Intelligent rostering", d: "Recurring visits, geofences, overtime guardrails, and AI matching that weighs skills, proximity, and prior pairings." },
            { icon: MapPin, t: "GPS-anchored EVV", d: "Clock events captured online or off, then handed off cleanly to Sandata, HHAeXchange and other state aggregators." },
            { icon: Stethoscope, t: "Care plans & charting", d: "eMAR, vitals, ADLs, assessments, and plans of care — signed on-canvas right inside the visit." },
            { icon: Wallet, t: "Invoicing on verified time", d: "Claim-ready 837P runs, prebill review with override ceilings, and zero ability to bill on guessed hours." },
            { icon: FileCheck2, t: "End-to-end RCM", d: "Eligibility (270/271), status checks (276/277), 835 posting, denials, and aging buckets — all in one console." },
            { icon: MessageSquareLock, t: "PHI-aware comms", d: "SSNs, MRNs, dates of birth and similar patterns are scrubbed from messages, file names, and attachments before they ever leave the device." },
          ].map((f, i) => (
            <Reveal key={i} delay={i * 60} className="group rounded-2xl bg-card border border-border/50 p-7 md:p-8 hover:border-primary/30 transition-colors duration-300 cursor-default">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 font-display text-xl md:text-2xl font-semibold tracking-tight leading-snug">{f.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Differentiator block (dark) */}
      <section className="surface-ink relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[hsl(var(--primary)/0.12)] blur-3xl" />
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-28">
          <div className="grid lg:grid-cols-2 gap-14 lg:gap-16 items-center">
            <div>
              <div className="eyebrow eyebrow-light mb-5">Why CareWeaveHQ</div>
              <h2 className="display-h2 font-display text-4xl md:text-5xl lg:text-[3.25rem] font-semibold leading-[1.08] tracking-tight">
                Audit-proof records. Payer-ready claims. PHI shielded by default<span className="text-[hsl(195_85%_72%)]">.</span>
              </h2>
              <p className="lede mt-6 text-base md:text-lg leading-relaxed text-white/70 max-w-xl">
                Most home care tools leave EVV, billing, and team chat in separate silos. CareWeaveHQ keeps them stitched together, so cash flow, compliance, and care quality move in lockstep.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <ExperimentCTA
                  ctaId="landing_dark_primary"
                  variants={LANDING_CTAS.darkPrimary}
                  to="/signup"
                  conversionIntent
                  size="lg"
                  className="rounded-full press"
                  helperClassName="text-white/60"
                  trailing={<ArrowRight className="ml-2 h-4 w-4 arrow-nudge" />}
                />
                <ExperimentCTA
                  ctaId="landing_dark_secondary"
                  variants={LANDING_CTAS.darkSecondary}
                  to="/pricing"
                  size="lg"
                  variant="outline"
                  className="rounded-full bg-transparent text-white border-white/30 hover:bg-white/10 hover:text-white press"
                  helperClassName="text-white/60"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: MapPin, t: "Verified hours, no exceptions", d: "Payroll and billing pull from clock events — never from the planned roster." },
                { icon: ShieldCheck, t: "Redaction at the source", d: "Sensitive patterns get masked the moment a message or file is composed." },
                { icon: Lock, t: "Locked once paid", d: "Settled visits stay immutable; unpaid invoices reflow automatically when EVV is corrected." },
                { icon: Bot, t: "AI built for care teams", d: "Shift matching, narrative summaries, and a draft assistant for manual notes." },
              ].map((d, i) => (
                <Reveal key={i} delay={i * 80} className="group rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-default">
                  <d.icon className="h-5 w-5 text-[hsl(195_85%_72%)] icon-bump" />
                  <h3 className="mt-4 font-display text-lg md:text-xl font-semibold tracking-tight leading-snug">{d.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{d.d}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Persona blocks */}
      <section className="bg-gradient-to-b from-[hsl(204_60%_98%)] via-background to-[hsl(36_40%_97%)]">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-28">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="eyebrow mb-5 justify-center">Built for your funding model</div>
            <h2 className="display-h2 font-display text-4xl md:text-5xl lg:text-[3.25rem] font-semibold leading-[1.08] tracking-tight">
              However your visits get funded, CareWeaveHQ maps to it<span className="text-primary">.</span>
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {[
              { to: "/pricing", icon: ShieldCheck, t: "Medicare, Medicaid & HCBS",
                bullets: ["Plug-and-play Sandata & HHAeXchange", "837P submission with 835 posting", "Real-time 270/271 eligibility", "Prebill queue with override ceilings"] },
              { to: "/pricing", icon: HeartHandshake, t: "Private Pay",
                bullets: ["Repeating visits with auto-invoicing", "Card payments and smart reminders", "Branded family portal", "Encrypted team conversations"] },
            ].map((p, i) => (
              <Link key={i} to={p.to} className="group rounded-2xl border border-border/50 bg-card p-7 md:p-8 hover:border-primary/40 hover:shadow-md transition-all duration-300 flex flex-col">
                <p.icon className="h-6 w-6 text-primary icon-bump" />
                <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight leading-snug">{p.t}</h3>
                <ul className="mt-5 space-y-2.5 text-sm leading-relaxed flex-1">
                  {p.bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 inline-flex items-center text-sm font-semibold text-primary">
                  Explore plans <ArrowRight className="ml-1.5 h-4 w-4 arrow-nudge" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gradient-to-b from-[hsl(36_40%_97%)] via-background to-[hsl(204_60%_98%)]">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-28">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="eyebrow mb-5 justify-center">Trusted by care teams</div>
            <h2 className="display-h2 font-display text-4xl md:text-5xl lg:text-[3.25rem] font-semibold leading-[1.08] tracking-tight">
              Hear from the people running home care every day<span className="text-primary">.</span>
            </h2>
          </div>
          <div className="grid gap-6 md:gap-7 md:grid-cols-3">
            {/* Eagle Health — kept existing */}
            <Reveal className="group rounded-2xl border border-border/50 bg-card p-8 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-1 text-warning mb-4">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-warning star-hover" />)}
              </div>
              <blockquote className="font-display text-base md:text-lg font-medium leading-snug text-[hsl(220_45%_15%)]">
                "CareWeaveHQ runs every kind of shift we staff — live-in companions and traditional HCBS support workers — from one place. The operational clarity is night and day."
              </blockquote>
              <div className="mt-5 text-sm">
                <span className="font-semibold text-foreground">Sarah L. Morgan</span>
                <span className="text-muted-foreground"> · Director, Eagle Health</span>
              </div>
            </Reveal>

            {/* SunriseHome Care — Marcus T. */}
            <Reveal delay={80} className="group rounded-2xl border border-border/50 bg-card p-8 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-1 text-warning mb-4">
                {Array.from({ length: 5 }).map((_, i) => <Star key={`marcus-${i}`} className="h-4 w-4 fill-warning star-hover" />)}
              </div>
              <blockquote className="font-display text-base md:text-lg font-medium leading-snug text-[hsl(220_45%_15%)]">
                "We cut payroll processing from two days down to under two hours. The system pulls verified clock events, so there's no back-and-forth chasing timesheets."
              </blockquote>
              <div className="mt-5 text-sm">
                <span className="font-semibold text-foreground">Marcus T.</span>
                <span className="text-muted-foreground"> · Operations Manager, SunriseHome Care</span>
              </div>
            </Reveal>

            {/* Pacific Care Services — Priya S. */}
            <Reveal delay={160} className="group rounded-2xl border border-border/50 bg-card p-8 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-1 text-warning mb-4">
                {Array.from({ length: 5 }).map((_, i) => <Star key={`priya-${i}`} className="h-4 w-4 fill-warning star-hover" />)}
              </div>
              <blockquote className="font-display text-base md:text-lg font-medium leading-snug text-[hsl(220_45%_15%)]">
                "270/271 eligibility checks caught payer switches we used to miss. Denied claims dropped by almost half within the first quarter."
              </blockquote>
              <div className="mt-5 text-sm">
                <span className="font-semibold text-foreground">Priya S.</span>
                <span className="text-muted-foreground"> · Billing Director, Pacific Care Services</span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        {/* FAQ */}
      </section>

      <section className="bg-gradient-to-b from-[hsl(204_60%_98%)] via-background to-[hsl(36_40%_97%)]">
        <div className="mx-auto max-w-4xl px-6 pt-4 pb-24 md:pb-28">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="eyebrow mb-5 justify-center">FAQ & Troubleshooting</div>
            <h2 className="display-h2 font-display text-4xl md:text-5xl lg:text-[3.25rem] font-semibold leading-[1.08] tracking-tight">
              Answers to the questions teams ask most<span className="text-primary">.</span>
            </h2>
            <p className="lede mt-6 text-base md:text-lg leading-relaxed text-muted-foreground">
              Quick fixes for the most common questions and issues. Don't see yours? Email{" "}
              <a href="mailto:support@careweavehq.com" className="text-primary underline underline-offset-2">support@careweavehq.com</a>.
            </p>
          </div>
          <Accordion type="single" collapsible className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-[hsl(200_60%_99%)] divide-y divide-border/60">
            {[
              {
                q: "How does the free trial work?",
                a: "You get 45 days of full Enterprise access — every module, unlimited clients and caregivers, no credit card required. At the end of the trial you choose a plan that fits your size, or your workspace switches to read-only until you do.",
                href: "/pricing",
                linkLabel: "See plans & pricing",
              },
              {
                q: "Which payers and programs are supported?",
                a: "CareWeaveHQ is built end-to-end for Medicaid, Medicare, HCBS waivers, VA, and private-pay home care. We support electronic 837P/837I claims, 270/271 eligibility, 276/277 status, and 835 remittance posting.",
                href: "/features",
                linkLabel: "Explore billing & claims features",
              },
              {
                q: "Is EVV included? Which aggregators do you connect to?",
                a: "Yes — GPS, telephony, and FOB clock-in are included. We push verified visits to Sandata and HHAeXchange automatically, and we reconcile state aggregator responses so nothing slips between systems.",
                href: "/resources",
                linkLabel: "Read the 2026 EVV compliance handbook",
              },
              {
                q: "How is billing calculated — from the schedule or from EVV?",
                a: "Billing and payroll always use GPS-tracked, verified EVV hours — never the scheduled estimate. If a verified clock event is edited on an unpaid invoice, the invoice automatically recalculates. Paid invoices are locked for audit integrity.",
                href: "/docs#modules",
                linkLabel: "How auto-billing works",
              },
              {
                q: "Is my data HIPAA compliant and secure?",
                a: "Yes. CareWeaveHQ runs in a HIPAA-grade environment with encryption at rest and in transit, row-level access controls, full PHI audit logging, MFA enforcement for clinical roles, and automatic PHI-pattern blocking on messages and support content.",
                href: "/legal/hipaa",
                linkLabel: "Review HIPAA & security details",
              },
              {
                q: "Can I migrate from HHAeXchange, AxisCare, or another system?",
                a: "Yes — we have a bulk migration tool that imports clients, caregivers, authorizations, schedules, and historical visits from spreadsheets or direct exports. Most agencies are fully migrated within 1–2 weeks.",
                href: "/resources",
                linkLabel: "Read the migration playbook",
              },
              {
                q: "Troubleshooting: a caregiver can't clock in on the mobile app.",
                a: "Three things to check: (1) Required credentials are current — expired CPR or TB checks block clock-in. (2) Location services are enabled on the device and the caregiver is within the client's geofence. (3) The caregiver isn't on an active OIG/SAM exclusion list. Admins can see the exact reason on the caregiver's profile under Compliance Status.",
                href: "/docs#compliance",
                linkLabel: "Compliance & credential setup guide",
              },
              {
                q: "Troubleshooting: a claim was denied — what now?",
                a: "Open the claim in Claim Submissions to see the 277CA/835 rejection reason in plain English. The most common fixes are: re-running 270 eligibility to confirm the active payer, attaching the missing authorization, or correcting a service code. Once edited, click Resubmit and we'll regenerate the 837 automatically.",
                href: "/docs#modules",
                linkLabel: "Claims submission & resubmission guide",
              },
              {
                q: "Troubleshooting: I'm locked out or my workspace is read-only.",
                a: "Read-only mode means the trial ended or a payment method is missing. An admin can add a plan from Settings → Billing, or open the billing portal to add a card. If you've lost admin access entirely, contact support@careweavehq.com from the email on the account.",
                href: "/account/billing",
                linkLabel: "Open billing settings",
              },
              {
                q: "Do you offer onboarding and training?",
                a: "Yes — every plan includes guided onboarding, a built-in Operations Manual tailored to your agency, and role-based training modules for schedulers, caregivers, and billing staff. Enterprise plans include a dedicated implementation manager.",
                href: "/docs#onboarding",
                linkLabel: "See the onboarding walkthrough",
              },
            ].map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="px-6 border-1 transition-colors duration-200 hover:bg-primary/[0.03] rounded-lg">
                <AccordionTrigger className="text-left font-display text-lg md:text-xl font-medium tracking-tight text-[hsl(220_45%_15%)] hover:no-underline py-6 cursor-pointer">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-[15px] text-muted-foreground leading-relaxed pb-6 pr-6 max-w-[68ch]">
                  {item.a}
                  {item.href && (
                    <div className="mt-4">
                      <Link
                        to={item.href}
                        className="inline-flex items-center gap-1 text-primary font-medium hover:underline underline-offset-2"
                      >
                        {item.linkLabel}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24 md:pb-28">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 p-12 md:p-16 text-center shadow-premium bg-gradient-to-br from-[hsl(var(--ink))] via-[hsl(var(--ink-soft))] to-[hsl(var(--ink))] text-white">
          <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-[42rem] rounded-full bg-[hsl(var(--primary)/0.18)] blur-3xl" />
          <h3 className="display-h2 font-display text-4xl md:text-5xl lg:text-[3.25rem] font-semibold leading-[1.08] tracking-tight">
            Ready to weave your operations into one<span className="text-[hsl(var(--brand-aqua))]">?</span>
          </h3>
          <p className="lede mt-6 text-base md:text-lg leading-relaxed text-white/70 max-w-xl mx-auto">
            Spin up a 45-day trial with full Enterprise access — no card, no commitment.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3 relative z-10">
            <ExperimentCTA
              ctaId="landing_footer_primary"
              variants={LANDING_CTAS.footerPrimary}
              to="/signup"
              conversionIntent
              size="lg"
              className="rounded-full px-8 press hover-lift bg-white text-[hsl(var(--ink))] hover:bg-white/90"
            />
            <ExperimentCTA
              ctaId="landing_footer_secondary"
              variants={LANDING_CTAS.footerSecondary}
              to="/pricing"
              size="lg"
              variant="outline"
              className="rounded-full px-8 press hover-lift bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      </main>

      <footer className="border-t border-border/60 bg-gradient-to-t from-[hsl(36_45%_92%)] via-[hsl(36_45%_94%)] to-[hsl(36_45%_96%)] relative">
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--primary)/0.35)] to-transparent" />
        <div className="mx-auto max-w-7xl px-6 py-16 grid md:grid-cols-5 gap-10 text-sm">
          <div>
            <div className="inline-flex items-center gap-2.5 soft-scale cursor-default">
              <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--brand-aqua))] text-white shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.6)]">
                <span className="font-display text-base font-bold leading-none">C</span>
              </span>
              <span className="font-display text-xl font-bold tracking-tight text-[hsl(var(--ink))]">CareWeaveHQ</span>
            </div>
            <p className="mt-4 leading-relaxed text-muted-foreground max-w-xs">
              A single fabric for Medicaid, Medicare, HCBS, and private-pay home care.
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/80 mb-4">Product</div>
            <ul className="space-y-2.5 text-muted-foreground">
              <li><Link to="/features" className="hover-underline link-fade hover:text-primary">Features</Link></li>
              <li><Link to="/pricing" className="hover-underline link-fade hover:text-primary">Pricing</Link></li>
              <li><Link to="/resources" className="hover-underline link-fade hover:text-primary">Resources</Link></li>
              <li><Link to="/blog" className="hover-underline link-fade hover:text-primary">Blog</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/80 mb-4">Solutions</div>
            <ul className="space-y-2.5 text-muted-foreground">
              <li><Link to="/private-pay" className="hover-underline link-fade hover:text-primary">Private Pay</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/80 mb-4">About</div>
            <ul className="space-y-2.5 text-muted-foreground">
              <li><Link to="/about" className="hover-underline link-fade hover:text-primary">About Us</Link></li>
              <li><Link to="/careers" className="hover-underline link-fade hover:text-primary">Careers</Link></li>
              <li><Link to="/contact" className="hover-underline link-fade hover:text-primary">Contact</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/80 mb-4">Legal</div>
            <ul className="space-y-2.5 text-muted-foreground">
              <li><Link to="/legal/terms" className="hover-underline link-fade hover:text-primary">Terms</Link></li>
              <li><Link to="/legal/privacy" className="hover-underline link-fade hover:text-primary">Privacy</Link></li>
              <li><Link to="/legal/hipaa" className="hover-underline link-fade hover:text-primary">HIPAA</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/60">
          <div className="mx-auto max-w-7xl px-6 py-5 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-3">
            <div>© {new Date().getFullYear()} CareWeaveHQ</div>
            <div>Crafted for home care teams who treat audit trails like a feature, not a chore.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
