
-- Private bucket for message attachments
insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', false)
on conflict (id) do nothing;

-- Tracking table
create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  uploader_id uuid not null,
  recipient_id uuid not null,
  storage_path text not null unique,
  file_name text not null,
  redacted_filename text,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_msg_attachments_message on public.message_attachments(message_id);
create index if not exists idx_msg_attachments_uploader on public.message_attachments(uploader_id);
create index if not exists idx_msg_attachments_recipient on public.message_attachments(recipient_id);

alter table public.message_attachments enable row level security;

create policy "view attachments to/from me"
on public.message_attachments for select
to authenticated
using (uploader_id = auth.uid() or recipient_id = auth.uid());

create policy "upload my attachments"
on public.message_attachments for insert
to authenticated
with check (
  uploader_id = auth.uid()
  and exists (
    select 1 from public.messages m
    where m.id = message_id
      and m.sender_id = auth.uid()
      and m.recipient_id = recipient_id
  )
  and size_bytes <= 26214400  -- 25 MB cap
);

create policy "delete own attachments"
on public.message_attachments for delete
to authenticated
using (uploader_id = auth.uid() or has_role(auth.uid(), 'admin'::app_role));

-- PHI filename guard
create or replace function public.reject_phi_in_attachment_filename()
returns trigger
language plpgsql
set search_path = public
as $$
declare v text := coalesce(new.file_name, '');
begin
  if v ~ '\m\d{3}-\d{2}-\d{4}\M' or v ~ '\m\d{9}\M' then
    raise exception 'PHI_BLOCKED:SSN — filename contains a possible SSN';
  end if;
  if v ~* '\mMRN[:#_\s-]*\d{4,}' then
    raise exception 'PHI_BLOCKED:MRN — filename contains a possible MRN';
  end if;
  if v ~* '\m(DOB|date[_\s-]of[_\s-]birth|bornon)\M' then
    raise exception 'PHI_BLOCKED:DOB — filename contains a possible DOB';
  end if;
  if v ~ '\m(0?[1-9]|1[0-2])[\/\-_](0?[1-9]|[12]\d|3[01])[\/\-_](19|20)\d{2}\M' then
    raise exception 'PHI_BLOCKED:DOB — filename contains a possible date of birth';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reject_phi_attachment on public.message_attachments;
create trigger trg_reject_phi_attachment
before insert or update on public.message_attachments
for each row execute function public.reject_phi_in_attachment_filename();

-- Storage RLS: only sender/recipient can access. Path layout: <message_id>/<uuid>-<filename>
create policy "msg attach select by participants"
on storage.objects for select
to authenticated
using (
  bucket_id = 'message-attachments'
  and exists (
    select 1 from public.message_attachments a
    where a.storage_path = storage.objects.name
      and (a.uploader_id = auth.uid() or a.recipient_id = auth.uid())
  )
);

create policy "msg attach insert by uploader"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'message-attachments'
  and owner = auth.uid()
);

create policy "msg attach delete by uploader or admin"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'message-attachments'
  and (
    owner = auth.uid()
    or has_role(auth.uid(), 'admin'::app_role)
  )
);
