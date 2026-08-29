-- Anti-spam : 3 candidatures maximum par personne sur 30 jours glissants.
-- Le garde-fou vit en base : l’insert passe par le client utilisateur (RLS),
-- donc une vérification applicative seule serait contournable via l’API.

create or replace function public.enforce_application_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  select count(*)
    into recent_count
  from public.site_applications
  where user_id = new.user_id
    and created_at > now() - interval '30 days';

  if recent_count >= 3 then
    raise exception 'application_quota_exceeded'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.enforce_application_quota() is
  'Limite anti-spam : 3 candidatures par utilisateur sur 30 jours glissants.';

drop trigger if exists site_applications_quota on public.site_applications;

create trigger site_applications_quota
  before insert on public.site_applications
  for each row
  execute function public.enforce_application_quota();

create index if not exists site_applications_user_created_idx
  on public.site_applications (user_id, created_at desc);
