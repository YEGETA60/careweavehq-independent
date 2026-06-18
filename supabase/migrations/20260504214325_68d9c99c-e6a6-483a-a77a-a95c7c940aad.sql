
-- Roles enum
create type public.app_role as enum ('admin', 'scheduler', 'caregiver', 'billing');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  caregiver_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create or replace function public.current_user_has_any_role(_roles app_role[])
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.user_roles where user_id=auth.uid() and role = any(_roles)) $$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.phone);
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  emergency_contact text,
  care_level text not null default 'Medium',
  hourly_rate numeric not null default 25,
  status text not null default 'Active',
  care_plan text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.clients enable row level security;
create trigger clients_updated before update on public.clients for each row execute function public.set_updated_at();

-- Caregivers
create table public.caregivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text,
  skills text[] default '{}',
  hourly_wage numeric not null default 16,
  status text not null default 'Available',
  certifications text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.caregivers enable row level security;
create trigger caregivers_updated before update on public.caregivers for each row execute function public.set_updated_at();

-- Visits
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  caregiver_id uuid not null references public.caregivers(id) on delete restrict,
  date date not null,
  start_time text not null,
  end_time text not null,
  status text not null default 'Scheduled',
  notes text,
  tasks_completed text[] default '{}',
  verified_start_time text,
  verified_end_time text,
  clock_in_lat numeric,
  clock_in_lng numeric,
  clock_out_lat numeric,
  clock_out_lng numeric,
  verification_status text default 'Unverified',
  verification_issues text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.visits enable row level security;
create trigger visits_updated before update on public.visits for each row execute function public.set_updated_at();

-- Invoices
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  amount numeric not null default 0,
  hours numeric not null default 0,
  status text not null default 'Pending',
  due_date date not null,
  visit_ids uuid[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.invoices enable row level security;
create trigger invoices_updated before update on public.invoices for each row execute function public.set_updated_at();

-- Intakes
create table public.intakes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.intakes enable row level security;
create trigger intakes_updated before update on public.intakes for each row execute function public.set_updated_at();

-- Audit log
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;

-- ============= POLICIES =============

-- profiles
create policy "view own or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "admin update profiles" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- user_roles: only admins manage; anyone can read their own
create policy "view own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- clients
create policy "staff view clients" on public.clients for select to authenticated
  using (
    public.current_user_has_any_role(array['admin','scheduler','billing']::app_role[])
    or exists (
      select 1 from public.visits v
      join public.caregivers c on c.id = v.caregiver_id
      where v.client_id = clients.id and c.user_id = auth.uid()
    )
  );
create policy "scheduler manage clients" on public.clients for insert to authenticated
  with check (public.current_user_has_any_role(array['admin','scheduler']::app_role[]));
create policy "scheduler update clients" on public.clients for update to authenticated
  using (public.current_user_has_any_role(array['admin','scheduler']::app_role[]));
create policy "admin delete clients" on public.clients for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- caregivers
create policy "staff view caregivers" on public.caregivers for select to authenticated
  using (
    public.current_user_has_any_role(array['admin','scheduler','billing']::app_role[])
    or user_id = auth.uid()
  );
create policy "scheduler insert caregivers" on public.caregivers for insert to authenticated
  with check (public.current_user_has_any_role(array['admin','scheduler']::app_role[]));
create policy "scheduler update caregivers" on public.caregivers for update to authenticated
  using (public.current_user_has_any_role(array['admin','scheduler']::app_role[]));
create policy "admin delete caregivers" on public.caregivers for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- visits
create policy "staff view visits" on public.visits for select to authenticated
  using (
    public.current_user_has_any_role(array['admin','scheduler','billing']::app_role[])
    or exists (select 1 from public.caregivers c where c.id = visits.caregiver_id and c.user_id = auth.uid())
  );
create policy "scheduler insert visits" on public.visits for insert to authenticated
  with check (public.current_user_has_any_role(array['admin','scheduler']::app_role[]));
create policy "update visits" on public.visits for update to authenticated
  using (
    public.current_user_has_any_role(array['admin','scheduler']::app_role[])
    or exists (select 1 from public.caregivers c where c.id = visits.caregiver_id and c.user_id = auth.uid())
  );
create policy "admin delete visits" on public.visits for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- invoices
create policy "billing view invoices" on public.invoices for select to authenticated
  using (public.current_user_has_any_role(array['admin','billing','scheduler']::app_role[]));
create policy "billing manage invoices" on public.invoices for insert to authenticated
  with check (public.current_user_has_any_role(array['admin','billing']::app_role[]));
create policy "billing update invoices" on public.invoices for update to authenticated
  using (public.current_user_has_any_role(array['admin','billing']::app_role[]));
create policy "admin delete invoices" on public.invoices for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- intakes
create policy "staff view intakes" on public.intakes for select to authenticated
  using (public.current_user_has_any_role(array['admin','scheduler']::app_role[]));
create policy "staff insert intakes" on public.intakes for insert to authenticated
  with check (public.current_user_has_any_role(array['admin','scheduler']::app_role[]));
create policy "staff update intakes" on public.intakes for update to authenticated
  using (public.current_user_has_any_role(array['admin','scheduler']::app_role[]));
create policy "admin delete intakes" on public.intakes for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- audit log
create policy "admin view audit" on public.audit_log for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "auth insert audit" on public.audit_log for insert to authenticated
  with check (user_id = auth.uid());
