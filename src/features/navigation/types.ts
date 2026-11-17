import type { LatLng, Place, Route } from '../../types/models';

export interface RouteRequest {
  origin: LatLng;
  destination: LatLng;
  waypoints: LatLng[];
  avoidTolls: boolean;
  avoidHighways: boolean;
  /** null = nu vertrekken. */
  departureTime: Date | null;
}

export interface ProviderCapabilities {
  avoidTolls: boolean;
  avoidHighways: boolean;
  tollPrices: boolean;
  trafficAwareDeparture: boolean;
  autocomplete: boolean;
  /** Toon een melding dat dit een test-/ontwikkelprovider is. */
  developmentOnly: boolean;
  name: string;
  attribution: string;
}

export interface RoutingProvider {
  capabilities: ProviderCapabilities;
  searchPlaces(query: string, near?: LatLng | null, signal?: AbortSignal): Promise<Place[]>;
  computeRoutes(req: RouteRequest, signal?: AbortSignal): Promise<Route[]>;
}
