import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { wipeAllData } from '../database/db';
import * as repo from '../database/repositories';
import type { UserPreferences, Vehicle, VehicleCostProfile } from '../types/models';

interface AppState {
  ready: boolean;
  error: string | null;
  prefs: UserPreferences;
  vehicles: Vehicle[];
  profiles: Record<string, VehicleCostProfile>;
  activeVehicle: Vehicle | null;
  activeProfile: VehicleCostProfile | null;
  updatePrefs: (patch: Partial<UserPreferences>) => Promise<void>;
  upsertVehicle: (v: Vehicle, p: VehicleCostProfile, makeActive?: boolean) => Promise<void>;
  removeVehicle: (id: string) => Promise<void>;
  wipeEverything: () => Promise<void>;
  /** Wordt opgehoogd zodra ritten wijzigen, zodat lijsten herladen. */
  tripsVersion: number;
  bumpTrips: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences>(repo.DEFAULT_PREFS);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [profiles, setProfiles] = useState<Record<string, VehicleCostProfile>>({});
  const [tripsVersion, setTripsVersion] = useState(0);
  const prefsRef = useRef(prefs);

  useEffect(() => {
    let cancelled = false;
    Promise.all([repo.loadPrefs(), repo.listVehicles(), repo.listProfiles()])
      .then(([p, v, pr]) => {
        if (cancelled) return;
        prefsRef.current = p;
        setPrefs(p);
        setVehicles(v);
        setProfiles(pr);
        setError(null);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setError('De lokale database kon niet worden geopend.');
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePrefs = useCallback(async (patch: Partial<UserPreferences>) => {
    const next: UserPreferences = { ...prefsRef.current, ...patch };
    prefsRef.current = next;
    setPrefs(next);
    await repo.savePrefs(next);
  }, []);

  const upsertVehicle = useCallback(
    async (v: Vehicle, p: VehicleCostProfile, makeActive = false) => {
      const updated = { ...v, updatedAt: new Date().toISOString() };
      await repo.saveVehicle(updated, p);
      setVehicles((cur) => (cur.some((x) => x.id === v.id) ? cur.map((x) => (x.id === v.id ? updated : x)) : [...cur, updated]));
      setProfiles((cur) => ({ ...cur, [v.id]: p }));
      if (makeActive) await updatePrefs({ activeVehicleId: v.id });
    },
    [updatePrefs],
  );

  const removeVehicle = useCallback(
    async (id: string) => {
      await repo.deleteVehicle(id);
      const rest = vehicles.filter((x) => x.id !== id);
      setVehicles(rest);
      setProfiles((cur) => {
        const { [id]: _, ...others } = cur;
        return others;
      });
      if (prefs.activeVehicleId === id) await updatePrefs({ activeVehicleId: rest[0]?.id ?? null });
    },
    [vehicles, prefs.activeVehicleId, updatePrefs],
  );

  const wipeEverything = useCallback(async () => {
    await wipeAllData();
    prefsRef.current = repo.DEFAULT_PREFS;
    setPrefs(repo.DEFAULT_PREFS);
    setVehicles([]);
    setProfiles({});
    setTripsVersion((n) => n + 1);
  }, []);

  const value = useMemo<AppState>(() => {
    const activeVehicle = vehicles.find((v) => v.id === prefs.activeVehicleId) ?? vehicles[0] ?? null;
    return {
      ready,
      error,
      prefs,
      vehicles,
      profiles,
      activeVehicle,
      activeProfile: activeVehicle ? profiles[activeVehicle.id] ?? null : null,
      updatePrefs,
      upsertVehicle,
      removeVehicle,
      wipeEverything,
      tripsVersion,
      bumpTrips: () => setTripsVersion((n) => n + 1),
    };
  }, [ready, error, prefs, vehicles, profiles, updatePrefs, upsertVehicle, removeVehicle, wipeEverything, tripsVersion]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp buiten AppStateProvider');
  return c;
}
