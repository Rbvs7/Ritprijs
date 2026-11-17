/**
 * Herkenning en normalisatie van Nederlandse kentekens (sidecodes 1–14).
 * Normaliseren: hoofdletters, zonder streepjes/spaties → "GJ433K".
 * Weergeven: met streepjes volgens de sidecode → "GJ-433-K".
 */

// L = letter, D = cijfer. Groepering per sidecode.
const SIDECODES: { pattern: string; groups: number[] }[] = [
  { pattern: 'LLDDDD', groups: [2, 2, 2] }, // 1
  { pattern: 'DDDDLL', groups: [2, 2, 2] }, // 2
  { pattern: 'DDLLDD', groups: [2, 2, 2] }, // 3
  { pattern: 'LLDDLL', groups: [2, 2, 2] }, // 4
  { pattern: 'LLLLDD', groups: [2, 2, 2] }, // 5
  { pattern: 'DDLLLL', groups: [2, 2, 2] }, // 6
  { pattern: 'DDLLLD', groups: [2, 3, 1] }, // 7
  { pattern: 'DLLLDD', groups: [1, 3, 2] }, // 8
  { pattern: 'LLDDDL', groups: [2, 3, 1] }, // 9
  { pattern: 'LDDDLL', groups: [1, 3, 2] }, // 10
  { pattern: 'LLLDDL', groups: [3, 2, 1] }, // 11
  { pattern: 'LDDLLL', groups: [1, 2, 3] }, // 12
  { pattern: 'DLLDDD', groups: [1, 2, 3] }, // 13
  { pattern: 'DDDLLD', groups: [3, 2, 1] }, // 14
];

export function normalizePlate(input: string): string {
  return (input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function shape(p: string): string {
  return p.replace(/[A-Z]/g, 'L').replace(/[0-9]/g, 'D');
}

/** Geeft het sidecode-nummer (1–14) of null als het geen geldig NL-kenteken is. */
export function sidecode(input: string): number | null {
  const p = normalizePlate(input);
  if (p.length !== 6) return null;
  const idx = SIDECODES.findIndex((s) => s.pattern === shape(p));
  return idx === -1 ? null : idx + 1;
}

export function isValidDutchPlate(input: string): boolean {
  return sidecode(input) !== null;
}

export function formatPlate(input: string): string {
  const p = normalizePlate(input);
  const sc = sidecode(p);
  if (sc == null) return p;
  const groups = SIDECODES[sc - 1].groups;
  const parts: string[] = [];
  let i = 0;
  for (const g of groups) {
    parts.push(p.slice(i, i + g));
    i += g;
  }
  return parts.join('-');
}
