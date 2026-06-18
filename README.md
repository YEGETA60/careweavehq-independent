# CareWeaveHQ

End-to-end home care operations platform unifying client intake, caregiver
management, scheduling, EVV-verified visit capture, care planning, billing,
payroll, and family/caregiver portals on a single centralized database.

Purpose-built for U.S. home care agencies serving Medicare, Medicaid waivers
(IHSS, CDASS, HCBS), Regional Center, VA, and private-pay clients.

**Core promise:** every dollar billed and every dollar paid is tied to a
GPS-verified EVV visit — never to a scheduled estimate.

- Live app: https://careweavehq.com
- GitHub repository: https://github.com/yeyesus-png/careweave-welcome
- Product docs (in-app): `/docs`
- User manual: [`docs/USER_MANUAL.md`](docs/USER_MANUAL.md)
- Changelog: [`CHANGELOG.md`](CHANGELOG.md)

## What's inside

- **Client lifecycle** — digital intake with e-signatures, demographics,
  payers, care plans, family portal.
- **Caregiver lifecycle** — hiring, credentials, training, HR, mobile
  caregiver portal with GPS clock-in/out.
- **Scheduling & EVV** — recurring visits, AI shift matching (Enterprise),
  live map, Sandata/HHAeXchange reconciliation.
- **Finance** — one-click auto-billing, pre-bill review queue, override
  limits & alerts, 837P claims, 835 remittance posting, AR aging.
- **Payroll** — strictly EVV-verified hours, period close, OT detection.
- **Compliance** — append-only PHI audit log (`phi_audit_logs`)
  capturing every read, create, update, delete, export, print, and
  signing event with actor, role, IP, user agent, request id, and
  field-level diff. Admin-only reads, 10-year retention,
  service-role writes blocked at the trigger layer. OIG/SAM
  exclusion scans and credential expiry alerts at 60 / 30 / 7 days.
- **Onboarding wizard** — 5-step guided setup (Agency Info → Payer →
  Client → Caregiver → First Shift) surfaced on the dashboard until
  complete.
- **Tier-aware support** — self-service-first for Standard, priority
  ticketing for Enterprise. See SLA below.

## Pricing tiers & SLA

| Tier | Price | Email SLA | Clearinghouse / 837P / eMAR / RCM help |
|------|-------|-----------|----------------------------------------|
| Standard | $99/mo | 48h (docs + community first) | ❌ — docs only |
| Professional | $199/mo | 24h | ❌ |
| Enterprise | $299/mo | 4h priority | ✅ included |

Tier gating is enforced in `ModuleGate` and on the Support ticket form.
Standard users must confirm they've checked the documentation before
submitting a ticket; tickets matching Enterprise-only keywords
(clearinghouse, 837, 835, eMAR, RCM, 270/271/276/277, HHAeXchange) are
blocked with an upgrade card.

## Financial integrity rules (non-bypassable)

- Billing and payroll only consume GPS-verified EVV hours.
- Visits attached to **paid** invoices cannot be deleted.
- EVV edits on **unpaid** invoices auto-recalculate the invoice.
- Negative hours, future-dated clock-outs, and out-of-range billing
  amounts are rejected at the database layer.
- Every override is recorded immutably with actor, reason code, and a
  snapshot of blockers.

## Exports

- Raw 837P EDI (`.txt`) for direct upload to any clearinghouse.
- CSV summary of the same claim batch for ops reconciliation.
- Per-visit / per-claim audit packets (PDF) via
  `claim-audit-packet` edge function.

## Tech stack

- Vite + React 18 + TypeScript + Tailwind + shadcn-ui
- Lovable Cloud (Supabase) for DB, auth, storage, edge functions
- Lovable AI Gateway for AI features (care-plan parsing, shift matching)
- Capacitor for the caregiver mobile app; Electron for desktop admin

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Open the Lovable project linked to this repository and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Open the Lovable project linked to this repository and click Share → Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
<!-- Sync trigger: 2026-06-09 -->
