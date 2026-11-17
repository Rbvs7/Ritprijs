import type { ExpenseCategory, Trip } from '../../types/models';

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  fuel: 'Brandstof',
  electricity: 'Laden',
  maintenance: 'Onderhoud',
  repair: 'Reparatie',
  tyres: 'Banden',
  apk: 'APK',
  wash: 'Autowassen',
  parking: 'Parkeren',
  toll: 'Tol',
  insurance: 'Verzekering',
  road_tax: 'Wegenbelasting',
  other: 'Overig',
};

export type PeriodKey = 'today' | 'week' | 'month' | 'year' | 'all';

/** Begin van een periode (lokale tijd) als ISO-string. */
export function periodStart(key: PeriodKey, now = new Date()): string | undefined {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (key === 'today') return d.toISOString();
  if (key === 'week') {
    const day = (d.getDay() + 6) % 7; // maandag = 0
    d.setDate(d.getDate() - day);
    return d.toISOString();
  }
  if (key === 'month') return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
  if (key === 'year') return new Date(d.getFullYear(), 0, 1).toISOString();
  return undefined;
}

export interface TripStats {
  count: number;
  totalKm: number;
  totalCents: number;
  energyCents: number;
  avgPerKmCents: number | null;
  avgPerTripCents: number | null;
}

export function tripStats(trips: Trip[]): TripStats {
  const totalKm = trips.reduce((s, t) => s + (t.actualDistanceMeters ?? t.distanceMeters) / 1000, 0);
  const totalCents = trips.reduce((s, t) => s + t.totalCents, 0);
  const energyCents = trips.reduce((s, t) => s + t.energyCents, 0);
  return {
    count: trips.length,
    totalKm,
    totalCents,
    energyCents,
    avgPerKmCents: totalKm > 0 ? totalCents / totalKm : null,
    avgPerTripCents: trips.length ? Math.round(totalCents / trips.length) : null,
  };
}
