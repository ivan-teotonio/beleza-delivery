-- ============================================================
-- Seed de demonstração — Beleza a Domicílio
-- Senha de todos os usuários demo: Beleza@123
-- ============================================================
set search_path to public, extensions;

-- Remove apenas as contas demo (ordem respeita as FKs; o restante cai em cascata)
delete from public.agendamento
where cliente_id in (
        select c.id from public.cliente c
        join public.usuario u on u.id = c.usuario_id
        where u.email in (
          'admin@beleza.app',
          'ana.cliente@beleza.app',
          'carlos.cliente@beleza.app',
          'mariana@beleza.app',
          'joao@beleza.app',
          'luiza@beleza.app',
          'paula@beleza.app'
        )
      )
   or profissional_id in (
        select p.id from public.profissional p
        join public.usuario u on u.id = p.usuario_id
        where u.email in (
          'admin@beleza.app',
          'ana.cliente@beleza.app',
          'carlos.cliente@beleza.app',
          'mariana@beleza.app',
          'joao@beleza.app',
          'luiza@beleza.app',
          'paula@beleza.app'
        )
      );

delete from auth.users
where email in (
  'admin@beleza.app',
  'ana.cliente@beleza.app',
  'carlos.cliente@beleza.app',
  'mariana@beleza.app',
  'joao@beleza.app',
  'luiza@beleza.app',
  'paula@beleza.app'
);

do $$
declare
  v_reg record;
  v_id uuid;
  v_meta jsonb;
begin
  for v_reg in
    select * from (values
      ('admin@beleza.app',            'admin',        'Administrador', '11999990000'),
      ('ana.cliente@beleza.app',      'cliente',      'Ana Souza',     '11988880001'),
      ('carlos.cliente@beleza.app',   'cliente',      'Carlos Lima',   '11988880002'),
      ('mariana@beleza.app',          'profissional', 'Mariana Alves', '11977770001'),
      ('joao@beleza.app',             'profissional', 'João Pedro',    '11977770002'),
      ('luiza@beleza.app',            'profissional', 'Luiza Ferraz',  '11977770003'),
      ('paula@beleza.app',            'profissional', 'Paula Nunes',   '11977770004')
    ) as t(email, tipo, nome, telefone)
  loop
    v_id := gen_random_uuid();
    v_meta := jsonb_build_object('tipo', v_reg.tipo, 'nome', v_reg.nome, 'telefone', v_reg.telefone);

    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      v_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_reg.email,
      extensions.crypt('Beleza@123', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      v_meta,
      now(), now()
    );

    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      v_id::text, v_id,
      jsonb_build_object('sub', v_id::text, 'email', v_reg.email),
      'email', now(), now(), now()
    );

    -- O trigger cria usuario (e cliente para não-admin); o admin é promovido aqui.
    if v_reg.tipo = 'admin' then
      update public.usuario set tipo = 'admin' where id = v_id;
      delete from public.cliente where usuario_id = v_id;
    end if;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Endereços dos clientes
-- ------------------------------------------------------------
insert into public.endereco (cliente_id, cep, rua, numero, complemento, bairro, cidade, localizacao)
select
  c.id, v.cep, v.rua, v.numero, v.complemento, v.bairro, v.cidade,
  extensions.st_setsrid(
    extensions.st_makepoint(v.lng::double precision, v.lat::double precision), 4326
  )::extensions.geography
from public.cliente c
join public.usuario u on u.id = c.usuario_id
join (values
  ('ana.cliente@beleza.app',    '05422-030', 'Rua dos Pinheiros',      '500', 'Apto 42', 'Pinheiros',    'São Paulo', -46.6915, -23.5614),
  ('carlos.cliente@beleza.app', '05435-000', 'Rua Harmonia',           '120', null,      'Vila Madalena','São Paulo', -46.6890, -23.5525)
) as v(email, cep, rua, numero, complemento, bairro, cidade, lng, lat) on v.email = u.email;

-- ------------------------------------------------------------
-- Profissionais
-- ------------------------------------------------------------
insert into public.profissional (
  usuario_id, nome, cpf, telefone, foto_url, status_verificacao,
  localizacao_ref, endereco_ref_bairro, endereco_ref_cidade,
  distancia_maxima_km, prazo_resposta_h, descricao
)
select
  u.id, v.nome, v.cpf, v.telefone, v.foto, v.status,
  extensions.st_setsrid(
    extensions.st_makepoint(v.lng::double precision, v.lat::double precision), 4326
  )::extensions.geography,
  v.bairro, v.cidade, v.distancia, 24, v.descricao
from public.usuario u
join (values
  ('mariana@beleza.app', 'Mariana Alves', '11111111111', '11977770001',
   'https://picsum.photos/seed/mariana/600/600', 'aprovado',
   -46.6930, -23.5660, 'Pinheiros', 'São Paulo', 20::numeric,
   'Manicure e pedicure a domicílio, com materiais esterilizados e atendimento acolhedor.'),
  ('joao@beleza.app', 'João Pedro', '22222222222', '11977770002',
   'https://picsum.photos/seed/joao/600/600', 'aprovado',
   -46.6340, -23.5890, 'Vila Mariana', 'São Paulo', 12::numeric,
   'Barbeiro especializado em cortes masculinos e barba, atendendo em casa.'),
  ('luiza@beleza.app', 'Luiza Ferraz', '33333333333', '11977770003',
   'https://picsum.photos/seed/luiza/600/600', 'aprovado',
   -46.6790, -23.5850, 'Itaim Bibi', 'São Paulo', 25::numeric,
   'Esteticista com foco em limpeza de pele e massagens relaxantes.'),
  ('paula@beleza.app', 'Paula Nunes', '44444444444', '11977770004',
   'https://picsum.photos/seed/paula/600/600', 'pendente',
   -46.6800, -23.5350, 'Perdizes', 'São Paulo', 15::numeric,
   'Cabeleireira com atendimento a domicílio para cortes e escovas.')
) as v(email, nome, cpf, telefone, foto, status, lng, lat, bairro, cidade, distancia, descricao)
  on v.email = u.email;

-- ------------------------------------------------------------
-- Faixas de deslocamento
-- ------------------------------------------------------------
insert into public.faixa_deslocamento (profissional_id, limite_km, valor_centavos, ordem)
select p.id, v.limite, v.valor, v.ordem
from public.profissional p
join public.usuario u on u.id = p.usuario_id
join (values
  ('mariana@beleza.app',   5::numeric, 1000, 1),
  ('mariana@beleza.app',  10::numeric, 1800, 2),
  ('mariana@beleza.app',  20::numeric, 3000, 3),
  ('joao@beleza.app',      5::numeric, 1200, 1),
  ('joao@beleza.app',     12::numeric, 2500, 2),
  ('luiza@beleza.app',    10::numeric, 2000, 1),
  ('luiza@beleza.app',    25::numeric, 4000, 2),
  ('paula@beleza.app',     8::numeric, 1500, 1),
  ('paula@beleza.app',    15::numeric, 2800, 2)
) as v(email, limite, valor, ordem) on v.email = u.email;

-- ------------------------------------------------------------
-- Serviços
-- ------------------------------------------------------------
insert into public.servico (profissional_id, tipo, preco_centavos, duracao_min)
select p.id, v.tipo, v.preco, v.duracao
from public.profissional p
join public.usuario u on u.id = p.usuario_id
join (values
  ('mariana@beleza.app', 'Manicure',            4500, 60),
  ('mariana@beleza.app', 'Pedicure',            5000, 60),
  ('mariana@beleza.app', 'Alongamento de unhas',12000,120),
  ('joao@beleza.app',    'Corte masculino',      4000, 45),
  ('joao@beleza.app',    'Barba',                3000, 30),
  ('luiza@beleza.app',   'Limpeza de pele',      9000, 60),
  ('paula@beleza.app',   'Corte feminino',       6000, 60),
  ('paula@beleza.app',   'Escova',               5000, 45)
) as v(email, tipo, preco, duracao) on v.email = u.email;

-- ------------------------------------------------------------
-- Portfólio
-- ------------------------------------------------------------
insert into public.foto_portfolio (profissional_id, url)
select p.id, v.url
from public.profissional p
join public.usuario u on u.id = p.usuario_id
join (values
  ('mariana@beleza.app', 'https://picsum.photos/seed/mariana-work-1/800/800'),
  ('mariana@beleza.app', 'https://picsum.photos/seed/mariana-work-2/800/800'),
  ('joao@beleza.app',    'https://picsum.photos/seed/joao-work-1/800/800'),
  ('joao@beleza.app',    'https://picsum.photos/seed/joao-work-2/800/800'),
  ('luiza@beleza.app',   'https://picsum.photos/seed/luiza-work-1/800/800'),
  ('luiza@beleza.app',   'https://picsum.photos/seed/luiza-work-2/800/800')
) as v(email, url) on v.email = u.email;

-- ------------------------------------------------------------
-- Agenda dos profissionais aprovados (próximos 7 dias)
-- Blocos têm o tamanho do maior serviço do profissional para que
-- qualquer serviço caiba no horário ofertado.
-- ------------------------------------------------------------
insert into public.agenda (profissional_id, inicio, fim, status)
select
  p.id,
  slot.inicio,
  slot.inicio + make_interval(mins => dur.max_duracao),
  'disponivel'
from public.profissional p
join (
  select profissional_id, max(duracao_min) as max_duracao
  from public.servico
  group by profissional_id
) as dur on dur.profissional_id = p.id
cross join lateral (
  select (
    date_trunc('day', timezone('America/Sao_Paulo', now()))
    + make_interval(days => d, hours => h)
  ) at time zone 'America/Sao_Paulo' as inicio
  from generate_series(1, 7) as d
  cross join lateral (
    select unnest(
      case
        when dur.max_duracao > 60 then array[9, 11, 14, 16]
        else array[9, 10, 11, 14, 15, 16, 17]
      end
    ) as h
  ) as hr
) as slot
where p.status_verificacao = 'aprovado'
  and p.ativo
on conflict (profissional_id, inicio) do nothing;

-- ------------------------------------------------------------
-- Agendamentos demo (pendente, confirmado e concluído + avaliação)
-- ------------------------------------------------------------
do $$
declare
  v_ana       uuid;
  v_carlos    uuid;
  v_mariana   uuid;
  v_end_ana   uuid;
  v_end_carlos uuid;
  v_servico   uuid;
  v_preco     integer;
  v_agenda    uuid;
  v_inicio    timestamptz;
  v_dist      numeric;
  v_fee       integer;
  v_pendente  uuid;
  v_confirmado uuid;
  v_concluido uuid;
begin
  select c.id into v_ana
  from public.cliente c join public.usuario u on u.id = c.usuario_id
  where u.email = 'ana.cliente@beleza.app';

  select c.id into v_carlos
  from public.cliente c join public.usuario u on u.id = c.usuario_id
  where u.email = 'carlos.cliente@beleza.app';

  select p.id into v_mariana
  from public.profissional p join public.usuario u on u.id = p.usuario_id
  where u.email = 'mariana@beleza.app';

  select id into v_end_ana from public.endereco where cliente_id = v_ana;
  select id into v_end_carlos from public.endereco where cliente_id = v_carlos;

  select s.id, s.preco_centavos into v_servico, v_preco
  from public.servico s
  where s.profissional_id = v_mariana and s.tipo = 'Manicure'
  limit 1;

  select
    round((extensions.st_distance(p.localizacao_ref, e.localizacao) / 1000)::numeric, 2),
    (select f.valor_centavos
       from public.faixa_deslocamento f
      where f.profissional_id = p.id
        and f.limite_km >= extensions.st_distance(p.localizacao_ref, e.localizacao) / 1000
      order by f.limite_km limit 1)
  into v_dist, v_fee
  from public.profissional p, public.endereco e
  where p.id = v_mariana and e.id = v_end_ana;

  -- Pendente: amanhã 10:00 (horário de São Paulo)
  v_inicio := (
    date_trunc('day', timezone('America/Sao_Paulo', now()))
    + interval '1 day' + interval '11 hours'
  ) at time zone 'America/Sao_Paulo';

  select id into v_agenda
  from public.agenda
  where profissional_id = v_mariana and inicio = v_inicio and status = 'disponivel';

  if v_agenda is not null then
    insert into public.agendamento (
      cliente_id, profissional_id, servico_id, endereco_id, agenda_id,
      inicio, fim, status, distancia_km, valor_deslocamento_centavos,
      total_centavos, responder_ate, chave_idempotencia
    ) values (
      v_ana, v_mariana, v_servico, v_end_ana, v_agenda,
      v_inicio, v_inicio + interval '60 minutes', 'pendente', v_dist, v_fee,
      v_preco + v_fee, now() + interval '24 hours', 'seed-pendente-ana-mariana'
    ) returning id into v_pendente;

    update public.agenda set status = 'reservado' where id = v_agenda;
  end if;

  -- Confirmado: daqui a 3 dias às 15:00
  v_inicio := (
    date_trunc('day', timezone('America/Sao_Paulo', now()))
    + interval '3 days' + interval '14 hours'
  ) at time zone 'America/Sao_Paulo';

  select id into v_agenda
  from public.agenda
  where profissional_id = v_mariana and inicio = v_inicio and status = 'disponivel';

  if v_agenda is not null then
    insert into public.agendamento (
      cliente_id, profissional_id, servico_id, endereco_id, agenda_id,
      inicio, fim, status, distancia_km, valor_deslocamento_centavos,
      total_centavos, responder_ate, decidido_em, chave_idempotencia
    ) values (
      v_ana, v_mariana, v_servico, v_end_ana, v_agenda,
      v_inicio, v_inicio + interval '60 minutes', 'confirmado', v_dist, v_fee,
      v_preco + v_fee, now() + interval '24 hours', now(), 'seed-confirmado-ana-mariana'
    ) returning id into v_confirmado;

    update public.agenda set status = 'ocupado' where id = v_agenda;

    insert into public.mensagem (agendamento_id, remetente_id, conteudo)
    select v_confirmado, u.id, 'Olá, Ana! Seu horário está confirmado. Pode me avisar quando eu chegar?'
    from public.usuario u where u.email = 'mariana@beleza.app';

    insert into public.mensagem (agendamento_id, remetente_id, conteudo)
    select v_confirmado, u.id, 'Combinado, Mariana! Obrigada.'
    from public.usuario u where u.email = 'ana.cliente@beleza.app';
  end if;

  -- Concluído há 10 dias + avaliação 5 estrelas (Carlos)
  v_inicio := (
    date_trunc('day', timezone('America/Sao_Paulo', now()))
    - interval '10 days' + interval '10 hours'
  ) at time zone 'America/Sao_Paulo';

  select
    round((extensions.st_distance(p.localizacao_ref, e.localizacao) / 1000)::numeric, 2),
    (select f.valor_centavos
       from public.faixa_deslocamento f
      where f.profissional_id = p.id
        and f.limite_km >= extensions.st_distance(p.localizacao_ref, e.localizacao) / 1000
      order by f.limite_km limit 1)
  into v_dist, v_fee
  from public.profissional p, public.endereco e
  where p.id = v_mariana and e.id = v_end_carlos;

  insert into public.agendamento (
    cliente_id, profissional_id, servico_id, endereco_id, agenda_id,
    inicio, fim, status, distancia_km, valor_deslocamento_centavos,
    total_centavos, responder_ate, decidido_em, chave_idempotencia
  ) values (
    v_carlos, v_mariana, v_servico, v_end_carlos, null,
    v_inicio, v_inicio + interval '60 minutes', 'concluido', v_dist, v_fee,
    v_preco + v_fee, v_inicio + interval '24 hours', v_inicio - interval '1 day',
    'seed-concluido-carlos-mariana'
  ) returning id into v_concluido;

  insert into public.avaliacao (agendamento_id, cliente_id, profissional_id, nota, comentario)
  values (
    v_concluido, v_carlos, v_mariana, 5,
    'Atendimento impecável, pontual e muito cuidadoso. Recomendo!'
  );
end;
$$;

-- ------------------------------------------------------------
-- Mensagem de boas-vindas no log
-- ------------------------------------------------------------
insert into public.log_auditoria (acao, entidade, detalhe_json)
values ('seed_demo_aplicado', 'sistema', jsonb_build_object('versao', '1.0'));
