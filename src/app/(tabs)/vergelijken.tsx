import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Banner, Button, Card, Chip, Divider, EmptyState, Field, Row, Screen, SectionTitle, T } from '../../components/ui';
import { compareTrip, compareVehicles, differenceSentence } from '../../features/comparison/compare';
import { formatEuro, parseDecimal } from '../../features/costs/money';
import { formatDistance } from '../../features/navigation';
import { useApp } from '../../state/AppState';
import { usePlanner } from '../../state/Planner';
import { spacing, useColors } from '../../theme';

export default function CompareScreen() {
  const c = useColors();
  const { vehicles, profiles, activeVehicle } = useApp();
  const { plan, selectedRoute } = usePlanner();
  const [aId, setAId] = useState<string | null>(activeVehicle?.id ?? null);
  const [bId, setBId] = useState<string | null>(vehicles.find((v) => v.id !== activeVehicle?.id)?.id ?? null);
  const [kmText, setKmText] = useState(String(activeVehicle ? profiles[activeVehicle.id]?.annualKm ?? 15000 : 15000));

  const addVehicle = () => router.push({ pathname: '/vehicle-edit', params: { id: 'new' } });

  if (vehicles.length < 2) {
    return (
      <Screen>
        <T v="h1">Vergelijken</T>
        <EmptyState
          icon="git-compare"
          title="Vergelijk twee auto's"
          text="Voeg een tweede auto toe — bijvoorbeeld via het kenteken van een auto die je overweegt — en zie welke goedkoper is per rit, per maand en per jaar."
          action={{ label: 'Auto toevoegen', onPress: addVehicle }}
        />
      </Screen>
    );
  }

  const A = vehicles.find((v) => v.id === aId) ?? vehicles[0];
  const B = vehicles.find((v) => v.id === bId && v.id !== A.id) ?? vehicles.find((v) => v.id !== A.id)!;
  const annualKm = Math.max(0, Math.round(parseDecimal(kmText) ?? 0));
  const rows = compareVehicles({ vehicle: A, profile: profiles[A.id] }, { vehicle: B, profile: profiles[B.id] }, annualKm);
  const total = rows.find((r) => r.label === 'Totaal per jaar')!;
  const tripCmp = selectedRoute ? compareTrip([{ vehicle: A, profile: profiles[A.id] }, { vehicle: B, profile: profiles[B.id] }], selectedRoute.distanceMeters, plan.isReturn) : null;

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h1">Vergelijken</T>
        <Button small kind="secondary" icon="add" title="Auto" onPress={addVehicle} />
      </Row>

      <Card>
        <T v="small" color="muted">
          Auto A
        </T>
        <Row style={{ flexWrap: 'wrap' }} gap={spacing.sm}>
          {vehicles.map((v) => (
            <Chip key={v.id} label={v.name} active={v.id === A.id} onPress={() => setAId(v.id)} />
          ))}
        </Row>
        <T v="small" color="muted">
          Auto B
        </T>
        <Row style={{ flexWrap: 'wrap' }} gap={spacing.sm}>
          {vehicles
            .filter((v) => v.id !== A.id)
            .map((v) => (
              <Chip key={v.id} label={v.name} active={v.id === B.id} onPress={() => setBId(v.id)} />
            ))}
        </Row>
        <Field label="Kilometers per jaar (voor beide auto's)" suffix="km" keyboardType="number-pad" value={kmText} onChangeText={setKmText} />
      </Card>

      {tripCmp && plan.destination && (
        <>
          <SectionTitle>Welke auto is goedkoper voor mijn rit?</SectionTitle>
          <Card raised>
            <T color="muted" numberOfLines={1}>
              {plan.resolvedOriginLabel} → {plan.destination.label} · {formatDistance(selectedRoute!.distanceMeters * (plan.isReturn ? 2 : 1))}
            </T>
            <Row>
              {tripCmp.map((t) => (
                <View key={t.vehicle.id} style={{ flex: 1, gap: 2 }}>
                  <T v="small" color="muted" numberOfLines={1}>
                    {t.vehicle.name}
                  </T>
                  <T v="h2">{t.cents == null ? '–' : formatEuro(t.cents)}</T>
                </View>
              ))}
            </Row>
            {(() => {
              const s = differenceSentence(A.name, tripCmp[0].cents, B.name, tripCmp[1].cents, 'aan brandstof/stroom voor deze rit');
              return s ? <T color="accent">{s}</T> : <T color="subtle">Vul het verbruik van beide auto’s in om te vergelijken.</T>;
            })()}
          </Card>
        </>
      )}
      {!tripCmp && (
        <Banner kind="info" action={{ label: 'Route plannen', onPress: () => router.navigate('/') }}>
          Plan een route om te zien wat dezelfde rit met beide auto’s kost.
        </Banner>
      )}

      <SectionTitle>Kosten naast elkaar</SectionTitle>
      <Card>
        <Row>
          <View style={{ flex: 1.4 }} />
          <T v="small" color="muted" style={{ flex: 1, textAlign: 'right' }} numberOfLines={1}>
            {A.name}
          </T>
          <T v="small" color="muted" style={{ flex: 1, textAlign: 'right' }} numberOfLines={1}>
            {B.name}
          </T>
        </Row>
        <Divider />
        {rows.map((r) => {
          const better = r.a != null && r.b != null && r.a !== r.b ? (r.a < r.b ? 'a' : 'b') : null;
          return (
            <Row key={r.label}>
              <T v="small" style={{ flex: 1.4 }}>
                {r.label}
                {r.estimate ? ' *' : ''}
              </T>
              <T v="bodyStrong" color={better === 'a' ? c.accent : undefined} style={{ flex: 1, textAlign: 'right' }}>
                {r.a == null ? '–' : formatEuro(r.a)}
              </T>
              <T v="bodyStrong" color={better === 'b' ? c.accent : undefined} style={{ flex: 1, textAlign: 'right' }}>
                {r.b == null ? '–' : formatEuro(r.b)}
              </T>
            </Row>
          );
        })}
        {(() => {
          const s = differenceSentence(A.name, total.a, B.name, total.b, 'per jaar');
          return s ? <T color="accent">{s}</T> : null;
        })()}
        <T v="small" color="subtle">
          * Geschat. Onderhoud en afschrijving zijn schattingen op basis van je eigen invoer. “–” betekent: nog niet ingevuld bij deze auto.
        </T>
      </Card>
    </Screen>
  );
}
