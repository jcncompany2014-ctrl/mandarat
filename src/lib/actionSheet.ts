// 실천 시트(ActionSheet)의 판단과 글 — RN 의존 없는 순수 모듈(단위 테스트 대상).
import type { Action, MandaratDoc } from '../types';
import { DOW_KR, doneOn, kindOf, perWeekOf, scheduledOn, weekDates, ymd } from './routine';
import { addDays, countInfo, fmtNum, kindLine } from './kinds';

/** 'YYYY-MM-DD' → 로컬 날짜 */
function toDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** '수' — 그 날의 요일 한 글자 */
export function dowOf(key: string): string {
  return DOW_KR[toDate(key).getDay()];
}

/**
 * 제목 아래 한 줄 — 아래 블록이 이미 보여 주는 것(이번 주 n/m회, 7/12권, 마감)은 되풀이하지 않고 정한 것만.
 * 습관 '습관 · 월·수·금 반복' / '습관 · 주 3회' · 쌓기 '쌓기 · 한 번에 1권' · 한 번 '한 번' · 마음가짐 '마음가짐 · 한 주에 한 번'
 */
export function sheetSubtitle(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, ti: number, ai: number, today: Date): string {
  const a = doc.themes[ti]?.actions[ai];
  if (!a) return '';
  const kind = kindOf(a);
  if (kind === 'habit') {
    const plan = kindLine(doc, ti, ai, today)?.plan;
    return plan ? `습관 · ${plan}` : '습관';
  }
  if (kind === 'count') {
    const c = countInfo(a);
    return `쌓기 · 한 번에 ${fmtNum(c.step)}${c.unit}`;
  }
  if (kind === 'mind') return '마음가짐 · 한 주에 한 번';
  return '한 번';
}

/** 이번 주 i번째 날(월 0 … 일 6)의 날짜 키 */
export function weekDayKey(today: Date, i: number): string {
  return ymd(weekDates(today)[i]);
}

/**
 * 이번 주 칸에서 눌러 기록을 남기거나 지울 수 있는 날인가 — 지난 날만(오늘은 위의 체크 줄이 맡는다),
 * 습관을 정한 날(since)부터. 글이 없는 칸·습관이 아닌 칸은 늘 거짓.
 */
export function canBackfill(a: Action | undefined, today: Date, i: number): boolean {
  if (!a || !a.text.trim() || kindOf(a) !== 'habit') return false;
  const day = weekDayKey(today, i);
  return day < ymd(today) && (!a.since || day >= a.since);
}

/** 지난 날 기록을 남기거나 지운 뒤의 알림 — '화요일에 한 걸로 남겼어요' / '화요일 기록을 지웠어요' */
export function backfillToast(day: string, nowDone: boolean): string {
  return nowDone ? `${dowOf(day)}요일에 한 걸로 남겼어요` : `${dowOf(day)}요일 기록을 지웠어요`;
}

/**
 * '어제도 했어요'를 보일까 — 어제가 습관을 정한 날 이후이고, 아직 기록이 없고,
 * (어제가 지난주라 이번 주 칸에 없거나 · 주 N회 습관이거나 · 어제가 하는 날이었을 때).
 * 보이면 어제 날짜 키, 아니면 null.
 */
export function yesterdayOffer(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, ti: number, ai: number, today: Date): string | null {
  const a = doc.themes[ti]?.actions[ai];
  if (!a || !a.text.trim() || kindOf(a) !== 'habit') return null;
  const y = addDays(ymd(today), -1);
  if (a.since && y < a.since) return null;
  if (doneOn(doc.dayLog, `${ti}-${ai}`, y)) return null;
  const lastWeek = y < weekDayKey(today, 0);
  return lastWeek || perWeekOf(a) > 0 || scheduledOn(a, toDate(y)) ? y : null;
}

export type Postpone = 'tomorrow' | 'nextWeek';

/** 마감을 미루는 글자 버튼 — 이름 · 며칠 뒤 · 옮긴 뒤 알림 */
export const POSTPONE: Record<Postpone, { label: string; days: number; toast: string }> = {
  tomorrow: { label: '내일로', days: 1, toast: '마감을 내일로 옮겼어요' },
  nextWeek: { label: '다음 주로', days: 7, toast: '마감을 다음 주로 옮겼어요' },
};

/** 마감 미루기를 보일까 — 다 하지 않은 한 번 칸의 마감이 오늘이거나 지났을 때 */
export function canPostpone(a: Action | undefined, today: Date): boolean {
  if (!a || kindOf(a) !== 'once' || a.done || !a.due) return false;
  return a.due <= ymd(today);
}

/** 미룬 마감 — 원래 마감이 아니라 오늘부터 센다(이미 지난 마감을 '내일'로 옮기면 정말 내일) */
export function postponedDue(today: Date, which: Postpone): string {
  return addDays(ymd(today), POSTPONE[which].days);
}

/** 쌓기 목표에 닿은 순간의 알림 — '12권 목표에 닿았어요' */
export function goalToast(goal: number, unit: string): string {
  return `${fmtNum(goal)}${unit} 목표에 닿았어요`;
}

/** 메모를 저장해야 하나 — 쓰던 글이 저장된 글과 다를 때만(같으면 문서를 건드리지 않는다) */
export function noteChanged(draft: string, saved: string | undefined): boolean {
  return draft !== (saved ?? '');
}

/** 괘선 메모의 줄 수 — 글 높이를 덮을 만큼, 적어도 3줄 */
export function memoRules(contentHeight: number, lineHeight: number, padTop: number, min = 3): number {
  if (!(contentHeight > 0) || !(lineHeight > 0)) return min;
  return Math.max(min, Math.ceil((contentHeight - padTop) / lineHeight - 0.01));
}

/** 마음가짐 지난 점수 막대의 첫 이름표 — 8주를 보이면 '7주 전'(이번 주가 0주 전) */
export function historyStartLabel(weeks: number): string {
  return `${Math.max(1, weeks - 1)}주 전`;
}
