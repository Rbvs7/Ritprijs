import { APP_CONFIG } from '../../config/app';
import { newId } from '../../utils/id';
import type { FuelType, ValueSource, Vehicle, VehicleCostProfile } from '../../types/models';
import { prettyName, type RdwVehicleData } from './rdw';

export const FUEL_LABELS: Record<FuelType, string> = {
  petrol: 'Benzine',
  diesel: 'Diesel',
  lpg: 'LPG',
  electric: 'Elektrisch',
  hybrid: 'Hybride',
  plugin_hybrid: 'Plug-in hybride',
};

export const SOURCE_LABELS: Record<ValueSource, string> = {
  rdw: 'RDW',
  user: 'Zelf ingevuld',
  estimate: 'Geschat',
};

export function defaultFuelPrice(t: FuelType): number | null {
  const d = APP_CONFIG.defaults;
  if (t === 'electric') return null;
  if (t === 'diesel') return d.dieselPricePerLiterCents;
  if (t === 'lpg') return d.lpgPricePerLiterCents;
  return d.petrolPricePerLiterCents;
}

export function createVehicle(rdw: RdwVehicleData | null, fallback: { name?: string; fuelType?: FuelType } = {}): { vehicle: Vehicle; profile: VehicleCostProfile } {
  const now = new Date().toISOString();
  const id = newId('v_');
  const fuelType: FuelType = rdw?.fuelType ?? fallback.fuelType ?? 'petrol';
  const name = rdw ? [prettyName(rdw.make), prettyName(rdw.model)].filter(Boolean).join(' ') : fallback.name || 'Mijn auto';
  const vehicle: Vehicle = {
    id,
    plate: rdw?.plate ?? null,
    name,
    make: rdw?.make ?? null,
    model: rdw?.model ?? null,
    firstRegistrationDate: rdw?.firstRegistrationDate ?? null,
    fuelType,
    massKg: rdw?.massKg ?? null,
    engineCc: rdw?.engineCc ?? null,
    powerKw: rdw?.powerKw ?? null,
    apkExpiryDate: rdw?.apkExpiryDate ?? null,
    cataloguePriceCents: rdw?.cataloguePriceCents ?? null,
    officialConsumptionL100: rdw?.consumptionL100 ?? null,
    officialConsumptionKwh100: rdw?.consumptionKwh100 ?? null,
    createdAt: now,
    updatedAt: now,
  };
  return { vehicle, profile: defaultProfile(vehicle) };
}

export function defaultProfile(v: Vehicle): VehicleCostProfile {
  const d = APP_CONFIG.defaults;
  const sources: VehicleCostProfile['sources'] = { annualKm: 'estimate' };
  const usesFuel = v.fuelType !== 'electric';
  const usesElec = v.fuelType === 'electric' || v.fuelType === 'plugin_hybrid';
  if (usesFuel) sources.fuelPricePerLiterCents = 'estimate';
  if (usesElec) {
    sources.electricityHomeCentsPerKwh = 'estimate';
    sources.electricityPublicCentsPerKwh = 'estimate';
  }
  if (v.officialConsumptionL100 != null && usesFuel) sources.consumptionL100 = 'rdw';
  if (v.officialConsumptionKwh100 != null && usesElec) sources.consumptionKwh100 = 'rdw';
  return {
    vehicleId: v.id,
    annualKm: d.annualKm,
    consumptionL100: usesFuel ? v.officialConsumptionL100 : null,
    consumptionKwh100: usesElec ? v.officialConsumptionKwh100 : null,
    electricSharePct: v.fuelType === 'plugin_hybrid' ? 30 : 0,
    fuelPricePerLiterCents: usesFuel ? defaultFuelPrice(v.fuelType) : null,
    electricityHomeCentsPerKwh: usesElec ? d.electricityHomeCentsPerKwh : null,
    electricityPublicCentsPerKwh: usesElec ? d.electricityPublicCentsPerKwh : null,
    homeChargingPct: 80,
    chargingLossPct: usesElec ? d.chargingLossPct : 0,
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
    sources: sources,
  };
}
