import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Banner, Button, Card, Field, KeyValue, Row, Screen, SourceBadge, T } from '../components/ui';
import { EnergyFields, FuelTypePicker, PriceFields, ProfileField } from '../components/vehicleFields';
import { APP_CONFIG } from '../config/app';
import { formatDecimal } from '../features/costs/money';
import { createVehicle, defaultProfile, FUEL_LABELS } from '../features/vehicles/factory';
import { formatPlate, isValidDutchPlate } from '../features/vehicles/plate';
import { lookupPlate, type RdwVehicleData } from '../features/vehicles/rdw';
import { errorMessage } from '../services/http';
import { useApp } from '../state/AppState';
import { spacing, useColors } from '../theme';
import type { FuelType, Vehicle, VehicleCostProfile } from '../types/models';

const STEPS = ['welcome', 'plate', 'km', 'consumption', 'price', 'extra'] as const;

export default function Onboarding() {
  const c = useColors();
  const { upsertVehicle, updatePrefs } = useApp();
  const [step, setStep] = useState(0);
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [rdw, setRdw] = useState<RdwVehicleData | null>(null);
  const [draft, setDraft] = useState<{ vehicle: Vehicle; profile: VehicleCostProfile }>(() => createVehicle(null));
  const [manualName, setManualName] = useState('');

  const name = STEPS[step];
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  async function finish(openDetails: boolean) {
    const v = { ...draft.vehicle, name: draft.vehicle.plate ? draft.vehicle.name : manualName.trim() || draft.vehicle.name };
    await upsertVehicle(v, draft.profile, true);
    await updatePrefs({ onboarded: true });
    router.replace('/');
    if (openDetails) router.push({ pathname: '/vehicle-edit', params: { id: v.id } });
  }

  async function doLookup() {
    setLookupError(null);
    if (!isValidDutchPlate(plate)) {
      setLookupError('Dit lijkt geen geldig Nederlands kenteken. Controleer de invoer.');
      return;
    }
    setLoading(true);
    try {
      const r = await lookupPlate(plate);
      if (!r) {
        setRdw(null);
        setLookupError('Kenteken niet gevonden bij de RDW. Je kunt je auto ook handmatig invoeren.');
      } else {
        setRdw(r);
        setDraft(createVehicle(r));
      }
    } catch (e) {
      setLookupError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  function setFuelType(f: FuelType) {
    const vehicle = { ...draft.vehicle, fuelType: f };
    setDraft({ vehicle, profile: { ...defaultProfile(vehicle), annualKm: draft.profile.annualKm, sources: { ...defaultProfile(vehicle).sources, annualKm: draft.profile.sources.annualKm } } });
  }

  const setProfile = (profile: VehicleCostProfile) => setDraft((d) => ({ ...d, profile }));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']}>
        {step > 0 && (
          <Row style={{ justifyContent: 'space-between' }}>
            <Button title="Terug" kind="ghost" icon="chevron-back" small onPress={back} />
            <Progress step={step} total={STEPS.length - 1} />
            <Button title="Overslaan" kind="ghost" small onPress={() => finish(false)} />
          </Row>
        )}

        {name === 'welcome' && (
          <View style={{ gap: spacing.xl, paddingTop: spacing.xxl * 2 }}>
            <View style={{ width: 88, height: 88, borderRadius: 26, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="navigate" size={44} color={c.accent} />
            </View>
            <T v="hero">{APP_CONFIG.name}</T>
            <T v="h2" color="muted">
              {APP_CONFIG.slogan}
            </T>
            <View style={{ gap: spacing.md }}>
              <Bullet icon="map" text="Plan je route en zie direct wat de rit kost." />
              <Bullet icon="people" text="Verdeel de kosten eerlijk met je meerijders." />
              <Bullet icon="pie-chart" text="Weet wat je auto je écht kost." />
            </View>
            <Button title="Beginnen" icon="arrow-forward" onPress={next} />
            <Button title="Overslaan en later instellen" kind="ghost" onPress={() => finish(false)} />
          </View>
        )}

        {name === 'plate' && (
          <View style={{ gap: spacing.lg }}>
            <T v="h1">Wat is je kenteken?</T>
            <T color="muted">We halen merk, model, brandstof en de fabrieksgegevens op bij de RDW (openbare gegevens).</T>
            <Field
              label="Kenteken"
              placeholder="bijv. GJ-433-K"
              autoCapitalize="characters"
              autoCorrect={false}
              value={plate}
              onChangeText={(t) => {
                setPlate(t.toUpperCase());
                setLookupError(null);
              }}
              onBlur={() => isValidDutchPlate(plate) && setPlate(formatPlate(plate))}
              onSubmitEditing={doLookup}
              returnKeyType="search"
              style={{}}
            />
            <Button title="Zoek bij RDW" icon="search" loading={loading} disabled={plate.trim().length < 6} onPress={doLookup} />
            {lookupError && <Banner kind="warning">{lookupError}</Banner>}
            {rdw && (
              <Card>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="h2">{draft.vehicle.name}</T>
                  <SourceBadge source="rdw" />
                </Row>
                <KeyValue k="Kenteken" v={formatPlate(rdw.plate)} />
                {rdw.firstRegistrationDate && <KeyValue k="Eerste toelating" v={rdw.firstRegistrationDate.slice(0, 4)} />}
                <KeyValue k="Brandstof" v={rdw.fuelType ? FUEL_LABELS[rdw.fuelType] : rdw.fuelDescriptions.join(', ') || 'Onbekend'} />
                {rdw.massKg && <KeyValue k="Massa rijklaar" v={`${rdw.massKg} kg`} />}
                {rdw.apkExpiryDate && <KeyValue k="APK geldig tot" v={rdw.apkExpiryDate.split('-').reverse().join('-')} />}
                {rdw.consumptionL100 && <KeyValue k="Verbruik (WLTP)" v={`${formatDecimal(rdw.consumptionL100)} l/100 km`} />}
                {rdw.consumptionKwh100 && <KeyValue k="Verbruik (WLTP)" v={`${formatDecimal(rdw.consumptionKwh100)} kWh/100 km`} />}
                <Button title="Dit is mijn auto" icon="checkmark" onPress={next} />
              </Card>
            )}
            {!rdw && (
              <Card>
                <T v="h3">Of voer je auto handmatig in</T>
                <Field label="Naam van je auto" placeholder="bijv. Mijn Polo" value={manualName} onChangeText={setManualName} />
                <T v="small" color="muted">
                  Brandstofsoort
                </T>
                <FuelTypePicker value={draft.vehicle.fuelType} onChange={setFuelType} />
                <Button title="Verder zonder kenteken" kind="secondary" onPress={next} />
              </Card>
            )}
          </View>
        )}

        {name === 'km' && (
          <View style={{ gap: spacing.lg }}>
            <T v="h1">Hoeveel rijd je per jaar?</T>
            <T color="muted">Een schatting is prima. Dit gebruiken we om vaste kosten en afschrijving per kilometer te berekenen.</T>
            <ProfileField profile={draft.profile} onChange={setProfile} k="annualKm" kind="int" label="Kilometers per jaar" suffix="km" />
            <Row style={{ flexWrap: 'wrap' }} gap={spacing.sm}>
              {[7500, 10000, 15000, 20000, 30000].map((km) => (
                <Button key={km} small kind={draft.profile.annualKm === km ? 'primary' : 'secondary'} title={km.toLocaleString('nl-NL')} onPress={() => setProfile({ ...draft.profile, annualKm: km, sources: { ...draft.profile.sources, annualKm: 'user' } })} />
              ))}
            </Row>
            <Button title="Volgende" icon="arrow-forward" onPress={next} />
          </View>
        )}

        {name === 'consumption' && (
          <View style={{ gap: spacing.lg }}>
            <T v="h1">Wat verbruikt je auto?</T>
            <T color="muted">
              {draft.vehicle.officialConsumptionL100 || draft.vehicle.officialConsumptionKwh100
                ? 'We hebben de fabrieksopgave van de RDW ingevuld. In de praktijk ligt het verbruik vaak hoger — pas het aan naar je werkelijke verbruik voor de beste berekening.'
                : 'De RDW heeft geen verbruiksgegevens voor deze auto. Vul je gemiddelde verbruik in (staat vaak in je boordcomputer).'}
            </T>
            <EnergyFields key={draft.vehicle.id + draft.vehicle.fuelType} fuelType={draft.vehicle.fuelType} profile={draft.profile} onChange={setProfile} />
            <Button title="Volgende" icon="arrow-forward" onPress={next} />
          </View>
        )}

        {name === 'price' && (
          <View style={{ gap: spacing.lg }}>
            <T v="h1">Wat betaal je?</T>
            <T color="muted">We hebben een gangbare prijs als schatting ingevuld. Vul je eigen prijs in voor een nauwkeurige berekening.</T>
            <PriceFields key={draft.vehicle.id + draft.vehicle.fuelType} fuelType={draft.vehicle.fuelType} profile={draft.profile} onChange={setProfile} />
            <Button title="Volgende" icon="arrow-forward" onPress={next} />
          </View>
        )}

        {name === 'extra' && (
          <View style={{ gap: spacing.lg }}>
            <T v="h1">Nauwkeuriger rekenen?</T>
            <T color="muted">
              Met verzekering, wegenbelasting, onderhoud en afschrijving zie je wat je auto je écht kost per kilometer, per maand en per jaar. Je kunt dit ook later invullen bij “Mijn Auto”.
            </T>
            <Button title="Ja, nu invullen" icon="create" onPress={() => finish(true)} />
            <Button title="Later — start de app" kind="secondary" onPress={() => finish(false)} />
          </View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Bullet({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  const c = useColors();
  return (
    <Row>
      <Ionicons name={icon} size={20} color={c.accent} />
      <T style={{ flex: 1 }}>{text}</T>
    </Row>
  );
}

function Progress({ step, total }: { step: number; total: number }) {
  const c = useColors();
  return (
    <Row gap={4}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ width: 18, height: 4, borderRadius: 2, backgroundColor: i < step ? c.accent : c.border }} />
      ))}
    </Row>
  );
}
