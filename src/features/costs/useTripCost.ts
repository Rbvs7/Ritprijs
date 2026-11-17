import { useMemo } from 'react';
import type { PlanState } from '../../state/Planner';
import type { Route, Vehicle, VehicleCostProfile } from '../../types/models';
import { calculateTripCost, type TripCostResult } from './tripCost';

export function computePlanCost(plan: PlanState, route: Route | null, vehicle: Vehicle | null, profile: VehicleCostProfile | null): TripCostResult | null {
  if (!route || !vehicle || !profile) return null;
  return calculateTripCost({
    distanceMeters: route.distanceMeters,
    isReturn: plan.isReturn,
    fuelType: vehicle.fuelType,
    profile,
    mode: plan.costMode,
    includeFixedShare: plan.includeFixedShare,
    routeTollCents: route.tollCents,
    extras: plan.extras,
  });
}

export function useTripCost(plan: PlanState, route: Route | null, vehicle: Vehicle | null, profile: VehicleCostProfile | null) {
  return useMemo(() => computePlanCost(plan, route, vehicle, profile), [plan, route, vehicle, profile]);
}
