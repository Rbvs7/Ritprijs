import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Banner, Button, Card, Chip, EmptyState, KeyValue, Row, Screen, SectionTitle, SourceBadge, T } from '../../components/ui';
import * as repo from '../../database/repositories';
import { formatDecimal, formatEuro } from '../../features/costs/money';
import { annualCostSummary } from '../../features/costs/vehicleCost';
import { EXPENSE_LABELS } from '../../features/history/expenses';
import { FUEL_LABELS } from '../../features/vehicles/factory';
import { formatPlate } from '../../features/vehicles/plate';
import { useApp } from '../../state/AppState';
import { radius, spacing, useColors } from '../../theme';
import type { Expense } from '../../types/models';

export default function AutoScreen() {
  const c = useColors();
  const { vehicles, activeVehicle: v, activeProfile: p, updatePrefs } = useApp();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [now] = useState(() => Date.now());
  const yearStart = `${new Date().getFullYear()}-01-01`;

  useFocusEffect(
    useCallback(() => {
      if (v) repo.listExpenses(v.id, yearStart).then(setExpenses).catch(() => setExpenses([]));
    }, [v, yearStart]),
  );

  if (!v || !p) {
    return (
      <Screen>
        <T v="h1">Mijn Auto</T>
        <EmptyState icon="car-sport" title="Nog geen auto" text="Voeg je auto toe via je kenteken of handmatig." action={{ label: 'Auto toevoegen', onPress: () => router.push({ pathname: '/vehicle-edit', params: { id: 'new' } }) }} />
      </Screen>
    );
  }

  const summary = annualCostSummary(v.fuelType, p);
  const known = summary.lines.filter((l) => (l.perYearCents ?? 0) > 0).sort((a, b) => b.perYearCents! - a.perYearCents!);
  const max = Math.max(1, ...known.map((l) => l.perYearCents!));
  const actualTotal = expenses.reduce((s, e) => s + e.amountCents, 0);
  const apkSoon = v.apkExpiryDate && new Date(v.apkExpiryDate).getTime() - now < 1000 * 60 * 60 * 24 * 45;

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h1">Mijn Auto</T>
        <Button small kind="secondary" icon="add" title="Auto" onPress={() => router.push({ pathname: '/vehicle-edit', params: { id: 'new' } })} />
      </Row>

      {vehicles.length > 1 && (
        <Row style={{ flexWrap: 'wrap' }} gap={spacing.sm}>
          {vehicles.map((x) => (
            <Chip key={x.id} label={x.name} icon="car-sport" active={x.id === v.id} onPress={() => updatePrefs({ activeVehicleId: x.id })} />
          ))}
        </Row>
      )}

      <Card>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <T v="h2">{v.name}</T>
            <T color="muted">
              {[FUEL_LABELS[v.fuelType], v.firstRegistrationDate?.slice(0, 4)].filter(Boolean).join(' · ')}
            </T>
          </View>
          {v.plate && (
            <View style={{ backgroundColor: '#F7C600', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, borderLeftWidth: 10, borderLeftColor: '#003DA5' }}>
              <T v="bodyStrong" color="#111">
                {formatPlate(v.plate)}
              </T>
            </View>
          )}
        </Row>
        {p.consumptionL100 != null && <KeyValue k="Verbruik" v={`${formatDecimal(p.consumptionL100)} l/100 km`} badge={p.sources.consumptionL100 && <SourceBadge source={p.sources.consumptionL100} />} />}
        {p.consumptionKwh100 != null && <KeyValue k="Verbruik" v={`${formatDecimal(p.consumptionKwh100)} kWh/100 km`} badge={p.sources.consumptionKwh100 && <SourceBadge source={p.sources.consumptionKwh100} />} />}
        <KeyValue k="Kilometers per jaar" v={p.annualKm.toLocaleString('nl-NL')} badge={p.sources.annualKm && <SourceBadge source={p.sources.annualKm} />} />
        {v.apkExpiryDate && <KeyValue k="APK geldig tot" v={v.apkExpiryDate.split('-').reverse().join('-')} badge={<SourceBadge source="rdw" />} />}
        {apkSoon && <Banner kind="warning">Je APK verloopt binnenkort.</Banner>}
        <Button small kind="secondary" icon="create" title="Gegevens en kosten bewerken" onPress={() => router.push({ pathname: '/vehicle-edit', params: { id: v.id } })} />
      </Card>

      <SectionTitle>Mijn auto kost mij (geschat)</SectionTitle>
      <Card raised>
        <Row style={{ justifyContent: 'space-between' }}>
          <Big label="per maand" value={formatEuro(summary.perMonthCents)} accent />
          <Big label="per jaar" value={formatEuro(summary.perYearCents)} />
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Big label="per dag" value={formatEuro(summary.perDayCents)} />
          <Big label="per km" value={summary.perKmCents != null ? formatEuro(Math.round(summary.perKmCents)) : '–'} />
        </Row>
        {summary.unknown.length > 0 && (
          <Banner kind="info" action={{ label: 'Nu invullen', onPress: () => router.push({ pathname: '/vehicle-edit', params: { id: v.id } }) }}>
            {`Nog niet meegerekend: ${summary.unknown.join(', ').toLowerCase()}. Het werkelijke bedrag ligt dus hoger.`}
          </Banner>
        )}
      </Card>

      {known.length > 0 && (
        <>
          <SectionTitle>Kostenverdeling per jaar</SectionTitle>
          <Card>
            {known.map((l) => (
              <View key={l.key} style={{ gap: 6 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T>{l.label}</T>
                  <T v="bodyStrong">{formatEuro(l.perYearCents!)}</T>
                </Row>
                <View style={{ height: 8, borderRadius: radius.pill, backgroundColor: c.bg, overflow: 'hidden' }}>
                  <View style={{ width: `${(l.perYearCents! / max) * 100}%`, height: '100%', backgroundColor: l.kind === 'economic' ? c.info : l.kind === 'fixed' ? c.warning : c.accent, borderRadius: radius.pill }} />
                </View>
              </View>
            ))}
            <Row gap={spacing.lg} style={{ flexWrap: 'wrap', marginTop: spacing.sm }}>
              <Legend color={c.accent} label="Variabel" />
              <Legend color={c.warning} label="Vast" />
              <Legend color={c.info} label="Waardeverlies & rente" />
            </Row>
            <T v="small" color="subtle">
              Geschat op basis van je kostenprofiel en {p.annualKm.toLocaleString('nl-NL')} km per jaar. Afschrijving is waardeverlies, geen betaalde rekening.
            </T>
          </Card>
        </>
      )}

      <SectionTitle right={<Button small kind="ghost" icon="add" title="Uitgave" onPress={() => router.push({ pathname: '/expense', params: { vehicleId: v.id } })} />}>Werkelijke uitgaven {new Date().getFullYear()}</SectionTitle>
      <Card>
        <KeyValue k="Totaal geregistreerd" v={formatEuro(actualTotal)} strong />
        {expenses.length === 0 && (
          <T v="small" color="muted">
            Registreer tankbeurten, onderhoud en andere uitgaven om je werkelijke kosten bij te houden.
          </T>
        )}
        {expenses.slice(0, 20).map((e) => (
          <Pressable
            key={e.id}
            onLongPress={() =>
              Alert.alert('Uitgave verwijderen?', `${EXPENSE_LABELS[e.category]} · ${formatEuro(e.amountCents)}`, [
                { text: 'Annuleren', style: 'cancel' },
                { text: 'Verwijderen', style: 'destructive', onPress: () => repo.deleteExpense(e.id).then(() => setExpenses((cur) => cur.filter((x) => x.id !== e.id))) },
              ])
            }
          >
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <T>{EXPENSE_LABELS[e.category]}</T>
                <T v="small" color="subtle">
                  {new Date(e.date).toLocaleDateString('nl-NL')}
                  {e.note ? ` · ${e.note}` : ''}
                </T>
              </View>
              <T v="bodyStrong">{formatEuro(e.amountCents)}</T>
            </Row>
          </Pressable>
        ))}
        {expenses.length > 0 && (
          <T v="tiny" color="subtle">
            Houd een uitgave ingedrukt om te verwijderen.
          </T>
        )}
      </Card>
    </Screen>
  );
}

function Big({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <T v="h2" color={accent ? 'accent' : undefined}>
        {value}
      </T>
      <T v="small" color="muted">
        {label}
      </T>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <Row gap={6}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <T v="small" color="muted">
        {label}
      </T>
    </Row>
  );
}
