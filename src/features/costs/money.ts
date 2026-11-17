/**
 * Geld-hulpfuncties. Bedragen worden als gehele centen opgeslagen.
 * Tussenresultaten (bijv. km × verbruik × prijs) mogen fracties van centen zijn;
 * we ronden pas af wanneer een bedrag "af" is (één keer per kostenpost).
 */

/** Rondt af op hele centen, half-up, robuust tegen float-ruis (bv. 2362.4999999 → 2363 als het 2362.5 hoort te zijn). */
export function roundCents(value: number): number {
  if (!Number.isFinite(value)) throw new Error('Ongeldig bedrag');
  const cleaned = Math.round(value * 1e6) / 1e6;
  const sign = cleaned < 0 ? -1 : 1;
  return sign * Math.floor(Math.abs(cleaned) + 0.5);
}

const formatter = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1084 → "€ 10,84", met harde spatie zodat "€" en het bedrag nooit over twee regels breken. */
export function formatEuro(cents: number): string {
  return formatter.format(cents / 100).replace(/\s/g, '\u00a0');
}

/** Parseert gebruikersinvoer als "2,10", "€ 2.10", "1.234,56" → centen. Geeft null bij ongeldige invoer. */
export function parseEuroToCents(input: string): number | null {
  if (input == null) return null;
  let s = String(input).trim().replace(/[€\s]/g, '');
  if (s === '') return null;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // Laatste scheidingsteken is het decimaalteken
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (hasComma) {
    s = s.replace(',', '.');
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return roundCents(n * 100);
}

/** Parseert een decimaal getal met komma of punt ("7,2" → 7.2). */
export function parseDecimal(input: string): number | null {
  if (input == null) return null;
  const s = String(input).trim().replace(',', '.');
  if (s === '' || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function formatDecimal(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return '';
  return n.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}
