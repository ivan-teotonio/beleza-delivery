import { describe, expect, it } from 'vitest';
import { calculateDeliveryPrice } from './pricing.js';

describe('calculateDeliveryPrice', () => {
  const config = {
    distanceMaxKm: 20,
    ranges: [
      { limitKm: 5, valueCents: 500 },
      { limitKm: 10, valueCents: 800 },
      { limitKm: 20, valueCents: 1200 },
    ],
  };

  it('aplica a faixa correta até 5 km', () => {
    const result = calculateDeliveryPrice(3.2, 4500, config);
    expect(result.valueCents).toBe(500);
    expect(result.totalCents).toBe(5000);
  });

  it('aplica a faixa correta em distância intermediária', () => {
    const result = calculateDeliveryPrice(7.4, 4500, config);
    expect(result.valueCents).toBe(800);
    expect(result.totalCents).toBe(5300);
  });

  it('aplica a faixa correta até 20 km', () => {
    const result = calculateDeliveryPrice(18, 4500, config);
    expect(result.valueCents).toBe(1200);
    expect(result.totalCents).toBe(5700);
  });

  it('rejeita distância acima da máxima', () => {
    expect(() => calculateDeliveryPrice(25, 4500, config)).toThrow('Profissional não atende tão longe.');
  });
});
