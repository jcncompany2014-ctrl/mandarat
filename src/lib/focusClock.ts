// 집중 타이머의 시계·기록·버튼 글 — 화면(FocusTimer)과 떼어 Node에서 시험한다.
// 남은 시간은 JS 박자를 세지 않고 벽시계(끝날 시각)에서 빼서 구한다 — 화면이 잠겨 JS가 멈춰도 시간은 흐른다.
import type { ActionKind } from '../types';

/** 한 번의 집중(초) — 25분 */
export const FOCUS_TOTAL = 25 * 60;
/** 25분을 1분씩 25칸에 적는다 */
export const TALLY_BOXES = 25;

/** 끝날 시각(ms)에서 지금까지 남은 초 — 올림(00:00은 정말 끝났을 때만), 0 아래로 내려가지 않는다 */
export function leftAt(endAt: number, now: number): number {
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

/** 남은 ms → 화면에 보일 남은 초 */
export function leftOfMs(remainingMs: number): number {
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

/** 집중한 초 */
export function elapsedOf(left: number, total = FOCUS_TOTAL): number {
  return Math.min(total, Math.max(0, total - left));
}

/** 기록할 분 — 다 채운 1분만 센다(10분 40초 → 10분) */
export function minutesToRecord(elapsedSec: number): number {
  return Math.max(0, Math.floor(elapsedSec / 60));
}

/** 칠할 칸 수 — 다 채운 1분마다 한 칸, 25칸을 넘지 않는다 */
export function filledBoxes(elapsedSec: number): number {
  return Math.min(TALLY_BOXES, minutesToRecord(elapsedSec));
}

/** '24:13' */
export function fmtClock(left: number): string {
  const s = Math.max(0, Math.round(left));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * 끝내기 버튼이 무엇을 기록하는지 — 한 번(아직 달성 전)은 달성, 습관(오늘 아직)은 오늘 체크, 나머지는 시간만.
 * 이미 달성했거나 오늘 이미 체크한 칸은 더 기록할 것이 없으니 'time'.
 */
export type FocusOutcome = 'done' | 'check' | 'time';

export function focusOutcome(kind: ActionKind, opts: { done?: boolean; checkedToday?: boolean }): FocusOutcome {
  if (kind === 'once' && !opts.done) return 'done';
  if (kind === 'habit' && !opts.checkedToday) return 'check';
  return 'time';
}

/** 끝내기 버튼 글 — 도는 중과 25분을 다 채운 뒤가 다르다(한 번은 칸 달성, 습관은 그날 했어요) */
export function finishLabel(outcome: FocusOutcome, finished: boolean): string {
  if (finished) return outcome === 'done' ? '달성으로 표시' : outcome === 'check' ? '오늘 했어요' : '닫기';
  return outcome === 'done' ? '끝내고 달성' : outcome === 'check' ? '끝내고 했어요' : '여기서 끝내기';
}
