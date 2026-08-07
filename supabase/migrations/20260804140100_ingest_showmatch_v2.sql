-- Bot Discord ingest: full showmatch snapshot (schema_version 1).
-- Callable only with service_role. MVP = highest net_worth per game when not explicit.

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
  v_username text;
  v_side text;
  v_winner_side text;
  v_winner_team_id uuid;
  v_mvp_player_id uuid;
  v_mvp_discord_id text;
  v_stream_urls text[];
  v_series_ids uuid[] := '{}';
  v_game_ids uuid[] := '{}';
  v_score_amber int;
  v_score_sapphire int;
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

  -- 1) Collect + upsert all players referenced in the payload
  for v_series in
    select value from jsonb_array_elements(coalesce(payload -> 'series', '[]'::jsonb))
  loop
    for v_team in
      select value from jsonb_array_elements(coalesce(v_series -> 'teams', '[]'::jsonb))
    loop
      if nullif(v_team ->> 'captain_discord_id', '') is not null then
        v_discord_id := v_team ->> 'captain_discord_id';
        insert into public.players as p (discord_id, discord_username, display_name)
        values (v_discord_id, 'Joueur', 'Joueur')
        on conflict (discord_id) do update
        set updated_at = now();
      end if;

      for v_player in
        select value from jsonb_array_elements(coalesce(v_team -> 'players', '[]'::jsonb))
      loop
        v_discord_id := v_player ->> 'discord_id';
        v_username := coalesce(
          nullif(v_player ->> 'discord_username', ''),
          nullif(v_player ->> 'display_name', ''),
          'Joueur'
        );
        if v_discord_id is null or length(trim(v_discord_id)) = 0 then
          raise exception 'each team.players entry requires discord_id';
        end if;
        insert into public.players as p (discord_id, discord_username, display_name, avatar_url)
        values (
          v_discord_id,
          v_username,
          v_username,
          nullif(v_player ->> 'avatar_url', '')
        )
        on conflict (discord_id) do update
        set
          discord_username = excluded.discord_username,
          display_name = excluded.display_name,
          avatar_url = coalesce(excluded.avatar_url, p.avatar_url),
          updated_at = now();
      end loop;
    end loop;

    if nullif(v_series ->> 'caster_discord_id', '') is not null then
      v_discord_id := v_series ->> 'caster_discord_id';
      insert into public.players as p (discord_id, discord_username, display_name)
      values (v_discord_id, 'Caster', 'Caster')
      on conflict (discord_id) do update
      set updated_at = now();
    end if;

    for v_game in
      select value from jsonb_array_elements(coalesce(v_series -> 'games', '[]'::jsonb))
    loop
      for v_player in
        select value from jsonb_array_elements(coalesce(v_game -> 'players', '[]'::jsonb))
      loop
        v_discord_id := v_player ->> 'discord_id';
        v_username := coalesce(
          nullif(v_player ->> 'discord_username', ''),
          nullif(v_player ->> 'display_name', ''),
          'Joueur'
        );
        if v_discord_id is null or length(trim(v_discord_id)) = 0 then
          raise exception 'each game.players entry requires discord_id';
        end if;
        insert into public.players as p (discord_id, discord_username, display_name, avatar_url)
        values (
          v_discord_id,
          v_username,
          v_username,
          nullif(v_player ->> 'avatar_url', '')
        )
        on conflict (discord_id) do update
        set
          discord_username = excluded.discord_username,
          display_name = excluded.display_name,
          avatar_url = coalesce(excluded.avatar_url, p.avatar_url),
          updated_at = now();
      end loop;
    end loop;
  end loop;

  -- 2) Upsert showmatch event
  insert into public.showmatches (
    external_id,
    title,
    scheduled_at,
    started_at,
    completed_at,
    status
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

  -- Replace series tree for idempotent snapshot ingest
  delete from public.showmatch_series
  where showmatch_id = v_showmatch_id;

  -- 3) Series + teams + games
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

    select coalesce(
      array_agg(elem),
      '{}'::text[]
    )
    into v_stream_urls
    from jsonb_array_elements_text(coalesce(v_series -> 'stream_urls', '[]'::jsonb)) as elem;

    v_score_amber := coalesce((v_series #>> '{score,amber}')::int, 0);
    v_score_sapphire := coalesce((v_series #>> '{score,sapphire}')::int, 0);

    insert into public.showmatch_series (
      showmatch_id,
      external_id,
      lobby_number,
      caster_discord_id,
      stream_urls,
      score_amber,
      score_sapphire
    )
    values (
      v_showmatch_id,
      v_series_external_id,
      (v_series ->> 'lobby_number')::integer,
      nullif(v_series ->> 'caster_discord_id', ''),
      v_stream_urls,
      v_score_amber,
      v_score_sapphire
    )
    returning id into v_series_id;

    v_series_ids := array_append(v_series_ids, v_series_id);

    for v_team in
      select value from jsonb_array_elements(coalesce(v_series -> 'teams', '[]'::jsonb))
    loop
      v_side := v_team ->> 'side';
      if v_side is null or v_side not in ('amber', 'sapphire') then
        raise exception 'team.side must be amber or sapphire (series %)', v_series_external_id;
      end if;
      if nullif(v_team ->> 'name', '') is null then
        raise exception 'team.name is required (series %)', v_series_external_id;
      end if;

      insert into public.showmatch_series_teams (
        series_id,
        name,
        side,
        captain_player_id,
        avg_rank,
        is_series_winner
      )
      values (
        v_series_id,
        v_team ->> 'name',
        v_side,
        (
          select id from public.players
          where discord_id = nullif(v_team ->> 'captain_discord_id', '')
        ),
        nullif(v_team ->> 'avg_rank', '')::numeric,
        coalesce((v_team ->> 'is_series_winner')::boolean, false)
      );
    end loop;

    -- Derive series winner from score when not flagged on teams
    if not exists (
      select 1 from public.showmatch_series_teams
      where series_id = v_series_id and is_series_winner
    ) and (v_score_amber > 0 or v_score_sapphire > 0) then
      if v_score_amber > v_score_sapphire then
        update public.showmatch_series_teams
        set is_series_winner = (side = 'amber')
        where series_id = v_series_id;
      elsif v_score_sapphire > v_score_amber then
        update public.showmatch_series_teams
        set is_series_winner = (side = 'sapphire')
        where series_id = v_series_id;
      end if;
    end if;

    for v_game in
      select value from jsonb_array_elements(coalesce(v_series -> 'games', '[]'::jsonb))
    loop
      if v_game ->> 'game_number' is null then
        raise exception 'game_number is required (series %)', v_series_external_id;
      end if;

      v_winner_side := nullif(v_game ->> 'winner_side', '');
      v_winner_team_id := null;
      if v_winner_side is not null then
        if v_winner_side not in ('amber', 'sapphire') then
          raise exception 'winner_side must be amber or sapphire';
        end if;
        select id into v_winner_team_id
        from public.showmatch_series_teams
        where series_id = v_series_id and side = v_winner_side;
      end if;

      insert into public.showmatch_games (
        series_id,
        game_number,
        deadlock_match_id,
        started_at,
        duration_seconds,
        total_kills,
        total_souls,
        winner_team_id
      )
      values (
        v_series_id,
        (v_game ->> 'game_number')::integer,
        nullif(v_game ->> 'deadlock_match_id', ''),
        nullif(v_game ->> 'started_at', '')::timestamptz,
        nullif(v_game ->> 'duration_seconds', '')::integer,
        coalesce((v_game ->> 'total_kills')::integer, 0),
        coalesce((v_game ->> 'total_souls')::integer, 0),
        v_winner_team_id
      )
      returning id into v_game_id;

      v_game_ids := array_append(v_game_ids, v_game_id);

      for v_player in
        select value from jsonb_array_elements(coalesce(v_game -> 'players', '[]'::jsonb))
      loop
        v_side := v_player ->> 'side';
        if v_side is null or v_side not in ('amber', 'sapphire') then
          raise exception 'player.side must be amber or sapphire';
        end if;

        select id into v_team_id
        from public.showmatch_series_teams
        where series_id = v_series_id and side = v_side;

        if v_team_id is null then
          raise exception 'no team for side % in series %', v_side, v_series_external_id;
        end if;

        select id into v_player_id
        from public.players
        where discord_id = v_player ->> 'discord_id';

        if v_player_id is null then
          raise exception 'player % missing after upsert', v_player ->> 'discord_id';
        end if;

        if v_player ->> 'hero_id' is null then
          raise exception 'hero_id required for player %', v_player ->> 'discord_id';
        end if;

        insert into public.showmatch_game_participants (
          game_id,
          team_id,
          player_id,
          hero_id,
          net_worth,
          damage,
          healing,
          kills,
          deaths,
          assists,
          is_mvp
        )
        values (
          v_game_id,
          v_team_id,
          v_player_id,
          (v_player ->> 'hero_id')::integer,
          coalesce((v_player ->> 'net_worth')::integer, 0),
          coalesce((v_player ->> 'damage')::integer, 0),
          coalesce((v_player ->> 'healing')::integer, 0),
          coalesce((v_player ->> 'kills')::integer, 0),
          coalesce((v_player ->> 'deaths')::integer, 0),
          coalesce((v_player ->> 'assists')::integer, 0),
          coalesce((v_player ->> 'is_mvp')::boolean, false)
        );
      end loop;

      -- MVP: explicit discord id, else highest net_worth (bot rule)
      v_mvp_discord_id := nullif(v_game ->> 'mvp_discord_id', '');
      v_mvp_player_id := null;

      if v_mvp_discord_id is not null then
        select id into v_mvp_player_id
        from public.players
        where discord_id = v_mvp_discord_id;
      else
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

      -- Fill totals from participants when omitted
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
  'Bot Discord: upsert a full showmatch snapshot (schema_version 1). MVP per game = highest net_worth unless mvp_discord_id is set.';
