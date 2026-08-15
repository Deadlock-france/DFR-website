-- Cache des traductions DeepL des patch notes Steam.
-- Écriture : service_role uniquement. Lecture publique (optionnelle).

create table public.patch_note_translations (
  gid text primary key,
  appid integer not null default 1422450,
  source_title text not null,
  source_contents text not null,
  title_fr text not null,
  contents_fr text not null,
  translation_source text not null default 'deepl'
    check (translation_source = 'deepl'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index patch_note_translations_appid_idx
  on public.patch_note_translations (appid);

create trigger patch_note_translations_set_updated_at
before update on public.patch_note_translations
for each row
execute function public.set_updated_at();

alter table public.patch_note_translations enable row level security;

create policy "patch_note_translations_select_public"
  on public.patch_note_translations
  for select
  to anon, authenticated
  using (true);

grant select on public.patch_note_translations to anon, authenticated;
