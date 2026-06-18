UPDATE public.manual_sections
SET body = '# Day 1 — Initial Setup (Admin)

Complete these steps **in order** before onboarding any clients.

1. **Company Profile** → enter NPI, Tax ID, address, and upload your logo.
2. **Payers & Authorizations** → add each payer (Medicaid waiver, Medicare, private pay, VA, Regional Center, etc.) and upload rate sheets per service code.
3. **User Admin** → invite users and assign roles (admin, manager, scheduler, billing, caregiver, family).
4. **Auto Billing → Override Limits** → configure per-role $ caps and reason codes.
5. **State Aggregator** (if applicable) → connect HHAeXchange / Sandata credentials.
6. **Subscription** → confirm plan and billing.

> ✅ Once these are complete you can begin client intake.
'
WHERE id = '2d2cc74c-cd7f-4729-be55-106399635e29';