// 두 쪽 펼침(V5-A) — 넓은 아이패드 창에서 펼친 수첩처럼 왼쪽·오른쪽 두 쪽을 나란히.
// RN 의존 없는 순수 모듈 — 단위 테스트 대상(tests/spread.test.js).
import type { Screen } from '../navigation/ui';
import type { LayoutKind } from './screen';

/** 펼침을 끄는 한 줄 — false면 넓은 창도 한 단(column)으로 그린다 */
export const SPREAD_ENABLED = true;

/** 두 쪽 사이 제본 — 1pt 괘선 · 4pt 틈 · 1pt 괘선 */
export const BINDING = { rule: 1, gap: 4 } as const;
export const BINDING_W = BINDING.rule * 2 + BINDING.gap;
/** 한 쪽의 폭 상한 — 한 단(COLUMN_MAX_W)과 같다. 남는 폭은 양옆 책상으로 */
export const SPREAD_PAGE_MAX_W = 640;
/** 펼침에서 탭 다섯 칸이 모이는 가운데 폭 */
export const SPREAD_TABS_W = 560;

/** 칸 하나의 가로:세로(FullGrid의 CELL_RATIO) — 81칸 표의 높이 = 폭 / 0.84 */
const CELL_RATIO = 0.84;

/** 실제로 그릴 배치 — 끄는 줄(enabled)이 꺼져 있으면 펼침도 한 단으로 */
export function modeFor(kind: LayoutKind, enabled: boolean = SPREAD_ENABLED): LayoutKind {
  return kind === 'spread' && !enabled ? 'column' : kind;
}

/** 오른쪽 쪽에 펼쳐 둘 것 — 화면과(영역 화면이면) 영역 번호 */
export type Companion = { screen: 'grid' } | { screen: 'dashboard' } | { screen: 'detail'; ti: number };

/**
 * 왼쪽 쪽(지금 화면) → 오른쪽 쪽.
 * - 홈 · 오늘 · 통계 · 설정 · 한 해 · 영역 화면: 81칸 표
 * - 만다라트 탭: 크게 보는 영역 블록의 영역 화면, 크게 보는 블록이 없으면(또는 가운데 블록이면) 홈
 * 81칸 표(FullGrid)는 어느 때도 한 장만 — 왼쪽이 만다라트면 오른쪽은 표가 아니다(gridMemory가 모듈 하나).
 */
export function companionFor(screen: Screen, focusTi: number | null): Companion {
  if (screen !== 'grid') return { screen: 'grid' };
  return focusTi != null && focusTi >= 0 && focusTi < 8 ? { screen: 'detail', ti: focusTi } : { screen: 'dashboard' };
}

/** 오른쪽 쪽을 다시 그릴지 가르는 열쇠 — 같은 열쇠면 스크롤·상태를 그대로 둔다 */
export function companionKey(c: Companion): string {
  return c.screen === 'detail' ? `detail-${c.ti}` : c.screen;
}

/** 81칸 표의 폭 — 쪽 폭(w)을 넘지 않고, 표 높이(폭 / 0.84)가 남은 높이(availH)에 들어가게 */
export function fitTableW(w: number, availH: number): number {
  return Math.max(0, Math.min(w, Math.floor(availH * CELL_RATIO)));
}

/** 창 폭 → 펼침의 한 쪽 폭(제본 폭을 빼고 반, 640 상한) */
export function spreadPageW(windowW: number): number {
  return Math.max(0, Math.min(SPREAD_PAGE_MAX_W, Math.floor((windowW - BINDING_W) / 2)));
}
