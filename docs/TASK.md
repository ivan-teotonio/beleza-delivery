# ✅ Backlog de Tarefas (TASK)

**Projeto:** App de Agendamento de Serviços de Beleza a Domicílio
**Versão:** 1.1 · **Última atualização:** 2026-10-29
**Escopo:** derivado de `docs/SPEC.md` (v1.1) · **Sequência:** `docs/PLAN.md` §5 · **Entrega:** `docs/CONSTITUTION.MD` §4 (DoD)

**Legenda de status:** ⬜ pendente · 🟨 em andamento · ✅ concluída · ⛔ bloqueada
**Formato:** `T-id | RF | descrição | dependência`

> Regra: task só inicia com status ⬜ → 🟨 e só fecha com **DoD completo** (Constituição §4) e ✅ aqui.

---

## M0 — Fundação

- [ ] **T001** | — | Criar estrutura do repositório conforme PLAN §3 (raiz, `api/`, `app/`, `docs/`) | —
- [ ] **T002** | — | Scaffold da solução .NET (Api, Core, Infra, UnitTests) com `IRepository` vazio | T001
- [ ] **T003** | — | Scaffold Android (Kotlin + Compose) com tema e navegação base | T001
- [ ] **T004** | — | CI: build + testes + lint em PR (gate de `main`) | T002, T003
- [ ] **T005** | — | Decidir premissas A1–A7 do PLAN §1 e registrar resultado no PLAN | T002
- [ ] **T006** | — | PostgreSQL + migrations (PLAN §4) e Testcontainers no CI | T002

## M1 — Conta, Perfil e Configuração de Deslocamento

- [ ] **T101** | RF01 | Tela de escolha de tipo de conta (Cliente/Profissional) | T003
- [ ] **T102** | RF02 | Cadastro/login de cliente (Google + e-mail/senha) | T101
- [ ] **T103** | RF03 | Formulário de cadastro de profissional (dados, foto, documentos) | T101
- [ ] **T104** | **RF26, RF27** | Tela **"Meu Atendimento a Domicílio"**: distância máxima + cadastro/edição de faixas (km → R$) | T103
- [ ] **T105** | **RN11, RN12** | Validações de faixas (crescentes, sem sobreposição, última = distância máxima) com mensagens específicas | T104
- [ ] **T106** | **RF26** | Prévia de cálculo no salvamento (menor/intermediária/maior faixa) — CU 2.5 passo 5 | T105
- [ ] **T107** | RF04 | Edição de perfil (cliente e profissional), incluindo faixas e distância máxima | T104
- [ ] **T108** | RF22 | Seção "Meu Endereço" (endereço único, CEP→preenchimento) | T102
- [ ] **T109** | RF21 | Painel do administrador: lista pendente → aprovar/reprovar + notificação | T103
- [ ] **T110** | **RN11, RF03** | Bloqueio: profissional sem faixas **não** é publicado na busca | T105
- [ ] **T111** | **RNF09** | Log de auditoria de alteração de faixas/distância máxima | T107

## M2 — Serviços e Agenda

- [ ] **T201** | RF05 | CRUD "Meus Serviços" (tipo, preço, duração) | T107
- [ ] **T202** | RF06 | Tela "Minha Agenda" (dias e horários disponíveis) | T107
- [ ] **T203** | RN01 | Validação: confirmação apenas em horário livre | T202
- [ ] **T204** | RF19 | Upload de portfólio com compressão (RNF11) | T107
- [ ] **T205** | RF20 | Galeria de portfólio no perfil do profissional | T204

## M3 — Busca e Disponibilidade

- [ ] **T301** | RNF07 | Geolocalização + cache local (Room) para conexão instável | T003, T006
- [ ] **T302** | RNF03 | Índice geoespacial (PostGIS) e endpoint de busca < 3 s | T006, T301
- [ ] **T303** | RF09 | Listagem por proximidade (mais próximo primeiro) **filtrada pela distância máxima de cada profissional** | T302, T105
- [ ] **T304** | **RF30** | Aviso "Profissional não atende tão longe" quando distância > máxima | T303
- [ ] **T305** | RF10 | Filtro por tipo de serviço | T303
- [ ] **T306** | RF07, RF08 | Calendário de disponibilidade + horários livres | T202, T303

## M4 — Agendamento, Deslocamento e Decisão ⭐ (novo escopo v1.1)

- [ ] **T401** | **RN13** | Módulo puro `DeslocamentoService`: cálculo de distância (haversine) + seleção de faixa (SPEC §6.2) | T002
- [ ] **T402** | **RF28** | Testes unitários da tabela SPEC §6.3 (3,2 / 7,4 / 18 / 25 km) — **gate de precificação** | T401
- [ ] **T403** | RF23, RF11 | Tela de solicitação: endereço único revisável + resumo **serviço + deslocamento + total** | T306, T401, T108
- [ ] **T404** | **RF30, RN12** | Bloqueio no envio quando distância > distância máxima | T403, T304
- [ ] **T405** | **RN14** | Persistir `distancia_km`, `valor_deslocamento`, `total` congelados no agendamento | T403
- [ ] **T406** | **RN15** | Status `pendente` ⇒ agenda `reservado`; recusa/expiração ⇒ volta a `disponivel` | T405, T202
- [ ] **T407** | **RF29, RF12** | Tela do profissional: solicitação com **distância aproximada + bairro + tarifa + total** (sem endereço) | T405
- [ ] **T408** | **RF29, RF25, RN09** | Botões **Aceitar / Recusar**: aceite libera endereço completo e bloqueia agenda; recusa libera horário | T407, T406
- [ ] **T409** | RF14 | Notificações FCM em: nova solicitação, aceite, recusa, cancelamento, **expiração** | T408
- [ ] **T410** | **RF31** | Job de expiração (prazo padrão 24 h): status `expirado` + liberação + notificação + log | T406, T409
- [ ] **T411** | RF13, RN03 | Cancelamento com prazo mínimo | T408
- [ ] **T412** | **RNF09** | Auditoria de aceite/recusa/expiração (quem, quando, distância, valores) | T408, T410
- [ ] **T413** | RN06 | Teste de sobreposição de agendamentos do cliente | T406

## M5 — Comunicação e Pós-Atendimento

- [ ] **T501** | RF15, RN08 | Chat por agendamento (disponível só após solicitação) | T407
- [ ] **T502** | RF16, RN02 | Avaliação (nota + comentário) liberada após `concluido` | T408
- [ ] **T503** | RF17 | Histórico com status **e valores (serviço/deslocamento/total)** | T405
- [ ] **T504** | RF18 | Relatório de atendimentos no período com valores e avaliações | T503

## M6 — Endurecimento (RNF)

- [ ] **T601** | RNF02, RNF08 | Auditoria de acessibilidade: TalkBack + contraste AA + alvos ≥ 48 dp em **todas** as telas | T503
- [ ] **T602** | RNF01 | Autenticação segura (token, refresh, armazenamento seguro) | T102
- [ ] **T603** | RNF05 | LGPD: consentimento, exclusão/exportação de dados, mascaramento em logs | T602
- [ ] **T604** | RNF09 | Painel/consulta de logs de auditoria | T412, T111, T109
- [ ] **T605** | RNF06 | Backup periódico com restore testado | T006
- [ ] **T606** | RNF10 | Medição de feedback ≤ 1 s nas ações principais | T601
- [ ] **T607** | RNF12 | Teste de carga ≥ 1.000 usuários simultâneos | T302
- [ ] **T608** | RNF11 | Otimização de upload de imagens (perfil/portfólio) | T204
- [ ] **T609** | RNF03 | Homologação de busca < 3 s em rede 3G/4G com cache | T302, T607
- [ ] **T610** | SPEC §12 | Revisão final de Critérios de Aceite Globais antes do release v1.1 | todos

---

## Dependências críticas (trilha da v1.1)

```
T104 → T105 → T106/T110 → T303 → T304 → T404
                                  ↘
T401 → T402 → T403 → T405 → T406/T407 → T408 → T409/T410/T412 → T610
```

## Checklist de fechamento por task (DoD resumido)

- [ ] RF/RN correspondente implementado conforme SPEC (sem "improvisos" fora da spec)
- [ ] Testes: caso feliz + 2 bordas (§4 Constituição)
- [ ] Validação com mensagem em português
- [ ] TalkBack verificado em tela nova/alterada
- [ ] CI verde; status atualizado aqui (⬜→🟨→✅)

## Registro de Mudanças deste arquivo

| Versão | Data | Mudança |
|--------|------|---------|
| 1.0 | — | Backlog inicial derivado da SPEC v1.0 (M0–M5 básicos). |
| **1.1** | **2026-10-29** | Adicionadas as trilhas de deslocamento e decisão: **T104–T106, T110–T111, T303–T304, T401–T413**; marco **M6** reforçado; trilha crítica de dependências incluída. |
