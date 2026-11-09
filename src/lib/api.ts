import { supabase } from './supabase';
import { AppError, erroDeRpc, mensagemErro } from './errors';
import type {
  Agendamento,
  AgendaSlot,
  Endereco,
  Faixa,
  FotoPortfolio,
  LogAuditoria,
  Mensagem,
  PerfilUsuario,
  PreviaAgendamento,
  Profissional,
  ProfissionalPublico,
  RelatorioProfissional,
  ResultadoBusca,
  Servico,
  TipoConta,
} from './types';

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw erroDeRpc(error);
  return data as T;
}

function falha(error: unknown): never {
  throw new AppError(mensagemErro(error));
}

// ------------------------------------------------------------
// Autenticação (Supabase Auth)
// ------------------------------------------------------------
export interface CadastroInput {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  tipo: Exclude<TipoConta, 'admin'>;
}

export async function cadastrar(input: CadastroInput) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.senha,
    options: {
      data: {
        tipo: input.tipo,
        nome: input.nome.trim(),
        telefone: input.telefone.trim(),
      },
    },
  });
  if (error) falha(error);
  return data;
}

export async function entrar(email: string, senha: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: senha,
  });
  if (error) falha(error);
  return data;
}

export async function sair() {
  const { error } = await supabase.auth.signOut();
  if (error) falha(error);
}

export async function recuperarSenha(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: 'beleza-delivery://redefinir-senha',
  });
  if (error) falha(error);
}

/** Conclui o link de recuperação (fluxo PKCE) trocando o código por sessão. */
export async function trocarCodigoPorSessao(codigo: string) {
  const { data, error } = await supabase.auth.exchangeCodeForSession(codigo);
  if (error) falha(error);
  return data.session;
}

/** Define a nova senha do usuário autenticado (link de recuperação). */
export async function definirNovaSenha(senha: string) {
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) falha(error);
}

// ------------------------------------------------------------
// Perfil e endereço
// ------------------------------------------------------------
export async function meuPerfil(): Promise<PerfilUsuario> {
  const data = await rpc<PerfilUsuario>('meu_perfil');
  return {
    usuario: data?.usuario ?? null,
    cliente: data?.cliente ?? null,
    profissional: data?.profissional ?? null,
    endereco: data?.endereco ?? null,
    endereco_lat: data?.endereco_lat ?? null,
    endereco_lng: data?.endereco_lng ?? null,
    profissional_lat: data?.profissional_lat ?? null,
    profissional_lng: data?.profissional_lng ?? null,
  };
}

export async function atualizarDadosCliente(nome: string, telefone: string): Promise<void> {
  await rpc('atualizar_dados_cliente', { p_nome: nome, p_telefone: telefone });
}

export interface EnderecoInput {
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  lat: number;
  lng: number;
}

export async function salvarEndereco(input: EnderecoInput): Promise<Endereco> {
  const data = await rpc<Record<string, unknown>>('salvar_endereco_cliente', {
    p_cep: input.cep,
    p_rua: input.rua,
    p_numero: input.numero,
    p_complemento: input.complemento ?? '',
    p_bairro: input.bairro,
    p_cidade: input.cidade,
    p_lat: input.lat,
    p_lng: input.lng,
  });
  return data as unknown as Endereco;
}

export interface NovoProfissionalInput {
  nome: string;
  cpf: string;
  telefone: string;
  bairro: string;
  cidade: string;
  lat: number;
  lng: number;
  descricao: string;
  distancia_maxima_km: number;
  faixas: Faixa[];
}

export async function criarPerfilProfissional(input: NovoProfissionalInput): Promise<Profissional> {
  const data = await rpc<Record<string, unknown>>('criar_perfil_profissional', {
    p_nome: input.nome,
    p_cpf: input.cpf,
    p_telefone: input.telefone,
    p_bairro: input.bairro,
    p_cidade: input.cidade,
    p_lat: input.lat,
    p_lng: input.lng,
    p_descricao: input.descricao,
    p_distancia_maxima_km: input.distancia_maxima_km,
    p_faixas: input.faixas.map((f, i) => ({
      limite_km: f.limite_km,
      valor_centavos: f.valor_centavos,
      ordem: i + 1,
    })),
  });
  return data as unknown as Profissional;
}

export interface AtualizarProfissionalInput {
  nome: string;
  telefone: string;
  bairro: string;
  cidade: string;
  lat: number;
  lng: number;
  descricao: string;
  prazo_resposta_h: number;
}

export async function atualizarPerfilProfissional(input: AtualizarProfissionalInput): Promise<void> {
  await rpc('atualizar_perfil_profissional', {
    p_nome: input.nome,
    p_telefone: input.telefone,
    p_bairro: input.bairro,
    p_cidade: input.cidade,
    p_lat: input.lat,
    p_lng: input.lng,
    p_descricao: input.descricao,
    p_prazo_resposta_h: input.prazo_resposta_h,
  });
}

export async function salvarConfigDeslocamento(
  distanciaMaximaKm: number,
  faixas: Faixa[],
): Promise<void> {
  await rpc('salvar_config_deslocamento', {
    p_distancia_maxima_km: distanciaMaximaKm,
    p_faixas: faixas.map((f, i) => ({
      limite_km: f.limite_km,
      valor_centavos: f.valor_centavos,
      ordem: i + 1,
    })),
  });
}

export async function atualizarFotoProfissional(url: string): Promise<void> {
  await rpc('atualizar_foto_profissional', { p_url: url });
}

export async function atualizarDocumentoProfissional(chave: string): Promise<void> {
  await rpc('atualizar_documento_profissional', { p_chave: chave });
}

// ------------------------------------------------------------
// Busca e perfil público
// ------------------------------------------------------------
export interface BuscaInput {
  lat: number;
  lng: number;
  tipo?: string | null;
  busca?: string | null;
  limite?: number;
}

export async function buscarProfissionais(input: BuscaInput): Promise<ResultadoBusca[]> {
  const data = await rpc<ResultadoBusca[]>('buscar_profissionais', {
    p_lat: input.lat,
    p_lng: input.lng,
    p_tipo: input.tipo?.trim() || null,
    p_busca: input.busca?.trim() || null,
    p_limite: input.limite ?? 50,
  });
  return Array.isArray(data) ? data : [];
}

export async function obterProfissionalPublico(id: string): Promise<ProfissionalPublico> {
  const data = await rpc<ProfissionalPublico>('obter_profissional_publico', { p_id: id });
  if (!data) throw new AppError('Profissional não encontrado.');
  return data;
}

export async function tiposServicoDisponiveis(): Promise<string[]> {
  const { data, error } = await supabase.rpc('tipos_servico_disponiveis');
  if (error) throw erroDeRpc(error);
  return Array.isArray(data) ? (data as string[]) : [];
}

// ------------------------------------------------------------
// Agenda
// ------------------------------------------------------------
export async function listarAgenda(
  profissionalId: string,
  de: string,
  ate: string,
  somenteDisponivel = false,
): Promise<AgendaSlot[]> {
  let query = supabase
    .from('agenda')
    .select('id, profissional_id, inicio, fim, status')
    .eq('profissional_id', profissionalId)
    .gte('inicio', de)
    .lte('inicio', ate)
    .order('inicio', { ascending: true })
    .limit(500);
  if (somenteDisponivel) query = query.eq('status', 'disponivel');
  const { data, error } = await query;
  if (error) throw erroDeRpc(error);
  return (data ?? []) as AgendaSlot[];
}

export async function criarBloqueAgenda(
  profissionalId: string,
  inicio: string,
  duracaoMin: number,
): Promise<void> {
  const fim = new Date(new Date(inicio).getTime() + duracaoMin * 60_000).toISOString();
  const { error } = await supabase.from('agenda').insert({
    profissional_id: profissionalId,
    inicio,
    fim,
    status: 'disponivel',
  });
  if (error) throw erroDeRpc(error);
}

export async function excluirBloqueAgenda(id: string): Promise<void> {
  const { error } = await supabase.from('agenda').delete().eq('id', id);
  if (error) throw erroDeRpc(error);
}

// ------------------------------------------------------------
// Serviços
// ------------------------------------------------------------
export async function listarServicos(profissionalId: string): Promise<Servico[]> {
  const { data, error } = await supabase
    .from('servico')
    .select('*')
    .eq('profissional_id', profissionalId)
    .order('tipo', { ascending: true });
  if (error) throw erroDeRpc(error);
  return (data ?? []) as Servico[];
}

export async function listarFaixas(profissionalId: string): Promise<Faixa[]> {
  const { data, error } = await supabase
    .from('faixa_deslocamento')
    .select('id, profissional_id, limite_km, valor_centavos, ordem')
    .eq('profissional_id', profissionalId)
    .order('ordem', { ascending: true });
  if (error) throw erroDeRpc(error);
  return (data ?? []) as Faixa[];
}

export interface ServicoInput {
  tipo: string;
  preco_centavos: number;
  duracao_min: number;
  ativo?: boolean;
}

export async function criarServico(profissionalId: string, input: ServicoInput): Promise<void> {
  const { error } = await supabase.from('servico').insert({
    profissional_id: profissionalId,
    tipo: input.tipo.trim(),
    preco_centavos: input.preco_centavos,
    duracao_min: input.duracao_min,
    ativo: input.ativo ?? true,
  });
  if (error) throw erroDeRpc(error);
}

export async function atualizarServico(id: string, input: ServicoInput): Promise<void> {
  const { error } = await supabase
    .from('servico')
    .update({
      tipo: input.tipo.trim(),
      preco_centavos: input.preco_centavos,
      duracao_min: input.duracao_min,
      ativo: input.ativo ?? true,
    })
    .eq('id', id);
  if (error) throw erroDeRpc(error);
}

export async function excluirServico(id: string): Promise<void> {
  const { error } = await supabase.from('servico').delete().eq('id', id);
  if (error) throw erroDeRpc(error);
}

// ------------------------------------------------------------
// Portfólio
// ------------------------------------------------------------
export async function listarPortfolio(profissionalId: string): Promise<FotoPortfolio[]> {
  const { data, error } = await supabase
    .from('foto_portfolio')
    .select('*')
    .eq('profissional_id', profissionalId)
    .order('enviada_em', { ascending: false });
  if (error) throw erroDeRpc(error);
  return (data ?? []) as FotoPortfolio[];
}

export async function criarFotoPortfolio(
  profissionalId: string,
  url: string,
  storagePath: string | null,
): Promise<void> {
  const { error } = await supabase.from('foto_portfolio').insert({
    profissional_id: profissionalId,
    url,
    storage_path: storagePath,
  });
  if (error) throw erroDeRpc(error);
}

export async function excluirFotoPortfolio(id: string, storagePath?: string | null): Promise<void> {
  if (storagePath) {
    await supabase.storage.from('portfolio').remove([storagePath]);
  }
  const { error } = await supabase.from('foto_portfolio').delete().eq('id', id);
  if (error) throw erroDeRpc(error);
}

// ------------------------------------------------------------
// Agendamentos
// ------------------------------------------------------------
export async function listarAgendamentos(): Promise<Agendamento[]> {
  const data = await rpc<Agendamento[]>('listar_agendamentos');
  return Array.isArray(data) ? data : [];
}

export async function detalharAgendamento(id: string): Promise<Agendamento | null> {
  const data = await rpc<Agendamento | null>('detalhar_agendamento', { p_id: id });
  return data ?? null;
}

export async function previaAgendamento(
  profissionalId: string,
  servicoId: string,
): Promise<PreviaAgendamento> {
  return rpc<PreviaAgendamento>('previa_agendamento', {
    p_profissional_id: profissionalId,
    p_servico_id: servicoId,
  });
}

export interface SolicitarAgendamentoInput {
  profissionalId: string;
  servicoId: string;
  enderecoId: string;
  inicio: string;
  chaveIdempotencia: string;
}

export async function solicitarAgendamento(input: SolicitarAgendamentoInput): Promise<Agendamento> {
  const data = await rpc<Record<string, unknown>>('solicitar_agendamento', {
    p_profissional_id: input.profissionalId,
    p_servico_id: input.servicoId,
    p_endereco_id: input.enderecoId,
    p_inicio: input.inicio,
    p_chave_idempotencia: input.chaveIdempotencia,
  });
  return data as unknown as Agendamento;
}

export async function decidirAgendamento(
  id: string,
  aceitar: boolean,
  motivo?: string,
): Promise<Agendamento> {
  const data = await rpc<Record<string, unknown>>('decidir_agendamento', {
    p_id: id,
    p_aceitar: aceitar,
    p_motivo: motivo ?? null,
  });
  return data as unknown as Agendamento;
}

export async function cancelarAgendamento(id: string, motivo?: string): Promise<Agendamento> {
  const data = await rpc<Record<string, unknown>>('cancelar_agendamento', {
    p_id: id,
    p_motivo: motivo ?? null,
  });
  return data as unknown as Agendamento;
}

export async function concluirAgendamento(id: string): Promise<Agendamento> {
  const data = await rpc<Record<string, unknown>>('concluir_agendamento', { p_id: id });
  return data as unknown as Agendamento;
}

export async function avaliarAgendamento(
  id: string,
  nota: number,
  comentario?: string,
): Promise<void> {
  await rpc('avaliar_agendamento', {
    p_agendamento_id: id,
    p_nota: nota,
    p_comentario: comentario ?? null,
  });
}

export async function relatorioProfissional(
  inicio: string,
  fim: string,
): Promise<RelatorioProfissional> {
  return rpc<RelatorioProfissional>('relatorio_profissional', {
    p_inicio: inicio,
    p_fim: fim,
  });
}

// ------------------------------------------------------------
// Chat
// ------------------------------------------------------------
export async function listarMensagens(agendamentoId: string): Promise<Mensagem[]> {
  const { data, error } = await supabase
    .from('mensagem')
    .select('id, agendamento_id, remetente_id, conteudo, enviada_em')
    .eq('agendamento_id', agendamentoId)
    .order('enviada_em', { ascending: true })
    .limit(500);
  if (error) throw erroDeRpc(error);
  return (data ?? []) as Mensagem[];
}

export async function enviarMensagem(
  agendamentoId: string,
  remetenteId: string,
  conteudo: string,
): Promise<Mensagem> {
  const { data, error } = await supabase
    .from('mensagem')
    .insert({
      agendamento_id: agendamentoId,
      remetente_id: remetenteId,
      conteudo: conteudo.trim(),
    })
    .select('id, agendamento_id, remetente_id, conteudo, enviada_em')
    .single();
  if (error) throw erroDeRpc(error);
  return data as Mensagem;
}

// ------------------------------------------------------------
// Administração
// ------------------------------------------------------------
export async function listarProfissionaisAdmin(status?: string | null): Promise<Profissional[]> {
  const data = await rpc<Profissional[]>('listar_profissionais', {
    p_status: status || null,
  });
  return Array.isArray(data) ? data : [];
}

export async function detalharProfissionalAdmin(id: string): Promise<Profissional | null> {
  const { data, error } = await supabase
    .from('profissional')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw erroDeRpc(error);
  return (data as Profissional | null) ?? null;
}

export async function aprovarProfissional(
  id: string,
  aprovar: boolean,
  motivo?: string,
): Promise<void> {
  await rpc('aprovar_profissional', {
    p_id: id,
    p_aprovar: aprovar,
    p_motivo: motivo ?? null,
  });
}

export async function listarLogsAuditoria(limite = 100): Promise<LogAuditoria[]> {
  const { data, error } = await supabase
    .from('log_auditoria')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(limite);
  if (error) throw erroDeRpc(error);
  return (data ?? []) as LogAuditoria[];
}

export async function urlAssinadaDocumento(chave: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('documentos')
    .createSignedUrl(chave, 60 * 10);
  if (error) return null;
  return data?.signedUrl ?? null;
}

// ------------------------------------------------------------
// Dispositivo / push
// ------------------------------------------------------------
export async function registrarDispositivo(
  usuarioId: string,
  expoPushToken: string,
  plataforma: string,
): Promise<void> {
  const { error } = await supabase.from('dispositivo').upsert(
    {
      usuario_id: usuarioId,
      expo_push_token: expoPushToken,
      plataforma,
      ultimo_uso_em: new Date().toISOString(),
      revogado_em: null,
    },
    { onConflict: 'expo_push_token' },
  );
  if (error) throw erroDeRpc(error);
}

// ------------------------------------------------------------
// Storage
// ------------------------------------------------------------
export function urlPublicaPortfolio(path: string): string {
  return supabase.storage.from('portfolio').getPublicUrl(path).data.publicUrl;
}
