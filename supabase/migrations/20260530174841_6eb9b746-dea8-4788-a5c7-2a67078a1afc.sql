
-- Superadmin cross-company access to support tickets and messages
CREATE POLICY "Superadmin view all tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmin update all tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmin view all ticket messages"
  ON public.support_ticket_messages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmin post on any ticket"
  ON public.support_ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id AND public.has_role(auth.uid(), 'superadmin'));
