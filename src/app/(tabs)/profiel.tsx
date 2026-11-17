import Constants from 'expo-constants';
import { router } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';
import { Button, Card, Divider, Row, Screen, SectionTitle, Segmented, T, ToggleRow } from '../../components/ui';
import { APP_CONFIG } from '../../config/app';
import * as repo from '../../database/repositories';
import { formatEuro } from '../../features/costs/money';
import { getRoutingProvider } from '../../features/navigation';
import { useApp } from '../../state/AppState';

export default function ProfileScreen() {
  const { prefs, updatePrefs, wipeEverything } = useApp();
  const provider = getRoutingProvider();

  function confirmWipe() {
    Alert.alert('Alle gegevens wissen?', "Je auto’s, ritten, uitgaven, opgeslagen plaatsen en instellingen worden definitief van dit toestel verwijderd.", [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Alles wissen',
        style: 'destructive',
        onPress: async () => {
          await wipeEverything();
          router.replace('/onboarding');
        },
      },
    ]);
  }

  return (
    <Screen>
      <T v="h1">Profiel</T>

      <SectionTitle>Weergave</SectionTitle>
      <Card>
        <T v="small" color="muted">
          Thema
        </T>
        <Segmented
          value={prefs.theme}
          onChange={(theme) => updatePrefs({ theme })}
          options={[
            { key: 'system', label: 'Automatisch' },
            { key: 'dark', label: 'Donker' },
            { key: 'light', label: 'Licht' },
          ]}
        />
        <T v="small" color="muted">
          Standaard kostenweergave
        </T>
        <Segmented
          value={prefs.defaultCostMode}
          onChange={(defaultCostMode) => updatePrefs({ defaultCostMode })}
          options={[
            { key: 'direct', label: 'Directe kosten' },
            { key: 'total', label: 'Totale kosten' },
          ]}
        />
        <T v="small" color="subtle">
          Eenheden: kilometers, liters, kWh en euro.
        </T>
      </Card>

      <SectionTitle>{`${APP_CONFIG.name} Pro`}</SectionTitle>
      <Card>
        <T v="bodyStrong">Binnenkort beschikbaar · {formatEuro(APP_CONFIG.proPriceCents)} eenmalig</T>
        <T v="small" color="muted">
          Meerdere auto’s, uitgebreide carpoolverdelingen, export naar CSV/PDF, extra statistieken en geen advertenties. In deze testversie zijn alle functies gratis te gebruiken.
        </T>
      </Card>

      <SectionTitle>Privacy</SectionTitle>
      <Card>
        <ToggleRow label="Recente bestemmingen onthouden" value={prefs.saveRecentPlaces} onChange={(b) => updatePrefs({ saveRecentPlaces: b })} />
        <Button
          small
          kind="secondary"
          title="Recente bestemmingen wissen"
          onPress={() => repo.clearRecentPlaces().then(() => Alert.alert('Gewist', 'Je recente bestemmingen zijn verwijderd.'))}
        />
        <Divider />
        <T v="small" color="muted">
          Al je gegevens staan alleen op dit toestel. Je locatie wordt alleen gebruikt terwijl de app open is, om een route te berekenen. We bewaren geen locatiegeschiedenis. Zoekopdrachten en routes worden naar de routeprovider gestuurd ({provider.capabilities.name}); kentekens naar de RDW.
        </T>
        <Button kind="danger" icon="trash" title="Alle gegevens wissen" onPress={confirmWipe} />
      </Card>

      <SectionTitle>Over</SectionTitle>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="bodyStrong">{APP_CONFIG.name}</T>
          <T color="muted">versie {Constants.expoConfig?.version ?? '–'}</T>
        </Row>
        <T v="small" color="muted">
          {APP_CONFIG.slogan}
        </T>
        <T v="small" color="subtle">
          Routes: {provider.capabilities.name}. {provider.capabilities.attribution}. Voertuiggegevens: RDW Open Data. Alle kostenberekeningen zijn schattingen.
        </T>
      </Card>
    </Screen>
  );
}
