// Edge Function: validar código de acesso (SPEC v1.5 / RF34 / RN24)
// Uso único, 1 ano de validade, máximo de 5 tentativas.

const URL_BASE = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const PEPPER = Deno.env.get('CODIGO_PEPPER') ?? '';
const MAX_TENTATIVAS = 5;
const ERRO_GENERICO = 'Código inválido ou expirado.';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
  'content-type': 'application/json; charset=utf-8',
};

const tentativasPorIp = new Map<string, { inicio: number; quantidade: number }>();

function resposta(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function erro(mensagem: string, status = 400): Response {
  return resposta({ erro: mensagem }, status);
}

async function hashCodigo(codigo: string): Promise<string> {
  const dados = new TextEncoder().encode(`${codigo}:${PEPPER}`);
  const digest = await crypto.subtle.digest('SHA-256', dados);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function compararHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferente = 0;
  for (let i = 0; i < a.length; i += 1) diferente |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferente === 0;
}

function ipDaRequisicao(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'desconhecido';
}

function limitePorIp(ip: string): boolean {
  const agora = Date.now();
  const registro = tentativasPorIp.get(ip);
  if (!registro || agora - registro.inicio > 60 * 60 * 1000) {
    tentativasPorIp.set(ip, { inicio: agora, quantidade: 1 });
    return true;
  }
  if (registro.quantidade >= 20) return false;
  registro.quantidade += 1;
  return true;
}

async function rest(caminho: string, init: RequestInit = {}): Promise<{ resposta: Response; corpo: unknown }> {
  const resposta = await fetch(`${URL_BASE}${caminho}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  let corpo: unknown = null;
  try {
    corpo = await resposta.json();
  } catch {
    corpo = null;
  }
  return { resposta, corpo };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return erro('Método não permitido', 405);

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return erro('Requisição inválida');
  }

  const email = typeof corpo.email === 'string' ? corpo.email.trim().toLowerCase() : '';
  const codigo = typeof corpo.codigo === 'string' ? corpo.codigo.replace(/\D/g, '') : '';
  if (!email || codigo.length !== 6) return erro(ERRO_GENERICO);

  if (!limitePorIp(ipDaRequisicao(req))) return erro('Muitas tentativas. Tente novamente mais tarde.', 429);

  const filtroEmail = `ilike.${encodeURIComponent(email)}`;
  const { corpo: registros } = await rest(
    `/rest/v1/codigo_acesso?select=id,usuario_id,email,codigo_hash,tentativas,expira_em&email=${filtroEmail}` +
      '&usado_em=is.null&revogado_em=is.null&expira_em=gt.' +
      `${new Date().toISOString()}&order=criado_em.desc&limit=1`,
  );
  if (!Array.isArray(registros) || registros.length === 0) return erro(ERRO_GENERICO);

  const registro = registros[0] as { id: string; codigo_hash: string; tentativas: number };
  const hash = await hashCodigo(codigo);

  if (!compararHash(hash, registro.codigo_hash)) {
    const tentativas = registro.tentativas + 1;
    const atualizacao: Record<string, unknown> = { tentativas };
    if (tentativas >= MAX_TENTATIVAS) atualizacao.revogado_em = new Date().toISOString();
    await rest(`/rest/v1/codigo_acesso?id=eq.${encodeURIComponent(registro.id)}`, {
      method: 'PATCH',
      body: JSON.stringify(atualizacao),
    });
    return erro(ERRO_GENERICO);
  }

  // Uso único: somente uma requisição pode consumir o código.
  const { resposta: consumo, corpo: consumido } = await rest(
    `/rest/v1/codigo_acesso?id=eq.${encodeURIComponent(registro.id)}&usado_em=is.null` +
      '&revogado_em=is.null&expira_em=gt.' +
      `${new Date().toISOString()}&select=id`,
    {
      method: 'PATCH',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ usado_em: new Date().toISOString() }),
    },
  );
  if (!consumo.ok || !Array.isArray(consumido) || consumido.length === 0) return erro(ERRO_GENERICO);

  const link = await rest('/auth/v1/admin/generate_link', {
    method: 'POST',
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  const dados = link.corpo as { hashed_token?: string; token_hash?: string; message?: string } | null;
  const tokenHash = dados?.hashed_token ?? dados?.token_hash;
  if (!tokenHash) {
    console.error('Falha ao gerar link de sessão:', link.resposta.status, dados?.message ?? 'erro desconhecido');
    return erro('Não foi possível iniciar a sessão. Tente novamente.', 500);
  }

  return resposta({ token_hash: tokenHash, email });
});
