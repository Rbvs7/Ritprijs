import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Banner, Button, Chip, Field, IconButton, Row, Screen, T } from '../components/ui';
import * as repo from '../database/repositories';
import { parseEuroToCents } from '../features/costs/money';
import { EXPENSE_LABELS } from '../features/history/expenses';
import { spacing, useColors } from '../theme';
import type { ExpenseCategory } from '../types/models';
import { newId } from '../utils/id';

export default function ExpenseScreen() {
  const c = useColors();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const [category, setCategory] = useState<ExpenseCategory>('fuel');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10).split('-').reverse().join('-'));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const cents = parseEuroToCents(amount);
    if (cents == null || cents <= 0) return setError('Vul een geldig bedrag in.');
    const m = date.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (!m) return setError('Gebruik de datumnotatie dd-mm-jjjj.');
    const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (Number.isNaN(new Date(iso).getTime())) return setError('Ongeldige datum.');
    if (!vehicleId) return setError('Geen auto geselecteerd.');
    await repo.saveExpense({ id: newId('e_'), vehicleId, date: iso, category, amountCents: cents, note: note.trim() || null, tripId: null });
    router.back();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h1">Uitgave toevoegen</T>
          <IconButton icon="close" label="Sluiten" onPress={() => router.back()} />
        </Row>
        <Row style={{ flexWrap: 'wrap' }} gap={spacing.sm}>
          {(Object.keys(EXPENSE_LABELS) as ExpenseCategory[]).map((k) => (
            <Chip key={k} label={EXPENSE_LABELS[k]} active={category === k} onPress={() => setCategory(k)} />
          ))}
        </Row>
        <Field label="Bedrag" suffix="€" keyboardType="decimal-pad" placeholder="0,00" value={amount} onChangeText={setAmount} autoFocus />
        <Field label="Datum" placeholder="dd-mm-jjjj" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" />
        <Field label="Notitie (optioneel)" value={note} onChangeText={setNote} maxLength={80} />
        {error && <Banner kind="warning">{error}</Banner>}
        <Button title="Opslaan" icon="checkmark" onPress={save} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
