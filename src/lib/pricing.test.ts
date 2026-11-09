import { describe, expect, it } from 'vitest';
import { distanciasDeExemplo, selecionarFaixa, validarFaixas } from './pricing';

const faixasExemplo = [
  { limite_km: 5, valor_centavos: 500, ordem: 1 },
  { limite_km: 10, valor_centavos: 800, ordem: 2 },
  { limite_km: 20, valor_centavos: 1200, ordem: 3 },
];

describe('precificação por faixa (SPEC §6.3)', () => {
  it('3,2 km aplica a faixa de até 5 km', () => {
    const r = selecionarFaixa(3.2, faixasExemplo, 20);
    expect(r.disponivel).toBe(true);
    expect(r.valorDeslocamentoCentavos).toBe(500);
    expect(r.faixa?.limite_km).toBe(5);
  });

  it('7,4 km aplica a faixa de até 10 km', () => {
    const r = selecionarFaixa(7.4, faixasExemplo, 20);
    expect(r.disponivel).toBe(true);
    expect(r.valorDeslocamentoCentavos).toBe(800);
    expect(r.faixa?.limite_km).toBe(10);
  });

  it('18 km aplica a faixa de até 20 km', () => {
    const r = selecionarFaixa(18, faixasExemplo, 20);
    expect(r.disponivel).toBe(true);
    expect(r.valorDeslocamentoCentavos).toBe(1200);
    expect(r.faixa?.limite_km).toBe(20);
  });

  it('25 km fica indisponível quando excede a distância máxima', () => {
    const r = selecionarFaixa(25, faixasExemplo, 20);
    expect(r.disponivel).toBe(false);
  });

  it('exatamente no limite da faixa usa a faixa corrente', () => {
    expect(selecionarFaixa(10, faixasExemplo, 20).valorDeslocamentoCentavos).toBe(800);
  });

  it('distância máxima menor que a última faixa continua válida pela regra do servidor', () => {
    // O servidor exige que a última faixa cubra a distância máxima; aqui testamos seleção pura.
    const r = selecionarFaixa(10, faixasExemplo, 10);
    expect(r.disponivel).toBe(true);
    expect(r.valorDeslocamentoCentavos).toBe(800);
  });

  it('sem faixas configuradas fica indisponível', () => {
    expect(selecionarFaixa(2, [], 20).disponivel).toBe(false);
  });

  it('distância inválida fica indisponível', () => {
    expect(selecionarFaixa(-1, faixasExemplo, 20).disponivel).toBe(false);
    expect(selecionarFaixa(Number.NaN, faixasExemplo, 20).disponivel).toBe(false);
  });
});

describe('validação de faixas', () => {
  it('aceita faixas crescentes sem sobreposição quando a última cobre a máxima', () => {
    expect(validarFaixas(20, faixasExemplo)).toEqual([]);
  });

  it('rejeita limite fora de ordem', () => {
    const erros = validarFaixas(10, [
      { limite_km: 10, valor_centavos: 500 },
      { limite_km: 5, valor_centavos: 800 },
    ]);
    expect(erros.some((e) => e.includes('crescentes'))).toBe(true);
  });

  it('rejeita última faixa diferente da distância máxima', () => {
    const erros = validarFaixas(25, faixasExemplo);
    expect(erros.some((e) => e.includes('última faixa'))).toBe(true);
  });

  it('rejeita ausência de faixas', () => {
    expect(validarFaixas(20, []).length).toBeGreaterThan(0);
  });

  it('gera distâncias representativas (min/intermediária/máxima)', () => {
    expect(distanciasDeExemplo(faixasExemplo)).toEqual([2.5, 7.5, 15]);
  });
});
