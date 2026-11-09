-- ============================================================
-- 0002 - Profissionais, faixas de deslocamento e serviços
-- ============================================================
set search_path to public, extensions;

create table if not exists public.profissional (
  id                  uuid primary key default gen_random_uuid(),
  usuario_id          uuid not null unique references public.usuario(id) on delete cascade,
  nome                text not null,
  cpf                 text not null unique check (cpf ~ '^[0-9]{11}$'),
  telefone            text,
  foto_url            text,
  documento_chave     text,
  status_verificacao  text not null default 'pendente'
                      check (status_verificacao in ('pendente','aprovado','reprovado')),
  localizacao_ref     extensions.geography(Point,4326) not null,
  endereco_ref_bairro text not null,
  endereco_ref_cidade text not null,
  distancia_maxima_km numeric(6,2) not null check (distancia_maxima_km > 0 and distancia_maxima_km <= 100),
  prazo_resposta_h    integer not null default 24 check (prazo_resposta_h between 1 and 72),
  descricao           text,
  ativo               boolean not null default true,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);
create index if not exists profissional_geo_idx on public.profissional using gist (localizacao_ref);
create index if not exists profissional_status_idx on public.profissional (status_verificacao, ativo);

create table if not exists public.faixa_deslocamento (
  id               uuid primary key default gen_random_uuid(),
  profissional_id  uuid not null references public.profissional(id) on delete cascade,
  limite_km        numeric(6,2) not null check (limite_km > 0 and limite_km <= 100),
  valor_centavos   integer not null check (valor_centavos >= 0),
  ordem            integer not null check (ordem >= 1),
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  unique (profissional_id, limite_km),
  unique (profissional_id, ordem)
);

create table if not exists public.servico (
  id               uuid primary key default gen_random_uuid(),
  profissional_id  uuid not null references public.profissional(id) on delete cascade,
  tipo             text not null check (length(trim(tipo)) > 0),
  preco_centavos   integer not null check (preco_centavos >= 0),
  duracao_min      integer not null check (duracao_min between 15 and 480),
  ativo            boolean not null default true,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);
create index if not exists servico_prof_idx on public.servico (profissional_id, ativo);
create index if not exists servico_tipo_idx on public.servico (tipo);

create table if not exists public.foto_portfolio (
  id               uuid primary key default gen_random_uuid(),
  profissional_id  uuid not null references public.profissional(id) on delete cascade,
  url              text not null,
  storage_path     text,
  enviada_em       timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);
create index if not exists foto_portfolio_prof_idx on public.foto_portfolio (profissional_id, enviada_em desc);

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------
create or replace function public.meu_profissional_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id from public.profissional p where p.usuario_id = auth.uid();
$$;

create or replace function public.profissional_e_publico(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profissional p
    where p.id = p_id and p.status_verificacao = 'aprovado' and p.ativo
  );
$$;

create or replace function public.registrar_log(
  p_acao text,
  p_entidade text,
  p_entidade_id uuid,
  p_detalhe jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.log_auditoria (ator_usuario_id, acao, entidade, entidade_id, detalhe_json)
  values (auth.uid(), p_acao, p_entidade, p_entidade_id, p_detalhe);
$$;

create or replace function public.validar_faixas(p_distancia_maxima_km numeric, p_faixas jsonb)
returns void
language plpgsql
immutable
as $$
declare
  v_prev  numeric := 0;
  v_ordem integer := 0;
  v_total integer;
  v_faixa record;
begin
  if p_distancia_maxima_km is null or p_distancia_maxima_km <= 0 or p_distancia_maxima_km > 100 then
    raise exception 'Distância máxima inválida';
  end if;
  if p_faixas is null or jsonb_typeof(p_faixas) <> 'array' then
    raise exception 'Faixas de deslocamento inválidas';
  end if;

  v_total := jsonb_array_length(p_faixas);
  if v_total = 0 then
    raise exception 'Informe ao menos uma faixa de deslocamento';
  end if;

  for v_faixa in
    select *
    from jsonb_to_recordset(p_faixas)
      as x(limite_km numeric, valor_centavos integer, ordem integer)
    order by ordem
  loop
    v_ordem := v_ordem + 1;
    if v_faixa.ordem is distinct from v_ordem then
      raise exception 'Ordem das faixas inválida';
    end if;
    if v_faixa.limite_km is null or v_faixa.limite_km <= v_prev then
      raise exception 'Os limites das faixas devem ser crescentes e sem sobreposição';
    end if;
    if v_faixa.valor_centavos is null or v_faixa.valor_centavos < 0 then
      raise exception 'Valor de faixa inválido';
    end if;
    v_prev := v_faixa.limite_km;
  end loop;

  if v_prev <> p_distancia_maxima_km then
    raise exception 'A última faixa (%) deve corresponder à distância máxima (%)',
      v_prev, p_distancia_maxima_km;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Perfil profissional (onboarding transacional)
-- ------------------------------------------------------------
create or replace function public.criar_perfil_profissional(
  p_nome text,
  p_cpf text,
  p_telefone text,
  p_bairro text,
  p_cidade text,
  p_lat double precision,
  p_lng double precision,
  p_descricao text,
  p_distancia_maxima_km numeric,
  p_faixas jsonb
)
returns public.profissional
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_prof public.profissional;
begin
  if v_user is null then
    raise exception 'Sessão expirada';
  end if;
  if not exists (select 1 from public.usuario where id = v_user and tipo = 'profissional') then
    raise exception 'Conta não é de profissional';
  end if;
  if exists (select 1 from public.profissional where usuario_id = v_user) then
    raise exception 'Perfil profissional já existe';
  end if;
  if p_cpf is null or p_cpf !~ '^[0-9]{11}$' then
    raise exception 'CPF inválido';
  end if;
  if p_lat is null or p_lng is null or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    raise exception 'Localização inválida';
  end if;
  if p_bairro is null or length(trim(p_bairro)) = 0 or p_cidade is null or length(trim(p_cidade)) = 0 then
    raise exception 'Informe bairro e cidade de referência';
  end if;

  perform public.validar_faixas(p_distancia_maxima_km, p_faixas);

  insert into public.profissional (
    usuario_id, nome, cpf, telefone, localizacao_ref,
    endereco_ref_bairro, endereco_ref_cidade, distancia_maxima_km, descricao
  ) values (
    v_user, trim(p_nome), p_cpf, p_telefone,
    extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
    trim(p_bairro), trim(p_cidade), p_distancia_maxima_km, p_descricao
  )
  returning * into v_prof;

  insert into public.faixa_deslocamento (profissional_id, limite_km, valor_centavos, ordem)
  select v_prof.id, x.limite_km, x.valor_centavos, x.ordem
  from jsonb_to_recordset(p_faixas) as x(limite_km numeric, valor_centavos integer, ordem integer);

  perform public.registrar_log(
    'profissional_cadastrado', 'profissional', v_prof.id,
    jsonb_build_object('distancia_maxima_km', p_distancia_maxima_km, 'faixas', p_faixas)
  );

  return v_prof;
end;
$$;

create or replace function public.atualizar_perfil_profissional(
  p_nome text,
  p_telefone text,
  p_bairro text,
  p_cidade text,
  p_lat double precision,
  p_lng double precision,
  p_descricao text,
  p_prazo_resposta_h integer
)
returns public.profissional
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid := public.meu_profissional_id();
  v_prof public.profissional;
begin
  if v_id is null then
    raise exception 'Perfil profissional não encontrado';
  end if;
  if p_lat is null or p_lng is null or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    raise exception 'Localização inválida';
  end if;
  if p_prazo_resposta_h is not null and (p_prazo_resposta_h < 1 or p_prazo_resposta_h > 72) then
    raise exception 'Prazo de resposta deve estar entre 1 e 72 horas';
  end if;

  update public.profissional
     set nome = coalesce(nullif(trim(p_nome), ''), nome),
         telefone = p_telefone,
         endereco_ref_bairro = coalesce(nullif(trim(p_bairro), ''), endereco_ref_bairro),
         endereco_ref_cidade = coalesce(nullif(trim(p_cidade), ''), endereco_ref_cidade),
         localizacao_ref = extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
         descricao = p_descricao,
         prazo_resposta_h = coalesce(p_prazo_resposta_h, prazo_resposta_h)
   where id = v_id
  returning * into v_prof;

  perform public.registrar_log('profissional_atualizado', 'profissional', v_id, '{}'::jsonb);
  return v_prof;
end;
$$;

create or replace function public.salvar_config_deslocamento(
  p_distancia_maxima_km numeric,
  p_faixas jsonb
)
returns public.profissional
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.meu_profissional_id();
  v_prof public.profissional;
begin
  if v_id is null then
    raise exception 'Perfil profissional não encontrado';
  end if;

  perform public.validar_faixas(p_distancia_maxima_km, p_faixas);

  delete from public.faixa_deslocamento where profissional_id = v_id;

  insert into public.faixa_deslocamento (profissional_id, limite_km, valor_centavos, ordem)
  select v_id, x.limite_km, x.valor_centavos, x.ordem
  from jsonb_to_recordset(p_faixas) as x(limite_km numeric, valor_centavos integer, ordem integer);

  update public.profissional
     set distancia_maxima_km = p_distancia_maxima_km
   where id = v_id
  returning * into v_prof;

  perform public.registrar_log(
    'config_deslocamento_atualizada', 'profissional', v_id,
    jsonb_build_object('distancia_maxima_km', p_distancia_maxima_km, 'faixas', p_faixas)
  );

  return v_prof;
end;
$$;

-- ------------------------------------------------------------
-- Perfil completo do usuário autenticado (cliente ou profissional)
-- ------------------------------------------------------------
create or replace function public.meu_perfil()
returns jsonb
language sql
stable
security definer
set search_path = public
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
    )
  );
$$;

-- ------------------------------------------------------------
-- Administração
-- ------------------------------------------------------------
create or replace function public.listar_profissionais(p_status text default null)
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(p)
  from public.profissional p
  where public.is_admin()
    and (p_status is null or p.status_verificacao = p_status)
  order by p.criado_em desc;
$$;

create or replace function public.aprovar_profissional(
  p_id uuid,
  p_aprovar boolean,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prof public.profissional;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem aprovar profissionais';
  end if;

  update public.profissional
     set status_verificacao = case when p_aprovar then 'aprovado' else 'reprovado' end
   where id = p_id
  returning * into v_prof;

  if not found then
    raise exception 'Profissional não encontrado';
  end if;

  perform public.registrar_log(
    case when p_aprovar then 'profissional_aprovado' else 'profissional_reprovado' end,
    'profissional', p_id,
    jsonb_build_object('motivo', p_motivo)
  );

  return to_jsonb(v_prof);
end;
$$;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.profissional enable row level security;
alter table public.faixa_deslocamento enable row level security;
alter table public.servico enable row level security;
alter table public.foto_portfolio enable row level security;

drop policy if exists profissional_select on public.profissional;
create policy profissional_select on public.profissional
for select to authenticated
using (usuario_id = auth.uid() or public.is_admin());

drop policy if exists profissional_update on public.profissional;
create policy profissional_update on public.profissional
for update to authenticated
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

drop policy if exists faixa_select on public.faixa_deslocamento;
create policy faixa_select on public.faixa_deslocamento
for select to authenticated
using (
  profissional_id = public.meu_profissional_id()
  or public.profissional_e_publico(profissional_id)
  or public.is_admin()
);

drop policy if exists servico_select on public.servico;
create policy servico_select on public.servico
for select to authenticated
using (
  profissional_id = public.meu_profissional_id()
  or public.profissional_e_publico(profissional_id)
  or public.is_admin()
);

drop policy if exists servico_insert on public.servico;
create policy servico_insert on public.servico
for insert to authenticated
with check (profissional_id = public.meu_profissional_id());

drop policy if exists servico_update on public.servico;
create policy servico_update on public.servico
for update to authenticated
using (profissional_id = public.meu_profissional_id())
with check (profissional_id = public.meu_profissional_id());

drop policy if exists servico_delete on public.servico;
create policy servico_delete on public.servico
for delete to authenticated
using (profissional_id = public.meu_profissional_id());

drop policy if exists foto_select on public.foto_portfolio;
create policy foto_select on public.foto_portfolio
for select to authenticated
using (
  profissional_id = public.meu_profissional_id()
  or public.profissional_e_publico(profissional_id)
  or public.is_admin()
);

drop policy if exists foto_insert on public.foto_portfolio;
create policy foto_insert on public.foto_portfolio
for insert to authenticated
with check (profissional_id = public.meu_profissional_id());

drop policy if exists foto_delete on public.foto_portfolio;
create policy foto_delete on public.foto_portfolio
for delete to authenticated
using (profissional_id = public.meu_profissional_id());

-- Dados sensíveis (CPF, documento) não são legíveis diretamente pelo cliente;
-- o perfil próprio e a listagem administrativa passam por RPC.
revoke all on public.profissional from anon;
revoke all on public.profissional from authenticated;

-- ------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------
drop trigger if exists profissional_atualizado on public.profissional;
create trigger profissional_atualizado before update on public.profissional
for each row execute function public.set_atualizado_em();

drop trigger if exists faixa_atualizado on public.faixa_deslocamento;
create trigger faixa_atualizado before update on public.faixa_deslocamento
for each row execute function public.set_atualizado_em();

drop trigger if exists servico_atualizado on public.servico;
create trigger servico_atualizado before update on public.servico
for each row execute function public.set_atualizado_em();

drop trigger if exists foto_atualizado on public.foto_portfolio;
create trigger foto_atualizado before update on public.foto_portfolio
for each row execute function public.set_atualizado_em();

-- ------------------------------------------------------------
-- Permissões de execução
-- ------------------------------------------------------------
revoke all on function public.criar_perfil_profissional(text,text,text,text,text,double precision,double precision,text,numeric,jsonb) from public;
grant execute on function public.criar_perfil_profissional(text,text,text,text,text,double precision,double precision,text,numeric,jsonb) to authenticated;

revoke all on function public.atualizar_perfil_profissional(text,text,text,text,double precision,double precision,text,integer) from public;
grant execute on function public.atualizar_perfil_profissional(text,text,text,text,double precision,double precision,text,integer) to authenticated;

revoke all on function public.salvar_config_deslocamento(numeric, jsonb) from public;
grant execute on function public.salvar_config_deslocamento(numeric, jsonb) to authenticated;

revoke all on function public.meu_perfil() from public;
grant execute on function public.meu_perfil() to authenticated;

revoke all on function public.listar_profissionais(text) from public;
grant execute on function public.listar_profissionais(text) to authenticated;

revoke all on function public.aprovar_profissional(uuid, boolean, text) from public;
grant execute on function public.aprovar_profissional(uuid, boolean, text) to authenticated;
