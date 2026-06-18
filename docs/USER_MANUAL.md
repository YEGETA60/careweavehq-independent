# CareWeaveHQ — User Manual

Last updated: May 2026 · App version: v1.2

This manual covers day-to-day use of CareWeaveHQ for agency owners,
operations directors, billing supervisors, schedulers, caregivers, and
family members. For architecture and module-by-module reference, see the
in-app **Docs** at `/docs`.

---

## 1. Getting started — the onboarding wizard

When you first sign in, the dashboard shows a 5-step **Onboarding Wizard**.
It is dismissible but stays visible until every step is complete. Target
time to finish: under 10 minutes.

1. **Agency basic info** — legal name, NPI, tax ID, address, logo.
2. **Payer setup** — add at least one payer with a rate sheet.
3. **Add first client** — minimum: name, DOB, address, primary payer.
4. **Add first caregiver** — name, contact, role, hire date; invite via
   email to activate their mobile portal.
5. **Schedule first shift** — pick the client + caregiver + date/time.

Progress is tracked in the `onboarding_progress` table and auto-completes
as you finish each module. Each step deep-links into the relevant screen.

> **Tip:** you can return to the wizard any time from the dashboard
> header until all 5 steps are green.

---

## 2. Daily operations

### Caregivers

- Clock in / out from the mobile portal — GPS is required.
- Capture visit notes, ADL/IADL, vitals, and incident reports.
- Acknowledge the weekly timesheet before it's submitted to the client
  for e-signature.

### Schedulers

- Build recurring visits or one-off shifts.
- The **Live Map** and **Scheduling Intelligence** modules flag late or
  missed visits in real time.
- AI Shift Matching (Enterprise) suggests the best caregiver based on
  skills, geography, and history.

### Office / Admin

- Review the **Pre-Bill Review Queue** for blocked items.
- Approve with a reason code (auto re-runs billing) or fix the data.
- Monitor **Override Alerts** — high-value (≥ $1,000) or
  high-frequency (≥ 5/day) approvals notify the supervisor automatically.

---

## 3. Weekly billing — one click

1. Open **Finance → Auto Billing**.
2. Preview the prior week. Blockers (missing signatures, EVV mismatches,
   expired credentials, missing rate sheets) appear in the review queue.
3. Resolve or override blockers.
4. **Commit.** The system generates:
   - Invoices (PDF)
   - **837P EDI claim files (`.txt`)** — upload to your clearinghouse.
   - **CSV summary** of the same batch for reconciliation.
5. Track payments under **Revenue Cycle** (Enterprise): 835 posting,
   aging buckets, dunning.

### Data validation guardrails

The following are rejected at submit time and at the database layer:

- Negative hours.
- Future-dated clock-outs or visit dates.
- Billing amounts outside the payer's rate sheet bounds.
- Edits to visits attached to a **paid** invoice (immutable).

Edits to visits on an **unpaid** invoice auto-trigger an invoice
recalculation.

---

## 4. Compliance & audit

Every access to and change of Protected Health Information (PHI) is
captured in the append-only `phi_audit_logs` table. For each event we
record actor user id, role snapshot, company, action (read, list,
create, update, delete, export, print, clock in/out, sign, login,
impersonate), entity type and id, per-field before/after diff, IP
address, user agent, request id, and source (web, mobile, edge
function, trigger, cron).

Guarantees:

- **Append-only at the database layer** — `BEFORE UPDATE` and
  `BEFORE DELETE` triggers raise an exception, so no application
  code, service-role key, or admin user can alter or delete a log row.
- **Backend-only writes** — RLS exposes no INSERT policy. Writes go
  through the `log_phi_event()` `SECURITY DEFINER` RPC or the
  automatic `audit_phi_changes()` trigger attached to clients,
  caregivers, visits, intakes, credentials, invoices, claims,
  claim lines, authorizations, timesheets, timesheet signatures,
  messages, message attachments, and employment records.
- **Admin-only reads** — only users with the `admin` role can query
  the log.
- **10-year retention**, exceeding the HIPAA 6-year minimum.

See `docs/PHI_AUDIT.md` for the developer reference (how to call
`auditPhi()` from React or `auditPhiEdge()` from an edge function,
and how to extend the trigger to new PHI tables).

Credential and training expirations trigger reminders at **60, 30, and
7 days** before expiry. Expired credentials block billing for that
caregiver until renewed.

OIG/SAM exclusion scans run on a schedule and on every new hire.

---

## 5. Support & SLA policy

CareWeaveHQ pairs every plan with a clearly published support tier.

| Tier | Email SLA | Self-serve | Clearinghouse / 837P / eMAR / RCM |
|------|-----------|------------|-----------------------------------|
| Standard ($99) | 48h | Required first (docs + AI) | Documentation only |
| Professional ($199) | 24h | Recommended | Documentation only |
| Enterprise ($299) | **4h priority** | Optional | **Included — direct specialist** |

- **Standard** users must tick *"I've checked the documentation and AI
  assistant"* before a ticket can be submitted.
- Tickets that match Enterprise-only keywords (clearinghouse, 837, 835,
  eMAR, RCM, 270/271/276/277, HHAeXchange) are blocked on Standard /
  Professional and replaced with a docs + upgrade card.
- The SLA disclosure is shown on `/pricing` and at the bottom of the
  in-app Support module.

---

## 6. Tier feature matrix (summary)

| Feature | Standard | Professional | Enterprise |
|---|---|---|---|
| Client / caregiver / scheduling | ✅ | ✅ | ✅ |
| EVV capture & reconciliation | ✅ | ✅ | ✅ |
| Auto-billing + 837P export | ✅ | ✅ | ✅ |
| AI shift matching | — | ✅ | ✅ |
| eMAR & Clinical | — | — | ✅ |
| Revenue Cycle Management | — | — | ✅ |
| State aggregator push (HHAeXchange / Sandata) | — | — | ✅ |
| Priority 4h support + clearinghouse help | — | — | ✅ |

See `/pricing` for the full comparison and current prices.

---

## 7. Where to learn more

- **In-app docs:** `/docs` — module-by-module reference.
- **Operations Manual module:** scripted playbooks for closing the week,
  handling EVV mismatches, and onboarding new clients.
- **Legal:** `/legal` — Terms, Privacy, and HIPAA BAA.
- **Changelog:** [`CHANGELOG.md`](../CHANGELOG.md).

If you can't find what you need: Standard / Professional users — start
at `/docs` and the in-app AI assistant. Enterprise users — open a
ticket from the Support module for a 4-hour response.