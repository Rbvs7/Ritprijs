import type { FuelType, TripCostMode, TripExpense, VehicleCostProfile } from '../../types/models';
import { energyCost } from './energy';
import { roundCents } from './money';
import { depreciationPerKmCents, fixedCostsPerKmCents } from './vehicleCost';

export type CostCertainty = 'estimate' | 'user' | 'unknown';

export interface CostLine {
  key: 'energy' | 'maintenance' | 'tyres' | 'depreciation' | 'fixed_share' | 'toll' | 'parking' | 'other';
  label: string;
  cents: number | null; // null = onbekend
  /** direct = ontstaat door de rit; allocated = toegerekend (geen extra uitgave door déze rit). */
  nature: 'direct' | 'allocated';
  certainty: CostCertainty;
  note?: string;
}

export interface TripCostInput {
  distanceMeters: number; // enkele reis
  isReturn: boolean;
  fuelType: FuelType;
  profile: VehicleCostProfile;
  mode: TripCostMode;
  /** Aandeel vaste kosten (verzekering, belasting...) meenemen in modus "totaal". */
  includeFixedShare: boolean;
  /** Tol van de routeprovider per enkele reis; null = onbekend. */
  routeTollCents: number | null;
  /** Handmatige extra kosten voor de hele rit (parkeren telt 1×, ook bij retour). */
  extras: TripExpense[];
}

export interface TripCostResult {
  totalDistanceKm: number;
  lines: CostLine[];
  totalCents: number;
  /** Gegevens die ontbreken voor een volledige berekening. */
  missing: string[];
  perKmCents: number | null;
  liters: number;
  kwh: number;
}

const LABELS: Record<CostLine['key'], string> = {
  energy: 'Brandstof / stroom',
  maintenance: 'Onderhoud',
  tyres: 'Banden',
  depreciation: 'Afschrijving',
  fixed_share: 'Aandeel vaste kosten',
  toll: 'Tol',
  parking: 'Parkeren',
  other: 'Overig',
};

export function calculateTripCost(input: TripCostInput): TripCostResult {
  const { profile, mode } = input;
  const oneWayKm = Math.max(0, input.distanceMeters) / 1000;
  const km = input.isReturn ? oneWayKm * 2 : oneWayKm;
  const lines: CostLine[] = [];
  const missing: string[] = [];

  // 1. Energie
  const e = energyCost(km, input.fuelType, profile);
  missing.push(...e.missing);
  lines.push({
    key: 'energy',
    label: input.fuelType === 'electric' ? 'Stroom' : input.fuelType === 'plugin_hybrid' ? 'Brandstof + stroom' : 'Brandstof',
    cents: e.rawCents == null ? null : roundCents(e.rawCents),
    nature: 'direct',
    certainty: e.rawCents == null ? 'unknown' : 'estimate',
  });

  // 2. Tol (provider) — per richting
  const tollFromRoute = input.routeTollCents == null ? null : input.routeTollCents * (input.isReturn ? 2 : 1);
  const manualToll = input.extras.filter((x) => x.kind === 'toll').reduce((s, x) => s + x.amountCents, 0);
  if (manualToll > 0) {
    // Handmatige tol vervangt de providerwaarde (voorkomt dubbeltelling).
    lines.push({ key: 'toll', label: LABELS.toll, cents: manualToll, nature: 'direct', certainty: 'user' });
  } else if (tollFromRoute != null && tollFromRoute > 0) {
    lines.push({ key: 'toll', label: LABELS.toll, cents: tollFromRoute, nature: 'direct', certainty: 'estimate' });
  }

  const parking = input.extras.filter((x) => x.kind === 'parking').reduce((s, x) => s + x.amountCents, 0);
  if (parking > 0) lines.push({ key: 'parking', label: LABELS.parking, cents: parking, nature: 'direct', certainty: 'user' });
  const other = input.extras.filter((x) => x.kind === 'other').reduce((s, x) => s + x.amountCents, 0);
  if (other > 0) lines.push({ key: 'other', label: LABELS.other, cents: other, nature: 'direct', certainty: 'user' });

  // 3. Toegerekende kosten (alleen modus "totaal")
  if (mode === 'total') {
    perKmLine(lines, 'maintenance', profile.maintenanceCentsPerKm, km);
    perKmLine(lines, 'tyres', profile.tyresCentsPerKm, km);
    const dep = depreciationPerKmCents(profile);
    perKmLine(lines, 'depreciation', dep, km);
    if (input.includeFixedShare) {
      const fixed = fixedCostsPerKmCents(profile);
      perKmLine(lines, 'fixed_share', fixed, km, 'Verdeeld over je jaarkilometers — geen extra uitgave door deze rit.');
    }
  }

  const totalCents = lines.reduce((s, l) => s + (l.cents ?? 0), 0);
  return {
    totalDistanceKm: km,
    lines,
    totalCents,
    missing: Array.from(new Set(missing)),
    perKmCents: km > 0 && lines[0].cents != null ? totalCents / km : null,
    liters: e.liters,
    kwh: e.kwh,
  };
}

function perKmLine(lines: CostLine[], key: CostLine['key'], perKm: number | null, km: number, note?: string) {
  lines.push({
    key,
    label: LABELS[key],
    cents: perKm == null ? null : roundCents(perKm * km),
    nature: 'allocated',
    certainty: perKm == null ? 'unknown' : 'estimate',
    note,
  });
}
