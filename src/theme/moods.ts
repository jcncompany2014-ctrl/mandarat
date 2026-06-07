// Mood palettes + color helpers (RN has no CSS color-mix, so we mix in JS).
import type { Mood } from '../types';

export interface Palette {
  bg: string;
  surface: string;
  card: string;
  ink: string;
  sub: string;
  faint: string;
  line: string;
  tabBg: string;
  dark: boolean;
  gold: string;
  center: string;
  hero: readonly [string, string, string]; // gradient stops
}

export const MOODS: Record<Mood, Palette> = {
  크림: {
    bg: '#F4EEE3', surface: '#FFFFFF', card: '#FFFFFF', ink: '#211F1A', sub: '#6E695E',
    faint: '#A39C8C', line: 'rgba(40,34,20,0.10)', tabBg: 'rgba(247,242,233,0.97)', dark: false,
    gold: '#B58A3A', center: '#221F2E', hero: ['#2D2747', '#211B33', '#1A1528'],
  },
  화이트: {
    bg: '#EEEFF3', surface: '#FFFFFF', card: '#FFFFFF', ink: '#16171C', sub: '#6B6E78',
    faint: '#A2A5B0', line: 'rgba(20,22,30,0.09)', tabBg: 'rgba(245,246,250,0.97)', dark: false,
    gold: '#A8842F', center: '#1A1A26', hero: ['#262442', '#1A1930', '#141324'],
  },
  파스텔: {
    bg: '#F0ECFA', surface: '#FFFFFF', card: '#FFFFFF', ink: '#272040', sub: '#6E6794',
    faint: '#A89FC8', line: 'rgba(50,36,90,0.10)', tabBg: 'rgba(244,240,252,0.96)', dark: false,
    gold: '#9B82C4', center: '#271F44', hero: ['#3A2F66', '#2A2150', '#221A42'],
  },
  다크: {
    bg: '#0E0D14', surface: '#191824', card: '#1C1B28', ink: '#F1EFEA', sub: '#9C9AAA',
    faint: '#615F72', line: 'rgba(255,255,255,0.11)', tabBg: 'rgba(20,19,30,0.96)', dark: true,
    gold: '#CBA352', center: '#14121E', hero: ['#221F33', '#171523', '#100E1A'],
  },
};

// ── color math ──────────────────────────────────────────────────────────────
function parseHex(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mix `color` `amt`% with a light/dark base — replacement for CSS color-mix. */
export function tint(color: string, amt: number, dark = false): string {
  const base = dark ? '#1C1C22' : '#ffffff';
  const [r1, g1, b1] = parseHex(color);
  const [r2, g2, b2] = parseHex(base);
  const f = amt / 100;
  const r = Math.round(r1 * f + r2 * (1 - f));
  const g = Math.round(g1 * f + g2 * (1 - f));
  const b = Math.round(b1 * f + b2 * (1 - f));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Hex color + 0..1 alpha → rgba(). Pass-through for non-hex. */
export function alpha(color: string, a: number): string {
  if (!color.startsWith('#')) return color;
  const [r, g, b] = parseHex(color);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Mix `color` `pct`% with transparent — for heatmap intensity. */
export function fade(color: string, pct: number): string {
  return alpha(color, pct / 100);
}
