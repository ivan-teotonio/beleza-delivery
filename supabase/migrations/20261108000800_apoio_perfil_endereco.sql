-- ============================================================
-- 0008 - Apoio ao app: endereço, perfil e arquivos do profissional
-- ============================================================
set search_path to public, extensions;

-- ------------------------------------------------------------
-- Endereço único do cliente (RF22/RF23)
-- ------------------------------------------------------------
create or replace function public.salvar_endereco_cliente(
  p_cep text,
  p_rua text,
  p_numero text,
  p_complemento text,
  p_bairro text,
  p_cidade text,
  p_lat double precision,
  p_lng double precision
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cliente uuid := public.meu_cliente_id();
  v_end     public.endereco;
begin
  if v_cliente is null then
    raise exception 'Apenas clientes possuem endereço';
  end if;
  if p_lat is null or p_lng is null
     or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    raise exception 'Localização inválida. Informe latitude e longitude.';
  end if;
  if coalesce(length(trim(p_cep)), 0) = 0
     or coalesce(length(trim(p_rua)), 0) = 0
     or coalesce(length(trim(p_numero)), 0) = 0
     or coalesce(length(trim(p_bairro)), 0) = 0
     or coalesce(length(trim(p_cidade)), 0) = 0 then
    raise exception 'Preencha CEP, rua, número, bairro e cidade';
  end if;

  insert into public.endereco (
    cliente_id, cep, rua, numero, complemento, bairro, cidade, localizacao
  ) values (
    v_cliente,
    trim(p_cep),
    trim(p_rua),
    trim(p_numero),
    nullif(trim(p_complemento), ''),
    trim(p_bairro),
    trim(p_cidade),
    extensions.st_setsrid(
      extensions.st_makepoint(p_lng, p_lat), 4326
    )::extensions.geography
  )
  on conflict (cliente_id) do update
    set cep = excluded.cep,
        rua = excluded.rua,
        numero = excluded.numero,
        complemento = excluded.complemento,
        bairro = excluded.bairro,
        cidade = excluded.cidade,
        localizacao = excluded.localizacao
  returning * into v_end;

  perform public.registrar_log(
    'endereco_atualizado', 'endereco', v_end.id,
    jsonb_build_object('bairro', v_end.bairro, 'cidade', v_end.cidade)
  );

  return to_jsonb(v_end);
end;
$$;

create or replace function public.atualizar_dados_cliente(
  p_nome text,
  p_telefone text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.meu_cliente_id();
  v_cliente public.cliente;
begin
  if v_id is null then
    raise exception 'Apenas clientes possuem este perfil';
  end if;
  if coalesce(length(trim(p_nome)), 0) < 2 then
    raise exception 'Informe seu nome completo';
  end if;

  update public.cliente
     set nome = trim(p_nome),
         telefone = nullif(trim(p_telefone), '')
   where id = v_id
  returning * into v_cliente;

  return to_jsonb(v_cliente);
end;
$$;

-- ------------------------------------------------------------
-- Foto e documento do profissional (RF03/RNF11)
-- ------------------------------------------------------------
create or replace function public.atualizar_foto_profissional(p_url text)
returns jsonb
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
  if coalesce(length(trim(p_url)), 0) = 0 then
    raise exception 'URL da foto inválida';
  end if;

  update public.profissional
     set foto_url = trim(p_url)
   where id = v_id
  returning * into v_prof;

  perform public.registrar_log('foto_profissional_atualizada', 'profissional', v_id, '{}'::jsonb);
  return to_jsonb(v_prof);
end;
$$;

create or replace function public.atualizar_documento_profissional(p_chave text)
returns jsonb
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
  if coalesce(length(trim(p_chave)), 0) = 0 then
    raise exception 'Documento inválido';
  end if;

  update public.profissional
     set documento_chave = trim(p_chave)
   where id = v_id
  returning * into v_prof;

  perform public.registrar_log('documento_profissional_atualizado', 'profissional', v_id, '{}'::jsonb);
  return to_jsonb(v_prof);
end;
$$;

-- ------------------------------------------------------------
-- Tipos de serviço disponíveis para filtro (RF10)
-- ------------------------------------------------------------
create or replace function public.tipos_servico_disponiveis()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select distinct s.tipo
  from public.servico s
  join public.profissional p on p.id = s.profissional_id
  where s.ativo and p.ativo and p.status_verificacao = 'aprovado'
  order by 1;
$$;

revoke all on function public.salvar_endereco_cliente(text, text, text, text, text, text, double precision, double precision) from public;
grant execute on function public.salvar_endereco_cliente(text, text, text, text, text, text, double precision, double precision) to authenticated;

revoke all on function public.atualizar_dados_cliente(text, text) from public;
grant execute on function public.atualizar_dados_cliente(text, text) to authenticated;

revoke all on function public.atualizar_foto_profissional(text) from public;
grant execute on function public.atualizar_foto_profissional(text) to authenticated;

revoke all on function public.atualizar_documento_profissional(text) from public;
grant execute on function public.atualizar_documento_profissional(text) to authenticated;

revoke all on function public.tipos_servico_disponiveis() from public;
grant execute on function public.tipos_servico_disponiveis() to authenticated;
