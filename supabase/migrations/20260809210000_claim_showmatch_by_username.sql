-- Claim showmatch players by Discord snowflake OR unique unclaimed username.
-- Covers historical imports that used synthetic discord_id hashes.

-- ---------------------------------------------------------------------------
-- Merge FKs from one players row into another, then delete the source.
-- ---------------------------------------------------------------------------
create or replace function public.merge_showmatch_players(
  p_from_id uuid,
  p_to_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_from_id is null or p_to_id is null then
    raise exception 'merge_showmatch_players requires from and to ids';
  end if;
  if p_from_id = p_to_id then
    return;
  end if;

  -- Game participants (unique game_id + player_id)
  update public.showmatch_game_participants gp
  set player_id = p_to_id
  where gp.player_id = p_from_id
    and not exists (
      select 1
      from public.showmatch_game_participants x
      where x.game_id = gp.game_id
        and x.player_id = p_to_id
    );

  delete from public.showmatch_game_participants
  where player_id = p_from_id;

  -- Series roster members
  update public.showmatch_series_team_members m
  set player_id = p_to_id
  where m.player_id = p_from_id
    and not exists (
      select 1
      from public.showmatch_series_team_members x
      where x.team_id = m.team_id
        and x.player_id = p_to_id
    );

  delete from public.showmatch_series_team_members
  where player_id = p_from_id;

  update public.showmatch_games
  set mvp_player_id = p_to_id
  where mvp_player_id = p_from_id;

  update public.showmatch_series_teams
  set captain_player_id = p_to_id
  where captain_player_id = p_from_id;

  -- Prefer a non-placeholder display name from the historical row
  update public.players as dest
  set
    display_name = case
      when dest.display_name in ('Joueur', 'Caster')
        or dest.display_name is null
        or btrim(dest.display_name) = ''
      then coalesce(nullif(btrim(src.display_name), ''), dest.display_name)
      else dest.display_name
    end,
    discord_username = case
      when dest.discord_username in ('Joueur', 'Caster')
        or dest.discord_username is null
        or btrim(dest.discord_username) = ''
      then coalesce(nullif(btrim(src.discord_username), ''), dest.discord_username)
      else dest.discord_username
    end,
    avatar_url = coalesce(dest.avatar_url, src.avatar_url),
    updated_at = now()
  from public.players as src
  where dest.id = p_to_id
    and src.id = p_from_id;

  delete from public.players where id = p_from_id;
end;
$$;

revoke all on function public.merge_showmatch_players(uuid, uuid) from public, anon, authenticated;
grant execute on function public.merge_showmatch_players(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Shared claim logic
-- ---------------------------------------------------------------------------
create or replace function public.link_discord_showmatch_player(
  p_user_id uuid,
  p_provider_id text,
  p_identity_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text := nullif(trim(coalesce(p_provider_id, '')), '');
  v_username text;
  v_avatar text;
  v_by_id_id uuid;
  v_by_id_auth uuid;
  v_by_name_id uuid;
  v_mine_id uuid;
  v_result_id uuid;
  v_match_count int;
  v_names text[];
  v_profile record;
begin
  if p_user_id is null then
    raise exception 'link_discord_showmatch_player requires user id';
  end if;
  if v_provider is null then
    raise exception 'link_discord_showmatch_player requires discord provider id';
  end if;

  v_username := coalesce(
    nullif(trim(p_identity_data ->> 'full_name'), ''),
    nullif(trim(p_identity_data ->> 'global_name'), ''),
    nullif(trim(p_identity_data ->> 'name'), ''),
    nullif(trim(p_identity_data ->> 'preferred_username'), ''),
    nullif(trim(p_identity_data ->> 'user_name'), ''),
    'Joueur'
  );
  v_avatar := coalesce(
    nullif(trim(p_identity_data ->> 'avatar_url'), ''),
    nullif(trim(p_identity_data ->> 'picture'), '')
  );

  select *
  into v_profile
  from public.profiles
  where id = p_user_id;

  v_names := array(
    select distinct norm
    from (
      select lower(btrim(n)) as norm
      from unnest(array[
        p_identity_data ->> 'full_name',
        p_identity_data ->> 'global_name',
        p_identity_data ->> 'name',
        p_identity_data ->> 'preferred_username',
        p_identity_data ->> 'user_name',
        v_profile.username,
        v_profile.global_name,
        v_profile.display_name
      ]) as n
      where nullif(btrim(n), '') is not null
      union
      select lower(regexp_replace(btrim(n), '[^a-zA-Z0-9]', '', 'g'))
      from unnest(array[
        p_identity_data ->> 'full_name',
        p_identity_data ->> 'global_name',
        p_identity_data ->> 'name',
        p_identity_data ->> 'preferred_username',
        p_identity_data ->> 'user_name',
        v_profile.username,
        v_profile.global_name,
        v_profile.display_name
      ]) as n
      where nullif(btrim(n), '') is not null
        and nullif(lower(regexp_replace(btrim(n), '[^a-zA-Z0-9]', '', 'g')), '') is not null
    ) s
  );

  select p.id, p.auth_user_id
  into v_by_id_id, v_by_id_auth
  from public.players p
  where p.discord_id = v_provider;

  select p.id into v_mine_id
  from public.players p
  where p.auth_user_id = p_user_id
  limit 1;

  v_by_name_id := null;
  if coalesce(cardinality(v_names), 0) > 0 then
    select count(*)::int into v_match_count
    from public.players p
    where p.claimed_at is null
      and (
        lower(btrim(p.discord_username)) = any (v_names)
        or lower(regexp_replace(btrim(p.discord_username), '[^a-zA-Z0-9]', '', 'g')) = any (v_names)
      );

    if v_match_count = 1 then
      select p.id into v_by_name_id
      from public.players p
      where p.claimed_at is null
        and (
          lower(btrim(p.discord_username)) = any (v_names)
          or lower(regexp_replace(btrim(p.discord_username), '[^a-zA-Z0-9]', '', 'g')) = any (v_names)
        )
      limit 1;
    end if;
  end if;

  -- 1) Snowflake match
  if v_by_id_id is not null then
    if v_by_id_auth is not null
       and v_by_id_auth is distinct from p_user_id then
      raise exception 'Discord account % is already linked to another user', v_provider;
    end if;

    update public.players
    set
      auth_user_id = p_user_id,
      claimed_at = coalesce(claimed_at, now()),
      discord_username = case
        when discord_username in ('Joueur', 'Caster') then v_username
        else discord_username
      end,
      display_name = case
        when display_name in ('Joueur', 'Caster') then v_username
        else display_name
      end,
      avatar_url = coalesce(avatar_url, v_avatar),
      updated_at = now()
    where id = v_by_id_id;

    if v_by_name_id is not null and v_by_name_id is distinct from v_by_id_id then
      perform public.merge_showmatch_players(v_by_name_id, v_by_id_id);
    end if;

    if v_mine_id is not null
       and v_mine_id is distinct from v_by_id_id
       and (v_by_name_id is null or v_mine_id is distinct from v_by_name_id) then
      perform public.merge_showmatch_players(v_mine_id, v_by_id_id);
    end if;

    return v_by_id_id;
  end if;

  -- 2) User already has a claimed player, merge historical by username
  if v_mine_id is not null then
    if v_by_name_id is not null and v_by_name_id is distinct from v_mine_id then
      perform public.merge_showmatch_players(v_by_name_id, v_mine_id);
    end if;

    update public.players
    set
      discord_id = coalesce(discord_id, v_provider),
      claimed_at = coalesce(claimed_at, now()),
      avatar_url = coalesce(avatar_url, v_avatar),
      updated_at = now()
    where id = v_mine_id;

    return v_mine_id;
  end if;

  -- 3) Unique unclaimed username → claim + rewrite synthetic discord_id
  if v_by_name_id is not null then
    update public.players
    set
      discord_id = v_provider,
      auth_user_id = p_user_id,
      claimed_at = coalesce(claimed_at, now()),
      avatar_url = coalesce(avatar_url, v_avatar),
      updated_at = now()
    where id = v_by_name_id;

    return v_by_name_id;
  end if;

  -- 4) Fresh player
  insert into public.players (
    discord_id,
    auth_user_id,
    discord_username,
    display_name,
    avatar_url,
    claimed_at
  )
  values (
    v_provider,
    p_user_id,
    v_username,
    v_username,
    v_avatar,
    now()
  )
  returning id into v_result_id;

  return v_result_id;
end;
$$;

revoke all on function public.link_discord_showmatch_player(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.link_discord_showmatch_player(uuid, text, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- Trigger on Discord identity insert
-- ---------------------------------------------------------------------------
create or replace function public.handle_discord_player_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.provider is distinct from 'discord' then
    return new;
  end if;

  perform public.link_discord_showmatch_player(
    new.user_id,
    new.provider_id,
    coalesce(new.identity_data, '{}'::jsonb)
  );

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: backfill for already-logged-in users (profil page)
-- ---------------------------------------------------------------------------
create or replace function public.claim_showmatch_player_for_me()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_identity record;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select i.provider_id, i.identity_data
  into v_identity
  from auth.identities i
  where i.user_id = v_uid
    and i.provider = 'discord'
  order by i.created_at asc
  limit 1;

  if v_identity.provider_id is null then
    return null;
  end if;

  return public.link_discord_showmatch_player(
    v_uid,
    v_identity.provider_id,
    coalesce(v_identity.identity_data, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.claim_showmatch_player_for_me() from public, anon;
grant execute on function public.claim_showmatch_player_for_me() to authenticated;
grant execute on function public.claim_showmatch_player_for_me() to service_role;

comment on function public.claim_showmatch_player_for_me() is
  'Claims/merges the current user showmatch player by Discord snowflake or unique unclaimed username.';

comment on function public.link_discord_showmatch_player(uuid, text, jsonb) is
  'Internal: link a Discord identity to players (snowflake first, then unique username).';
