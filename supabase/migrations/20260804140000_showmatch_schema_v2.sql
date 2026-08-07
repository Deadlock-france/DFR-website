-- Showmatch v2: event → series/lobby → games
-- Rebuild (tables were empty). Keeps public.players + Discord link triggers.

-- ---------------------------------------------------------------------------
-- Drop legacy showmatch objects
-- ---------------------------------------------------------------------------

drop view if exists public.player_showmatch_stats;

drop function if exists public.ingest_showmatch(jsonb);

alter table if exists public.showmatches
  drop constraint if exists showmatches_winner_team_id_fkey;

drop table if exists public.showmatch_participants cascade;
drop table if exists public.showmatch_teams cascade;
drop table if exists public.showmatches cascade;
drop table if exists public.showmatch_events cascade;

-- ---------------------------------------------------------------------------
-- showmatches (event / soirée)
-- ---------------------------------------------------------------------------

create table public.showmatches (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  title text,
  scheduled_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'teams_formed', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint showmatches_external_id_key unique (external_id)
);

create index idx_showmatches_scheduled_at
  on public.showmatches (scheduled_at desc);

create index idx_showmatches_status
  on public.showmatches (status);

create trigger showmatches_set_updated_at
before update on public.showmatches
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- showmatch_series (lobby / BO3)
-- ---------------------------------------------------------------------------

create table public.showmatch_series (
  id uuid primary key default gen_random_uuid(),
  showmatch_id uuid not null references public.showmatches (id) on delete cascade,
  external_id text not null,
  lobby_number integer not null check (lobby_number >= 1),
  caster_discord_id text,
  stream_urls text[] not null default '{}',
  score_amber integer not null default 0 check (score_amber >= 0),
  score_sapphire integer not null default 0 check (score_sapphire >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint showmatch_series_external_id_key unique (external_id),
  constraint showmatch_series_showmatch_lobby_key unique (showmatch_id, lobby_number)
);

create index idx_showmatch_series_showmatch
  on public.showmatch_series (showmatch_id, lobby_number);

create trigger showmatch_series_set_updated_at
before update on public.showmatch_series
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- showmatch_series_teams (roster stable for the series)
-- ---------------------------------------------------------------------------

create table public.showmatch_series_teams (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.showmatch_series (id) on delete cascade,
  name text not null,
  side text not null check (side in ('amber', 'sapphire')),
  captain_player_id uuid references public.players (id) on delete set null,
  avg_rank numeric,
  is_series_winner boolean not null default false,
  constraint showmatch_series_teams_series_side_key unique (series_id, side),
  constraint showmatch_series_teams_series_name_key unique (series_id, name)
);

create index idx_showmatch_series_teams_captain
  on public.showmatch_series_teams (captain_player_id);

-- ---------------------------------------------------------------------------
-- showmatch_games
-- ---------------------------------------------------------------------------

create table public.showmatch_games (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.showmatch_series (id) on delete cascade,
  game_number integer not null check (game_number between 1 and 3),
  deadlock_match_id text,
  started_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  total_kills integer not null default 0 check (total_kills >= 0),
  total_souls integer not null default 0 check (total_souls >= 0),
  -- MVP = joueur au plus haut net_worth de la game (règle bot / ingest)
  mvp_player_id uuid references public.players (id) on delete set null,
  winner_team_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint showmatch_games_series_game_number_key unique (series_id, game_number),
  constraint showmatch_games_deadlock_match_id_key unique (deadlock_match_id)
);

create index idx_showmatch_games_series
  on public.showmatch_games (series_id, game_number);

create trigger showmatch_games_set_updated_at
before update on public.showmatch_games
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- showmatch_game_participants
-- ---------------------------------------------------------------------------

create table public.showmatch_game_participants (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.showmatch_games (id) on delete cascade,
  team_id uuid not null references public.showmatch_series_teams (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete restrict,
  hero_id integer not null,
  net_worth integer not null default 0 check (net_worth >= 0),
  damage integer not null default 0 check (damage >= 0),
  healing integer not null default 0 check (healing >= 0),
  kills integer not null default 0 check (kills >= 0),
  deaths integer not null default 0 check (deaths >= 0),
  assists integer not null default 0 check (assists >= 0),
  is_mvp boolean not null default false,
  constraint showmatch_game_participants_game_player_key unique (game_id, player_id)
);

create index idx_game_participants_player
  on public.showmatch_game_participants (player_id);

create index idx_game_participants_player_game
  on public.showmatch_game_participants (player_id, game_id);

create index idx_game_participants_team
  on public.showmatch_game_participants (team_id);

create index idx_game_participants_hero
  on public.showmatch_game_participants (hero_id);

alter table public.showmatch_games
  add constraint showmatch_games_winner_team_id_fkey
  foreign key (winner_team_id)
  references public.showmatch_series_teams (id)
  on delete set null;

-- ---------------------------------------------------------------------------
-- Profile history view
-- ---------------------------------------------------------------------------

create view public.player_showmatch_stats
with (security_invoker = true)
as
select
  gp.id as participant_id,
  gp.player_id,
  gp.game_id,
  g.series_id,
  sm.id as showmatch_id,
  gp.hero_id,
  gp.net_worth,
  gp.damage,
  gp.healing,
  gp.kills,
  gp.deaths,
  gp.assists,
  gp.is_mvp,
  t.name as team_name,
  t.side as team_side,
  (g.winner_team_id = t.id) as won,
  g.started_at,
  g.deadlock_match_id,
  g.duration_seconds,
  g.total_kills,
  g.total_souls,
  g.game_number,
  s.lobby_number,
  sm.scheduled_at,
  sm.external_id as showmatch_external_id,
  sm.title as event_title,
  sm.status as showmatch_status
from public.showmatch_game_participants gp
join public.showmatch_series_teams t on t.id = gp.team_id
join public.showmatch_games g on g.id = gp.game_id
join public.showmatch_series s on s.id = g.series_id
join public.showmatches sm on sm.id = s.showmatch_id;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.showmatches enable row level security;
alter table public.showmatch_series enable row level security;
alter table public.showmatch_series_teams enable row level security;
alter table public.showmatch_games enable row level security;
alter table public.showmatch_game_participants enable row level security;

create policy "showmatches_select_public"
  on public.showmatches for select
  to anon, authenticated
  using (true);

create policy "showmatch_series_select_public"
  on public.showmatch_series for select
  to anon, authenticated
  using (true);

create policy "showmatch_series_teams_select_public"
  on public.showmatch_series_teams for select
  to anon, authenticated
  using (true);

create policy "showmatch_games_select_public"
  on public.showmatch_games for select
  to anon, authenticated
  using (true);

create policy "showmatch_game_participants_select_public"
  on public.showmatch_game_participants for select
  to anon, authenticated
  using (true);

grant select on public.showmatches to anon, authenticated;
grant select on public.showmatch_series to anon, authenticated;
grant select on public.showmatch_series_teams to anon, authenticated;
grant select on public.showmatch_games to anon, authenticated;
grant select on public.showmatch_game_participants to anon, authenticated;
grant select on public.player_showmatch_stats to anon, authenticated;
