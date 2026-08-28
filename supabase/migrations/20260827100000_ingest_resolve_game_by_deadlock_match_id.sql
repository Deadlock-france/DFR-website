-- Fix ingest: resolve games by deadlock_match_id (global unique) before series slot.
-- Prevents "Key (deadlock_match_id)=(...) already exists" when the bot updates a
-- match already stored under another game_number / series.

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
  v_has_score boolean;
  v_side_mapping_source text;
  v_mvp_rule text;
  v_total_kills int;
  v_total_souls int;
  v_has_participants boolean;
  v_is_series_winner boolean;
  v_captain_id uuid;
  v_avg_rank numeric;
  v_team_name text;
  v_deadlock_match_id text;
  v_game_number int;
  v_started_at timestamptz;
  v_duration_seconds int;
  v_slot_game_id uuid;
  v_match_game_id uuid;
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
  if v_status not in (
    'scheduled', 'teams_formed', 'in_progress', 'completed', 'cancelled'
  ) then
    raise exception 'status must be scheduled, teams_formed, in_progress, completed, or cancelled';
  end if;

  -- 1) Upsert referenced players (roster Discord first, then game steam)
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
          coalesce(
            nullif(v_team ->> 'captain_discord_username', ''),
            nullif(v_team ->> 'captain_username', ''),
            'Joueur'
          ),
          null
        );
      end if;

      if v_team ? 'players' then
        for v_player in
          select value from jsonb_array_elements(coalesce(v_team -> 'players', '[]'::jsonb))
        loop
          v_username := coalesce(
            nullif(v_player ->> 'discord_username', ''),
            nullif(v_player ->> 'display_name', ''),
            nullif(v_player ->> 'discord_id', ''),
            nullif(v_player ->> 'steam_id32', ''),
            'Joueur'
          );
          perform public._ingest_upsert_player(
            nullif(v_player ->> 'discord_id', ''),
            nullif(v_player ->> 'steam_id32', ''),
            v_username,
            nullif(v_player ->> 'avatar_url', '')
          );
        end loop;
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
    case when payload ? 'started_at'
      then nullif(payload ->> 'started_at', '')::timestamptz
      else null
    end,
    case when payload ? 'completed_at'
      then nullif(payload ->> 'completed_at', '')::timestamptz
      else null
    end,
    v_status
  )
  on conflict (external_id) do update
  set
    title = coalesce(excluded.title, showmatches.title),
    scheduled_at = excluded.scheduled_at,
    started_at = case
      when payload ? 'started_at' then excluded.started_at
      else showmatches.started_at
    end,
    completed_at = case
      when payload ? 'completed_at' then excluded.completed_at
      else showmatches.completed_at
    end,
    status = excluded.status,
    updated_at = now()
  returning id into v_showmatch_id;

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

    v_has_score := v_series ? 'score';
    if v_has_score then
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
    else
      v_score_team1 := 0;
      v_score_team2 := 0;
    end if;

    if v_series ? 'stream_urls' then
      select coalesce(array_agg(elem), '{}'::text[])
      into v_stream_urls
      from jsonb_array_elements_text(coalesce(v_series -> 'stream_urls', '[]'::jsonb)) as elem;
    else
      v_stream_urls := null;
    end if;

    insert into public.showmatch_series (
      showmatch_id, external_id, lobby_number, caster_discord_id,
      stream_urls, score_team1, score_team2
    )
    values (
      v_showmatch_id,
      v_series_external_id,
      (v_series ->> 'lobby_number')::integer,
      nullif(v_series ->> 'caster_discord_id', ''),
      coalesce(v_stream_urls, '{}'::text[]),
      v_score_team1,
      v_score_team2
    )
    on conflict (external_id) do update
    set
      showmatch_id = excluded.showmatch_id,
      lobby_number = excluded.lobby_number,
      caster_discord_id = case
        when v_series ? 'caster_discord_id' then excluded.caster_discord_id
        else showmatch_series.caster_discord_id
      end,
      stream_urls = case
        when v_series ? 'stream_urls' then excluded.stream_urls
        else showmatch_series.stream_urls
      end,
      score_team1 = case
        when v_has_score then excluded.score_team1
        else showmatch_series.score_team1
      end,
      score_team2 = case
        when v_has_score then excluded.score_team2
        else showmatch_series.score_team2
      end,
      updated_at = now()
    returning id into v_series_id;

    v_series_ids := array_append(v_series_ids, v_series_id);

    for v_team in
      select value from jsonb_array_elements(coalesce(v_series -> 'teams', '[]'::jsonb))
    loop
      v_team_key := v_team ->> 'team_key';
      if v_team_key is null or v_team_key not in ('team1', 'team2') then
        if (v_team ->> 'side') = 'amber' then
          v_team_key := 'team1';
        elsif (v_team ->> 'side') = 'sapphire' then
          v_team_key := 'team2';
        else
          raise exception 'team.team_key must be team1 or team2 (series %)', v_series_external_id;
        end if;
      end if;

      if nullif(v_team ->> 'name', '') is null then
        select name into v_team_name
        from public.showmatch_series_teams
        where series_id = v_series_id and team_key = v_team_key;

        if v_team_name is null then
          raise exception 'team.name is required (series %)', v_series_external_id;
        end if;
      else
        v_team_name := v_team ->> 'name';
      end if;

      v_captain_id := public._ingest_find_player(
        nullif(v_team ->> 'captain_discord_id', ''),
        nullif(v_team ->> 'captain_steam_id32', '')
      );
      v_avg_rank := nullif(v_team ->> 'avg_rank', '')::numeric;

      if v_team ? 'is_series_winner' then
        v_is_series_winner := coalesce(
          nullif(v_team ->> 'is_series_winner', '')::boolean,
          false
        );
      elsif nullif(v_series ->> 'winner_team_key', '') = v_team_key then
        v_is_series_winner := true;
      else
        v_is_series_winner := null; -- leave existing
      end if;

      insert into public.showmatch_series_teams (
        series_id, name, team_key, side, captain_player_id, avg_rank, is_series_winner
      )
      values (
        v_series_id,
        v_team_name,
        v_team_key,
        null,
        v_captain_id,
        v_avg_rank,
        coalesce(v_is_series_winner, false)
      )
      on conflict (series_id, team_key) do update
      set
        name = case
          when v_team ? 'name' and nullif(v_team ->> 'name', '') is not null
            then excluded.name
          else showmatch_series_teams.name
        end,
        captain_player_id = case
          when v_team ? 'captain_discord_id' or v_team ? 'captain_steam_id32'
            then excluded.captain_player_id
          else showmatch_series_teams.captain_player_id
        end,
        avg_rank = case
          when v_team ? 'avg_rank' then excluded.avg_rank
          else showmatch_series_teams.avg_rank
        end,
        is_series_winner = case
          when v_is_series_winner is not null then v_is_series_winner
          else showmatch_series_teams.is_series_winner
        end
      returning id into v_team_id;

      -- Roster: present key => full replace; absent => untouched
      if v_team ? 'players' then
        delete from public.showmatch_series_team_members
        where team_id = v_team_id;

        for v_player in
          select value from jsonb_array_elements(coalesce(v_team -> 'players', '[]'::jsonb))
        loop
          v_player_id := public._ingest_find_player(
            nullif(v_player ->> 'discord_id', ''),
            nullif(v_player ->> 'steam_id32', '')
          );
          if v_player_id is null then
            raise exception 'roster player missing after upsert (discord=% steam=%)',
              v_player ->> 'discord_id', v_player ->> 'steam_id32';
          end if;

          insert into public.showmatch_series_team_members (team_id, player_id)
          values (v_team_id, v_player_id)
          on conflict (team_id, player_id) do nothing;
        end loop;
      end if;
    end loop;

    -- Derive series winner from score only when score was provided and no winner set
    if v_has_score and not exists (
      select 1 from public.showmatch_series_teams
      where series_id = v_series_id and is_series_winner
    ) then
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

    if nullif(v_series ->> 'winner_team_key', '') in ('team1', 'team2') then
      update public.showmatch_series_teams
      set is_series_winner = (team_key = (v_series ->> 'winner_team_key'))
      where series_id = v_series_id;
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

      v_mvp_rule := nullif(v_game ->> 'mvp_rule', '');

      if v_game ? 'total_kills' then
        v_total_kills := nullif(v_game ->> 'total_kills', '')::integer;
      else
        v_total_kills := null;
      end if;

      if v_game ? 'total_souls' then
        v_total_souls := nullif(v_game ->> 'total_souls', '')::integer;
      else
        v_total_souls := null;
      end if;

      -- Resolve game by deadlock_match_id first (global unique), else by series slot.
      -- Avoids "Key (deadlock_match_id)=(...) already exists" on bot updates.
      v_deadlock_match_id := nullif(v_game ->> 'deadlock_match_id', '');
      v_game_number := (v_game ->> 'game_number')::integer;
      v_started_at := nullif(v_game ->> 'started_at', '')::timestamptz;
      v_duration_seconds := case
        when v_game ? 'duration_seconds'
          then nullif(v_game ->> 'duration_seconds', '')::integer
        else null
      end;

      v_game_id := null;
      v_slot_game_id := null;
      v_match_game_id := null;

      select g.id into v_slot_game_id
      from public.showmatch_games g
      where g.series_id = v_series_id and g.game_number = v_game_number;

      if v_deadlock_match_id is not null then
        select g.id into v_match_game_id
        from public.showmatch_games g
        where g.deadlock_match_id = v_deadlock_match_id;
      end if;

      if v_match_game_id is not null then
        if v_slot_game_id is not null and v_slot_game_id <> v_match_game_id then
          -- Slot held by another row: drop the shell so we can move the match row.
          delete from public.showmatch_games where id = v_slot_game_id;
        end if;

        update public.showmatch_games g
        set
          series_id = v_series_id,
          game_number = v_game_number,
          deadlock_match_id = case
            when v_game ? 'deadlock_match_id' then v_deadlock_match_id
            else g.deadlock_match_id
          end,
          started_at = case
            when v_game ? 'started_at' then v_started_at
            else g.started_at
          end,
          duration_seconds = case
            when v_game ? 'duration_seconds' then v_duration_seconds
            else g.duration_seconds
          end,
          total_kills = case
            when v_game ? 'total_kills' then v_total_kills
            else g.total_kills
          end,
          total_souls = case
            when v_game ? 'total_souls' then v_total_souls
            else g.total_souls
          end,
          winner_team_id = case
            when v_winner_team_key is not null then v_winner_team_id
            else g.winner_team_id
          end,
          side_mapping_source = case
            when v_game ? 'side_mapping_source' then v_side_mapping_source
            else g.side_mapping_source
          end,
          mvp_rule = case
            when v_game ? 'mvp_rule' then v_mvp_rule
            else g.mvp_rule
          end,
          updated_at = now()
        where g.id = v_match_game_id
        returning g.id into v_game_id;

      elsif v_slot_game_id is not null then
        update public.showmatch_games g
        set
          deadlock_match_id = case
            when v_game ? 'deadlock_match_id' then v_deadlock_match_id
            else g.deadlock_match_id
          end,
          started_at = case
            when v_game ? 'started_at' then v_started_at
            else g.started_at
          end,
          duration_seconds = case
            when v_game ? 'duration_seconds' then v_duration_seconds
            else g.duration_seconds
          end,
          total_kills = case
            when v_game ? 'total_kills' then v_total_kills
            else g.total_kills
          end,
          total_souls = case
            when v_game ? 'total_souls' then v_total_souls
            else g.total_souls
          end,
          winner_team_id = case
            when v_winner_team_key is not null then v_winner_team_id
            else g.winner_team_id
          end,
          side_mapping_source = case
            when v_game ? 'side_mapping_source' then v_side_mapping_source
            else g.side_mapping_source
          end,
          mvp_rule = case
            when v_game ? 'mvp_rule' then v_mvp_rule
            else g.mvp_rule
          end,
          updated_at = now()
        where g.id = v_slot_game_id
        returning g.id into v_game_id;

      else
        insert into public.showmatch_games (
          series_id, game_number, deadlock_match_id, started_at,
          duration_seconds, total_kills, total_souls, winner_team_id,
          side_mapping_source, mvp_rule
        )
        values (
          v_series_id,
          v_game_number,
          v_deadlock_match_id,
          v_started_at,
          v_duration_seconds,
          v_total_kills,
          v_total_souls,
          v_winner_team_id,
          v_side_mapping_source,
          v_mvp_rule
        )
        returning id into v_game_id;
      end if;

      v_game_ids := array_append(v_game_ids, v_game_id);
      v_has_participants := false;

      -- Participants: non-empty players[] => replace; empty/absent => keep
      if v_game ? 'players'
         and jsonb_typeof(v_game -> 'players') = 'array'
         and jsonb_array_length(v_game -> 'players') > 0 then
        delete from public.showmatch_game_participants
        where game_id = v_game_id;

        for v_player in
          select value from jsonb_array_elements(v_game -> 'players')
        loop
          v_has_participants := true;

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
            coalesce(nullif(v_player ->> 'is_mvp', '')::boolean, false)
          );
        end loop;
      end if;

      v_mvp_discord_id := nullif(v_game ->> 'mvp_discord_id', '');
      v_mvp_steam_id32 := nullif(v_game ->> 'mvp_steam_id32', '');
      v_mvp_player_id := public._ingest_find_player(v_mvp_discord_id, v_mvp_steam_id32);

      if v_mvp_player_id is null and v_has_participants then
        select player_id into v_mvp_player_id
        from public.showmatch_game_participants
        where game_id = v_game_id
        order by net_worth desc, kills desc
        limit 1;

        if v_mvp_rule is null then
          v_mvp_rule := 'highest_net_worth';
        end if;
      end if;

      if v_mvp_player_id is not null then
        update public.showmatch_games
        set
          mvp_player_id = v_mvp_player_id,
          mvp_rule = coalesce(v_mvp_rule, mvp_rule),
          updated_at = now()
        where id = v_game_id;

        if v_has_participants then
          update public.showmatch_game_participants
          set is_mvp = (player_id = v_mvp_player_id)
          where game_id = v_game_id;
        end if;
      end if;

      if not (v_game ? 'total_kills') and v_has_participants then
        update public.showmatch_games g
        set total_kills = coalesce((
          select sum(p.kills) from public.showmatch_game_participants p where p.game_id = g.id
        ), 0)
        where g.id = v_game_id;
      end if;

      if not (v_game ? 'total_souls') and v_has_participants then
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
  'Bot Discord: additive upsert. Games resolve by deadlock_match_id then (series_id, game_number). Roster replaced only when teams[].players is present; game players replaced only when non-empty.';
