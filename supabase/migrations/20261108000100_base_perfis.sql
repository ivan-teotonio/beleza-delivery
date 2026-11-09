-- ============================================================
-- 0001 - Base: extensões, perfis, endereço e auditoria
-- ============================================================
set search_path to public, extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;
create extension if not exists postgis with schema extensions;

-- Trigger genérico de atualizado_em
create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Usuário: espelha auth.users e guarda o papel
-- ------------------------------------------------------------
create table if not exists public.usuario (
  id            uuid primary key references auth.users(id) on delete cascade,
  tipo          text not null default 'cliente' check (tipo in ('cliente','profissional','admin')),
  email         text not null,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em   timestamptz
);
create unique index if not exists usuario_email_uidx on public.usuario (lower(email));

create table if not exists public.cliente (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null unique references public.usuario(id) on delete cascade,
  nome          text not null,
  telefone      text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.endereco (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null unique references public.cliente(id) on delete cascade,
  cep           text not null,
  rua           text not null,
  numero        text not null,
  complemento   text,
  bairro        text not null,
  cidade        text not null,
  localizacao   extensions.geography(Point,4326) not null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists endereco_geo_idx on public.endereco using gist (localizacao);

create table if not exists public.log_auditoria (
  id              uuid primary key default gen_random_uuid(),
  ator_usuario_id uuid references public.usuario(id) on delete set null,
  acao            text not null,
  entidade        text not null,
  entidade_id     uuid,
  detalhe_json    jsonb,
  criado_em       timestamptz not null default now()
);
create index if not exists log_auditoria_entidade_idx on public.log_auditoria (entidade, entidade_id);
create index if not exists log_auditoria_criado_idx on public.log_auditoria (criado_em desc);

-- ------------------------------------------------------------
-- Helpers de autorização (security definer evita recursão de RLS)
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuario u
    where u.id = auth.uid() and u.tipo = 'admin' and u.ativo
  );
$$;

create or replace function public.meu_cliente_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id from public.cliente c where c.usuario_id = auth.uid();
$$;

-- ------------------------------------------------------------
-- Perfil criado automaticamente no signup do Supabase Auth
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo text := coalesce(new.raw_user_meta_data->>'tipo', 'cliente');
  v_nome text := coalesce(nullif(new.raw_user_meta_data->>'nome', ''), split_part(new.email, '@', 1));
begin
  if v_tipo not in ('cliente', 'profissional') then
    v_tipo := 'cliente';
  end if;

  insert into public.usuario (id, tipo, email)
  values (new.id, v_tipo, new.email)
  on conflict (id) do nothing;

  if v_tipo = 'cliente' then
    insert into public.cliente (usuario_id, nome, telefone)
    values (new.id, v_nome, nullif(new.raw_user_meta_data->>'telefone', ''))
    on conflict (usuario_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.usuario enable row level security;
alter table public.cliente enable row level security;
alter table public.endereco enable row level security;
alter table public.log_auditoria enable row level security;

drop policy if exists usuario_select on public.usuario;
create policy usuario_select on public.usuario
for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists cliente_select on public.cliente;
create policy cliente_select on public.cliente
for select to authenticated
using (usuario_id = auth.uid() or public.is_admin());

drop policy if exists cliente_update on public.cliente;
create policy cliente_update on public.cliente
for update to authenticated
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

drop policy if exists endereco_select on public.endereco;
create policy endereco_select on public.endereco
for select to authenticated
using (cliente_id = public.meu_cliente_id() or public.is_admin());

drop policy if exists endereco_insert on public.endereco;
create policy endereco_insert on public.endereco
for insert to authenticated
with check (cliente_id = public.meu_cliente_id());

drop policy if exists endereco_update on public.endereco;
create policy endereco_update on public.endereco
for update to authenticated
using (cliente_id = public.meu_cliente_id())
with check (cliente_id = public.meu_cliente_id());

drop policy if exists endereco_delete on public.endereco;
create policy endereco_delete on public.endereco
for delete to authenticated
using (cliente_id = public.meu_cliente_id());

drop policy if exists log_auditoria_select on public.log_auditoria;
create policy log_auditoria_select on public.log_auditoria
for select to authenticated
using (public.is_admin());

-- Defesa em profundidade: anônimo não lê tabelas privadas
revoke all on public.usuario from anon;
revoke all on public.cliente from anon;
revoke all on public.endereco from anon;
revoke all on public.log_auditoria from anon;

-- ------------------------------------------------------------
-- Triggers de atualizado_em
-- ------------------------------------------------------------
drop trigger if exists usuario_atualizado on public.usuario;
create trigger usuario_atualizado before update on public.usuario
for each row execute function public.set_atualizado_em();

drop trigger if exists cliente_atualizado on public.cliente;
create trigger cliente_atualizado before update on public.cliente
for each row execute function public.set_atualizado_em();

drop trigger if exists endereco_atualizado on public.endereco;
create trigger endereco_atualizado before update on public.endereco
for each row execute function public.set_atualizado_em();
