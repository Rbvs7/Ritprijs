import { ROUTING_CONFIG } from '../../config/app';
import { fetchJson, ServiceError } from '../../services/http';
import type { Place, Route } from '../../types/models';
import type { RoutingProvider } from './types';

/**
 * OpenStreetMap-provider (OSRM + Nominatim, openbare demo-servers).
 * Levert ECHTE routeafstanden en reistijden, maar:
 *  - de openbare servers zijn alleen bedoeld voor ontwikkelen/testen (geen productieverkeer);
 *  - geen verkeersinformatie, geen tolprijzen, geen "vermijd tol/snelweg";
 *  - Nominatim staat geen zoeken-tijdens-typen toe → zoeken gebeurt pas na "Zoek".
 */

interface OsrmResponse {
  code: string;
  message?: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
    legs: { distance: number; duration: number; summary?: string }[];
  }[];
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: Record<string, string>;
}

let lastNominatimCall = 0;

export const osmProvider: RoutingProvider = {
  capabilities: {
    avoidTolls: false,
    avoidHighways: false,
    tollPrices: false,
    trafficAwareDeparture: false,
    autocomplete: false,
    developmentOnly: true,
    name: 'OpenStreetMap (testprovider)',
    attribution: '© OpenStreetMap-bijdragers · Routes: OSRM',
  },

  async searchPlaces(query, near, signal) {
    const q = query.trim();
    if (q.length < 2) return [];
    // Nominatim-beleid: max. 1 verzoek per seconde.
    const wait = 1100 - (Date.now() - lastNominatimCall);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastNominatimCall = Date.now();
    const params = new URLSearchParams({
      q,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '6',
      countrycodes: 'nl,be,de',
      'accept-language': 'nl',
    });
    if (near) {
      const d = 1.5;
      params.set('viewbox', `${near.longitude - d},${near.latitude + d},${near.longitude + d},${near.latitude - d}`);
    }
    const rows = await fetchJson<NominatimResult[]>(`${ROUTING_CONFIG.nominatimBaseUrl}/search?${params}`, {
      signal,
      headers: { 'User-Agent': ROUTING_CONFIG.userAgent },
      timeoutMs: ROUTING_CONFIG.requestTimeoutMs,
    });
    return rows.map(toPlace);
  },

  async computeRoutes(req, signal) {
    const pts = [req.origin, ...req.waypoints, req.destination].map((p) => `${p.longitude.toFixed(6)},${p.latitude.toFixed(6)}`).join(';');
    const alternatives = req.waypoints.length === 0 ? '&alternatives=2' : '';
    const url = `${ROUTING_CONFIG.osrmBaseUrl}/route/v1/driving/${pts}?overview=full&geometries=geojson${alternatives}`;
    const data = await fetchJson<OsrmResponse>(url, { signal, timeoutMs: ROUTING_CONFIG.requestTimeoutMs });
    if (data.code !== 'Ok' || !data.routes?.length) {
      if (data.code === 'NoRoute') throw new ServiceError('not_found', 'Er is geen route gevonden tussen deze punten.');
      throw new ServiceError('http', 'Route kon niet worden berekend. Probeer het opnieuw.');
    }
    return data.routes.map(
      (r, i): Route => ({
        id: `osm-${i}`,
        provider: 'osm',
        distanceMeters: r.distance,
        durationSeconds: r.duration,
        path: r.geometry.coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon })),
        legs: r.legs.map((l) => ({ distanceMeters: l.distance, durationSeconds: l.duration })),
        tollCents: null,
        summary: i === 0 ? 'Aanbevolen' : `Alternatief ${i}`,
      }),
    );
  },
};

function toPlace(r: NominatimResult): Place {
  const a = r.address ?? {};
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? '';
  const street = a.road ? `${a.road}${a.house_number ? ' ' + a.house_number : ''}` : '';
  const label = r.name || street || city || r.display_name.split(',')[0];
  const parts = [street && street !== label ? street : '', city && city !== label ? city : ''].filter(Boolean);
  return {
    id: `osm-${r.place_id}`,
    label,
    address: parts.length ? parts.join(', ') : r.display_name.split(',').slice(1, 3).join(',').trim(),
    coords: { latitude: Number(r.lat), longitude: Number(r.lon) },
  };
}
