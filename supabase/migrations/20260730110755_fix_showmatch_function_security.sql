-- Harden functions flagged by Supabase security advisors

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.enforce_claimed_player_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.claimed_at is null then
    return new;
  end if;

  if auth.uid() is not null and auth.uid() = old.auth_user_id then
    new.discord_id := old.discord_id;
    new.auth_user_id := old.auth_user_id;
    new.claimed_at := old.claimed_at;
    return new;
  end if;

  new.discord_id := old.discord_id;
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

revoke all on function public.handle_discord_player_link() from public, anon, authenticated;
