# RitPrijs

> Navigeer slimmer. Weet wat je rit kost.

Mobiele app (iOS + Android) die je route plant, laat zien wat de rit met jouw auto kost, en de kosten eerlijk verdeelt over je meerijders.

Gebouwd met **Expo SDK 58** (React Native 0.88), **TypeScript**, **Expo Router**, **expo-sqlite** en **react-native-maps**.

## De app op je eigen telefoon openen (Expo Go)

Je hebt één keer nodig:

1. **Node.js** (LTS-versie) op je computer — download via [nodejs.org](https://nodejs.org).
2. De app **Expo Go** op je telefoon (App Store / Google Play).
3. Deze projectmap op je computer (via GitHub: `git clone …` of "Download ZIP").

Daarna, in een terminal in de projectmap:

```bash
npm install
```

```bash
npx expo start
```

Er verschijnt een QR-code.

- **iPhone:** scan de QR-code met de gewone Camera-app → tik op de melding → opent in Expo Go.
- **Android:** open Expo Go → "Scan QR code".

Telefoon en computer moeten op hetzelfde wifi-netwerk zitten. Lukt dat niet (bijvoorbeeld op kantoor), gebruik dan:

```bash
npx expo start --tunnel
```

## Naam, slogan, kleuren aanpassen

| Wat | Waar |
| --- | --- |
| Naam en slogan in de app | `src/config/app.ts` |
| Naam onder het app-icoon | `app.json` → `"name"` |
| Kleuren (donker en licht) | `src/theme/index.ts` |
| App-icoon en splashscreen | `assets/` |
| Pro-prijs | `src/config/app.ts` → `proPriceCents` |

## Projectstructuur

```
src/
  app/                 schermen (Expo Router: ieder bestand = een scherm)
    (tabs)/            de 5 hoofdtabbladen
    onboarding.tsx     eerste gebruik
    split.tsx          Splits deze rit
    vehicle-edit.tsx   auto toevoegen / bewerken
    expense.tsx        uitgave registreren
  components/          herbruikbare UI
  config/app.ts        naam, slogan, providers
  database/            SQLite (lokale opslag + migraties)
  features/
    costs/             ALLE kostenberekeningen (los van de UI, herbruikbaar in een webapp)
    carpool/           kostenverdeling
    navigation/        route- en zoekproviders, externe navigatie
    vehicles/          kenteken + RDW
    comparison/        autovergelijking
    history/           ritstatistieken
  state/               app-status (auto's, voorkeuren, huidige route)
  theme/               kleuren en typografie
  types/models.ts      alle datamodellen
tests/                 automatische tests (Vitest)
server/                voorbeeld-proxy voor Google Routes API (voor productie)
docs/STATUS.md         wat af is, wat niet, API-sleutels, kosten, volgende stappen
```

## Commando's

```bash
npm test
```

Draait alle rekentests (41 tests, zonder internet).

```bash
npm run test:live
```

Test de echte RDW-, zoek- en routekoppelingen (internet nodig).

```bash
npm run typecheck
```

```bash
npm run lint
```

## Geld

Alle bedragen worden intern als **hele centen** opgeslagen. Elke kostenpost wordt één keer afgerond (half-up). Bij een carpoolverdeling is de som van de aandelen altijd exact gelijk aan het totaal.
