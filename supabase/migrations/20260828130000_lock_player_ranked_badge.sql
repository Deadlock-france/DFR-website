-- Le rang Deadlock n’est écrit que par service_role.
-- Les sessions JWT (y compris le propriétaire) ne peuvent pas forger le badge.

revoke insert (ranked_badge, ranked_fetched_at)
  on public.players from anon, authenticated;

revoke update (ranked_badge, ranked_fetched_at)
  on public.players from anon, authenticated;

create or replace function public.enforce_claimed_player_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.claimed_at is not null
     and old.auth_user_id is not null
     and new.auth_user_id is null
     and new.discord_id is null
     and new.steam_id32 is null then
    new.display_name := old.display_name;
    new.discord_username := coalesce(new.discord_username, old.discord_username);
    return new;
  end if;

  -- Sessions JWT : le badge rang n’est pas éditable (service_role a uid null).
  if auth.uid() is not null then
    new.ranked_badge := old.ranked_badge;
    new.ranked_fetched_at := old.ranked_fetched_at;
  end if;

  if old.claimed_at is null then
    return new;
  end if;

  if auth.uid() is not null and auth.uid() = old.auth_user_id then
    new.discord_id := old.discord_id;
    new.steam_id32 := old.steam_id32;
    new.auth_user_id := old.auth_user_id;
    new.claimed_at := old.claimed_at;
    return new;
  end if;

  new.discord_id := old.discord_id;
  new.steam_id32 := old.steam_id32;
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

create or replace function public.anonymize_user_for_erasure(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  team_rec record;
  successor uuid;
begin
  if p_user_id is null then
    raise exception 'user id required';
  end if;

  for team_rec in
    select id from public.teams where captain_id = p_user_id
  loop
    select tm.profile_id into successor
    from public.team_members tm
    where tm.team_id = team_rec.id
      and tm.profile_id is distinct from p_user_id
    order by tm.joined_at
    limit 1;

    if successor is null then
      delete from public.teams where id = team_rec.id;
    else
      update public.team_members
      set role = 'captain'
      where team_id = team_rec.id
        and profile_id = successor;

      update public.teams
      set captain_id = successor
      where id = team_rec.id;
    end if;
  end loop;

  update public.players
  set
    discord_id = null,
    steam_id32 = null,
    auth_user_id = null,
    claimed_at = null,
    avatar_url = null,
    bio = null,
    ranked_badge = null,
    ranked_fetched_at = null,
    updated_at = now()
  where auth_user_id = p_user_id;
end;
$$;
