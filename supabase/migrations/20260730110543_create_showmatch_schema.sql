-- Showmatch schema: players, events, matches, teams, participants
-- + Discord auth link trigger + profile history view + RLS

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------------

create table public.players (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null,
  auth_user_id uuid unique references auth.users (id) on delete set null,
  discord_username text not null,
  display_name text not null,
  avatar_url text,
  bio text,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_discord_id_key unique (discord_id)
);

create trigger players_set_updated_at
before update on public.players
for each row
execute function public.set_updated_at();

-- Preserve claimed profile fields when updated by bot / non-owner.
-- Owner (auth.uid() = auth_user_id) may edit display_name, bio, avatar_url.
create or replace function public.enforce_claimed_player_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.claimed_at is null then
    return new;
  end if;

  -- Owner editing their profile
  if auth.uid() is not null and auth.uid() = old.auth_user_id then
    new.discord_id := old.discord_id;
    new.auth_user_id := old.auth_user_id;
    new.claimed_at := old.claimed_at;
    return new;
  end if;

  -- Bot / other writers: keep identity + user-facing profile fields
  new.discord_id := old.discord_id;
  new.auth_user_id := old.auth_user_id;
  new.claimed_at := old.claimed_at;
  new.display_name := old.display_name;
  new.bio := old.bio;
  if old.avatar_url is not null then
    new.avatar_url := old.avatar_url;
  end if;

  return new;
end;
$$;

create trigger players_enforce_claimed_fields
before update on public.players
for each row
execute function public.enforce_claimed_player_fields();

-- ---------------------------------------------------------------------------
-- showmatch_events
-- ---------------------------------------------------------------------------

create table public.showmatch_events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  title text,
  created_at timestamptz not null default now(),
  constraint showmatch_events_event_date_key unique (event_date)
);

create index idx_showmatch_events_date
  on public.showmatch_events (event_date desc);

-- ---------------------------------------------------------------------------
-- showmatches (winner_team_id FK added after showmatch_teams)
-- ---------------------------------------------------------------------------

create table public.showmatches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.showmatch_events (id) on delete cascade,
  played_at timestamptz not null,
  deadlock_match_id text not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  total_kills integer not null default 0 check (total_kills >= 0),
  total_souls integer not null default 0 check (total_souls >= 0),
  mvp_player_id uuid references public.players (id) on delete set null,
  winner_team_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint showmatches_deadlock_match_id_key unique (deadlock_match_id)
);

create index idx_showmatches_event_played
  on public.showmatches (event_id, played_at);

create index idx_showmatches_played_at
  on public.showmatches (played_at desc);

create trigger showmatches_set_updated_at
before update on public.showmatches
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- showmatch_teams
-- ---------------------------------------------------------------------------

create table public.showmatch_teams (
  id uuid primary key default gen_random_uuid(),
  showmatch_id uuid not null references public.showmatches (id) on delete cascade,
  name text not null,
  side smallint not null check (side in (1, 2)),
  captain_player_id uuid references public.players (id) on delete set null,
  avg_rank numeric,
  is_winner boolean not null default false,
  constraint showmatch_teams_showmatch_side_key unique (showmatch_id, side),
  constraint showmatch_teams_showmatch_name_key unique (showmatch_id, name)
);

create index idx_showmatch_teams_captain
  on public.showmatch_teams (captain_player_id);

alter table public.showmatches
  add constraint showmatches_winner_team_id_fkey
  foreign key (winner_team_id)
  references public.showmatch_teams (id)
  on delete set null;

-- ---------------------------------------------------------------------------
-- showmatch_participants
-- ---------------------------------------------------------------------------

create table public.showmatch_participants (
  id uuid primary key default gen_random_uuid(),
  showmatch_id uuid not null references public.showmatches (id) on delete cascade,
  team_id uuid not null references public.showmatch_teams (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete restrict,
  hero_id integer not null,
  net_worth integer not null default 0 check (net_worth >= 0),
  damage integer not null default 0 check (damage >= 0),
  healing integer not null default 0 check (healing >= 0),
  is_mvp boolean not null default false,
  constraint showmatch_participants_showmatch_player_key unique (showmatch_id, player_id)
);

create index idx_participants_player
  on public.showmatch_participants (player_id);

create index idx_participants_player_showmatch
  on public.showmatch_participants (player_id, showmatch_id);

create index idx_participants_team
  on public.showmatch_participants (team_id);

create index idx_participants_hero
  on public.showmatch_participants (hero_id);

-- ---------------------------------------------------------------------------
-- Auth Discord → players link (trigger on auth.identities)
-- ---------------------------------------------------------------------------

create or replace function public.handle_discord_player_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_avatar text;
  v_existing_auth uuid;
begin
  if new.provider is distinct from 'discord' then
    return new;
  end if;

  v_username := coalesce(
    new.identity_data ->> 'full_name',
    new.identity_data ->> 'name',
    new.identity_data ->> 'preferred_username',
    new.identity_data ->> 'user_name',
    'Joueur'
  );
  v_avatar := coalesce(
    new.identity_data ->> 'avatar_url',
    new.identity_data ->> 'picture'
  );

  select p.auth_user_id
  into v_existing_auth
  from public.players p
  where p.discord_id = new.provider_id;

  if found then
    if v_existing_auth is not null and v_existing_auth is distinct from new.user_id then
      raise exception 'Discord account % is already linked to another user', new.provider_id;
    end if;

    update public.players
    set
      auth_user_id = new.user_id,
      claimed_at = coalesce(claimed_at, now()),
      discord_username = v_username,
      avatar_url = coalesce(avatar_url, v_avatar),
      updated_at = now()
    where discord_id = new.provider_id;
  else
    insert into public.players (
      discord_id,
      auth_user_id,
      discord_username,
      display_name,
      avatar_url,
      claimed_at
    )
    values (
      new.provider_id,
      new.user_id,
      v_username,
      v_username,
      v_avatar,
      now()
    );
  end if;

  return new;
end;
$$;

create trigger on_discord_identity_created
after insert on auth.identities
for each row
when (new.provider = 'discord')
execute function public.handle_discord_player_link();

-- ---------------------------------------------------------------------------
-- Profile history view
-- ---------------------------------------------------------------------------

create view public.player_showmatch_stats
with (security_invoker = true)
as
select
  p.id as participant_id,
  p.player_id,
  p.showmatch_id,
  p.hero_id,
  p.net_worth,
  p.damage,
  p.healing,
  p.is_mvp,
  t.name as team_name,
  t.side as team_side,
  t.is_winner as won,
  sm.played_at,
  sm.deadlock_match_id,
  sm.duration_seconds,
  sm.total_kills,
  sm.total_souls,
  se.event_date,
  se.title as event_title
from public.showmatch_participants p
join public.showmatch_teams t on t.id = p.team_id
join public.showmatches sm on sm.id = p.showmatch_id
join public.showmatch_events se on se.id = sm.event_id;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.players enable row level security;
alter table public.showmatch_events enable row level security;
alter table public.showmatches enable row level security;
alter table public.showmatch_teams enable row level security;
alter table public.showmatch_participants enable row level security;

-- Public read
create policy "players_select_public"
  on public.players for select
  to anon, authenticated
  using (true);

create policy "showmatch_events_select_public"
  on public.showmatch_events for select
  to anon, authenticated
  using (true);

create policy "showmatches_select_public"
  on public.showmatches for select
  to anon, authenticated
  using (true);

create policy "showmatch_teams_select_public"
  on public.showmatch_teams for select
  to anon, authenticated
  using (true);

create policy "showmatch_participants_select_public"
  on public.showmatch_participants for select
  to anon, authenticated
  using (true);

-- Owner can update own profile (column protection via trigger)
create policy "players_update_own"
  on public.players for update
  to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Grants (service_role bypasses RLS for bot writes)
grant usage on schema public to anon, authenticated;

grant select on public.players to anon, authenticated;
grant select on public.showmatch_events to anon, authenticated;
grant select on public.showmatches to anon, authenticated;
grant select on public.showmatch_teams to anon, authenticated;
grant select on public.showmatch_participants to anon, authenticated;
grant select on public.player_showmatch_stats to anon, authenticated;

grant update (
  display_name,
  bio,
  avatar_url,
  updated_at
) on public.players to authenticated;

-- Trigger-only: not callable via PostgREST RPC
revoke all on function public.handle_discord_player_link() from public, anon, authenticated;
