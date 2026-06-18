import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, FileText } from "lucide-react";

const SECTIONS = [
  { id: "what", label: "What CareWeaveHQ Is" },
  { id: "architecture", label: "Architecture" },
  { id: "modules", label: "Modules & Functions" },
  { id: "compliance", label: "Compliance & Integrity" },
  { id: "onboarding", label: "Onboarding Wizard" },
  { id: "support", label: "Support & SLA" },
  { id: "exports", label: "Exports (837P / CSV)" },
  { id: "copilot", label: "AI Co-Pilot" },
  { id: "use", label: "How to Use" },
  { id: "marketing", label: "Marketing Highlights" },
  { id: "glossary", label: "Glossary" },
];

export default function Docs() {
  const [active, setActive] = useState("what");
  useEffect(() => { document.title = "CareWeaveHQ — Product Overview & User Guide"; }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>CareWeaveHQ Docs — Product Overview & User Guide</title>
        <meta name="description" content="Architecture, modules, compliance, and how-to guides for the CareWeaveHQ home care management platform." />
        <link rel="canonical" href="https://careweavehq.com/docs" />
        <meta property="og:title" content="CareWeaveHQ Docs — Product Overview & User Guide" />
        <meta property="og:description" content="Architecture, modules, compliance, and how-to guides for CareWeaveHQ." />
        <meta property="og:url" content="https://careweavehq.com/docs" />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TechArticle",
          "headline": "CareWeaveHQ Product Overview & User Guide",
          "description": "Architecture, modules, compliance, and how-to guides for the CareWeaveHQ home care management platform.",
          "author": { "@type": "Organization", "name": "CareWeaveHQ" }
        })}</script>
      </Helmet>
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to app
          </Link>
          <div className="flex items-center gap-2 font-semibold">
            <FileText className="h-4 w-4 text-primary" /> Product Documentation
          </div>
          <a href="/CareWeave-Overview.pdf" target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline"><Download className="h-4 w-4 mr-2" /> PDF</Button>
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1 text-sm">
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} onClick={() => setActive(s.id)}
                className={`block px-3 py-2 rounded-md transition-colors ${active === s.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="prose prose-slate max-w-none dark:prose-invert">
          <h1 className="text-4xl font-bold tracking-tight mb-2">CareWeaveHQ</h1>
          <p className="text-muted-foreground text-lg">Product Overview & User Guide · v1.1 (May 2026)</p>

          <Card className="my-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
            <CardContent className="p-6 space-y-2">
              <p className="font-semibold text-lg m-0">End-to-end home care operations on a single, EVV-verified record.</p>
              <p className="text-sm m-0 text-muted-foreground">
                Intake, scheduling, EVV, care plans, billing, and payroll — unified, audit-ready, and one-click.
              </p>
            </CardContent>
          </Card>

          <section id="what">
            <h2>1. What CareWeaveHQ Is</h2>
            <p>
              CareWeaveHQ is an end-to-end home care operations platform that unifies <strong>client intake, caregiver management,
              scheduling, EVV-verified visit capture, care planning, billing, payroll, and family/caregiver portals</strong> in a
              single centralized database. Purpose-built for U.S. home care agencies serving Medicare, Medicaid waiver programs
              (IHSS, CDASS, HCBS), and private-pay clients.
            </p>
            <p><strong>Core promise:</strong> every dollar billed and every dollar paid is tied to a GPS-verified EVV visit — never to a scheduled estimate.</p>
            <h3>Key differentiators</h3>
            <ul>
              <li><strong>One source of truth.</strong> No double entry, no spreadsheet exports.</li>
              <li><strong>Strict EVV integrity.</strong> Visits on paid invoices cannot be deleted; unpaid invoices auto-recalculate.</li>
              <li><strong>One-click weekly billing.</strong> Validates, blocks, generates, and submits invoices + 837P claims.</li>
              <li><strong>Configurable admin overrides.</strong> Reason codes + notes; per-role limits auto-notify supervisors.</li>
              <li><strong>Multi-program aware.</strong> IHSS / CDASS / HCBS / VA / private pay auto-detected from uploaded care plans.</li>
            </ul>
          </section>

          <section id="architecture">
            <h2>2. High-Level Architecture</h2>
            <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto"><code>{`┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│  Caregiver app  │  │  Family/Client   │  │ Office / Admin  │
│  (mobile)       │  │  portal          │  │ web app         │
└────────┬────────┘  └────────┬─────────┘  └────────┬────────┘
         └─────────── Centralized Database ─────────┘
                  │                          │
        ┌─────────┴────────┐       ┌─────────┴─────────┐
        │ Sandata EVV      │       │ Auto-billing      │
        │ ingest & recon   │       │ (837P / 835 / PDF)│
        └──────────────────┘       └───────────────────┘`}</code></pre>
          </section>

          <section id="modules">
            <h2>3. Modules & Functions</h2>

            <h3>3.1 Client Lifecycle</h3>
            <ul>
              <li><strong>Client Intake</strong> — Digital intake with canvas e-signatures; auto-promotes on completion.</li>
              <li><strong>Client Management</strong> — Demographics, payers, addresses, geofence, contacts.</li>
              <li><strong>Care Plans</strong> — Upload payer PDFs; system extracts authorized tasks/units across programs.</li>
              <li><strong>Family Portal</strong> — Read-only view: schedule, history, photos, notes.</li>
            </ul>

            <h3>3.2 Caregiver Lifecycle</h3>
            <ul>
              <li><strong>Caregiver Management, Credentials, Training, HR</strong> — Hire, track, credential. Expired credentials block billing.</li>
              <li><strong>Caregiver Portal</strong> — GPS clock-in/out, schedule, tasks, EVV, timesheet acknowledgement.</li>
            </ul>

            <h3>3.3 Scheduling & Visits</h3>
            <ul>
              <li><strong>Scheduling, Recurring Visits, Scheduling Intelligence, Live Map</strong> — Build schedules, surface conflicts, suggest matches.</li>
              <li><strong>Visit Notes & Clinical</strong> — Progress notes, vitals, ADL/IADL tracking, incidents.</li>
            </ul>

            <h3>3.4 EVV (Electronic Visit Verification)</h3>
            <ul>
              <li><strong>Sandata Reports & Batch Manager</strong> — Library of EVV exports tagged by period + program; auto-pick the right batch.</li>
              <li><strong>EVV Reconciliation</strong> — Compares scheduled vs. verified, flags mismatches, blocks signing until resolved.</li>
            </ul>

            <h3>3.5 Care Plan & Timesheets</h3>
            <ul>
              <li><strong>Care Plan Calculator</strong> — Authorized vs. used units per task and program.</li>
              <li><strong>Generated Timesheet</strong> — Payer-formatted PDFs from EVV-verified hours.</li>
              <li><strong>E-Signature workflow</strong> — Caregiver, supervisor, client; reminders until locked.</li>
            </ul>

            <h3>3.6 Finance — Billing & Revenue</h3>
            <ul>
              <li><strong>Auto Billing</strong> (one-click) — Validates EVV, authorizations, credentials, rate sheets; generates invoices, 837P, CSV, PDF.</li>
              <li><strong>Pre-Bill Review Queue</strong> — Approve blocked items with reason code + notes (auto re-runs billing); reject; or re-run.</li>
              <li><strong>Override Limits</strong> — Per reason × role: max single $, daily count, weekly $, dual approval. Hard block + supervisor email when exceeded.</li>
              <li><strong>Override Alerts</strong> — Auto supervisor notification on high-value (≥$1,000) or unusual-frequency (≥5/day) approvals.</li>
              <li><strong>Revenue Cycle</strong> — 835 remittance posting, claim aging, dunning.</li>
              <li><strong>Authorizations</strong> — Burndown alerts at 75/90/100% used and 30/7/0 days out.</li>
            </ul>

            <h3>3.7 Payroll</h3>
            <ul><li>Strictly uses verified EVV hours. Period close, pay statements, overtime detection.</li></ul>

            <h3>3.8 Reports, Documents, Communication</h3>
            <ul><li>Operational dashboards, document storage, role-aware messaging.</li></ul>

            <h3>3.9 Administration</h3>
            <ul><li>User Admin, Company Profile, Subscription Tiers, Web/Desktop Admin.</li></ul>
          </section>

          <section id="compliance">
            <h2>4. Compliance & Financial Integrity Rules</h2>
            <p>Enforced at the database and application layers — not bypassable by ordinary users:</p>
            <ul>
              <li>Billing and payroll <strong>only</strong> consume GPS-verified EVV hours.</li>
              <li>Visits attached to <strong>paid</strong> invoices cannot be deleted.</li>
              <li>EVV edits on <strong>unpaid</strong> invoices auto-recalculate the invoice.</li>
              <li>Pre-bill validation blocks any timesheet missing a locked signature, EVV reconciliation, active authorization with units, current credentials, or documented payer rate.</li>
              <li>Every override is recorded immutably with actor, reason code, notes, and a snapshot of blockers.</li>
              <li><strong>Hardened input validation:</strong> negative hours, future-dated clock-outs, and out-of-range billing amounts are rejected at the database layer.</li>
              <li><strong>Immutable audit log</strong> (<code>entity_audit_log</code>) captures per-field diffs on <code>visits</code>, <code>claims</code>, and <code>claim_lines</code> with actor + UTC timestamp.</li>
              <li>Credential and training expirations alert at <strong>60 / 30 / 7</strong> days; expired credentials block billing.</li>
            </ul>
          </section>

          <section id="onboarding">
            <h2>4a. Onboarding Wizard</h2>
            <p>
              A 5-step guided wizard appears on the dashboard until every step is complete. Target time: under 10 minutes.
            </p>
            <ol>
              <li>Agency basic info (NPI, tax ID, address, logo)</li>
              <li>Payer setup with rate sheet</li>
              <li>Add first client</li>
              <li>Add first caregiver (auto email invite)</li>
              <li>Schedule first shift</li>
            </ol>
            <p>Progress is persisted in <code>onboarding_progress</code> and the wizard is dismissible but stays highly visible until complete.</p>
          </section>

          <section id="support">
            <h2>4b. Support Tiers & SLA Policy</h2>
            <table className="not-prose w-full text-sm border-collapse">
              <thead><tr className="border-b"><th className="text-left p-2">Tier</th><th className="text-left p-2">Email SLA</th><th className="text-left p-2">Clearinghouse / 837P / eMAR / RCM</th></tr></thead>
              <tbody>
                <tr className="border-b"><td className="p-2">Standard ($99)</td><td className="p-2">48h — docs + community first</td><td className="p-2">Documentation only</td></tr>
                <tr className="border-b"><td className="p-2">Professional ($199)</td><td className="p-2">24h email</td><td className="p-2">Documentation only</td></tr>
                <tr><td className="p-2">Enterprise ($299)</td><td className="p-2"><strong>4h priority</strong></td><td className="p-2"><strong>Included — direct specialist</strong></td></tr>
              </tbody>
            </table>
            <ul className="mt-4">
              <li>Standard users must confirm they checked the docs + AI assistant before submitting a ticket.</li>
              <li>Tickets matching Enterprise-only keywords (clearinghouse, 837, 835, eMAR, RCM, 270/271/276/277, HHAeXchange) are blocked on lower tiers and replaced with a docs + upgrade card.</li>
              <li>SLA is published on <Link to="/pricing" className="underline">/pricing</Link> and the in-app Support footer.</li>
            </ul>
          </section>

          <section id="exports">
            <h2>4c. Exports — 837P EDI & CSV</h2>
            <p>Every committed billing batch produces, in one click:</p>
            <ul>
              <li><strong>Raw 837P EDI (<code>.txt</code>)</strong> — upload directly to any clearinghouse (Availity, Office Ally, Change Healthcare, etc.).</li>
              <li><strong>CSV summary</strong> — same batch, flattened for ops reconciliation and spreadsheets.</li>
              <li><strong>Invoice PDFs</strong> — payer-formatted, EVV-backed.</li>
              <li><strong>Audit packet (PDF)</strong> — per-claim chain of custody via the <code>claim-audit-packet</code> function.</li>
            </ul>
            <p>Agencies are never locked in — all clinical, billing, and EVV data is exportable.</p>
          </section>

          <section id="copilot">
            <h2>4d. AI Co-Pilot (Pro)</h2>
            <p>The AI Co-Pilot launcher (✨ <em>AI Co-Pilot</em>) lives in the dashboard header and is the single surface behind the landing-page promise of <em>AI co-pilot inside</em>. Powered by Lovable AI.</p>
            <ul>
              <li><strong>Why is anyone late today?</strong> — reads today's roster and EVV clock-ins, returns a plain-English explanation + next steps.</li>
              <li><strong>Draft a client / family message</strong> — generates a short, professional message for family, caregiver, or client audiences.</li>
              <li><strong>Suggest a caregiver for a shift</strong> — opens Scheduling Intel so you can run the AI shift matcher on any open shift.</li>
            </ul>
            <p>The Co-Pilot reads roster data via a server-side edge function but never writes back to the database. Available on the <strong>Pro</strong> plan and to superadmins; other tiers see an upgrade card.</p>
          </section>

          <section id="use">
            <h2>5. How to Use CareWeaveHQ Effectively</h2>
            <h3>Day 1 — Setup</h3>
            <ol>
              <li>Configure Company Profile (NPI, tax ID, branding).</li>
              <li>Add Payers and upload Rate Sheets per service code.</li>
              <li>Add staff users and assign roles (everyone signs up directly — no invite codes required).</li>
              <li>Configure override limits in Auto Billing.</li>
            </ol>
            <h3>Onboarding a Client</h3>
            <ol>
              <li>Run intake → e-signature → auto-active.</li>
              <li>Upload payer care plan PDF → confirm parsed tasks/units.</li>
              <li>Add authorizations.</li>
              <li>Build recurring visits or schedule individually.</li>
            </ol>
            <h3>Weekly Operations</h3>
            <ol>
              <li>Caregivers clock in/out via the mobile portal (GPS).</li>
              <li>Live Map and Scheduling Intel flag late or missed visits.</li>
              <li>End of week: upload Sandata exports.</li>
              <li>Generate timesheets, reconcile EVV, resolve mismatches, e-sign.</li>
            </ol>
            <h3>Weekly Billing</h3>
            <ol>
              <li>Open <strong>Finance → Auto Billing</strong>.</li>
              <li>Preview the prior week → review blockers in the Pre-Bill Review Queue.</li>
              <li>Approve with reason codes, or fix data and re-run.</li>
              <li>Commit to generate invoices, 837P claims, exports.</li>
              <li>Monitor payments under Revenue Cycle; send reminders for past-due.</li>
            </ol>
          </section>

          <section id="marketing">
            <h2>6. Marketing Highlights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose my-6">
              {[
                ["Speed", "One-click weekly billing replaces 8–12 hours of manual review."],
                ["Compliance", "Every claim ties to a GPS-verified visit, with immutable audit trails."],
                ["Visibility", "Live map, authorization burndown, AR aging, override frequency — in one screen."],
                 ["Multi-program", "Native Medicare, Medicaid, IHSS, CDASS, HCBS, VA, and private pay — no per-program configuration."],
                ["Family trust", "Real-time visibility for authorized family members increases retention."],
                ["Audit-ready", "Pre-bill blockers, override reasons, signed timesheets, and 835 posting form a complete chain of custody."],
              ].map(([t, d]) => (
                <Card key={t}><CardContent className="p-4"><div className="font-semibold mb-1">{t}</div><div className="text-sm text-muted-foreground">{d}</div></CardContent></Card>
              ))}
            </div>
            <h3>Suggested Taglines</h3>
            <ul>
              <li><em>"The only home care platform where billing follows the GPS."</em></li>
              <li><em>"From intake to remittance — one record, one click, zero rework."</em></li>
              <li><em>"Compliance you can audit. Operations you can scale."</em></li>
            </ul>
            <h3>Target Buyer Personas</h3>
            <ul>
              <li><strong>Agency owner / operator</strong> (10–500 caregivers).</li>
              <li><strong>Director of Operations</strong>.</li>
              <li><strong>Billing Supervisor</strong>.</li>
              <li><strong>Compliance Officer</strong>.</li>
              <li><strong>Caregiver / Family</strong>.</li>
            </ul>
          </section>

          <section id="glossary">
            <h2>7. Glossary</h2>
            <ul>
              <li><strong>EVV</strong> — Electronic Visit Verification.</li>
              <li><strong>IHSS / CDASS / HCBS</strong> — Common Medicare and Medicaid home care programs.</li>
              <li><strong>837P</strong> — Electronic professional claim format.</li>
              <li><strong>835</strong> — Electronic remittance advice.</li>
              <li><strong>Authorization</strong> — Payer-issued unit allotment.</li>
              <li><strong>Pre-bill validation</strong> — Automatic gate that blocks billing on missing data.</li>
              <li><strong>Override</strong> — Documented admin decision to bypass a blocked pre-bill issue.</li>
            </ul>
          </section>

          <footer className="mt-12 pt-6 border-t text-sm text-muted-foreground">
            © CareWeaveHQ. This document reflects the live application configuration.
          </footer>
        </main>
      </div>
    </div>
  );
}
