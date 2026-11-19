# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

**Primary user:** pessoa com dificuldade de mobilidade (idoso, pessoa com deficiência física, pós-cirúrgico) que precisa de serviços de beleza (cabeleireiro, manicure, barbeiro, estética) atendidos a domicílio e não consegue se deslocar até salões.

**Secondary actors:**
- Profissional autônomo de beleza: presta serviços a domicílio, configura raio de atendimento, faixas de deslocamento e agenda.
- Administrador: aprova ou reprova o cadastro de profissionais.

## Product Purpose

Permitir que o usuário localize profissionais de beleza próximos à sua residência e agende serviços a domicílio, com um canal centralizado, acessível e seguro de busca, agendamento e comunicação. Sucesso significa: cliente encontra e agenda um profissional disponível dentro do seu raio, com preço de deslocamento definido pelo profissional, e o profissional aceita ou recusa cada solicitação dentro do prazo.

## Positioning

Canal centralizado para profissionais autônomos que atendem a domicílio (hoje o agendamento é informal, por telefone/WhatsApp, sem filtro por distância, disponibilidade ou tipo de serviço). Diferenciadores confirmados no SPEC:

- Deslocamento tem preço definido pelo profissional, por faixas de distância (RF26/RN10).
- O profissional limita a distância máxima que atende e nunca recebe solicitações além dela (RF27/RF30/RN12).
- O profissional aceita ou recusa cada solicitação, sob prazo de resposta (RF12/RF29/RF31).
- Arquitetura Supabase como fonte de verdade; SQLite local como cache/outbox; escritas críticas confirmadas pelo Supabase via RPC transacional (RN17/RN18).
- Leitura offline via cache; escrita crítica exige rede (RNF07/RN18).

## Operating Context

App móvel React Native + Expo (SDK 58), distribuído via Expo Go/Android, com opção web. O usuário acessa cadastro, login, busca de profissionais por proximidade, calendário de disponibilidade, solicitação de agendamento, chat pós-solicitação, avaliação, histórico e relatórios. O ambiente de uso é o domicílio do cliente e o local de atendimento do profissional, com conectividade variável. Toda autenticação passa pelo Supabase Auth (e-mail/senha, JWT + refresh, sessão em expo-secure-store). Autorização por RLS no Supabase.

## Capabilities and Constraints

**Confirmadas (SPEC v1.4):**
- Cadastro de cliente e profissional via Supabase Auth (RF01–RF03); login e-mail/senha (RF02); Google fora de escopo.
- Um único endereço estruturado por cliente, revisado ao solicitar (RF22–RF23).
- Cadastro/edição de serviços (tipo, preço, duração) e de disponibilidade da agenda (RF05, RF06).
- Busca de profissionais por proximidade, mais próximos primeiro, filtrados pela distância máxima de cada um (RF09, RF10).
- Solicitação de agendamento com cálculo de distância e deslocamento no servidor (RF11, RF28); idempotência (RF32).
- Aceite/recusa pelo profissional com bloqueio de agenda e liberação de endereço completo pós-aceite (RF12/RF29, RF24/RF25, RN07, RN09, RN16).
- Cancelamento com prazo mínimo (RF13, RN03).
- Chat por agendamento via Supabase Realtime (RF15, RN08).
- Avaliação após conclusão (RF02/RN02); histórico e relatório do profissional (RF17–RF20).
- Portfólio de fotos do profissional (RF19, RF20).
- Notificações push via Expo Push/Edge Function com fallback local (RF14).
- Expiração automática de solicitações sem resposta (24 h padrão) por pg_cron (RF31).
- Cache SQLite + outbox idempotente; sincronização por cursor; servidor é autoridade em conflito (RF32, RN19–RN22).
- Valores monetários em centavos inteiros; datas/horas em timestamptz/ISO-8601 UTC; coordenadas em PostGIS geography (SPEC 9.4).

**Fora de escopo v1.4 (não será construído agora):** iOS, pagamento/in-app checkout, múltiplos endereços por cliente, login Google, aceitação automática, escrita crítica offline, criptografia do SQLite, sincronização peer-to-peer, denúncias/suporte, vínculo com salões (SPEC seção 11).

**Fatos de produto não decididos:** nenhum obrigatório para iniciar; itens futuros listados acima permanecem fora de escopo até decisão do usuário.

## Brand Commitments

- Nome do app: **belezaDelivery** (expo.name: "Beleza a Domicílio", slug: `beleza-delivery`, scheme: `beleza-delivery`).
- Cores de marca já presentes no app.json: notificação `#6B2148`; ícone adaptativo Android background `#F6E8EF`.
- Identidade visual existente no código (componentes, tokens, telas) é autoridade vigente até novo-work decidir o contrário.

## Evidence on Hand

- `docs/SPEC.md` (v1.4, 2026-11-08): requisitos funcionais, não funcionais, regras de negócio, modelo de domínio, casos de uso e critérios de aceite.
- `README.md`: stack, instruções de instalação e execução.
- `app.json`: configuração Expo (nome, slug, ícones, permissões, plugins).
- Código existente em `app/`, `src/`, `assets/`, `supabase/`.
- Ausências que o futuro não deve fabricar: depoimentos, clientes reais, benchmarks de desempenho medidos, dados de precificação reais além dos exemplos do SPEC.

## Product Principles

1. **Servidor é autoridade:** toda escrita crítica (agendamento, aceite, recusa, cancelamento, expiração, aprovação) ocorre por RPC transacional no Supabase; o app reflete o estado confirmado.
2. **Acessibilidade primeiro:** público-alvo com dificuldade de mobilidade e baixa visão; fontes ampliáveis, alto contraste, compatível com TalkBack, contraste AA.
3. **Privacidade e segurança:** LGPD, coleta mínima, RLS em todas as tabelas, `service_role` nunca no bundle, endereço completo só após aceite.
4. **Offline para leitura, online para decisão:** dados podem ser lidos offline do cache SQLite; escritas críticas exigem rede e confirmação do Supabase.
5. **Preço transparente:** serviço + deslocamento + total exibidos ao cliente antes da confirmação; valores congelados no agendamento (RN14).

## Accessibility & Inclusion

Fontes ampliáveis, alto contraste e compatível com leitor de tela nativo (TalkBack); contraste AA; público-alvo inclui pessoas com baixa visão e dificuldade de mobilidade (RNF02, RNF08).
