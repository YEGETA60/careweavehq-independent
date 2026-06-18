-- Operations Manual: sections, versions, feedback

CREATE TABLE public.manual_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  module_key TEXT,
  section_type TEXT NOT NULL DEFAULT 'guide' CHECK (section_type IN ('guide','faq','runbook','glossary','overview')),
  role_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  body TEXT NOT NULL DEFAULT '',
  summary TEXT,
  sort_order INTEGER NOT NULL DEFAULT 100,
  version INTEGER NOT NULL DEFAULT 1,
  published BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, slug)
);

CREATE INDEX idx_manual_sections_module ON public.manual_sections(module_key);
CREATE INDEX idx_manual_sections_company ON public.manual_sections(company_id);

CREATE TABLE public.manual_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.manual_sections(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  change_summary TEXT,
  edited_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_manual_versions_section ON public.manual_versions(section_id, version DESC);

CREATE TABLE public.manual_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.manual_sections(id) ON DELETE CASCADE,
  user_id UUID,
  helpful BOOLEAN,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_feedback  ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user can read published global sections,
-- and members of the company can read company-scoped sections.
CREATE POLICY "manual_sections_read_published"
ON public.manual_sections FOR SELECT TO authenticated
USING (
  published = true AND (
    company_id IS NULL
    OR public.is_member_of_company(company_id)
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "manual_sections_admin_all"
ON public.manual_sections FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "manual_versions_read"
ON public.manual_versions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.manual_sections s
    WHERE s.id = manual_versions.section_id
      AND (s.company_id IS NULL OR public.is_member_of_company(s.company_id) OR public.has_role(auth.uid(),'admin'))
  )
);

CREATE POLICY "manual_versions_admin_write"
ON public.manual_versions FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "manual_feedback_insert_self"
ON public.manual_feedback FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "manual_feedback_read_admin"
ON public.manual_feedback FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR user_id = auth.uid());

-- updated_at trigger
CREATE TRIGGER trg_manual_sections_updated_at
BEFORE UPDATE ON public.manual_sections
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Snapshot prior version on every UPDATE that changes body or title
CREATE OR REPLACE FUNCTION public.manual_section_snapshot()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.body IS DISTINCT FROM NEW.body OR OLD.title IS DISTINCT FROM NEW.title) THEN
    INSERT INTO public.manual_versions (section_id, version, title, body, edited_by)
    VALUES (OLD.id, OLD.version, OLD.title, OLD.body, OLD.updated_by);
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_manual_section_snapshot
BEFORE UPDATE ON public.manual_sections
FOR EACH ROW EXECUTE FUNCTION public.manual_section_snapshot();

-- Seed core operations manual content (global, company_id = NULL)
INSERT INTO public.manual_sections (slug, title, module_key, section_type, role_tags, sort_order, body, summary) VALUES
('welcome', 'Welcome to CareWeave', NULL, 'overview', ARRAY['admin','manager','scheduler','billing','caregiver','family'], 10,
$md$# Welcome to CareWeave

CareWeave is your end-to-end home care operations platform. This Operations Manual is your single source of truth for **training**, **day-to-day reference**, and **troubleshooting**.

## How to use this manual
- **Search** the top bar for any keyword (e.g. "EVV", "claim rejected").
- **Filter by role** to see only what applies to you.
- **Filter by module** to jump to a specific area of the app.
- Each section has a **last updated** stamp and a **version history**.

## Getting help
1. Check the relevant module section below.
2. Check the **FAQ & Troubleshooting** runbooks for the issue you're seeing.
3. If still stuck, contact your administrator or support.
$md$, 'Start here. How to navigate the manual and get help.'),

('first-day-setup', 'Day 1 — Initial Setup', 'admin', 'guide', ARRAY['admin'], 20,
$md$# Day 1 — Initial Setup (Admin)

Complete these steps **in order** before onboarding any clients.

1. **Company Profile** → enter NPI, Tax ID, address, and upload your logo.
2. **Payers & Authorizations** → add each payer (Medicaid waiver, private pay, VA, etc.) and upload rate sheets per service code.
3. **User Admin** → invite users and assign roles (admin, manager, scheduler, billing, caregiver, family).
4. **Auto Billing → Override Limits** → configure per-role $ caps and reason codes.
5. **State Aggregator** (if applicable) → connect HHAeXchange / Sandata credentials.
6. **Subscription** → confirm plan and billing.

> ✅ Once these are complete you can begin client intake.
$md$, 'Required setup checklist for new agencies.'),

('client-intake', 'Onboarding a Client', 'client-intake', 'guide', ARRAY['admin','manager','scheduler'], 30,
$md$# Onboarding a Client

1. Open **Client Intake** → **New Intake**.
2. Capture demographics, payer, emergency contacts, address (with geofence radius).
3. Collect **e-signatures** on consent forms via the canvas signature pad.
4. On submit the client is **auto-promoted** from intake → active client.
5. Open the new client → **Care Plans** → upload the payer's care plan PDF. The system extracts authorized tasks and units automatically.
6. Add **Authorizations** with start/end dates and approved units.
7. Build **Recurring Visits** or schedule individual visits.

**Common issues**
- *Care plan parse failed*: check the PDF is text-based, not a scanned image.
- *No payer rate*: add the rate sheet under Payers & Authorizations first.
$md$, 'Step-by-step intake to active client.'),

('caregiver-management', 'Caregivers, Credentials & HR', 'caregivers', 'guide', ARRAY['admin','manager','hr'], 40,
$md$# Caregivers, Credentials & HR

- **Caregiver Management** — hire, profile, skills, languages, geofence-anchored home address.
- **Credentials** — upload license, CPR, TB test, background check. **Expired credentials block billing automatically.**
- **Training** — assign and track required courses; expirations send reminders 30/14/7/0 days out.
- **HR** — payroll bank info, W-2/1099 status, PTO.
- **OIG/SAM exclusion scan** runs nightly; flagged caregivers are blocked from clock-in until cleared.
$md$, 'Hire, credential and retain caregivers.'),

('scheduling', 'Scheduling & Visits', 'scheduling', 'guide', ARRAY['admin','manager','scheduler'], 50,
$md$# Scheduling & Visits

- **Scheduling** — drag-and-drop weekly grid; conflicts surfaced in red.
- **Recurring Visits** — generate weeks of visits from a single template.
- **Scheduling Intelligence** — AI-suggested caregiver matches based on skills, certs, distance, and weekly hour caps.
- **Live Map** — real-time clock-in/out tracking and late visit alerts.

**Tip:** never schedule visits beyond authorization end dates — the system will block billing if you do.
$md$, 'Build and monitor schedules.'),

('evv-clockin', 'EVV — Clock In/Out & Verification', 'evv', 'guide', ARRAY['caregiver','admin','scheduler'], 60,
$md$# EVV — Clock In/Out & Verification

Caregivers clock in and out from the **mobile app**:

1. Open the visit on **Today's** screen.
2. Tap **Clock In** — GPS coordinates are captured. If outside the geofence, you'll be prompted to enter a reason.
3. Complete tasks and check them off.
4. Tap **Clock Out** — capture client/family signature on the device.
5. Sync runs automatically; offline visits sync when reconnected.

**State aggregator** reporting (HHAeXchange / Sandata) happens automatically every 2 minutes for payers that require it.
$md$, 'How caregivers capture EVV-verified visits.'),

('evv-reconciliation', 'EVV Reconciliation & Sandata Batches', 'evv-recon', 'guide', ARRAY['admin','billing','manager'], 70,
$md$# EVV Reconciliation & Sandata Batches

1. **Sandata Reports → Batch Manager** — upload the weekly export tagged with period + program.
2. The system auto-matches verified visits to scheduled visits.
3. **Mismatches** appear in the Reconciliation queue:
   - Time variance > 15 min
   - Missing GPS coordinates
   - No matching scheduled visit
4. Resolve each mismatch (accept verified, accept scheduled, or manual edit with reason).
5. Once unresolved count = 0, timesheets become signable.
$md$, 'Resolve EVV mismatches before billing.'),

('timesheets', 'Timesheets & E-Signatures', 'timesheets', 'guide', ARRAY['caregiver','admin','manager','billing'], 80,
$md$# Timesheets & E-Signatures

Once EVV is reconciled, generate a **payer-formatted timesheet PDF**.

Three signatures are required to lock:
1. **Caregiver** — acknowledges hours.
2. **Supervisor** — verifies clinical adherence.
3. **Client / family** — confirms services received.

Reminder emails go out daily until all three are captured. Locked timesheets cannot be edited.
$md$, 'How timesheets are signed and locked.'),

('auto-billing', 'Auto Billing — One-Click Weekly', 'billing', 'guide', ARRAY['admin','billing'], 90,
$md$# Auto Billing — One-Click Weekly

1. Open **Finance → Auto Billing**.
2. Select the prior week → **Preview**.
3. The Pre-Bill Review Queue lists any blocked items:
   - Missing locked timesheet signature
   - Unresolved EVV mismatch
   - Expired credential
   - No active authorization with units
   - No documented payer rate
4. **Resolve** by fixing source data (recommended) or **Approve with reason code**.
5. **Commit** to generate invoices, 837P claims, and CSV/PDF exports.
6. Submit 837P to clearinghouse from **Claim Submissions**.
$md$, 'Generate invoices and 837P claims weekly.'),

('overrides', 'Override Limits & Alerts', 'billing', 'guide', ARRAY['admin','billing'], 95,
$md$# Override Limits & Alerts

Every override is recorded with actor, reason code, notes, and a snapshot of blockers. Per-role limits are configurable:

- Max single $ amount
- Max overrides per day
- Max weekly $ total
- Dual-approval requirement above threshold

When limits are hit, the system **hard-blocks** further overrides and emails the supervisor. Alerts also fire on:
- Single override ≥ $1,000
- ≥ 5 overrides per user per day
$md$, 'Guardrails on the pre-bill override queue.'),

('revenue-cycle', 'Revenue Cycle & 835 Posting', 'revenue', 'guide', ARRAY['admin','billing'], 100,
$md$# Revenue Cycle & 835 Posting

- Upload **835 remittance** files; the system auto-posts payments and adjustments to claims.
- **Aging buckets**: 0–30, 31–60, 61–90, 90+.
- **Dunning**: configurable reminder cadence for past-due balances.
- **Eligibility (270/271)** check before scheduling reduces denials.
- **Claim status (276/277)** poller surfaces payer responses.
$md$, 'Post payments and chase outstanding AR.'),

('payroll', 'Payroll', 'payroll', 'guide', ARRAY['admin','hr'], 110,
$md$# Payroll

Payroll **strictly** consumes EVV-verified hours — never scheduled estimates.

1. Set the pay period.
2. Review caregiver hours, overtime, and PTO.
3. Lock the period.
4. Export to your payroll provider or generate pay statements directly.
$md$, 'Run payroll from verified hours.'),

('mobile-caregiver', 'Caregiver Mobile App', 'mobile', 'guide', ARRAY['caregiver'], 120,
$md$# Caregiver Mobile App

- **Today** — your visits with one-tap clock in/out.
- **Schedule** — upcoming week.
- **Messages** — secure chat with office and family (when permitted).
- **Me** — credentials, training, pay stubs.

Works **offline**; visits sync automatically once you're back online.
$md$, 'What caregivers see on their phones.'),

('family-portal', 'Family Portal', 'family', 'guide', ARRAY['family'], 130,
$md$# Family Portal

Read-only view of:
- Upcoming and recent visits
- Verified arrival/departure times
- Tasks completed
- Caregiver photos and notes (when shared)

You can also **e-sign** weekly timesheets from this portal.
$md$, 'What family members can see and do.'),

('state-aggregator', 'State Aggregator (HHAeXchange / Sandata)', 'aggregator', 'guide', ARRAY['admin','billing'], 140,
$md$# State Aggregator

For state-mandated EVV reporting (NY HHAeXchange, Sandata states, etc.):

1. **Integrations → State Aggregator → Add Connection** — choose vendor, environment (test/prod), state, and paste API credentials.
2. Toggle **Requires Aggregator** on each payer that mandates reporting.
3. Visits auto-enqueue every 2 minutes; the dashboard shows accepted / pending / rejected counts.
4. Rejected events go to a **DLQ** for manual retry.
5. Claim generation is **blocked** for visits with rejected aggregator status until resolved.
$md$, 'Configure and monitor HHAeXchange/Sandata reporting.'),

-- FAQ / Runbooks
('runbook-evv-mismatch', 'Runbook: EVV Mismatch', 'evv-recon', 'runbook', ARRAY['admin','billing','manager'], 200,
$md$# Runbook: EVV Mismatch Won't Resolve

**Symptom:** A visit stays in the EVV reconciliation queue with status "mismatch".

**Diagnose**
1. Open the visit detail. Compare scheduled vs. verified times.
2. Check GPS — is the verified clock-in within the client's geofence?
3. Check Sandata batch — is this period covered?

**Fix**
- Variance < 15 min → click **Accept Verified** (most common).
- GPS outside geofence → confirm with caregiver, attach reason, **Accept with Override**.
- No matching Sandata record → re-upload Sandata batch for that period.
- Caregiver forgot to clock out → use **Manual Edit** with caregiver attestation.

**Escalate** to admin if the visit appears in two batches with conflicting times.
$md$, 'Fix stuck EVV mismatches.'),

('runbook-claim-rejected', 'Runbook: 837P Claim Rejected', 'billing', 'runbook', ARRAY['admin','billing'], 210,
$md$# Runbook: 837P Claim Rejected

**Symptom:** Claim returns from clearinghouse with status `rejected`.

**Diagnose**
1. Open **Claim Submissions** → click the claim → review the 277CA response.
2. Note the rejection code (e.g. `A7:21` invalid member ID).

**Common fixes**
| Code | Cause | Fix |
|------|-------|-----|
| A7:21 | Invalid Member ID | Update client's payer ID in Client Management |
| A7:33 | Subscriber/insured not found | Run 270 eligibility check |
| A7:153 | Procedure code invalid for date | Verify rate sheet effective dates |
| A7:507 | Missing service facility | Add facility NPI under Company Profile |

After fixing, re-run **Auto Billing** for that week — it will regenerate only the affected claim.
$md$, 'Resolve common 837P rejection codes.'),

('runbook-clock-in-blocked', 'Runbook: Caregiver Cannot Clock In', 'mobile', 'runbook', ARRAY['caregiver','admin','manager'], 220,
$md$# Runbook: Caregiver Cannot Clock In

**Symptom:** Mobile app blocks clock-in.

**Diagnose by error message**
- *"Expired credential"* → check Credentials module; renew or upload new doc.
- *"Outside geofence"* → confirm caregiver is at client's address; widen geofence under client settings if home is large.
- *"OIG/SAM excluded"* → run a fresh exclusion scan; if false-positive, contact admin.
- *"No active authorization"* → add or extend the authorization for that payer.
- *"Visit not assigned to you"* → re-assign in Scheduling.
$md$, 'Why a caregiver can''t clock in and how to fix it.'),

('runbook-aggregator-rejected', 'Runbook: Aggregator Event Rejected', 'aggregator', 'runbook', ARRAY['admin','billing'], 230,
$md$# Runbook: Aggregator Event Rejected

**Symptom:** Visit shows `aggregator_status = rejected` in the State Aggregator dashboard.

**Diagnose**
1. Click the event in the dashboard → view the vendor response payload.
2. Common causes:
   - Member ID mismatch with state file
   - Service code not authorized for that program
   - Visit overlaps another caregiver's visit
   - Late submission (> 7 days)

**Fix**
- Correct the source data, then click **Re-push** on the event.
- For chronic mismatches, verify the connection's `agency_id` and `provider_id` match the state's records.
$md$, 'Resolve HHAeXchange / Sandata rejections.'),

('faq-general', 'FAQ — General', NULL, 'faq', ARRAY['admin','manager','scheduler','billing','caregiver','family'], 300,
$md$# Frequently Asked Questions

**Q: Why can't I delete this visit?**
A: It's attached to a paid invoice. Paid visits are immutable for audit. Void the invoice first or use a correction adjustment.

**Q: I edited an EVV time and the invoice changed — is that right?**
A: Yes. Unpaid invoices auto-recalculate when EVV changes. Paid invoices do not.

**Q: Where do I find my pay stubs?**
A: Mobile app → **Me** → Pay Statements. Office staff: **Payroll** module.

**Q: Can family members see caregiver phone numbers?**
A: No. The Family Portal is read-only and only shows what the agency chooses to share.

**Q: How do I export everything for an audit?**
A: **Reports & Analytics → Audit Export** generates a zipped bundle with claims, EVV records, signed timesheets, and override logs.

**Q: How often does the data refresh?**
A: Live. Mobile clock-ins appear in the office within seconds. Sandata reconciliation runs whenever you upload a batch.
$md$, 'Common questions across all roles.'),

('glossary', 'Glossary', NULL, 'glossary', ARRAY['admin','manager','scheduler','billing','caregiver','family'], 400,
$md$# Glossary

- **EVV** — Electronic Visit Verification (GPS + timestamp).
- **837P** — Electronic professional claim format submitted to payers.
- **835** — Electronic remittance advice from payers (payment file).
- **270 / 271** — Eligibility check request / response.
- **276 / 277** — Claim status request / response.
- **Authorization** — Payer-issued allotment of units/visits.
- **Aggregator** — State EVV system (HHAeXchange, Sandata, Tellus, AuthentiCare).
- **HIPPS** — Home health prospective payment classification code.
- **OASIS-E** — CMS standardized clinical assessment.
- **Geofence** — Radius around client address that defines a valid clock-in zone.
- **Pre-bill validation** — Automatic checks that block invoice generation when data is missing.
- **Override** — Documented admin decision to bypass a pre-bill blocker.
- **Locked timesheet** — Three-signature sealed record; cannot be edited.
- **DLQ** — Dead-letter queue for failed integration events.
$md$, 'Definitions of acronyms and key terms.');
