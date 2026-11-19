/** Helpers puros do fluxo de código de acesso (SPEC v1.5 / RF33-RF34). */

export const CODIGO_ACESSO_DIGITOS = 6;
export const COOLDOWN_REENVIO_SEGUNDOS = 60;

export function normalizarEmail(valor: string): string {
  return valor.trim().toLowerCase();
}

export function emailEhValido(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim()) && valor.length <= 254;
}

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function codigoEhValido(valor: string): boolean {
  return somenteDigitos(valor).length === CODIGO_ACESSO_DIGITOS;
}

export function mensagemCooldown(segundos: number): string {
  return `Aguarde ${Math.max(1, Math.ceil(segundos))} s para receber outro código.`;
}
