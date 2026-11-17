import { describe, expect, it } from 'vitest';
import { energyCost } from '../src/features/costs/energy';
import { formatEuro, parseDecimal, parseEuroToCents, roundCents } from '../src/features/costs/money';
import { calculateTripCost, type TripCostInput } from '../src/features/costs/tripCost';
import { annualCostSummary, depreciationPerKmCents, depreciationPerYearCents } from '../src/features/costs/vehicleCost';
import { profile } from './helpers';

const petrol = profile({ consumptionL100: 7.5, fuelPricePerLiterCents: 210 });

function trip(over: Partial<TripCostInput> = {}): TripCostInput {
  return {
    distanceMeters: 150_000,
    isReturn: false,
    fuelType: 'petrol',
    profile: petrol,
    mode: 'direct',
    includeFixedShare: false,
    routeTollCents: null,
    extras: [],
    ...over,
  };
}

describe('money', () => {
  it('rondt half-up af, ook bij float-ruis', () => {
    expect(roundCents(2362.5)).toBe(2363);
    expect(roundCents(2362.4999999999995)).toBe(2363);
    expect(roundCents(0.1 * 3 * 100)).toBe(30);
    expect(roundCents(-12.5)).toBe(-13);
  });
  it('parseert Nederlandse invoer', () => {
    expect(parseEuroToCents('2,10')).toBe(210);
    expect(parseEuroToCents('€ 1.234,56')).toBe(123456);
    expect(parseEuroToCents('1,234.56')).toBe(123456);
    expect(parseEuroToCents('abc')).toBeNull();
    expect(parseEuroToCents('')).toBeNull();
    expect(parseDecimal('7,2')).toBe(7.2);
    expect(parseDecimal('7,2x')).toBeNull();
  });
  it('formatteert met twee decimalen', () => {
    expect(formatEuro(1084)).toMatch(/10,84/);
    expect(formatEuro(5)).toMatch(/0,05/);
  });
});

describe('energiekosten', () => {
  it('benzine: voorbeeld uit de specificatie (150 km, 7,5 l, €2,10) = €23,63', () => {
    const r = calculateTripCost(trip());
    expect(r.lines[0].cents).toBe(2363);
    expect(r.totalCents).toBe(2363);
  });
  it('diesel', () => {
    const r = calculateTripCost(trip({ fuelType: 'diesel', profile: profile({ consumptionL100: 5.5, fuelPricePerLiterCents: 179 }), distanceMeters: 100_000 }));
    expect(r.totalCents).toBe(985); // 5,5 l × 1,79
  });
  it('elektrisch met laadverlies en thuis/openbaar-mix', () => {
    const p = profile({ consumptionKwh100: 17, electricityHomeCentsPerKwh: 30, electricityPublicCentsPerKwh: 60, homeChargingPct: 50, chargingLossPct: 10 });
    const e = energyCost(100, 'electric', p);
    // 17 kWh × 1,1 = 18,7 kWh × 45 ct = 841,5 ct
    expect(e.kwh).toBeCloseTo(18.7);
    expect(roundCents(e.rawCents!)).toBe(842);
  });
  it('plug-in hybride telt niet dubbel', () => {
    const p = profile({ consumptionL100: 6, fuelPricePerLiterCents: 200, consumptionKwh100: 20, electricityHomeCentsPerKwh: 25, electricSharePct: 40 });
    const e = energyCost(100, 'plugin_hybrid', p);
    // 60 km brandstof: 3,6 l × 200 = 720; 40 km stroom: 8 kWh × 25 = 200
    expect(e.liters).toBeCloseTo(3.6);
    expect(e.kwh).toBeCloseTo(8);
    expect(e.rawCents).toBeCloseTo(920);
  });
  it('retourrit verdubbelt afstand en tol, parkeren telt één keer', () => {
    const r = calculateTripCost(trip({ isReturn: true, routeTollCents: 300, extras: [{ kind: 'parking', amountCents: 750 }] }));
    expect(r.totalDistanceKm).toBe(300);
    expect(r.lines.find((l) => l.key === 'energy')!.cents).toBe(4725);
    expect(r.lines.find((l) => l.key === 'toll')!.cents).toBe(600);
    expect(r.lines.find((l) => l.key === 'parking')!.cents).toBe(750);
    expect(r.totalCents).toBe(4725 + 600 + 750);
  });
  it('handmatige tol vervangt providertol (geen dubbeltelling)', () => {
    const r = calculateTripCost(trip({ routeTollCents: 300, extras: [{ kind: 'toll', amountCents: 550 }] }));
    expect(r.lines.filter((l) => l.key === 'toll')).toHaveLength(1);
    expect(r.lines.find((l) => l.key === 'toll')!.cents).toBe(550);
  });
  it('kosten per kilometer', () => {
    const r = calculateTripCost(trip());
    expect(r.perKmCents).toBeCloseTo(2363 / 150);
  });
  it('rit van nul kilometer kost niets', () => {
    const r = calculateTripCost(trip({ distanceMeters: 0 }));
    expect(r.totalCents).toBe(0);
    expect(r.perKmCents).toBeNull();
  });
  it('ontbrekende voertuiggegevens worden gemeld, niet verzonnen', () => {
    const r = calculateTripCost(trip({ profile: profile({ consumptionL100: null, fuelPricePerLiterCents: 210 }) }));
    expect(r.lines[0].cents).toBeNull();
    expect(r.lines[0].certainty).toBe('unknown');
    expect(r.missing).toContain('Brandstofverbruik');
    expect(r.totalCents).toBe(0);
  });
  it('ongeldige invoer (negatieve afstand) geeft geen bedrag', () => {
    const e = energyCost(-5, 'petrol', petrol);
    expect(e.rawCents).toBeNull();
  });
});

describe('totale toegerekende ritkosten', () => {
  const full = profile({
    consumptionL100: 6,
    fuelPricePerLiterCents: 200,
    annualKm: 10000,
    maintenanceCentsPerKm: 4,
    tyresCentsPerKm: 1,
    purchasePriceCents: 20_000_00,
    expectedResidualValueCents: 10_000_00,
    expectedOwnershipYears: 5,
    insuranceCentsPerMonth: 50_00,
    roadTaxCentsPerMonth: 30_00,
  });
  it('voegt onderhoud, banden en afschrijving toe', () => {
    const r = calculateTripCost(trip({ profile: full, distanceMeters: 100_000, mode: 'total' }));
    const get = (k: string) => r.lines.find((l) => l.key === k)!.cents;
    expect(get('energy')).toBe(1200);
    expect(get('maintenance')).toBe(400);
    expect(get('tyres')).toBe(100);
    // afschrijving: €10.000 / 5 jr / 10.000 km = 20 ct/km
    expect(get('depreciation')).toBe(2000);
    expect(r.lines.find((l) => l.key === 'fixed_share')).toBeUndefined();
    expect(r.totalCents).toBe(3700);
  });
  it('vaste kosten alleen als expliciet gekozen, gemarkeerd als toegerekend', () => {
    const r = calculateTripCost(trip({ profile: full, distanceMeters: 100_000, mode: 'total', includeFixedShare: true }));
    const f = r.lines.find((l) => l.key === 'fixed_share')!;
    // (50+30) × 12 / 10.000 km = 9,6 ct/km × 100 km
    expect(f.cents).toBe(960);
    expect(f.nature).toBe('allocated');
  });
  it('directe modus bevat geen toegerekende posten', () => {
    const r = calculateTripCost(trip({ profile: full, mode: 'direct' }));
    expect(r.lines.every((l) => l.nature === 'direct')).toBe(true);
  });
});

describe('autokosten per jaar', () => {
  it('afschrijving per jaar en per km', () => {
    const p = profile({ purchasePriceCents: 30_000_00, expectedResidualValueCents: 12_000_00, expectedOwnershipYears: 6, annualKm: 15000 });
    expect(depreciationPerYearCents(p)).toBe(3_000_00);
    expect(depreciationPerKmCents(p)).toBe(20);
  });
  it('afschrijving onbekend zonder gegevens', () => {
    expect(depreciationPerYearCents(profile({ purchasePriceCents: 100 }))).toBeNull();
  });
  it('maand- en jaartotalen', () => {
    const p = profile({
      annualKm: 12000,
      consumptionL100: 5,
      fuelPricePerLiterCents: 200,
      maintenanceCentsPerKm: 5,
      tyresCentsPerKm: 1,
      insuranceCentsPerMonth: 60_00,
      roadTaxCentsPerMonth: 40_00,
      purchasePriceCents: 20_000_00,
      expectedResidualValueCents: 8_000_00,
      expectedOwnershipYears: 6,
    });
    const s = annualCostSummary('petrol', p);
    // brandstof 600 l × 2 = 1200, onderhoud 600, banden 120, verz. 720, belasting 480, afschr. 2000
    expect(s.perYearCents).toBe((1200 + 600 + 120 + 720 + 480 + 2000) * 100);
    expect(s.perMonthCents).toBe(Math.round(s.perYearCents / 12));
    expect(s.perKmCents).toBeCloseTo(s.perYearCents / 12000);
    expect(s.unknown).toEqual([]);
  });
  it('rente telt mee, aflossing niet (geen dubbeltelling met afschrijving)', () => {
    const p = profile({ financingInterestCentsPerMonth: 25_00 });
    const s = annualCostSummary('petrol', p);
    expect(s.lines.find((l) => l.key === 'financing_interest')!.perYearCents).toBe(300_00);
    expect(s.lines.some((l) => (l.label as string).toLowerCase().includes('aflossing'))).toBe(false);
  });
  it('meldt ontbrekende kostenposten', () => {
    const s = annualCostSummary('petrol', profile());
    expect(s.unknown).toContain('Verzekering');
    expect(s.unknown).toContain('Afschrijving');
  });
});

import { compareTrip, compareVehicles, differenceSentence } from '../src/features/comparison/compare';

describe('autovergelijking', () => {
  const now = new Date().toISOString();
  const veh = (id: string, name: string) => ({ id, plate: null, name, make: null, model: null, firstRegistrationDate: null, fuelType: 'petrol' as const, massKg: null, engineCc: null, powerKw: null, apkExpiryDate: null, cataloguePriceCents: null, officialConsumptionL100: null, officialConsumptionKwh100: null, createdAt: now, updatedAt: now });
  const A = { vehicle: veh('a', 'BMW 330i'), profile: profile({ consumptionL100: 8, fuelPricePerLiterCents: 200, annualKm: 1 }) };
  const B = { vehicle: veh('b', 'Volkswagen Polo'), profile: profile({ consumptionL100: 5, fuelPricePerLiterCents: 200, annualKm: 99999 }) };
  it('gebruikt voor beide auto’s dezelfde jaarkilometers', () => {
    const rows = compareVehicles(A, B, 10000);
    const energy = rows.find((r) => r.label === 'Brandstof/stroom per jaar')!;
    expect(energy.a).toBe(160000);
    expect(energy.b).toBe(100000);
  });
  it('vergelijkt een rit en formuleert het verschil', () => {
    const [a, b] = compareTrip([A, B], 100_000, false);
    expect(a.cents).toBe(1600);
    expect(b.cents).toBe(1000);
    expect(differenceSentence('Auto A', a.cents, 'Auto B', b.cents, 'aan brandstof voor deze rit')).toMatch(/Auto B kost naar verwachting €\s?6,00 minder aan brandstof voor deze rit\./);
  });
});
