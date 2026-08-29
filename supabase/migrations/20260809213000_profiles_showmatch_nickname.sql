-- Pseudo utilisé par le bot showmatch (souvent différent du handle Discord @username).
alter table public.profiles
  add column if not exists showmatch_nickname text;

comment on column public.profiles.showmatch_nickname is
  'Pseudo tel qu''affiché par le bot Discord showmatch (ex. JuJu)), distinct du handle Discord.';

create index if not exists profiles_showmatch_nickname_lower_idx
  on public.profiles (lower(showmatch_nickname));
