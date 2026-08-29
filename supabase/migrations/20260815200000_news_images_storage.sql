-- Bucket public pour images des articles news (upload via API admin + service_role).

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'news-images',
  'news-images',
  true,
  5242880, -- 5 Mo
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lecture publique (URLs /object/public/…)
drop policy if exists news_images_public_read on storage.objects;
create policy news_images_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'news-images');

-- Pas d’écriture directe côté client : uploads via service_role uniquement.
drop policy if exists news_images_no_client_insert on storage.objects;
drop policy if exists news_images_no_client_update on storage.objects;
drop policy if exists news_images_no_client_delete on storage.objects;
