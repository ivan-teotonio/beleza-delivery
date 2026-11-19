-- ============================================================
-- 0010 - Código de acesso (autenticação sem senha, SPEC v1.5)
-- ============================================================
-- Uso exclusivo das Edge Functions com service_role. Nenhum acesso
-- direto de anon/authenticated: RLS habilitada sem políticas.

create table if not exists public.codigo_acesso (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references public.usuario(id) on delete cascade,
  email         text not null,
  codigo_hash   text not null,
  expira_em     timestamptz not null default (now() + interval '1 year'),
  usado_em      timestamptz,
  tentativas    integer not null default 0 check (tentativas >= 0),
  revogado_em   timestamptz,
  criado_em     timestamptz not null default now()
);

create index if not exists codigo_acesso_email_idx
  on public.codigo_acesso (lower(email), criado_em desc);
create index if not exists codigo_acesso_expira_idx
  on public.codigo_acesso (expira_em);

alter table public.codigo_acesso enable row level security;

-- Deny-all para clientes: a tabela só é acessível por service_role.
revoke all on public.codigo_acesso from public, anon, authenticated;
grant select, insert, update, delete on public.codigo_acesso to service_role;

-- Limpeza de códigos antigos (mantém apenas agregados de auditoria).
create or replace function public.limpar_codigos_acesso_expirados()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_removidos integer;
begin
  delete from public.codigo_acesso
   where expira_em < now() - interval '90 days';
  get diagnostics v_removidos = row_count;
  return v_removidos;
end;
$$;

revoke all on function public.limpar_codigos_acesso_expirados() from public, anon, authenticated;
grant execute on function public.limpar_codigos_acesso_expirados() to service_role;

do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron indisponível: %', sqlerrm;
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'limpar-codigos-acesso') then
    perform cron.unschedule('limpar-codigos-acesso');
  end if;
  perform cron.schedule(
    'limpar-codigos-acesso',
    '17 3 * * *',
    'select public.limpar_codigos_acesso_expirados();'
  );
exception when others then
  raise notice 'Não foi possível agendar limpeza de códigos: %', sqlerrm;
end;
$$;
