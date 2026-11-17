import type { FuelType, VehicleCostProfile } from '../../types/models';
import { energyCost } from './energy';
import { roundCents } from './money';

/** Vaste maandkosten (rente telt mee, aflossing NIET — die zit al in de afschrijving). */
export function fixedMonthlyCents(p: VehicleCostProfile): number {
  return (
    (p.insuranceCentsPerMonth ?? 0) +
    (p.roadTaxCentsPerMonth ?? 0) +
    (p.parkingPermitCentsPerMonth ?? 0) +
    (p.otherFixedCentsPerMonth ?? 0) +
    (p.financingInterestCentsPerMonth ?? 0)
  );
}

/** Afschrijving per jaar (centen, onafgerond) of null als gegevens ontbreken. */
export function depreciationPerYearCents(p: VehicleCostProfile): number | null {
  if (p.purchasePriceCents == null || p.expectedResidualValueCents == null) return null;
  if (!p.expectedOwnershipYears || p.expectedOwnershipYears <= 0) return null;
  const loss = p.purchasePriceCents - p.expectedResidualValueCents;
  if (loss < 0) return 0;
  return loss / p.expectedOwnershipYears;
}

export function depreciationPerKmCents(p: VehicleCostProfile): number | null {
  const perYear = depreciationPerYearCents(p);
  if (perYear == null || !p.annualKm || p.annualKm <= 0) return null;
  return perYear / p.annualKm;
}

export function fixedCostsPerKmCents(p: VehicleCostProfile): number | null {
  if (!p.annualKm || p.annualKm <= 0) return null;
  return (fixedMonthlyCents(p) * 12) / p.annualKm;
}

export interface AnnualCostLine {
  key: 'energy' | 'maintenance' | 'tyres' | 'depreciation' | 'insurance' | 'road_tax' | 'parking_permit' | 'financing_interest' | 'other_fixed';
  label: string;
  perYearCents: number | null;
  kind: 'variable' | 'fixed' | 'economic';
}

export interface AnnualCostSummary {
  lines: AnnualCostLine[];
  perYearCents: number;
  perMonthCents: number;
  perDayCents: number;
  perKmCents: number | null;
  /** Kostenposten die nog niet zijn ingevuld. */
  unknown: string[];
}

/**
 * Geschatte totale autokosten per jaar op basis van het kostenprofiel.
 * Alle bedragen zijn schattingen — het werkelijke uitgavenoverzicht staat los hiervan.
 */
export function annualCostSummary(fuelType: FuelType, p: VehicleCostProfile): AnnualCostSummary {
  const km = Math.max(0, p.annualKm || 0);
  const e = energyCost(km, fuelType, p);
  const m = (v: number | null) => (v == null ? null : v * 12);
  const perKm = (v: number | null) => (v == null ? null : v * km);

  const raw: AnnualCostLine[] = [
    { key: 'energy', label: fuelType === 'electric' ? 'Stroom' : 'Brandstof', perYearCents: e.rawCents, kind: 'variable' },
    { key: 'maintenance', label: 'Onderhoud', perYearCents: perKm(p.maintenanceCentsPerKm), kind: 'variable' },
    { key: 'tyres', label: 'Banden', perYearCents: perKm(p.tyresCentsPerKm), kind: 'variable' },
    { key: 'insurance', label: 'Verzekering', perYearCents: m(p.insuranceCentsPerMonth), kind: 'fixed' },
    { key: 'road_tax', label: 'Wegenbelasting', perYearCents: m(p.roadTaxCentsPerMonth), kind: 'fixed' },
    { key: 'parking_permit', label: 'Parkeervergunning', perYearCents: m(p.parkingPermitCentsPerMonth), kind: 'fixed' },
    { key: 'other_fixed', label: 'Overige vaste kosten', perYearCents: m(p.otherFixedCentsPerMonth), kind: 'fixed' },
    { key: 'financing_interest', label: 'Financieringsrente', perYearCents: m(p.financingInterestCentsPerMonth), kind: 'economic' },
    { key: 'depreciation', label: 'Afschrijving', perYearCents: depreciationPerYearCents(p), kind: 'economic' },
  ];
  const lines = raw.map((l) => ({ ...l, perYearCents: l.perYearCents == null ? null : roundCents(l.perYearCents) }));
  const optional = new Set(['parking_permit', 'other_fixed', 'financing_interest']);
  const unknown = lines.filter((l) => l.perYearCents == null && !optional.has(l.key)).map((l) => l.label);
  const perYearCents = lines.reduce((s, l) => s + (l.perYearCents ?? 0), 0);
  return {
    lines,
    perYearCents,
    perMonthCents: roundCents(perYearCents / 12),
    perDayCents: roundCents(perYearCents / 365),
    perKmCents: km > 0 ? perYearCents / km : null,
    unknown,
  };
}
