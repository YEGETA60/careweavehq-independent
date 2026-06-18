
CREATE OR REPLACE FUNCTION public.caregiver_today_visits()
RETURNS TABLE (
  id uuid,
  date date,
  start_time text,
  end_time text,
  status text,
  verified_start_time text,
  verified_end_time text,
  verification_status text,
  tasks_completed text[],
  client_id uuid,
  client_name text,
  client_address text,
  client_phone text,
  client_lat numeric,
  client_lng numeric,
  client_geofence_meters integer,
  care_plan text[]
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.id, v.date, v.start_time, v.end_time, v.status,
    v.verified_start_time, v.verified_end_time, v.verification_status,
    v.tasks_completed,
    c.id, c.name, c.address, c.phone, c.lat, c.lng, c.geofence_meters,
    c.care_plan
  FROM public.visits v
  JOIN public.clients c ON c.id = v.client_id
  JOIN public.caregivers cg ON cg.id = v.caregiver_id
  WHERE cg.user_id = auth.uid()
    AND v.date = current_date
  ORDER BY v.start_time;
$$;
