
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_pair ON public.messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX idx_messages_recipient ON public.messages (recipient_id, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

CREATE OR REPLACE FUNCTION public.user_can_message(_recipient uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    -- managers can message anyone
    public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[])
    -- or recipient is a manager/supervisor
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _recipient
               AND ur.role = ANY(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]))
    -- or recipient previously messaged me
    OR EXISTS (SELECT 1 FROM public.messages m WHERE m.sender_id = _recipient AND m.recipient_id = auth.uid())
$$;

CREATE POLICY "view own messages" ON public.messages FOR SELECT TO authenticated
USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "send messages" ON public.messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.user_can_message(recipient_id));

CREATE POLICY "mark read" ON public.messages FOR UPDATE TO authenticated
USING (recipient_id = auth.uid());

CREATE POLICY "admin delete messages" ON public.messages FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
