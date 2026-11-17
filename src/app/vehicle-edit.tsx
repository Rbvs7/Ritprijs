import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Banner, Button, Card, Field, IconButton, Row, Screen, SectionTitle, T } from '../components/ui';
import { EnergyFields, FuelTypePicker, PriceFields, ProfileField } from '../components/vehicleFields';
import { createVehicle, defaultProfile } from '../features/vehicles/factory';
import { formatPlate, isValidDutchPlate } from '../features/vehicles/plate';
import { lookupPlate } from '../features/vehicles/rdw';
import { errorMessage } from '../services/http';
import { useApp } from '../state/AppState';
import { spacing, useColors } from '../theme';
import type { FuelType, Vehicle, VehicleCostProfile } from '../types/models';

export default function VehicleEdit() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { vehicles, profiles, upsertVehicle, removeVehicle } = useApp();
  const existing = vehicles.find((v) => v.id === id);
  const isNew = !existing;

  const [vehicle, setVehicle] = useState<Vehicle>(() => existing ?? createVehicle(null).vehicle);
  const [profile, setProfile] = useState<VehicleCostProfile>(() => (existing ? profiles[existing.id] ?? defaultProfile(existing) : defaultProfile(vehicle)));
  const [plate, setPlate] = useState(existing?.plate ? formatPlate(existing.plate) : '');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  async function lookup() {
    setMsg(null);
    if (!isValidDutchPlate(plate)) return setMsg('Geen geldig Nederlands kenteken.');
    setLoading(true);
    try {
      const r = await lookupPlate(plate);
      if (!r) return setMsg('Kenteken niet gevonden bij de RDW.');
      const created = createVehicle(r);
      const v = { ...created.vehicle, id: vehicle.id, createdAt: vehicle.createdAt };
      setVehicle(v);
      // Behoud wat de gebruiker al invulde; vul aan met RDW-gegevens.
      const fresh = { ...created.profile, vehicleId: v.id };
      setProfile((cur) => ({
        ...fresh,
        ...Object.fromEntries(Object.entries(cur).filter(([k, val]) => cur.sources[k as keyof VehicleCostProfile] === 'user' && val != null)),
        sources: { ...fresh.sources, ...Object.fromEntries(Object.entries(cur.sources).filter(([, s]) => s === 'user')) },
      }));
      setFormKey((k) => k + 1);
    } catch (e) {
      setMsg(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  function setFuel(f: FuelType) {
    const v = { ...vehicle, fuelType: f };
    setVehicle(v);
    const d = defaultProfile(v);
    setProfile((cur) => ({ ...cur, consumptionL100: d.consumptionL100 ?? cur.consumptionL100, consumptionKwh100: d.consumptionKwh100 ?? cur.consumptionKwh100, fuelPricePerLiterCents: cur.fuelPricePerLiterCents ?? d.fuelPricePerLiterCents, electricityHomeCentsPerKwh: cur.electricityHomeCentsPerKwh ?? d.electricityHomeCentsPerKwh, electricityPublicCentsPerKwh: cur.electricityPublicCentsPerKwh ?? d.electricityPublicCentsPerKwh, sources: { ...d.sources, ...cur.sources } }));
    setFormKey((k) => k + 1);
  }

  async function save() {
    if (!vehicle.name.trim()) return setMsg('Geef je auto een naam.');
    await upsertVehicle({ ...vehicle, name: vehicle.name.trim() }, { ...profile, vehicleId: vehicle.id }, isNew);
    router.back();
  }

  function confirmDelete() {
    Alert.alert('Auto verwijderen?', `${vehicle.name} en de bijbehorende uitgaven worden verwijderd. Opgeslagen ritten blijven bewaard.`, [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Verwijderen',
        style: 'destructive',
        onPress: async () => {
          await removeVehicle(vehicle.id);
          router.back();
        },
      },
    ]);
  }

  const P = (props: Omit<React.ComponentProps<typeof ProfileField>, 'profile' | 'onChange'>) => <ProfileField profile={profile} onChange={setProfile} {...props} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h1">{isNew ? 'Auto toevoegen' : 'Auto bewerken'}</T>
          <IconButton icon="close" label="Sluiten" onPress={() => router.back()} />
        </Row>

        <Card>
          <Row>
            <Field style={{ flex: 1 }} label="Kenteken (optioneel)" placeholder="bijv. GJ-433-K" autoCapitalize="characters" value={plate} onChangeText={(t) => setPlate(t.toUpperCase())} onSubmitEditing={lookup} />
          </Row>
          <Button small kind="secondary" icon="search" title="Gegevens ophalen bij RDW" loading={loading} onPress={lookup} disabled={plate.trim().length < 6} />
          {msg && <Banner kind="warning">{msg}</Banner>}
          <Field label="Naam" value={vehicle.name} onChangeText={(name) => setVehicle({ ...vehicle, name })} />
          <T v="small" color="muted">
            Brandstofsoort
          </T>
          <FuelTypePicker value={vehicle.fuelType} onChange={setFuel} />
          {vehicle.officialConsumptionL100 != null && (
            <T v="small" color="subtle">
              Fabrieksopgave RDW (WLTP): {vehicle.officialConsumptionL100.toLocaleString('nl-NL')} l/100 km
            </T>
          )}
          {vehicle.officialConsumptionKwh100 != null && (
            <T v="small" color="subtle">
              Fabrieksopgave RDW (WLTP): {vehicle.officialConsumptionKwh100.toLocaleString('nl-NL')} kWh/100 km
            </T>
          )}
        </Card>

        <SectionTitle>Verbruik en prijzen</SectionTitle>
        <Card key={'e' + formKey}>
          <T v="small" color="muted">
            Je eigen gemiddelde verbruik heeft voorrang op de fabrieksopgave.
          </T>
          <EnergyFields fuelType={vehicle.fuelType} profile={profile} onChange={setProfile} />
          <PriceFields fuelType={vehicle.fuelType} profile={profile} onChange={setProfile} />
          {P({ k: 'annualKm', kind: 'int', label: 'Kilometers per jaar', suffix: 'km' })}
        </Card>

        <SectionTitle>Vaste kosten per maand</SectionTitle>
        <Card key={'f' + formKey}>
          {P({ k: 'insuranceCentsPerMonth', kind: 'euro', label: 'Verzekering', suffix: '€ / mnd', hint: 'Vul je eigen premie in.' })}
          {P({ k: 'roadTaxCentsPerMonth', kind: 'euro', label: 'Motorrijtuigenbelasting', suffix: '€ / mnd', hint: 'Het bedrag op je aanslag ÷ 3 (per kwartaal) — of bereken het via belastingdienst.nl.' })}
          {P({ k: 'parkingPermitCentsPerMonth', kind: 'euro', label: 'Parkeervergunning', suffix: '€ / mnd' })}
          {P({ k: 'financingInterestCentsPerMonth', kind: 'euro', label: 'Financieringsrente', suffix: '€ / mnd', hint: 'Alleen de rente, niet de aflossing — de aflossing is al verwerkt in de afschrijving.' })}
          {P({ k: 'otherFixedCentsPerMonth', kind: 'euro', label: 'Overige vaste kosten', suffix: '€ / mnd', hint: 'Bijv. pechhulp, abonnementen.' })}
        </Card>

        <SectionTitle>Variabele kosten</SectionTitle>
        <Card key={'v' + formKey}>
          {P({ k: 'maintenanceCentsPerKm', label: 'Onderhoud en reparaties', suffix: 'cent / km', hint: 'Bijv. €600 per jaar bij 15.000 km = 4 cent/km.' })}
          {P({ k: 'tyresCentsPerKm', label: 'Banden', suffix: 'cent / km', hint: 'Bijv. €500 per set die 40.000 km meegaat ≈ 1,3 cent/km.' })}
        </Card>

        <SectionTitle>Afschrijving</SectionTitle>
        <Card key={'d' + formKey}>
          {P({ k: 'purchasePriceCents', kind: 'euro', label: 'Aankoopprijs', suffix: '€' })}
          {P({ k: 'expectedResidualValueCents', kind: 'euro', label: 'Verwachte verkoopwaarde', suffix: '€', hint: 'Wat denk je dat de auto waard is als je hem verkoopt?' })}
          {P({ k: 'expectedOwnershipYears', label: 'Hoe lang wil je hem houden?', suffix: 'jaar' })}
          <T v="small" color="subtle">
            Afschrijving is een schatting van het waardeverlies — geen rekening die je betaalt.
          </T>
        </Card>

        <Button title="Opslaan" icon="checkmark" onPress={save} />
        {!isNew && vehicles.length > 0 && <Button title="Auto verwijderen" kind="danger" icon="trash" onPress={confirmDelete} />}
        <T v="tiny" color="subtle" style={{ marginTop: spacing.sm }}>
          Voertuiggegevens: RDW Open Data.
        </T>
      </Screen>
    </KeyboardAvoidingView>
  );
}
