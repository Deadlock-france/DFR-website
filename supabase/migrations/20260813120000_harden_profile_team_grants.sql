-- Durcit RLS / grants : un JWT authentifié ne doit pas pouvoir
-- 1) s'ajouter à n'importe quelle équipe (INSERT team_members)
-- 2) usurper discord_id / username pour claimer un historique showmatch.

-- Mutations d'appartenance : uniquement via RPC security definer
-- (create_team, respond_to_team_invite, leave_team, kick_team_member).
drop policy if exists "team_members_insert_self" on public.team_members;
revoke insert, update, delete on public.team_members from anon, authenticated;

-- Création d'équipe : uniquement via public.create_team().
drop policy if exists "teams_insert_authenticated" on public.teams;
revoke insert on public.teams from anon, authenticated;

-- Profil : pas d'insert/delete client ; update limité aux champs édités par l'UI.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, showmatch_nickname, updated_at)
  on public.profiles to authenticated;
