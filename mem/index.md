# Project Memory

## Core
Centralized DB for Client, Caregiver, Scheduling, Billing, Payroll modules.
Billing/payroll strictly uses GPS-tracked EVV verified hours, NEVER scheduled estimates.
Visits on paid invoices cannot be deleted. Unpaid invoices auto-recalculate on EVV edits.
Clearinghouse, 837P/835, eMAR, RCM, state-aggregator support is Enterprise-only — route Standard/Professional to docs or upsell, never to hands-on tickets.

## Memories
- [Core Architecture](mem://project/core-architecture) — Centralized DB context across Client, Caregiver, Scheduling, Billing, Payroll
- [EVV Billing & Payroll](mem://logic/evv-billing-payroll-integration) — Billing and payroll use GPS-tracked EVV verified hours, not scheduled estimates
- [Client Onboarding](mem://features/client-onboarding-workflow) — Digital intake with canvas e-signatures and auto-promotion to active client
- [Financial Integrity Rules](mem://constraints/financial-integrity-rules) — Rules preventing paid visit deletion and enforcing unpaid invoice recalculation
- [Support Tier Policy](mem://constraints/support-tier-policy) — Enterprise-only support topics + SLA copy + implementation anchors
- [Legal disclosures system](mem://features/legal-disclosures) — Centralized legal content, public /legal pages, AppFooter, signup ToS, LegalDisclaimer banners