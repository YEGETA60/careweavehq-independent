
-- Payers
create table public.payers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  payer_type text not null default 'Private',
  payer_id_external text,
  contact_phone text,
  contact_email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payers enable row level security;
create trigger payers_updated before update on public.payers for each row execute function public.set_updated_at();

-- Authorizations
create table public.authorizations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  payer_id uuid not null references public.payers(id) on delete restrict,
  auth_number text not null,
  service_code text,
  units_approved numeric not null default 0,
  unit_minutes integer not null default 60,
  hourly_rate numeric,
  start_date date not null,
  end_date date not null,
  status text not null default 'Active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.authorizations enable row level security;
create trigger authorizations_updated before update on public.authorizations for each row execute function public.set_updated_at();
create index on public.authorizations(client_id);

-- Care plans
create table public.care_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  diagnosis text,
  goals text,
  tasks text[] default '{}',
  frequency text,
  start_date date,
  review_date date,
  physician text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.care_plans enable row level security;
create trigger care_plans_updated before update on public.care_plans for each row execute function public.set_updated_at();

-- Visit notes (SOAP)
create table public.visit_notes (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  subjective text,
  objective text,
  assessment text,
  plan text,
  vitals jsonb default '{}'::jsonb,
  incident boolean not null default false,
  incident_details text,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.visit_notes enable row level security;
create trigger visit_notes_updated before update on public.visit_notes for each row execute function public.set_updated_at();

-- Credentials
create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.caregivers(id) on delete cascade,
  type text not null,
  number text,
  issuer text,
  issued_date date,
  expiry_date date,
  document_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.credentials enable row level security;
create trigger credentials_updated before update on public.credentials for each row execute function public.set_updated_at();
create index on public.credentials(expiry_date);

-- Visit series (recurring)
create table public.visit_series (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  caregiver_id uuid not null references public.caregivers(id) on delete restrict,
  authorization_id uuid references public.authorizations(id) on delete set null,
  start_date date not null,
  end_date date not null,
  start_time text not null,
  end_time text not null,
  days_of_week int[] not null default '{}',
  frequency text not null default 'weekly',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.visit_series enable row level security;
create trigger visit_series_updated before update on public.visit_series for each row execute function public.set_updated_at();

-- Extend visits
alter table public.visits
  add column if not exists payer_id uuid references public.payers(id) on delete set null,
  add column if not exists authorization_id uuid references public.authorizations(id) on delete set null,
  add column if not exists units numeric,
  add column if not exists series_id uuid references public.visit_series(id) on delete set null;

-- =============== POLICIES ===============

-- payers
create policy "staff view payers" on public.payers for select to authenticated
  using (public.current_user_has_any_role(array['admin','scheduler','billing']::app_role[]));
create policy "billing insert payers" on public.payers for insert to authenticated
  with check (public.current_user_has_any_role(array['admin','billing']::app_role[]));
create policy "billing update payers" on public.payers for update to authenticated
  using (public.current_user_has_any_role(array['admin','billing']::app_role[]));
create policy "admin delete payers" on public.payers for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- authorizations
create policy "staff view auths" on public.authorizations for select to authenticated
  using (public.current_user_has_any_role(array['admin','scheduler','billing']::app_role[]));
create policy "billing insert auths" on public.authorizations for insert to authenticated
  with check (public.current_user_has_any_role(array['admin','billing','scheduler']::app_role[]));
create policy "billing update auths" on public.authorizations for update to authenticated
  using (public.current_user_has_any_role(array['admin','billing','scheduler']::app_role[]));
create policy "admin delete auths" on public.authorizations for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- care_plans
create policy "view care plans" on public.care_plans for select to authenticated
  using (
    public.current_user_has_any_role(array['admin','scheduler','billing']::app_role[])
    or exists (
      select 1 from public.visits v
      join public.caregivers c on c.id = v.caregiver_id
      where v.client_id = care_plans.client_id and c.user_id = auth.uid()
    )
  );
create policy "scheduler insert care plans" on public.care_plans for insert to authenticated
  with check (public.current_user_has_any_role(array['admin','scheduler']::app_role[]));
create policy "scheduler update care plans" on public.care_plans for update to authenticated
  using (public.current_user_has_any_role(array['admin','scheduler']::app_role[]));
create policy "admin delete care plans" on public.care_plans for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- visit_notes
create policy "view visit notes" on public.visit_notes for select to authenticated
  using (
    public.current_user_has_any_role(array['admin','scheduler','billing']::app_role[])
    or exists (
      select 1 from public.visits v
      join public.caregivers c on c.id = v.caregiver_id
      where v.id = visit_notes.visit_id and c.user_id = auth.uid()
    )
  );
create policy "insert visit notes" on public.visit_notes for insert to authenticated
  with check (
    public.current_user_has_any_role(array['admin','scheduler']::app_role[])
    or exists (
      select 1 from public.visits v
      join public.caregivers c on c.id = v.caregiver_id
      where v.id = visit_notes.visit_id and c.user_id = auth.uid()
    )
  );
create policy "update visit notes" on public.visit_notes for update to authenticated
  using (
    public.current_user_has_any_role(array['admin','scheduler']::app_role[])
    or author_id = auth.uid()
  );
create policy "admin delete visit notes" on public.visit_notes for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- credentials
create policy "view credentials" on public.credentials for select to authenticated
  using (
    public.current_user_has_any_role(array['admin','scheduler','billing']::app_role[])
    or exists (select 1 from public.caregivers c where c.id = credentials.caregiver_id and c.user_id = auth.uid())
  );
create policy "scheduler insert credentials" on public.credentials for insert to authenticated
  with check (public.current_user_has_any_role(array['admin','scheduler']::app_role[]));
create policy "scheduler update credentials" on public.credentials for update to authenticated
  using (public.current_user_has_any_role(array['admin','scheduler']::app_role[]));
create policy "admin delete credentials" on public.credentials for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- visit_series
create policy "view series" on public.visit_series for select to authenticated
  using (public.current_user_has_any_role(array['admin','scheduler','billing']::app_role[]));
create policy "scheduler insert series" on public.visit_series for insert to authenticated
  with check (public.current_user_has_any_role(array['admin','scheduler']::app_role[]));
create policy "scheduler update series" on public.visit_series for update to authenticated
  using (public.current_user_has_any_role(array['admin','scheduler']::app_role[]));
create policy "admin delete series" on public.visit_series for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- =============== Authorization usage view + RPC ===============

create or replace function public.authorization_units_used(_auth_id uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(
    case
      when v.verification_status in ('Verified','Manual-Override') and v.status = 'Completed'
      then extract(epoch from (
        ('1970-01-01 ' || coalesce(v.verified_end_time, v.end_time))::timestamp
        - ('1970-01-01 ' || coalesce(v.verified_start_time, v.start_time))::timestamp
      )) / 60.0 / nullif((select unit_minutes from public.authorizations where id = _auth_id), 0)
      else 0
    end
  ), 0)
  from public.visits v
  where v.authorization_id = _auth_id
$$;
revoke execute on function public.authorization_units_used(uuid) from public, anon;
grant execute on function public.authorization_units_used(uuid) to authenticated;

-- =============== Admin user listing RPC ===============
create or replace function public.list_users_with_roles()
returns table(user_id uuid, email text, full_name text, phone text, roles app_role[], created_at timestamptz)
language sql stable security definer set search_path = public, auth
as $$
  select
    u.id as user_id,
    u.email::text,
    p.full_name,
    p.phone,
    coalesce(array_agg(ur.role) filter (where ur.role is not null), '{}') as roles,
    u.created_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.user_roles ur on ur.user_id = u.id
  where public.has_role(auth.uid(), 'admin')
  group by u.id, u.email, p.full_name, p.phone, u.created_at
  order by u.created_at desc
$$;
revoke execute on function public.list_users_with_roles() from public, anon;
grant execute on function public.list_users_with_roles() to authenticated;
