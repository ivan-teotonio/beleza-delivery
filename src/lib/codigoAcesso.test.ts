import { describe, expect, it } from 'vitest';
import {
  CODIGO_ACESSO_DIGITOS,
  COOLDOWN_REENVIO_SEGUNDOS,
  codigoEhValido,
  emailEhValido,
  mensagemCooldown,
  normalizarEmail,
  somenteDigitos,
} from './codigoAcesso';

describe('código de acesso', () => {
  it('normaliza e valida e-mail', () => {
    expect(normalizarEmail('  Ana@Exemplo.COM ')).toBe('ana@exemplo.com');
    expect(emailEhValido('ana@exemplo.com')).toBe(true);
    expect(emailEhValido('ana@exemplo')).toBe(false);
    expect(emailEhValido(' sem arroba')).toBe(false);
  });

  it('aceita somente códigos de 6 dígitos', () => {
    expect(CODIGO_ACESSO_DIGITOS).toBe(6);
    expect(somenteDigitos('12 34-56')).toBe('123456');
    expect(codigoEhValido('123456')).toBe(true);
    expect(codigoEhValido('12 34-56')).toBe(true);
    expect(codigoEhValido('12345')).toBe(false);
    expect(codigoEhValido('abcdef')).toBe(false);
    expect(codigoEhValido('1234567')).toBe(false);
  });

  it('respeita o cooldown de reenvio', () => {
    expect(COOLDOWN_REENVIO_SEGUNDOS).toBe(60);
    expect(mensagemCooldown(42.2)).toBe('Aguarde 43 s para receber outro código.');
    expect(mensagemCooldown(0)).toBe('Aguarde 1 s para receber outro código.');
  });
});
