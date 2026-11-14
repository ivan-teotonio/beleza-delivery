# Security Review: Beleza Delivery

## Escopo

Revisão de todos os arquivos em `./` e `src/` (incluindo `app/` via Expo Router).
Stack: React Native 0.88, Expo SDK 58, TypeScript, Supabase JS v2, expo-router.
Autorização delegada ao RLS do Supabase; o app usa apenas a chave `anon` pública.

---

## Resumo Executivo

- **Findings**: 1 Critical, 2 High, 3 Medium, 4 Low
- **Nível de risco**: Alto (devido a credenciais expostas e senha demo hardcoded)
- **Confiança**: Alta nos achados reportados (padrões confirmados + entrada controlada pelo atacante verificada)

---

## Findings

### [VULN-001] Credenciais do Supabase expostas em arquivo `.env` no disco (Critical)

- **Localização**: `.env:1-2`
- **Confiança**: High
- **Issue**: O arquivo `.env` contém `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` com valores reais de projeto (`jzcrdhebrgjgdpynwbdj.supabase.co` e JWT anon). Embora a chave `anon` seja por natureza pública (destinada ao lado do cliente), versionar ou deixar no disco credenciais de produção permite que qualquer pessoa com acesso ao dispositivo/repositório consulte o banco diretamente, enumerate dados e ataque a infraestrutura.
- **Impacto**: Ataque direto ao banco Supabase via chave anon, enumeração de tabelas, possível exfiltração de dados de clientes e profissionais se RLS estiver mal configurado no servidor.
- **Evidência**:
  ```env
  EXPO_PUBLIC_SUPABASE_URL=https://jzcrdhebrgjgdpynwbdj.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6Y3JkaGVicmdqZ2RweW53YmRq...
  ```
- **Fix**:
  1. Remover valores reais do `.env` e manter apenas placeholders (como já existe em `.env.example`).
  2. Garantir que `.env` esteja no `.gitignore` (já está na linha 34) e nunca fazer commit forçado.
  3. Usar variáveis de ambiente do CI/CD / EAS Secrets para builds de produção, nunca empacotar valores reais no repositório.
  4. Revisar políticas RLS no Supabase para garantir que a chave anon não tenha acesso irrestrito.

---

### [VULN-002] Senha de demonstração hardcoded na tela de login (High)

- **Localização**: `app\(auth)\entrar.tsx:65`
- **Confiança**: High
- **Issue**: A função `preencher` define a senha `'Beleza@123'` para todas as contas de demonstração (Cliente, Profissional, Admin). Essa senha é fixa, previsível e exibida na interface. Embora marcada como "demo", o ambiente parece ser de produção (URL real no `.env`). Se essas contas existirem no ambiente real, qualquer pessoa que abra o app pode logar como admin/profissional.
- **Impacto**: Acesso não autorizado a contas de administrador e profissional, aprovação indevida de cadastros, acesso a dados de clientes via auditoria e agendamentos.
- **Evidência**:
  ```tsx
  const CONTAS_DEMO = [
    { rotulo: 'Cliente', email: 'ana.cliente@beleza.app' },
    { rotulo: 'Profissional', email: 'mariana@beleza.app' },
    { rotulo: 'Admin', email: 'admin@beleza.app' },
  ] as const;
  // ...
  function preencher(contaEmail: string) {
    setEmail(contaEmail);
    setSenha('Beleza@123');  // senha fixa e previsível
  }
  ```
- **Fix**:
  1. Remover contas demo e senha hardcoded de ambientes de produção/homologação.
  2. Manter fluxo de demo apenas em builds de desenvolvimento (variável de ambiente `EXPO_PUBLIC_ENABLE_DEMO`).
  3. Se precisar de contas de teste, criar via seed no Supabase com senhas fortes e não expô-las na UI.

---

### [VULN-003] Fallback de geração de ID usa `Math.random()` em vez de CSPRNG (High)

- **Localização**: `src/lib/idempotency.ts:7-10`
- **Confiança**: High
- **Issue**: `novaChaveIdempotencia()` tenta usar `expo-crypto.randomUUID()`, mas se falhar, cai em `Math.random().toString(36).slice(2, 12)`, que não é criptograficamente seguro. Chaves de idempotência previsíveis permitem replay de requisições críticas (solicitar agendamento, criar serviço, etc.) se um atacante conseguir adivinhar ou forçar o fallback.
- **Impacto**: Ataques de replay / duplicidade de operações críticas (agendamentos duplicados, criação de serviços não intencionais).
- **Evidência**:
  ```ts
  export function novaChaveIdempotencia(): string {
    try {
      return Crypto.randomUUID();
    } catch {
      const aleatorio = Math.random().toString(36).slice(2, 12);
      return `idem-${Date.now()}-${aleatorio}`;
    }
  }
  ```
- **Fix**: Remover o fallback inseguro. Se `randomUUID()` falhar, lançar erro ou usar `expo-crypto.getRandomBytes()` para construir um UUID manualmente, nunca `Math.random()`.

---

### [VULN-004] Upload de imagem sem validação de tipo/conteúdo real do arquivo (Medium)

- **Localização**: `src/lib/upload.ts:40-59`
- **Confiança**: Medium (precisa verificar RLS do bucket no servidor)
- **Issue**: `enviarImagem` faz upload de bytes crus para o bucket Supabase Storage com `contentType: 'image/jpeg'` fixo, mas não valida se o arquivo selecionado é realmente uma imagem. Um usuário mal-intencionado (ou arquivo comprometido) poderia fazer upload de scripts, HTML ou outros tipos perigosos. O bucket `portfolio` tem URLs públicas (`urlPublicaPortfolio`/`urlPublica`), o que pode levar a XSS se o navegador renderizar o conteúdo enviado como HTML.
- **Impacto**: Upload de arquivos maliciosos, XSS via storage público, potencial execução de código no contexto do app/web.
- **Evidência**:
  ```ts
  const { error } = await supabase.storage.from(bucket).upload(caminho, bytes, {
    contentType: 'image/jpeg',  // forçado, não reflete o conteúdo real
    upsert: false,
  });
  ```
- **Fix**:
  1. Validar assinatura de bytes (magic bytes) do arquivo antes do upload (confirma que é JPEG/PNG).
  2. Validar extensão e MIME type real do arquivo selecionado pelo `ImagePicker`.
  3. Configurar o bucket Supabase Storage como privado e servir via signed URLs, ou pelo menos desabilitar execução de scripts no bucket público.

---

### [VULN-005] Sessão JWT armazenada em `localStorage` na web (Medium)

- **Localização**: `src/lib/secureStorage.ts:16-29`
- **Confiança**: Medium
- **Issue**: Na web, `authStorage` usa `localStorage` para persistir a sessão do Supabase (JWT + refresh token). `localStorage` é acessível por qualquer script JavaScript na página, tornando a sessão vulnerável a roubo via XSS. Não há flag `httpOnly` (impossível em localStorage) nem criptografia adicional.
- **Impacto**: Roubo de sessão completa (acesso à conta do usuário) se houver qualquer XSS no app web ou dependência comprometida.
- **Evidência**:
  ```ts
  const webStorage = {
    async getItem(key: string) { return localStorage.getItem(key); },
    async setItem(key: string, value: string) { localStorage.setItem(key, value); },
  };
  export const authStorage = Platform.OS === 'web' ? webStorage : nativeStorage;
  ```
- **Fix**:
  1. Na web, considerar `sessionStorage` (limpa ao fechar aba) em vez de `localStorage`, ou usar `expo-secure-store` via Web Crypto API com criptografia.
  2. Reduzir tempo de vida do JWT no Supabase e configurar rotação de refresh token.
  3. Implementar Content Security Policy (CSP) rígida no build web para mitigar XSS.

---

### [VULN-006] Endereço completo do cliente exposto ao profissional antes da confirmação do agendamento (Medium)

- **Localização**: `app\(app)\profissional\[id].tsx:457`
- **Confiança**: Medium (regra de negócio vs. segurança)
- **Issue**: No diálogo de confirmação de solicitação, o endereço completo do cliente (`rua, número`) é exibido ao profissional antes que ele aceite/rejeite o agendamento. A notice na tela de endereço diz que o endereço completo só é compartilhado após confirmação, mas o código exibe antes.
- **Impacto**: Vazamento de localização pessoal (PII sensível) para profissionais que podem apenas visualizar e rejeitar, sem compromisso.
- **Evidência**:
  ```tsx
  <InfoRow label="Endereço" value={`${perfil?.endereco?.rua}, ${perfil?.endereco?.numero}`} />
  ```
- **Fix**: Mostrar apenas bairro/cidade ou distância até a confirmação; exibir endereço completo apenas após o profissional aceitar a solicitação.

---

### [VULN-007] Dados de auditoria (`detalhe_json`) renderizados sem sanitização (Medium)

- **Localização**: `app\(app)\(tabs)\auditoria.tsx:111-113`
- **Confiança**: Medium
- **Issue**: `log.detalhe_json` é serializado com `JSON.stringify` e exibido diretamente via `<AppText>`. Embora o React escape texto por padrão (mitigando XSS direto), se futuramente o componente mudar para `dangerouslySetInnerHTML` ou se o dado contiver caracteres especiais que quebrem a interface, há risco. Além disso, dados de auditoria podem conter PII de outros usuários.
- **Impacto**: Potencial XSS se houver mudança futura no render; exposição acidental de dados sensíveis em logs de auditoria.
- **Evidência**:
  ```tsx
  const detalhe = log.detalhe_json && Object.keys(log.detalhe_json).length > 0
    ? JSON.stringify(log.detalhe_json)
    : null;
  // renderizado diretamente em AppText
  ```
- **Fix**:
  1. Revisar quais campos são gravados em `detalhe_json` no servidor (não gravar senhas, tokens, endereços completos, CPF).
  2. Manter renderização via `AppText` (escape automático do React) e nunca usar `dangerouslySetInnerHTML` com esses dados.
  3. Restringir acesso à aba de auditoria apenas a admins (verificar RLS no servidor).

---

### [VULN-008] Comentários de avaliação exibidos diretamente do banco (Medium)

- **Localização**: `app\(app)\profissional\[id].tsx:421-424`
- **Confiança**: Medium
- **Issue**: `avaliacao.comentario` é exibido diretamente em `<AppText>`. Se o backend não sanitizar, um comentário malicioso pode conter scripts que, embora escapados pelo React, indicam falta de validação de entrada. Se houver qualquer renderização futura com HTML, vira XSS armazenado.
- **Impacto**: XSS armazenado potencial; exibição de conteúdo inapropriado.
- **Evidência**:
  ```tsx
  {avaliacao.comentario ? (
    <AppText variant="body" style={styles.comentario}>
      “{avaliacao.comentario}”
    </AppText>
  ) : null}
  ```
- **Fix**: Validar e sanitizar comentários no servidor (RLS/função) antes de gravar; limitar tamanho; manter escape automático do React no cliente.

---

### [VULN-009] Exportação de dados locais pode expor cache e outbox via `Share.share` (Low)

- **Localização**: `app\(app)\configuracoes.tsx:21-35`
- **Confiança**: Low (defense-in-depth)
- **Issue**: `exportarDadosLocais()` exporta todo o banco SQLite local (cache, outbox, geocode) e compartilha via `Share.share`. Isso pode incluir dados sensíveis (endereços, tokens de dispositivo, IDs de agendamento) que saem do controle do app.
- **Impacto**: Vazamento acidental de dados locais do usuário se ele compartilhar a exportação por email/mensageiro.
- **Fix**: Adicionar aviso explícito antes de compartilhar; opcionalmente permitir exportação seletiva (apenas dados do usuário, excluindo outbox interno e geocode).

---

### [VULN-010] Senha mínima de 6 caracteres (Low)

- **Localização**: `app\(auth)\cadastro.tsx:63`, `app\(auth)\entrar.tsx:40`, `app/redefinir-senha.tsx:60`
- **Confiança**: Low
- **Issue**: A validação de senha exige apenas 6 caracteres, abaixo de recomendações modernas (mínimo 8-12). Não há exigência de complexidade (números, símbolos, maiúsculas).
- **Impacto**: Senhas fracas facilitam ataque de força bruta / credential stuffing (mitigado parcialmente pelo rate limit do Supabase).
- **Fix**: Aumentar mínimo para 8 caracteres e considerar validação de complexidade opcional.

---

## Itens verificados e NÃO reportados (baixa confiança / mitigados)

| Item | Por que não foi reportado |
|------|--------------------------|
| SQL injection em `supabase.from(...).eq(...)` | O Supabase JS parametriza queries; entrada do usuário não é interpolada em SQL bruto. |
| `dangerouslySetInnerHTML` | Não encontrado no código. |
| `eval()` / `exec()` / `innerHTML` com user input | Não encontrado. |
| Hardcoded secrets além do `.env` | Nenhum outro encontrado (senha demo é reportada em VULN-002). |
| Chave `service_role` no cliente | Não usada; apenas chave `anon` (confirmado em `supabase.ts:15-16`). |
| CSRF | Supabase Auth com PKCE e cookies gerenciados pelo SDK; não aplicável a mobile nativo. |
| Logs com dados sensíveis | `mensagemErro` não exibe stack traces nem dados brutos do usuário. |

---

## Recomendações Prioritárias

1. **Imediato**: Remover valores reais do `.env` e nunca commite-lo; remover senha demo hardcoded (`Beleza@123`) de produção.
2. **Curto prazo**: Remover fallback `Math.random()` em `idempotency.ts`; validar tipo real de arquivo antes de upload para Storage.
3. **Médio prazo**: Migrar sessão web de `localStorage` para `sessionStorage` ou storage criptografado; não expor endereço completo ao profissional antes da aceitação do agendamento.
4. **Contínuo**: Revisar políticas RLS no Supabase para garantir que a chave anon não exceda o mínimo necessário; sanitizar dados gravados em `detalhe_json` de auditoria.

---

### Nota sobre escopo

Esta revisão cobre apenas o código do cliente (React Native/Expo). A autorização real depende de políticas RLS e funções RPC no servidor Supabase, que não estavam no escopo dos arquivos fornecidos. Recomendo uma revisão separada do esquema SQL, triggers e RLS do banco para cobertura completa.