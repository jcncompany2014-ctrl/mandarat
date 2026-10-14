// 만다라트 탭이 기억하는 것 — 화면이 다시 만들어져도(상세에 다녀오거나 탭을 오가도) 앱이 켜져 있는 동안 유지된다.
// RN 의존 없는 순수 모듈 — 단위 테스트 대상.

/** 81칸에서 크게 보는 블록 — 영역 번호, 또는 가운데(핵심 목표 + 8개 영역) */
export type GridFocus = number | 'c';

export const gridMemory: {
  /** 크게 보던 블록(없으면 81칸 전체) */
  focus: GridFocus | null;
  /** 블록을 한 번이라도 크게 봤는지 — 그 뒤로는 '블록을 누르면…' 안내를 다시 보이지 않는다 */
  zoomedOnce: boolean;
  /** 표에서 이미 칠해진 모습을 본 달성 칸 'ti-ai' — 새로 달성한 칸만 돌아왔을 때 칠해 보인다 */
  seenDone: Set<string>;
} = { focus: null, zoomedOnce: false, seenDone: new Set() };

/** seenDone을 처음 채웠는지 — 앱을 켜고 처음 본 표는 칠하는 움직임 없이 그대로 보인다 */
let seeded = false;

/** 다른 화면에서 '81칸의 이 블록을 크게'로 바로 보낼 때 — 다음에 만다라트 탭이 열리면 그 블록부터 보인다 */
export function showGridAt(focus: GridFocus | null) {
  gridMemory.focus = focus;
}

/**
 * 지금 달성한 칸들 중 아직 표에서 칠해진 모습을 못 본 칸 — 표를 그릴 때 한 번 부른다.
 * 처음 부를 때(앱을 켜고 처음 본 표)는 모두 본 것으로 치고 빈 목록을 돌려준다.
 * 달성을 푼 칸은 기억에서 지워, 다시 달성하면 또 칠해 보인다. 돌려준 칸은 본 것으로 기록된다.
 */
export function takeFreshDone(doneKeys: readonly string[]): string[] {
  const now = new Set(doneKeys);
  for (const k of [...gridMemory.seenDone]) if (!now.has(k)) gridMemory.seenDone.delete(k);
  if (!seeded) {
    seeded = true;
    for (const k of now) gridMemory.seenDone.add(k);
    return [];
  }
  const fresh = doneKeys.filter((k) => !gridMemory.seenDone.has(k));
  for (const k of fresh) gridMemory.seenDone.add(k);
  return fresh;
}

/** 테스트 전용 — 앱을 막 켠 상태로 되돌린다 */
export function resetGridMemory() {
  gridMemory.focus = null;
  gridMemory.zoomedOnce = false;
  gridMemory.seenDone = new Set();
  seeded = false;
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
