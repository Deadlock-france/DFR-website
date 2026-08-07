-- Single-call ingest for Discord bot: one JSON payload → all tables.
-- Callable only with service_role (not anon / authenticated).

create or replace function public.ingest_showmatch(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_match_id uuid;
  v_mvp_player_id uuid;
  v_winner_team_id uuid;
  v_team jsonb;
  v_player jsonb;
  v_team_id uuid;
  v_player_id uuid;
  v_discord_id text;
  v_username text;
  v_side int;
  v_event_date date;
  v_deadlock_match_id text;
  v_team_ids uuid[] := '{}';
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'payload must be a JSON object';
  end if;

  v_event_date := (payload ->> 'event_date')::date;
  v_deadlock_match_id := payload ->> 'deadlock_match_id';

  if v_event_date is null then
    raise exception 'event_date is required (YYYY-MM-DD)';
  end if;
  if v_deadlock_match_id is null or length(trim(v_deadlock_match_id)) = 0 then
    raise exception 'deadlock_match_id is required';
  end if;
  if payload ->> 'played_at' is null then
    raise exception 'played_at is required';
  end if;
  if payload ->> 'duration_seconds' is null then
    raise exception 'duration_seconds is required';
  end if;
  if jsonb_typeof(payload -> 'teams') <> 'array' or jsonb_array_length(payload -> 'teams') <> 2 then
    raise exception 'teams must be an array of exactly 2 teams';
  end if;

  -- 1) Upsert all players from both teams
  for v_team in select value from jsonb_array_elements(payload -> 'teams')
  loop
    for v_player in select value from jsonb_array_elements(coalesce(v_team -> 'players', '[]'::jsonb))
    loop
      v_discord_id := v_player ->> 'discord_id';
      v_username := coalesce(
        nullif(v_player ->> 'discord_username', ''),
        nullif(v_player ->> 'display_name', ''),
        'Joueur'
      );

      if v_discord_id is null or length(trim(v_discord_id)) = 0 then
        raise exception 'each player requires discord_id';
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
        -- display_name / avatar protected by enforce_claimed_player_fields when claimed
        display_name = excluded.display_name,
        avatar_url = coalesce(excluded.avatar_url, p.avatar_url),
        updated_at = now();
    end loop;
  end loop;

  -- 2) Event (1 per day)
  insert into public.showmatch_events (event_date, title)
  values (v_event_date, nullif(payload ->> 'event_title', ''))
  on conflict (event_date) do update
  set title = coalesce(excluded.title, showmatch_events.title)
  returning id into v_event_id;

  -- 3) Match upsert
  insert into public.showmatches (
    event_id,
    played_at,
    deadlock_match_id,
    duration_seconds,
    total_kills,
    total_souls
  )
  values (
    v_event_id,
    (payload ->> 'played_at')::timestamptz,
    v_deadlock_match_id,
    (payload ->> 'duration_seconds')::integer,
    coalesce((payload ->> 'total_kills')::integer, 0),
    coalesce((payload ->> 'total_souls')::integer, 0)
  )
  on conflict (deadlock_match_id) do update
  set
    event_id = excluded.event_id,
    played_at = excluded.played_at,
    duration_seconds = excluded.duration_seconds,
    total_kills = excluded.total_kills,
    total_souls = excluded.total_souls,
    winner_team_id = null,
    mvp_player_id = null,
    updated_at = now()
  returning id into v_match_id;

  -- Replace roster (idempotent re-ingest of same match)
  update public.showmatches
  set winner_team_id = null
  where id = v_match_id;

  delete from public.showmatch_teams
  where showmatch_id = v_match_id;

  -- 4 + 5) Teams + participants
  for v_team in select value from jsonb_array_elements(payload -> 'teams')
  loop
    v_side := (v_team ->> 'side')::integer;
    if v_side is null or v_side not in (1, 2) then
      raise exception 'team.side must be 1 or 2';
    end if;
    if nullif(v_team ->> 'name', '') is null then
      raise exception 'team.name is required';
    end if;

    insert into public.showmatch_teams (
      showmatch_id,
      name,
      side,
      captain_player_id,
      avg_rank,
      is_winner
    )
    values (
      v_match_id,
      v_team ->> 'name',
      v_side,
      (
        select id from public.players
        where discord_id = nullif(v_team ->> 'captain_discord_id', '')
      ),
      nullif(v_team ->> 'avg_rank', '')::numeric,
      coalesce((v_team ->> 'is_winner')::boolean, false)
    )
    returning id into v_team_id;

    v_team_ids := array_append(v_team_ids, v_team_id);

    if coalesce((v_team ->> 'is_winner')::boolean, false) then
      v_winner_team_id := v_team_id;
    end if;

    for v_player in select value from jsonb_array_elements(coalesce(v_team -> 'players', '[]'::jsonb))
    loop
      select id into v_player_id
      from public.players
      where discord_id = v_player ->> 'discord_id';

      if v_player_id is null then
        raise exception 'player % missing after upsert', v_player ->> 'discord_id';
      end if;

      if v_player ->> 'hero_id' is null then
        raise exception 'hero_id required for player %', v_player ->> 'discord_id';
      end if;

      insert into public.showmatch_participants (
        showmatch_id,
        team_id,
        player_id,
        hero_id,
        net_worth,
        damage,
        healing,
        is_mvp
      )
      values (
        v_match_id,
        v_team_id,
        v_player_id,
        (v_player ->> 'hero_id')::integer,
        coalesce((v_player ->> 'net_worth')::integer, 0),
        coalesce((v_player ->> 'damage')::integer, 0),
        coalesce((v_player ->> 'healing')::integer, 0),
        coalesce((v_player ->> 'is_mvp')::boolean, false)
      );

      if coalesce((v_player ->> 'is_mvp')::boolean, false)
         or (payload ->> 'mvp_discord_id') = (v_player ->> 'discord_id') then
        v_mvp_player_id := v_player_id;
      end if;
    end loop;
  end loop;

  if v_winner_team_id is null then
    raise exception 'exactly one team must have is_winner=true';
  end if;

  -- Prefer explicit mvp_discord_id when provided
  if payload ->> 'mvp_discord_id' is not null then
    select id into v_mvp_player_id
    from public.players
    where discord_id = payload ->> 'mvp_discord_id';
  end if;

  update public.showmatches
  set
    winner_team_id = v_winner_team_id,
    mvp_player_id = v_mvp_player_id,
    updated_at = now()
  where id = v_match_id;

  if v_mvp_player_id is not null then
    update public.showmatch_participants
    set is_mvp = (player_id = v_mvp_player_id)
    where showmatch_id = v_match_id;
  end if;

  return jsonb_build_object(
    'event_id', v_event_id,
    'showmatch_id', v_match_id,
    'winner_team_id', v_winner_team_id,
    'mvp_player_id', v_mvp_player_id,
    'team_ids', to_jsonb(v_team_ids)
  );
end;
$$;

revoke all on function public.ingest_showmatch(jsonb) from public, anon, authenticated;
grant execute on function public.ingest_showmatch(jsonb) to service_role;

comment on function public.ingest_showmatch(jsonb) is
  'Bot Discord: ingest a full showmatch payload (players, event, match, teams, stats) in one RPC call.';
