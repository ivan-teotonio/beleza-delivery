# Beleza Delivery

Monorepo inicial para o sistema de agendamento de serviços de beleza a domicílio.

## Estrutura

- apps/api: API Express + TypeScript
- apps/mobile: Expo + React Native + TypeScript
- packages/shared: contratos e regras compartilhadas

## Início rápido

1. Subir PostgreSQL local:
   npm install
   docker compose up -d
2. Iniciar API:
   npm run dev:api
3. Iniciar app mobile:
   npm run dev:mobile

## Regras de negócio implementadas

- cálculo de preço de deslocamento com faixas de distância
- validação por distância máxima
- contratos compartilhados em Zod
- arquitetura base em monorepo

## Verificação atual

- testes do módulo de precificação: OK
- typecheck do monorepo: OK
- build da API: OK
