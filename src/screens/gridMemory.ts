// 만다라트 탭이 기억하는 보기 — 화면이 다시 만들어져도(상세에 다녀오거나 탭을 오가도) 앱이 켜져 있는 동안 유지된다.

/** 81칸에서 크게 보는 블록 — 영역 번호, 또는 가운데(핵심 목표 + 8개 영역) */
export type GridFocus = number | 'c';

export const gridMemory: { view: 'mandala' | 'full'; focus: GridFocus | null } = { view: 'mandala', focus: null };

/** 다른 화면에서 '81칸의 이 블록을 크게'로 바로 보낼 때 — 다음에 만다라트 탭이 열리면 그 상태로 시작한다 */
export function showGridAt(focus: GridFocus | null) {
  gridMemory.view = 'full';
  gridMemory.focus = focus;
}
