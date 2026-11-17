import { describe, expect, it } from 'vitest';
import { formatPlate, isValidDutchPlate, normalizePlate, sidecode } from '../src/features/vehicles/plate';
import { detectFuelType, mapRdw, prettyName } from '../src/features/vehicles/rdw';
import { decodePolyline } from '../src/features/navigation/polyline';

describe('kenteken', () => {
  it('normaliseert', () => {
    expect(normalizePlate(' gj-433-k ')).toBe('GJ433K');
  });
  it('herkent sidecodes en formatteert', () => {
    expect(sidecode('GJ433K')).toBe(9);
    expect(formatPlate('gj433k')).toBe('GJ-433-K');
    expect(formatPlate('P768RK')).toBe('P-768-RK');
    expect(formatPlate('12ABC3')).toBe('12-ABC-3');
    expect(formatPlate('AB1234')).toBe('AB-12-34');
  });
  it('weigert ongeldige kentekens', () => {
    expect(isValidDutchPlate('ABC')).toBe(false);
    expect(isValidDutchPlate('123456')).toBe(false);
    expect(isValidDutchPlate('ABCDEF')).toBe(false);
  });
});

describe('RDW-mapping', () => {
  // Echte RDW-respons (Polestar 2, opgehaald via opendata.rdw.nl)
  const main = {
    kenteken: 'P768RK',
    merk: 'POLESTAR',
    handelsbenaming: 'POLESTAR 2',
    voertuigsoort: 'Personenauto',
    datum_eerste_toelating: '20220528',
    vervaldatum_apk: '20280528',
    massa_ledig_voertuig: '1969',
    massa_rijklaar: '2069',
    catalogusprijs: '58900',
  };
  const fuel = [{ brandstof_volgnummer: '1', brandstof_omschrijving: 'Elektriciteit', elektrisch_verbruik_enkel_elektrisch_wltp: '182.00', actie_radius_enkel_elektrisch_wltp: '518', netto_max_vermogen_elektrisch: '170.00' }];
  it('zet RDW-velden om', () => {
    const r = mapRdw('P768RK', main, fuel);
    expect(r.make).toBe('POLESTAR');
    expect(r.model).toBe('2');
    expect(r.fuelType).toBe('electric');
    expect(r.consumptionKwh100).toBe(18.2);
    expect(r.consumptionL100).toBeNull();
    expect(r.firstRegistrationDate).toBe('2022-05-28');
    expect(r.apkExpiryDate).toBe('2028-05-28');
    expect(r.massKg).toBe(2069);
    expect(r.powerKw).toBe(170);
    expect(r.cataloguePriceCents).toBe(5_890_000);
    expect(r.engineCc).toBeNull(); // niet aanwezig → niet verzinnen
  });
  it('herkent brandstofsoorten', () => {
    expect(detectFuelType(['Benzine'], null)).toBe('petrol');
    expect(detectFuelType(['Diesel'], null)).toBe('diesel');
    expect(detectFuelType(['Benzine', 'Elektriciteit'], 'OVC-HEV')).toBe('plugin_hybrid');
    expect(detectFuelType(['Benzine', 'Elektriciteit'], 'NOVC-HEV')).toBe('hybrid');
    expect(detectFuelType([], null)).toBeNull();
  });
  it('maakt namen leesbaar', () => {
    expect(prettyName('VOLKSWAGEN')).toBe('Volkswagen');
    expect(prettyName('BMW')).toBe('BMW');
    expect(prettyName('MERCEDES-BENZ')).toBe('Mercedes-Benz');
  });
});

describe('polyline', () => {
  it('decodeert Google-voorbeeld', () => {
    const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(pts).toHaveLength(3);
    expect(pts[0].latitude).toBeCloseTo(38.5);
    expect(pts[0].longitude).toBeCloseTo(-120.2);
    expect(pts[2].longitude).toBeCloseTo(-126.453);
  });
});
