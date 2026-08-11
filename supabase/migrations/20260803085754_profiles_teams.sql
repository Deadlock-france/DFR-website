-- Profils joueurs (1:1 avec auth.users), équipes et memberships.
-- RLS activé partout. Un joueur = au plus une équipe (v1).

create extension if not exists "pgcrypto";

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  discord_id text unique,
  username text,
  global_name text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_username_idx on public.profiles (username);

alter table public.profiles enable row level security;

create policy "profiles_select_authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text not null,
  captain_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_tag_format check (tag ~ '^[A-Za-z0-9]{2,5}$'),
  constraint teams_name_length check (char_length(trim(name)) between 2 and 40)
);

create unique index teams_tag_unique_idx on public.teams (lower(tag));

alter table public.teams enable row level security;

create policy "teams_select_authenticated"
  on public.teams
  for select
  to authenticated
  using (true);

create policy "teams_insert_authenticated"
  on public.teams
  for insert
  to authenticated
  with check (auth.uid() = captain_id);

create policy "teams_update_captain"
  on public.teams
  for update
  to authenticated
  using (auth.uid() = captain_id)
  with check (auth.uid() = captain_id);

create policy "teams_delete_captain"
  on public.teams
  for delete
  to authenticated
  using (auth.uid() = captain_id);

-- ---------------------------------------------------------------------------
-- team_members
-- ---------------------------------------------------------------------------

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('captain', 'member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, profile_id),
  constraint team_members_one_team_per_player unique (profile_id)
);

create index team_members_profile_idx on public.team_members (profile_id);

alter table public.team_members enable row level security;

create policy "team_members_select_authenticated"
  on public.team_members
  for select
  to authenticated
  using (true);

create policy "team_members_insert_self"
  on public.team_members
  for insert
  to authenticated
  with check (auth.uid() = profile_id);

create policy "team_members_delete_self_or_captain"
  on public.team_members
  for delete
  to authenticated
  using (
    auth.uid() = profile_id
    or exists (
      select 1
      from public.teams t
      where t.id = team_id
        and t.captain_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Trigger profil depuis auth.users (métadonnées Discord)
-- ---------------------------------------------------------------------------

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  discord_id text;
  username text;
  global_name text;
  avatar_url text;
begin
  discord_id := coalesce(
    meta ->> 'provider_id',
    meta ->> 'sub',
    new.id::text
  );

  username := coalesce(
    meta ->> 'preferred_username',
    meta ->> 'user_name',
    meta ->> 'name',
    'joueur'
  );

  global_name := coalesce(
    meta ->> 'full_name',
    meta ->> 'name',
    username
  );

  avatar_url := coalesce(
    meta ->> 'avatar_url',
    meta ->> 'picture'
  );

  insert into public.profiles (id, discord_id, username, global_name, avatar_url)
  values (new.id, discord_id, username, global_name, avatar_url)
  on conflict (id) do update
    set
      discord_id = excluded.discord_id,
      username = excluded.username,
      global_name = excluded.global_name,
      avatar_url = excluded.avatar_url,
      updated_at = now();

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- RPC create_team
-- ---------------------------------------------------------------------------

create or replace function public.create_team(p_name text, p_tag text)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  clean_name text := trim(p_name);
  clean_tag text := upper(trim(p_tag));
  new_team public.teams;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if clean_name is null or char_length(clean_name) < 2 or char_length(clean_name) > 40 then
    raise exception 'invalid team name';
  end if;

  if clean_tag is null or clean_tag !~ '^[A-Z0-9]{2,5}$' then
    raise exception 'invalid team tag';
  end if;

  if exists (select 1 from public.team_members where profile_id = uid) then
    raise exception 'already in a team';
  end if;

  if not exists (select 1 from public.profiles where id = uid) then
    raise exception 'profile missing';
  end if;

  insert into public.teams (name, tag, captain_id)
  values (clean_name, clean_tag, uid)
  returning * into new_team;

  insert into public.team_members (team_id, profile_id, role)
  values (new_team.id, uid, 'captain');

  return new_team;
end;
$$;

revoke all on function public.create_team(text, text) from public;
grant execute on function public.create_team(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function private.set_updated_at();

create trigger teams_set_updated_at
  before update on public.teams
  for each row
  execute function private.set_updated_at();
