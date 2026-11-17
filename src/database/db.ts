import * as SQLite from 'expo-sqlite';

/**
 * Lokale opslag (SQLite). Alle gegevens blijven op het toestel.
 * Schema-versies via PRAGMA user_version; voeg nieuwe migraties onderaan MIGRATIONS toe.
 */

const MIGRATIONS: string[] = [
  // v1
  `
  CREATE TABLE IF NOT EXISTS prefs (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cost_profiles (
    vehicle_id TEXT PRIMARY KEY NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    vehicle_id TEXT,
    data TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS trips_date ON trips(date);
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY NOT NULL,
    vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    note TEXT,
    trip_id TEXT
  );
  CREATE INDEX IF NOT EXISTS expenses_vehicle_date ON expenses(vehicle_id, date);
  CREATE TABLE IF NOT EXISTS places (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL,
    data TEXT NOT NULL,
    last_used_at TEXT NOT NULL
  );
  `,
];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('ritprijs.db');
      await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      let version = row?.user_version ?? 0;
      while (version < MIGRATIONS.length) {
        await db.withTransactionAsync(async () => {
          await db.execAsync(MIGRATIONS[version]);
        });
        version += 1;
        await db.execAsync(`PRAGMA user_version = ${version}`);
      }
      return db;
    })().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

/** Verwijdert ALLE gegevens van de gebruiker (AVG: recht op wissen). */
export async function wipeAllData(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM expenses; DELETE FROM trips; DELETE FROM cost_profiles; DELETE FROM vehicles; DELETE FROM places; DELETE FROM prefs;');
  });
}
