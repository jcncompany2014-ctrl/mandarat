// 오늘 줄의 체크가 하는 말 — 토스트 · 화면 읽기 이름 · 읽어 주는 한 문장 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// useTodayCheck(훅)가 이 말들을 쓴다. 홈과 오늘이 같은 말을 쓰도록 여기 한 곳에만 둔다.
import type { ActionKind } from '../types';
import type { CountInfo } from './kinds';
import { fmtNum } from './kinds';
import { todayProgress } from './routine';
import { josa } from './text';

/** 이번 한 번(step) 더하면 쌓기 목표에 처음 닿는가 — 이미 닿아 있던 칸은 다시 알리지 않는다 */
export function reachesGoal(c: Pick<CountInfo, 'count' | 'goal' | 'step' | 'reached'>): boolean {
  return !c.reached && c.count + c.step >= c.goal;
}

/** 쌓기 목표에 닿았을 때 — '12권 목표에 닿았어요' (목표에 닿으면 칸이 달성된다) */
export function goalText(c: Pick<CountInfo, 'goal' | 'unit'>): string {
  return `${fmtNum(c.goal)}${c.unit} 목표에 닿았어요`;
}

/** 쌓기 체크를 풀어 그날 더한 것을 한꺼번에 뺐을 때 — '오늘 더한 3권을 뺐어요' (되돌리기와 함께) */
export function undoAddText(amount: number, unit: string): string {
  return `오늘 더한 ${josa(`${fmtNum(amount)}${unit}`, '을/를')} 뺐어요`;
}

/** 직접 추가한 할 일을 지웠을 때 */
export const EXTRA_REMOVED = '할 일을 지웠어요';

/** 체크 칸의 화면 읽기 이름 — 글 그대로(뒤에 '완료'를 붙이지 않는다). 쌓기는 무엇을 얼마나 더하는지까지 */
export function checkLabelText(text: string, kind: ActionKind, c?: Pick<CountInfo, 'step' | 'unit'>): string {
  if (kind !== 'count' || !c) return text;
  return `${text}, ${fmtNum(c.step)}${c.unit} 더하기`;
}

/** 체크 칸의 힌트 — 지금 누르면 무엇이 되는지(누르는 몸짓은 iOS가 덧붙여 읽으므로 말하지 않는다) */
export function checkHintText(done: boolean, kind: ActionKind): string {
  if (!done) return '했어요로 남겨요';
  return kind === 'count' ? '오늘 더한 것을 빼요' : '했어요를 지워요';
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
export function checkedSpeech(text: string, left: number): string {
  return left > 0 ? `${text}, 했어요. 오늘 ${left}개 남았어요` : `${text}, 했어요`;
}

/** 쌓기를 한 번 더 더했을 때 읽어 주는 한 문장 — '책 읽기, 12권 중 7권' ('7/12'는 날짜로 읽히므로 말로) */
export function addedSpeech(text: string, c: Pick<CountInfo, 'count' | 'goal' | 'unit'>): string {
  return `${text}, ${fmtNum(c.goal)}${c.unit} 중 ${fmtNum(c.count)}${c.unit}`;
}
