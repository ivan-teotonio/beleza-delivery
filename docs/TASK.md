# ✅ Backlog de Tarefas (TASK)

**Projeto:** App de Agendamento de Serviços de Beleza a Domicílio
**Versão:** 3.0 · **Última atualização:** 2026-11-08
**Escopo:** derivado de `docs/SPEC.md` (v1.4) · **Sequência:** `docs/PLAN.md` §6 · **Entrega:** `docs/CONSTITUTION.MD` §4 (DoD)

**Legenda de status:** ⬜ pendente · 🟨 em andamento · ✅ concluída · ⛔ bloqueada
**Formato:** `T-id | RF/RN | descrição | dependência`

> Regra: task só inicia com status ⬜ → 🟨 e só fecha com **DoD completo** (Constituição §4) e ✅ aqui.

---

## M0 — Fundação (monorepo Expo + Supabase)

- [ ] **T001** | — | Criar monorepo conforme PLAN §3 (`apps/mobile`, `packages/shared`, `supabase/`, workspaces, tsconfig base) | —
- [ ] **T002** | — | Scaffold Expo + TypeScript + Expo Router com tema, navegação base e acessibilidade inicial | T001
- [ ] **T003** | — | Criar projeto Supabase + CLI + stack local (`supabase start`), configurar URL/chave pública e `config.toml` | T001
- [ ] **T004** | RNF13 | Migrations iniciais: extensões (`pgcrypto`, `btree_gist`, `postgis`, `pg_cron`), tabelas e constraints (PLAN §4) | T003
- [ ] **T005** | RNF15, RN23 | Habilitar RLS em todas as tabelas, criar helpers (`is_admin`, `meu_cliente_id`, `meu_profissional_id`) e políticas base | T004
- [ ] **T006** | — | `packages/shared`: contratos Zod, tipos de domínio, dinheiro (centavos), datas e distância; gerar `database.types.ts` | T001
- [ ] **T007** | RNF15 | Segurança base: revogar escrita direta em tabelas críticas, buckets `portfolio`/`documentos` + políticas, secrets e CORS das Edge Functions | T005
- [ ] **T008** | — | CI: `supabase start` + migrations + pgTAP + lint + `tsc --noEmit` + Vitest (shared/app) + Jest + `expo-doctor` | T002, T006
- [ ] **T009** | — | Deploy: `supabase link` + `supabase db push` + `supabase functions deploy` + EAS; healthcheck e migrations no pipeline | T004, T008
- [ ] **T010** | — | Seed idempotente em `supabase/seed.sql`: admin, profissionais aprovados (com faixas), serviços e agenda demo | T005
- [ ] **T011** | — | Confirmar premissas A1–A13 do PLAN §1 e registrar resultado | T009

## M1 — Conta, Perfil, Deslocamento e Admin

- [ ] **T101** | RF01 | Tela de escolha de tipo de conta (Cliente/Profissional) | T002
- [ ] **T102** | RF02, RNF01 | Supabase Auth: signup/login/logout/refresh, trigger `handle_new_user` (usuario + cliente), perfil admin no seed | T003, T004
- [ ] **T103** | RNF01 | App: fluxo de cadastro/login com `supabase-js`, sessão em `expo-secure-store` e refresh automático | T102, T006
- [ ] **T104** | RF03 | Onboarding de profissional (dados, CPF único, localização de referência, status `pendente`) via PostgREST + RLS | T102
- [ ] **T105** | **RF26, RF27** | Tela **"Meu Atendimento a Domicílio"**: distância máxima + faixas (km → centavos) | T104
- [ ] **T106** | **RN11, RN12** | Validações de faixas (crescentes, sem sobreposição, última = distância máxima) no app e na RPC `salvar_config_deslocamento` | T105
- [ ] **T107** | **RF26** | Prévia de cálculo (menor/intermediária/maior faixa) — CU 2.5 passo 5 | T106
- [ ] **T108** | RF04 | Edição de perfil (cliente/profissional), incluindo faixas e distância máxima, com auditoria | T105
- [ ] **T109** | RF22 | Endereço único do cliente (CRUD + geocodificação + `localizacao geography` no Supabase) | T103
- [ ] **T110** | RF03, RNF11 | Upload no Supabase Storage: foto no bucket `portfolio`, documento no bucket privado `documentos` + URL assinada | T104
- [ ] **T111** | RF21 | Admin: listar pendentes, aprovar/reprovar via RPC transacional, auditoria e push | T104, T110
- [ ] **T112** | **RN11, RF03** | Bloqueio: profissional sem faixas aprovadas **não** é publicado na busca | T106
- [ ] **T113** | **RNF09** | Log de auditoria no Supabase para alteração de faixas/distância máxima | T108

## M2 — Serviços, Agenda e Portfólio

- [ ] **T201** | RF05 | CRUD "Meus Serviços" (tipo, preço em centavos, duração) via PostgREST + RLS + telas | T108
- [ ] **T202** | RF06 | CRUD "Minha Agenda" (dias/horários) via PostgREST + RLS + telas | T108
- [ ] **T203** | RN01 | Validação de horário livre e ausência de sobreposição no banco (constraints + RPC) | T202
- [ ] **T204** | RF19, RNF11 | Upload de portfólio no bucket `portfolio` com compressão (`expo-image-manipulator`) | T110
- [ ] **T205** | RF20 | Galeria de portfólio no perfil do profissional (cache de imagem) | T204
- [ ] **T206** | RF06, RF07 | View/RPC de disponibilidade por profissional/dia (slots livres) | T202, T203
- [ ] **T207** | RNF09 | Auditoria (trigger) de criação/edição/exclusão de serviços e agenda | T201, T202

## M3 — Busca, Geolocalização e Disponibilidade

- [ ] **T301** | RNF07 | `expo-location` + geocodificação de CEP/endereço com `geocode_cache` local | T002
- [ ] **T302** | RNF03 | RPC `buscar_profissionais`: PostGIS (`ST_DWithin`/`ST_Distance`), índices GiST, paginação | T004, T112
- [ ] **T303** | RF09 | Listagem por proximidade, mais próximo primeiro, **filtrando pela distância máxima** | T302, T106
- [ ] **T304** | **RF30** | Aviso "Profissional não atende tão longe" quando distância > máxima | T303
- [ ] **T305** | RF10 | Filtro por tipo de serviço | T303
- [ ] **T306** | RF07, RF08 | Calendário + horários livres no app (consumindo T206) | T202, T303
- [ ] **T307** | RNF03 | Benchmark da busca com 1.000 profissionais e cache quente | T302

## M4 — Agendamento, Deslocamento e Decisão ⭐

- [ ] **T401** | **RN10, RN13** | Módulo puro compartilhado: distância + seleção de faixa (SPEC §6.2) | T006
- [ ] **T402** | **RF28** | Testes unitários da tabela SPEC §6.3 (3,2 / 7,4 / 18 / 25 km) — **gate de precificação** | T401
- [ ] **T403** | RF23, RF11 | RPC `solicitar_agendamento` idempotente: valida endereço, distância, faixa, conflito e grava transação | T302, T401, T109
- [ ] **T404** | **RF30, RN12** | App: bloqueio de envio quando distância > máxima; prévia de valores | T403, T304
- [ ] **T405** | **RN14, RN17** | Persistir `distancia_km`, `valor_deslocamento_centavos`, `total_centavos` congelados em transação | T403
- [ ] **T406** | **RN15, RN18** | Transação: `pendente` ⇒ agenda `reservado`; recusa/expiração ⇒ `disponivel`; constraints de sobreposição | T405, T202
- [ ] **T407** | **RF29, RF12** | Tela do profissional: distância aproximada + bairro + tarifa + total (sem endereço) | T405
- [ ] **T408** | **RF29, RF25, RN09** | RPC `decidir_agendamento`: aceite libera endereço (via RLS) e bloqueia agenda; recusa libera horário | T407, T406
- [ ] **T409** | **RN18** | App: estado otimista transitório + rollback em erro; nunca confirmar localmente | T408
- [ ] **T410** | **RF31** | Expiração via `pg_cron` + RPC `expirar_agendamentos()`, transacional e independente do app | T406
- [ ] **T411** | RF13, RN03 | RPC `cancelar_agendamento` com prazo mínimo, em transação, com liberação de agenda | T408
- [ ] **T412** | **RNF09** | Auditoria no Supabase de solicitação/aceite/recusa/expiração/cancelamento (distância e valores) | T408, T410, T411
- [ ] **T413** | RN06 | Teste de sobreposição de agendamentos do cliente | T406
- [ ] **T414** | **RN17, RN18** | Testes de concorrência/rollback/idempotência (dupla reserva, requisição repetida) | T406, T408, T410
- [ ] **T415** | **RF32** | Pull inicial: cache SQLite de profissionais, serviços, agenda e agendamentos do usuário | T403, T004

## M5 — Offline, Sincronização, Push e Chat

- [ ] **T501** | **RF32, RN19** | Schema SQLite local + migrations Drizzle + `sync_state`/`outbox` | T415
- [ ] **T502** | **RF32, RN19** | `SyncService`: pull por `atualizado_em`, push da outbox com idempotência e backoff | T501
- [ ] **T503** | **RN20, RN22** | Resolução de conflito: Supabase autoritativo, descarte de cache conflitante e recarga | T502
- [ ] **T504** | RNF14 | Registro de `expo_push_token` por dispositivo (tabela `dispositivo` + RLS) | T103
- [ ] **T505** | **RF14** | Edge Function `push` + Database Webhook para solicitação/aceite/recusa/cancelamento/expiração + fallback local | T504, T408, T410, T411
- [ ] **T506** | RF15, RN08 | Chat por agendamento (tabela `mensagem` + RLS + **Supabase Realtime**), disponível só após solicitação | T407
- [ ] **T507** | RNF07 | Indicador de "dados podem estar desatualizados" e bloqueio de escrita crítica offline | T502
- [ ] **T508** | **RF32** | Testes de integração da outbox (`better-sqlite3`) e do pull por cursor | T502

## M6 — Pós-Atendimento

- [ ] **T601** | RF16, RN02 | Avaliação (nota + comentário) liberada após `concluido`, com unicidade via constraint | T408
- [ ] **T602** | RF17 | Histórico com status **e valores (serviço/deslocamento/total)** | T405
- [ ] **T603** | RF18 | Relatório de atendimentos no período com valores e avaliações | T602
- [ ] **T604** | SPEC §7 | Tela/fluxo de conclusão do atendimento (`confirmado → concluido`) via RPC | T408
- [ ] **T605** | RNF09 | Auditoria de conclusão e avaliação | T601, T604

## M7 — Endurecimento (RNF, segurança, performance)

- [ ] **T701** | RNF02, RNF08 | Auditoria de acessibilidade: TalkBack + contraste AA + alvos ≥ 48 dp em **todas** as telas | T306
- [ ] **T702** | RNF15, RN23 | Auditoria de segurança: RLS por perfil (pgTAP), helpers `SECURITY DEFINER`, `service_role` fora do app, CORS/rate limit das Edge Functions e redação de logs | T007
- [ ] **T703** | RNF05 | LGPD: consentimento, exportação, exclusão de `auth.users` em cascata, anonimização e retenção de logs | T102
- [ ] **T704** | RNF06 | Backup/restore: branch/PITR do Supabase + exportação local do SQLite, com teste documentado | T004, T501
- [ ] **T705** | RNF09 | Consulta/painel de logs de auditoria | T412, T113, T111
- [ ] **T706** | RNF10 | Medição de feedback ≤ 1 s nas ações principais | T701
- [ ] **T707** | RNF12 | Teste de carga **k6** (PostgREST/RPC): 1.000 usuários simultâneos, p95 e taxa de erro | T302, T403
- [ ] **T708** | RNF03 | Homologação de busca < 3 s com Supabase + cache quente | T307, T707
- [ ] **T709** | RNF11 | Limites/tamanho e limpeza de imagens órfãs (Storage) e documentos | T204, T110
- [ ] **T710** | SPEC §12 | Revisão final dos Critérios de Aceite Globais antes do release v1.4 | todos
- [ ] **T711** | RNF13 | Teste de upgrade de schema (Supabase migrations e SQLite) com rollback | T004, T501
- [ ] **T712** | RNF01 | Teste de expiração/revogação de sessão e refresh token do Supabase Auth | T102, T504

---

## Dependências críticas (trilha da v1.4)

```
T001 → T003 → T004 → T005 → T102 → T104 → T105 → T106 → T112 → T302 → T303 ↘
T001 → T006 → T401 → T402 ───────────────────────────────────────────────→ T403
T102 → T103 → T109 ──────────────────────────────────────────────────────↗
T403 → T405 → T406 → T408 → T410/T411/T412 → T415 → T501 → T502 → T503 → T710
T408 → T504 → T505
T004 → T704 → T711 → T710
T005 → T702 ─────────────────────────────────────────────────────────────→ T710
```

## Checklist de fechamento por task (DoD resumido)

- [ ] RF/RN correspondente implementado conforme SPEC (sem "improvisos" fora da spec)
- [ ] Testes: caso feliz + 2 bordas; contrato Zod quando houver RPC/DTO
- [ ] Integração: RPC/RLS contra Supabase local/branch; SQLite local contra migrations reais
- [ ] Idempotência/concorrência testadas quando a task altera agenda/valores/status
- [ ] Validação com mensagem em português
- [ ] TalkBack verificado em tela nova/alterada
- [ ] Sem SQL em telas; sem regra de negócio em hook/tela (regras em RPC/Edge Functions)
- [ ] Migrations (Supabase CLI) revisadas e testadas; RLS habilitada em tabela nova
- [ ] Nenhum segredo (`service_role`, connection string) no bundle mobile
- [ ] CI verde; status atualizado aqui (⬜→🟨→✅)

## Registro de Mudanças deste arquivo

| Versão | Data | Mudança |
|--------|------|---------|
| 1.0 | — | Backlog inicial derivado da SPEC v1.0 (M0–M5 básicos). |
| **1.1** | **2026-10-29** | Adicionadas as trilhas de deslocamento e decisão: **T104–T106, T110–T111, T303–T304, T401–T413**; marco **M6** reforçado; trilha crítica de dependências incluída. |
| **1.2** | **2026-10-29** | **Adaptação para React Native + Expo + SQLite local:** T002–T007 (Expo, expo-sqlite, migrations, seed, IRepository); login local (T102), notificações locais (T409), expiração local (T410), transações/rollback (T414), backup/restore (T605) e migrações (T611). Removidos stack .NET/PostgreSQL/Testcontainers/FCM/Room/PostGIS. |
| **2.0** | **2026-10-29** | **Reescrita para arquitetura híbrida:** monorepo Expo/API/shared; Neon + Drizzle + Express no Render; auth server-side; uploads Cloudinary/bucket privado; sync outbox (RF32); push Expo; jobs de expiração no servidor; testes de concorrência/idempotência, k6 e restore. M0–M7 com trilha crítica atualizada. |
| **3.0** | **2026-11-08** | **Reescrita para arquitetura Supabase:** removida API Express/Neon; projeto Supabase + CLI + stack local, migrations SQL, RLS/pgTAP, RPC transacionais, `pg_cron`, PostGIS, Storage (portfólio/documentos), Realtime no chat e Edge Function de push. DoD e trilha crítica atualizados. |
