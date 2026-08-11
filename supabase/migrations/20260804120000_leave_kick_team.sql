-- Quitter une équipe (membre / remplaçant uniquement — pas le capitaine)
create or replace function public.leave_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  member_role text;
begin
  if uid is null then
    raise exception 'unauthenticated';
  end if;

  select tm.role into member_role
  from public.team_members tm
  where tm.team_id = p_team_id
    and tm.profile_id = uid;

  if member_role is null then
    raise exception 'not a member';
  end if;

  if member_role = 'captain' then
    raise exception 'captain cannot leave';
  end if;

  delete from public.team_members
  where team_id = p_team_id
    and profile_id = uid;

  -- Annule les invitations en attente émises par ce joueur sur l'équipe
  update public.team_invites
  set status = 'cancelled'
  where team_id = p_team_id
    and inviter_id = uid
    and status = 'pending';
end;
$$;

revoke all on function public.leave_team(uuid) from public;
grant execute on function public.leave_team(uuid) to authenticated;

-- Exclure un membre (capitaine uniquement)
create or replace function public.kick_team_member(
  p_team_id uuid,
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  target_role text;
begin
  if uid is null then
    raise exception 'unauthenticated';
  end if;

  if not exists (
    select 1 from public.teams t
    where t.id = p_team_id and t.captain_id = uid
  ) then
    raise exception 'not captain';
  end if;

  if p_profile_id = uid then
    raise exception 'cannot kick self';
  end if;

  select tm.role into target_role
  from public.team_members tm
  where tm.team_id = p_team_id
    and tm.profile_id = p_profile_id;

  if target_role is null then
    raise exception 'not a member';
  end if;

  if target_role = 'captain' then
    raise exception 'cannot kick captain';
  end if;

  delete from public.team_members
  where team_id = p_team_id
    and profile_id = p_profile_id;

  update public.team_invites
  set status = 'cancelled'
  where team_id = p_team_id
    and invitee_id = p_profile_id
    and status = 'pending';
end;
$$;

revoke all on function public.kick_team_member(uuid, uuid) from public;
grant execute on function public.kick_team_member(uuid, uuid) to authenticated;
