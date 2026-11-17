import { describe, expect, it } from 'vitest';
import { allocateByWeights, buildShareText, makeParticipants, splitCosts, SplitError } from '../src/features/carpool/split';
import { formatEuro } from '../src/features/costs/money';

const sum = (xs: { amountCents: number }[]) => xs.reduce((s, x) => s + x.amountCents, 0);

describe('carpool split', () => {
  it('gelijk verdelen: €36 over 4 = €9', () => {
    const r = splitCosts(3600, makeParticipants(4), 'equal');
    expect(r.shares.map((s) => s.amountCents)).toEqual([900, 900, 900, 900]);
  });
  it('bestuurder rijdt gratis: €36 over 3 passagiers = €12', () => {
    const r = splitCosts(3600, makeParticipants(4), 'driver_free');
    expect(r.shares.map((s) => s.amountCents)).toEqual([0, 1200, 1200, 1200]);
  });
  it('oneven bedrag: som klopt altijd op de cent, passagiers krijgen restcent eerst', () => {
    const r = splitCosts(1000, makeParticipants(3), 'equal');
    expect(sum(r.shares)).toBe(1000);
    expect(r.shares.map((s) => s.amountCents)).toEqual([333, 334, 333]);
  });
  it('som klopt voor veel willekeurige gevallen', () => {
    for (let total = 0; total < 2000; total += 7) {
      for (let n = 1; n <= 8; n++) {
        expect(sum(splitCosts(total, makeParticipants(n), 'equal').shares)).toBe(total);
        if (n > 1) expect(sum(splitCosts(total, makeParticipants(n), 'driver_free').shares)).toBe(total);
      }
    }
  });
  it('handmatige percentages', () => {
    const ps = makeParticipants(3).map((p, i) => ({ ...p, manualPercent: [50, 25, 25][i] }));
    const r = splitCosts(1001, ps, 'manual_percent');
    expect(sum(r.shares)).toBe(1001);
    expect(r.shares[0].amountCents).toBe(501);
  });
  it('percentages die niet op 100 uitkomen worden geweigerd', () => {
    const ps = makeParticipants(2).map((p) => ({ ...p, manualPercent: 40 }));
    expect(() => splitCosts(1000, ps, 'manual_percent')).toThrow(SplitError);
  });
  it('handmatige bedragen moeten exact optellen', () => {
    const ps = makeParticipants(2).map((p, i) => ({ ...p, manualAmountCents: [600, 400][i] }));
    expect(splitCosts(1000, ps, 'manual_amount').shares.map((s) => s.amountCents)).toEqual([600, 400]);
    const bad = makeParticipants(2).map((p) => ({ ...p, manualAmountCents: 400 }));
    expect(() => splitCosts(1000, bad, 'manual_amount')).toThrow(/tellen op/);
  });
  it('alleen bestuurder + bestuurder gratis = fout', () => {
    expect(() => splitCosts(1000, makeParticipants(1), 'driver_free')).toThrow(SplitError);
  });
  it('ongeldige invoer wordt geweigerd', () => {
    expect(() => splitCosts(-1, makeParticipants(2), 'equal')).toThrow();
    expect(() => splitCosts(10.5, makeParticipants(2), 'equal')).toThrow();
    expect(() => splitCosts(100, [], 'equal')).toThrow();
  });
  it('allocateByWeights verdeelt restcenten op grootste rest', () => {
    expect(allocateByWeights(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocateByWeights(0, [1, 2])).toEqual([0, 0]);
  });
  it('deeltekst bevat de werkelijke berekening', () => {
    const split = splitCosts(3240, makeParticipants(3), 'equal');
    const t = buildShareText({ originLabel: 'Rotterdam', destinationLabel: 'Amsterdam', isReturn: false, split, footer: 'Berekend met RitPrijs.', formatEuro });
    expect(t).toContain('Rit Rotterdam → Amsterdam');
    expect(t).toMatch(/Totale kosten: €\s?32,40/);
    expect(t).toContain('Aantal personen: 3');
    expect(t).toMatch(/Per persoon: €\s?10,80/);
    expect(t).toContain('Berekend met RitPrijs.');
  });
});
