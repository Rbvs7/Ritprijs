import type { CarpoolParticipant, SplitCalculation, SplitMethod, SplitShare } from '../../types/models';

export class SplitError extends Error {}

/**
 * Verdeelt een totaalbedrag over deelnemers. De som van alle aandelen is ALTIJD exact gelijk aan het totaal.
 *
 * Restcenten-regel (consistent en voorspelbaar): na het naar beneden afronden krijgen de deelnemers met de
 * grootste afrondingsrest één cent extra; bij gelijke rest gaan passagiers vóór de bestuurder, daarna op volgorde.
 */
export function splitCosts(totalCents: number, participants: CarpoolParticipant[], method: SplitMethod): SplitCalculation {
  if (!Number.isInteger(totalCents) || totalCents < 0) throw new SplitError('Totaalbedrag moet een positief aantal centen zijn.');
  if (participants.length === 0) throw new SplitError('Voeg minimaal één persoon toe.');

  let weights: number[]; // relatieve gewichten per deelnemer
  switch (method) {
    case 'equal':
      weights = participants.map(() => 1);
      break;
    case 'driver_free': {
      const payers = participants.filter((p) => !p.isDriver).length;
      if (payers === 0) throw new SplitError('Er zijn geen passagiers om de kosten te delen.');
      weights = participants.map((p) => (p.isDriver ? 0 : 1));
      break;
    }
    case 'manual_percent': {
      const pcts = participants.map((p) => p.manualPercent ?? 0);
      if (pcts.some((x) => x < 0 || !Number.isFinite(x))) throw new SplitError('Percentages mogen niet negatief zijn.');
      const sum = pcts.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 100) > 0.001) throw new SplitError(`Percentages tellen op tot ${round2(sum)}% in plaats van 100%.`);
      weights = pcts;
      break;
    }
    case 'manual_amount': {
      const amounts = participants.map((p) => p.manualAmountCents ?? 0);
      if (amounts.some((x) => !Number.isInteger(x) || x < 0)) throw new SplitError('Bedragen moeten positief zijn.');
      const sum = amounts.reduce((a, b) => a + b, 0);
      if (sum !== totalCents) {
        throw new SplitError(`De bedragen tellen op tot ${(sum / 100).toFixed(2).replace('.', ',')} in plaats van ${(totalCents / 100).toFixed(2).replace('.', ',')}.`);
      }
      return { method, totalCents, shares: participants.map((p, i) => share(p, amounts[i])) };
    }
  }

  const amounts = allocateByWeights(totalCents, weights, participants.map((p) => p.isDriver));
  return { method, totalCents, shares: participants.map((p, i) => share(p, amounts[i])) };
}

/** Largest-remainder-methode op hele centen. */
export function allocateByWeights(totalCents: number, weights: number[], isDriver: boolean[] = []): number[] {
  const wSum = weights.reduce((a, b) => a + b, 0);
  if (wSum <= 0) throw new SplitError('Niemand betaalt mee.');
  const exact = weights.map((w) => (totalCents * w) / wSum);
  const base = exact.map((x) => Math.floor(x + 1e-9));
  let remainder = totalCents - base.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - base[i], driver: !!isDriver[i], w: weights[i] }))
    .filter((o) => o.w > 0)
    .sort((a, b) => b.frac - a.frac || Number(a.driver) - Number(b.driver) || a.i - b.i);
  for (let k = 0; remainder > 0; k = (k + 1) % order.length) {
    base[order[k].i] += 1;
    remainder -= 1;
  }
  return base;
}

function share(p: CarpoolParticipant, amountCents: number): SplitShare {
  return { participantId: p.id, name: p.name, isDriver: p.isDriver, amountCents };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Maakt een standaardlijst deelnemers: bestuurder + (n-1) passagiers. */
export function makeParticipants(count: number, driverName = 'Bestuurder (jij)'): CarpoolParticipant[] {
  const n = Math.max(1, Math.min(9, Math.floor(count)));
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: i === 0 ? driverName : `Passagier ${i}`,
    isDriver: i === 0,
  }));
}

export interface ShareTextInput {
  originLabel: string;
  destinationLabel: string;
  isReturn: boolean;
  split: SplitCalculation;
  footer: string;
  formatEuro: (c: number) => string;
}

/** Genereert een deelbare tekst op basis van de werkelijke berekening. */
export function buildShareText(i: ShareTextInput): string {
  const payers = i.split.shares.filter((s) => s.amountCents > 0);
  const lines = [
    `Rit ${i.originLabel} → ${i.destinationLabel}${i.isReturn ? ' (retour)' : ''}`,
    `Totale kosten: ${i.formatEuro(i.split.totalCents)}`,
    `Aantal personen: ${i.split.shares.length}`,
  ];
  const amounts = new Set(payers.map((s) => s.amountCents));
  if (amounts.size === 1 && payers.length > 0) {
    const who = i.split.method === 'driver_free' ? 'Per passagier' : 'Per persoon';
    lines.push(`${who}: ${i.formatEuro(payers[0].amountCents)}`);
    if (payers.length !== i.split.shares.length) lines.push('De bestuurder betaalt niet mee.');
  } else {
    lines.push('', 'Verdeling:');
    for (const s of i.split.shares) lines.push(`• ${s.name}: ${i.formatEuro(s.amountCents)}`);
  }
  lines.push('', i.footer);
  return lines.join('\n');
}
