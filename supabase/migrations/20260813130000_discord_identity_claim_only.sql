-- Identité Discord : auth.identities uniquement (pas raw_user_meta_data).
-- Claim showmatch : snowflake Discord uniquement (pas display_name / pseudo libre).

-- ---------------------------------------------------------------------------
-- Profil depuis auth.identities (provider = discord)
-- ---------------------------------------------------------------------------

create or replace function private.upsert_profile_from_discord_identity(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ident record;
  v_username text;
  v_global text;
  v_avatar text;
  v_discord_id text;
  v_meta jsonb;
  v_taken boolean := false;
begin
  select i.provider_id, i.identity_data
  into v_ident
  from auth.identities i
  where i.user_id = p_user_id
    and i.provider = 'discord'
  order by i.updated_at desc nulls last, i.created_at desc
  limit 1;

  if v_ident.provider_id is null then
    insert into public.profiles (id, username, global_name)
    values (p_user_id, 'joueur', 'joueur')
    on conflict (id) do nothing;
    return;
  end if;

  v_discord_id := nullif(trim(v_ident.provider_id), '');
  if v_discord_id is not null and v_discord_id !~ '^[0-9]{5,32}$' then
    v_discord_id := null;
  end if;

  v_meta := coalesce(v_ident.identity_data, '{}'::jsonb);

  v_username := coalesce(
    nullif(trim(v_meta ->> 'preferred_username'), ''),
    nullif(trim(v_meta ->> 'user_name'), ''),
    nullif(trim(v_meta ->> 'name'), ''),
    'joueur'
  );

  v_global := coalesce(
    nullif(trim(v_meta #>> '{custom_claims,global_name}'), ''),
    nullif(trim(v_meta ->> 'global_name'), ''),
    nullif(trim(v_meta ->> 'full_name'), ''),
    nullif(trim(v_meta ->> 'name'), ''),
    v_username
  );

  v_avatar := coalesce(
    nullif(trim(v_meta ->> 'avatar_url'), ''),
    nullif(trim(v_meta ->> 'picture'), '')
  );

  if v_discord_id is not null then
    select exists (
      select 1
      from public.profiles p
      where p.discord_id = v_discord_id
        and p.id is distinct from p_user_id
    ) into v_taken;
  end if;

  insert into public.profiles (id, discord_id, username, global_name, avatar_url)
  values (
    p_user_id,
    case when v_taken then null else v_discord_id end,
    v_username,
    v_global,
    v_avatar
  )
  on conflict (id) do update
    set
      discord_id = case
        when v_taken then public.profiles.discord_id
        else coalesce(excluded.discord_id, public.profiles.discord_id)
      end,
      username = excluded.username,
      global_name = excluded.global_name,
      avatar_url = excluded.avatar_url,
      updated_at = now();
end;
$$;

revoke all on function private.upsert_profile_from_discord_identity(uuid) from public;

-- Ancienne entrée : ne plus jamais copier raw_user_meta_data.
create or replace function private.upsert_profile_from_auth(
  p_user_id uuid,
  p_meta jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.upsert_profile_from_discord_identity(p_user_id);
end;
$$;

revoke all on function private.upsert_profile_from_auth(uuid, jsonb) from public;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.upsert_profile_from_discord_identity(new.id);
  return new;
end;
$$;

-- user_metadata est éditable par le client : ne plus resynchroniser le profil.
drop trigger if exists on_auth_user_updated on auth.users;

create or replace function private.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Claim : snowflake uniquement
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
  v_mine_id uuid;
begin
  if p_user_id is null then
    raise exception 'link_discord_showmatch_player requires user id';
  end if;
  if v_provider is null or v_provider !~ '^[0-9]{5,32}$' then
    raise exception 'link_discord_showmatch_player requires discord snowflake';
  end if;

  v_username := coalesce(
    nullif(trim(p_identity_data ->> 'preferred_username'), ''),
    nullif(trim(p_identity_data ->> 'user_name'), ''),
    nullif(trim(p_identity_data ->> 'full_name'), ''),
    nullif(trim(p_identity_data ->> 'global_name'), ''),
    nullif(trim(p_identity_data ->> 'name'), ''),
    'Joueur'
  );
  v_avatar := coalesce(
    nullif(trim(p_identity_data ->> 'avatar_url'), ''),
    nullif(trim(p_identity_data ->> 'picture'), '')
  );

  select p.id, p.auth_user_id
  into v_by_id_id, v_by_id_auth
  from public.players p
  where p.discord_id = v_provider;

  select p.id into v_mine_id
  from public.players p
  where p.auth_user_id = p_user_id
  limit 1;

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

    if v_mine_id is not null and v_mine_id is distinct from v_by_id_id then
      perform public.merge_showmatch_players(v_mine_id, v_by_id_id);
    end if;

    return v_by_id_id;
  end if;

  if v_mine_id is not null then
    update public.players
    set
      discord_id = coalesce(discord_id, v_provider),
      claimed_at = coalesce(claimed_at, now()),
      avatar_url = coalesce(avatar_url, v_avatar),
      updated_at = now()
    where id = v_mine_id;

    return v_mine_id;
  end if;

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
  returning id into v_mine_id;

  return v_mine_id;
end;
$$;

revoke all on function public.link_discord_showmatch_player(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.link_discord_showmatch_player(uuid, text, jsonb)
  to service_role;

comment on function public.link_discord_showmatch_player(uuid, text, jsonb) is
  'Internal: link a Discord identity to players by snowflake only.';

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

  perform private.upsert_profile_from_discord_identity(new.user_id);
  perform public.link_discord_showmatch_player(
    new.user_id,
    new.provider_id,
    coalesce(new.identity_data, '{}'::jsonb)
  );

  return new;
end;
$$;

drop trigger if exists on_discord_identity_updated on auth.identities;

create trigger on_discord_identity_updated
after update of provider_id, identity_data on auth.identities
for each row
when (new.provider = 'discord')
execute function public.handle_discord_player_link();

comment on function public.claim_showmatch_player_for_me() is
  'Claims the current user showmatch player by Discord snowflake from auth.identities.';

-- showmatch_nickname n'est plus updatable via PostgREST (claim first-come).
revoke update on public.profiles from anon, authenticated;
grant update (display_name, updated_at) on public.profiles to authenticated;
