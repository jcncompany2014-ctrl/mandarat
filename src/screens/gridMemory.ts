// 만다라트 탭이 기억하는 것 — 화면이 다시 만들어져도(상세에 다녀오거나 탭을 오가도) 앱이 켜져 있는 동안 유지된다.
// RN 의존 없는 순수 모듈 — 단위 테스트 대상.

/** 81칸에서 크게 보는 블록 — 영역 번호, 또는 가운데(핵심 목표 + 8개 영역) */
export type GridFocus = number | 'c';

export const gridMemory: {
  /** 크게 보던 블록(없으면 81칸 전체) */
  focus: GridFocus | null;
} = { focus: null };

/** 다른 화면에서 '81칸의 이 블록을 크게'로 바로 보낼 때 — 다음에 만다라트 탭이 열리면 그 블록부터 보인다 */
export function showGridAt(focus: GridFocus | null) {
  gridMemory.focus = focus;
}

/** 테스트 전용 — 앱을 막 켠 상태로 되돌린다 */
export function resetGridMemory() {
  gridMemory.focus = null;
}

/** 크게 본 블록에서 가로로 민 결과 — 1 다음 영역, -1 이전 영역, 0 그대로 */
export function swipeStep(dx: number, vx: number): 1 | -1 | 0 {
  if (dx < -60 || vx < -0.6) return 1;
  if (dx > 60 || vx > 0.6) return -1;
  return 0;
}

/** 영역 번호를 d만큼 넘긴다(8개를 돌아서) */
export function stepArea(ti: number, d: 1 | -1): number {
  return (((ti + d) % 8) + 8) % 8;
}
