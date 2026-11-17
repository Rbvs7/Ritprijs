import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { getRoutingProvider } from '../features/navigation';
import { errorMessage } from '../services/http';
import { font, radius, spacing, useColors } from '../theme';
import type { LatLng, Place, SavedPlace } from '../types/models';
import { Banner, Row, T, tap } from './ui';

/**
 * Zoekpaneel voor een plaats/adres. Bij een provider zonder autocomplete (OSM) wordt gezocht na "Zoek".
 * Bij een provider met autocomplete wordt na 400 ms pauze automatisch gezocht (debounce).
 */
export function PlaceSearch({
  title,
  near,
  saved,
  allowCurrentLocation,
  onPick,
  onPickCurrentLocation,
  onCancel,
}: {
  title: string;
  near: LatLng | null;
  saved: SavedPlace[];
  allowCurrentLocation?: boolean;
  onPick: (p: Place) => void;
  onPickCurrentLocation?: () => void;
  onCancel: () => void;
}) {
  const c = useColors();
  const provider = getRoutingProvider();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function search(text = q) {
    if (text.trim().length < 2) return;
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    setLoading(true);
    setError(null);
    try {
      const r = await provider.searchPlaces(text, near, ctl.signal);
      if (!ctl.signal.aborted) setResults(r);
    } catch (e) {
      if (!ctl.signal.aborted) setError(errorMessage(e));
    } finally {
      if (!ctl.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    if (!provider.capabilities.autocomplete || q.trim().length < 3) return;
    const t = setTimeout(() => search(q), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => () => abort.current?.abort(), []);

  const favorites = saved.filter((s) => s.kind !== 'recent');
  const recents = saved.filter((s) => s.kind === 'recent');

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Row>
          <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="Annuleren" hitSlop={10}>
            <Ionicons name="arrow-back" size={26} color={c.text} />
          </Pressable>
          <T v="h3">{title}</T>
        </Row>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, paddingLeft: spacing.md, minHeight: 54 }}>
          <Ionicons name="search" size={20} color={c.textSubtle} />
          <TextInput
            autoFocus
            value={q}
            onChangeText={setQ}
            placeholder="Adres, plaats of locatie"
            placeholderTextColor={c.textSubtle}
            returnKeyType="search"
            onSubmitEditing={() => search()}
            style={[font.body, { flex: 1, color: c.text, paddingHorizontal: spacing.md, paddingVertical: 14 }]}
            accessibilityLabel="Zoek een adres"
          />
          {loading ? (
            <ActivityIndicator color={c.accent} style={{ marginRight: spacing.md }} />
          ) : q.length > 0 ? (
            <Pressable onPress={() => search()} style={{ paddingHorizontal: spacing.md, alignSelf: 'stretch', justifyContent: 'center' }} accessibilityRole="button">
              <T v="bodyStrong" color="accent">
                Zoek
              </T>
            </Pressable>
          ) : null}
        </View>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 80, gap: 2 }}>
        {error && <Banner kind="warning">{error}</Banner>}
        {allowCurrentLocation && onPickCurrentLocation && !results && <ResultRow icon="locate" title="Huidige locatie" subtitle="Gebruik je GPS-positie" onPress={onPickCurrentLocation} />}
        {results?.length === 0 && (
          <T color="muted" style={{ padding: spacing.md }}>
            Niets gevonden. Probeer een ander adres of voeg de plaatsnaam toe.
          </T>
        )}
        {results?.map((p) => <ResultRow key={p.id} icon="location" title={p.label} subtitle={p.address} onPress={() => onPick(p)} />)}
        {!results && favorites.length > 0 && (
          <T v="tiny" color="subtle" style={{ marginTop: spacing.md, textTransform: 'uppercase' }}>
            Favorieten
          </T>
        )}
        {!results && favorites.map((p) => <ResultRow key={p.id} icon={p.kind === 'home' ? 'home' : p.kind === 'work' ? 'briefcase' : 'star'} title={p.label} subtitle={p.address} onPress={() => onPick(p)} />)}
        {!results && recents.length > 0 && (
          <T v="tiny" color="subtle" style={{ marginTop: spacing.md, textTransform: 'uppercase' }}>
            Recent
          </T>
        )}
        {!results && recents.map((p) => <ResultRow key={p.id} icon="time" title={p.label} subtitle={p.address} onPress={() => onPick(p)} />)}
        {!provider.capabilities.autocomplete && !results && (
          <T v="small" color="subtle" style={{ marginTop: spacing.lg }}>
            Typ een adres en tik op “Zoek”. {provider.capabilities.attribution}
          </T>
        )}
      </ScrollView>
    </View>
  );
}

function ResultRow({ icon, title, subtitle, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; subtitle?: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 14, paddingHorizontal: spacing.sm, borderRadius: radius.md, backgroundColor: pressed ? c.surface : 'transparent' })}
    >
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={20} color={c.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="bodyStrong" numberOfLines={1}>
          {title}
        </T>
        {subtitle ? (
          <T v="small" color="muted" numberOfLines={1}>
            {subtitle}
          </T>
        ) : null}
      </View>
    </Pressable>
  );
}
