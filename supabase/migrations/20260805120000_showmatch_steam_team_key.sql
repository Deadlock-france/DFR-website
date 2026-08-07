-- Showmatch v2.1: steam_id32, team_key stable, side par game

-- ---------------------------------------------------------------------------
-- players: discord_id nullable + steam_id32
-- ---------------------------------------------------------------------------

alter table public.players
  alter column discord_id drop not null;

alter table public.players
  drop constraint if exists players_discord_id_key;

create unique index if not exists players_discord_id_uidx
  on public.players (discord_id)
  where discord_id is not null;

alter table public.players
  add column if not exists steam_id32 text;

create unique index if not exists players_steam_id32_uidx
  on public.players (steam_id32)
  where steam_id32 is not null;

alter table public.players
  drop constraint if exists players_identity_check;

alter table public.players
  add constraint players_identity_check
  check (discord_id is not null or steam_id32 is not null);

-- ---------------------------------------------------------------------------
-- series teams: team_key (team1/team2) replaces side as identity
-- ---------------------------------------------------------------------------

alter table public.showmatch_series_teams
  drop constraint if exists showmatch_series_teams_series_side_key;

alter table public.showmatch_series_teams
  drop constraint if exists showmatch_series_teams_side_check;

alter table public.showmatch_series_teams
  alter column side drop not null;

alter table public.showmatch_series_teams
  add column if not exists team_key text;

-- Backfill leftover rows (tables were empty in practice)
update public.showmatch_series_teams
set team_key = case when side = 'amber' then 'team1' else 'team2' end
where team_key is null;

alter table public.showmatch_series_teams
  alter column team_key set not null;

alter table public.showmatch_series_teams
  drop constraint if exists showmatch_series_teams_team_key_check;

alter table public.showmatch_series_teams
  add constraint showmatch_series_teams_team_key_check
  check (team_key in ('team1', 'team2'));

alter table public.showmatch_series_teams
  drop constraint if exists showmatch_series_teams_series_team_key_key;

alter table public.showmatch_series_teams
  add constraint showmatch_series_teams_series_team_key_key
  unique (series_id, team_key);

alter table public.showmatch_series_teams
  drop constraint if exists showmatch_series_teams_side_values_check;

alter table public.showmatch_series_teams
  add constraint showmatch_series_teams_side_values_check
  check (side is null or side in ('amber', 'sapphire'));

-- series score: team1/team2
do $$
begin
  alter table public.showmatch_series rename column score_amber to score_team1;
exception
  when undefined_column then null;
end $$;

do $$
begin
  alter table public.showmatch_series rename column score_sapphire to score_team2;
exception
  when undefined_column then null;
end $$;

-- ---------------------------------------------------------------------------
-- games: side mapping reliability
-- ---------------------------------------------------------------------------

alter table public.showmatch_games
  add column if not exists side_mapping_source text;

alter table public.showmatch_games
  drop constraint if exists showmatch_games_side_mapping_source_check;

alter table public.showmatch_games
  add constraint showmatch_games_side_mapping_source_check
  check (
    side_mapping_source is null
    or side_mapping_source in ('known', 'assumed')
  );

alter table public.showmatch_games
  add column if not exists mvp_rule text;

-- ---------------------------------------------------------------------------
-- participants: side is per-game
-- ---------------------------------------------------------------------------

alter table public.showmatch_game_participants
  add column if not exists side text;

alter table public.showmatch_game_participants
  drop constraint if exists showmatch_game_participants_side_check;

alter table public.showmatch_game_participants
  add constraint showmatch_game_participants_side_check
  check (side is null or side in ('amber', 'sapphire'));
