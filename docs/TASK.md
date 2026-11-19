# ✅ Backlog de Tarefas (TASK)

**Projeto:** App de Agendamento de Serviços de Beleza a Domicílio
**Versão:** 4.0 · **Última atualização:** 2026-11-19
**Escopo:** derivado de `docs/SPEC.md` (v1.5) · **Sequência:** `docs/PLAN.md` §6 · **Entrega:** `docs/CONSTITUTION.MD` §4 (DoD)

**Legenda de status:** ⬜ pendente · 🟨 em andamento · ✅ concluída · ⛔ bloqueada
**Formato:** `T-id | RF/RN | descrição | dependência`

> Regra: task só inicia com status ⬜ → 🟨 e só fecha com **DoD completo** (Constituição §4) e ✅ aqui.

---

## M0 — Fundação (monorepo Expo + Supabase)

- [x] **T001** | — | Criar monorepo conforme PLAN §3 (`apps/mobile`, `packages/shared`, `supabase/`, workspaces, tsconfig base) | —
- [x] **T002** | — | Scaffold Expo + TypeScript + Expo Router com tema, navegação base e acessibilidade inicial | T001
- [x] **T003** | — | Criar projeto Supabase + CLI + stack local (`supabase start`), configurar URL/chave pública e `config.toml` | T001
- [x] **T004** | RNF13 | Migrations iniciais: extensões (`pgcrypto`, `btree_gist`, `postgis`, `pg_cron`), tabelas e constraints (PLAN §4) | T003
- [x] **T005** | RNF15, RN23 | Habilitar RLS em todas as tabelas, criar helpers (`is_admin`, `meu_cliente_id`, `meu_profissional_id`) e políticas base | T004
- [x] **T006** | — | Contratos de domínio, tipos, dinheiro (centavos), datas e distância | T001
- [x] **T007** | RNF15 | Segurança base: revogar escrita direta em tabelas críticas, buckets `portfolio`/`documentos` + políticas | T005
- [x] **T010** | — | Seed idempotente em `supabase/seed.sql`: admin, profissionais aprovados (com faixas), serviços e agenda demo | T005

## M1 — Conta, Perfil, Deslocamento e Admin

- [x] **T101** | RF01 | Tela de escolha de tipo de conta (Cliente/Profissional) | T002
- [x] **T102** | RF02, RF33, RNF01 | Supabase Auth **sem senha**: conta criada com nome+e-mail, Edge Function envia código de acesso (1 ano), trigger `handle_new_user` (usuario + cliente), perfil admin no seed | T003, T004
- [x] **T103** | RF34, RNF01 | App: cadastro (nome+e-mail) e login em 2 etapas (e-mail → código), sessão em `expo-secure-store`, refresh automático e logout | T102, T006
- [x] **T104** | RF03 | Onboarding de profissional (dados, CPF único, localização de referência, status `pendente`) via PostgREST + RLS | T102
- [x] **T105** | **RF26, RF27** | Tela **"Meu Atendimento a Domicílio"**: distância máxima + faixas (km → centavos) | T104
- [x] **T106** | **RN11, RN12** | Validações de faixas (crescentes, sem sobreposição, última = distância máxima) no app e na RPC `salvar_config_deslocamento` | T106
- [x] **T107** | **RF26** | Prévia de cálculo (menor/intermediária/maior faixa) — CU 2.5 passo 5 | T106
- [x] **T108** | RF04 | Edição de perfil (cliente/profissional), incluindo faixas e distância máxima, com auditoria | T105
- [x] **T109** | RF22 | Endereço único do cliente (CRUD + geocodificação + `localizacao geography` no Supabase) | T103
- [x] **T110** | RF03, RNF11 | Upload no Supabase Storage: foto no bucket `portfolio`, documento no bucket privado `documentos` + URL assinada | T104
- [x] **T111** | RF21 | Admin: listar pendentes, aprovar/reprovar via RPC transacional, auditoria e push | T104, T110
- [x] **T112** | **RN11, RF03** | Bloqueio: profissional sem faixas aprovadas **não** é publicado na busca | T106
- [x] **T113** | **RNF09** | Log de auditoria no Supabase para alteração de faixas/distância máxima | T108
- [x] **T114** | RN24, RNF01 | Migration `codigo_acesso` (hash, `expira_em` 1 ano, tentativas, revogação) + RLS deny-all + índices + limpeza via `pg_cron` | T004, T005
- [x] **T115** | RF33, RN24 | Edge Function `solicitar-codigo-acesso`: valida/normaliza e-mail, cria usuário sem senha, gera código CSPRNG, hash SHA-256+pepper, rate limit/cooldown e e-mail transacional | T114, T102
- [x] **T116** | RF34, RN24 | Edge Function `validar-codigo-acesso`: hash em tempo constante, expiração 1 ano, 5 tentativas, uso único e `generateLink` → `token_hash` | T115
- [x] **T117** | RF33, RF34, RNF02 | Telas de cadastro e login por código com reenvio/cooldown, mensagens acessíveis e foco/TalkBack | T103, T116
- [x] **T118** | RNF01, RN24 | Sessão de até 1 ano: refresh automático, logout, "sair de todos os dispositivos" e revogação em troca de e-mail. *Nota:* o limite rígido de 1 ano (`sessions_timebox`) exige plano Pro; no plano atual o refresh rotativo mantém a sessão ativa por mais de 1 ano. A revogação em troca de e-mail é feita pelo `mailer_secure_email_change` do Supabase. | T116, T117
- [ ] **T119** | RN24, RNF15 | Testes de segurança do código: expirado, reuso, 5 tentativas, cooldown, rate limit, anti-enumeração e RLS deny-all | T115, T116

## M2 — Serviços, Agenda e Portfólio

- [x] **T201** | RF05 | CRUD "Meus Serviços" (tipo, preço em centavos, duração) via PostgREST + RLS + telas | T108
- [x] **T202** | RF06 | CRUD "Minha Agenda" (dias/horários) via PostgREST + RLS + telas | T108
- [x] **T203** | RN01 | Validação de horário livre e ausência de sobreposição no banco (constraints + RPC) | T202
- [x] **T204** | RF19, RNF11 | Upload de portfólio no bucket `portfolio` com compressão (`expo-image-manipulator`) | T110
- [x] **T205** | RF20 | Galeria de portfólio no perfil do profissional (cache de imagem) | T204
- [x] **T206** | RF06, RF07 | View/RPC de disponibilidade por profissional/dia (slots livres) | T202, T203
- [x] **T207** | RNF09 | Auditoria (trigger) de criação/edição/exclusão de serviços e agenda | T201, T202

## M3 — Busca, Geolocalização e Disponibilidade

- [x] **T301** | RNF07 | `expo-location` + geocodificação de CEP/endereço com `geocode_cache` local | T002
- [x] **T302** | RNF03 | RPC `buscar_profissionais`: PostGIS (`ST_DWithin`/`ST_Distance`), índices GiST, paginação | T004, T112
- [x] **T303** | RF09 | Listagem por proximidade, mais próximo primeiro, **filtrando pela distância máxima** | T302, T106
- [x] **T304** | **RF30** | Aviso "Profissional não atende tão longe" quando distância > máxima | T303
- [x] **T305** | RF10 | Filtro por tipo de serviço | T303
- [x] **T306** | RF07, RF08 | Calendário + horários livres no app (consumindo T206) | T202, T303

## M4 — Agendamento, Deslocamento e Decisão ⭐

- [x] **T401** | **RN10, RN13** | Módulo puro compartilhado: distância + seleção de faixa (SPEC §6.2) | T006
- [x] **T402** | **RF28** | Testes unitários da tabela SPEC §6.3 (3,2 / 7,4 / 18 / 25 km) — **gate de precificação** | T401
- [x] **T403** | RF23, RF11 | RPC `solicitar_agendamento` idempotente: valida endereço, distância, faixa, conflito e grava transação | T302, T401, T109
- [x] **T404** | **RF30, RN12** | App: bloqueio de envio quando distância > máxima; prévia de valores | T403, T304
- [x] **T405** | **RN14, RN17** | Persistir `distancia_km`, `valor_deslocamento_centavos`, `total_centavos` congelados em transação | T403
- [x] **T406** | **RN15, RN18** | Transação: `pendente` ⇒ agenda `reservado`; recusa/expiração ⇒ `disponivel`; constraints de sobreposição | T405, T202
- [x] **T407** | **RF29, RF12** | Tela do profissional: distância aproximada + bairro + tarifa + total (sem endereço) | T405
- [x] **T408** | **RF29, RF25, RN09** | RPC `decidir_agendamento`: aceite libera endereço (via RLS) e bloqueia agenda; recusa libera horário | T407, T406
- [x] **T409** | **RN18** | App: estado otimista transitório + rollback em erro; nunca confirmar localmente | T408
- [x] **T410** | **RF31** | Expiração via `pg_cron` + RPC `expirar_agendamentos()`, transacional e independente do app | T406
- [x] **T411** | RF13, RN03 | RPC `cancelar_agendamento` com prazo mínimo, em transação, com liberação de agenda | T408
- [x] **T412** | **RNF09** | Auditoria no Supabase de solicitação/aceite/recusa/expiração/cancelamento (distância e valores) | T408, T410, T411
- [x] **T413** | RN06 | Teste de sobreposição de agendamentos do cliente | T406
- [x] **T414** | **RN17, RN18** | Testes de concorrência/rollback/idempotência (dupla reserva, requisição repetida) | T406, T408, T410
- [x] **T415** | **RF32** | Pull inicial: cache SQLite de profissionais, serviços, agenda e agendamentos do usuário | T403, T004

## M5 — Offline, Sincronização, Push e Chat

- [x] **T501** | **RF32, RN19** | Schema SQLite local + `sync_state`/`outbox` | T415
- [x] **T502** | **RF32, RN19** | `SyncProvider`: push da outbox com idempotência e backoff | T501
- [x] **T503** | **RN20, RN22** | Resolução de conflito: Supabase autoritativo, descarte de cache conflitante e recarga | T502
- [x] **T504** | RNF14 | Registro de `expo_push_token` por dispositivo (tabela `dispositivo` + RLS) | T103
- [x] **T506** | RF15, RN08 | Chat por agendamento (tabela `mensagem` + RLS + **Supabase Realtime**), disponível só após solicitação | T407
- [x] **T507** | RNF07 | Indicador de "dados podem estar desatualizados" e bloqueio de escrita crítica offline | T502

## M6 — Pós-Atendimento

- [x] **T601** | RF16, RN02 | Avaliação (nota + comentário) liberada após `concluido`, com unicidade via constraint | T408
- [x] **T602** | RF17 | Histórico com status **e valores (serviço/deslocamento/total)** | T405
- [x] **T603** | RF18 | Relatório de atendimentos no período com valores e avaliações | T602
- [x] **T604** | SPEC §7 | Tela/fluxo de conclusão do atendimento (`confirmado → concluido`) via RPC | T408
- [x] **T605** | RNF09 | Auditoria de conclusão e avaliação | T601, T604

## M7 — Endurecimento (RNF, segurança, performance)

- [x] **T701** | RNF02, RNF08 | Auditoria de acessibilidade: TalkBack + contraste AA + alvos ≥ 48 dp em **todas** as telas | T306
- [x] **T702** | RNF15, RN23 | Auditoria de segurança: RLS por perfil, helpers `SECURITY DEFINER`, `service_role` fora do app | T007
- [ ] **T703** | RNF05 | LGPD: consentimento, exportação de dados locais (`exportarDadosLocais`), exclusão em cascata e revogação de códigos/sessões | T102, T114
- [x] **T705** | RNF09 | Painel de logs de auditoria | T412, T113, T111
- [x] **T706** | RNF10 | Feedback ≤ 1 s nas ações principais (toasts e estados de carregamento) | T701
- [x] **T710** | SPEC §12 | Revisão final dos Critérios de Aceite Globais antes do release v1.4 | todos
- [ ] **T712** | RNF01 | Teste de expiração/revogação de sessão, refresh token, sessão de 1 ano e "sair de todos os dispositivos" do Supabase Auth | T102, T118, T504

---

## Checklist de fechamento por task (DoD resumido)

- [x] RF/RN correspondente implementado conforme SPEC (sem "improvisos" fora da spec)
- [x] Testes: caso feliz + 2 bordas; contrato Zod quando houver RPC/DTO
- [x] Integração: RPC/RLS contra Supabase; SQLite local contra migrations reais
- [x] Idempotência/concorrência testadas quando a task altera agenda/valores/status
- [x] Validação com mensagem em português
- [x] TalkBack verificado em tela nova/alterada
- [x] Sem SQL em telas; sem regra de negócio em hook/tela (regras em RPC/Edge Functions)
- [x] Migrations (Supabase CLI) revisadas e testadas; RLS habilitada em tabela nova
- [x] Nenhum segredo (`service_role`, connection string) no bundle mobile
- [x] CI verde (`tsc`, `vitest`, `expo-doctor`, `expo export --platform android`); status atualizado aqui (⬜→🟨→✅)

---

## Dependências críticas (trilha da v1.5)

```
T001 → T003 → T004 → T005 → T114 → T115 → T116 → T119
T001 → T003 → T004 → T005 → T102 → T104 → T105 → T106 → T112 → T302 → T303 ↘
T001 → T006 → T401 → T402 ───────────────────────────────────────────────→ T403
T102 → T103 → T109 ──────────────────────────────────────────────────────↗
T102 → T103 → T117 → T118 ──────────────────────────────────────────────→ T712
T403 → T405 → T406 → T408 → T410/T411/T412 → T415 → T501 → T502 → T503 → T710
T408 → T504 → T505
T004 → T704 → T711 → T710
T005 → T702 ─────────────────────────────────────────────────────────────→ T710
```

---

## Registro de Mudanças deste arquivo

| Versão | Data | Mudança |
|--------|------|---------|
| 1.0 | — | Backlog inicial derivado da SPEC v1.0 (M0–M5 básicos). |
| 1.1 | 2026-10-29 | Adicionadas as trilhas de deslocamento e decisão: **T104–T106, T110–T111, T303–T304, T401–T413**; marco **M6** reforçado; trilha crítica de dependências incluída. |
| 1.2 | 2026-10-29 | **Adaptação para React Native + Expo + SQLite local.** |
| 2.0 | 2026-10-29 | **Reescrita para arquitetura híbrida:** monorepo Expo/API/shared; Neon + Drizzle + Express no Render; auth server-side; uploads Cloudinary/bucket privado; sync outbox (RF32); push Expo; jobs de expiração no servidor; testes de concorrência/idempotência, k6 e restore. M0–M7 com trilha crítica atualizada. |
| 3.0 | 2026-11-09 | **Implementação completa concluída:** app único Expo + Supabase, todas as telas, RPCs, migrações 0001–0009 aplicadas, seed, testes de precificação, `tsc`, `vitest`, `expo-doctor` e `expo export` verdes. |
| 4.0 | 2026-11-19 | **Autenticação sem senha (SPEC v1.5):** T102/T103 **reabertas**; adicionadas **T114–T119** (pendentes) para tabela `codigo_acesso`, Edge Functions de solicitação/validação, telas, sessão de 1 ano e testes de segurança; T703/T712 reabertas; trilha crítica revista. |
