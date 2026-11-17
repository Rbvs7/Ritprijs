import type { FuelType, VehicleCostProfile } from '../../types/models';

export type EnergyProfile = Pick<
  VehicleCostProfile,
  | 'consumptionL100'
  | 'consumptionKwh100'
  | 'electricSharePct'
  | 'fuelPricePerLiterCents'
  | 'electricityHomeCentsPerKwh'
  | 'electricityPublicCentsPerKwh'
  | 'homeChargingPct'
  | 'chargingLossPct'
>;

export interface EnergyResult {
  /** Onafgeronde kosten in (fracties van) centen; null = niet te berekenen. */
  rawCents: number | null;
  liters: number;
  kwh: number;
  missing: string[];
}

export function usesFuel(t: FuelType): boolean {
  return t !== 'electric';
}
export function usesElectricity(t: FuelType): boolean {
  return t === 'electric' || t === 'plugin_hybrid';
}

/** Gemiddelde stroomprijs per kWh volgens de thuis/openbaar-verhouding. */
export function blendedElectricityPrice(p: EnergyProfile): number | null {
  const homePct = clamp(p.homeChargingPct ?? 100, 0, 100) / 100;
  const home = p.electricityHomeCentsPerKwh;
  const pub = p.electricityPublicCentsPerKwh;
  if (homePct === 1) return home ?? null;
  if (homePct === 0) return pub ?? null;
  if (home == null || pub == null) return null;
  return homePct * home + (1 - homePct) * pub;
}

/**
 * Energiekosten voor een afstand.
 * Brandstof:  (km / 100) × l/100km × prijs per liter
 * Elektrisch: (km / 100) × kWh/100km × (1 + laadverlies) × prijs per kWh
 * Plug-in hybride: kilometers worden gesplitst in een elektrisch en een brandstofdeel (geen dubbeltelling).
 */
export function energyCost(distanceKm: number, fuelType: FuelType, p: EnergyProfile): EnergyResult {
  const missing: string[] = [];
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return { rawCents: null, liters: 0, kwh: 0, missing: ['Ongeldige afstand'] };
  }
  if (distanceKm === 0) return { rawCents: 0, liters: 0, kwh: 0, missing };

  let elecKm = 0;
  let fuelKm = 0;
  if (fuelType === 'electric') elecKm = distanceKm;
  else if (fuelType === 'plugin_hybrid') {
    const share = clamp(p.electricSharePct ?? 0, 0, 100) / 100;
    elecKm = distanceKm * share;
    fuelKm = distanceKm - elecKm;
  } else fuelKm = distanceKm;

  let cents = 0;
  let liters = 0;
  let kwh = 0;

  if (fuelKm > 0) {
    if (p.consumptionL100 == null || p.consumptionL100 <= 0) missing.push('Brandstofverbruik');
    if (p.fuelPricePerLiterCents == null || p.fuelPricePerLiterCents < 0) missing.push('Brandstofprijs');
    if (p.consumptionL100 != null && p.fuelPricePerLiterCents != null) {
      liters = (fuelKm / 100) * p.consumptionL100;
      cents += liters * p.fuelPricePerLiterCents;
    }
  }
  if (elecKm > 0) {
    const price = blendedElectricityPrice(p);
    if (p.consumptionKwh100 == null || p.consumptionKwh100 <= 0) missing.push('Stroomverbruik');
    if (price == null) missing.push('Stroomprijs');
    if (p.consumptionKwh100 != null && price != null) {
      const loss = 1 + clamp(p.chargingLossPct ?? 0, 0, 50) / 100;
      kwh = (elecKm / 100) * p.consumptionKwh100 * loss;
      cents += kwh * price;
    }
  }
  return { rawCents: missing.length ? null : cents, liters, kwh, missing };
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
