/**
 * Integratietest tegen de ECHTE externe diensten (RDW, Nominatim, OSRM).
 * Draai met: npm run test:live   (vereist internet)
 */
import { describe, expect, it } from 'vitest';
import { calculateTripCost } from '../../src/features/costs/tripCost';
import { osmProvider } from '../../src/features/navigation/osmProvider';
import { lookupPlate } from '../../src/features/vehicles/rdw';
import { createVehicle } from '../../src/features/vehicles/factory';

describe('live: RDW', () => {
  it('haalt een bestaand kenteken op', async () => {
    const r = await lookupPlate('P-768-RK');
    expect(r).not.toBeNull();
    expect(r!.make).toBe('POLESTAR');
    expect(r!.fuelType).toBe('electric');
    expect(r!.consumptionKwh100).toBeGreaterThan(10);
    console.log('RDW:', JSON.stringify(r));
  }, 20000);
  it('geeft null voor een onbekend kenteken', async () => {
    expect(await lookupPlate('ZZ999Z')).toBeNull();
  }, 20000);
});

describe('live: zoeken + route + kosten', () => {
  it('Amsterdam → Utrecht', async () => {
    const [from] = await osmProvider.searchPlaces('Dam, Amsterdam');
    const [to] = await osmProvider.searchPlaces('Utrecht Centraal');
    expect(from && to).toBeTruthy();
    const routes = await osmProvider.computeRoutes({ origin: from.coords, destination: to.coords, waypoints: [], avoidTolls: false, avoidHighways: false, departureTime: null });
    expect(routes.length).toBeGreaterThan(0);
    const r = routes[0];
    expect(r.distanceMeters).toBeGreaterThan(35000);
    expect(r.distanceMeters).toBeLessThan(70000);
    expect(r.path.length).toBeGreaterThan(10);
    const { vehicle, profile } = createVehicle(null, { fuelType: 'petrol' });
    const cost = calculateTripCost({ distanceMeters: r.distanceMeters, isReturn: false, fuelType: vehicle.fuelType, profile: { ...profile, consumptionL100: 7.2 }, mode: 'direct', includeFixedShare: false, routeTollCents: r.tollCents, extras: [] });
    console.log(`${from.label} → ${to.label}: ${(r.distanceMeters / 1000).toFixed(1)} km, ${Math.round(r.durationSeconds / 60)} min, €${(cost.totalCents / 100).toFixed(2)} (${routes.length} routes)`);
    expect(cost.totalCents).toBeGreaterThan(0);
  }, 30000);
});
