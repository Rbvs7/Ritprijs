import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Card, Chip, EmptyState, KeyValue, Row, Screen, T } from '../../components/ui';
import * as repo from '../../database/repositories';
import { formatEuro } from '../../features/costs/money';
import { periodStart, tripStats, type PeriodKey } from '../../features/history/expenses';
import { formatDistance, formatDuration } from '../../features/navigation';
import { useApp } from '../../state/AppState';
import { spacing } from '../../theme';
import type { Trip } from '../../types/models';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Vandaag' },
  { key: 'week', label: 'Deze week' },
  { key: 'month', label: 'Deze maand' },
  { key: 'year', label: 'Dit jaar' },
  { key: 'all', label: 'Alles' },
];

export default function TripsScreen() {
  const { tripsVersion, bumpTrips } = useApp();
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [error, setError] = useState(false);

  const reload = useCallback(() => {
    repo
      .listTrips(periodStart(period))
      .then((t) => {
        setTrips(t);
        setError(false);
      })
      .catch(() => setError(true));
  }, [period]);
  useFocusEffect(reload);
  useEffect(reload, [reload, tripsVersion]);

  const s = tripStats(trips);

  function remove(t: Trip) {
    Alert.alert('Rit verwijderen?', `${t.originLabel} → ${t.destinationLabel}`, [
      { text: 'Annuleren', style: 'cancel' },
      { text: 'Verwijderen', style: 'destructive', onPress: () => repo.deleteTrip(t.id).then(bumpTrips) },
    ]);
  }

  return (
    <Screen>
      <T v="h1">Ritten</T>
      <Row style={{ flexWrap: 'wrap' }} gap={spacing.sm}>
        {PERIODS.map((p) => (
          <Chip key={p.key} label={p.label} active={period === p.key} onPress={() => setPeriod(p.key)} />
        ))}
      </Row>

      {error && <T color="danger">Ritten konden niet worden geladen.</T>}

      {trips.length > 0 && (
        <Card raised>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <T v="h1" color="accent">
                {formatEuro(s.totalCents)}
              </T>
              <T v="small" color="muted">
                totale ritkosten
              </T>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <T v="h2">{Math.round(s.totalKm).toLocaleString('nl-NL')} km</T>
              <T v="small" color="muted">
                {s.count} {s.count === 1 ? 'rit' : 'ritten'}
              </T>
            </View>
          </Row>
          <KeyValue k="Brandstof / stroom" v={formatEuro(s.energyCents)} />
          {s.avgPerKmCents != null && <KeyValue k="Gemiddeld per km" v={formatEuro(Math.round(s.avgPerKmCents))} />}
          {s.avgPerTripCents != null && <KeyValue k="Gemiddeld per rit" v={formatEuro(s.avgPerTripCents)} />}
        </Card>
      )}

      {trips.length === 0 && !error && (
        <EmptyState icon="time" title="Geen ritten in deze periode" text='Plan een route en tik op "Rit opslaan" om je ritten en kosten bij te houden.' action={{ label: 'Route plannen', onPress: () => router.navigate('/') }} />
      )}

      {trips.map((t) => (
        <Pressable key={t.id} onLongPress={() => remove(t)} accessibilityHint="Lang indrukken om te verwijderen">
          <Card>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyStrong" numberOfLines={1}>
                  {t.originLabel} → {t.destinationLabel}
                </T>
                <T v="small" color="muted">
                  {new Date(t.date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatDistance(t.distanceMeters)} · {formatDuration(t.durationSeconds)}
                  {t.isReturn ? ' · retour' : ''}
                </T>
                <T v="small" color="subtle">
                  {t.vehicleName ?? 'Onbekende auto'} · {t.costMode === 'direct' ? 'directe kosten' : 'totale kosten'}
                  {t.carpoolCount > 1 ? ` · ${t.carpoolCount} personen` : ''}
                </T>
              </View>
              <T v="h3" color="accent">
                {formatEuro(t.totalCents)}
              </T>
            </Row>
            {t.split && (
              <View style={{ gap: 2 }}>
                {t.split.shares.map((sh) => (
                  <Row key={sh.participantId} style={{ justifyContent: 'space-between' }}>
                    <T v="small" color="muted">
                      {sh.name}
                    </T>
                    <T v="small">{formatEuro(sh.amountCents)}</T>
                  </Row>
                ))}
              </View>
            )}
          </Card>
        </Pressable>
      ))}
      {trips.length > 0 && (
        <T v="tiny" color="subtle" center>
          Houd een rit ingedrukt om te verwijderen.
        </T>
      )}
    </Screen>
  );
}
