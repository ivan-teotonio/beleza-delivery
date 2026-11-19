-- ============================================================
-- Seed: exclui Fernanda Alves e TODOS os profissionais de teste
-- Insere 5 profissionais por tipo nas cidades de Pernambuco
-- ============================================================
set search_path to public, extensions;

-- ------------------------------------------------------------
-- 1. Limpeza completa de TODOS os profissionais de teste @prof-teste.app
-- (remove restos de execuções anteriores)
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
-- 2. Exclusão da Fernanda Alves (se ainda existir com outro email)
-- ------------------------------------------------------------
delete from public.agendamento where profissional_id in (
  select p.id from public.profissional p where p.nome = 'Fernanda Alves'
);
delete from public.agenda where profissional_id in (
  select p.id from public.profissional p where p.nome = 'Fernanda Alves'
);
delete from public.foto_portfolio where profissional_id in (
  select p.id from public.profissional p where p.nome = 'Fernanda Alves'
);
delete from public.servico where profissional_id in (
  select p.id from public.profissional p where p.nome = 'Fernanda Alves'
);
delete from public.faixa_deslocamento where profissional_id in (
  select p.id from public.profissional p where p.nome = 'Fernanda Alves'
);
delete from public.profissional where nome = 'Fernanda Alves';

-- ------------------------------------------------------------
-- 3. Função auxiliar para criar um profissional completo
-- ------------------------------------------------------------
create or replace function criar_profissional_teste(
  p_email text,
  p_nome text,
  p_cpf text,
  p_telefone text,
  p_bairro text,
  p_cidade text,
  p_lat double precision,
  p_lng double precision,
  p_distancia_maxima_km numeric,
  p_prazo_resposta_h integer,
  p_descricao text,
  p_foto_url text
) returns void as $$
declare
  v_usuario_id uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    p_email,
    extensions.crypt('Beleza@123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('tipo', 'profissional', 'nome', p_nome, 'telefone', p_telefone),
    now(), now()
  ) returning id into v_usuario_id;

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select v_usuario_id::text, v_usuario_id,
    jsonb_build_object('sub', v_usuario_id::text, 'email', p_email),
    'email', now(), now(), now();

  insert into public.profissional (usuario_id, nome, cpf, telefone, foto_url, status_verificacao,
    localizacao_ref, endereco_ref_bairro, endereco_ref_cidade,
    distancia_maxima_km, prazo_resposta_h, descricao, ativo)
  values (
    v_usuario_id, p_nome, p_cpf, p_telefone, p_foto_url, 'aprovado',
    extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
    p_bairro, p_cidade, p_distancia_maxima_km, p_prazo_resposta_h, p_descricao, true
  );
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- 4a. Fotos reais por tipo de serviço (Pexels)
-- URLs validadas (HTTP 200). Substitui picsum.photos, que devolve imagens
-- aleatórias sem relação com o serviço (ex.: copo de café no portfólio
-- de quem faz corte masculino).
-- ------------------------------------------------------------
create or replace function fotos_servico(p_tipo text)
returns text[] as $$
begin
  return case p_tipo
    when 'Manicure' then array[
      'https://images.pexels.com/photos/14267564/pexels-photo-14267564.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/18112333/pexels-photo-18112333.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/19239100/pexels-photo-19239100.jpeg?auto=compress&cs=tinysrgb&w=800'
    ]
    when 'Pedicure' then array[
      'https://images.pexels.com/photos/34930123/pexels-photo-34930123.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/5619449/pexels-photo-5619449.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/17056220/pexels-photo-17056220.jpeg?auto=compress&cs=tinysrgb&w=800'
    ]
    when 'Corte feminino' then array[
      'https://images.pexels.com/photos/3993445/pexels-photo-3993445.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/19239103/pexels-photo-19239103.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/10593034/pexels-photo-10593034.jpeg?auto=compress&cs=tinysrgb&w=800'
    ]
    when 'Corte masculino' then array[
      'https://images.pexels.com/photos/7518742/pexels-photo-7518742.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/7697644/pexels-photo-7697644.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/7697287/pexels-photo-7697287.jpeg?auto=compress&cs=tinysrgb&w=800'
    ]
    when 'Barba' then array[
      'https://images.pexels.com/photos/3998417/pexels-photo-3998417.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/7518732/pexels-photo-7518732.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/7518727/pexels-photo-7518727.jpeg?auto=compress&cs=tinysrgb&w=800'
    ]
    when 'Maquiagem' then array[
      'https://images.pexels.com/photos/7510157/pexels-photo-7510157.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/6648491/pexels-photo-6648491.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/10457787/pexels-photo-10457787.jpeg?auto=compress&cs=tinysrgb&w=800'
    ]
    when 'Limpeza de pele' then array[
      'https://images.pexels.com/photos/5069432/pexels-photo-5069432.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/3738349/pexels-photo-3738349.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/6663368/pexels-photo-6663368.jpeg?auto=compress&cs=tinysrgb&w=800'
    ]
    when 'Escova' then array[
      'https://images.pexels.com/photos/7755518/pexels-photo-7755518.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/7755553/pexels-photo-7755553.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/3993471/pexels-photo-3993471.jpeg?auto=compress&cs=tinysrgb&w=800'
    ]
    when 'Depilação' then array[
      'https://images.pexels.com/photos/35103884/pexels-photo-35103884.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/6763618/pexels-photo-6763618.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/19239114/pexels-photo-19239114.jpeg?auto=compress&cs=tinysrgb&w=800'
    ]
    when 'Sobrancelha' then array[
      'https://images.pexels.com/photos/29588096/pexels-photo-29588096.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/5177995/pexels-photo-5177995.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/6135628/pexels-photo-6135628.jpeg?auto=compress&cs=tinysrgb&w=800'
    ]
    else array[
      'https://images.pexels.com/photos/14267564/pexels-photo-14267564.jpeg?auto=compress&cs=tinysrgb&w=800'
    ]
  end;
end;
$$ language plpgsql immutable;

-- ------------------------------------------------------------
-- 4b. Função auxiliar para adicionar serviços, faixas e fotos de portfólio
-- ------------------------------------------------------------
create or replace function adicionar_servico_faixa(
  p_email text,
  p_tipo text,
  p_preco_centavos integer,
  p_duracao_min integer,
  p_limite_km numeric,
  p_valor_centavos integer
) returns void as $$
declare
  p_id uuid;
  v_fotos text[];
begin
  select p.id into p_id
  from public.profissional p
  join public.usuario u on u.id = p.usuario_id
  where u.email = p_email;

  v_fotos := fotos_servico(p_tipo);

  insert into public.servico (profissional_id, tipo, preco_centavos, duracao_min, ativo)
  values (p_id, p_tipo, p_preco_centavos, p_duracao_min, true);

  insert into public.faixa_deslocamento (profissional_id, limite_km, valor_centavos, ordem)
  values (p_id, p_limite_km, p_valor_centavos, 1);

  -- Portfólio gerado a partir do tipo de serviço: André Oliveira (Corte masculino)
  -- recebe fotos de barbearia, nunca imagens aleatórias.
  insert into public.foto_portfolio (profissional_id, url)
  select p_id, foto from unnest(v_fotos) as foto;

  -- O avatar também deixa de ser picsum aleatório.
  update public.profissional
  set foto_url = v_fotos[1]
  where id = p_id and foto_url like 'https://picsum.photos%';
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- Coordenadas das cidades (latitude, longitude)
-- Igarassu: -7.8386, -34.9134
-- Itamaracá: -7.7526, -34.8678
-- Itapissuma: -7.7978, -34.9022
-- Abreu e Lima: -7.8594, -34.9767
-- Paulista: -7.9389, -34.8808
-- Olinda: -7.9941, -34.8405
-- Recife: -8.0476, -34.8770
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 5. Manicure (5 profissionais)
-- ------------------------------------------------------------
select criar_profissional_teste(
  'manicure1@prof-teste.app', 'Amanda Oliveira', '20000000001', '81999991001',
  'Centro', 'Igarassu', -7.8386, -34.9134, 5, 24,
  'Manicure e pedicure a domicílio com materiais esterilizados.',
  'https://picsum.photos/seed/amanda/600/600'
);
select adicionar_servico_faixa('manicure1@prof-teste.app', 'Manicure', 4000, 60, 5, 1500);

select criar_profissional_teste(
  'manicure2@prof-teste.app', 'Bruna Costa', '20000000002', '81999991002',
  'Centro', 'Igarassu', -7.8386, -34.9134, 8, 24,
  'Manicure artística e alongamento de unhas a domicílio.',
  'https://picsum.photos/seed/bruna/600/600'
);
select adicionar_servico_faixa('manicure2@prof-teste.app', 'Manicure', 4500, 60, 8, 2000);

select criar_profissional_teste(
  'manicure3@prof-teste.app', 'Camila Dias', '20000000003', '81999991003',
  'Jardim Atlântico', 'Olinda', -7.9941, -34.8405, 15, 24,
  'Manicure simples e pedicure relaxante a domicílio.',
  'https://picsum.photos/seed/camila/600/600'
);
select adicionar_servico_faixa('manicure3@prof-teste.app', 'Manicure', 3800, 50, 15, 2500);

select criar_profissional_teste(
  'manicure4@prof-teste.app', 'Daniela Ferreira', '20000000004', '81999991004',
  'Casa Amarela', 'Recife', -8.0200, -34.9100, 25, 24,
  'Manicure para noivas e eventos a domicílio. Atende até Igarassu.',
  'https://picsum.photos/seed/daniela/600/600'
);
select adicionar_servico_faixa('manicure4@prof-teste.app', 'Manicure', 5000, 70, 25, 3000);

select criar_profissional_teste(
  'manicure5@prof-teste.app', 'Eduarda Lima', '20000000005', '81999991005',
  'Jardim Paulista', 'Paulista', -7.9389, -34.8808, 30, 24,
  'Manicure e pedicure com esmaltação em gel a domicílio.',
  'https://picsum.photos/seed/eduarda/600/600'
);
select adicionar_servico_faixa('manicure5@prof-teste.app', 'Manicure', 4200, 60, 30, 3500);

-- ------------------------------------------------------------
-- 6. Pedicure (5 profissionais)
-- ------------------------------------------------------------
select criar_profissional_teste(
  'pedicure1@prof-teste.app', 'Fernanda Rocha', '21000000001', '81999992001',
  'Centro', 'Igarassu', -7.8386, -34.9134, 5, 24,
  'Pedicure terapêutica e cuidados com os pés a domicílio.',
  'https://picsum.photos/seed/fernanda-rocha/600/600'
);
select adicionar_servico_faixa('pedicure1@prof-teste.app', 'Pedicure', 4500, 60, 5, 1500);

select criar_profissional_teste(
  'pedicure2@prof-teste.app', 'Gabriela Santos', '21000000002', '81999992002',
  'Centro', 'Igarassu', -7.8386, -34.9134, 10, 24,
  'Pedicure relaxante com massagem nos pés a domicílio.',
  'https://picsum.photos/seed/gabriela/600/600'
);
select adicionar_servico_faixa('pedicure2@prof-teste.app', 'Pedicure', 4800, 60, 10, 2000);

select criar_profissional_teste(
  'pedicure3@prof-teste.app', 'Helena Mendes', '21000000003', '81999992003',
  'Varadouro', 'Olinda', -7.9941, -34.8405, 12, 24,
  'Pedicure básica e tratamento de calos a domicílio.',
  'https://picsum.photos/seed/helena/600/600'
);
select adicionar_servico_faixa('pedicure3@prof-teste.app', 'Pedicure', 4200, 55, 12, 2500);

select criar_profissional_teste(
  'pedicure4@prof-teste.app', 'Isabela Pereira', '21000000004', '81999992004',
  'Apipucos', 'Recife', -8.0000, -34.9300, 20, 24,
  'Pedicure para idosos com atenção especializada a domicílio.',
  'https://picsum.photos/seed/isabela/600/600'
);
select adicionar_servico_faixa('pedicure4@prof-teste.app', 'Pedicure', 5200, 70, 20, 3000);

select criar_profissional_teste(
  'pedicure5@prof-teste.app', 'Juliana Alves', '21000000005', '81999992005',
  'Jardim Paulista', 'Paulista', -7.9389, -34.8808, 25, 24,
  'Pedicure e esmaltação com acabamento impecável a domicílio.',
  'https://picsum.photos/seed/juliana/600/600'
);
select adicionar_servico_faixa('pedicure5@prof-teste.app', 'Pedicure', 4600, 60, 25, 3500);

-- ------------------------------------------------------------
-- 7. Corte feminino (5 profissionais)
-- ------------------------------------------------------------
select criar_profissional_teste(
  'cortefem1@prof-teste.app', 'Karen Souza', '22000000001', '81999993001',
  'Centro', 'Igarassu', -7.8386, -34.9134, 6, 24,
  'Corte feminino, escova e finalização a domicílio.',
  'https://picsum.photos/seed/karen/600/600'
);
select adicionar_servico_faixa('cortefem1@prof-teste.app', 'Corte feminino', 5500, 60, 6, 1500);

select criar_profissional_teste(
  'cortefem2@prof-teste.app', 'Larissa Nunes', '22000000002', '81999993002',
  'Centro', 'Igarassu', -7.8386, -34.9134, 10, 24,
  'Corte feminino moderno e coloração a domicílio.',
  'https://picsum.photos/seed/larissa/600/600'
);
select adicionar_servico_faixa('cortefem2@prof-teste.app', 'Corte feminino', 6000, 75, 10, 2000);

select criar_profissional_teste(
  'cortefem3@prof-teste.app', 'Mariana Lopes', '22000000003', '81999993003',
  'Varadouro', 'Olinda', -7.9941, -34.8405, 15, 24,
  'Corte feminino simples e hidratação capilar a domicílio.',
  'https://picsum.photos/seed/mariana-lopes/600/600'
);
select adicionar_servico_faixa('cortefem3@prof-teste.app', 'Corte feminino', 5000, 60, 15, 2500);

select criar_profissional_teste(
  'cortefem4@prof-teste.app', 'Natália Cardoso', '22000000004', '81999993004',
  'Casa Forte', 'Recife', -8.0200, -34.9100, 22, 24,
  'Corte feminino para cacheados e crespos a domicílio.',
  'https://picsum.photos/seed/natalia/600/600'
);
select adicionar_servico_faixa('cortefem4@prof-teste.app', 'Corte feminino', 6500, 80, 22, 3000);

select criar_profissional_teste(
  'cortefem5@prof-teste.app', 'Letícia Barros', '22000000005', '81999993005',
  'Jardim Paulista', 'Paulista', -7.9389, -34.8808, 28, 24,
  'Corte feminino e visagismo a domicílio.',
  'https://picsum.photos/seed/leticia/600/600'
);
select adicionar_servico_faixa('cortefem5@prof-teste.app', 'Corte feminino', 5800, 70, 28, 3500);

-- ------------------------------------------------------------
-- 8. Corte masculino (5 profissionais)
-- ------------------------------------------------------------
select criar_profissional_teste(
  'cortemas1@prof-teste.app', 'Marcos Silva', '23000000001', '81999994001',
  'Centro', 'Igarassu', -7.8386, -34.9134, 5, 24,
  'Corte masculino clássico e moderno a domicílio.',
  'https://picsum.photos/seed/marcos/600/600'
);
select adicionar_servico_faixa('cortemas1@prof-teste.app', 'Corte masculino', 4000, 45, 5, 1500);

select criar_profissional_teste(
  'cortemas2@prof-teste.app', 'Ricardo Santos', '23000000002', '81999994002',
  'Centro', 'Igarassu', -7.8386, -34.9134, 10, 24,
  'Corte masculino com máquina e navalha a domicílio.',
  'https://picsum.photos/seed/ricardo/600/600'
);
select adicionar_servico_faixa('cortemas2@prof-teste.app', 'Corte masculino', 4500, 50, 10, 2000);

select criar_profissional_teste(
  'cortemas3@prof-teste.app', 'Felipe Costa', '23000000003', '81999994003',
  'Varadouro', 'Olinda', -7.9941, -34.8405, 12, 24,
  'Corte masculino simples e barba a domicílio.',
  'https://picsum.photos/seed/felipe/600/600'
);
select adicionar_servico_faixa('cortemas3@prof-teste.app', 'Corte masculino', 3800, 40, 12, 2500);

select criar_profissional_teste(
  'cortemas4@prof-teste.app', 'Gustavo Lima', '23000000004', '81999994004',
  'Apipucos', 'Recife', -8.0000, -34.9300, 18, 24,
  'Corte masculino estilo degradê e fade a domicílio.',
  'https://picsum.photos/seed/gustavo/600/600'
);
select adicionar_servico_faixa('cortemas4@prof-teste.app', 'Corte masculino', 5000, 55, 18, 3000);

select criar_profissional_teste(
  'cortemas5@prof-teste.app', 'André Oliveira', '23000000005', '81999994005',
  'Jardim Paulista', 'Paulista', -7.9389, -34.8808, 25, 24,
  'Corte masculino e acabamento com navalha a domicílio.',
  'https://picsum.photos/seed/andre/600/600'
);
select adicionar_servico_faixa('cortemas5@prof-teste.app', 'Corte masculino', 4200, 48, 25, 3500);

-- ------------------------------------------------------------
-- 9. Barba (5 profissionais)
-- ------------------------------------------------------------
select criar_profissional_teste(
  'barba1@prof-teste.app', 'Carlos Alberto', '24000000001', '81999995001',
  'Centro', 'Igarassu', -7.8386, -34.9134, 5, 24,
  'Barba, bigode e acabamento com navalha a domicílio.',
  'https://picsum.photos/seed/carlos-alberto/600/600'
);
select adicionar_servico_faixa('barba1@prof-teste.app', 'Barba', 3000, 30, 5, 1500);

select criar_profissional_teste(
  'barba2@prof-teste.app', 'Pedro Henrique', '24000000002', '81999995002',
  'Centro', 'Igarassu', -7.8386, -34.9134, 8, 24,
  'Barba completa com hidratação facial a domicílio.',
  'https://picsum.photos/seed/pedro-h/600/600'
);
select adicionar_servico_faixa('barba2@prof-teste.app', 'Barba', 3500, 35, 8, 2000);

select criar_profissional_teste(
  'barba3@prof-teste.app', 'Lucas Mendes', '24000000003', '81999995003',
  'Varadouro', 'Olinda', -7.9941, -34.8405, 10, 24,
  'Barba curta e desenho de sobrancelha masculina a domicílio.',
  'https://picsum.photos/seed/lucas/600/600'
);
select adicionar_servico_faixa('barba3@prof-teste.app', 'Barba', 2800, 25, 10, 2500);

select criar_profissional_teste(
  'barba4@prof-teste.app', 'Rafael Dias', '24000000004', '81999995004',
  'Apipucos', 'Recife', -8.0000, -34.9300, 15, 24,
  'Barba longa com corte de cabelo e navalha a domicílio.',
  'https://picsum.photos/seed/rafael/600/600'
);
select adicionar_servico_faixa('barba4@prof-teste.app', 'Barba', 4000, 40, 15, 3000);

select criar_profissional_teste(
  'barba5@prof-teste.app', 'Thiago Silva', '24000000005', '81999995005',
  'Jardim Paulista', 'Paulista', -7.9389, -34.8808, 20, 24,
  'Barba modelada e tratamentos faciais masculinos a domicílio.',
  'https://picsum.photos/seed/thiago/600/600'
);
select adicionar_servico_faixa('barba5@prof-teste.app', 'Barba', 3200, 32, 20, 3500);

-- ------------------------------------------------------------
-- 10. Maquiagem (5 profissionais)
-- ------------------------------------------------------------
select criar_profissional_teste(
  'makeup1@prof-teste.app', 'Patrícia Costa', '25000000001', '81999996001',
  'Centro', 'Igarassu', -7.8386, -34.9134, 6, 24,
  'Maquiagem para eventos, noivas e produções a domicílio.',
  'https://picsum.photos/seed/patricia/600/600'
);
select adicionar_servico_faixa('makeup1@prof-teste.app', 'Maquiagem', 8000, 90, 6, 1500);

select criar_profissional_teste(
  'makeup2@prof-teste.app', 'Roberta Lima', '25000000002', '81999996002',
  'Centro', 'Igarassu', -7.8386, -34.9134, 10, 24,
  'Maquiagem artística e para fotos a domicílio.',
  'https://picsum.photos/seed/roberta/600/600'
);
select adicionar_servico_faixa('makeup2@prof-teste.app', 'Maquiagem', 7500, 80, 10, 2000);

select criar_profissional_teste(
  'makeup3@prof-teste.app', 'Simone Oliveira', '25000000003', '81999996003',
  'Varadouro', 'Olinda', -7.9941, -34.8405, 15, 24,
  'Maquiagem social e para formaturas a domicílio.',
  'https://picsum.photos/seed/simone/600/600'
);
select adicionar_servico_faixa('makeup3@prof-teste.app', 'Maquiagem', 7000, 75, 15, 2500);

select criar_profissional_teste(
  'makeup4@prof-teste.app', 'Tatiane Santos', '25000000004', '81999996004',
  'Apipucos', 'Recife', -8.0000, -34.9300, 20, 24,
  'Maquiagem para festas e eventos corporativos a domicílio.',
  'https://picsum.photos/seed/tatiane/600/600'
);
select adicionar_servico_faixa('makeup4@prof-teste.app', 'Maquiagem', 8500, 95, 20, 3000);

select criar_profissional_teste(
  'makeup5@prof-teste.app', 'Vanessa Rocha', '25000000005', '81999996005',
  'Jardim Paulista', 'Paulista', -7.9389, -34.8808, 25, 24,
  'Maquiagem para noivas e madrinhas a domicílio.',
  'https://picsum.photos/seed/vanessa/600/600'
);
select adicionar_servico_faixa('makeup5@prof-teste.app', 'Maquiagem', 9000, 100, 25, 3500);

-- ------------------------------------------------------------
-- 11. Limpeza de pele (5 profissionais)
-- ------------------------------------------------------------
select criar_profissional_teste(
  'limpeza1@prof-teste.app', 'Cristina Dias', '26000000001', '81999997001',
  'Centro', 'Igarassu', -7.8386, -34.9134, 5, 24,
  'Limpeza de pele profunda e extração de cravos a domicílio.',
  'https://picsum.photos/seed/cristina/600/600'
);
select adicionar_servico_faixa('limpeza1@prof-teste.app', 'Limpeza de pele', 9000, 60, 5, 1500);

select criar_profissional_teste(
  'limpeza2@prof-teste.app', 'Patrícia Mendes', '26000000002', '81999997002',
  'Centro', 'Igarassu', -7.8386, -34.9134, 10, 24,
  'Limpeza de pele com vaporozo e máscara facial a domicílio.',
  'https://picsum.photos/seed/patricia-m/600/600'
);
select adicionar_servico_faixa('limpeza2@prof-teste.app', 'Limpeza de pele', 9500, 70, 10, 2000);

select criar_profissional_teste(
  'limpeza3@prof-teste.app', 'Juliana Pereira', '26000000003', '81999997003',
  'Varadouro', 'Olinda', -7.9941, -34.8405, 12, 24,
  'Limpeza de pele para acne e pele oleosa a domicílio.',
  'https://picsum.photos/seed/juliana-p/600/600'
);
select adicionar_servico_faixa('limpeza3@prof-teste.app', 'Limpeza de pele', 8800, 65, 12, 2500);

select criar_profissional_teste(
  'limpeza4@prof-teste.app', 'Sandra Oliveira', '26000000004', '81999997004',
  'Apipucos', 'Recife', -8.0000, -34.9300, 18, 24,
  'Limpeza de pele rejuvenescedora com massagem facial a domicílio.',
  'https://picsum.photos/seed/sandra/600/600'
);
select adicionar_servico_faixa('limpeza4@prof-teste.app', 'Limpeza de pele', 10000, 75, 18, 3000);

select criar_profissional_teste(
  'limpeza5@prof-teste.app', 'Luciana Costa', '26000000005', '81999997005',
  'Jardim Paulista', 'Paulista', -7.9389, -34.8808, 22, 24,
  'Limpeza de pele com peeling simples e hidratação a domicílio.',
  'https://picsum.photos/seed/luciana/600/600'
);
select adicionar_servico_faixa('limpeza5@prof-teste.app', 'Limpeza de pele', 9200, 68, 22, 3500);

-- ------------------------------------------------------------
-- 12. Escova (5 profissionais)
-- ------------------------------------------------------------
select criar_profissional_teste(
  'escova1@prof-teste.app', 'Aline Silva', '27000000001', '81999998001',
  'Centro', 'Igarassu', -7.8386, -34.9134, 6, 24,
  'Escova progressiva, selagem e alisamento a domicílio.',
  'https://picsum.photos/seed/aline/600/600'
);
select adicionar_servico_faixa('escova1@prof-teste.app', 'Escova', 12000, 90, 6, 1500);

select criar_profissional_teste(
  'escova2@prof-teste.app', 'Beatriz Santos', '27000000002', '81999998002',
  'Centro', 'Igarassu', -7.8386, -34.9134, 10, 24,
  'Escova definitiva e tratamento capilar a domicílio.',
  'https://picsum.photos/seed/beatriz-s/600/600'
);
select adicionar_servico_faixa('escova2@prof-teste.app', 'Escova', 13000, 100, 10, 2000);

select criar_profissional_teste(
  'escova3@prof-teste.app', 'Carla Oliveira', '27000000003', '81999998003',
  'Varadouro', 'Olinda', -7.9941, -34.8405, 15, 24,
  'Escova simples e hidratação capilar a domicílio.',
  'https://picsum.photos/seed/carla-o/600/600'
);
select adicionar_servico_faixa('escova3@prof-teste.app', 'Escova', 10000, 80, 15, 2500);

select criar_profissional_teste(
  'escova4@prof-teste.app', 'Daniela Lima', '27000000004', '81999998004',
  'Apipucos', 'Recife', -8.0000, -34.9300, 20, 24,
  'Escova com cauterização e reconstrução capilar a domicílio.',
  'https://picsum.photos/seed/daniela-l/600/600'
);
select adicionar_servico_faixa('escova4@prof-teste.app', 'Escova', 14000, 110, 20, 3000);

select criar_profissional_teste(
  'escova5@prof-teste.app', 'Elisa Alves', '27000000005', '81999998005',
  'Jardim Paulista', 'Paulista', -7.9389, -34.8808, 25, 24,
  'Escova modeladora e finalização com prancha a domicílio.',
  'https://picsum.photos/seed/elisa/600/600'
);
select adicionar_servico_faixa('escova5@prof-teste.app', 'Escova', 11000, 85, 25, 3500);

-- ------------------------------------------------------------
-- 13. Depilação (5 profissionais)
-- ------------------------------------------------------------
select criar_profissional_teste(
  'depil1@prof-teste.app', 'Roberta Oliveira', '28000000001', '81999999001',
  'Centro', 'Igarassu', -7.8386, -34.9134, 5, 24,
  'Depilação com cera quente e fria a domicílio.',
  'https://picsum.photos/seed/roberta-o/600/600'
);
select adicionar_servico_faixa('depil1@prof-teste.app', 'Depilação', 5000, 45, 5, 1500);

select criar_profissional_teste(
  'depil2@prof-teste.app', 'Simone Costa', '28000000002', '81999999002',
  'Centro', 'Igarassu', -7.8386, -34.9134, 10, 24,
  'Depilação completa com cera quente a domicílio.',
  'https://picsum.photos/seed/simone-c/600/600'
);
select adicionar_servico_faixa('depil2@prof-teste.app', 'Depilação', 5500, 50, 10, 2000);

select criar_profissional_teste(
  'depil3@prof-teste.app', 'Tatiane Mendes', '28000000003', '81999999003',
  'Varadouro', 'Olinda', -7.9941, -34.8405, 12, 24,
  'Depilação de sobrancelha e buço a domicílio.',
  'https://picsum.photos/seed/tatiane-m/600/600'
);
select adicionar_servico_faixa('depil3@prof-teste.app', 'Depilação', 4500, 40, 12, 2500);

select criar_profissional_teste(
  'depil4@prof-teste.app', 'Vanessa Dias', '28000000004', '81999999004',
  'Apipucos', 'Recife', -8.0000, -34.9300, 18, 24,
  'Depilação com cera morna e atendimento rápido a domicílio.',
  'https://picsum.photos/seed/vanessa-d/600/600'
);
select adicionar_servico_faixa('depil4@prof-teste.app', 'Depilação', 6000, 55, 18, 3000);

select criar_profissional_teste(
  'depil5@prof-teste.app', 'Lúcia Santos', '28000000005', '81999999005',
  'Jardim Paulista', 'Paulista', -7.9389, -34.8808, 22, 24,
  'Depilação completa com cera depilatória a domicílio.',
  'https://picsum.photos/seed/lucia/600/600'
);
select adicionar_servico_faixa('depil5@prof-teste.app', 'Depilação', 5200, 48, 22, 3500);

-- ------------------------------------------------------------
-- 14. Sobrancelha (5 profissionais)
-- ------------------------------------------------------------
select criar_profissional_teste(
  'sobrancelha1@prof-teste.app', 'Mariana Santos', '29000000001', '81999990101',
  'Centro', 'Igarassu', -7.8386, -34.9134, 5, 24,
  'Design de sobrancelha com henna e pinça a domicílio.',
  'https://picsum.photos/seed/mariana-s/600/600'
);
select adicionar_servico_faixa('sobrancelha1@prof-teste.app', 'Sobrancelha', 3500, 30, 5, 1500);

select criar_profissional_teste(
  'sobrancelha2@prof-teste.app', 'Juliana Lima', '29000000002', '81999990102',
  'Centro', 'Igarassu', -7.8386, -34.9134, 8, 24,
  'Design de sobrancelha e micropigmentação a domicílio.',
  'https://picsum.photos/seed/juliana-l/600/600'
);
select adicionar_servico_faixa('sobrancelha2@prof-teste.app', 'Sobrancelha', 4000, 35, 8, 2000);

select criar_profissional_teste(
  'sobrancelha3@prof-teste.app', 'Fernanda Costa', '29000000003', '81999990103',
  'Varadouro', 'Olinda', -7.9941, -34.8405, 10, 24,
  'Sobrancelha com linha egípcia e henna a domicílio.',
  'https://picsum.photos/seed/fernanda-c/600/600'
);
select adicionar_servico_faixa('sobrancelha3@prof-teste.app', 'Sobrancelha', 3200, 28, 10, 2500);

select criar_profissional_teste(
  'sobrancelha4@prof-teste.app', 'Amanda Rocha', '29000000004', '81999990104',
  'Apipucos', 'Recife', -8.0000, -34.9300, 15, 24,
  'Design de sobrancelha masculino e feminino a domicílio.',
  'https://picsum.photos/seed/amanda-r/600/600'
);
select adicionar_servico_faixa('sobrancelha4@prof-teste.app', 'Sobrancelha', 3800, 32, 15, 3000);

select criar_profissional_teste(
  'sobrancelha5@prof-teste.app', 'Carla Dias', '29000000005', '81999990105',
  'Jardim Paulista', 'Paulista', -7.9389, -34.8808, 20, 24,
  'Sobrancelha com mapeamento facial e henna a domicílio.',
  'https://picsum.photos/seed/carla-d/600/600'
);
select adicionar_servico_faixa('sobrancelha5@prof-teste.app', 'Sobrancelha', 4200, 38, 20, 3500);

-- ------------------------------------------------------------
-- Log de auditoria
-- ------------------------------------------------------------
insert into public.log_auditoria (acao, entidade, detalhe_json)
values ('seed_5_profissionais_por_tipo_aplicado', 'sistema',
  jsonb_build_object(
    'tipos_servico', ARRAY['Manicure', 'Pedicure', 'Corte feminino', 'Corte masculino', 'Barba', 'Maquiagem', 'Limpeza de pele', 'Escova', 'Depilação', 'Sobrancelha'],
    'qtde_por_tipo', 5,
    'total_profissionais', 50,
    'excluido', 'Fernanda Alves',
    'cidades', ARRAY['Igarassu', 'Olinda', 'Recife', 'Paulista']
  ));
