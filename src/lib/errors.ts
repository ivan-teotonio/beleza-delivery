type ErroComMensagem = {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
  error_description?: unknown;
  status?: unknown;
};

const REDE =
  /network request failed|failed to fetch|fetch failed|timeout|timed out|internet|conex[aã]o|networkerror/i;

export class AppError extends Error {
  codigo?: string;
  detalhe?: string;

  constructor(mensagem: string, codigo?: string, detalhe?: string) {
    super(mensagem);
    this.name = 'AppError';
    this.codigo = codigo;
    this.detalhe = detalhe;
  }
}

export function mensagemErro(erro: unknown): string {
  if (!erro) return 'Não foi possível concluir a ação. Tente novamente.';
  if (typeof erro === 'string') return traduzir(erro);

  if (erro instanceof Error) {
    if (REDE.test(erro.message)) {
      return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
    }
    return traduzir(erro.message);
  }

  if (typeof erro === 'object') {
    const e = erro as ErroComMensagem;
    const texto =
      (typeof e.message === 'string' && e.message) ||
      (typeof e.error_description === 'string' && e.error_description) ||
      '';
    if (texto) return traduzir(texto);
  }

  return 'Não foi possível concluir a ação. Tente novamente.';
}

function traduzir(texto: string): string {
  const t = texto.trim();
  if (REDE.test(t)) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
  }
  if (/invalid login credentials/i.test(t)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(t)) return 'Confirme seu e-mail antes de entrar.';
  if (/user already registered|already been registered/i.test(t)) {
    return 'Já existe uma conta com este e-mail.';
  }
  if (/password should be at least/i.test(t)) return 'A senha é muito curta. Use pelo menos 6 caracteres.';
  if (/rate limit|too many requests/i.test(t)) {
    return 'Muitas tentativas em pouco tempo. Aguarde e tente novamente.';
  }
  if (/duplicate key|unique constraint/i.test(t) && /cpf/i.test(t)) {
    return 'Este CPF já está cadastrado.';
  }
  if (/duplicate key|unique constraint/i.test(t) && /email/i.test(t)) {
    return 'Já existe uma conta com este e-mail.';
  }
  if (/violates row-level security|permission denied/i.test(t)) {
    return 'Você não tem permissão para esta ação.';
  }
  if (/JWT expired|invalid JWT/i.test(t)) return 'Sua sessão expirou. Entre novamente.';
  if (/Failed to fetch|NetworkError/i.test(t)) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
  }
  return t;
}

export function erroDeRpc(error: unknown): AppError {
  const mensagem = mensagemErro(error);
  const codigo =
    typeof error === 'object' && error && 'code' in error && typeof (error as ErroComMensagem).code === 'string'
      ? String((error as ErroComMensagem).code)
      : undefined;
  return new AppError(mensagem, codigo);
}

export function ehErroDeRede(erro: unknown): boolean {
  if (erro instanceof Error) return REDE.test(erro.message);
  if (typeof erro === 'string') return REDE.test(erro);
  if (typeof erro === 'object' && erro) {
    const e = erro as ErroComMensagem;
    return typeof e.message === 'string' && REDE.test(e.message);
  }
  return false;
}
