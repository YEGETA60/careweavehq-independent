-- 1) Helper: is the current auth user a reviewer?
CREATE OR REPLACE FUNCTION public.current_user_is_reviewer()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'reviewer'::public.app_role
  )
$$;

-- 2) Generic block trigger
CREATE OR REPLACE FUNCTION public.block_reviewer_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.current_user_is_reviewer() THEN
    RAISE EXCEPTION 'Read-only reviewer account: write operations are not permitted'
      USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- 3) Attach trigger to every base table in public, excluding system/logging tables.
DO $$
DECLARE
  r record;
  excluded text[] := ARRAY[
    'audit_log','phi_access_log','rate_limit_counters','email_send_log',
    'data_purge_log','subscription_tier_audit','manual_versions',
    'aggregator_outbound_events','authorization_alerts','exclusion_checks'
  ];
BEGIN
  FOR r IN
    SELECT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT (c.relname = ANY(excluded))
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS zz_block_reviewer_writes ON public.%I;
       CREATE TRIGGER zz_block_reviewer_writes
       BEFORE INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.block_reviewer_writes();',
      r.tbl, r.tbl
    );
  END LOOP;
END $$;

-- 4) Update redeem_reviewer_invite to also assign the 'reviewer' marker role
CREATE OR REPLACE FUNCTION public.redeem_reviewer_invite(_token text)
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_invite public.reviewer_invites%ROWTYPE;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Must be signed in'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN RAISE EXCEPTION 'No email on account'; END IF;

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

  -- Grant the requested viewing role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), v_invite.granted_role)
  ON CONFLICT DO NOTHING;

  -- Also tag as 'reviewer' so write-blocking triggers fire
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'reviewer'::public.app_role)
  ON CONFLICT DO NOTHING;

  UPDATE public.reviewer_invites
     SET used_at = now(), used_by = auth.uid()
   WHERE id = v_invite.id;

  RETURN v_invite.granted_role;
END;
$function$;

-- 5) Update revoke to also remove the reviewer marker role (when no other active invites)
CREATE OR REPLACE FUNCTION public.revoke_reviewer_invite(_invite_id uuid, _reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_invite public.reviewer_invites%ROWTYPE;
BEGIN
  IF NOT public.current_user_has_any_role(ARRAY['admin','superadmin']::public.app_role[]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_invite FROM public.reviewer_invites WHERE id = _invite_id;
  IF v_invite.id IS NULL THEN RAISE EXCEPTION 'Invite not found'; END IF;
  IF v_invite.revoked_at IS NOT NULL THEN RETURN; END IF;

  UPDATE public.reviewer_invites
     SET revoked_at = now(), revoked_by = auth.uid(), revoke_reason = _reason
   WHERE id = _invite_id;

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
       WHERE user_id = v_invite.used_by AND role = v_invite.granted_role;
    END IF;

    -- Remove the reviewer marker if no other active reviewer invites remain for this user
    IF NOT EXISTS (
      SELECT 1 FROM public.reviewer_invites r
       WHERE r.used_by = v_invite.used_by
         AND r.id <> v_invite.id
         AND r.revoked_at IS NULL
         AND r.expires_at > now()
    ) THEN
      DELETE FROM public.user_roles
       WHERE user_id = v_invite.used_by AND role = 'reviewer'::public.app_role;
    END IF;
  END IF;
END;
$function$;

-- 6) Update expire sweep to also strip the reviewer marker when all invites are gone
CREATE OR REPLACE FUNCTION public.expire_reviewer_access()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Strip reviewer marker from users with no active reviewer invites
  DELETE FROM public.user_roles ur
   WHERE ur.role = 'reviewer'::public.app_role
     AND NOT EXISTS (
       SELECT 1 FROM public.reviewer_invites ri
        WHERE ri.used_by = ur.user_id
          AND ri.revoked_at IS NULL
          AND ri.expires_at > now()
     );

  RETURN removed;
END;
$function$;
