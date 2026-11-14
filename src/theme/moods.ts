// 앱 팔레트(usePalette)와 색 도우미(RN에는 CSS color-mix가 없어 JS로 섞는다).
// 앱이 그리는 팔레트(PaletteValue)는 tokens.ts의 두 벌(LIGHT · DARK) 그대로다 — paletteOf.
// 옛 무드 표(MOODS)는 앱이 그리지 않는다. 스토어 스크린샷 도구(tools/store-shots)가 아직 읽어 남긴다.
import type { Mood } from '../types';
import { DARK, LIGHT, moreContrast, type Tokens } from './tokens';

/** 옛 무드 표 한 벌의 모양(예전 앱의 종이 · 먹 · 금색) */
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
  goldInk: string;
  center: string;
}

/** 옛 무드 표 — 앱은 그리지 않는다(화면 모드는 tokens · look.tsx). 저장값 settings.mood의 다섯 이름과 같다 */
export const MOODS: Record<Mood, Palette> = {
  // '연꽃'은 저장값 이름 그대로(화면에는 '미색') — 한지 미색 종이 + 은은한 골드.
  연꽃: {
    bg: '#FBF9F4', surface: '#FFFFFF', card: '#FFFFFF', ink: '#2B2620', sub: '#6F6657',
    faint: '#AAA08D', line: 'rgba(110,85,40,0.12)', tabBg: '#FBF9F4', dark: false,
    gold: '#B0883C', goldInk: '#8B6D34', center: '#2B2620',
  },
  크림: {
    bg: '#F4EEE3', surface: '#FFFFFF', card: '#FFFFFF', ink: '#211F1A', sub: '#6E695E',
    faint: '#A39C8C', line: 'rgba(40,34,20,0.10)', tabBg: '#F7F2E9', dark: false,
    gold: '#B58A3A', goldInk: '#826631', center: '#221F2E',
  },
  화이트: {
    bg: '#EEEFF3', surface: '#FFFFFF', card: '#FFFFFF', ink: '#16171C', sub: '#686B75',
    faint: '#A2A5B0', line: 'rgba(20,22,30,0.09)', tabBg: '#F5F6FA', dark: false,
    gold: '#A8842F', goldInk: '#826632', center: '#1A1A26',
  },
  파스텔: {
    bg: '#F0ECFA', surface: '#FFFFFF', card: '#FFFFFF', ink: '#272040', sub: '#6C6592',
    faint: '#A89FC8', line: 'rgba(50,36,90,0.10)', tabBg: '#F4F0FC', dark: false,
    gold: '#9B82C4', goldInk: '#81653D', center: '#271F44',
  },
  다크: {
    bg: '#0E0D14', surface: '#191824', card: '#1C1B28', ink: '#F1EFEA', sub: '#9C9AAA',
    faint: '#615F72', line: 'rgba(255,255,255,0.11)', tabBg: '#14131E', dark: true,
    gold: '#CBA352', goldInk: '#CBA352', center: '#14121E',
  },
};

// ── color math ──────────────────────────────────────────────────────────────
function parseHex(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 두 색을 t(0~1)만큼 섞는다 — 묶음 목록 줄을 눌렀을 때의 바탕처럼 면 색에서 살짝만 옮길 때 */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseHex(a);
  const [r2, g2, b2] = parseHex(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${c(r1, r2)}, ${c(g1, g2)}, ${c(b1, b2)})`;
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * 'rgb(r, g, b)'(mix의 결과)·'rgba(…)'·'#rgb'·'#rrggbb' → '#RRGGBB'.
 * contrast()처럼 6자리 hex만 받는 곳에 넘길 때 쓴다. 알파는 버린다(겹쳐 그린 색이 필요하면 먼저 섞을 것).
 */
export function toHex(color: string): string {
  const s = color.trim();
  if (HEX_RE.test(s) || /^#[0-9a-f]{8}$/i.test(s)) {
    const [r, g, b] = parseHex(s);
    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  }
  const m = s.match(/-?\d+(\.\d+)?/g);
  if (!m || m.length < 3) return s;
  const ch = m.slice(0, 3).map((x) => Math.min(255, Math.max(0, Math.round(Number(x)))));
  return `#${ch.map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

// ── 앱 팔레트 = 토큰 ──────────────────────────────────────────────────────────
/**
 * usePalette()가 돌려주는 팔레트 — 토큰 이름만(build-plan §2.1). 옛 이름(bg · line · gold …)은 웨이브 4(R2)가 지웠다.
 * sub(= ink2) 하나만 남았다: settings/rows.tsx의 SubHead가 아직 읽는다(SubHead를 부르는 곳은 없다).
 */
export type PaletteValue = Tokens & { sub: string };

/** 토큰 한 벌 → 앱 팔레트 */
export function paletteOf(t: Tokens): PaletteValue {
  return { ...t, sub: t.ink2 };
}

/** 두 벌의 앱 팔레트 — 늘 같은 객체(memo된 화면이 다시 그려지지 않게) */
export const PALETTE: { readonly light: PaletteValue; readonly dark: PaletteValue } = {
  light: paletteOf(LIGHT),
  dark: paletteOf(DARK),
};

/** iOS '대비 증가' 판 — 토큰의 moreContrast(괘선 · 가장자리 · 인쇄 글씨를 한 단계 진하게) */
export function contrastPalette(P: PaletteValue): PaletteValue {
  return paletteOf(moreContrast(P));
}

/** Hex color + 0..1 alpha → rgba(). Pass-through for non-hex. */
export function alpha(color: string, a: number): string {
  if (!color.startsWith('#')) return color;
  const [r, g, b] = parseHex(color);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

