-- Bans Discord (ingest bot) + demandes de déban.

create table public.discord_bans (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null
    check (discord_id ~ '^[0-9]{5,32}$'),
  reason text not null default '',
  banned_at timestamptz not null default now(),
  banned_by_label text,
  source text not null default 'bot'
    check (source in ('bot')),
  active boolean not null default true,
  lifted_at timestamptz,
  lift_source text
    check (lift_source is null or lift_source in ('admin_accept', 'bot')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index discord_bans_one_active_per_discord
  on public.discord_bans (discord_id)
  where active = true;

create index discord_bans_discord_id_idx
  on public.discord_bans (discord_id);

comment on table public.discord_bans is
  'Bans Discord poussés par le bot (ingest). Lecture user via RLS ; écriture service_role.';

alter table public.discord_bans enable row level security;

create policy discord_bans_select_own
  on public.discord_bans
  for select
  to authenticated
  using (
    discord_id = (
      select p.discord_id
      from public.profiles p
      where p.id = auth.uid()
    )
  );

revoke insert, update, delete on table public.discord_bans from anon, authenticated;
grant select on table public.discord_bans to authenticated;
grant all on table public.discord_bans to service_role;

create table public.deban_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  discord_id text not null
    check (discord_id ~ '^[0-9]{5,32}$'),
  ban_id uuid not null references public.discord_bans (id) on delete cascade,
  message text not null
    check (char_length(trim(message)) between 20 and 4000),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  admin_note text not null default '',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index deban_requests_one_pending_per_user
  on public.deban_requests (user_id)
  where status = 'pending';

create index deban_requests_status_created_idx
  on public.deban_requests (status, created_at desc);

comment on table public.deban_requests is
  'Demandes de déban. Insert/select auteur via RLS ; review via service_role.';

alter table public.deban_requests enable row level security;

create policy deban_requests_select_own
  on public.deban_requests
  for select
  to authenticated
  using (user_id = auth.uid());

create policy deban_requests_insert_own
  on public.deban_requests
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and admin_note = ''
    and reviewed_by is null
    and reviewed_at is null
  );

revoke update, delete on table public.deban_requests from anon, authenticated;
grant select, insert on table public.deban_requests to authenticated;
grant all on table public.deban_requests to service_role;
