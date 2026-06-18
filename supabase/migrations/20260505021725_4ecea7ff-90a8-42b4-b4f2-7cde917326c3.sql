-- Admin invites
CREATE TABLE public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'superadmin',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid
);
CREATE INDEX idx_admin_invites_email ON public.admin_invites(lower(email));
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin manage invites" ON public.admin_invites
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Site settings (singleton row)
CREATE TABLE public.site_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text,
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
INSERT INTO public.site_settings (id) VALUES (1);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone signed-in can read settings" ON public.site_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "superadmin update settings" ON public.site_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- Bootstrap: if no superadmin exists yet, the first user that registers via the
-- redeem-admin-invite flow becomes superadmin. Also, promote any existing admin
-- to superadmin on first run if there are no superadmins (so the current admin
-- can issue invites). This is safe because only existing admins exist already.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'superadmin') THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT user_id, 'superadmin'::app_role
    FROM public.user_roles
    WHERE role = 'admin'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Helper: redeem an invite. Runs as security definer so the signing-in user can
-- grant themselves a role only if they present a valid, unused, unexpired token
-- matching their email.
CREATE OR REPLACE FUNCTION public.redeem_admin_invite(_token text)
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_invite admin_invites%ROWTYPE;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be signed in';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No email on account';
  END IF;

  SELECT * INTO v_invite FROM public.admin_invites
  WHERE token = _token
    AND used_at IS NULL
    AND expires_at > now()
    AND lower(email) = lower(v_email)
  LIMIT 1;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'Invalid, expired, or already-used invite';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), v_invite.role)
  ON CONFLICT DO NOTHING;

  UPDATE public.admin_invites
  SET used_at = now(), used_by = auth.uid()
  WHERE id = v_invite.id;

  RETURN v_invite.role;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_admin_invite(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.redeem_admin_invite(text) TO authenticated;