export type CurrencyCents = number;

export type DistanceKm = number;

export type PricingRange = {
  limitKm: number;
  valueCents: number;
};

export type ServicePrice = {
  label: string;
  valueCents: number;
  durationMinutes: number;
};

export type ProfessionalDeliveryConfig = {
  distanceMaxKm: number;
  ranges: PricingRange[];
};
