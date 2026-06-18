
CREATE TABLE public.training_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  user_id uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  due_date date,
  notes text,
  UNIQUE (course_id, user_id)
);

ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view assignments"
ON public.training_assignments FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor','scheduler']::app_role[])
);

CREATE POLICY "manage assignments insert"
ON public.training_assignments FOR INSERT TO authenticated
WITH CHECK (
  public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor','scheduler']::app_role[])
);

CREATE POLICY "manage assignments update"
ON public.training_assignments FOR UPDATE TO authenticated
USING (
  public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor','scheduler']::app_role[])
);

CREATE POLICY "manage assignments delete"
ON public.training_assignments FOR DELETE TO authenticated
USING (
  public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[])
);

CREATE INDEX idx_training_assignments_user ON public.training_assignments(user_id);
CREATE INDEX idx_training_assignments_course ON public.training_assignments(course_id);
