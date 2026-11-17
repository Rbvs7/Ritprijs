import React, { useState } from 'react';
import { View } from 'react-native';
import { centsToInput, formatDecimal, parseDecimal, parseEuroToCents } from '../features/costs/money';
import { FUEL_LABELS } from '../features/vehicles/factory';
import { spacing } from '../theme';
import type { FuelType, VehicleCostProfile } from '../types/models';
import { Chip, Field, Row } from './ui';

export function FuelTypePicker({ value, onChange }: { value: FuelType; onChange: (f: FuelType) => void }) {
  return (
    <Row style={{ flexWrap: 'wrap' }} gap={spacing.sm}>
      {(Object.keys(FUEL_LABELS) as FuelType[]).map((f) => (
        <Chip key={f} label={FUEL_LABELS[f]} active={value === f} onPress={() => onChange(f)} />
      ))}
    </Row>
  );
}

type P = VehicleCostProfile;
type NumKey = { [K in keyof P]: P[K] extends number | null ? K : never }[keyof P];

/**
 * Numeriek invoerveld gekoppeld aan een profielveld. Wijzigen markeert de herkomst als "zelf ingevuld".
 * kind: 'decimal' (getal), 'euro' (bedrag → centen), 'centsPerKm' (invoer in euro/km → centen/km)
 */
export function ProfileField({
  profile,
  onChange,
  k,
  label,
  suffix,
  kind = 'decimal',
  hint,
  placeholder,
}: {
  profile: P;
  onChange: (p: P) => void;
  k: NumKey;
  label: string;
  suffix?: string;
  kind?: 'decimal' | 'euro' | 'int';
  hint?: string;
  placeholder?: string;
}) {
  const value = profile[k] as number | null;
  const toText = (v: number | null) => (v == null ? '' : kind === 'euro' ? centsToInput(v) : formatDecimal(v, 3));
  const [text, setText] = useState(toText(value));
  const [error, setError] = useState<string | null>(null);

  return (
    <Field
      label={label}
      suffix={suffix}
      hint={hint}
      error={error}
      placeholder={placeholder ?? 'Niet ingevuld'}
      source={value != null ? profile.sources[k] : undefined}
      keyboardType="decimal-pad"
      value={text}
      onChangeText={(t) => {
        setText(t);
        if (t.trim() === '') {
          setError(null);
          onChange({ ...profile, [k]: null, sources: { ...profile.sources, [k]: undefined } });
          return;
        }
        const n = kind === 'euro' ? parseEuroToCents(t) : parseDecimal(t);
        if (n == null || n < 0) {
          setError('Ongeldige waarde');
          return;
        }
        setError(null);
        onChange({ ...profile, [k]: kind === 'int' ? Math.round(n) : n, sources: { ...profile.sources, [k]: 'user' } });
      }}
    />
  );
}

export function EnergyFields({ fuelType, profile, onChange }: { fuelType: FuelType; profile: P; onChange: (p: P) => void }) {
  const fuel = fuelType !== 'electric';
  const elec = fuelType === 'electric' || fuelType === 'plugin_hybrid';
  return (
    <View style={{ gap: spacing.md }}>
      {fuel && <ProfileField profile={profile} onChange={onChange} k="consumptionL100" label="Brandstofverbruik" suffix="l / 100 km" placeholder="bijv. 6,5" />}
      {elec && <ProfileField profile={profile} onChange={onChange} k="consumptionKwh100" label="Stroomverbruik" suffix="kWh / 100 km" placeholder="bijv. 17" />}
      {fuelType === 'plugin_hybrid' && (
        <ProfileField profile={profile} onChange={onChange} k="electricSharePct" label="Deel elektrisch gereden" suffix="%" hint="Welk deel van je kilometers rijd je elektrisch?" />
      )}
    </View>
  );
}

export function PriceFields({ fuelType, profile, onChange }: { fuelType: FuelType; profile: P; onChange: (p: P) => void }) {
  const fuel = fuelType !== 'electric';
  const elec = fuelType === 'electric' || fuelType === 'plugin_hybrid';
  return (
    <View style={{ gap: spacing.md }}>
      {fuel && (
        <ProfileField
          profile={profile}
          onChange={onChange}
          k="fuelPricePerLiterCents"
          kind="euro"
          label={`Prijs per liter ${fuelType === 'diesel' ? 'diesel' : fuelType === 'lpg' ? 'LPG' : 'benzine'}`}
          suffix="€ / l"
          hint="Vul de prijs in die je bij je laatste tankbeurt betaalde."
        />
      )}
      {elec && (
        <>
          <ProfileField profile={profile} onChange={onChange} k="electricityHomeCentsPerKwh" kind="euro" label="Stroomprijs thuis" suffix="€ / kWh" />
          <ProfileField profile={profile} onChange={onChange} k="electricityPublicCentsPerKwh" kind="euro" label="Stroomprijs openbaar laden" suffix="€ / kWh" />
          <ProfileField profile={profile} onChange={onChange} k="homeChargingPct" label="Deel thuis geladen" suffix="%" />
          <ProfileField profile={profile} onChange={onChange} k="chargingLossPct" label="Laadverlies" suffix="%" hint="Energie die bij het laden verloren gaat (meestal 5–15%)." />
        </>
      )}
    </View>
  );
}
