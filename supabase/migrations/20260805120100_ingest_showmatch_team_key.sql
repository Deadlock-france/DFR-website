-- Ingest showmatch snapshot v2.1: steam_id32, team_key, side per game



create or replace function public._ingest_find_player(
  p_discord_id text,
  p_steam_id32 text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_steam_id32 is not null then
    select id into v_id from public.players where steam_id32 = p_steam_id32;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  if p_discord_id is not null then
    select id into v_id from public.players where discord_id = p_discord_id;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  return null;
end;
$$;

create or replace function public._ingest_upsert_player(
  p_discord_id text,
  p_steam_id32 text,
  p_username text,
  p_avatar_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_username text;
begin
  if (p_discord_id is null or length(trim(p_discord_id)) = 0)
     and (p_steam_id32 is null or length(trim(p_steam_id32)) = 0) then
    raise exception 'player requires discord_id and/or steam_id32';
  end if;

  v_username := coalesce(nullif(p_username, ''), p_steam_id32, p_discord_id, 'Joueur');
  v_id := public._ingest_find_player(p_discord_id, p_steam_id32);

  if v_id is not null then
    update public.players as p
    set
      discord_id = coalesce(p.discord_id, nullif(p_discord_id, '')),
      steam_id32 = coalesce(p.steam_id32, nullif(p_steam_id32, '')),
      discord_username = case
        when p.claimed_at is null then v_username
        else p.discord_username
      end,
      display_name = case
        when p.claimed_at is null then v_username
        else p.display_name
      end,
      avatar_url = coalesce(p.avatar_url, nullif(p_avatar_url, '')),
      updated_at = now()
    where p.id = v_id;
    return v_id;
  end if;

  insert into public.players (
    discord_id, steam_id32, discord_username, display_name, avatar_url
  )
  values (
    nullif(p_discord_id, ''),
    nullif(p_steam_id32, ''),
    v_username,
    v_username,
    nullif(p_avatar_url, '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public._ingest_find_player(text, text) from public, anon, authenticated;
revoke all on function public._ingest_upsert_player(text, text, text, text) from public, anon, authenticated;
grant execute on function public._ingest_find_player(text, text) to service_role;
grant execute on function public._ingest_upsert_player(text, text, text, text) to service_role;


create or replace function public.ingest_showmatch(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schema_version int;
  v_external_id text;
  v_status text;
  v_showmatch_id uuid;
  v_series jsonb;
  v_series_id uuid;
  v_series_external_id text;
  v_team jsonb;
  v_game jsonb;
  v_player jsonb;
  v_team_id uuid;
  v_game_id uuid;
  v_player_id uuid;
  v_discord_id text;
  v_steam_id32 text;
  v_username text;
  v_team_key text;
  v_side text;
  v_winner_team_key text;
  v_winner_team_id uuid;
  v_mvp_player_id uuid;
  v_mvp_discord_id text;
  v_mvp_steam_id32 text;
  v_stream_urls text[];
  v_series_ids uuid[] := '{}';
  v_game_ids uuid[] := '{}';
  v_score_team1 int;
  v_score_team2 int;
  v_side_mapping_source text;
  v_mvp_rule text;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'payload must be a JSON object';
  end if;

  v_schema_version := coalesce((payload ->> 'schema_version')::int, 0);
  if v_schema_version <> 1 then
    raise exception 'schema_version must be 1';
  end if;

  v_external_id := nullif(trim(payload ->> 'showmatch_id'), '');
  if v_external_id is null then
    raise exception 'showmatch_id is required';
  end if;

  if payload ->> 'scheduled_at' is null then
    raise exception 'scheduled_at is required';
  end if;

  v_status := coalesce(nullif(payload ->> 'status', ''), 'scheduled');
  if v_status not in ('scheduled', 'teams_formed', 'in_progress', 'completed') then
    raise exception 'status must be scheduled, teams_formed, in_progress, or completed';
  end if;

  -- Helper-like: upsert player from discord_id and/or steam_id32
  -- 1) Collect players from captains + game players + casters
  for v_series in
    select value from jsonb_array_elements(coalesce(payload -> 'series', '[]'::jsonb))
  loop
    if nullif(v_series ->> 'caster_discord_id', '') is not null
       or nullif(v_series ->> 'caster_steam_id32', '') is not null then
      perform public._ingest_upsert_player(
        nullif(v_series ->> 'caster_discord_id', ''),
        nullif(v_series ->> 'caster_steam_id32', ''),
        'Caster',
        null
      );
    end if;

    for v_team in
      select value from jsonb_array_elements(coalesce(v_series -> 'teams', '[]'::jsonb))
    loop
      if nullif(v_team ->> 'captain_discord_id', '') is not null
         or nullif(v_team ->> 'captain_steam_id32', '') is not null then
        perform public._ingest_upsert_player(
          nullif(v_team ->> 'captain_discord_id', ''),
          nullif(v_team ->> 'captain_steam_id32', ''),
          'Joueur',
          null
        );
      end if;
    end loop;

    for v_game in
      select value from jsonb_array_elements(coalesce(v_series -> 'games', '[]'::jsonb))
    loop
      for v_player in
        select value from jsonb_array_elements(coalesce(v_game -> 'players', '[]'::jsonb))
      loop
        v_username := coalesce(
          nullif(v_player ->> 'discord_username', ''),
          nullif(v_player ->> 'display_name', ''),
          nullif(v_player ->> 'steam_id32', ''),
          nullif(v_player ->> 'discord_id', ''),
          'Joueur'
        );
        perform public._ingest_upsert_player(
          nullif(v_player ->> 'discord_id', ''),
          nullif(v_player ->> 'steam_id32', ''),
          v_username,
          nullif(v_player ->> 'avatar_url', '')
        );
      end loop;

      if nullif(v_game ->> 'mvp_discord_id', '') is not null
         or nullif(v_game ->> 'mvp_steam_id32', '') is not null then
        perform public._ingest_upsert_player(
          nullif(v_game ->> 'mvp_discord_id', ''),
          nullif(v_game ->> 'mvp_steam_id32', ''),
          'Joueur',
          null
        );
      end if;
    end loop;
  end loop;

  insert into public.showmatches (
    external_id, title, scheduled_at, started_at, completed_at, status
  )
  values (
    v_external_id,
    nullif(payload ->> 'event_title', ''),
    (payload ->> 'scheduled_at')::timestamptz,
    nullif(payload ->> 'started_at', '')::timestamptz,
    nullif(payload ->> 'completed_at', '')::timestamptz,
    v_status
  )
  on conflict (external_id) do update
  set
    title = coalesce(excluded.title, showmatches.title),
    scheduled_at = excluded.scheduled_at,
    started_at = excluded.started_at,
    completed_at = excluded.completed_at,
    status = excluded.status,
    updated_at = now()
  returning id into v_showmatch_id;

  -- Snapshot replace for idempotent re-ingest
  delete from public.showmatch_series where showmatch_id = v_showmatch_id;

  for v_series in
    select value from jsonb_array_elements(coalesce(payload -> 'series', '[]'::jsonb))
  loop
    v_series_external_id := nullif(trim(v_series ->> 'series_id'), '');
    if v_series_external_id is null then
      raise exception 'series_id is required for each series';
    end if;
    if v_series ->> 'lobby_number' is null then
      raise exception 'lobby_number is required for series %', v_series_external_id;
    end if;

    select coalesce(array_agg(elem), '{}'::text[])
    into v_stream_urls
    from jsonb_array_elements_text(coalesce(v_series -> 'stream_urls', '[]'::jsonb)) as elem;

    v_score_team1 := coalesce(
      (v_series #>> '{score,team1}')::int,
      (v_series #>> '{score,amber}')::int,
      0
    );
    v_score_team2 := coalesce(
      (v_series #>> '{score,team2}')::int,
      (v_series #>> '{score,sapphire}')::int,
      0
    );

    insert into public.showmatch_series (
      showmatch_id, external_id, lobby_number, caster_discord_id,
      stream_urls, score_team1, score_team2
    )
    values (
      v_showmatch_id,
      v_series_external_id,
      (v_series ->> 'lobby_number')::integer,
      nullif(v_series ->> 'caster_discord_id', ''),
      v_stream_urls,
      v_score_team1,
      v_score_team2
    )
    returning id into v_series_id;

    v_series_ids := array_append(v_series_ids, v_series_id);

    for v_team in
      select value from jsonb_array_elements(coalesce(v_series -> 'teams', '[]'::jsonb))
    loop
      v_team_key := v_team ->> 'team_key';
      if v_team_key is null or v_team_key not in ('team1', 'team2') then
        -- legacy fallback from side
        if (v_team ->> 'side') = 'amber' then
          v_team_key := 'team1';
        elsif (v_team ->> 'side') = 'sapphire' then
          v_team_key := 'team2';
        else
          raise exception 'team.team_key must be team1 or team2 (series %)', v_series_external_id;
        end if;
      end if;

      if nullif(v_team ->> 'name', '') is null then
        raise exception 'team.name is required (series %)', v_series_external_id;
      end if;

      insert into public.showmatch_series_teams (
        series_id, name, team_key, side, captain_player_id, avg_rank, is_series_winner
      )
      values (
        v_series_id,
        v_team ->> 'name',
        v_team_key,
        null,
        public._ingest_find_player(
          nullif(v_team ->> 'captain_discord_id', ''),
          nullif(v_team ->> 'captain_steam_id32', '')
        ),
        nullif(v_team ->> 'avg_rank', '')::numeric,
        coalesce((v_team ->> 'is_series_winner')::boolean, false)
      );
    end loop;

    if not exists (
      select 1 from public.showmatch_series_teams
      where series_id = v_series_id and is_series_winner
    ) and (v_score_team1 > 0 or v_score_team2 > 0) then
      if v_score_team1 > v_score_team2 then
        update public.showmatch_series_teams
        set is_series_winner = (team_key = 'team1')
        where series_id = v_series_id;
      elsif v_score_team2 > v_score_team1 then
        update public.showmatch_series_teams
        set is_series_winner = (team_key = 'team2')
        where series_id = v_series_id;
      end if;
    end if;

    for v_game in
      select value from jsonb_array_elements(coalesce(v_series -> 'games', '[]'::jsonb))
    loop
      if v_game ->> 'game_number' is null then
        raise exception 'game_number is required (series %)', v_series_external_id;
      end if;

      v_winner_team_key := coalesce(
        nullif(v_game ->> 'winner_team_key', ''),
        case
          when (v_game ->> 'winner_side') = 'amber' then 'team1'
          when (v_game ->> 'winner_side') = 'sapphire' then 'team2'
          else null
        end
      );
      v_winner_team_id := null;
      if v_winner_team_key is not null then
        if v_winner_team_key not in ('team1', 'team2') then
          raise exception 'winner_team_key must be team1 or team2';
        end if;
        select id into v_winner_team_id
        from public.showmatch_series_teams
        where series_id = v_series_id and team_key = v_winner_team_key;
      end if;

      v_side_mapping_source := nullif(v_game ->> 'side_mapping_source', '');
      if v_side_mapping_source is not null
         and v_side_mapping_source not in ('known', 'assumed') then
        raise exception 'side_mapping_source must be known or assumed';
      end if;

      v_mvp_rule := coalesce(
        nullif(v_game ->> 'mvp_rule', ''),
        'highest_net_worth'
      );

      insert into public.showmatch_games (
        series_id, game_number, deadlock_match_id, started_at,
        duration_seconds, total_kills, total_souls, winner_team_id,
        side_mapping_source, mvp_rule
      )
      values (
        v_series_id,
        (v_game ->> 'game_number')::integer,
        nullif(v_game ->> 'deadlock_match_id', ''),
        nullif(v_game ->> 'started_at', '')::timestamptz,
        nullif(v_game ->> 'duration_seconds', '')::integer,
        coalesce((v_game ->> 'total_kills')::integer, 0),
        coalesce((v_game ->> 'total_souls')::integer, 0),
        v_winner_team_id,
        v_side_mapping_source,
        v_mvp_rule
      )
      returning id into v_game_id;

      v_game_ids := array_append(v_game_ids, v_game_id);

      for v_player in
        select value from jsonb_array_elements(coalesce(v_game -> 'players', '[]'::jsonb))
      loop
        v_team_key := v_player ->> 'team_key';
        if v_team_key is null or v_team_key not in ('team1', 'team2') then
          if (v_player ->> 'side') = 'amber' then
            v_team_key := 'team1';
          elsif (v_player ->> 'side') = 'sapphire' then
            v_team_key := 'team2';
          else
            raise exception 'player.team_key must be team1 or team2';
          end if;
        end if;

        v_side := nullif(v_player ->> 'side', '');
        if v_side is not null and v_side not in ('amber', 'sapphire') then
          raise exception 'player.side must be amber or sapphire';
        end if;

        select id into v_team_id
        from public.showmatch_series_teams
        where series_id = v_series_id and team_key = v_team_key;

        if v_team_id is null then
          raise exception 'no team for team_key % in series %', v_team_key, v_series_external_id;
        end if;

        v_player_id := public._ingest_find_player(
          nullif(v_player ->> 'discord_id', ''),
          nullif(v_player ->> 'steam_id32', '')
        );

        if v_player_id is null then
          raise exception 'player missing after upsert (discord=% steam=%)',
            v_player ->> 'discord_id', v_player ->> 'steam_id32';
        end if;

        if v_player ->> 'hero_id' is null then
          raise exception 'hero_id required for player';
        end if;

        insert into public.showmatch_game_participants (
          game_id, team_id, player_id, hero_id, side,
          net_worth, damage, healing, kills, deaths, assists, is_mvp
        )
        values (
          v_game_id,
          v_team_id,
          v_player_id,
          (v_player ->> 'hero_id')::integer,
          v_side,
          coalesce((v_player ->> 'net_worth')::integer, 0),
          coalesce((v_player ->> 'damage')::integer, 0),
          coalesce((v_player ->> 'healing')::integer, 0),
          coalesce((v_player ->> 'kills')::integer, 0),
          coalesce((v_player ->> 'deaths')::integer, 0),
          coalesce((v_player ->> 'assists')::integer, 0),
          coalesce((v_player ->> 'is_mvp')::boolean, false)
        );
      end loop;

      -- MVP: explicit ids, else highest net_worth
      v_mvp_discord_id := nullif(v_game ->> 'mvp_discord_id', '');
      v_mvp_steam_id32 := nullif(v_game ->> 'mvp_steam_id32', '');
      v_mvp_player_id := public._ingest_find_player(v_mvp_discord_id, v_mvp_steam_id32);

      if v_mvp_player_id is null then
        select player_id into v_mvp_player_id
        from public.showmatch_game_participants
        where game_id = v_game_id
        order by net_worth desc, kills desc
        limit 1;
      end if;

      if v_mvp_player_id is not null then
        update public.showmatch_games
        set mvp_player_id = v_mvp_player_id, updated_at = now()
        where id = v_game_id;

        update public.showmatch_game_participants
        set is_mvp = (player_id = v_mvp_player_id)
        where game_id = v_game_id;
      end if;

      if coalesce((v_game ->> 'total_kills')::integer, 0) = 0 then
        update public.showmatch_games g
        set total_kills = coalesce((
          select sum(p.kills) from public.showmatch_game_participants p where p.game_id = g.id
        ), 0)
        where g.id = v_game_id;
      end if;

      if coalesce((v_game ->> 'total_souls')::integer, 0) = 0 then
        update public.showmatch_games g
        set total_souls = coalesce((
          select sum(p.net_worth) from public.showmatch_game_participants p where p.game_id = g.id
        ), 0)
        where g.id = v_game_id;
      end if;
    end loop;
  end loop;

  return jsonb_build_object(
    'showmatch_id', v_showmatch_id,
    'external_id', v_external_id,
    'status', v_status,
    'series_ids', to_jsonb(v_series_ids),
    'game_ids', to_jsonb(v_game_ids)
  );
end;
$$;


revoke all on function public.ingest_showmatch(jsonb) from public, anon, authenticated;
grant execute on function public.ingest_showmatch(jsonb) to service_role;

comment on function public.ingest_showmatch(jsonb) is
  'Bot Discord: upsert showmatch snapshot. Players keyed by steam_id32 and/or discord_id. Teams by team_key; side is per-game.';
