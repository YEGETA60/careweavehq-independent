
-- ============ COMPANIES ============
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  display_name text,
  tax_id text,
  email text,
  phone text,
  website text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'US',
  logo_url text,
  timezone text DEFAULT 'America/New_York',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER companies_updated BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ COMPANY USERS ============
CREATE TABLE public.company_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  company_role text NOT NULL DEFAULT 'member', -- owner | admin | member
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

-- ============ SUBSCRIPTION TIERS ============
CREATE TABLE public.subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE, -- 'basic' | 'pro'
  name text NOT NULL,
  description text,
  monthly_price numeric NOT NULL DEFAULT 0,
  yearly_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  max_users integer,
  max_clients integer,
  max_caregivers integer,
  included_modules text[] NOT NULL DEFAULT '{}',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER tiers_updated BEFORE UPDATE ON public.subscription_tiers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.subscription_tiers (slug, name, description, sort_order, features) VALUES
  ('basic', 'Basic', 'Essential tools for small agencies', 1,
    '["Core scheduling","EVV","Basic billing","Up to 5 staff users"]'::jsonb),
  ('pro',   'Pro',   'Full platform for growing agencies', 2,
    '["Everything in Basic","HR module","Live map","Messaging","Advanced reports","Priority support"]'::jsonb);

-- ============ COMPANY SUBSCRIPTIONS ============
CREATE TABLE public.company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  tier_id uuid REFERENCES public.subscription_tiers(id),
  status text NOT NULL DEFAULT 'trialing', -- trialing | active | past_due | canceled
  billing_cycle text NOT NULL DEFAULT 'monthly', -- monthly | yearly
  trial_ends_at timestamptz,
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz,
  external_customer_id text,
  external_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER company_subs_updated BEFORE UPDATE ON public.company_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PROFILE FLAGS ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- ============ HELPER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.user_company_ids(_user uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT company_id FROM public.company_users WHERE user_id = _user $$;

CREATE OR REPLACE FUNCTION public.is_member_of_company(_company uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.company_users
                WHERE company_id = _company AND user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_company uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.company_users
                WHERE company_id = _company AND user_id = auth.uid()
                  AND company_role IN ('owner','admin'))
     OR public.has_role(auth.uid(), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT default_company_id FROM public.profiles WHERE id = auth.uid() $$;

-- ============ RLS POLICIES ============

-- companies
CREATE POLICY "members view company" ON public.companies
  FOR SELECT TO authenticated
  USING (public.is_member_of_company(id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "anyone signed-in creates company" ON public.companies
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "company admin updates company" ON public.companies
  FOR UPDATE TO authenticated
  USING (public.is_company_admin(id));

CREATE POLICY "app admin deletes company" ON public.companies
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

-- company_users
CREATE POLICY "view own memberships" ON public.company_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_company_admin(company_id));

CREATE POLICY "company admin manages members ins" ON public.company_users
  FOR INSERT TO authenticated
  WITH CHECK (public.is_company_admin(company_id) OR
              (user_id = auth.uid() AND NOT EXISTS (SELECT 1 FROM public.company_users WHERE company_id = company_users.company_id)));

CREATE POLICY "company admin manages members upd" ON public.company_users
  FOR UPDATE TO authenticated USING (public.is_company_admin(company_id));

CREATE POLICY "company admin manages members del" ON public.company_users
  FOR DELETE TO authenticated USING (public.is_company_admin(company_id));

-- subscription_tiers (public-readable, superadmin manage)
CREATE POLICY "anyone signed-in views tiers" ON public.subscription_tiers
  FOR SELECT TO authenticated USING (active OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "superadmin manages tiers ins" ON public.subscription_tiers
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "superadmin manages tiers upd" ON public.subscription_tiers
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "superadmin manages tiers del" ON public.subscription_tiers
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'superadmin'));

-- company_subscriptions
CREATE POLICY "members view subscription" ON public.company_subscriptions
  FOR SELECT TO authenticated
  USING (public.is_member_of_company(company_id) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "company admin creates subscription" ON public.company_subscriptions
  FOR INSERT TO authenticated WITH CHECK (public.is_company_admin(company_id));

CREATE POLICY "company admin updates subscription" ON public.company_subscriptions
  FOR UPDATE TO authenticated USING (public.is_company_admin(company_id));

CREATE POLICY "app admin deletes subscription" ON public.company_subscriptions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));
