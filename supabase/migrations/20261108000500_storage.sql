-- ============================================================
-- 0005 - Storage: portfólio público e documentos privados
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio', 'portfolio', true, 10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos', 'documentos', false, 10485760,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Portfólio: leitura pública, escrita no próprio prefixo <usuario_id>/...
drop policy if exists portfolio_read on storage.objects;
create policy portfolio_read on storage.objects
for select
using (bucket_id = 'portfolio');

drop policy if exists portfolio_insert on storage.objects;
create policy portfolio_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'portfolio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists portfolio_update on storage.objects;
create policy portfolio_update on storage.objects
for update to authenticated
using (
  bucket_id = 'portfolio'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'portfolio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists portfolio_delete on storage.objects;
create policy portfolio_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'portfolio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Documentos: privado; dono e admin
drop policy if exists documentos_select on storage.objects;
create policy documentos_select on storage.objects
for select to authenticated
using (
  bucket_id = 'documentos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists documentos_insert on storage.objects;
create policy documentos_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists documentos_update on storage.objects;
create policy documentos_update on storage.objects
for update to authenticated
using (
  bucket_id = 'documentos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
)
with check (
  bucket_id = 'documentos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists documentos_delete on storage.objects;
create policy documentos_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'documentos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);
