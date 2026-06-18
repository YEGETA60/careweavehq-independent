
-- Reviewer invites table: 15-day enterprise review access, revocable
CREATE TABLE public.reviewer_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  granted_role public.app_role NOT NULL DEFAULT 'superadmin',
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 days'),
  used_at timestamptz,
  used_by uuid,
  revoked_at timestamptz,
  revoked_by uuid,
  revoke_reason text
);

CREATE INDEX idx_reviewer_invites_email ON public.reviewer_invites (lower(email));
CREATE INDEX idx_reviewer_invites_used_by ON public.reviewer_invites (used_by) WHERE used_by IS NOT NULL;

ALTER TABLE public.reviewer_invites ENABLE ROW LEVEL SECURITY;

-- Only Web Admins can read / manage
CREATE POLICY "Web admins read reviewer invites"
ON public.reviewer_invites FOR SELECT
TO authenticated
USING (public.current_user_has_any_role(ARRAY['admin','superadmin']::public.app_role[]));

CREATE POLICY "Web admins create reviewer invites"
ON public.reviewer_invites FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_has_any_role(ARRAY['admin','superadmin']::public.app_role[])
  AND created_by = auth.uid()
);

-- Updates/deletes only happen through SECURITY DEFINER functions below.

-- Redeem function
CREATE OR REPLACE FUNCTION public.redeem_reviewer_invite(_token text)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_invite public.reviewer_invites%ROWTYPE;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be signed in';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No email on account';
  END IF;

  SELECT * INTO v_invite FROM public.reviewer_invites
   WHERE token = _token
     AND used_at IS NULL
     AND revoked_at IS NULL
     AND expires_at > now()
     AND lower(email) = lower(v_email)
   LIMIT 1;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'Invalid, expired, revoked or already-used invite';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), v_invite.granted_role)
  ON CONFLICT DO NOTHING;

  UPDATE public.reviewer_invites
     SET used_at = now(), used_by = auth.uid()
   WHERE id = v_invite.id;

  RETURN v_invite.granted_role;
END;
$$;

-- Revoke function: removes the granted role from the redeemed user (if any).
CREATE OR REPLACE FUNCTION public.revoke_reviewer_invite(_invite_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_invite public.reviewer_invites%ROWTYPE;
BEGIN
  IF NOT public.current_user_has_any_role(ARRAY['admin','superadmin']::public.app_role[]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_invite FROM public.reviewer_invites WHERE id = _invite_id;
  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.revoked_at IS NOT NULL THEN
    RETURN; -- already revoked, no-op
  END IF;

  UPDATE public.reviewer_invites
     SET revoked_at = now(),
         revoked_by = auth.uid(),
         revoke_reason = _reason
   WHERE id = _invite_id;

  -- If the invite was redeemed, remove the granted role from that user,
  -- but only if they have no other active reviewer invite granting the same role.
  IF v_invite.used_by IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.reviewer_invites r
       WHERE r.used_by = v_invite.used_by
         AND r.granted_role = v_invite.granted_role
         AND r.id <> v_invite.id
         AND r.revoked_at IS NULL
         AND r.expires_at > now()
    ) THEN
      DELETE FROM public.user_roles
       WHERE user_id = v_invite.used_by
         AND role = v_invite.granted_role;
    END IF;
  END IF;
END;
$$;

-- Auto-expire helper: removes granted roles for reviewers whose 15-day window has elapsed.
-- Safe to call from a cron job. Does not flip revoked_at (expiry is a separate signal).
CREATE OR REPLACE FUNCTION public.expire_reviewer_access()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  removed integer := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT used_by, granted_role
      FROM public.reviewer_invites
     WHERE used_by IS NOT NULL
       AND revoked_at IS NULL
       AND expires_at <= now()
  LOOP
    -- Only remove the role if the user has no other still-active reviewer invite for the same role.
    IF NOT EXISTS (
      SELECT 1 FROM public.reviewer_invites
       WHERE used_by = r.used_by
         AND granted_role = r.granted_role
         AND revoked_at IS NULL
         AND expires_at > now()
    ) THEN
      DELETE FROM public.user_roles
       WHERE user_id = r.used_by AND role = r.granted_role;
      removed := removed + 1;
    END IF;
  END LOOP;
  RETURN removed;
END;
$$;
