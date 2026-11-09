-- ============================================================
-- 0004 - Chat, avaliações, dispositivos e consultas agregadas
-- ============================================================
set search_path to public, extensions;

create table if not exists public.mensagem (
  id              uuid primary key default gen_random_uuid(),
  agendamento_id  uuid not null references public.agendamento(id) on delete cascade,
  remetente_id    uuid not null references public.usuario(id) on delete cascade,
  conteudo        text not null check (length(trim(conteudo)) between 1 and 2000),
  enviada_em      timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);
create index if not exists mensagem_agendamento_idx on public.mensagem (agendamento_id, enviada_em);

create table if not exists public.avaliacao (
  id               uuid primary key default gen_random_uuid(),
  agendamento_id   uuid not null unique references public.agendamento(id) on delete cascade,
  cliente_id       uuid not null references public.cliente(id),
  profissional_id  uuid not null references public.profissional(id),
  nota             integer not null check (nota between 1 and 5),
  comentario       text,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);
create index if not exists avaliacao_prof_idx on public.avaliacao (profissional_id, criado_em desc);

create table if not exists public.dispositivo (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid not null references public.usuario(id) on delete cascade,
  expo_push_token  text not null unique,
  plataforma       text not null default 'android',
  ultimo_uso_em    timestamptz not null default now(),
  revogado_em      timestamptz,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------
create or replace function public.participa_do_agendamento(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.agendamento a
    where a.id = p_id
      and (
        a.cliente_id = public.meu_cliente_id()
        or a.profissional_id = public.meu_profissional_id()
        or public.is_admin()
      )
  );
$$;

-- ------------------------------------------------------------
-- Avaliação (somente após atendimento concluído)
-- ------------------------------------------------------------
create or replace function public.avaliar_agendamento(
  p_agendamento_id uuid,
  p_nota integer,
  p_comentario text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ag public.agendamento;
  v_cliente uuid := public.meu_cliente_id();
  v_av public.avaliacao;
begin
  if p_nota is null or p_nota < 1 or p_nota > 5 then
    raise exception 'Nota deve estar entre 1 e 5';
  end if;

  select * into v_ag from public.agendamento where id = p_agendamento_id for update;
  if not found then
    raise exception 'Agendamento não encontrado';
  end if;
  if v_ag.cliente_id is distinct from v_cliente then
    raise exception 'Apenas o cliente do atendimento pode avaliar';
  end if;
  if v_ag.status <> 'concluido' then
    raise exception 'A avaliação é liberada após a conclusão do atendimento';
  end if;
  if exists (select 1 from public.avaliacao where agendamento_id = p_agendamento_id) then
    raise exception 'Este atendimento já foi avaliado';
  end if;

  insert into public.avaliacao (agendamento_id, cliente_id, profissional_id, nota, comentario)
  values (p_agendamento_id, v_cliente, v_ag.profissional_id, p_nota, nullif(trim(p_comentario), ''))
  returning * into v_av;

  perform public.registrar_log(
    'avaliacao_criada', 'avaliacao', v_av.id,
    jsonb_build_object('nota', p_nota)
  );

  return to_jsonb(v_av);
end;
$$;

-- ------------------------------------------------------------
-- Consultas agregadas de agendamentos (endereço mascarado por estado)
-- ------------------------------------------------------------
create or replace function public.listar_agendamentos()
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', a.id,
    'status', a.status,
    'inicio', a.inicio,
    'fim', a.fim,
    'distancia_km', a.distancia_km,
    'valor_deslocamento_centavos', a.valor_deslocamento_centavos,
    'total_centavos', a.total_centavos,
    'solicitado_em', a.solicitado_em,
    'responder_ate', a.responder_ate,
    'decidido_em', a.decidido_em,
    'motivo_recusa', a.motivo_recusa,
    'servico_id', a.servico_id,
    'servico_tipo', s.tipo,
    'servico_preco_centavos', s.preco_centavos,
    'servico_duracao_min', s.duracao_min,
    'profissional_id', a.profissional_id,
    'profissional_nome', p.nome,
    'profissional_foto_url', p.foto_url,
    'cliente_id', a.cliente_id,
    'cliente_nome', case
      when a.cliente_id = public.meu_cliente_id()
        or a.status in ('confirmado','concluido')
        or public.is_admin()
      then c.nome
      else split_part(c.nome, ' ', 1)
    end,
    'bairro', e.bairro,
    'cidade', e.cidade,
    'endereco_liberado', (
      a.cliente_id = public.meu_cliente_id()
      or public.is_admin()
      or (a.profissional_id = public.meu_profissional_id() and a.status in ('confirmado','concluido'))
    ),
    'cep', case when (
      a.cliente_id = public.meu_cliente_id()
      or public.is_admin()
      or (a.profissional_id = public.meu_profissional_id() and a.status in ('confirmado','concluido'))
    ) then e.cep end,
    'rua', case when (
      a.cliente_id = public.meu_cliente_id()
      or public.is_admin()
      or (a.profissional_id = public.meu_profissional_id() and a.status in ('confirmado','concluido'))
    ) then e.rua end,
    'numero', case when (
      a.cliente_id = public.meu_cliente_id()
      or public.is_admin()
      or (a.profissional_id = public.meu_profissional_id() and a.status in ('confirmado','concluido'))
    ) then e.numero end,
    'complemento', case when (
      a.cliente_id = public.meu_cliente_id()
      or public.is_admin()
      or (a.profissional_id = public.meu_profissional_id() and a.status in ('confirmado','concluido'))
    ) then e.complemento end,
    'endereco_lat', case when (
      a.cliente_id = public.meu_cliente_id()
      or public.is_admin()
      or (a.profissional_id = public.meu_profissional_id() and a.status in ('confirmado','concluido'))
    ) then extensions.st_y(e.localizacao::extensions.geometry) end,
    'endereco_lng', case when (
      a.cliente_id = public.meu_cliente_id()
      or public.is_admin()
      or (a.profissional_id = public.meu_profissional_id() and a.status in ('confirmado','concluido'))
    ) then extensions.st_x(e.localizacao::extensions.geometry) end,
    'avaliacao_nota', (select av.nota from public.avaliacao av where av.agendamento_id = a.id),
    'pode_avaliar', (
      a.cliente_id = public.meu_cliente_id()
      and a.status = 'concluido'
      and not exists (select 1 from public.avaliacao av where av.agendamento_id = a.id)
    ),
    'pode_confirmar', (
      a.profissional_id = public.meu_profissional_id() and a.status = 'pendente'
    ),
    'pode_cancelar', (
      a.status in ('pendente','confirmado')
      and (a.cliente_id = public.meu_cliente_id() or a.profissional_id = public.meu_profissional_id())
    ),
    'pode_concluir', (
      a.profissional_id = public.meu_profissional_id() and a.status = 'confirmado'
    )
  )
  from public.agendamento a
  join public.servico s on s.id = a.servico_id
  join public.profissional p on p.id = a.profissional_id
  join public.cliente c on c.id = a.cliente_id
  join public.endereco e on e.id = a.endereco_id
  where a.cliente_id = public.meu_cliente_id()
     or a.profissional_id = public.meu_profissional_id()
     or public.is_admin()
  order by a.inicio desc;
$$;

create or replace function public.detalhar_agendamento(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select t.value
  from public.listar_agendamentos() as t(value)
  where (t.value->>'id')::uuid = p_id
  limit 1;
$$;

-- ------------------------------------------------------------
-- Busca por proximidade e perfil público
-- ------------------------------------------------------------
create or replace function public.buscar_profissionais(
  p_lat double precision,
  p_lng double precision,
  p_tipo text default null,
  p_busca text default null,
  p_limite integer default 50
)
returns setof jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  with ponto as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as g
  )
  select jsonb_build_object(
    'id', p.id,
    'nome', p.nome,
    'foto_url', p.foto_url,
    'descricao', p.descricao,
    'bairro', p.endereco_ref_bairro,
    'cidade', p.endereco_ref_cidade,
    'distancia_maxima_km', p.distancia_maxima_km,
    'prazo_resposta_h', p.prazo_resposta_h,
    'distancia_km', round((extensions.st_distance(p.localizacao_ref, ponto.g) / 1000)::numeric, 2),
    'media_avaliacao', coalesce((
      select round(avg(av.nota)::numeric, 1)
      from public.avaliacao av where av.profissional_id = p.id
    ), 0),
    'total_avaliacoes', (
      select count(*) from public.avaliacao av where av.profissional_id = p.id
    ),
    'servicos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'tipo', s.tipo,
        'preco_centavos', s.preco_centavos, 'duracao_min', s.duracao_min
      ) order by s.preco_centavos)
      from public.servico s
      where s.profissional_id = p.id and s.ativo
    ), '[]'::jsonb)
  )
  from public.profissional p, ponto
  where p.status_verificacao = 'aprovado'
    and p.ativo
    and extensions.st_dwithin(p.localizacao_ref, ponto.g, p.distancia_maxima_km * 1000)
    and (
      p_tipo is null
      or exists (
        select 1 from public.servico s
        where s.profissional_id = p.id and s.ativo and s.tipo ilike '%' || p_tipo || '%'
      )
    )
    and (p_busca is null or p.nome ilike '%' || p_busca || '%')
    and exists (select 1 from public.faixa_deslocamento f where f.profissional_id = p.id)
  order by extensions.st_distance(p.localizacao_ref, ponto.g)
  limit least(greatest(coalesce(p_limite, 50), 1), 100);
$$;

create or replace function public.obter_profissional_publico(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id,
    'nome', p.nome,
    'foto_url', p.foto_url,
    'descricao', p.descricao,
    'bairro', p.endereco_ref_bairro,
    'cidade', p.endereco_ref_cidade,
    'distancia_maxima_km', p.distancia_maxima_km,
    'prazo_resposta_h', p.prazo_resposta_h,
    'media_avaliacao', coalesce((
      select round(avg(av.nota)::numeric, 1)
      from public.avaliacao av where av.profissional_id = p.id
    ), 0),
    'total_avaliacoes', (
      select count(*) from public.avaliacao av where av.profissional_id = p.id
    ),
    'servicos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'tipo', s.tipo,
        'preco_centavos', s.preco_centavos, 'duracao_min', s.duracao_min
      ) order by s.preco_centavos)
      from public.servico s
      where s.profissional_id = p.id and s.ativo
    ), '[]'::jsonb),
    'faixas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'limite_km', f.limite_km,
        'valor_centavos', f.valor_centavos, 'ordem', f.ordem
      ) order by f.ordem)
      from public.faixa_deslocamento f
      where f.profissional_id = p.id
    ), '[]'::jsonb),
    'portfolio', coalesce((
      select jsonb_agg(jsonb_build_object('id', fp.id, 'url', fp.url) order by fp.enviada_em desc)
      from public.foto_portfolio fp
      where fp.profissional_id = p.id
    ), '[]'::jsonb),
    'avaliacoes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nota', av.nota,
        'comentario', av.comentario,
        'criado_em', av.criado_em,
        'cliente_nome', split_part(c.nome, ' ', 1)
      ) order by av.criado_em desc)
      from public.avaliacao av
      join public.cliente c on c.id = av.cliente_id
      where av.profissional_id = p.id
    ), '[]'::jsonb)
  )
  from public.profissional p
  where p.id = p_id and p.status_verificacao = 'aprovado' and p.ativo;
$$;

-- ------------------------------------------------------------
-- Relatório do profissional
-- ------------------------------------------------------------
create or replace function public.relatorio_profissional(
  p_inicio date,
  p_fim date
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select a.*
    from public.agendamento a
    where a.profissional_id = public.meu_profissional_id()
      and a.inicio >= p_inicio
      and a.inicio < (p_fim + 1)
  )
  select jsonb_build_object(
    'periodo_inicio', p_inicio,
    'periodo_fim', p_fim,
    'total_atendimentos', (select count(*) from base where status = 'concluido'),
    'receita_servicos_centavos', coalesce((
      select sum(total_centavos - coalesce(valor_deslocamento_centavos, 0))
      from base where status = 'concluido'
    ), 0),
    'receita_deslocamento_centavos', coalesce((
      select sum(valor_deslocamento_centavos) from base where status = 'concluido'
    ), 0),
    'receita_total_centavos', coalesce((
      select sum(total_centavos) from base where status = 'concluido'
    ), 0),
    'cancelados', (select count(*) from base where status = 'cancelado'),
    'media_avaliacao', coalesce((
      select round(avg(av.nota)::numeric, 1)
      from public.avaliacao av
      join base b on b.id = av.agendamento_id
    ), 0)
  );
$$;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.mensagem enable row level security;
alter table public.avaliacao enable row level security;
alter table public.dispositivo enable row level security;

drop policy if exists mensagem_select on public.mensagem;
create policy mensagem_select on public.mensagem
for select to authenticated
using (public.participa_do_agendamento(agendamento_id));

drop policy if exists mensagem_insert on public.mensagem;
create policy mensagem_insert on public.mensagem
for insert to authenticated
with check (
  remetente_id = auth.uid()
  and public.participa_do_agendamento(agendamento_id)
);

drop policy if exists avaliacao_select on public.avaliacao;
create policy avaliacao_select on public.avaliacao
for select to authenticated
using (
  cliente_id = public.meu_cliente_id()
  or public.profissional_e_publico(profissional_id)
  or public.is_admin()
);

drop policy if exists dispositivo_all on public.dispositivo;
create policy dispositivo_all on public.dispositivo
for all to authenticated
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

revoke insert, update, delete on public.avaliacao from anon, authenticated;
grant select on public.avaliacao to authenticated;
revoke update, delete on public.mensagem from anon, authenticated;

-- ------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------
drop trigger if exists mensagem_atualizado on public.mensagem;
create trigger mensagem_atualizado before update on public.mensagem
for each row execute function public.set_atualizado_em();

drop trigger if exists avaliacao_atualizado on public.avaliacao;
create trigger avaliacao_atualizado before update on public.avaliacao
for each row execute function public.set_atualizado_em();

drop trigger if exists dispositivo_atualizado on public.dispositivo;
create trigger dispositivo_atualizado before update on public.dispositivo
for each row execute function public.set_atualizado_em();

-- ------------------------------------------------------------
-- Realtime
-- ------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.mensagem;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.agendamento;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

-- ------------------------------------------------------------
-- Permissões de execução
-- ------------------------------------------------------------
revoke all on function public.avaliar_agendamento(uuid, integer, text) from public;
grant execute on function public.avaliar_agendamento(uuid, integer, text) to authenticated;

revoke all on function public.listar_agendamentos() from public;
grant execute on function public.listar_agendamentos() to authenticated;

revoke all on function public.detalhar_agendamento(uuid) from public;
grant execute on function public.detalhar_agendamento(uuid) to authenticated;

revoke all on function public.buscar_profissionais(double precision, double precision, text, text, integer) from public;
grant execute on function public.buscar_profissionais(double precision, double precision, text, text, integer) to authenticated;

revoke all on function public.obter_profissional_publico(uuid) from public;
grant execute on function public.obter_profissional_publico(uuid) to authenticated;

revoke all on function public.relatorio_profissional(date, date) from public;
grant execute on function public.relatorio_profissional(date, date) to authenticated;
