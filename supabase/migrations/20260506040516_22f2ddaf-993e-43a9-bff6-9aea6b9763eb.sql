
CREATE TABLE IF NOT EXISTS public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text,
  expires_at timestamptz,
  max_uses integer,
  use_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage access codes" ON public.access_codes;
CREATE POLICY "admins manage access codes"
ON public.access_codes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));

CREATE OR REPLACE FUNCTION public.redeem_access_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.access_codes%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.access_codes WHERE upper(code) = upper(_code) LIMIT 1;
  IF r.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid access code');
  END IF;
  IF NOT r.active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This code has been disabled');
  END IF;
  IF r.expires_at IS NOT NULL AND r.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This code has expired');
  END IF;
  IF r.max_uses IS NOT NULL AND r.use_count >= r.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This code has reached its usage limit');
  END IF;
  UPDATE public.access_codes SET use_count = use_count + 1 WHERE id = r.id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_access_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_access_code(text) TO anon, authenticated;

-- No shared access code is seeded in a clean deployment.
