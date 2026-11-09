import * as Crypto from 'expo-crypto';

/** Gera uma chave de idempotência única para escritas críticas (RN19). */
export function novaChaveIdempotencia(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    const aleatorio = Math.random().toString(36).slice(2, 12);
    return `idem-${Date.now()}-${aleatorio}`;
  }
}

export function chavePorEscopo(escopo: string): string {
  return `${escopo}-${novaChaveIdempotencia()}`;
}
