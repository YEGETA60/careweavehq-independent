CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.contact_messages TO anon;
GRANT INSERT ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a contact message (public contact form)
CREATE POLICY "Anyone can submit a contact message"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(name)) > 0
  AND length(name) <= 200
  AND length(trim(email)) > 0
  AND length(email) <= 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(trim(message)) > 0
  AND length(message) <= 5000
  AND (phone IS NULL OR length(phone) <= 50)
);

-- Only admins can read submitted messages
CREATE POLICY "Admins can read contact messages"
ON public.contact_messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_contact_messages_created_at ON public.contact_messages (created_at DESC);