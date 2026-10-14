// Mood palettes + color helpers (RN has no CSS color-mix, so we mix in JS).
import type { Mood } from '../types';
import { GOLD, contrast } from './palette';

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
  /**
   * 글씨로 쓰는 금색 — 바탕·면·탭바 위 모두 4.6:1 이상(M.gold는 표시용이라 글씨로는 흐리다).
   * 무드 표의 값은 기본 포인트 컬러(골드)용. 앱이 쓰는 팔레트는 withAccent()가 지금 고른 포인트 컬러로 다시 맞춘다.
   */
  goldInk: string;
  center: string;
}

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
 * 'rgb(r, g, b)'(mix·tint의 결과)·'rgba(…)'·'#rgb'·'#rrggbb' → '#RRGGBB'.
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

/**
 * 영역 색을 글씨로 쓸 때의 색 — 영역 색 그대로는 미색 바탕 위에서 3.9~4.4:1이라 AA에 못 미친다.
 * 밝은 무드: 먹색 쪽으로 22%, 다크: 흰색 쪽으로 35%. 8영역 × 5무드 모두 바탕·면 위 5.1:1 이상(tests/contrast).
 * 쑥·연지와 같은 SEMANTIC.done·danger에도 그대로 쓸 수 있다.
 */
export function areaInk(color: string, M: Pick<Palette, 'dark' | 'ink'>): string {
  return M.dark ? toHex(mix(color, '#FFFFFF', 0.35)) : toHex(mix(color, M.ink, 0.22));
}

// ── 포인트 컬러를 글씨로 ──────────────────────────────────────────────────────
/** 글씨 색 목표 대비 — AA 4.5에 반올림·렌더링 여유를 조금 둔다 */
const INK_TARGET = 4.6;

/** 기본 골드는 무드마다 손으로 맞춘 값을 쓴다(바탕색으로 무드를 알아본다) */
const GOLD_INK_BY_BG = new Map(Object.values(MOODS).map((p) => [p.bg, p.goldInk] as const));

const accentInkCache = new Map<string, string>();

type AccentGround = Pick<Palette, 'bg' | 'surface' | 'card' | 'tabBg' | 'dark' | 'goldInk'> & { accent: string };

/**
 * 지금 고른 포인트 컬러(M.accent)를 글씨로 쓸 때의 색.
 * 같은 색조를 지키며 밝은 무드에서는 검정 쪽으로, 다크에서는 흰색 쪽으로 필요한 만큼만 옮겨
 * 바탕·면·카드·탭바 위 모두 4.6:1 이상이 되는 가장 가까운 색을 고른다(이미 넉넉하면 그대로).
 * - 기본 골드: 무드 표의 goldInk(손으로 맞춘 값).
 * - hex가 아닌 값: M.goldInk.
 * 같은 입력은 한 번만 계산한다.
 */
export function accentInk(M: AccentGround): string {
  if (!HEX_RE.test(M.accent.trim())) return M.goldInk;
  const accent = toHex(M.accent);
  if (accent === GOLD) {
    const tuned = GOLD_INK_BY_BG.get(M.bg);
    if (tuned) return tuned;
  }
  const key = `${accent}|${M.bg}|${M.surface}|${M.card}|${M.tabBg}|${M.dark ? 1 : 0}`;
  const hit = accentInkCache.get(key);
  if (hit) return hit;
  const grounds = [M.bg, M.surface, M.card, M.tabBg].map(toHex);
  const toward = M.dark ? '#FFFFFF' : '#000000';
  let out = toward;
  for (let i = 0; i <= 100; i++) {
    const c = toHex(mix(accent, toward, i / 100));
    if (grounds.every((g) => contrast(c, g) >= INK_TARGET)) { out = c; break; }
  }
  accentInkCache.set(key, out);
  return out;
}

/**
 * 무드 팔레트 + 포인트 컬러 → 앱이 쓰는 팔레트. 무드나 포인트 컬러가 바뀔 때만 부른다.
 * - goldInk: 지금 포인트 컬러의 글씨 색(골드를 고르면 무드 표의 값 그대로).
 * - gold: 표의 표시(오늘 칸·8/8 테두리·범례·통계 막대)가 쓰는 포인트 색 — 골드가 아니면 고른 색 그대로,
 *   골드면 무드마다 맞춘 금색. 표시는 모두 legibleMark(M.gold, …)를 거쳐 바탕 위 3:1을 지킨다.
 * P는 무드 표의 팔레트(MOODS[mood])여야 한다 — 이미 맞춘 팔레트에 골드를 다시 적용하면 gold가 되돌아가지 않는다.
 */
export function withAccent(P: Palette, accent: string): Palette & { accent: string } {
  const M = { ...P, accent };
  M.goldInk = accentInk(M);
  if (HEX_RE.test(accent.trim()) && toHex(accent) !== GOLD) M.gold = toHex(accent);
  return M;
}

// ── 대비 증가(Increase Contrast) ────────────────────────────────────────────
/** 'rgba(r,g,b,a)'의 알파만 k배(최대 1). 알파가 없는 색은 그대로 */
function scaleAlpha(color: string, k: number): string {
  const m = color.trim().match(/^rgba\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([\d.]+)\s*\)$/i);
  if (!m) return color;
  const a = Math.min(1, Number(m[4]) * k);
  return `rgba(${m[1].trim()},${m[2].trim()},${m[3].trim()},${Number(a.toFixed(3))})`;
}

/**
 * 먹을 진하게 한 판 — iOS '대비 증가'가 켜졌을 때 usePalette()가 돌려준다.
 * 같은 종이에 더 진한 펜으로 그린 수첩처럼: 괘선(line)의 알파 2배, 흐린 글씨(faint)는 보조 글씨(sub)로.
 * 색·포인트 컬러·종이는 그대로 두어 화면의 모양은 바뀌지 않는다.
 */
export function contrastEdition<T extends Palette>(P: T): T {
  return { ...P, line: scaleAlpha(P.line, 2), faint: P.sub };
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
