import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Place, Route, TripCostMode, TripExpense } from '../types/models';

/** De route die de gebruiker op dit moment plant — gedeeld tussen kaart, split-scherm en vergelijken. */
export interface PlanState {
  origin: Place | null; // null = huidige locatie
  destination: Place | null;
  waypoints: Place[];
  routes: Route[];
  selectedRouteId: string | null;
  isReturn: boolean;
  costMode: TripCostMode;
  includeFixedShare: boolean;
  extras: TripExpense[];
  avoidTolls: boolean;
  avoidHighways: boolean;
  departAt: Date | null;
  /** Coördinaat die als vertrekpunt is gebruikt bij de berekening (huidige locatie of gekozen plek). */
  resolvedOriginLabel: string;
}

const initial: PlanState = {
  origin: null,
  destination: null,
  waypoints: [],
  routes: [],
  selectedRouteId: null,
  isReturn: false,
  costMode: 'direct',
  includeFixedShare: false,
  extras: [],
  avoidTolls: false,
  avoidHighways: false,
  departAt: null,
  resolvedOriginLabel: 'Huidige locatie',
};

interface PlannerCtx {
  plan: PlanState;
  setPlan: (patch: Partial<PlanState> | ((p: PlanState) => Partial<PlanState>)) => void;
  resetPlan: () => void;
  selectedRoute: Route | null;
}

const Ctx = createContext<PlannerCtx | null>(null);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [plan, setState] = useState<PlanState>(initial);
  const value = useMemo<PlannerCtx>(
    () => ({
      plan,
      setPlan: (patch) => setState((cur) => ({ ...cur, ...(typeof patch === 'function' ? patch(cur) : patch) })),
      resetPlan: () => setState((cur) => ({ ...initial, costMode: cur.costMode })),
      selectedRoute: plan.routes.find((r) => r.id === plan.selectedRouteId) ?? plan.routes[0] ?? null,
    }),
    [plan],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlanner(): PlannerCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePlanner buiten PlannerProvider');
  return c;
}
