// 종이 무늬 — 순수 모듈. 무지(기본) · 점 · 모눈 · 줄(docs/design/build-plan.md §2.6).
// 저장값은 settings.paper(없으면 무지). 고른 것은 무지 · 점까지 그대로 적는다.
// 모눈 · 줄은 프로 — 프로가 없으면 저장값은 남겨 두고 무지로 그린다(proValue). 1.0은 판매를 꺼서(STORE_OPEN) 모두 열려 있다.
import { PAPER_OPTS } from '../data/defaults';
import { GEO } from '../theme/tokens';
import type { PaperPattern } from '../types';
import { proValue } from './pro';

/** 화면이 그리는 무늬 — 저장값과 같은 네 가지(예전 이름을 남겨 둔다) */
export type DrawnPattern = PaperPattern;

/** 저장값이 없을 때(새 문서 · 예전에 고르지 않음) */
export const DEFAULT_PATTERN: PaperPattern = 'blank';

/** 설정 화면의 차례 — 무지(기본) · 점 · 모눈 · 줄 */
export const PAPER_CHOICES: readonly PaperPattern[] = PAPER_OPTS;

/** 이 무늬가 프로 선택인가 — 모눈 · 줄 */
export const isProPattern = (p: DrawnPattern): boolean => p === 'grid' || p === 'lines';

/** 저장값 → 고른 무늬(모르는 값 · 없음은 무지) */
export function storedPattern(stored: unknown): PaperPattern {
  return PAPER_OPTS.includes(stored as PaperPattern) ? (stored as PaperPattern) : DEFAULT_PATTERN;
}

/** 그릴 무늬 — 저장된 프로 무늬는 프로가 있을 때만, 아니면 무지 */
export function drawnPattern(stored: PaperPattern | undefined, owned: boolean): DrawnPattern {
  return proValue<DrawnPattern>(storedPattern(stored), DEFAULT_PATTERN, isProPattern, owned);
}

/** 고른 무늬 → 저장값 — 무지 · 점도 그대로 적는다(고른 것이 분명하게 남게) */
export function patternSetting(p: DrawnPattern): PaperPattern {
  return p;
}

/**
 * 무늬 한 칸(pt) — 화면 여백(24)과 같은 박자. 점 · 선의 세로 한 줄이 여백 선에 서고,
 * 가로 줄은 머리(72 = 3칸) 아래에 맞는다.
 */
export const PAPER_MODULE = GEO.gutter;

/** 점의 반지름(pt) */
export const DOT_R = 0.8;

/** 선 하나(가로 또는 세로) */
export interface PaperLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * 무늬의 선 — w × h 안에서 gap마다 하나씩, 점 종이의 점이 서는 자리(gap/2 + k·gap)를 지난다.
 * 그래서 같은 offset으로 깔면 줄과 모눈이 점 종이와 같은 박자(내용의 줄)에 놓인다.
 * - grid: 가로 · 세로 가는 선(가로 먼저)
 * - lines: 가로 줄만
 * - dots · blank: 선 없음(점은 PaperDots가 동그라미로 찍는다)
 */
export function patternLines(kind: DrawnPattern, w: number, h: number, gap: number): PaperLine[] {
  if (kind !== 'grid' && kind !== 'lines') return [];
  if (!(gap > 0) || !(w > 0) || !(h > 0)) return [];
  const out: PaperLine[] = [];
  for (let y = gap / 2; y < h; y += gap) out.push({ x1: 0, y1: y, x2: w, y2: y });
  if (kind === 'grid') for (let x = gap / 2; x < w; x += gap) out.push({ x1: x, y1: 0, x2: x, y2: h });
  return out;
}

/** 선의 굵기(pt) — 머리카락 선. 점(반지름 0.8)보다 가늘어 글씨 뒤에서 조용하다 */
export const PATTERN_STROKE = 0.5;

/**
 * 무늬 한 장(Pattern)의 시작점 — 점 · 선은 칸의 가운데(gap/2)에 서므로, 세로 한 줄이 x = at에, 가로 한 줄이 y = at에 오도록
 * 반 칸 당겨 놓는다(0 ≤ 값 < gap).
 */
export function patternOrigin(at: number, gap: number): number {
  if (!(gap > 0) || !Number.isFinite(at)) return 0;
  return (((at - gap / 2) % gap) + gap) % gap;
}

/**
 * 무늬의 색(토큰) — 점은 printMid, 모눈 · 줄은 printRule. iOS '대비 증가'에서는 한 단계씩 진하게(점 printEdge, 선 printMid).
 * 토큰은 기본 판(LIGHT · DARK)의 값을 넘긴다(대비 증가 판의 printEdge는 ink2라 점이 너무 진하다).
 */
export function patternInk(kind: DrawnPattern, t: { printEdge: string; printMid: string; printRule: string }, more: boolean): string {
  if (kind === 'dots') return more ? t.printEdge : t.printMid;
  return more ? t.printMid : t.printRule;
}
