// Edge Function: solicitar código de acesso (SPEC v1.5 / RF33 / RN24)
// Acesso somente via service_role. Nunca registrar o código em logs.

const URL_BASE = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const PEPPER = Deno.env.get('CODIGO_PEPPER') ?? '';
const DEMO = Deno.env.get('DEMO_MODE') === 'true';
const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'Beleza a Domicilio <onboarding@resend.dev>';
const RESPOSTA_GENERICA = { ok: true, reenviar_em: 60 };

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
  'content-type': 'application/json; charset=utf-8',
};

const ultimoEnvioPorIp = new Map<string, { inicio: number; quantidade: number }>();

function resposta(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function erro(mensagem: string, status = 400): Response {
  return resposta({ erro: mensagem }, status);
}

function emailValido(valor: unknown): valor is string {
  return typeof valor === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim()) &&
    valor.length <= 254;
}

async function hashCodigo(codigo: string): Promise<string> {
  const dados = new TextEncoder().encode(`${codigo}:${PEPPER}`);
  const digest = await crypto.subtle.digest('SHA-256', dados);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function gerarCodigo(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const numero = new DataView(bytes.buffer).getUint32(0, false) % 1_000_000;
  return String(numero).padStart(6, '0');
}

function ipDaRequisicao(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'desconhecido';
}

function limitePorIp(ip: string): boolean {
  const agora = Date.now();
  const registro = ultimoEnvioPorIp.get(ip);
  if (!registro || agora - registro.inicio > 60 * 60 * 1000) {
    ultimoEnvioPorIp.set(ip, { inicio: agora, quantidade: 1 });
    return true;
  }
  if (registro.quantidade >= 10) return false;
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

async function enviarEmail(email: string, codigo: string): Promise<boolean> {
  if (DEMO) return true;
  if (!RESEND_KEY) return false;
  const resposta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${RESEND_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [email],
      subject: 'Seu código de acesso — Beleza a Domicílio',
      html: `<p>Olá!</p><p>Seu código de acesso é <strong style="font-size:24px">${codigo}</strong>.</p><p>Ele é válido por <strong>1 ano</strong> e pode ser usado uma única vez. Se você não solicitou este código, ignore este e-mail.</p>`,
    }),
  });
  return resposta.ok;
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

  const { nome, email, tipo } = corpo;
  if (!emailValido(email)) return erro('Informe um e-mail válido.');
  if (nome !== undefined && (typeof nome !== 'string' || nome.length > 120)) {
    return erro('Nome inválido.');
  }
  if (tipo !== 'cliente' && tipo !== 'profissional') return erro('Tipo de conta inválido.');

  const emailNormalizado = email.trim().toLowerCase();
  const nomeInformado = typeof nome === 'string' ? nome.trim() : '';
  // Login com e-mail novo também cria a conta (anti-enumeração): deriva um nome
  // provisório da parte local do e-mail; o perfil é completado depois.
  const nomeNormalizado = nomeInformado.length >= 2
    ? nomeInformado
    : emailNormalizado
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .trim()
        .replace(/\b\w/g, (letra) => letra.toUpperCase());

  if (!limitePorIp(ipDaRequisicao(req))) return erro('Muitas solicitações. Tente novamente mais tarde.', 429);

  const filtroEmail = `ilike.${encodeURIComponent(emailNormalizado)}`;
  const { corpo: cooldown } = await rest(
    `/rest/v1/codigo_acesso?select=criado_em&email=${filtroEmail}&order=criado_em.desc&limit=1`,
  );
  if (Array.isArray(cooldown) && cooldown.length > 0) {
    const criado = new Date(String((cooldown[0] as { criado_em: string }).criado_em)).getTime();
    const restante = 60 - Math.floor((Date.now() - criado) / 1000);
    if (restante > 0) return resposta({ ok: true, reenviar_em: restante }, 429);
  }

  const { corpo: recentes } = await rest(
    `/rest/v1/codigo_acesso?select=id&email=${filtroEmail}&criado_em=gte.${new Date(Date.now() - 15 * 60 * 1000).toISOString()}&limit=3`,
  );
  if (Array.isArray(recentes) && recentes.length >= 3) {
    return erro('Muitos códigos solicitados. Aguarde alguns minutos.', 429);
  }

  let usuarioId: string | null = null;
  const { corpo: usuarios } = await rest(`/rest/v1/usuario?select=id&email=${filtroEmail}&limit=1`);
  if (Array.isArray(usuarios) && usuarios.length > 0) {
    usuarioId = (usuarios[0] as { id: string }).id;
  } else {
    const criacao = await rest('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email: emailNormalizado,
        email_confirm: true,
        user_metadata: { nome: nomeNormalizado, tipo },
      }),
    });
    const criado = criacao.corpo as { id?: string; message?: string } | null;
    if (criado?.id) {
      usuarioId = criado.id;
    } else {
      const { corpo: existente } = await rest(`/rest/v1/usuario?select=id&email=${filtroEmail}&limit=1`);
      if (Array.isArray(existente) && existente.length > 0) {
        usuarioId = (existente[0] as { id: string }).id;
      } else {
        console.error('Falha ao criar conta:', criacao.resposta.status, criado?.message ?? 'erro desconhecido');
        return resposta(RESPOSTA_GENERICA);
      }
    }
  }

  const agora = new Date().toISOString();
  await rest(
    `/rest/v1/codigo_acesso?email=${filtroEmail}&usado_em=is.null&revogado_em=is.null`,
    { method: 'PATCH', body: JSON.stringify({ revogado_em: agora }) },
  );

  const codigo = DEMO ? '000000' : gerarCodigo();
  const codigoHash = await hashCodigo(codigo);
  const expiraEm = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const insercao = await rest('/rest/v1/codigo_acesso', {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify({
      usuario_id: usuarioId,
      email: emailNormalizado,
      codigo_hash: codigoHash,
      expira_em: expiraEm,
    }),
  });
  if (!insercao.resposta.ok) {
    console.error('Falha ao registrar código:', insercao.resposta.status);
    return resposta(RESPOSTA_GENERICA);
  }

  if (!await enviarEmail(emailNormalizado, codigo)) {
    console.error('Serviço de e-mail indisponível ou não configurado.');
    return erro('Não foi possível enviar o e-mail. Tente novamente mais tarde.', 503);
  }

  return resposta(DEMO ? { ...RESPOSTA_GENERICA, codigo_demo: codigo } : RESPOSTA_GENERICA);
});
