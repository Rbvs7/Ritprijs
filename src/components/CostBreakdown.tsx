import React from 'react';
import { View } from 'react-native';
import type { TripCostResult } from '../features/costs/tripCost';
import { formatEuro } from '../features/costs/money';
import { spacing } from '../theme';
import { Banner, KeyValue, SourceBadge, T } from './ui';

export function CostBreakdown({ result }: { result: TripCostResult }) {
  const unknownAllocated = result.lines.filter((l) => l.nature === 'allocated' && l.cents == null).map((l) => l.label.toLowerCase());
  return (
    <View style={{ gap: spacing.sm }}>
      {result.lines.map((l) =>
        l.cents == null ? null : (
          <View key={l.key}>
            <KeyValue k={l.label} v={formatEuro(l.cents)} badge={<SourceBadge source={l.certainty === 'user' ? 'user' : 'estimate'} />} />
            {l.note && (
              <T v="small" color="subtle">
                {l.note}
              </T>
            )}
          </View>
        ),
      )}
      {unknownAllocated.length > 0 && (
        <T v="small" color="subtle">
          Niet meegerekend (nog niet ingevuld): {unknownAllocated.join(', ')}.
        </T>
      )}
      {result.missing.length > 0 && <Banner kind="warning">{`Kosten niet te berekenen: ${result.missing.join(', ').toLowerCase()} ontbreekt. Vul dit aan bij "Mijn Auto".`}</Banner>}
    </View>
  );
}
