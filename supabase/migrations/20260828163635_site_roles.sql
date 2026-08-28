-- Rôles dashboard (scopes type Discord). Mutations via service_role après requireAdmin.

create table public.site_roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  color text not null default '#4A9B7F'
    check (color ~ '^#[0-9A-Fa-f]{6}$'),
  position integer not null default 0,
  is_system boolean not null default false,
  permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.site_roles is
  'Rôles staff : permissions (scopes) unionnées par membre. Slug administrateur = rôle système.';

create table public.site_role_members (
  role_id uuid not null references public.site_roles (id) on delete cascade,
  discord_id text not null
    check (discord_id ~ '^[0-9]{5,32}$'),
  assigned_at timestamptz not null default now(),
  primary key (role_id, discord_id)
);

create index site_role_members_discord_idx
  on public.site_role_members (discord_id);

alter table public.site_roles enable row level security;
alter table public.site_role_members enable row level security;

revoke all on table public.site_roles from anon, authenticated;
revoke all on table public.site_role_members from anon, authenticated;
grant select, insert, update, delete on table public.site_roles to service_role;
grant select, insert, update, delete on table public.site_role_members to service_role;

insert into public.site_roles (
  slug, name, color, position, is_system, permissions
)
values (
  'administrateur',
  'Administrateur',
  '#E74C3C',
  1000,
  true,
  array[
    'admin.administrator',
    'site.access',
    'admin.access',
    'admin.announcements',
    'admin.news',
    'admin.applications',
    'admin.members',
    'admin.roles'
  ]
)
on conflict (slug) do nothing;

insert into public.site_role_members (role_id, discord_id)
select r.id, a.discord_id
from public.site_roles r
cross join public.site_admins a
where r.slug = 'administrateur'
  and a.revoked_at is null
on conflict do nothing;
