// 웹의 쓰는 칸 — RN 없는 순수 함수(AppText의 TextInput이 쓴다, 단위 테스트 대상).

/** textarea가 가진 것 중 높이를 맞추는 데 쓰는 것만 */
export interface GrowingArea {
  style: { height: string };
  scrollHeight: number;
  offsetHeight: number;
  clientHeight: number;
}

/** 웹의 여러 줄 칸(textarea) — 높이를 쓴 글만큼으로 맞춘다(테두리 포함, min-height는 스타일이 지킨다) */
export function fitTextarea(el: GrowingArea | null): void {
  if (!el?.style) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`;
}
