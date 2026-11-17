import type { Vehicle, VehicleCostProfile } from '../../types/models';
import { energyCost } from '../costs/energy';
import { formatEuro, roundCents } from '../costs/money';
import { calculateTripCost } from '../costs/tripCost';
import { annualCostSummary } from '../costs/vehicleCost';

export interface CompareSide {
  vehicle: Vehicle;
  profile: VehicleCostProfile;
}

export interface CompareRow {
  label: string;
  a: number | null; // centen
  b: number | null;
  /** lager is beter */
  estimate: boolean;
}

export function compareVehicles(A: CompareSide, B: CompareSide, annualKm: number): CompareRow[] {
  const pa = { ...A.profile, annualKm };
  const pb = { ...B.profile, annualKm };
  const sa = annualCostSummary(A.vehicle.fuelType, pa);
  const sb = annualCostSummary(B.vehicle.fuelType, pb);
  const line = (s: typeof sa, key: string) => s.lines.find((l) => l.key === key)?.perYearCents ?? null;
  const per100 = (side: CompareSide, p: VehicleCostProfile) => {
    const e = energyCost(100, side.vehicle.fuelType, p);
    return e.rawCents == null ? null : roundCents(e.rawCents);
  };
  return [
    { label: 'Energie per 100 km', a: per100(A, pa), b: per100(B, pb), estimate: false },
    { label: 'Brandstof/stroom per jaar', a: line(sa, 'energy'), b: line(sb, 'energy'), estimate: false },
    { label: 'Wegenbelasting per jaar', a: line(sa, 'road_tax'), b: line(sb, 'road_tax'), estimate: false },
    { label: 'Verzekering per jaar', a: line(sa, 'insurance'), b: line(sb, 'insurance'), estimate: false },
    { label: 'Onderhoud + banden per jaar', a: sum(line(sa, 'maintenance'), line(sa, 'tyres')), b: sum(line(sb, 'maintenance'), line(sb, 'tyres')), estimate: true },
    { label: 'Afschrijving per jaar', a: line(sa, 'depreciation'), b: line(sb, 'depreciation'), estimate: true },
    { label: 'Totaal per maand', a: sa.perMonthCents, b: sb.perMonthCents, estimate: true },
    { label: 'Totaal per jaar', a: sa.perYearCents, b: sb.perYearCents, estimate: true },
    { label: 'Kosten per km', a: sa.perKmCents == null ? null : Math.round(sa.perKmCents), b: sb.perKmCents == null ? null : Math.round(sb.perKmCents), estimate: true },
  ];
}

function sum(x: number | null, y: number | null): number | null {
  if (x == null && y == null) return null;
  return (x ?? 0) + (y ?? 0);
}

/** Wat kost dezelfde rit met elke auto (directe kosten)? */
export function compareTrip(sides: CompareSide[], distanceMeters: number, isReturn: boolean) {
  return sides.map((s) => {
    const r = calculateTripCost({ distanceMeters, isReturn, fuelType: s.vehicle.fuelType, profile: s.profile, mode: 'direct', includeFixedShare: false, routeTollCents: null, extras: [] });
    return { vehicle: s.vehicle, cents: r.missing.length ? null : r.totalCents };
  });
}

export function differenceSentence(nameA: string, a: number | null, nameB: string, b: number | null, what: string): string | null {
  if (a == null || b == null) return null;
  if (a === b) return `Beide auto's kosten naar verwachting even veel ${what}.`;
  const [cheap, diff] = a < b ? [nameA, b - a] : [nameB, a - b];
  return `${cheap} kost naar verwachting ${formatEuro(diff)} minder ${what}.`;
}
