import { RDW_CONFIG } from '../../config/app';
import type { FuelType } from '../../types/models';
import { fetchJson, ServiceError } from '../../services/http';
import { normalizePlate } from './plate';

/** Uitsluitend velden die de RDW daadwerkelijk levert; null = niet beschikbaar. */
export interface RdwVehicleData {
  plate: string;
  make: string | null;
  model: string | null;
  vehicleType: string | null;
  firstRegistrationDate: string | null;
  apkExpiryDate: string | null;
  massKg: number | null;
  engineCc: number | null;
  powerKw: number | null;
  cataloguePriceCents: number | null;
  fuelType: FuelType | null;
  fuelDescriptions: string[];
  /** WLTP gecombineerd, liter/100 km (alleen als RDW het heeft). */
  consumptionL100: number | null;
  /** WLTP elektrisch verbruik, omgerekend van Wh/km naar kWh/100 km. */
  consumptionKwh100: number | null;
  electricRangeKm: number | null;
  hybridClass: string | null;
}

type Row = Record<string, string | undefined>;

export async function lookupPlate(plateInput: string, signal?: AbortSignal): Promise<RdwVehicleData | null> {
  const plate = normalizePlate(plateInput);
  if (!plate) throw new ServiceError('invalid', 'Vul een kenteken in.');
  const q = `?kenteken=${encodeURIComponent(plate)}`;
  const [main, fuel] = await Promise.all([
    fetchJson<Row[]>(RDW_CONFIG.vehiclesUrl + q, { signal }),
    fetchJson<Row[]>(RDW_CONFIG.fuelUrl + q, { signal }).catch(() => [] as Row[]),
  ]);
  if (!Array.isArray(main) || main.length === 0) return null;
  return mapRdw(plate, main[0], Array.isArray(fuel) ? fuel : []);
}

export function mapRdw(plate: string, v: Row, fuelRows: Row[]): RdwVehicleData {
  const fuels = [...fuelRows].sort((a, b) => num(a.brandstof_volgnummer)! - num(b.brandstof_volgnummer)!);
  const descriptions = fuels.map((f) => f.brandstof_omschrijving ?? '').filter(Boolean);
  const hybridClass = fuels.map((f) => f.klasse_hybride_elektrisch_voertuig).find(Boolean) ?? null;

  const l100 = firstNum(fuels, ['brandstof_verbruik_gecombineerd_wltp', 'brandstofverbruik_gecombineerd']);
  // Elektrisch verbruik staat in Wh/km → ÷10 = kWh/100 km
  const whKm = firstNum(fuels, ['elektrisch_verbruik_enkel_elektrisch_wltp', 'elektriciteitsverbruik_volledig_elektrisch']);
  const kw = firstNum(fuels, ['nettomaximumvermogen', 'netto_max_vermogen_elektrisch']);
  const range = firstNum(fuels, ['actie_radius_enkel_elektrisch_wltp', 'actie_radius_extern_opladen_wltp', 'actieradius']);

  return {
    plate,
    make: str(v.merk),
    model: cleanModel(str(v.handelsbenaming), str(v.merk)),
    vehicleType: str(v.voertuigsoort),
    firstRegistrationDate: rdwDate(v.datum_eerste_toelating),
    apkExpiryDate: rdwDate(v.vervaldatum_apk),
    massKg: num(v.massa_rijklaar) ?? num(v.massa_ledig_voertuig),
    engineCc: num(v.cilinderinhoud),
    powerKw: kw,
    cataloguePriceCents: num(v.catalogusprijs) != null ? num(v.catalogusprijs)! * 100 : null,
    fuelType: detectFuelType(descriptions, hybridClass),
    fuelDescriptions: descriptions,
    consumptionL100: l100 != null && l100 > 0 && l100 < 40 ? l100 : null,
    consumptionKwh100: whKm != null && whKm > 0 ? Math.round(whKm) / 10 : null,
    electricRangeKm: range,
    hybridClass,
  };
}

export function detectFuelType(descriptions: string[], hybridClass: string | null): FuelType | null {
  const d = descriptions.map((x) => x.toLowerCase());
  const hasElec = d.includes('elektriciteit');
  const hasPetrol = d.includes('benzine');
  const hasDiesel = d.includes('diesel');
  const hasLpg = d.includes('lpg');
  if (hybridClass === 'OVC-HEV') return 'plugin_hybrid';
  if (hasElec && (hasPetrol || hasDiesel)) return hybridClass === 'NOVC-HEV' ? 'hybrid' : 'plugin_hybrid';
  if (hybridClass === 'NOVC-HEV') return 'hybrid';
  if (hasElec) return 'electric';
  if (hasLpg) return 'lpg';
  if (hasDiesel) return 'diesel';
  if (hasPetrol) return 'petrol';
  return null;
}

function cleanModel(model: string | null, make: string | null): string | null {
  if (!model) return null;
  if (make && model.toUpperCase().startsWith(make.toUpperCase() + ' ')) return model.slice(make.length + 1);
  return model;
}

function str(s: string | undefined): string | null {
  const t = (s ?? '').trim();
  return t && t !== 'Niet geregistreerd' ? t : null;
}
function num(s: string | undefined): number | null {
  if (s == null || s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function firstNum(rows: Row[], keys: string[]): number | null {
  for (const r of rows) for (const k of keys) {
    const n = num(r[k]);
    if (n != null && n > 0) return n;
  }
  return null;
}
function rdwDate(s: string | undefined): string | null {
  if (!s || !/^\d{8}$/.test(s)) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

/** Titel-case voor merknamen ("VOLKSWAGEN" → "Volkswagen"). */
export function prettyName(s: string | null): string {
  if (!s) return '';
  if (s.length <= 3) return s; // BMW, MG, DS
  return s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase());
}
