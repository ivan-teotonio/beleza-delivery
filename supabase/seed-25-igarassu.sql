-- ============================================================
-- Normalizacao da base de teste para 25 profissionais
-- Referencia de localizacao: CEP 53620-793 (Igarassu/PE)
--   latitude -7.83417, longitude -34.90639
--
-- 5 profissionais para cada um dos 5 servicos principais:
--   Corte masculino, Barba, Corte feminino, Manicure, Pedicure
-- Cada servico tem 1 profissional em cada faixa de distancia:
--   Igarassu (~0 km), Itapissuma (~7 km), Abreu e Lima (~8 km),
--   Paulista (~12 km), Olinda (~20 km)
--
-- Executar DEPOIS de seed.sql, seed-5-por-tipo.sql e
-- seed-profissionais-recife.sql. Idempotente: pode ser reaplicado.
-- Os profissionais fora da lista sao DESATIVADOS, nao excluidos,
-- para preservar agendamentos e avaliacoes.
-- ============================================================

begin;

create temp table tmp_teste(
  email text primary key,
  tipo text not null,
  tier int not null,
  svc_idx int not null
) on commit drop;

insert into tmp_teste(email, tipo, tier, svc_idx) values
 ('ricardo@email.com','Corte masculino',1,0),
 ('cortemas5@prof-teste.app','Corte masculino',2,0),
 ('cortemas1@prof-teste.app','Corte masculino',3,0),
 ('cortemas2@prof-teste.app','Corte masculino',4,0),
 ('cortemas3@prof-teste.app','Corte masculino',5,0),
 ('barba1@prof-teste.app','Barba',1,1),
 ('barba2@prof-teste.app','Barba',2,1),
 ('barba3@prof-teste.app','Barba',3,1),
 ('barba4@prof-teste.app','Barba',4,1),
 ('barba5@prof-teste.app','Barba',5,1),
 ('cortefem1@prof-teste.app','Corte feminino',1,2),
 ('cortefem2@prof-teste.app','Corte feminino',2,2),
 ('cortefem3@prof-teste.app','Corte feminino',3,2),
 ('cortefem4@prof-teste.app','Corte feminino',4,2),
 ('cortefem5@prof-teste.app','Corte feminino',5,2),
 ('manicure1@prof-teste.app','Manicure',1,3),
 ('manicure2@prof-teste.app','Manicure',2,3),
 ('manicure3@prof-teste.app','Manicure',3,3),
 ('manicure4@prof-teste.app','Manicure',4,3),
 ('mariana@beleza.app','Manicure',5,3),
 ('pedicure1@prof-teste.app','Pedicure',1,4),
 ('pedicure2@prof-teste.app','Pedicure',2,4),
 ('pedicure3@prof-teste.app','Pedicure',3,4),
 ('pedicure4@prof-teste.app','Pedicure',4,4),
 ('pedicure5@prof-teste.app','Pedicure',5,4);

-- Desativa quem nao faz parte dos 25 de teste.
update public.profissional p
set ativo = false, atualizado_em = now()
where not exists (
  select 1 from tmp_teste t
  join public.usuario u on u.email = t.email
  where u.id = p.usuario_id
);

-- Remove servicos, faixas e fotos antigos dos 25 mantidos.
-- O servico referenciado por agendamento e preservado (atualizado abaixo).
delete from public.servico s
where s.profissional_id in (
  select p.id from public.profissional p
  join public.usuario u on u.id = p.usuario_id
  join tmp_teste t on t.email = u.email
)
and s.id not in (select servico_id from public.agendamento where servico_id is not null);

delete from public.faixa_deslocamento f where f.profissional_id in (
  select p.id from public.profissional p
  join public.usuario u on u.id = p.usuario_id
  join tmp_teste t on t.email = u.email
);

delete from public.foto_portfolio f where f.profissional_id in (
  select p.id from public.profissional p
  join public.usuario u on u.id = p.usuario_id
  join tmp_teste t on t.email = u.email
);

-- Reposiciona e repersonaliza os 25 profissionais.
update public.profissional p
set
  localizacao_ref = extensions.st_setsrid(extensions.st_makepoint(
    (case t.tier when 1 then -34.90639 when 2 then -34.89222 when 3 then -34.90278 when 4 then -34.87306 else -34.85528 end)
      + t.svc_idx::double precision * 0.0005,
    (case t.tier when 1 then -7.83417 when 2 then -7.77639 when 3 then -7.91167 when 4 then -7.94083 else -8.00889 end)
      + t.svc_idx::double precision * 0.0008
  ), 4326)::extensions.geography,
  endereco_ref_cidade = case t.tier
    when 1 then 'Igarassu' when 2 then 'Itapissuma' when 3 then 'Abreu e Lima'
    when 4 then 'Paulista' else 'Olinda' end,
  endereco_ref_bairro = case when t.tier = 1 then 'Santa Rita' else 'Centro' end,
  distancia_maxima_km = 35,
  status_verificacao = 'aprovado',
  ativo = true,
  descricao = case t.tipo
    when 'Corte masculino' then 'Barbeiro especializado em cortes masculinos com atendimento a domicilio.'
    when 'Barba' then 'Especialista em barba, alinhamento e hidratacao com atendimento a domicilio.'
    when 'Corte feminino' then 'Cabeleireira especializada em cortes femininos a domicilio.'
    when 'Manicure' then 'Manicure com atendimento a domicilio e acabamento impecavel.'
    else 'Pedicure com atendimento a domicilio e cuidado completo dos pes.'
  end,
  foto_url = (public.fotos_servico(t.tipo))[1],
  atualizado_em = now()
from tmp_teste t
join public.usuario u on u.email = t.email
where p.usuario_id = u.id;

-- Atualiza o servico preservado e cria os demais.
update public.servico s
set tipo = t.tipo,
    preco_centavos = case t.tipo when 'Corte masculino' then 3500 when 'Barba' then 2500 when 'Corte feminino' then 5500 when 'Manicure' then 3000 else 3500 end,
    duracao_min = case t.tipo when 'Corte masculino' then 30 when 'Barba' then 20 when 'Corte feminino' then 60 else 45 end,
    ativo = true, atualizado_em = now()
from tmp_teste t
join public.usuario u on u.email = t.email
join public.profissional p on p.usuario_id = u.id
where s.profissional_id = p.id;

insert into public.servico (profissional_id, tipo, preco_centavos, duracao_min, ativo)
select p.id, t.tipo,
  case t.tipo when 'Corte masculino' then 3500 when 'Barba' then 2500 when 'Corte feminino' then 5500 when 'Manicure' then 3000 else 3500 end,
  case t.tipo when 'Corte masculino' then 30 when 'Barba' then 20 when 'Corte feminino' then 60 else 45 end,
  true
from tmp_teste t
join public.usuario u on u.email = t.email
join public.profissional p on p.usuario_id = u.id
where not exists (select 1 from public.servico s where s.profissional_id = p.id and s.ativo);

-- Faixas de deslocamento (necessarias para a RPC de busca).
insert into public.faixa_deslocamento (profissional_id, limite_km, valor_centavos, ordem)
select p.id, fa.limite, fa.valor, fa.ordem
from tmp_teste t
join public.usuario u on u.email = t.email
join public.profissional p on p.usuario_id = u.id
cross join (values
  (5::numeric,800,1), (10::numeric,1500,2), (20::numeric,2500,3), (35::numeric,3500,4)
) as fa(limite, valor, ordem);

-- Fotos do portifolio sempre coerentes com o servico prestado.
insert into public.foto_portfolio (profissional_id, url)
select s.profissional_id, x.url
from public.servico s
cross join lateral unnest(public.fotos_servico(s.tipo)) as x(url)
where s.profissional_id in (
  select p.id from public.profissional p
  join public.usuario u on u.id = p.usuario_id
  join tmp_teste t on t.email = u.email
);

-- Horarios: 14 dias a frente, blocos de 1h das 09h as 12h e das 13h as 18h
-- no fuso America/Sao_Paulo. Apenas horarios futuros entram na agenda.
delete from public.agenda;
insert into public.agenda (profissional_id, inicio, fim, status)
select p.id, s.inicio, s.inicio + interval '1 hour', 'disponivel'
from public.profissional p
cross join lateral (
  select (
    date_trunc('day', timezone('America/Sao_Paulo', now()))
    + make_interval(days => d, hours => h)
  ) at time zone 'America/Sao_Paulo' as inicio
  from generate_series(0, 13) as d
  cross join unnest(array[9,10,11,13,14,15,16,17]) as h
) s
where p.ativo and s.inicio > now();

commit;

-- Verificacao rapida (25 ativos, 5 por servico):
-- select s.tipo, count(*) from public.servico s
-- join public.profissional p on p.id = s.profissional_id
-- where s.ativo and p.ativo group by s.tipo order by s.tipo;
