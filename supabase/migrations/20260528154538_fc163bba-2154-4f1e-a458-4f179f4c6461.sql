-- ============================================================
-- Hardened data validation (visits, claim_lines)
-- Uses triggers (not CHECK constraints) per project guidance.
-- ============================================================

-- ---------- visits ----------
CREATE OR REPLACE FUNCTION public.validate_visit_times()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _re_time text := '^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$';
  _start_ts timestamp;
  _end_ts   timestamp;
  _vstart_ts timestamp;
  _vend_ts   timestamp;
  _span_hours numeric;
BEGIN
  -- Date sanity
  IF NEW.date IS NULL THEN
    RAISE EXCEPTION 'Visit date is required';
  END IF;
  IF NEW.date > current_date + 365 THEN
    RAISE EXCEPTION 'Visit date cannot be more than 1 year in the future';
  END IF;

  -- Time format
  IF NEW.start_time !~ _re_time THEN
    RAISE EXCEPTION 'start_time must be HH:MM or HH:MM:SS (got %)', NEW.start_time;
  END IF;
  IF NEW.end_time !~ _re_time THEN
    RAISE EXCEPTION 'end_time must be HH:MM or HH:MM:SS (got %)', NEW.end_time;
  END IF;

  -- Scheduled end > start (allow overnight up to 24h)
  _start_ts := (NEW.date || ' ' || NEW.start_time)::timestamp;
  _end_ts   := (NEW.date || ' ' || NEW.end_time)::timestamp;
  IF _end_ts <= _start_ts THEN
    _end_ts := _end_ts + interval '1 day'; -- overnight
  END IF;
  _span_hours := extract(epoch FROM (_end_ts - _start_ts)) / 3600.0;
  IF _span_hours <= 0 THEN
    RAISE EXCEPTION 'Visit end_time must be after start_time';
  END IF;
  IF _span_hours > 24 THEN
    RAISE EXCEPTION 'Visit span cannot exceed 24 hours (got % h)', round(_span_hours, 2);
  END IF;

  -- Verified times
  IF NEW.verified_start_time IS NOT NULL THEN
    IF NEW.verified_start_time !~ _re_time THEN
      RAISE EXCEPTION 'verified_start_time must be HH:MM or HH:MM:SS';
    END IF;
  END IF;
  IF NEW.verified_end_time IS NOT NULL THEN
    IF NEW.verified_end_time !~ _re_time THEN
      RAISE EXCEPTION 'verified_end_time must be HH:MM or HH:MM:SS';
    END IF;
  END IF;

  IF NEW.verified_start_time IS NOT NULL AND NEW.verified_end_time IS NOT NULL THEN
    _vstart_ts := (NEW.date || ' ' || NEW.verified_start_time)::timestamp;
    _vend_ts   := (NEW.date || ' ' || NEW.verified_end_time)::timestamp;
    IF _vend_ts <= _vstart_ts THEN
      _vend_ts := _vend_ts + interval '1 day';
    END IF;
    _span_hours := extract(epoch FROM (_vend_ts - _vstart_ts)) / 3600.0;
    IF _span_hours <= 0 THEN
      RAISE EXCEPTION 'Verified end time must be after verified start time';
    END IF;
    IF _span_hours > 24 THEN
      RAISE EXCEPTION 'Verified visit span cannot exceed 24 hours (got % h)', round(_span_hours, 2);
    END IF;
    -- No future clock-out (allow 5-minute clock skew)
    IF _vend_ts > (now() AT TIME ZONE 'UTC') + interval '5 minutes' THEN
      RAISE EXCEPTION 'Verified clock-out cannot be in the future';
    END IF;
  END IF;

  -- Units sanity
  IF NEW.units IS NOT NULL AND NEW.units < 0 THEN
    RAISE EXCEPTION 'Visit units cannot be negative';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_visit_times ON public.visits;
CREATE TRIGGER trg_validate_visit_times
  BEFORE INSERT OR UPDATE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.validate_visit_times();

-- ---------- claim_lines ----------
CREATE OR REPLACE FUNCTION public.validate_claim_line_amounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.units IS NULL OR NEW.units < 0 THEN
    RAISE EXCEPTION 'Claim line units cannot be negative';
  END IF;
  IF NEW.unit_rate IS NULL OR NEW.unit_rate < 0 THEN
    RAISE EXCEPTION 'Claim line unit_rate cannot be negative';
  END IF;
  IF NEW.charge IS NULL OR NEW.charge < 0 THEN
    RAISE EXCEPTION 'Claim line charge cannot be negative';
  END IF;
  IF NEW.paid IS NOT NULL AND NEW.paid < 0 THEN
    RAISE EXCEPTION 'Claim line paid amount cannot be negative';
  END IF;
  IF NEW.service_date IS NULL THEN
    RAISE EXCEPTION 'Claim line service_date is required';
  END IF;
  IF NEW.service_date > current_date + 1 THEN
    RAISE EXCEPTION 'Claim line service_date cannot be in the future';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_claim_line_amounts ON public.claim_lines;
CREATE TRIGGER trg_validate_claim_line_amounts
  BEFORE INSERT OR UPDATE ON public.claim_lines
  FOR EACH ROW EXECUTE FUNCTION public.validate_claim_line_amounts();

-- ---------- claims (header) ----------
CREATE OR REPLACE FUNCTION public.validate_claim_amounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.total_charge IS NOT NULL AND NEW.total_charge < 0 THEN
    RAISE EXCEPTION 'Claim total_charge cannot be negative';
  END IF;
  IF NEW.total_paid IS NOT NULL AND NEW.total_paid < 0 THEN
    RAISE EXCEPTION 'Claim total_paid cannot be negative';
  END IF;
  IF NEW.total_adjusted IS NOT NULL AND NEW.total_adjusted < 0 THEN
    RAISE EXCEPTION 'Claim total_adjusted cannot be negative';
  END IF;
  IF NEW.service_start IS NOT NULL AND NEW.service_end IS NOT NULL
     AND NEW.service_end < NEW.service_start THEN
    RAISE EXCEPTION 'Claim service_end must be on or after service_start';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_claim_amounts ON public.claims;
CREATE TRIGGER trg_validate_claim_amounts
  BEFORE INSERT OR UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.validate_claim_amounts();