// 앱 팔레트(usePalette)와 색 도우미(RN에는 CSS color-mix가 없어 JS로 섞는다).
// 앱이 그리는 팔레트(PaletteValue)는 tokens.ts의 두 벌(LIGHT · DARK) 그대로다 — paletteOf.
// 예전 무드 표(MOODS)는 웨이브 4(R2)가 지웠다. 저장값 settings.mood는 그리지 않고, 처음 화면 모드를 정할 때 한 번 읽는다(lib/look lookFromMood).
import { DARK, LIGHT, moreContrast, type Tokens } from './tokens';

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
/** usePalette()가 돌려주는 팔레트 — 토큰 이름만(build-plan §2.1). 옛 이름(bg · sub · line · gold …)은 웨이브 4(R2)가 지웠다 */
export type PaletteValue = Tokens;

/** 토큰 한 벌 → 앱 팔레트(새 객체 — PALETTE가 두 벌을 한 번만 만든다) */
export function paletteOf(t: Tokens): PaletteValue {
  return { ...t };
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

