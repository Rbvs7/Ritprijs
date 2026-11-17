# Route-proxy voor productie (Google Routes API)

**Status:** voorbeeldcode, nog niet getest met een echte sleutel.

De Google API-sleutel mag nooit in de app zelf staan, want iedereen kan een app uitpakken. Daarom praat de app met deze kleine proxy, en de proxy praat met Google. De sleutel staat alleen op de server.

## Wat het doet

| Endpoint | Doorgestuurd naar |
| --- | --- |
| `POST /routes` | `routes.googleapis.com/directions/v2:computeRoutes` (afstand, duur, polyline, tol) |
| `POST /places` | `places.googleapis.com/v1/places:searchText` (adres zoeken) |

Verder:

- Alleen de velden die de app gebruikt worden opgevraagd (FieldMask). Dat houdt de kosten laag.
- Er is een eenvoudige limiet per IP-adres tegen misbruik.

## Installeren (Cloudflare Workers)

1. Maak een Cloudflare-account aan en installeer `wrangler`:

   ```bash
   npm i -g wrangler
   ```

2. Ga naar de map `server/` en log in:

   ```bash
   wrangler login
   ```

3. Zet de Google-sleutel als geheim:

   ```bash
   wrangler secret put GOOGLE_MAPS_API_KEY
   ```

4. Publiceer de proxy:

   ```bash
   wrangler deploy
   ```

   Je krijgt een URL, bijvoorbeeld `https://ritprijs-proxy.<naam>.workers.dev`.

5. Maak in de hoofdmap van de app een bestand `.env` met:

   ```
   EXPO_PUBLIC_ROUTING_PROVIDER=google
   EXPO_PUBLIC_ROUTES_PROXY_URL=https://ritprijs-proxy.<naam>.workers.dev
   ```

6. Beperk in de Google Cloud-console de sleutel tot alleen de **Routes API** en de **Places API (New)**, en stel een dagelijks quotum in.
