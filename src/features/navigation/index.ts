import { Linking, Platform } from 'react-native';
import { ROUTING_CONFIG } from '../../config/app';
import type { LatLng } from '../../types/models';
import { googleProvider } from './googleProvider';
import { osmProvider } from './osmProvider';
import type { RoutingProvider } from './types';

export * from './types';

export function getRoutingProvider(): RoutingProvider {
  return ROUTING_CONFIG.provider === 'google' ? googleProvider : osmProvider;
}

export type ExternalNavApp = 'google' | 'apple' | 'waze';

/** Opent de route in een geïnstalleerde navigatie-app. */
export async function openInNavigationApp(app: ExternalNavApp, origin: LatLng | null, destination: LatLng, waypoints: LatLng[] = []): Promise<void> {
  const ll = (p: LatLng) => `${p.latitude},${p.longitude}`;
  let url: string;
  if (app === 'apple') {
    url = `http://maps.apple.com/?daddr=${ll(destination)}&dirflg=d${origin ? `&saddr=${ll(origin)}` : ''}`;
  } else if (app === 'waze') {
    url = `https://waze.com/ul?ll=${ll(destination)}&navigate=yes`;
  } else {
    const params = new URLSearchParams({ api: '1', destination: ll(destination), travelmode: 'driving', dir_action: 'navigate' });
    if (origin) params.set('origin', ll(origin));
    if (waypoints.length) params.set('waypoints', waypoints.map(ll).join('|'));
    url = `https://www.google.com/maps/dir/?${params}`;
  }
  await Linking.openURL(url);
}

export function availableNavApps(): ExternalNavApp[] {
  return Platform.OS === 'ios' ? ['apple', 'google', 'waze'] : ['google', 'waze'];
}

export function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} u ${r} min` : `${h} u`;
}

export function formatDistance(meters: number): string {
  const km = meters / 1000;
  if (km < 1) return `${Math.round(meters)} m`;
  return `${km.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

export function formatClock(d: Date): string {
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}
