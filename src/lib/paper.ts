// 종이 무늬 — 순수 모듈. 점(무료 기본) · 모눈 · 줄 · 무지(프로, docs/v2/plan.md §2.9).
// 저장값은 settings.paper(없으면 점). 프로가 없으면 저장값은 남겨 두고 점으로 그린다(proValue).
import { PAPER_OPTS } from '../data/defaults';
import type { PaperPattern } from '../types';
import { proValue } from './pro';

/** 화면이 그리는 무늬 — 'dots'는 저장하지 않는 무료 기본값 */
export type DrawnPattern = 'dots' | PaperPattern;

/** 설정 화면의 차례 — 점이 맨 위(기본) */
export const PAPER_CHOICES: readonly DrawnPattern[] = ['dots', ...PAPER_OPTS];

/** 이 무늬가 프로 선택인가 — 점만 무료 */
export const isProPattern = (p: DrawnPattern): boolean => p !== 'dots';

/** 저장값 → 고른 무늬(모르는 값 · 없음은 점) */
export function storedPattern(stored: unknown): DrawnPattern {
  return PAPER_OPTS.includes(stored as PaperPattern) ? (stored as PaperPattern) : 'dots';
}

/** 그릴 무늬 — 저장된 프로 무늬는 프로가 있을 때만, 아니면 점 */
export function drawnPattern(stored: PaperPattern | undefined, owned: boolean): DrawnPattern {
  return proValue<DrawnPattern>(storedPattern(stored), 'dots', isProPattern, owned);
}

/** 고른 무늬 → 저장값(점은 지운다 — 설정에 남기지 않는다) */
export function patternSetting(p: DrawnPattern): PaperPattern | undefined {
  return p === 'dots' ? undefined : p;
}

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

/** 선의 굵기(pt) — 머리카락 선. 점(반지름 0.9)보다 가늘어 글씨 뒤에서 조용하다 */
export const PATTERN_STROKE = 0.5;
