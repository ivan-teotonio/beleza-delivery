# 🏛️ Constituição do Projeto

**Projeto:** App de Agendamento de Serviços de Beleza a Domicílio para Pessoas com Dificuldade de Mobilidade
**Documento:** `docs/CONSTITUTION.MD` (v1.0 — origem: `documentacao.pdf`)
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
| P2 | **Privacidade por padrão.** Endereço completo só é revelado após confirmação do agendamento (RN09). Dados conforme LGPD. |
| P3 | **Simplicidade deliberada (YAGNI).** Nada de iOS, multi-loja, marketplace de pagamentos ou denúncias no escopo atual — ver seção 11 da `SPEC.md`. |
| P4 | **Arquitetura em camadas com inversão de dependência** (`Controller → Service → Repository` atrás de `IRepository`). Nenhuma regra de negócio em Controller ou em Repository. |
| P5 | **Feedback em ≤ 1 s** para qualquer ação do usuário (RNF10) e **busca < 3 s** (RNF03). |
| P6 | **Toda decisão de precificação é auditável:** valores de deslocamento e total do agendamento ficam congelados e rastreáveis. |
| P7 | **Testes cobrem regra de negócio,** não apenas UI. |

## 3. Restrições Inegociáveis (herdados do `documentacao.pdf`)

| ID | Restrição |
|----|-----------|
| C01 | Aplicativo **Android** (RNF04). |
| C02 | **Acessibilidade:** fontes ampliáveis, alto contraste, compatível com **TalkBack** (RNF02, RNF08). |
| C03 | **LGPD** para todos os dados pessoais (RNF05) + **backup periódico** (RNF06). |
| C04 | **Autenticação segura** (RNF01) — Google ou e-mail/senha. |
| C05 | **Logs de auditoria** em ações sensíveis: confirmação/cancelamento de agendamento, aprovação/reprovação de profissional (RNF09). |
| C06 | **CPF único** para profissional (RN04). |
| C07 | **Endereço único por cliente**, sempre revisado e confirmado antes de cada solicitação (RF22, RF23). |
| C08 | **Sobreposição proibida:** sem dois agendamentos simultâneos para o mesmo cliente (RN06); agenda bloqueada pela duração do serviço (RN07). |
| C09 | **Prazo mínimo de cancelamento** (RN03). |
| C10 | **Privacidade do endereço** — antes da confirmação o profissional vê apenas distância aproximada/bairro (RN09); o chat **nunca** serve para transmitir endereço. |
| C11 | **Raio/distância de atendimento é obrigatório** para quem atende a domicílio (RN05), agora expresso por **distância máxima + faixas de cobrança** (RF26, RF27). |
| C12 | **Desempenho:** suportar ≥ 1.000 usuários simultâneos (RNF12) e busca geográfica com cache local para conexão instável (RNF07). |

## 4. Definition of Done (DoD) — obrigatória para toda task

- [ ] RF/RN/CU correspondente existe na `SPEC.md` e o código implementa exatamente o descrito.
- [ ] Testes unitários das regras de negócio cobrindo **caso feliz + pelo menos 2 casos de borda** (alvo global: ≥ 80% de cobertura na camada `Service`).
- [ ] Validação de entrada (distância, valor, faixa) com mensagem de erro clara em português.
- [ ] Verificação manual com **TalkBack** em tela nova/alterada.
- [ ] Contrato de API (quando houver) documentado no `PLAN.md`.
- [ ] `lint`/formatação limpos e CI verde.
- [ ] Status atualizado na `TASK.md` (⬜ → 🟨 → ✅) com data.

## 5. Guardrails de Qualidade

- **Bug em regra de negócio** exige teste de regressão antes do fix entrar em `main`.
- **Dado sensível** (documento, CPF, endereço) nunca aparece em log, crash report ou mensagem de notificação.
- **Cobrança:** nenhuma alteração em lógica de valor (preço, deslocamento, total) é liberada sem teste de regressão de precificação.
- **Acessibilidade:** sem cor como único indicador de estado; alvos de toque ≥ 48 dp; contraste AA mínimo.
- **Cache/offline:** leitura de busca geográfica degradada é aceitável; escrita de agendamento nunca é.

## 6. Fora da Constituição (decisões reversíveis → `PLAN.md`)

Escolhas de framework, biblioteca, formato de API, banco de dados e organização de pastas **não** são constitucionais: ficam registradas no `PLAN.md` e podem mudar livremente desde que a `SPEC.md` continue sendo atendida.

## 7. Mudanças neste documento

| Versão | Data | Mudança | Autor |
|--------|------|---------|-------|
| 1.0 | 2026-10-29 | Criação a partir da seção 5 (RNF) e 6 (RN) do `documentacao.pdf`. | — |
