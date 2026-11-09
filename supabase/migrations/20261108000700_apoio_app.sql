-- ============================================================
-- 0007 - Apoio ao app: prévia de valores e coordenadas do perfil
-- ============================================================
set search_path to public, extensions;

create or replace function public.meu_perfil()
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
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
    ),
    'endereco_lat', (
      select extensions.st_y(e.localizacao::extensions.geometry)
      from public.endereco e
      join public.cliente c on c.id = e.cliente_id
      where c.usuario_id = auth.uid()
    ),
    'endereco_lng', (
      select extensions.st_x(e.localizacao::extensions.geometry)
      from public.endereco e
      join public.cliente c on c.id = e.cliente_id
      where c.usuario_id = auth.uid()
    )
  );
$$;

create or replace function public.previa_agendamento(
  p_profissional_id uuid,
  p_servico_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_cliente public.cliente;
  v_end     public.endereco;
  v_prof    public.profissional;
  v_serv    public.servico;
  v_dist    numeric(6,2);
  v_faixa   public.faixa_deslocamento;
begin
  select * into v_cliente from public.cliente where usuario_id = auth.uid();
  if not found then
    raise exception 'Apenas clientes podem solicitar agendamentos';
  end if;

  select * into v_end from public.endereco where cliente_id = v_cliente.id;
  if not found then
    return jsonb_build_object(
      'disponivel', false,
      'motivo', 'Cadastre seu endereço antes de agendar'
    );
  end if;

  select * into v_prof
  from public.profissional
  where id = p_profissional_id and status_verificacao = 'aprovado' and ativo;
  if not found then
    raise exception 'Profissional indisponível';
  end if;

  select * into v_serv
  from public.servico
  where id = p_servico_id and profissional_id = v_prof.id and ativo;
  if not found then
    raise exception 'Serviço inválido';
  end if;

  v_dist := round(
    (extensions.st_distance(v_prof.localizacao_ref, v_end.localizacao) / 1000)::numeric,
    2
  );

  if v_dist > v_prof.distancia_maxima_km then
    return jsonb_build_object(
      'disponivel', false,
      'distancia_km', v_dist,
      'motivo', 'Profissional não atende tão longe'
    );
  end if;

  select * into v_faixa
  from public.faixa_deslocamento
  where profissional_id = v_prof.id and limite_km >= v_dist
  order by limite_km
  limit 1;

  if not found then
    return jsonb_build_object(
      'disponivel', false,
      'distancia_km', v_dist,
      'motivo', 'Faixa de deslocamento indisponível'
    );
  end if;

  return jsonb_build_object(
    'disponivel', true,
    'distancia_km', v_dist,
    'faixa_limite_km', v_faixa.limite_km,
    'valor_deslocamento_centavos', v_faixa.valor_centavos,
    'preco_servico_centavos', v_serv.preco_centavos,
    'total_centavos', v_serv.preco_centavos + v_faixa.valor_centavos
  );
end;
$$;

revoke all on function public.previa_agendamento(uuid, uuid) from public;
grant execute on function public.previa_agendamento(uuid, uuid) to authenticated;
