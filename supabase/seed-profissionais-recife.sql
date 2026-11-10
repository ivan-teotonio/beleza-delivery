-- ============================================================
-- Seed de profissionais de teste para CEP 53620-793 (Recife/PE)
-- ============================================================
set search_path to public, extensions;

-- ------------------------------------------------------------
-- Limpeza completa dos profissionais de teste
-- ------------------------------------------------------------
delete from public.agendamento where profissional_id in (
  select p.id from public.profissional p join public.usuario u on u.id = p.usuario_id
  where u.email like '%@prof-teste.app'
);
delete from public.agenda where profissional_id in (
  select p.id from public.profissional p join public.usuario u on u.id = p.usuario_id
  where u.email like '%@prof-teste.app'
);
delete from public.foto_portfolio where profissional_id in (
  select p.id from public.profissional p join public.usuario u on u.id = p.usuario_id
  where u.email like '%@prof-teste.app'
);
delete from public.servico where profissional_id in (
  select p.id from public.profissional p join public.usuario u on u.id = p.usuario_id
  where u.email like '%@prof-teste.app'
);
delete from public.faixa_deslocamento where profissional_id in (
  select p.id from public.profissional p join public.usuario u on u.id = p.usuario_id
  where u.email like '%@prof-teste.app'
);
delete from public.profissional where usuario_id in (
  select id from auth.users where email like '%@prof-teste.app'
);
delete from auth.identities where identity_data->>'email' like '%@prof-teste.app';
delete from auth.users where email like '%@prof-teste.app';

-- ------------------------------------------------------------
-- 1. Beatriz Silva - Manicure/Pedicure (mais perto, ~0-1 km do CEP 53620-793)
-- Email: beatriz@prof-teste.app | Senha: Beleza@123
-- ------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'beatriz@prof-teste.app',
  extensions.crypt('Beleza@123', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('tipo', 'profissional', 'nome', 'Beatriz Silva', 'telefone', '81999990001'),
  now(), now()
);

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select id::text, id,
  jsonb_build_object('sub', id::text, 'email', 'beatriz@prof-teste.app'),
  'email', now(), now(), now()
from auth.users where email = 'beatriz@prof-teste.app';

insert into public.profissional (usuario_id, nome, cpf, telefone, foto_url, status_verificacao,
  localizacao_ref, endereco_ref_bairro, endereco_ref_cidade,
  distancia_maxima_km, prazo_resposta_h, descricao, ativo)
select
  u.id, 'Beatriz Silva', '11111111112', '81999990001',
  'https://picsum.photos/seed/beatriz/600/600', 'aprovado',
  extensions.st_setsrid(extensions.st_makepoint(-34.8813::double precision, -8.0539::double precision), 4326)::extensions.geography,
  'Centro', 'Recife', 10::numeric, 24,
  'Manicure e pedicure a domicílio com atendimento delicado e materiais esterilizados.',
  true
from public.usuario u where u.email = 'beatriz@prof-teste.app';

insert into public.faixa_deslocamento (profissional_id, limite_km, valor_centavos, ordem)
select p.id, 5::numeric, 800, 1 from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'beatriz@prof-teste.app'
union all
select p.id, 10::numeric, 1500, 2 from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'beatriz@prof-teste.app';

insert into public.servico (profissional_id, tipo, preco_centavos, duracao_min, ativo)
select p.id, 'Manicure', 4000, 60, true from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'beatriz@prof-teste.app'
union all
select p.id, 'Pedicure', 4500, 60, true from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'beatriz@prof-teste.app';

insert into public.foto_portfolio (profissional_id, url)
select p.id, 'https://picsum.photos/seed/beatriz-work-1/800/800' from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'beatriz@prof-teste.app'
union all
select p.id, 'https://picsum.photos/seed/beatriz-work-2/800/800' from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'beatriz@prof-teste.app';

-- ------------------------------------------------------------
-- 2. Carla Mendes - Cabeleireira (~2-3 km do CEP)
-- Email: carla@prof-teste.app | Senha: Beleza@123
-- ------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'carla@prof-teste.app',
  extensions.crypt('Beleza@123', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('tipo', 'profissional', 'nome', 'Carla Mendes', 'telefone', '81999990002'),
  now(), now()
);

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select id::text, id,
  jsonb_build_object('sub', id::text, 'email', 'carla@prof-teste.app'),
  'email', now(), now(), now()
from auth.users where email = 'carla@prof-teste.app';

insert into public.profissional (usuario_id, nome, cpf, telefone, foto_url, status_verificacao,
  localizacao_ref, endereco_ref_bairro, endereco_ref_cidade,
  distancia_maxima_km, prazo_resposta_h, descricao, ativo)
select
  u.id, 'Carla Mendes', '22222222223', '81999990002',
  'https://picsum.photos/seed/carla/600/600', 'aprovado',
  extensions.st_setsrid(extensions.st_makepoint(-34.9000::double precision, -8.1200::double precision), 4326)::extensions.geography,
  'Boa Viagem', 'Recife', 15::numeric, 24,
  'Cabeleireira especializada em cortes femininos, escovas e tratamentos capilares a domicílio.',
  true
from public.usuario u where u.email = 'carla@prof-teste.app';

insert into public.faixa_deslocamento (profissional_id, limite_km, valor_centavos, ordem)
select p.id, 5::numeric, 1000, 1 from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'carla@prof-teste.app'
union all
select p.id, 10::numeric, 2000, 2 from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'carla@prof-teste.app'
union all
select p.id, 15::numeric, 3000, 3 from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'carla@prof-teste.app';

insert into public.servico (profissional_id, tipo, preco_centavos, duracao_min, ativo)
select p.id, 'Corte feminino', 5500, 60, true from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'carla@prof-teste.app'
union all
select p.id, 'Escova', 4500, 45, true from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'carla@prof-teste.app';

insert into public.foto_portfolio (profissional_id, url)
select p.id, 'https://picsum.photos/seed/carla-work-1/800/800' from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'carla@prof-teste.app'
union all
select p.id, 'https://picsum.photos/seed/carla-work-2/800/800' from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'carla@prof-teste.app';

-- ------------------------------------------------------------
-- 3. Daniela Costa - Esteticista (~5-6 km do CEP)
-- Email: daniela@prof-teste.app | Senha: Beleza@123
-- ------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'daniela@prof-teste.app',
  extensions.crypt('Beleza@123', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('tipo', 'profissional', 'nome', 'Daniela Costa', 'telefone', '81999990003'),
  now(), now()
);

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select id::text, id,
  jsonb_build_object('sub', id::text, 'email', 'daniela@prof-teste.app'),
  'email', now(), now(), now()
from auth.users where email = 'daniela@prof-teste.app';

insert into public.profissional (usuario_id, nome, cpf, telefone, foto_url, status_verificacao,
  localizacao_ref, endereco_ref_bairro, endereco_ref_cidade,
  distancia_maxima_km, prazo_resposta_h, descricao, ativo)
select
  u.id, 'Daniela Costa', '33333333334', '81999990003',
  'https://picsum.photos/seed/daniela/600/600', 'aprovado',
  extensions.st_setsrid(extensions.st_makepoint(-34.9100::double precision, -8.0200::double precision), 4326)::extensions.geography,
  'Casa Amarela', 'Recife', 20::numeric, 24,
  'Esteticista com foco em limpeza de pele, drenagem linfática e cuidados faciais a domicílio.',
  true
from public.usuario u where u.email = 'daniela@prof-teste.app';

insert into public.faixa_deslocamento (profissional_id, limite_km, valor_centavos, ordem)
select p.id, 8::numeric, 1200, 1 from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'daniela@prof-teste.app'
union all
select p.id, 15::numeric, 2200, 2 from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'daniela@prof-teste.app'
union all
select p.id, 20::numeric, 3500, 3 from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'daniela@prof-teste.app';

insert into public.servico (profissional_id, tipo, preco_centavos, duracao_min, ativo)
select p.id, 'Limpeza de pele', 8000, 60, true from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'daniela@prof-teste.app'
union all
select p.id, 'Drenagem linfática', 12000, 90, true from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'daniela@prof-teste.app';

insert into public.foto_portfolio (profissional_id, url)
select p.id, 'https://picsum.photos/seed/daniela-work-1/800/800' from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'daniela@prof-teste.app'
union all
select p.id, 'https://picsum.photos/seed/daniela-work-2/800/800' from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'daniela@prof-teste.app';

-- ------------------------------------------------------------
-- 4. Eliana Rocha - Maquiadora (~8-10 km do CEP)
-- Email: eliana@prof-teste.app | Senha: Beleza@123
-- ------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'eliana@prof-teste.app',
  extensions.crypt('Beleza@123', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('tipo', 'profissional', 'nome', 'Eliana Rocha', 'telefone', '81999990004'),
  now(), now()
);

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select id::text, id,
  jsonb_build_object('sub', id::text, 'email', 'eliana@prof-teste.app'),
  'email', now(), now(), now()
from auth.users where email = 'eliana@prof-teste.app';

insert into public.profissional (usuario_id, nome, cpf, telefone, foto_url, status_verificacao,
  localizacao_ref, endereco_ref_bairro, endereco_ref_cidade,
  distancia_maxima_km, prazo_resposta_h, descricao, ativo)
select
  u.id, 'Eliana Rocha', '44444444445', '81999990004',
  'https://picsum.photos/seed/eliana/600/600', 'aprovado',
  extensions.st_setsrid(extensions.st_makepoint(-34.9300::double precision, -8.0000::double precision), 4326)::extensions.geography,
  'Apipucos', 'Recife', 25::numeric, 24,
  'Maquiadora profissional para eventos, noivas e produções a domicílio com produtos de alta qualidade.',
  true
from public.usuario u where u.email = 'eliana@prof-teste.app';

insert into public.faixa_deslocamento (profissional_id, limite_km, valor_centavos, ordem)
select p.id, 10::numeric, 1500, 1 from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'eliana@prof-teste.app'
union all
select p.id, 20::numeric, 2800, 2 from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'eliana@prof-teste.app'
union all
select p.id, 25::numeric, 4000, 3 from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'eliana@prof-teste.app';

insert into public.servico (profissional_id, tipo, preco_centavos, duracao_min, ativo)
select p.id, 'Maquiagem', 7000, 90, true from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'eliana@prof-teste.app'
union all
select p.id, 'Maquiagem para noiva', 15000, 120, true from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'eliana@prof-teste.app';

insert into public.foto_portfolio (profissional_id, url)
select p.id, 'https://picsum.photos/seed/eliana-work-1/800/800' from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'eliana@prof-teste.app'
union all
select p.id, 'https://picsum.photos/seed/eliana-work-2/800/800' from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'eliana@prof-teste.app';

-- ------------------------------------------------------------
-- 5. Fernanda Alves - Depiladora (~12-15 km do CEP)
-- Email: fernanda@prof-teste.app | Senha: Beleza@123
-- ------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'fernanda@prof-teste.app',
  extensions.crypt('Beleza@123', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('tipo', 'profissional', 'nome', 'Fernanda Alves', 'telefone', '81999990005'),
  now(), now()
);

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select id::text, id,
  jsonb_build_object('sub', id::text, 'email', 'fernanda@prof-teste.app'),
  'email', now(), now(), now()
from auth.users where email = 'fernanda@prof-teste.app';

insert into public.profissional (usuario_id, nome, cpf, telefone, foto_url, status_verificacao,
  localizacao_ref, endereco_ref_bairro, endereco_ref_cidade,
  distancia_maxima_km, prazo_resposta_h, descricao, ativo)
select
  u.id, 'Fernanda Alves', '55555555556', '81999990005',
  'https://picsum.photos/seed/fernanda/600/600', 'aprovado',
  extensions.st_setsrid(extensions.st_makepoint(-34.9500::double precision, -7.9800::double precision), 4326)::extensions.geography,
  'Dois Irmãos', 'Recife', 30::numeric, 24,
  'Depiladora especializada em depilação com cera e a laser, atendimento rápido e confortável a domicílio.',
  true
from public.usuario u where u.email = 'fernanda@prof-teste.app';

insert into public.faixa_deslocamento (profissional_id, limite_km, valor_centavos, ordem)
select p.id, 10::numeric, 1000, 1 from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'fernanda@prof-teste.app'
union all
select p.id, 20::numeric, 2000, 2 from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'fernanda@prof-teste.app'
union all
select p.id, 30::numeric, 3200, 3 from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'fernanda@prof-teste.app';

insert into public.servico (profissional_id, tipo, preco_centavos, duracao_min, ativo)
select p.id, 'Depilação completa', 6000, 60, true from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'fernanda@prof-teste.app'
union all
select p.id, 'Depilação parcial', 3500, 30, true from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'fernanda@prof-teste.app';

insert into public.foto_portfolio (profissional_id, url)
select p.id, 'https://picsum.photos/seed/fernanda-work-1/800/800' from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'fernanda@prof-teste.app'
union all
select p.id, 'https://picsum.photos/seed/fernanda-work-2/800/800' from public.profissional p join public.usuario u on u.id = p.usuario_id where u.email = 'fernanda@prof-teste.app';

-- ------------------------------------------------------------
-- Log de auditoria
-- ------------------------------------------------------------
insert into public.log_auditoria (acao, entidade, detalhe_json)
values ('seed_profissionais_recife_aplicado', 'sistema',
  jsonb_build_object('cep_referencia', '53620-793', 'cidade', 'Recife/PE', 'qtde_profissionais', 5));
