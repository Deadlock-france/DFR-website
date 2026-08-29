-- Candidatures staff / partenaire / autre.
-- Insert + lecture auteur via RLS ; review admin via service_role.

create table public.site_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null
    check (type in ('staff', 'partner', 'other')),
  subject text not null
    check (char_length(trim(subject)) between 3 and 120),
  body text not null
    check (char_length(trim(body)) between 20 and 8000),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  admin_note text not null default '',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index site_applications_status_created_idx
  on public.site_applications (status, created_at desc);

create unique index site_applications_one_pending_per_type
  on public.site_applications (user_id, type)
  where status = 'pending';

comment on table public.site_applications is
  'Candidatures site (staff / partenaire / autre). Review via service_role après requireAdmin.';

alter table public.site_applications enable row level security;

create policy site_applications_select_own
  on public.site_applications
  for select
  to authenticated
  using (user_id = auth.uid());

create policy site_applications_insert_own
  on public.site_applications
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and admin_note = ''
    and reviewed_by is null
    and reviewed_at is null
  );

revoke update, delete on table public.site_applications from anon, authenticated;
grant select, insert on table public.site_applications to authenticated;
grant all on table public.site_applications to service_role;
