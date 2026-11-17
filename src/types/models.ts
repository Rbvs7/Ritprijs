/**
 * Centrale datamodellen. Alle geldbedragen zijn gehele CENTEN (integer) om afrondingsfouten te voorkomen.
 */

export type FuelType = 'petrol' | 'diesel' | 'lpg' | 'electric' | 'hybrid' | 'plugin_hybrid';

/** Herkomst van een waarde — wordt in de UI getoond. */
export type ValueSource = 'rdw' | 'user' | 'estimate';

export interface Vehicle {
  id: string;
  plate: string | null; // genormaliseerd, zonder streepjes, bv. "GJ433K"
  name: string; // weergavenaam, bv. "Volkswagen Polo"
  make: string | null;
  model: string | null;
  firstRegistrationDate: string | null; // ISO yyyy-mm-dd
  fuelType: FuelType;
  massKg: number | null;
  engineCc: number | null;
  powerKw: number | null;
  apkExpiryDate: string | null;
  cataloguePriceCents: number | null;
  /** Fabrieksopgave (RDW, WLTP) — alleen ter info. */
  officialConsumptionL100: number | null;
  officialConsumptionKwh100: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleCostProfile {
  vehicleId: string;
  annualKm: number;
  /** liter / 100 km — verbrandingsmotor of hybride (brandstofdeel). */
  consumptionL100: number | null;
  /** kWh / 100 km — elektrisch of plug-in (elektrisch deel). */
  consumptionKwh100: number | null;
  /** Plug-in hybride: percentage van de kilometers dat elektrisch wordt gereden. */
  electricSharePct: number;
  fuelPricePerLiterCents: number | null;
  electricityHomeCentsPerKwh: number | null;
  electricityPublicCentsPerKwh: number | null;
  /** Percentage van het laden dat thuis gebeurt (rest = openbaar). */
  homeChargingPct: number;
  chargingLossPct: number;
  // Variabele kosten per km (centen, mag decimalen hebben: 3.5 cent/km)
  maintenanceCentsPerKm: number | null;
  tyresCentsPerKm: number | null;
  // Vaste kosten (centen per maand)
  insuranceCentsPerMonth: number | null;
  roadTaxCentsPerMonth: number | null;
  parkingPermitCentsPerMonth: number | null;
  otherFixedCentsPerMonth: number | null;
  /** Alleen RENTE, nooit aflossing (aflossing is geen kostenpost: dat zit in afschrijving). */
  financingInterestCentsPerMonth: number | null;
  // Afschrijving
  purchasePriceCents: number | null;
  purchaseDate: string | null;
  expectedResidualValueCents: number | null;
  expectedOwnershipYears: number | null;
  /** Herkomst per veldnaam. */
  sources: Partial<Record<keyof VehicleCostProfile, ValueSource>>;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Place {
  id: string;
  label: string; // korte naam
  address: string; // volledige omschrijving
  coords: LatLng;
}

export interface SavedPlace extends Place {
  kind: 'home' | 'work' | 'favorite' | 'recent';
  lastUsedAt: string;
}

export interface RouteLeg {
  distanceMeters: number;
  durationSeconds: number;
}

export interface Route {
  id: string;
  provider: 'osm' | 'google';
  distanceMeters: number;
  durationSeconds: number;
  /** Lijst coördinaten voor de kaart. */
  path: LatLng[];
  legs: RouteLeg[];
  /** Tolkosten in centen; null = onbekend (provider geeft dit niet). */
  tollCents: number | null;
  summary: string;
}

export type TripCostMode = 'direct' | 'total';

export interface TripExpense {
  kind: 'parking' | 'toll' | 'other';
  amountCents: number;
  label?: string;
}

export interface CarpoolParticipant {
  id: string;
  name: string;
  isDriver: boolean;
  /** Bij handmatige verdeling. */
  manualAmountCents?: number;
  manualPercent?: number;
}

export type SplitMethod = 'equal' | 'driver_free' | 'manual_amount' | 'manual_percent';

export interface SplitShare {
  participantId: string;
  name: string;
  isDriver: boolean;
  amountCents: number;
}

export interface SplitCalculation {
  method: SplitMethod;
  totalCents: number;
  shares: SplitShare[];
}

export interface Trip {
  id: string;
  date: string; // ISO datetime
  originLabel: string;
  destinationLabel: string;
  distanceMeters: number; // inclusief retour indien retour
  durationSeconds: number;
  actualDistanceMeters: number | null;
  isReturn: boolean;
  vehicleId: string | null;
  vehicleName: string | null;
  costMode: TripCostMode;
  energyCents: number;
  extraCents: number; // tol + parkeren + overig
  totalCents: number;
  carpoolCount: number;
  split: SplitCalculation | null;
  notes: string | null;
}

export type ExpenseCategory =
  | 'fuel'
  | 'electricity'
  | 'maintenance'
  | 'repair'
  | 'tyres'
  | 'apk'
  | 'wash'
  | 'parking'
  | 'toll'
  | 'insurance'
  | 'road_tax'
  | 'other';

/** Werkelijk betaalde uitgave (een bon/rekening). */
export interface Expense {
  id: string;
  vehicleId: string;
  date: string;
  category: ExpenseCategory;
  amountCents: number;
  note: string | null;
  /** Gekoppelde rit, om dubbeltelling te voorkomen. */
  tripId: string | null;
}

export interface FuelEntry {
  id: string;
  vehicleId: string;
  date: string;
  odometerKm: number;
  liters: number;
  totalCents: number;
}

export type ThemePreference = 'system' | 'dark' | 'light';

export interface UserPreferences {
  onboarded: boolean;
  theme: ThemePreference;
  activeVehicleId: string | null;
  defaultCostMode: TripCostMode;
  saveRecentPlaces: boolean;
}

export interface PurchaseEntitlements {
  pro: boolean;
  source: 'none' | 'app_store' | 'play_store';
  purchasedAt: string | null;
}
