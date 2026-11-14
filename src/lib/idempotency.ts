import * as Crypto from 'expo-crypto';

/** Gera uma chave de idempotência única para escritas críticas (RN19). */
export function novaChaveIdempotencia(): string {
  return Crypto.randomUUID();
}

export function chavePorEscopo(escopo: string): string {
  return `${escopo}-${novaChaveIdempotencia()}`;
}
