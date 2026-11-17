import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Share, TextInput, View } from 'react-native';
import { Banner, Button, Card, Divider, IconButton, Row, Screen, Segmented, Stepper, T, ToggleRow } from '../components/ui';
import { APP_CONFIG } from '../config/app';
import * as repo from '../database/repositories';
import { buildShareText, makeParticipants, splitCosts, SplitError } from '../features/carpool/split';
import { centsToInput, formatDecimal, formatEuro, parseDecimal, parseEuroToCents } from '../features/costs/money';
import { useTripCost } from '../features/costs/useTripCost';
import { useApp } from '../state/AppState';
import { usePlanner } from '../state/Planner';
import { font, radius, useColors } from '../theme';
import type { CarpoolParticipant, SplitMethod, Trip } from '../types/models';
import { newId } from '../utils/id';

type UiMethod = 'equal' | 'driver_free' | 'manual';

export default function SplitScreen() {
  const c = useColors();
  const { activeVehicle, activeProfile, bumpTrips } = useApp();
  const { plan, setPlan, selectedRoute } = usePlanner();
  const cost = useTripCost(plan, selectedRoute, activeVehicle, activeProfile);

  const [people, setPeople] = useState<CarpoolParticipant[]>(() => makeParticipants(2));
  const [uiMethod, setUiMethod] = useState<UiMethod>('equal');
  const [manualKind, setManualKind] = useState<'manual_amount' | 'manual_percent'>('manual_percent');
  const [manualText, setManualText] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const method: SplitMethod = uiMethod === 'manual' ? manualKind : uiMethod;
  const total = cost && cost.missing.length === 0 ? cost.totalCents : null;

  const { split, error } = useMemo(() => {
    if (total == null) return { split: null, error: null };
    try {
      return { split: splitCosts(total, people, method), error: null };
    } catch (e) {
      return { split: null, error: e instanceof SplitError ? e.message : 'Kan niet verdelen.' };
    }
  }, [total, people, method]);

  if (!selectedRoute || !plan.destination) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Banner kind="info">Plan eerst een route op het tabblad Navigatie.</Banner>
        <Button title="Terug" onPress={() => router.back()} />
      </Screen>
    );
  }

  function setCount(n: number) {
    setPeople((cur) => {
      const fresh = makeParticipants(n);
      return fresh.map((p, i) => (cur[i] ? { ...cur[i] } : p));
    });
    setSaved(false);
  }

  function setManual(p: CarpoolParticipant, text: string) {
    setManualText((m) => ({ ...m, [p.id]: text }));
    const val = manualKind === 'manual_amount' ? parseEuroToCents(text) : parseDecimal(text);
    setPeople((cur) => cur.map((x) => (x.id === p.id ? { ...x, manualAmountCents: manualKind === 'manual_amount' ? val ?? 0 : x.manualAmountCents, manualPercent: manualKind === 'manual_percent' ? val ?? 0 : x.manualPercent } : x)));
  }

  function fillManualDefaults(kind: 'manual_amount' | 'manual_percent') {
    if (total == null) return;
    const eq = splitCosts(total, people, 'equal');
    const texts: Record<string, string> = {};
    const next = people.map((p, i) => {
      const cents = eq.shares[i].amountCents;
      const pct = Math.round((10000 / people.length)) / 100;
      texts[p.id] = kind === 'manual_amount' ? centsToInput(cents) : formatDecimal(i === people.length - 1 ? Math.round((100 - pct * (people.length - 1)) * 100) / 100 : pct, 2);
      return { ...p, manualAmountCents: cents, manualPercent: parseDecimal(texts[p.id]) ?? 0 };
    });
    setManualText(texts);
    setPeople(next);
  }

  const origin = plan.resolvedOriginLabel;
  const shareText = split ? buildShareText({ originLabel: origin, destinationLabel: plan.destination.label, isReturn: plan.isReturn, split, footer: APP_CONFIG.shareFooter, formatEuro }) : '';

  async function saveWithSplit() {
    if (!split || !cost || !selectedRoute) return;
    const trip: Trip = {
      id: newId('t_'),
      date: new Date().toISOString(),
      originLabel: origin,
      destinationLabel: plan.destination!.label,
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
      carpoolCount: people.length,
      split,
      notes: null,
    };
    try {
      await repo.saveTrip(trip);
      bumpTrips();
      setSaved(true);
    } catch {
      Alert.alert('Opslaan mislukt', 'De rit kon niet worden opgeslagen.');
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h1">Splits deze rit</T>
        <IconButton icon="close" label="Sluiten" onPress={() => router.back()} />
      </Row>
      <T color="muted" numberOfLines={2}>
        {origin} → {plan.destination.label}
      </T>

      <Card>
        <Stepper label="Personen in de auto" value={people.length} onChange={setCount} min={1} max={9} />
        <Divider />
        <ToggleRow label="Retourrit" value={plan.isReturn} onChange={(b) => setPlan({ isReturn: b })} />
        <Segmented
          value={plan.costMode}
          onChange={(k) => setPlan({ costMode: k })}
          options={[
            { key: 'direct', label: 'Directe kosten' },
            { key: 'total', label: 'Totale kosten' },
          ]}
        />
        {plan.extras.length > 0 && (
          <T v="small" color="muted">
            Inclusief extra kosten: {plan.extras.map((e) => `${e.kind === 'parking' ? 'parkeren' : e.kind === 'toll' ? 'tol' : 'overig'} ${formatEuro(e.amountCents)}`).join(', ')}
          </T>
        )}
      </Card>

      <Card>
        <T v="small" color="muted">
          Verdeelmethode
        </T>
        <Segmented
          value={uiMethod}
          onChange={(k) => {
            setUiMethod(k);
            if (k === 'manual') fillManualDefaults(manualKind);
          }}
          options={[
            { key: 'equal', label: 'Iedereen' },
            { key: 'driver_free', label: 'Passagiers' },
            { key: 'manual', label: 'Handmatig' },
          ]}
        />
        <T v="small" color="subtle">
          {uiMethod === 'equal'
            ? 'Iedereen, ook de bestuurder, betaalt een gelijk deel.'
            : uiMethod === 'driver_free'
              ? 'De bestuurder rijdt gratis; de passagiers delen de kosten.'
              : 'Verdeel zelf met percentages of bedragen.'}
        </T>
        {uiMethod === 'manual' && (
          <Segmented
            value={manualKind}
            onChange={(k) => {
              setManualKind(k);
              fillManualDefaults(k);
            }}
            options={[
              { key: 'manual_percent', label: 'Percentages' },
              { key: 'manual_amount', label: 'Bedragen' },
            ]}
          />
        )}
      </Card>

      {total == null ? (
        <Banner kind="warning">De ritkosten kunnen niet worden berekend. Vul je verbruik en brandstofprijs aan bij “Mijn Auto”.</Banner>
      ) : (
        <Card raised>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="bodyStrong" color="muted">
              Totaal te verdelen
            </T>
            <T v="h2">{formatEuro(total)}</T>
          </Row>
          <Divider />
          {people.map((p, i) => {
            const share = split?.shares[i];
            return (
              <Row key={p.id} style={{ justifyContent: 'space-between' }}>
                <TextInput
                  value={p.name}
                  onChangeText={(t) => setPeople((cur) => cur.map((x) => (x.id === p.id ? { ...x, name: t } : x)))}
                  style={[font.bodyStrong, { color: c.text, flex: 1, minWidth: 0, paddingVertical: 8 }]}
                  accessibilityLabel={`Naam persoon ${i + 1}`}
                  maxLength={30}
                />
                {uiMethod === 'manual' ? (
                  <View style={{ width: 110 }}>
                    <TextInput
                      value={manualText[p.id] ?? ''}
                      onChangeText={(t) => setManual(p, t)}
                      keyboardType="decimal-pad"
                      style={[font.bodyStrong, { color: c.text, textAlign: 'right', borderWidth: 1, borderColor: c.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8 }]}
                      accessibilityLabel={`Aandeel ${p.name}`}
                    />
                    <T v="tiny" color="subtle" style={{ textAlign: 'right' }}>
                      {manualKind === 'manual_percent' ? `% · ${share ? formatEuro(share.amountCents) : '–'}` : '€'}
                    </T>
                  </View>
                ) : (
                  <T v="h2" numberOfLines={1} color={share && share.amountCents > 0 ? 'accent' : 'subtle'}>
                    {share ? formatEuro(share.amountCents) : '–'}
                  </T>
                )}
              </Row>
            );
          })}
          {error && <Banner kind="warning">{error}</Banner>}
          {split && (
            <T v="small" color="subtle">
              Restcenten worden eerlijk verdeeld zodat het totaal exact klopt.
            </T>
          )}
        </Card>
      )}

      {split && (
        <>
          <Button title="Deel kostenverdeling" icon="share-social" onPress={() => Share.share({ message: shareText }).catch(() => {})} />
          <Button title={saved ? 'Rit opgeslagen' : 'Rit opslaan met verdeling'} icon={saved ? 'checkmark' : 'bookmark'} kind="secondary" disabled={saved} onPress={saveWithSplit} />
          <Card>
            <T v="tiny" color="subtle" style={{ textTransform: 'uppercase' }}>
              Voorbeeld bericht
            </T>
            <T v="small" color="muted">
              {shareText}
            </T>
          </Card>
        </>
      )}
    </Screen>
  );
}
