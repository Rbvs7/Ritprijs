import type { VehicleCostProfile } from '../src/types/models';

export function profile(over: Partial<VehicleCostProfile> = {}): VehicleCostProfile {
  return {
    vehicleId: 'v1',
    annualKm: 15000,
    consumptionL100: null,
    consumptionKwh100: null,
    electricSharePct: 0,
    fuelPricePerLiterCents: null,
    electricityHomeCentsPerKwh: null,
    electricityPublicCentsPerKwh: null,
    homeChargingPct: 100,
    chargingLossPct: 0,
    maintenanceCentsPerKm: null,
    tyresCentsPerKm: null,
    insuranceCentsPerMonth: null,
    roadTaxCentsPerMonth: null,
    parkingPermitCentsPerMonth: null,
    otherFixedCentsPerMonth: null,
    financingInterestCentsPerMonth: null,
    purchasePriceCents: null,
    purchaseDate: null,
    expectedResidualValueCents: null,
    expectedOwnershipYears: null,
    sources: {},
    ...over,
  };
}
