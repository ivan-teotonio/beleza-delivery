-- ============================================================
-- 0003 - Agenda e agendamentos transacionais
-- ============================================================
set search_path to public, extensions;

create table if not exists public.agenda (
  id               uuid primary key default gen_random_uuid(),
  profissional_id  uuid not null references public.profissional(id) on delete cascade,
  inicio           timestamptz not null,
  fim              timestamptz not null,
  status           text not null default 'disponivel'
                   check (status in ('disponivel','reservado','ocupado')),
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  check (fim > inicio),
  unique (profissional_id, inicio)
);
alter table public.agenda
  drop constraint if exists agenda_sem_sobreposicao;
alter table public.agenda
  add constraint agenda_sem_sobreposicao
  exclude using gist (profissional_id with =, tstzrange(inicio, fim) with &&);
create index if not exists agenda_prof_idx on public.agenda (profissional_id, inicio);

create table if not exists public.agendamento (
  id                          uuid primary key default gen_random_uuid(),
  cliente_id                  uuid not null references public.cliente(id),
  profissional_id             uuid not null references public.profissional(id),
  servico_id                  uuid not null references public.servico(id),
  endereco_id                 uuid not null references public.endereco(id),
  agenda_id                   uuid references public.agenda(id) on delete set null,
  inicio                      timestamptz not null,
  fim                         timestamptz not null,
  status                      text not null default 'pendente'
                              check (status in ('pendente','confirmado','recusado','cancelado','concluido','expirado')),
  distancia_km                numeric(6,2),
  valor_deslocamento_centavos integer check (valor_deslocamento_centavos is null or valor_deslocamento_centavos >= 0),
  total_centavos              integer check (total_centavos is null or total_centavos >= 0),
  solicitado_em               timestamptz not null default now(),
  responder_ate               timestamptz not null,
  decidido_em                 timestamptz,
  motivo_recusa               text,
  chave_idempotencia          text not null unique,
  criado_em                   timestamptz not null default now(),
  atualizado_em               timestamptz not null default now(),
  check (fim > inicio)
);
alter table public.agendamento
  drop constraint if exists ag_prof_sem_sobreposicao;
alter table public.agendamento
  add constraint ag_prof_sem_sobreposicao
  exclude using gist (
    profissional_id with =,
    tstzrange(inicio, fim) with &&
  ) where (status in ('pendente','confirmado'));
alter table public.agendamento
  drop constraint if exists ag_cliente_sem_sobreposicao;
alter table public.agendamento
  add constraint ag_cliente_sem_sobreposicao
  exclude using gist (
    cliente_id with =,
    tstzrange(inicio, fim) with &&
  ) where (status in ('pendente','confirmado'));
create index if not exists agendamento_prof_idx on public.agendamento (profissional_id, inicio);
create index if not exists agendamento_cli_idx on public.agendamento (cliente_id, inicio);
create index if not exists agendamento_status_idx on public.agendamento (status, responder_ate);

-- ------------------------------------------------------------
-- Solicitação (idempotente, congela distância e valores)
-- ------------------------------------------------------------
create or replace function public.solicitar_agendamento(
  p_profissional_id uuid,
  p_servico_id uuid,
  p_endereco_id uuid,
  p_inicio timestamptz,
  p_chave_idempotencia text
)
returns public.agendamento
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cliente   public.cliente;
  v_prof      public.profissional;
  v_servico   public.servico;
  v_end       public.endereco;
  v_agenda    public.agenda;
  v_existente public.agendamento;
  v_dist      numeric(6,2);
  v_faixa     public.faixa_deslocamento;
  v_ag        public.agendamento;
  v_fim       timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada';
  end if;
  if p_chave_idempotencia is null or length(trim(p_chave_idempotencia)) < 8 then
    raise exception 'Chave de idempotência inválida';
  end if;

  select * into v_existente
  from public.agendamento
  where chave_idempotencia = p_chave_idempotencia;
  if found then
    return v_existente;
  end if;

  select * into v_cliente from public.cliente where usuario_id = auth.uid();
  if not found then
    raise exception 'Cliente não encontrado';
  end if;

  select * into v_prof
  from public.profissional
  where id = p_profissional_id and status_verificacao = 'aprovado' and ativo;
  if not found then
    raise exception 'Profissional indisponível';
  end if;

  select * into v_servico
  from public.servico
  where id = p_servico_id and profissional_id = v_prof.id and ativo;
  if not found then
    raise exception 'Serviço inválido';
  end if;

  select * into v_end
  from public.endereco
  where id = p_endereco_id and cliente_id = v_cliente.id;
  if not found then
    raise exception 'Endereço inválido';
  end if;

  select * into v_agenda
  from public.agenda
  where profissional_id = v_prof.id and inicio = p_inicio
  for update;
  if not found or v_agenda.status <> 'disponivel' then
    raise exception 'Horário indisponível';
  end if;

  v_fim := p_inicio + make_interval(mins => v_servico.duracao_min);
  if v_agenda.fim < v_fim then
    raise exception 'Horário não comporta a duração do serviço';
  end if;

  v_dist := round(
    (extensions.st_distance(v_prof.localizacao_ref, v_end.localizacao) / 1000)::numeric,
    2
  );

  if v_dist > v_prof.distancia_maxima_km then
    raise exception 'Profissional não atende tão longe';
  end if;

  select * into v_faixa
  from public.faixa_deslocamento
  where profissional_id = v_prof.id and limite_km >= v_dist
  order by limite_km asc
  limit 1;
  if not found then
    raise exception 'Faixa de deslocamento indisponível';
  end if;

  begin
    insert into public.agendamento (
      cliente_id, profissional_id, servico_id, endereco_id, agenda_id,
      inicio, fim, status, distancia_km, valor_deslocamento_centavos,
      total_centavos, responder_ate, chave_idempotencia
    ) values (
      v_cliente.id, v_prof.id, v_servico.id, v_end.id, v_agenda.id,
      p_inicio, v_fim, 'pendente', v_dist, v_faixa.valor_centavos,
      v_servico.preco_centavos + v_faixa.valor_centavos,
      now() + make_interval(hours => v_prof.prazo_resposta_h),
      trim(p_chave_idempotencia)
    )
    returning * into v_ag;
  exception
    when exclusion_violation then
      raise exception 'Horário indisponível';
    when unique_violation then
      select * into v_existente from public.agendamento
      where chave_idempotencia = trim(p_chave_idempotencia);
      if found then
        return v_existente;
      end if;
      raise exception 'Horário indisponível';
  end;

  update public.agenda set status = 'reservado' where id = v_agenda.id;

  perform public.registrar_log(
    'agendamento_solicitado', 'agendamento', v_ag.id,
    jsonb_build_object(
      'distancia_km', v_dist,
      'valor_deslocamento_centavos', v_faixa.valor_centavos,
      'total_centavos', v_ag.total_centavos
    )
  );

  return v_ag;
end;
$$;

-- ------------------------------------------------------------
-- Decisão do profissional
-- ------------------------------------------------------------
create or replace function public.decidir_agendamento(
  p_id uuid,
  p_aceitar boolean,
  p_motivo text default null
)
returns public.agendamento
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ag public.agendamento;
begin
  select * into v_ag from public.agendamento where id = p_id for update;
  if not found then
    raise exception 'Agendamento não encontrado';
  end if;
  if v_ag.profissional_id is distinct from public.meu_profissional_id() then
    raise exception 'Apenas o profissional do agendamento pode decidir';
  end if;
  if v_ag.status <> 'pendente' then
    return v_ag;
  end if;

  -- Prazo vencido: expira em vez de aceitar/recusar
  if now() > v_ag.responder_ate then
    update public.agendamento
       set status = 'expirado'
     where id = v_ag.id
    returning * into v_ag;
    if v_ag.agenda_id is not null then
      update public.agenda set status = 'disponivel' where id = v_ag.agenda_id;
    end if;
    perform public.registrar_log('agendamento_expirado', 'agendamento', v_ag.id, '{}'::jsonb);
    return v_ag;
  end if;

  update public.agendamento
     set status = case when p_aceitar then 'confirmado' else 'recusado' end,
         decidido_em = now(),
         motivo_recusa = case when p_aceitar then null else p_motivo end
   where id = v_ag.id
  returning * into v_ag;

  if v_ag.agenda_id is not null then
    update public.agenda
       set status = case when p_aceitar then 'ocupado' else 'disponivel' end
     where id = v_ag.agenda_id;
  end if;

  perform public.registrar_log(
    case when p_aceitar then 'agendamento_confirmado' else 'agendamento_recusado' end,
    'agendamento', v_ag.id,
    jsonb_build_object('motivo', p_motivo)
  );

  return v_ag;
end;
$$;

-- ------------------------------------------------------------
-- Cancelamento (cliente ou profissional)
-- ------------------------------------------------------------
create or replace function public.cancelar_agendamento(
  p_id uuid,
  p_motivo text default null
)
returns public.agendamento
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ag public.agendamento;
  v_cliente uuid := public.meu_cliente_id();
  v_prof uuid := public.meu_profissional_id();
begin
  select * into v_ag from public.agendamento where id = p_id for update;
  if not found then
    raise exception 'Agendamento não encontrado';
  end if;
  if v_ag.cliente_id is distinct from v_cliente and v_ag.profissional_id is distinct from v_prof and not public.is_admin() then
    raise exception 'Sem permissão para cancelar este agendamento';
  end if;
  if v_ag.status not in ('pendente','confirmado') then
    raise exception 'Este agendamento não pode mais ser cancelado';
  end if;
  if v_ag.cliente_id = v_cliente and v_ag.inicio - now() < interval '2 hours' then
    raise exception 'Cancelamento permitido somente até 2 horas antes do horário';
  end if;

  update public.agendamento
     set status = 'cancelado'
   where id = v_ag.id
  returning * into v_ag;

  if v_ag.agenda_id is not null then
    update public.agenda set status = 'disponivel' where id = v_ag.agenda_id;
  end if;

  perform public.registrar_log(
    'agendamento_cancelado', 'agendamento', v_ag.id,
    jsonb_build_object('motivo', p_motivo, 'por_cliente', v_ag.cliente_id = v_cliente)
  );

  return v_ag;
end;
$$;

-- ------------------------------------------------------------
-- Conclusão do atendimento
-- ------------------------------------------------------------
create or replace function public.concluir_agendamento(p_id uuid)
returns public.agendamento
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ag public.agendamento;
begin
  select * into v_ag from public.agendamento where id = p_id for update;
  if not found then
    raise exception 'Agendamento não encontrado';
  end if;
  if v_ag.profissional_id is distinct from public.meu_profissional_id() then
    raise exception 'Apenas o profissional do agendamento pode concluir';
  end if;
  if v_ag.status <> 'confirmado' then
    raise exception 'Apenas agendamentos confirmados podem ser concluídos';
  end if;

  update public.agendamento set status = 'concluido' where id = v_ag.id
  returning * into v_ag;

  perform public.registrar_log('agendamento_concluido', 'agendamento', v_ag.id, '{}'::jsonb);
  return v_ag;
end;
$$;

-- ------------------------------------------------------------
-- Expiração automática (pg_cron ou chamada no app)
-- ------------------------------------------------------------
create or replace function public.expirar_agendamentos()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ag public.agendamento;
  v_total integer := 0;
begin
  for v_ag in
    select * from public.agendamento
    where status = 'pendente' and responder_ate < now()
    for update skip locked
  loop
    update public.agendamento set status = 'expirado' where id = v_ag.id;
    if v_ag.agenda_id is not null then
      update public.agenda set status = 'disponivel' where id = v_ag.agenda_id;
    end if;
    perform public.registrar_log('agendamento_expirado', 'agendamento', v_ag.id, '{}'::jsonb);
    v_total := v_total + 1;
  end loop;
  return v_total;
end;
$$;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.agenda enable row level security;
alter table public.agendamento enable row level security;

drop policy if exists agenda_select on public.agenda;
create policy agenda_select on public.agenda
for select to authenticated
using (
  profissional_id = public.meu_profissional_id()
  or public.is_admin()
  or (
    status = 'disponivel'
    and inicio > now()
    and public.profissional_e_publico(profissional_id)
  )
);

drop policy if exists agenda_insert on public.agenda;
create policy agenda_insert on public.agenda
for insert to authenticated
with check (profissional_id = public.meu_profissional_id());

drop policy if exists agenda_update on public.agenda;
create policy agenda_update on public.agenda
for update to authenticated
using (profissional_id = public.meu_profissional_id())
with check (profissional_id = public.meu_profissional_id());

drop policy if exists agenda_delete on public.agenda;
create policy agenda_delete on public.agenda
for delete to authenticated
using (profissional_id = public.meu_profissional_id() and status = 'disponivel');

drop policy if exists agendamento_select on public.agendamento;
create policy agendamento_select on public.agendamento
for select to authenticated
using (
  cliente_id = public.meu_cliente_id()
  or profissional_id = public.meu_profissional_id()
  or public.is_admin()
);

revoke all on public.agendamento from anon;
revoke insert, update, delete on public.agendamento from authenticated;
grant select on public.agendamento to authenticated;

-- ------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------
drop trigger if exists agenda_atualizado on public.agenda;
create trigger agenda_atualizado before update on public.agenda
for each row execute function public.set_atualizado_em();

drop trigger if exists agendamento_atualizado on public.agendamento;
create trigger agendamento_atualizado before update on public.agendamento
for each row execute function public.set_atualizado_em();

-- ------------------------------------------------------------
-- Permissões de execução
-- ------------------------------------------------------------
revoke all on function public.solicitar_agendamento(uuid, uuid, uuid, timestamptz, text) from public;
grant execute on function public.solicitar_agendamento(uuid, uuid, uuid, timestamptz, text) to authenticated;

revoke all on function public.decidir_agendamento(uuid, boolean, text) from public;
grant execute on function public.decidir_agendamento(uuid, boolean, text) to authenticated;

revoke all on function public.cancelar_agendamento(uuid, text) from public;
grant execute on function public.cancelar_agendamento(uuid, text) to authenticated;

revoke all on function public.concluir_agendamento(uuid) from public;
grant execute on function public.concluir_agendamento(uuid) to authenticated;

revoke all on function public.expirar_agendamentos() from public;
grant execute on function public.expirar_agendamentos() to authenticated;
