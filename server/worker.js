// Cloudflare Worker: proxy tussen de RitPrijs-app en Google Maps Platform.
// STATUS: voorbeeldcode, nog niet getest met een echte API-sleutel.

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';

// Alleen de velden die de app gebruikt (bepaalt ook de prijscategorie bij Google).
const ROUTES_FIELDS = [
  'routes.distanceMeters',
  'routes.duration',
  'routes.description',
  'routes.polyline.encodedPolyline',
  'routes.legs.distanceMeters',
  'routes.legs.duration',
  'routes.travelAdvisory.tollInfo',
].join(',');
const PLACES_FIELDS = 'places.id,places.displayName,places.formattedAddress,places.location';

const LIMIT_PER_MINUTE = 30;
const hits = new Map();

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    if (rateLimited(ip)) return json({ error: 'rate_limited' }, 429);

    const path = new URL(request.url).pathname;
    let body;
    try {
      body = await request.text();
      JSON.parse(body);
    } catch {
      return json({ error: 'invalid_json' }, 400);
    }

    const target = path === '/routes' ? [ROUTES_URL, ROUTES_FIELDS] : path === '/places' ? [PLACES_URL, PLACES_FIELDS] : null;
    if (!target) return json({ error: 'not_found' }, 404);

    const res = await fetch(target[0], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': env.GOOGLE_MAPS_API_KEY, 'X-Goog-FieldMask': target[1] },
      body,
    });
    return new Response(res.body, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  },
};

function rateLimited(ip) {
  const minute = Math.floor(Date.now() / 60000);
  const key = `${ip}:${minute}`;
  const n = (hits.get(key) ?? 0) + 1;
  hits.set(key, n);
  if (hits.size > 10000) hits.clear();
  return n > LIMIT_PER_MINUTE;
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
