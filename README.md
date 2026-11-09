# belezaDelivery

Projeto inicial em **React Native + Expo + TypeScript**, criado com instalação limpa.

## Stack

- Expo SDK 58 (`expo@~58.0.23`)
- React 19.3
- React Native 0.88
- TypeScript 6.0 (modo `strict`)

## Pré-requisitos

- Node.js 20 ou superior
- npm
- App **Expo Go** no celular (Android/iOS) ou um emulador configurado

## Instalação

```bash
npm install
```

## Executar

```bash
npm start        # inicia o Metro e exibe o QR Code
npm run android  # abre no Android
npm run ios      # abre no iOS (requer macOS)
npm run web      # abre no navegador
```

## Scripts auxiliares

```bash
npm run typecheck  # verifica os tipos com tsc --noEmit
npm run doctor     # valida a saúde do projeto com expo-doctor
```

## Estrutura

```text
belezaDelivery/
├── App.tsx          # componente raiz
├── index.ts         # entrada do app (registerRootComponent)
├── app.json         # configuração do Expo (nome, slug, ícones)
├── assets/          # ícones e imagens
├── tsconfig.json    # TypeScript com strict habilitado
└── package.json
```

## Observações

- O nome do app é **belezaDelivery** (`expo.name`) e o slug é `beleza-delivery`.
- As pastas nativas `android/` e `ios/` não são versionadas; use `npx expo prebuild` apenas quando precisar de código nativo.
- Para adicionar uma biblioteca compatível com o SDK 58, prefira `npx expo install <pacote>`.
