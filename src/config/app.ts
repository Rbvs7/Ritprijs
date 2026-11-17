/**
 * Centrale app-configuratie.
 * Naam, slogan, prijs en andere merkzaken pas je HIER aan — nergens anders.
 * (De naam op het telefoonscherm staat ook in app.json → "name".)
 */
export const APP_CONFIG = {
  name: 'RitPrijs',
  slogan: 'Navigeer slimmer. Weet wat je rit kost.',
  /** Tekst onder gedeelde kostenverdelingen. */
  shareFooter: 'Berekend met RitPrijs.',
  /** Doelprijs Pro (eenmalig), in centen. Wordt pas gebruikt zodra in-app-aankopen gebouwd zijn. */
  proPriceCents: 499,
  country: 'NL',
  currency: 'EUR',
  locale: 'nl-NL',
  /** Standaardwaarden voor nieuwe gebruikers (altijd gemarkeerd als "geschat"). */
  defaults: {
    annualKm: 13000,
    petrolPricePerLiterCents: 199,
    dieselPricePerLiterCents: 179,
    lpgPricePerLiterCents: 99,
    electricityHomeCentsPerKwh: 28,
    electricityPublicCentsPerKwh: 59,
    chargingLossPct: 10,
  },
} as const;

/**
 * Route- en zoekprovider.
 * - 'osm'    : OpenStreetMap (OSRM + Nominatim) openbare demo-servers. Echte routegegevens,
 *              maar uitsluitend geschikt voor ontwikkelen en testen (strenge gebruiksvoorwaarden).
 * - 'google' : Google Routes API via je eigen proxy-server (zie server/README.md). Voor productie.
 */
export const ROUTING_CONFIG = {
  provider: (process.env.EXPO_PUBLIC_ROUTING_PROVIDER ?? 'osm') as 'osm' | 'google',
  googleProxyUrl: process.env.EXPO_PUBLIC_ROUTES_PROXY_URL ?? '',
  osrmBaseUrl: 'https://router.project-osrm.org',
  nominatimBaseUrl: 'https://nominatim.openstreetmap.org',
  userAgent: 'RitPrijs/0.1 (development build)',
  requestTimeoutMs: 15000,
};

export const RDW_CONFIG = {
  vehiclesUrl: 'https://opendata.rdw.nl/resource/m9d7-ebf2.json',
  fuelUrl: 'https://opendata.rdw.nl/resource/8ys7-d773.json',
};
