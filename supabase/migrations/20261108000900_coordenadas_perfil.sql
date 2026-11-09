-- ============================================================
-- 0009 - Coordenadas do perfil (edição de localização de referência)
-- ============================================================
set search_path to public, extensions;

create or replace function public.meu_perfil()
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'usuario', (select to_jsonb(u) from public.usuario u where u.id = auth.uid()),
    'cliente', (select to_jsonb(c) from public.cliente c where c.usuario_id = auth.uid()),
    'profissional', (select to_jsonb(p) from public.profissional p where p.usuario_id = auth.uid()),
    'endereco', (
      select to_jsonb(e)
      from public.endereco e
      join public.cliente c on c.id = e.cliente_id
      where c.usuario_id = auth.uid()
    ),
    'endereco_lat', (
      select extensions.st_y(e.localizacao::extensions.geometry)
      from public.endereco e
      join public.cliente c on c.id = e.cliente_id
      where c.usuario_id = auth.uid()
    ),
    'endereco_lng', (
      select extensions.st_x(e.localizacao::extensions.geometry)
      from public.endereco e
      join public.cliente c on c.id = e.cliente_id
      where c.usuario_id = auth.uid()
    ),
    'profissional_lat', (
      select extensions.st_y(p.localizacao_ref::extensions.geometry)
      from public.profissional p
      where p.usuario_id = auth.uid()
    ),
    'profissional_lng', (
      select extensions.st_x(p.localizacao_ref::extensions.geometry)
      from public.profissional p
      where p.usuario_id = auth.uid()
    )
  );
$$;

revoke all on function public.meu_perfil() from public;
grant execute on function public.meu_perfil() to authenticated;
