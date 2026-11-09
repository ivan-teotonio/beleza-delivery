export type TipoConta = 'cliente' | 'profissional' | 'admin';

export type StatusAgendamento =
  | 'pendente'
  | 'confirmado'
  | 'recusado'
  | 'cancelado'
  | 'concluido'
  | 'expirado';

export interface Usuario {
  id: string;
  tipo: TipoConta;
  email: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Cliente {
  id: string;
  usuario_id: string;
  nome: string;
  telefone: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface Endereco {
  id: string;
  cliente_id: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  criado_em: string;
  atualizado_em: string;
}

export interface Profissional {
  id: string;
  usuario_id: string;
  nome: string;
  cpf: string;
  telefone: string | null;
  foto_url: string | null;
  documento_chave: string | null;
  status_verificacao: 'pendente' | 'aprovado' | 'reprovado';
  endereco_ref_bairro: string;
  endereco_ref_cidade: string;
  distancia_maxima_km: number;
  prazo_resposta_h: number;
  descricao: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Faixa {
  id: string;
  profissional_id?: string;
  limite_km: number;
  valor_centavos: number;
  ordem: number;
}

export interface Servico {
  id: string;
  profissional_id: string;
  tipo: string;
  preco_centavos: number;
  duracao_min: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface FotoPortfolio {
  id: string;
  profissional_id: string;
  url: string;
  storage_path: string | null;
  enviada_em: string;
}

export interface PerfilUsuario {
  usuario: Usuario | null;
  cliente: Cliente | null;
  profissional: Profissional | null;
  endereco: Endereco | null;
  endereco_lat: number | null;
  endereco_lng: number | null;
  profissional_lat: number | null;
  profissional_lng: number | null;
}

export interface ResultadoBusca {
  id: string;
  nome: string;
  foto_url: string | null;
  descricao: string | null;
  bairro: string;
  cidade: string;
  distancia_maxima_km: number;
  prazo_resposta_h: number;
  distancia_km: number;
  media_avaliacao: number;
  total_avaliacoes: number;
  servicos: Array<Pick<Servico, 'id' | 'tipo' | 'preco_centavos' | 'duracao_min'>>;
}

export interface AvaliacaoPublica {
  nota: number;
  comentario: string | null;
  criado_em: string;
  cliente_nome: string;
}

export interface ProfissionalPublico {
  id: string;
  nome: string;
  foto_url: string | null;
  descricao: string | null;
  bairro: string;
  cidade: string;
  distancia_maxima_km: number;
  prazo_resposta_h: number;
  media_avaliacao: number;
  total_avaliacoes: number;
  servicos: Array<Pick<Servico, 'id' | 'tipo' | 'preco_centavos' | 'duracao_min'>>;
  faixas: Faixa[];
  portfolio: Array<{ id: string; url: string }>;
  avaliacoes: AvaliacaoPublica[];
}

export interface AgendaSlot {
  id: string;
  profissional_id: string;
  inicio: string;
  fim: string;
  status: 'disponivel' | 'reservado' | 'ocupado';
}

export interface Agendamento {
  id: string;
  status: StatusAgendamento;
  inicio: string;
  fim: string;
  distancia_km: number | null;
  valor_deslocamento_centavos: number | null;
  total_centavos: number | null;
  solicitado_em: string;
  responder_ate: string;
  decidido_em: string | null;
  motivo_recusa: string | null;
  servico_id: string;
  servico_tipo: string;
  servico_preco_centavos: number;
  servico_duracao_min: number;
  profissional_id: string;
  profissional_nome: string;
  profissional_foto_url: string | null;
  cliente_id: string;
  cliente_nome: string;
  bairro: string;
  cidade: string;
  endereco_liberado: boolean;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  endereco_lat: number | null;
  endereco_lng: number | null;
  avaliacao_nota: number | null;
  pode_avaliar: boolean;
  pode_confirmar: boolean;
  pode_cancelar: boolean;
  pode_concluir: boolean;
}

export interface PreviaAgendamento {
  disponivel: boolean;
  distancia_km?: number;
  faixa_limite_km?: number;
  valor_deslocamento_centavos?: number;
  preco_servico_centavos?: number;
  total_centavos?: number;
  motivo?: string;
}

export interface Mensagem {
  id: string;
  agendamento_id: string;
  remetente_id: string;
  conteudo: string;
  enviada_em: string;
}

export interface RelatorioProfissional {
  periodo_inicio: string;
  periodo_fim: string;
  total_atendimentos: number;
  receita_servicos_centavos: number;
  receita_deslocamento_centavos: number;
  receita_total_centavos: number;
  cancelados: number;
  media_avaliacao: number;
}

export interface LogAuditoria {
  id: string;
  ator_usuario_id: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  detalhe_json: Record<string, unknown> | null;
  criado_em: string;
}

export interface Dispositivo {
  id: string;
  usuario_id: string;
  expo_push_token: string;
  plataforma: string;
  ultimo_uso_em: string;
  revogado_em: string | null;
}
