-- Multi-équipes, recherche pg_trgm, invitations, héros préférés, chat d'équipe.

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- team_members : multi-équipes + rôle substitute
-- ---------------------------------------------------------------------------

alter table public.team_members
  drop constraint if exists team_members_one_team_per_player;

alter table public.team_members
  drop constraint if exists team_members_role_check;

alter table public.team_members
  add constraint team_members_role_check
  check (role in ('captain', 'member', 'substitute'));

-- ---------------------------------------------------------------------------
-- profiles.search_text + index trgm
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists search_text text
  generated always as (
    lower(
      coalesce(display_name, '') || ' ' ||
      coalesce(global_name, '') || ' ' ||
      coalesce(username, '')
    )
  ) stored;

create index if not exists profiles_search_trgm_idx
  on public.profiles
  using gin (search_text gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- create_team : autoriser plusieurs équipes
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
-- profile_hero_prefs
-- ---------------------------------------------------------------------------

create table public.profile_hero_prefs (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  priority smallint not null check (priority in (1, 2, 3)),
  hero_id integer not null,
  primary key (profile_id, priority),
  constraint profile_hero_prefs_unique_hero unique (profile_id, hero_id)
);

alter table public.profile_hero_prefs enable row level security;

create policy "profile_hero_prefs_select_authenticated"
  on public.profile_hero_prefs
  for select
  to authenticated
  using (true);

create policy "profile_hero_prefs_insert_own"
  on public.profile_hero_prefs
  for insert
  to authenticated
  with check (auth.uid() = profile_id);

create policy "profile_hero_prefs_update_own"
  on public.profile_hero_prefs
  for update
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "profile_hero_prefs_delete_own"
  on public.profile_hero_prefs
  for delete
  to authenticated
  using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- team_invites
-- ---------------------------------------------------------------------------

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member'
    check (role in ('member', 'substitute')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint team_invites_no_self check (inviter_id <> invitee_id)
);

create unique index team_invites_pending_unique_idx
  on public.team_invites (team_id, invitee_id)
  where status = 'pending';

create index team_invites_invitee_idx
  on public.team_invites (invitee_id, status);

create index team_invites_team_idx
  on public.team_invites (team_id, status);

alter table public.team_invites enable row level security;

create policy "team_invites_select_involved"
  on public.team_invites
  for select
  to authenticated
  using (
    auth.uid() = invitee_id
    or auth.uid() = inviter_id
    or exists (
      select 1 from public.teams t
      where t.id = team_id and t.captain_id = auth.uid()
    )
  );

-- Mutations via RPC security definer uniquement
revoke insert, update, delete on public.team_invites from authenticated, anon;

-- ---------------------------------------------------------------------------
-- team_messages + realtime
-- ---------------------------------------------------------------------------

create table public.team_messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index team_messages_team_created_idx
  on public.team_messages (team_id, created_at desc);

alter table public.team_messages enable row level security;

create policy "team_messages_select_members"
  on public.team_messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_messages.team_id
        and tm.profile_id = auth.uid()
    )
  );

create policy "team_messages_insert_members"
  on public.team_messages
  for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = team_messages.team_id
        and tm.profile_id = auth.uid()
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.team_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- RPC search_players
-- ---------------------------------------------------------------------------

create or replace function public.search_players(
  p_query text,
  p_team_id uuid default null,
  p_limit int default 20
)
returns table (
  id uuid,
  display_name text,
  global_name text,
  username text,
  avatar_url text,
  team_tags text[],
  hero_ids int[],
  score real
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  q text := lower(trim(p_query));
  lim int := least(greatest(coalesce(p_limit, 20), 1), 20);
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if q is null or char_length(q) < 2 then
    return;
  end if;

  if p_team_id is not null then
    if not exists (
      select 1 from public.teams t
      where t.id = p_team_id and t.captain_id = uid
    ) then
      raise exception 'not team captain';
    end if;
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.global_name,
    p.username,
    p.avatar_url,
    coalesce(
      (
        select array_agg(t.tag order by t.tag)
        from public.team_members tm
        join public.teams t on t.id = tm.team_id
        where tm.profile_id = p.id
      ),
      '{}'::text[]
    ) as team_tags,
    coalesce(
      (
        select array_agg(php.hero_id order by php.priority)
        from public.profile_hero_prefs php
        where php.profile_id = p.id
      ),
      '{}'::int[]
    ) as hero_ids,
    similarity(p.search_text, q) as score
  from public.profiles p
  where p.id <> uid
    and (
      p.search_text % q
      or p.search_text like q || '%'
      or p.search_text like '% ' || q || '%'
    )
    and (
      p_team_id is null
      or not exists (
        select 1 from public.team_members tm
        where tm.team_id = p_team_id and tm.profile_id = p.id
      )
    )
  order by
    similarity(p.search_text, q) desc,
    p.username asc nulls last
  limit lim;
end;
$$;

revoke all on function public.search_players(text, uuid, int) from public;
grant execute on function public.search_players(text, uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC invite_to_team
-- ---------------------------------------------------------------------------

create or replace function public.invite_to_team(
  p_team_id uuid,
  p_invitee_id uuid,
  p_role text default 'member'
)
returns public.team_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  clean_role text := coalesce(nullif(trim(p_role), ''), 'member');
  invite public.team_invites;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if clean_role not in ('member', 'substitute') then
    raise exception 'invalid role';
  end if;

  if p_invitee_id = uid then
    raise exception 'cannot invite self';
  end if;

  if not exists (
    select 1 from public.teams t
    where t.id = p_team_id and t.captain_id = uid
  ) then
    raise exception 'not team captain';
  end if;

  if not exists (select 1 from public.profiles where id = p_invitee_id) then
    raise exception 'invitee missing';
  end if;

  if exists (
    select 1 from public.team_members
    where team_id = p_team_id and profile_id = p_invitee_id
  ) then
    raise exception 'already member';
  end if;

  if exists (
    select 1 from public.team_invites
    where team_id = p_team_id
      and invitee_id = p_invitee_id
      and status = 'pending'
  ) then
    raise exception 'invite already pending';
  end if;

  insert into public.team_invites (team_id, inviter_id, invitee_id, role, status)
  values (p_team_id, uid, p_invitee_id, clean_role, 'pending')
  returning * into invite;

  return invite;
end;
$$;

revoke all on function public.invite_to_team(uuid, uuid, text) from public;
grant execute on function public.invite_to_team(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC respond_to_team_invite
-- ---------------------------------------------------------------------------

create or replace function public.respond_to_team_invite(
  p_invite_id uuid,
  p_accept boolean
)
returns public.team_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  invite public.team_invites;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into invite
  from public.team_invites
  where id = p_invite_id
  for update;

  if not found then
    raise exception 'invite not found';
  end if;

  if invite.invitee_id <> uid then
    raise exception 'not invitee';
  end if;

  if invite.status <> 'pending' then
    raise exception 'invite not pending';
  end if;

  if p_accept then
    if exists (
      select 1 from public.team_members
      where team_id = invite.team_id and profile_id = uid
    ) then
      update public.team_invites
      set status = 'cancelled'
      where id = invite.id
      returning * into invite;
      raise exception 'already member';
    end if;

    insert into public.team_members (team_id, profile_id, role)
    values (invite.team_id, uid, invite.role);

    update public.team_invites
    set status = 'accepted'
    where id = invite.id
    returning * into invite;
  else
    update public.team_invites
    set status = 'declined'
    where id = invite.id
    returning * into invite;
  end if;

  return invite;
end;
$$;

revoke all on function public.respond_to_team_invite(uuid, boolean) from public;
grant execute on function public.respond_to_team_invite(uuid, boolean) to authenticated;
