-- Admin CMS : allowlist, annonces événements, articles news.
-- Mutations métier via service_role côté app (après requireAdmin).
-- Lecture publique : annonces/news published uniquement.

-- ---------------------------------------------------------------------------
-- site_admins
-- ---------------------------------------------------------------------------

create table public.site_admins (
  discord_id text primary key
    check (discord_id ~ '^[0-9]{5,32}$'),
  display_label text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

comment on table public.site_admins is
  'Allowlist Discord pour /admin. Kaliqot seedé ; Plumink exclu volontairement.';

alter table public.site_admins enable row level security;

-- Pas de policy pour anon/authenticated : lecture/écriture réservées au service_role.
revoke all on table public.site_admins from anon, authenticated;
grant select, insert, update, delete on table public.site_admins to service_role;

-- Seed Kaliqot uniquement (jamais Plumink).
-- Les usernames Discord peuvent être stockés comme "kaliqot#0".
insert into public.site_admins (discord_id, display_label)
select
  p.discord_id,
  coalesce(
    nullif(trim(p.display_name), ''),
    nullif(trim(p.global_name), ''),
    nullif(trim(split_part(p.username, '#', 1)), ''),
    'Kaliqot'
  )
from public.profiles p
where p.discord_id is not null
  and p.discord_id ~ '^[0-9]{5,32}$'
  and lower(split_part(coalesce(p.username, ''), '#', 1)) = 'kaliqot'
  and lower(split_part(coalesce(p.username, ''), '#', 1)) is distinct from 'plumink'
on conflict (discord_id) do nothing;

-- Ancrage explicite Kaliqot (si le profil n’existe pas encore / username atypique).
insert into public.site_admins (discord_id, display_label)
values ('243333369235111936', 'Kaliqot')
on conflict (discord_id) do nothing;

-- ---------------------------------------------------------------------------
-- site_announcements
-- ---------------------------------------------------------------------------

create table public.site_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index site_announcements_published_idx
  on public.site_announcements (status, starts_at, ends_at)
  where status = 'published';

alter table public.site_announcements enable row level security;

create policy site_announcements_public_read
  on public.site_announcements
  for select
  to anon, authenticated
  using (
    status = 'published'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

revoke insert, update, delete on table public.site_announcements from anon, authenticated;
grant select on table public.site_announcements to anon, authenticated;
grant all on table public.site_announcements to service_role;

-- ---------------------------------------------------------------------------
-- site_news
-- ---------------------------------------------------------------------------

create table public.site_news (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  excerpt text not null default '',
  body_markdown text not null default '',
  cover_url text,
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index site_news_published_idx
  on public.site_news (published_at desc nulls last)
  where status = 'published';

alter table public.site_news enable row level security;

create policy site_news_public_read
  on public.site_news
  for select
  to anon, authenticated
  using (status = 'published');

revoke insert, update, delete on table public.site_news from anon, authenticated;
grant select on table public.site_news to anon, authenticated;
grant all on table public.site_news to service_role;
