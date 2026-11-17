# RitPrijs: status

Laatst bijgewerkt: 17 november 2026, na fase 1 en het eerste deel van fase 2.

## Werkt en is getest

| Functie | Hoe getest |
| --- | --- |
| Onboarding (kenteken → km/jaar → verbruik → prijs → extra kosten, overslaan mogelijk) | browserdoorloop (webversie) |
| Kenteken herkennen en normaliseren (alle 14 NL-sidecodes) | unit tests |
| RDW-koppeling: merk, model, bouwjaar, brandstof, massa, vermogen, APK, catalogusprijs, WLTP-verbruik | unit tests + live test tegen opendata.rdw.nl |
| Herkomstlabel per waarde: RDW / zelf ingevuld / geschat | browserdoorloop |
| Adres zoeken (OpenStreetMap Nominatim) | live test + browserdoorloop |
| Echte route, afstand en reistijd + alternatieve routes (OSRM) | live test + browserdoorloop |
| Route op interactieve kaart (react-native-maps) | **alleen gebundeld, nog niet op een echt toestel bekeken** |
| Ritkosten benzine, diesel, LPG, elektrisch (laadverlies, thuis/openbaar), plug-in hybride | unit tests |
| Directe vs. totale toegerekende kosten (onderhoud, banden, afschrijving, optioneel vaste kosten) | unit tests |
| Retourrit, tol, parkeren, overige kosten, geen dubbeltelling | unit tests |
| Carpool: gelijk, passagiers betalen (bestuurder gratis), handmatig in % of bedragen | unit tests + browserdoorloop |
| Som van de aandelen klopt altijd op de cent | unit test (duizenden combinaties) |
| Deelbare tekst (WhatsApp, Berichten, e-mail via het deelmenu van de telefoon) | unit test (tekst); deelmenu zelf alleen op toestel |
| Navigeren via Google Maps / Apple Kaarten / Waze | **nog niet op toestel getest** |
| Ritten lokaal opslaan, filters (vandaag/week/maand/jaar/alles), statistieken, verwijderen | browserdoorloop |
| Mijn Auto: kostendashboard per dag/maand/jaar/km, kostenverdeling, ontbrekende posten | browserdoorloop |
| Werkelijke uitgaven registreren (los van de schattingen) | typecheck; nog niet doorgeklikt |
| Auto's vergelijken: kosten naast elkaar + "Welke auto is goedkoper voor mijn rit?" | unit tests; scherm alleen met één auto gezien |
| Favorieten (Thuis, Werk, Favoriet) en recente bestemmingen | typecheck; nog niet doorgeklikt |
| Donker en licht thema, automatisch volgens het systeem | browserdoorloop |
| Privacy: alle gegevens lokaal, alles wissen, recente plaatsen wissen | typecheck; nog niet doorgeklikt |

Uitgevoerde controles: TypeScript zonder fouten, lint zonder fouten, 41 unit tests geslaagd, 3 live API-tests geslaagd, de JavaScript-bundel bouwt voor Android en iOS, en een volledige browserdoorloop in donker en licht thema.

**Nog niet gedaan:** de app draaien op een echte iPhone of Android-telefoon. Kaart, GPS, deelmenu en het openen van navigatie-apps zijn dus nog niet op een toestel gecontroleerd.

## Nog niet gebouwd (volgende fasen)

- Volledige turn-by-turn-navigatie binnen de app. Voorlopig opent de app je navigatie-app.
- Live ritmodus (kosten tijdens het rijden).
- Ritten handmatig bewerken (verwijderen kan al).
- Verdeling per traject (iemand stapt halverwege in).
- Tankbeurten registreren met automatisch berekend werkelijk verbruik.
- Woon-werkcalculator.
- Onderhoudsherinneringen (lokale notificaties).
- Besparingsinzichten.
- Export naar CSV/PDF.
- Pro-versie met in-app-aankoop, en advertenties.
- Automatische brandstofprijzen. Prijzen worden nu handmatig ingevuld; de app werkt daar volledig mee.
- Automatische berekening van de wegenbelasting. Je vult nu je eigen bedrag in; er worden geen tarieven verzonnen.
- Buitenlandse kentekens. Een auto zonder kenteken invoeren kan al.

## Bekende beperkingen

- **De routeprovider is een testprovider.** De openbare OSRM- en Nominatim-servers geven echte afstanden en reistijden, maar:
  - ze zijn niet bedoeld voor productieverkeer;
  - er is geen live verkeer, dus de vertrektijd verschuift alleen de aankomsttijd;
  - ze geven geen tolprijzen (tol kun je handmatig invullen);
  - "Tolwegen/snelwegen vermijden" werkt niet en staat daarom grijs;
  - je moet op "Zoek" tikken; zoeken tijdens het typen werkt hier niet.

  Voor publicatie moet je overstappen op Google (zie hieronder).
- In de lijst met ritten heet het vertrekpunt "Huidige locatie" als je vanaf je GPS-positie vertrok (er gebeurt nog geen reverse geocoding).
- De webversie toont geen kaart. Dat is geen doelplatform.
- Android in productie (een eigen build, niet Expo Go) heeft een Google Maps SDK-sleutel nodig voor de kaart.

## Benodigde accounts en API-sleutels

| Wat | Waarvoor | Nodig vanaf |
| --- | --- | --- |
| Geen | RDW Open Data (gratis, zonder sleutel) | nu |
| Expo-account (gratis) | builds maken (EAS), TestFlight, Play-testing | testen buiten Expo Go |
| Google Cloud-project + Routes API + Places API (New) | productieroutes, tol, verkeer, zoeken tijdens typen | publicatie |
| Maps SDK for Android-sleutel | kaart in de Android-build | eerste eigen Android-build |
| Hosting voor de proxy (bijv. Cloudflare Workers, gratis tier) | Google-sleutel geheim houden | samen met Google |
| Apple Developer Program (€ 99 per jaar) | TestFlight en App Store | iOS-publicatie |
| Google Play Console (eenmalig $ 25) | Play Store | Android-publicatie |

## Geschatte externe kosten

Controleer actuele prijzen altijd in de Google Cloud-console. Prijzen en gratis tegoeden veranderen.

- Google Routes API rekent per aanvraag. Met tol- en verkeersberekening valt een aanvraag in een duurdere categorie dan een basisroute. Reken grofweg met enkele euro's tot ruim € 10 per 1.000 routeberekeningen, minus het maandelijkse gratis tegoed.
- **Voorbeeld:** 1.000 actieve gebruikers × 20 routes per maand = 20.000 aanvragen. Dat is grofweg € 100–200 per maand.
- Een eenmalige Pro-aankoop van € 4,99 levert na de commissie van Apple/Google (15–30%) ongeveer € 3,50–4,25 op. Een vaste gebruiker die jarenlang routes blijft berekenen, kost op den duur meer dan dat eenmalige bedrag.
- **Advies:** cache routes, stel een limiet per gebruiker in, en overweeg later een klein abonnement of advertenties in de gratis versie. Dit moeten we doorrekenen vóór de lancering.

## Volgende stappen (voorstel)

1. App testen op je eigen telefoon via Expo Go. Daarna los ik de bugs op die je vindt.
2. Ritten bewerken en werkelijke afstand invullen; tankbeurten registreren.
3. Woon-werkcalculator en favoriete routes met vaste kosten.
4. Overstappen op Google Routes via de proxy (`server/`).
5. Eerste eigen build met EAS, en TestFlight / interne Play-test.
6. In-app-navigatie (Google Navigation SDK) als aparte fase.
7. Pro, aankopen en advertenties; privacyverklaring en storeteksten.
