
-- Notify superadmins on new support ticket messages
CREATE OR REPLACE FUNCTION public.notify_superadmins_on_ticket_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ticket public.support_tickets%ROWTYPE;
  _author_name text;
BEGIN
  SELECT * INTO _ticket FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF _ticket.id IS NULL THEN RETURN NEW; END IF;

  -- Don't notify when a superadmin themselves replies
  IF public.has_role(NEW.author_id, 'superadmin') THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO _author_name FROM public.profiles WHERE id = NEW.author_id;

  INSERT INTO public.notifications (user_id, title, body, category, link)
  SELECT ur.user_id,
         'New support message: ' || COALESCE(_ticket.subject, 'Ticket'),
         COALESCE(_author_name, 'A user') || ' replied: ' || left(NEW.body, 140),
         'support',
         '/?module=supportinbox&ticket=' || _ticket.id::text
  FROM public.user_roles ur
  WHERE ur.role = 'superadmin';
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_superadmins_on_ticket_message ON public.support_ticket_messages;
CREATE TRIGGER trg_notify_superadmins_on_ticket_message
AFTER INSERT ON public.support_ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_superadmins_on_ticket_message();

-- Notify superadmins when a new support ticket is created
CREATE OR REPLACE FUNCTION public.notify_superadmins_on_new_ticket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, category, link)
  SELECT ur.user_id,
         'New support ticket: ' || COALESCE(NEW.subject, '(no subject)'),
         'Priority: ' || COALESCE(NEW.priority, 'normal') || ' · Category: ' || COALESCE(NEW.category, 'general'),
         'support',
         '/?module=supportinbox&ticket=' || NEW.id::text
  FROM public.user_roles ur
  WHERE ur.role = 'superadmin';
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_superadmins_on_new_ticket ON public.support_tickets;
CREATE TRIGGER trg_notify_superadmins_on_new_ticket
AFTER INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.notify_superadmins_on_new_ticket();

-- Notify superadmins on ticket status changes
CREATE OR REPLACE FUNCTION public.notify_superadmins_on_ticket_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, title, body, category, link)
    SELECT ur.user_id,
           'Ticket status: ' || OLD.status || ' → ' || NEW.status,
           COALESCE(NEW.subject, 'Ticket'),
           'support',
           '/?module=supportinbox&ticket=' || NEW.id::text
    FROM public.user_roles ur
    WHERE ur.role = 'superadmin'
      AND ur.user_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_superadmins_on_ticket_status ON public.support_tickets;
CREATE TRIGGER trg_notify_superadmins_on_ticket_status
AFTER UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.notify_superadmins_on_ticket_status();
