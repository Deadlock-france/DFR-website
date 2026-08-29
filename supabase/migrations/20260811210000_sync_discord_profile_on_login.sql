-- Resynchronise username / global_name / avatar à chaque login Discord.
-- Lit explicitement custom_claims.global_name (nom d'affichage Discord).

create or replace function private.discord_identity_from_meta(meta jsonb)
returns table (
  discord_id text,
  username text,
  global_name text,
  avatar_url text
)
language plpgsql
immutable
as $$
declare
  v_username text;
begin
  v_username := coalesce(
    nullif(trim(meta ->> 'preferred_username'), ''),
    nullif(trim(meta ->> 'user_name'), ''),
    nullif(trim(meta ->> 'name'), ''),
    'joueur'
  );

  discord_id := coalesce(
    nullif(trim(meta ->> 'provider_id'), ''),
    nullif(trim(meta ->> 'sub'), '')
  );

  username := v_username;

  global_name := coalesce(
    nullif(trim(meta #>> '{custom_claims,global_name}'), ''),
    nullif(trim(meta ->> 'global_name'), ''),
    nullif(trim(meta ->> 'full_name'), ''),
    nullif(trim(meta ->> 'name'), ''),
    v_username
  );

  avatar_url := coalesce(
    nullif(trim(meta ->> 'avatar_url'), ''),
    nullif(trim(meta ->> 'picture'), '')
  );

  return next;
end;
$$;

revoke all on function private.discord_identity_from_meta(jsonb) from public;

create or replace function private.upsert_profile_from_auth(
  p_user_id uuid,
  p_meta jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  identity record;
begin
  select * into identity
  from private.discord_identity_from_meta(coalesce(p_meta, '{}'::jsonb));

  insert into public.profiles (id, discord_id, username, global_name, avatar_url)
  values (
    p_user_id,
    coalesce(identity.discord_id, p_user_id::text),
    identity.username,
    identity.global_name,
    identity.avatar_url
  )
  on conflict (id) do update
    set
      discord_id = excluded.discord_id,
      username = excluded.username,
      global_name = excluded.global_name,
      avatar_url = excluded.avatar_url,
      updated_at = now();
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
  perform private.upsert_profile_from_auth(
    new.id,
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
  );
  return new;
end;
$$;

create or replace function private.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data is distinct from old.raw_user_meta_data then
    perform private.upsert_profile_from_auth(
      new.id,
      coalesce(new.raw_user_meta_data, '{}'::jsonb)
    );
  end if;
  return new;
end;
$$;

revoke all on function private.handle_user_updated() from public;

drop trigger if exists on_auth_user_updated on auth.users;

create trigger on_auth_user_updated
  after update on auth.users
  for each row
  execute function private.handle_user_updated();
