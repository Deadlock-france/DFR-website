-- Rang Deadlock mis en cache sur le joueur showmatch (badge Valve, pas le Steam ID).
-- Lecture publique du badge ; écriture uniquement service_role (pas de GRANT UPDATE).

alter table public.players
  add column if not exists ranked_badge integer;

alter table public.players
  add column if not exists ranked_fetched_at timestamptz;

alter table public.players
  drop constraint if exists players_ranked_badge_range;

alter table public.players
  add constraint players_ranked_badge_range
  check (
    ranked_badge is null
    or (ranked_badge >= 0 and ranked_badge <= 116)
  );

grant select (ranked_badge, ranked_fetched_at)
  on public.players to anon, authenticated;
