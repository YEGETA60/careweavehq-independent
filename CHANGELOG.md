# Changelog

All notable changes to CareWeaveHQ.

## v2.0 — June 2026

### Added
- **Learning Library** — extension of the Training module with
  full lessons, end-of-course quizzes (80% passing), and signed
  PDF completion certificates stored in a private `certificates`
  bucket. New tables: `learning_courses`, `learning_lessons`,
  `learning_quizzes`, `learning_enrollments`,
  `learning_lesson_progress`, `learning_certificates`.
- **Starter curriculum** — ~26 seed courses across Caregiver, Nurse,
  and Manager tracks (HHA/CNA basics, infection control, HIPAA, EVV,
  dementia care, medications, OASIS, agency operations, leadership).
  Admins can install via the "Seed starter library" button.
- **Certificate PDFs** — `learning-issue-certificate` edge function
  renders branded certificates with jsPDF.

### Fixed
- Document and certificate downloads no longer rely on
  `window.open`, which some browsers blocked when navigating to
  `*.supabase.co` signed URLs. They now use an anchor-click
  fallback that works under stricter popup-blockers.

## v1.2 — May 2026

### Added
- **Append-only PHI audit log** — new `phi_audit_logs` table captures
  every read, list, create, update, delete, export, print, clock
  in/out, and signing event against PHI. Columns include actor,
  role snapshot, company, action, entity, before/after diff, IP,
  user agent, and request id.
- **Append-only enforcement** — `BEFORE UPDATE/DELETE` triggers
  raise an exception; no role (including `service_role`) can modify
  or delete a log row. Writes only happen through the
  `SECURITY DEFINER` `log_phi_event()` RPC or the generic
  `audit_phi_changes()` trigger attached to 14 PHI tables.
- **Admin-only reads** — `SELECT` gated by `has_role('admin')`.
- **10-year retention** seeded per company in
  `data_retention_policies`, exceeding the HIPAA 6-year minimum.
- **Centralized helpers** — `src/lib/phiAudit.ts` for the React app
  and `supabase/functions/_shared/phi-audit.ts` for edge functions.
  Print/export paths and the data context log reads automatically.
- **Deprecation** — `audit_log`, `phi_access_log`, and
  `entity_audit_log` are deprecated; existing rows were backfilled
  into `phi_audit_logs` and the legacy `logAudit()` helper shims
  through to the new pipeline.

## v1.1 — May 2026

### Added
- **Onboarding Wizard** — 5-step guided setup on the dashboard
  (Agency Info → Payer → Client → Caregiver → First Shift) with
  progress persisted in `onboarding_progress`.
- **Immutable audit log** — `entity_audit_log` table + triggers on
  `visits`, `claims`, and `claim_lines` capturing per-field diffs,
  actor, and timestamp.
- **Raw 837P EDI (`.txt`) export** alongside the CSV summary for
  every claim batch.
- **Tier-aware Support module** — Standard users must confirm docs +
  AI consultation before opening a ticket; Enterprise-only topics
  (clearinghouse, 837/835, eMAR, RCM, 270/271/276/277, HHAeXchange)
  are blocked on lower tiers with a docs + upgrade card.
- **SLA disclosure** on `/pricing` and the Support footer:
  Standard 48h · Professional 24h · Enterprise 4h priority +
  clearinghouse troubleshooting.
- **`ModuleGate` upsell copy** tailored per Enterprise feature
  (eMAR, RCM, 837P, State Aggregator, AI Scheduling) with a
  "Read the docs first" secondary CTA.
- **Credential reminders** rebucketed to 60 / 30 / 7 days.

### Hardened
- Negative hours, future-dated clock-outs, and out-of-range billing
  amounts rejected at the database layer.
- Visits on **paid** invoices are immutable; edits on unpaid
  invoices auto-recalculate the invoice.

### Pricing
- New three-tier ladder: **Standard $99 / Professional $199 /
  Enterprise $299** per month.

## v1.0 — Initial release
- Client, caregiver, scheduling, EVV, billing, payroll, and portals
  on a single centralized database.