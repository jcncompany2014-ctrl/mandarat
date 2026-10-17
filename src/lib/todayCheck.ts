// 오늘 줄의 체크가 하는 말 — 토스트 · 화면 읽기 이름 · 읽어 주는 한 문장 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// useTodayCheck(훅)가 이 말들을 쓴다. 홈과 오늘이 같은 말을 쓰도록 여기 한 곳에만 둔다.
import type { ActionKind } from '../types';
import type { CountInfo } from './kinds';
import { todayProgress } from './routine';
import { msg, type Lang } from '../i18n';

/** 이번 한 번(step) 더하면 쌓기 목표에 처음 닿는가 — 이미 닿아 있던 칸은 다시 알리지 않는다 */
export function reachesGoal(c: Pick<CountInfo, 'count' | 'goal' | 'step' | 'reached'>): boolean {
  return !c.reached && c.count + c.step >= c.goal;
}

/** 쌓기 목표에 닿았을 때 — '12권 목표에 닿았어요' (목표에 닿으면 칸이 달성된다) */
export function goalText(c: Pick<CountInfo, 'goal' | 'unit'>, l?: Lang): string {
  return msg(l).sheet.countGoal({ n: c.goal, unit: c.unit });
}

/** 쌓기 체크를 풀어 그날 더한 것을 한꺼번에 뺐을 때 — '오늘 더한 3권을 뺐어요' (되돌리기와 함께) */
export function undoAddText(amount: number, unit: string, l?: Lang): string {
  return msg(l).sheet.undoAdd({ n: amount, unit });
}

/** 직접 추가한 할 일을 지웠을 때 — '할 일을 지웠어요' */
export function extraRemovedText(l?: Lang): string {
  return msg(l).sheet.extraRemoved;
}

/** 체크 칸의 화면 읽기 이름 — 글 그대로(뒤에 '완료'를 붙이지 않는다). 쌓기는 무엇을 얼마나 더하는지까지 */
export function checkLabelText(text: string, kind: ActionKind, c?: Pick<CountInfo, 'step' | 'unit'>, l?: Lang): string {
  if (kind !== 'count' || !c) return text;
  return `${text}, ${msg(l).sheet.countPlus({ n: c.step, unit: c.unit })}`;
}

/** 체크 칸의 힌트 — 지금 누르면 무엇이 되는지(누르는 몸짓은 iOS가 덧붙여 읽으므로 말하지 않는다) */
export function checkHintText(done: boolean, kind: ActionKind, l?: Lang): string {
  const m = msg(l).sheet;
  if (!done) return m.hintMark;
  return kind === 'count' ? m.hintUnlog : m.hintUndone;
}

/**
 * 오늘 아직 남은 수 — 체크를 문서에 넣은 '뒤'의 문서로 센다(그 문서에 이번 체크가 이미 들어 있으니 1을 빼지 않는다).
 * 체크가 아무것도 바꾸지 못한 때(이미 지워진 칸 등)에도 지금 문서 그대로라 맞다.
 */
export function leftToday(doc: Parameters<typeof todayProgress>[0], today: Date): number {
  const p = todayProgress(doc, today);
  return Math.max(0, p.total - p.done);
}

/**
 * 화면 읽기가 켜져 있을 때 체크하고 읽어 주는 한 문장 — '물 2L 마시기, 했어요. 오늘 3개 남았어요'.
 * 마지막 하나였다면 남은 수는 빼고 말한다('오늘 할 일을 다 했어요'는 하루 마감이 따로 읽는다).
 */
export function checkedSpeech(text: string, left: number, l?: Lang): string {
  const m = msg(l).sheet;
  return left > 0 ? m.checkedLeft({ text, n: left }) : m.checked({ text });
}

/** 쌓기를 한 번 더 더했을 때 읽어 주는 한 문장 — '책 읽기, 12권 중 7권' ('7/12'는 날짜로 읽히므로 말로) */
export function addedSpeech(text: string, c: Pick<CountInfo, 'count' | 'goal' | 'unit'>, l?: Lang): string {
  return msg(l).sheet.addedSpeech({ text, count: c.count, total: c.goal, unit: c.unit });
}
