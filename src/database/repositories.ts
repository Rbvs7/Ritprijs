import type { Expense, SavedPlace, Trip, UserPreferences, Vehicle, VehicleCostProfile } from '../types/models';
import { getDb } from './db';

// ---------- Voorkeuren ----------
export const DEFAULT_PREFS: UserPreferences = {
  onboarded: false,
  theme: 'system',
  activeVehicleId: null,
  defaultCostMode: 'direct',
  saveRecentPlaces: true,
};

export async function loadPrefs(): Promise<UserPreferences> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM prefs WHERE key = ?', 'user');
  return row ? { ...DEFAULT_PREFS, ...JSON.parse(row.value) } : DEFAULT_PREFS;
}

export async function savePrefs(p: UserPreferences): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO prefs (key, value) VALUES (?, ?)', 'user', JSON.stringify(p));
}

// ---------- Voertuigen ----------
export async function listVehicles(): Promise<Vehicle[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ data: string }>('SELECT data FROM vehicles ORDER BY created_at');
  return rows.map((r) => JSON.parse(r.data));
}

export async function saveVehicle(v: Vehicle, profile: VehicleCostProfile): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('INSERT OR REPLACE INTO vehicles (id, data, created_at) VALUES (?, ?, ?)', v.id, JSON.stringify(v), v.createdAt);
    await db.runAsync('INSERT OR REPLACE INTO cost_profiles (vehicle_id, data) VALUES (?, ?)', v.id, JSON.stringify(profile));
  });
}

export async function deleteVehicle(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM vehicles WHERE id = ?', id);
}

export async function listProfiles(): Promise<Record<string, VehicleCostProfile>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ vehicle_id: string; data: string }>('SELECT vehicle_id, data FROM cost_profiles');
  return Object.fromEntries(rows.map((r) => [r.vehicle_id, JSON.parse(r.data)]));
}

// ---------- Ritten ----------
export async function saveTrip(t: Trip): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO trips (id, date, vehicle_id, data) VALUES (?, ?, ?, ?)', t.id, t.date, t.vehicleId, JSON.stringify(t));
}

export async function listTrips(fromIso?: string, toIso?: string, limit = 500): Promise<Trip[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ data: string }>(
    'SELECT data FROM trips WHERE date >= ? AND date < ? ORDER BY date DESC LIMIT ?',
    fromIso ?? '0000',
    toIso ?? '9999',
    limit,
  );
  return rows.map((r) => JSON.parse(r.data));
}

export async function deleteTrip(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM trips WHERE id = ?', id);
}

// ---------- Uitgaven ----------
export async function saveExpense(e: Expense): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO expenses (id, vehicle_id, date, category, amount_cents, note, trip_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    e.id,
    e.vehicleId,
    e.date,
    e.category,
    e.amountCents,
    e.note,
    e.tripId,
  );
}

export async function listExpenses(vehicleId: string, fromIso = '0000'): Promise<Expense[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; vehicle_id: string; date: string; category: Expense['category']; amount_cents: number; note: string | null; trip_id: string | null }>(
    'SELECT * FROM expenses WHERE vehicle_id = ? AND date >= ? ORDER BY date DESC',
    vehicleId,
    fromIso,
  );
  return rows.map((r) => ({ id: r.id, vehicleId: r.vehicle_id, date: r.date, category: r.category, amountCents: r.amount_cents, note: r.note, tripId: r.trip_id }));
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM expenses WHERE id = ?', id);
}

// ---------- Plaatsen ----------
export async function listPlaces(): Promise<SavedPlace[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ data: string }>('SELECT data FROM places ORDER BY last_used_at DESC');
  return rows.map((r) => JSON.parse(r.data));
}

export async function savePlace(p: SavedPlace): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    if (p.kind === 'home' || p.kind === 'work') await db.runAsync('DELETE FROM places WHERE kind = ? AND id != ?', p.kind, p.id);
    await db.runAsync('INSERT OR REPLACE INTO places (id, kind, data, last_used_at) VALUES (?, ?, ?, ?)', p.id, p.kind, JSON.stringify(p), p.lastUsedAt);
    // Houd maximaal 10 recente bestemmingen bij
    await db.runAsync("DELETE FROM places WHERE kind = 'recent' AND id NOT IN (SELECT id FROM places WHERE kind = 'recent' ORDER BY last_used_at DESC LIMIT 10)");
  });
}

export async function deletePlace(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM places WHERE id = ?', id);
}

export async function clearRecentPlaces(): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM places WHERE kind = 'recent'");
}
