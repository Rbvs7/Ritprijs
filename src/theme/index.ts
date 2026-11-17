import { createContext, useContext } from 'react';

export interface Palette {
  scheme: 'dark' | 'light';
  bg: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  accent: string;
  accentPressed: string;
  onAccent: string;
  accentSoft: string;
  route: string;
  routeAlt: string;
  warning: string;
  warningSoft: string;
  danger: string;
  info: string;
  overlay: string;
}

export const darkPalette: Palette = {
  scheme: 'dark',
  bg: '#0A0F1A',
  surface: '#121A2A',
  surfaceRaised: '#1A2438',
  border: '#24304A',
  text: '#F2F5FA',
  textMuted: '#A3AEC4',
  textSubtle: '#6E7A93',
  accent: '#2EE6B6',
  accentPressed: '#20C79C',
  onAccent: '#04231B',
  accentSoft: 'rgba(46, 230, 182, 0.14)',
  route: '#2EE6B6',
  routeAlt: '#5B6B8C',
  warning: '#FFB547',
  warningSoft: 'rgba(255, 181, 71, 0.14)',
  danger: '#FF6B6B',
  info: '#6EA8FF',
  overlay: 'rgba(5, 8, 15, 0.6)',
};

export const lightPalette: Palette = {
  scheme: 'light',
  bg: '#F3F5F9',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  border: '#DDE3EE',
  text: '#0D1526',
  textMuted: '#4B5772',
  textSubtle: '#7D889F',
  accent: '#00A884',
  accentPressed: '#008F70',
  onAccent: '#FFFFFF',
  accentSoft: 'rgba(0, 168, 132, 0.12)',
  route: '#00A884',
  routeAlt: '#9AA6BE',
  warning: '#B86E00',
  warningSoft: 'rgba(184, 110, 0, 0.12)',
  danger: '#D93838',
  info: '#2F6FDB',
  overlay: 'rgba(13, 21, 38, 0.35)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export const font = {
  hero: { fontSize: 40, fontWeight: '800' as const, letterSpacing: -1 },
  h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700' as const },
  h3: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, fontWeight: '600' as const },
  small: { fontSize: 13, fontWeight: '500' as const },
  tiny: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.4 },
};

export const ThemeContext = createContext<Palette>(darkPalette);
export function useColors(): Palette {
  return useContext(ThemeContext);
}
