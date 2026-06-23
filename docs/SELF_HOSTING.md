# CareWeave independence plan

CareWeave can run without Lovable. The application is a standard React
frontend backed by Supabase-compatible PostgreSQL, Auth, Storage, Realtime,
and Edge Functions.

The code currently supports a safe transition:

- Google sign-in uses Supabase directly.
- Direct Stripe, Resend, OpenAI-compatible AI, and Twilio credentials take
  priority when configured.
- Existing Lovable service connections remain as temporary fallbacks.

## Recommended beta architecture

| Part | Recommended home |
|---|---|
| Source code | GitHub |
| Frontend and custom domain | Cloudflare Pages |
| Database, Auth, Storage, Realtime, Edge Functions | Your own Supabase project |
| Payments | Your own Stripe account |
| Transactional email | Your own Resend account |
| AI | Your own OpenAI-compatible account |
| SMS | Your own Twilio account |

This is a beta configuration only. Before storing real patient information,
confirm that every provider in the production data path offers the contracts,
security controls, and Business Associate Agreement your compliance plan
requires.

## Safest migration order

### 1. Keep the current app running

Do not remove the Lovable project, switch the domain, or delete any secrets
yet. It is the rollback copy until the independent app passes testing.

### 2. Create a separate Supabase project

Because CareWeave currently has no subscribers and no production patient data,
the simplest and safest choice is a clean database. Test users can sign up
again. This avoids copying Lovable billing metadata, old test data, and Auth
identities.

From the repository:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_NEW_PROJECT_REF
npx supabase db push
```

The repository contains the chronological database migrations. After they
finish, regenerate the local database types:

```powershell
npx supabase gen types typescript --linked --schema public > src/integrations/supabase/types.ts
```

If test data must be retained, export and restore it separately only after the
clean schema has been verified. Do not copy Lovable-managed secrets.

### 3. Configure Supabase Auth

In the new Supabase project:

1. Set the production site URL and allowed redirect URLs.
2. Enable email/password sign-in.
3. Configure Google OAuth directly in Supabase if Google sign-in is needed.
4. Use Supabase's normal Auth email configuration with your own SMTP provider.
   Do not enable the old `auth-email-hook`; it is a Lovable-specific fallback.

### 4. Add Edge Function secrets

Use `supabase/functions-secrets.example` as the checklist. Add actual values in
the Supabase dashboard or with `supabase secrets set`; never put secret keys in
the frontend `.env` file.

Direct credentials are selected first:

- `STRIPE_*_SECRET_KEY` and `STRIPE_*_WEBHOOK_SECRET`
- `RESEND_API_KEY` and `EMAIL_FROM`
- `AI_API_KEY`, with optional `AI_BASE_URL` and model settings
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`

Deploy the functions after secrets are present:

```powershell
npx supabase functions deploy
```

The old Lovable auth-email and suppression webhook functions do not need to be
connected in the new project. The normal Supabase Auth email settings and
Resend delivery should be used instead.

### 5. Configure Stripe in test mode

There are currently no subscribers to transfer. Create fresh Stripe test-mode
products and recurring prices using these lookup keys:

- `standard_small_monthly`
- `standard_small_yearly`
- `standard_large_monthly`
- `standard_large_yearly`
- `professional_small_monthly`
- `professional_small_yearly`
- `professional_large_monthly`
- `professional_large_yearly`
- `enterprise_small_monthly`
- `enterprise_small_yearly`
- `enterprise_large_monthly`
- `enterprise_large_yearly`

Add a test webhook pointing to:

```text
https://YOUR_NEW_PROJECT_REF.supabase.co/functions/v1/payments-webhook?env=sandbox
```

Subscribe it to:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Keep live-mode keys empty until checkout, portal access, webhooks, cancellation,
and the 45-day trial have all passed end-to-end testing.

### 6. Deploy the frontend

Create a Cloudflare Pages project from this GitHub repository:

- Build command: `npm run build`
- Output directory: `dist`
- Node version: current LTS

Add these frontend variables:

```text
VITE_SUPABASE_URL=https://YOUR_NEW_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_NEW_ANON_KEY
VITE_SUPABASE_PROJECT_ID=YOUR_NEW_PROJECT_REF
VITE_STRIPE_PUBLISHABLE_KEY=YOUR_STRIPE_TEST_PUBLISHABLE_KEY
```

The included `public/_redirects` file preserves React routes when a user
refreshes a page.

### 7. Acceptance test before switching the domain

Verify all of the following on the new URL:

- Create an account and confirm email.
- Sign in, sign out, reset password, and Google sign-in.
- Confirm the admin receives the 45-day Enterprise beta trial.
- Open every gated module.
- Create a company, client, caregiver, visit, and EVV clock event.
- Upload and download a test document containing no PHI.
- Send a test transactional email and SMS.
- Run AI Co-Pilot and care-plan parsing with synthetic data.
- Complete a Stripe test checkout and open the billing portal.
- Confirm the Stripe webhook updates `company_subscriptions`.

### 8. Cut over and stop Lovable charges

Only after acceptance testing:

1. Point the custom domain to Cloudflare Pages.
2. Update Supabase Auth URLs to the custom domain.
3. Test sign-in and Stripe once more on the custom domain.
4. Keep the old project available briefly as a rollback copy.
5. Disable Lovable auto top-ups and paid Cloud resources.
6. After the rollback window, remove Lovable secrets from the new Supabase
   project.

## Rollback

If the new deployment fails before the Lovable project is removed, point the
domain back to the previous deployment. No Stripe customers need reconciliation
at this beta stage, which makes rollback straightforward.
