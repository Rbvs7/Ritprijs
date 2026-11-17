import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CostBreakdown } from '../../components/CostBreakdown';
import { PlaceSearch } from '../../components/PlaceSearch';
import RouteMap, { type RouteMapHandle } from '../../components/RouteMap';
import { Banner, Button, Chip, Divider, Field, IconButton, Row, Segmented, T, ToggleRow } from '../../components/ui';
import * as repo from '../../database/repositories';
import { formatEuro, parseEuroToCents, centsToInput } from '../../features/costs/money';
import { useTripCost } from '../../features/costs/useTripCost';
import { availableNavApps, formatClock, formatDistance, formatDuration, getRoutingProvider, openInNavigationApp, type ExternalNavApp } from '../../features/navigation';
import { errorMessage } from '../../services/http';
import { useApp } from '../../state/AppState';
import { usePlanner } from '../../state/Planner';
import { radius, spacing, useColors } from '../../theme';
import type { LatLng, Place, SavedPlace, Trip, TripExpense } from '../../types/models';
import { newId } from '../../utils/id';

type SearchMode = null | 'destination' | 'origin' | 'waypoint';
type Preference = 'fastest' | 'shortest';

const NAV_APP_LABEL: Record<ExternalNavApp, string> = { google: 'Google Maps', apple: 'Apple Kaarten', waze: 'Waze' };

export default function NavigationScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const provider = getRoutingProvider();
  const { activeVehicle, activeProfile, prefs, bumpTrips } = useApp();
  const { plan, setPlan, resetPlan, selectedRoute } = usePlanner();
  const cost = useTripCost(plan, selectedRoute, activeVehicle, activeProfile);

  const mapRef = useRef<RouteMapHandle>(null);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [saved, setSaved] = useState<SavedPlace[]>([]);
  const [searchMode, setSearchMode] = useState<SearchMode>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [preference, setPreference] = useState<Preference>('fastest');
  const [departOffsetMin, setDepartOffsetMin] = useState(0);
  const [savedTripId, setSavedTripId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ---------- Locatie ----------
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationDenied(true);
          return;
        }
        const last = await Location.getLastKnownPositionAsync();
        if (last) {
          setLocation(last.coords);
          mapRef.current?.centerOn(last.coords);
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(pos.coords);
        if (!last) mapRef.current?.centerOn(pos.coords);
      } catch {
        setLocationDenied(true);
      }
    })();
  }, []);

  const loadSaved = useCallback(() => {
    repo.listPlaces().then(setSaved).catch(() => {});
  }, []);
  useFocusEffect(loadSaved);

  useEffect(() => {
    setPlan({ costMode: prefs.defaultCostMode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.defaultCostMode]);

  // ---------- Route berekenen ----------
  const calculate = useCallback(
    async (override?: Partial<typeof plan>) => {
      const p = { ...plan, ...override };
      if (!p.destination) return;
      const origin = p.origin?.coords ?? location;
      if (!origin) {
        setError(locationDenied ? 'Locatie is niet beschikbaar. Kies een vertrekpunt.' : 'Je locatie wordt nog bepaald. Probeer het zo opnieuw of kies een vertrekpunt.');
        return;
      }
      abortRef.current?.abort();
      const ctl = new AbortController();
      abortRef.current = ctl;
      setLoading(true);
      setError(null);
      setSavedTripId(null);
      try {
        const routes = await provider.computeRoutes(
          { origin, destination: p.destination.coords, waypoints: p.waypoints.map((w) => w.coords), avoidTolls: p.avoidTolls, avoidHighways: p.avoidHighways, departureTime: p.departAt },
          ctl.signal,
        );
        if (ctl.signal.aborted) return;
        const best = pickRoute(routes, preference);
        setPlan({ ...override, routes, selectedRouteId: best?.id ?? null, resolvedOriginLabel: p.origin?.label ?? 'Huidige locatie' });
        const pts = routes.flatMap((r) => r.path);
        setTimeout(() => mapRef.current?.fitTo(pts.length ? pts : [origin, p.destination!.coords], 420), 50);
      } catch (e) {
        if (!ctl.signal.aborted) setError(errorMessage(e));
      } finally {
        if (!ctl.signal.aborted) setLoading(false);
      }
    },
    [plan, location, locationDenied, provider, preference, setPlan],
  );

  async function pickPlace(place: Place) {
    const mode = searchMode;
    setSearchMode(null);
    if (mode === 'destination') {
      if (prefs.saveRecentPlaces && !saved.some((s) => s.id === place.id && s.kind !== 'recent')) {
        await repo.savePlace({ ...place, id: 'r_' + place.id.replace(/^r_/, ''), kind: 'recent', lastUsedAt: new Date().toISOString() }).catch(() => {});
        loadSaved();
      }
      setPlan({ destination: place });
      calculate({ destination: place });
    } else if (mode === 'origin') {
      setPlan({ origin: place });
      if (plan.destination) calculate({ origin: place });
    } else if (mode === 'waypoint') {
      const waypoints = [...plan.waypoints, place];
      setPlan({ waypoints });
      if (plan.destination) calculate({ waypoints });
    }
  }

  function chooseNavApp() {
    if (!plan.destination) return;
    const origin = plan.origin?.coords ?? null;
    const buttons = availableNavApps().map((app) => ({
      text: NAV_APP_LABEL[app],
      onPress: () => openInNavigationApp(app, origin, plan.destination!.coords, plan.waypoints.map((w) => w.coords)).catch(() => Alert.alert('Kon de app niet openen', `Is ${NAV_APP_LABEL[app]} geïnstalleerd?`)),
    }));
    Alert.alert('Navigeer met', 'De route wordt geopend in je navigatie-app. Volledige navigatie binnen RitPrijs volgt in een latere versie.', [...buttons, { text: 'Annuleren', style: 'cancel' }]);
  }

  async function saveTrip() {
    if (!selectedRoute || !cost || !plan.destination) return;
    const trip: Trip = {
      id: newId('t_'),
      date: new Date().toISOString(),
      originLabel: plan.resolvedOriginLabel,
      destinationLabel: plan.destination.label,
      distanceMeters: selectedRoute.distanceMeters * (plan.isReturn ? 2 : 1),
      durationSeconds: selectedRoute.durationSeconds * (plan.isReturn ? 2 : 1),
      actualDistanceMeters: null,
      isReturn: plan.isReturn,
      vehicleId: activeVehicle?.id ?? null,
      vehicleName: activeVehicle?.name ?? null,
      costMode: plan.costMode,
      energyCents: cost.lines.find((l) => l.key === 'energy')?.cents ?? 0,
      extraCents: cost.lines.filter((l) => ['toll', 'parking', 'other'].includes(l.key)).reduce((s, l) => s + (l.cents ?? 0), 0),
      totalCents: cost.totalCents,
      carpoolCount: 1,
      split: null,
      notes: null,
    };
    try {
      await repo.saveTrip(trip);
      setSavedTripId(trip.id);
      bumpTrips();
    } catch {
      Alert.alert('Opslaan mislukt', 'De rit kon niet lokaal worden opgeslagen.');
    }
  }

  function saveDestinationAs() {
    const d = plan.destination;
    if (!d) return;
    const save = async (kind: SavedPlace['kind'], label?: string) => {
      await repo.savePlace({ ...d, id: kind === 'favorite' ? 'f_' + d.id : kind, label: label ?? d.label, kind, lastUsedAt: new Date().toISOString() });
      loadSaved();
    };
    Alert.alert('Bestemming bewaren als', d.label, [
      { text: 'Thuis', onPress: () => save('home', 'Thuis') },
      { text: 'Werk', onPress: () => save('work', 'Werk') },
      { text: 'Favoriet', onPress: () => save('favorite') },
      { text: 'Annuleren', style: 'cancel' },
    ]);
  }

  const home = saved.find((s) => s.kind === 'home');
  const work = saved.find((s) => s.kind === 'work');
  const quick = [home, work, ...saved.filter((s) => s.kind === 'favorite'), ...saved.filter((s) => s.kind === 'recent')].filter(Boolean).slice(0, 8) as SavedPlace[];
  const hasRoute = plan.routes.length > 0 && !!plan.destination;
  const departure = plan.departAt ?? new Date();
  const onewaySeconds = selectedRoute?.durationSeconds ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <RouteMap
        ref={mapRef}
        routes={plan.routes}
        selectedRouteId={selectedRoute?.id ?? null}
        onSelectRoute={(id) => setPlan({ selectedRouteId: id })}
        origin={plan.origin?.coords ?? null}
        destination={plan.destination?.coords ?? null}
        waypoints={plan.waypoints.map((w) => w.coords)}
        showUser={!locationDenied}
      />

      {/* Zoekbalk bovenaan */}
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">
        <View style={{ margin: spacing.md, gap: spacing.sm }} pointerEvents="box-none">
          <View style={[styles.searchCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            {hasRoute && (
              <>
                <Pressable style={styles.searchRow} onPress={() => setSearchMode('origin')} accessibilityRole="button" accessibilityLabel="Vertrekpunt wijzigen">
                  <Ionicons name="radio-button-on" size={18} color={c.info} />
                  <T v="body" color="muted" numberOfLines={1} style={{ flex: 1 }}>
                    {plan.origin?.label ?? 'Huidige locatie'}
                  </T>
                </Pressable>
                {plan.waypoints.map((w, i) => (
                  <View key={i} style={styles.searchRow}>
                    <Ionicons name="ellipse" size={12} color={c.warning} style={{ marginHorizontal: 3 }} />
                    <T numberOfLines={1} style={{ flex: 1 }}>
                      {w.label}
                    </T>
                    <Pressable
                      accessibilityLabel="Tussenstop verwijderen"
                      hitSlop={10}
                      onPress={() => {
                        const waypoints = plan.waypoints.filter((_, j) => j !== i);
                        setPlan({ waypoints });
                        calculate({ waypoints });
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color={c.textSubtle} />
                    </Pressable>
                  </View>
                ))}
                <Divider />
              </>
            )}
            <Pressable style={styles.searchRow} onPress={() => setSearchMode('destination')} accessibilityRole="search" accessibilityLabel="Waar wil je naartoe?">
              <Ionicons name={hasRoute ? 'location' : 'search'} size={20} color={c.accent} />
              <T v={plan.destination ? 'bodyStrong' : 'body'} color={plan.destination ? undefined : 'subtle'} numberOfLines={1} style={{ flex: 1 }}>
                {plan.destination?.label ?? 'Waar wil je naartoe?'}
              </T>
              {plan.destination && (
                <Pressable
                  accessibilityLabel="Route wissen"
                  hitSlop={10}
                  onPress={() => {
                    abortRef.current?.abort();
                    setLoading(false);
                    setError(null);
                    resetPlan();
                  }}
                >
                  <Ionicons name="close" size={22} color={c.textSubtle} />
                </Pressable>
              )}
            </Pressable>
          </View>
          {!hasRoute && quick.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }} keyboardShouldPersistTaps="handled">
              {quick.map((p) => (
                <Chip
                  key={p.id}
                  label={p.label}
                  icon={p.kind === 'home' ? 'home' : p.kind === 'work' ? 'briefcase' : p.kind === 'favorite' ? 'star' : 'time'}
                  onPress={() => {
                    setPlan({ destination: p });
                    calculate({ destination: p });
                  }}
                  onLongPress={() =>
                    Alert.alert('Verwijderen?', p.label, [
                      { text: 'Annuleren', style: 'cancel' },
                      { text: 'Verwijderen', style: 'destructive', onPress: () => repo.deletePlace(p.id).then(loadSaved) },
                    ])
                  }
                />
              ))}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>

      {/* Locatieknop */}
      {location && (
        <View style={{ position: 'absolute', right: spacing.md, bottom: hasRoute ? '62%' : 150 }}>
          <IconButton icon="locate" label="Naar mijn locatie" onPress={() => mapRef.current?.centerOn(location)} size={48} color={c.accent} />
        </View>
      )}

      {/* Onderpaneel */}
      <View style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.border, paddingBottom: spacing.md, maxHeight: hasRoute ? '60%' : undefined }]}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
          {provider.capabilities.developmentOnly && !hasRoute && (
            <T v="small" color="subtle">
              Testmodus: routes via OpenStreetMap (echte afstanden, geen live verkeer).
            </T>
          )}
          {!activeVehicle && <Banner kind="warning" action={{ label: 'Auto toevoegen', onPress: () => router.push({ pathname: '/vehicle-edit', params: { id: 'new' } }) }}>Voeg je auto toe om ritkosten te berekenen.</Banner>}
          {locationDenied && !plan.origin && <Banner kind="info">Geen toegang tot je locatie. Kies zelf een vertrekpunt na het invoeren van de bestemming.</Banner>}
          {error && <Banner kind="danger" action={plan.destination ? { label: 'Opnieuw proberen', onPress: () => calculate() } : undefined}>{error}</Banner>}
          {loading && <T color="muted">Route berekenen…</T>}

          {!hasRoute && !loading && (
            <Row style={{ justifyContent: 'space-between' }}>
              <Pressable onPress={() => router.navigate('/auto')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }} accessibilityRole="button" accessibilityLabel="Geselecteerde auto">
                <Ionicons name="car-sport" size={22} color={c.accent} />
                <T v="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                  {activeVehicle?.name ?? 'Geen auto'}
                </T>
              </Pressable>
              <Button small title="Route plannen" icon="navigate" onPress={() => setSearchMode('destination')} />
            </Row>
          )}

          {hasRoute && selectedRoute && (
            <>
              {plan.routes.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                  {plan.routes.map((r) => (
                    <Chip key={r.id} active={r.id === selectedRoute.id} label={`${formatDuration(r.durationSeconds)} · ${formatDistance(r.distanceMeters)}`} onPress={() => setPlan({ selectedRouteId: r.id })} />
                  ))}
                </ScrollView>
              )}

              {/* Kosten prominent */}
              <View style={{ gap: 2 }}>
                <T v="tiny" color="subtle" style={{ textTransform: 'uppercase' }}>
                  {plan.costMode === 'direct' ? 'Geschatte ritkosten' : 'Totale toegerekende kosten'}
                  {plan.isReturn ? ' · retour' : ''}
                </T>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <T v="hero" color="accent">
                    {cost && cost.missing.length === 0 ? formatEuro(cost.totalCents) : '€ –'}
                  </T>
                  {cost?.perKmCents != null && cost.missing.length === 0 && (
                    <T v="small" color="muted" style={{ marginBottom: 8 }}>
                      {formatEuro(Math.round(cost.perKmCents))} / km
                    </T>
                  )}
                </Row>
              </View>

              <Row style={{ justifyContent: 'space-between' }}>
                <Stat label="Afstand" value={formatDistance(selectedRoute.distanceMeters * (plan.isReturn ? 2 : 1))} />
                <Stat label="Reistijd" value={formatDuration(onewaySeconds)} />
                <Stat label="Aankomst" value={formatClock(new Date(departure.getTime() + onewaySeconds * 1000))} />
              </Row>

              <Segmented
                value={plan.costMode}
                onChange={(k) => setPlan({ costMode: k })}
                options={[
                  { key: 'direct', label: 'Directe kosten' },
                  { key: 'total', label: 'Totale kosten' },
                ]}
              />
              <T v="small" color="subtle">
                {plan.costMode === 'direct'
                  ? 'Brandstof/stroom plus tol, parkeren en andere kosten van deze rit.'
                  : 'Inclusief onderhoud, banden en afschrijving per kilometer — wat de rit je auto economisch kost.'}
              </T>

              <Button title="Splits deze rit" icon="people" onPress={() => router.push('/split')} disabled={!cost || cost.missing.length > 0} />
              <Row>
                <Button title="Navigeer" icon="navigate" kind="secondary" style={{ flex: 1 }} onPress={chooseNavApp} />
                <Button title={savedTripId ? 'Opgeslagen' : 'Rit opslaan'} icon={savedTripId ? 'checkmark' : 'bookmark'} kind="secondary" style={{ flex: 1 }} onPress={saveTrip} disabled={!!savedTripId || !cost} />
              </Row>

              <Pressable onPress={() => setShowOptions((s) => !s)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm }} accessibilityRole="button">
                <T v="bodyStrong">Kosten & route-opties</T>
                <Ionicons name={showOptions ? 'chevron-up' : 'chevron-down'} size={20} color={c.textMuted} />
              </Pressable>

              {showOptions && (
                <View style={{ gap: spacing.md }}>
                  {cost && <CostBreakdown result={cost} />}
                  <Divider />
                  <ToggleRow label="Retourrit" hint="Heen en terug via dezelfde route" value={plan.isReturn} onChange={(b) => setPlan({ isReturn: b })} />
                  {plan.costMode === 'total' && (
                    <ToggleRow label="Aandeel vaste kosten meerekenen" hint="Verzekering, belasting e.d. verdeeld per km" value={plan.includeFixedShare} onChange={(b) => setPlan({ includeFixedShare: b })} />
                  )}
                  <ExtrasEditor key={plan.destination?.id} extras={plan.extras} onChange={(extras) => setPlan({ extras })} tollKnown={selectedRoute.tollCents != null} />
                  <Divider />
                  <T v="small" color="muted">
                    Routevoorkeur
                  </T>
                  <Segmented
                    value={preference}
                    onChange={(k) => {
                      setPreference(k);
                      const best = pickRoute(plan.routes, k);
                      if (best) setPlan({ selectedRouteId: best.id });
                    }}
                    options={[
                      { key: 'fastest', label: 'Snelste' },
                      { key: 'shortest', label: 'Kortste' },
                    ]}
                  />
                  <T v="small" color="muted">
                    Vertrektijd
                  </T>
                  <Row style={{ flexWrap: 'wrap' }} gap={spacing.sm}>
                    {[0, 30, 60, 120].map((min) => {
                      const active = (plan.departAt ? departOffsetMin : 0) === min;
                      return (
                        <Chip
                          key={min}
                          label={min === 0 ? 'Nu' : min < 60 ? `Over ${min} min` : `Over ${min / 60} uur`}
                          active={active}
                          onPress={() => {
                            const departAt = min === 0 ? null : new Date(Date.now() + min * 60000);
                            setDepartOffsetMin(min);
                            setPlan({ departAt });
                            if (provider.capabilities.trafficAwareDeparture) calculate({ departAt });
                          }}
                        />
                      );
                    })}
                  </Row>
                  {!provider.capabilities.trafficAwareDeparture && (
                    <T v="small" color="subtle">
                      De testprovider houdt geen rekening met verkeer; de vertrektijd verschuift alleen de aankomsttijd.
                    </T>
                  )}
                  <ToggleRow
                    label="Tolwegen vermijden"
                    value={plan.avoidTolls}
                    disabled={!provider.capabilities.avoidTolls}
                    hint={provider.capabilities.avoidTolls ? undefined : 'Niet beschikbaar bij de testprovider'}
                    onChange={(b) => {
                      setPlan({ avoidTolls: b });
                      calculate({ avoidTolls: b });
                    }}
                  />
                  <ToggleRow
                    label="Snelwegen vermijden"
                    value={plan.avoidHighways}
                    disabled={!provider.capabilities.avoidHighways}
                    hint={provider.capabilities.avoidHighways ? undefined : 'Niet beschikbaar bij de testprovider'}
                    onChange={(b) => {
                      setPlan({ avoidHighways: b });
                      calculate({ avoidHighways: b });
                    }}
                  />
                  <Row>
                    <Button small kind="secondary" icon="add" title="Tussenstop" style={{ flex: 1 }} onPress={() => setSearchMode('waypoint')} disabled={plan.waypoints.length >= 3} />
                    <Button small kind="secondary" icon="star" title="Bewaar bestemming" style={{ flex: 1 }} onPress={saveDestinationAs} />
                  </Row>
                  {selectedRoute.tollCents == null && (
                    <T v="small" color="subtle">
                      Tolkosten zijn bij deze provider niet bekend. Vul tol zelf in als je route tol bevat.
                    </T>
                  )}
                  <T v="small" color="subtle">
                    {provider.capabilities.attribution}
                  </T>
                </View>
              )}
            </>
          )}
          <View style={{ height: insets.bottom > 0 ? 0 : spacing.sm }} />
        </ScrollView>
      </View>

      <Modal visible={searchMode !== null} animationType="slide" onRequestClose={() => setSearchMode(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'bottom']}>
          {searchMode && (
            <PlaceSearch
              title={searchMode === 'destination' ? 'Waar wil je naartoe?' : searchMode === 'origin' ? 'Vertrekpunt' : 'Tussenstop toevoegen'}
              near={location}
              saved={saved}
              allowCurrentLocation={searchMode === 'origin'}
              onPickCurrentLocation={() => {
                setSearchMode(null);
                setPlan({ origin: null });
                calculate({ origin: null });
              }}
              onPick={pickPlace}
              onCancel={() => setSearchMode(null)}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function pickRoute<T extends { distanceMeters: number; durationSeconds: number }>(routes: T[], pref: Preference): T | undefined {
  if (!routes.length) return undefined;
  return [...routes].sort((a, b) => (pref === 'fastest' ? a.durationSeconds - b.durationSeconds : a.distanceMeters - b.distanceMeters))[0];
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <T v="tiny" color="subtle" style={{ textTransform: 'uppercase' }}>
        {label}
      </T>
      <T v="h3">{value}</T>
    </View>
  );
}

function ExtrasEditor({ extras, onChange, tollKnown }: { extras: TripExpense[]; onChange: (e: TripExpense[]) => void; tollKnown: boolean }) {
  const get = (k: TripExpense['kind']) => extras.find((x) => x.kind === k)?.amountCents ?? null;
  const [texts, setTexts] = useState<Record<string, string>>({ parking: centsToInput(get('parking')), toll: centsToInput(get('toll')), other: centsToInput(get('other')) });
  const set = (k: TripExpense['kind'], t: string) => {
    setTexts((cur) => ({ ...cur, [k]: t }));
    const cents = parseEuroToCents(t);
    const rest = extras.filter((x) => x.kind !== k);
    onChange(cents && cents > 0 ? [...rest, { kind: k, amountCents: cents }] : rest);
  };
  return (
    <View style={{ gap: spacing.md }}>
      <Row>
        <Field style={{ flex: 1 }} label="Parkeren" suffix="€" keyboardType="decimal-pad" placeholder="0,00" value={texts.parking} onChangeText={(t) => set('parking', t)} />
        <Field style={{ flex: 1 }} label={tollKnown ? 'Tol (handmatig)' : 'Tol'} suffix="€" keyboardType="decimal-pad" placeholder="0,00" value={texts.toll} onChangeText={(t) => set('toll', t)} />
      </Row>
      <Field label="Overige kosten" suffix="€" keyboardType="decimal-pad" placeholder="0,00" value={texts.other} onChangeText={(t) => set('other', t)} hint="Parkeren telt één keer, ook bij retour." />
    </View>
  );
}

const styles = StyleSheet.create({
  searchCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
});
