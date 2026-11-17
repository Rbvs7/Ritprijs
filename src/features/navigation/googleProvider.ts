import { ROUTING_CONFIG } from '../../config/app';
import { fetchJson, ServiceError } from '../../services/http';
import type { Place, Route } from '../../types/models';
import { decodePolyline } from './polyline';
import type { RoutingProvider } from './types';

/**
 * Google Routes API + Places API via je EIGEN proxy (de API-sleutel staat nooit in de app).
 * Zie server/README.md. Status: geschreven volgens de Routes API v2-documentatie, nog NIET getest
 * zonder echte sleutel.
 */

interface GoogleRoutesResponse {
  routes?: {
    distanceMeters?: number;
    duration?: string; // "1234s"
    description?: string;
    polyline?: { encodedPolyline?: string };
    legs?: { distanceMeters?: number; duration?: string }[];
    travelAdvisory?: { tollInfo?: { estimatedPrice?: { currencyCode: string; units?: string; nanos?: number }[] } };
  }[];
}

interface ProxyPlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
}

function base(): string {
  if (!ROUTING_CONFIG.googleProxyUrl) throw new ServiceError('config', 'Google-proxy is nog niet ingesteld (EXPO_PUBLIC_ROUTES_PROXY_URL).');
  return ROUTING_CONFIG.googleProxyUrl.replace(/\/$/, '');
}

export const googleProvider: RoutingProvider = {
  capabilities: {
    avoidTolls: true,
    avoidHighways: true,
    tollPrices: true,
    trafficAwareDeparture: true,
    autocomplete: true,
    developmentOnly: false,
    name: 'Google Maps',
    attribution: 'Routes © Google',
  },

  async searchPlaces(query, near, signal) {
    const body = { textQuery: query, languageCode: 'nl', regionCode: 'NL', ...(near ? { locationBias: { circle: { center: near, radius: 50000 } } } : {}) };
    const data = await fetchJson<{ places?: ProxyPlace[] }>(`${base()}/places`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      signal,
    });
    return (data.places ?? [])
      .filter((p) => p.location)
      .map((p): Place => ({ id: p.id, label: p.displayName?.text ?? p.formattedAddress ?? '', address: p.formattedAddress ?? '', coords: p.location! }));
  },

  async computeRoutes(req, signal) {
    const wp = (p: { latitude: number; longitude: number }) => ({ location: { latLng: p } });
    const body = {
      origin: wp(req.origin),
      destination: wp(req.destination),
      intermediates: req.waypoints.map(wp),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: req.waypoints.length === 0,
      departureTime: req.departureTime ? req.departureTime.toISOString() : undefined,
      routeModifiers: { avoidTolls: req.avoidTolls, avoidHighways: req.avoidHighways },
      extraComputations: ['TOLLS'],
      languageCode: 'nl-NL',
      units: 'METRIC',
    };
    const data = await fetchJson<GoogleRoutesResponse>(`${base()}/routes`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      signal,
    });
    if (!data.routes?.length) throw new ServiceError('not_found', 'Er is geen route gevonden tussen deze punten.');
    return data.routes.map((r, i): Route => {
      const eur = r.travelAdvisory?.tollInfo?.estimatedPrice?.find((p) => p.currencyCode === 'EUR');
      return {
        id: `g-${i}`,
        provider: 'google',
        distanceMeters: r.distanceMeters ?? 0,
        durationSeconds: parseDuration(r.duration),
        path: r.polyline?.encodedPolyline ? decodePolyline(r.polyline.encodedPolyline) : [],
        legs: (r.legs ?? []).map((l) => ({ distanceMeters: l.distanceMeters ?? 0, durationSeconds: parseDuration(l.duration) })),
        // tollInfo aanwezig zonder prijs = tol op route maar prijs onbekend; afwezig = geen tol bekend.
        tollCents: eur ? Number(eur.units ?? 0) * 100 + Math.round((eur.nanos ?? 0) / 1e7) : r.travelAdvisory?.tollInfo ? null : 0,
        summary: r.description || (i === 0 ? 'Aanbevolen' : `Alternatief ${i}`),
      };
    });
  },
};

function parseDuration(d?: string): number {
  if (!d) return 0;
  const n = parseFloat(d.replace('s', ''));
  return Number.isFinite(n) ? n : 0;
}
