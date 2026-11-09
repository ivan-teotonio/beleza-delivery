# 🏛️ Constituição do Projeto

**Projeto:** App de Agendamento de Serviços de Beleza a Domicílio para Pessoas com Dificuldade de Mobilidade
**Documento:** `docs/CONSTITUTION.MD` (v1.2 — origem: `documentacao.pdf`, adaptada para **Expo + SQLite local + API Express + Neon PostgreSQL**)
**Natureza:** Princípios e restrições **inegociáveis**. Alterar este documento exige justificativa registrada em `docs/SPEC.md` (seção *Registro de Mudanças*) e aprovação explícita do responsável pelo projeto.

---

## 1. Método de Trabalho (SDD — Spec-Driven Development)

O projeto segue desenvolvimento dirigido por especificação. A ordem dos documentos é obrigatória:

```
CONSTITUTION.MD  →  SPEC.md  →  PLAN.md  →  TASK.md  →  código  →  verificação
   (regras)          (o quê)     (como)     (quando)    (faz)      (prova)
```

1. **A `SPEC.md` é a única fonte da verdade** sobre *o que* o sistema faz. Se código e spec divergirem, o código está errado até que a spec seja formalmente alterada.
2. **Nenhuma funcionalidade é implementada sem** ter, na `SPEC.md`: RF (requisito), RN (regra de negócio) quando aplicável, Caso de Uso e Critério de Aceite.
3. **Nenhuma task é executada sem existir** na `TASK.md`, vinculada a pelo menos um RF.
4. **Mudança de escopo segue o fluxo:** nova `RFC curta` → atualiza `SPEC.md` → replaneja em `PLAN.md` → gera tasks em `TASK.md` → implementa. Nunca na ordem inversa.
5. **Spec versionada:** incremento de `MAIOR` para mudança de escopo/renúncia de requisito; `MENOR` para acréscimo de RF/RN/CU; `CORREÇÃO` para ajuste de texto sem efeito funcional.

## 2. Princípios do Projeto

| # | Princípio |
|---|-----------|
| P1 | **Acessibilidade primeiro.** O público-alvo tem mobilidade reduzida e, em muitos casos, baixa visão. Recurso inacessível = recurso não entregue. |
| P2 | **Privacidade por padrão.** Endereço completo só é revelado após confirmação do agendamento (RN09/RN21). Dados conforme LGPD. |
| P3 | **Simplicidade deliberada (YAGNI).** Nada de iOS, multi-loja, marketplace de pagamentos, denúncias ou sincronização peer-to-peer no escopo atual — ver seção 11 da `SPEC.md`. |
| P4 | **Arquitetura em camadas com inversão de dependência.** No app: `UI/Rotas → Hooks/Query → API Client`; no servidor: `Controller → Service → Repository`. ORM (Drizzle) só em `Repository`/infra. Nenhuma regra de negócio em tela, Controller ou Repository. |
| P5 | **Feedback em ≤ 1 s** para qualquer ação do usuário (RNF10) e **busca < 3 s** (RNF03). |
| P6 | **Toda decisão de precificação é auditável:** valores de deslocamento e total do agendamento ficam congelados no Neon e rastreáveis. |
| P7 | **Testes cobrem regra de negócio,** não apenas UI. |
| P8 | **Offline-capable, server-authoritative.** O **Neon PostgreSQL é a fonte de verdade** dos dados compartilhados; o **SQLite local** é cache, fila de sincronização e apoio offline. Leitura funciona offline; **escritas críticas só são confirmadas pelo servidor**. |
| P9 | **Integridade transacional.** Reserva de agenda, aceite/recusa, expiração e cancelamento ocorrem em transação no Neon; migrações são versionadas e testadas. |
| P10 | **Sem acesso direto do app ao banco.** O aplicativo fala somente com a API por HTTPS; credenciais do Neon vivem apenas no servidor. |
| P11 | **Idempotência e concorrência.** Toda escrita crítica carrega chave de idempotência; o servidor impede dupla reserva e duplo processamento. |
| P12 | **Minimização no cache local.** O SQLite guarda apenas o necessário para offline; endereço completo e documentos sensíveis não são cacheados além da sessão autorizada. |

## 3. Restrições Inegociáveis (herdadas do `documentacao.pdf` e adaptadas à arquitetura distribuída)

| ID | Restrição |
|----|-----------|
| C01 | Aplicativo **Android** construído com **React Native + Expo** (RNF04). |
| C02 | **Acessibilidade:** fontes ampliáveis, alto contraste, compatível com **TalkBack** via APIs de acessibilidade do React Native (RNF02, RNF08). |
| C03 | **LGPD** para todos os dados pessoais (RNF05) + **backup remoto** no Neon (PITR/branches) e **exportação local** do SQLite (RNF06). |
| C04 | **Autenticação server-side** (RNF01): e-mail/senha com hash forte na API, JWT de acesso/refresh e sessão em `expo-secure-store`. Login Google fica fora do escopo até decisão explícita. |
| C05 | **Logs de auditoria** em ações sensíveis: confirmação/cancelamento, aprovação/reprovação de profissional, aceite/recusa, expiração e alteração de tarifas (RNF09). Persistidos no Neon; espelho local quando necessário para offline. |
| C06 | **CPF único** para profissional (RN04). |
| C07 | **Endereço único por cliente**, sempre revisado e confirmado antes de cada solicitação (RF22, RF23). |
| C08 | **Sobreposição proibida:** sem dois agendamentos simultâneos para o mesmo cliente (RN06) ou profissional (RN19); agenda bloqueada pela duração do serviço (RN07). |
| C09 | **Prazo mínimo de cancelamento** (RN03). |
| C10 | **Privacidade do endereço** — antes da confirmação o profissional vê apenas distância aproximada/bairro (RN09); o chat **nunca** serve para transmitir endereço. |
| C11 | **Raio/distância de atendimento é obrigatório** para quem atende a domicílio (RN05), expresso por **distância máxima + faixas de cobrança** (RF26, RF27). |
| C12 | **Desempenho:** suportar **≥ 1.000 usuários simultâneos** (RNF12) e busca **< 3 s** (RNF03), considerando API + Neon + cache local. |
| C13 | **Neon PostgreSQL é a fonte de verdade** dos dados compartilhados. Schema e migrações versionadas via **Drizzle Kit**; constraints no banco para invariantes críticas. |
| C14 | **SQLite local (`expo-sqlite`) via Drizzle ORM** é apenas cache/outbox/geocache/preferências. Nunca é fonte de verdade de agendamentos, valores ou status. |
| C15 | **API Express + TypeScript hospedada no Render** é o único caminho entre app e Neon. Sem connection string no bundle mobile. |
| C16 | **Valores monetários em centavos inteiros**; IDs **UUID**; datas em `timestamptz` no Postgres e ISO-8601 UTC no SQLite. |
| C17 | **Escritas críticas são server-authoritative:** solicitar, aceitar, recusar, cancelar, concluir e expirar só mudam de estado após transação confirmada no Neon (RN18/RN19). |
| C18 | **Segredos e dados sensíveis** nunca aparecem em log, crash report, notificação ou cache indevido. Uploads usam URLs assinadas; documentos de verificação ficam em bucket privado. |

## 4. Definition of Done (DoD) — obrigatória para toda task

- [ ] RF/RN/CU correspondente existe na `SPEC.md` e o código implementa exatamente o descrito.
- [ ] Testes unitários das regras de negócio cobrindo **caso feliz + pelo menos 2 casos de borda** (alvo global: ≥ 80% de cobertura na camada `Service`).
- [ ] Testes de integração: API contra PostgreSQL/Neon (teste ou branch) e repositórios SQLite local contra as migrations reais.
- [ ] Testes de contrato (Zod/OpenAPI) para toda rota ou DTO novo.
- [ ] Testes de idempotência/concorrência quando a task alterar agendamento, agenda ou valores.
- [ ] Validação de entrada com mensagem clara em português.
- [ ] Verificação manual com **TalkBack** em tela nova/alterada.
- [ ] Contrato de API documentado no `PLAN.md` (OpenAPI/sumário de endpoints) e tipos compartilhados em `packages/shared`.
- [ ] Migrações (Neon e SQLite) testadas; backup/restore validado quando destrutivas.
- [ ] `lint`, `tsc --noEmit`, testes e CI verdes.
- [ ] Status atualizado na `TASK.md` (⬜ → 🟨 → ✅) com data.

## 5. Guardrails de Qualidade

- **Bug em regra de negócio** exige teste de regressão antes do fix entrar em `main`.
- **Dado sensível** (documento, CPF, endereço) nunca aparece em log, crash report ou mensagem de notificação.
- **Cobrança:** nenhuma alteração em lógica de valor (preço, deslocamento, total) é liberada sem teste de regressão de precificação.
- **Acessibilidade:** sem cor como único indicador de estado; alvos de toque ≥ 48 dp; contraste AA mínimo.
- **Offline:** leitura pode usar cache; o app **nunca** marca agendamento como confirmado, aceito ou pago sem resposta do servidor.
- **Integridade:** reserva, decisão e expiração em transação; constraints de sobreposição e unicidade no Postgres.
- **Sincronização:** outbox com idempotência, retry com backoff e detecção de conflito; nada de last-write-wins em estado crítico.
- **Backup:** PITR/branch do Neon validado + exportação local testada.
- **Segurança:** rate limit, helmet, CORS restrito, validação Zod, hash Argon2/bcrypt, refresh token rotativo e logs com redação.

## 6. Fora da Constituição (decisões reversíveis → `PLAN.md`)

Escolhas de framework, biblioteca, organização de pastas, ORM, detalhes de schema e provedores de deploy **não** são constitucionais: ficam registradas no `PLAN.md` e podem mudar livremente desde que a `SPEC.md` continue sendo atendida. **Exceção:** a arquitetura **Neon como fonte de verdade + API como único acesso + SQLite local como cache** é restrição do projeto (C13–C15) e só muda por decisão registrada na `SPEC.md`.

## 7. Mudanças neste documento

| Versão | Data | Mudança | Autor |
|--------|------|---------|-------|
| 1.0 | 2026-10-29 | Criação a partir da seção 5 (RNF) e 6 (RN) do `documentacao.pdf`. | — |
| 1.1 | 2026-10-29 | Plataforma trocada para **React Native + Expo** e persistência para **SQLite local**; P8/P9, C12–C15 e critérios de integridade/backup adicionados. | Solicitação do responsável |
| 1.2 | 2026-10-29 | Arquitetura híbrida: **Neon PostgreSQL** como fonte de verdade, **API Express no Render**, **SQLite/Drizzle** como cache/outbox. P8–P12, C12–C18 e critérios de idempotência, concorrência e segurança adicionados. | Solicitação do responsável |
