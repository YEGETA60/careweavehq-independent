---
name: Legal disclosures system
description: Centralized legal content (Terms/Privacy/HIPAA/AUP/Disclaimers), public /legal/:doc page, AppFooter on all pages, signup ToS checkbox, and reusable LegalDisclaimer banners. LLC entity configured in src/lib/legal-content.ts (LEGAL_ENTITY).
type: feature
---
- All legal text lives in `src/lib/legal-content.ts`. Update LEGAL_ENTITY (name, address, state, emails) once the LLC is registered.
- Public routes: `/legal`, `/legal/terms|privacy|hipaa|aup|disclaimers` (Legal.tsx).
- `<AppFooter />` rendered on Index dashboard and Legal page. Auth page has inline links.
- `<LegalDisclaimer variant="..." />` variants: clinicalAi, schedulingAi, financialEstimate, evvCompliance, familyPortal, marketingNotConsent, betaFeature, noPHIInSupport, custom.
- Injected in: Clinical, SchedulingIntel, FamilyPortal, ClaimSubmissions, BillingInvoicing, AutoBilling, OperationsManual.
- Signup requires ToS/Privacy/HIPAA checkbox; timestamp stored in user metadata as terms_accepted_at + terms_version.
- Templates require attorney review before production use.