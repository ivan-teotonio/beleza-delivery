import { z } from 'zod';

export const pricingRangeSchema = z.object({
  limitKm: z.number().positive(),
  valueCents: z.number().nonnegative(),
});

export const deliveryConfigSchema = z.object({
  distanceMaxKm: z.number().positive(),
  ranges: z.array(pricingRangeSchema).min(1),
});

export type PricingResult = {
  distanceKm: number;
  selectedLimitKm: number;
  valueCents: number;
  totalCents: number;
  serviceCents: number;
};

export function calculateDeliveryPrice(
  distanceKm: number,
  serviceCents: number,
  config: { distanceMaxKm: number; ranges: { limitKm: number; valueCents: number }[] }
): PricingResult {
  const normalized = deliveryConfigSchema.parse(config);

  if (distanceKm > normalized.distanceMaxKm) {
    throw new Error('Profissional não atende tão longe.');
  }

  const selectedRange = normalized.ranges
    .slice()
    .sort((a, b) => a.limitKm - b.limitKm)
    .find((range) => distanceKm <= range.limitKm);

  if (!selectedRange) {
    throw new Error('Não existe faixa válida para a distância informada.');
  }

  return {
    distanceKm,
    selectedLimitKm: selectedRange.limitKm,
    valueCents: selectedRange.valueCents,
    totalCents: serviceCents + selectedRange.valueCents,
    serviceCents,
  };
}
