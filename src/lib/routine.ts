// 실천 유형별 '오늘' 계산 — 습관(요일·주 N회) 반복, 쌓기·마감 있는 한 번의 오늘 체크 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
//
// 모델:
// - 실천에는 유형(kind)이 있다: 한 번(once) · 습관(habit) · 쌓기(count) · 마음가짐(mind).
//   유형이 없는 이전 저장본은 반복 요일이 있으면 습관, 없으면 한 번으로 본다.
// - 습관의 오늘 체크는 dayLog[날짜]에만 기록한다. 만다라트 칸의 영구 달성(done)과는 별개라서
//   월요일에 체크해도 수요일 칸은 다시 비어 있다. 습관은 요일을 정하거나, 주 N회로 정한다.
// - 쌓기는 더한 수를 action.log[날짜]에 남기고, 그날 더한 게 있으면 그날 한 것으로 본다.
// - 한 번은 done(영구 달성)이 곧 오늘 완료 여부다. 마감이 다가오면 '오늘'에 저절로 담긴다.
// - 마음가짐은 날마다 체크하지 않아 '오늘' 목록에 넣지 않는다(한 주에 한 번 점수).
import type { Action, ActionKind, MandaratDoc } from '../types';

export const KINDS: readonly ActionKind[] = ['once', 'habit', 'count', 'mind'];
/** 마감 D-3부터(지난 것 포함) '오늘'에 저절로 담긴다 */
export const DUE_SOON = 3;

export const DOW_KR = ['일', '월', '화', '수', '목', '금', '토'] as const;
/** 월요일 시작 표시 순서 */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** 로컬 날짜 'YYYY-MM-DD' */
export function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 0~6 정수만 남기고 중복 제거·정렬. 저장본 검증에도 쓴다. */
export function normalizeDays(days: unknown): number[] {
  if (!Array.isArray(days)) return [];
  const ok = days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6);
  return [...new Set(ok)].sort((a, b) => a - b);
}

/** 주 N회 값 검증: 1~6 정수만(7회는 '매일' 요일 반복과 같다) */
export function normalizePerWeek(v: unknown): number {
  return Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 6 ? (v as number) : 0;
}

type KindFields = Pick<Action, 'kind' | 'days' | 'perWeek'>;

/** 실천 유형 — 저장된 값이 없으면(이전 저장본) 반복 요일이 있으면 습관, 아니면 한 번 */
export function kindOf(a: KindFields | undefined): ActionKind {
  if (!a) return 'once';
  if (a.kind && KINDS.includes(a.kind)) return a.kind;
  return normalizeDays(a.days).length > 0 || normalizePerWeek(a.perWeek) > 0 ? 'habit' : 'once';
}

/** 습관인가 — 그날 체크가 칸 달성과 따로 dayLog에 남는 실천 */
export function isRoutine(a: KindFields): boolean {
  return kindOf(a) === 'habit';
}
export const isHabit = isRoutine;

/** 주 N회 습관이면 N, 아니면 0 (요일을 정한 습관은 요일이 우선) */
export function perWeekOf(a: KindFields | undefined): number {
  if (!a || kindOf(a) !== 'habit' || normalizeDays(a.days).length > 0) return 0;
  return normalizePerWeek(a.perWeek);
}

/** 요일 습관의 반복 요일 — 습관이 아니거나 주 N회면 빈 배열. 일정이 없는 습관은 매일로 본다. */
export function habitDays(a: KindFields | undefined): number[] {
  if (!a || kindOf(a) !== 'habit') return [];
  const d = normalizeDays(a.days);
  if (d.length > 0) return d;
  return normalizePerWeek(a.perWeek) > 0 ? [] : [0, 1, 2, 3, 4, 5, 6];
}

/** 같은 반복 요일인가 (순서·중복 무시) */
export function sameDays(a: unknown, b: unknown): boolean {
  return normalizeDays(a).join() === normalizeDays(b).join();
}

/** 이 요일 습관이 그날 예정돼 있었나 — 반복 요일이고, 습관을 정한 날(since) 이후 (주 N회는 요일이 없어 늘 거짓) */
export function scheduledOn(a: Pick<Action, 'kind' | 'days' | 'perWeek' | 'since'> | undefined, date: Date): boolean {
  if (!a) return false;
  if (!habitDays(a).includes(date.getDay())) return false;
  return !a.since || ymd(date) >= a.since;
}

/** 반복 요일 라벨: 매일 · 평일 · 주말 · 월·수·금 · 일요일(하루면 '요일'까지) (없으면 빈 문자열) */
export function daysLabel(days: unknown): string {
  const d = normalizeDays(days);
  if (d.length === 0) return '';
  if (d.length === 7) return '매일';
  if (d.length === 1) return `${DOW_KR[d[0]]}요일`;
  if (d.join() === '1,2,3,4,5') return '평일';
  if (d.join() === '0,6') return '주말';
  return WEEK_ORDER.filter((x) => d.includes(x)).map((x) => DOW_KR[x]).join('·');
}

/** today가 속한 주의 월~일 날짜 */
export function weekDates(today: Date): Date[] {
  const sinceMonday = (today.getDay() + 6) % 7;
  const y = today.getFullYear();
  const m = today.getMonth();
  const mon = today.getDate() - sinceMonday;
  return Array.from({ length: 7 }, (_, i) => new Date(y, m, mon + i));
}

/** 그 주의 이름표 — 월요일 날짜 'YYYY-MM-DD' (마음가짐 점수의 키) */
export function weekKey(d: Date): string {
  return ymd(weekDates(d)[0]);
}

/** 'YYYY-MM-DD' 두 날짜 사이의 날 수 (b - a). 서머타임과 무관하게 달력 날짜로 센다. */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function doneOn(dayLog: MandaratDoc['dayLog'], key: string, dateKey: string): boolean {
  return (dayLog[dateKey] ?? []).includes(key);
}

/** dayLog[dateKey]에서 key를 넣거나 뺀 새 dayLog. 빈 날은 지운다. */
export function toggleDayLog(dayLog: MandaratDoc['dayLog'], key: string, dateKey: string): MandaratDoc['dayLog'] {
  const set = new Set(dayLog[dateKey] ?? []);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  const next = { ...dayLog };
  if (set.size > 0) next[dateKey] = [...set];
  else delete next[dateKey];
  return next;
}

/** dayLog[dateKey]에 key가 on 상태가 되도록 맞춘다(이미 그렇다면 같은 객체). */
export function setDayLog(dayLog: MandaratDoc['dayLog'], key: string, dateKey: string, on: boolean): MandaratDoc['dayLog'] {
  return doneOn(dayLog, key, dateKey) === on ? dayLog : toggleDayLog(dayLog, key, dateKey);
}

/** 직접 추가한 할 일의 dayLog 키 — `${ti}-` 접두사라 영역별 연속 기록에도 잡힌다. */
export function extraLogKey(ti: number, id: string): string {
  return `${ti}-x${id}`;
}

/** 이번 주(월~오늘)에 이 습관을 한 날 수 — 습관을 정한 날(since) 전은 세지 않는다 */
export function weekDone(dayLog: MandaratDoc['dayLog'], key: string, today: Date, since?: string, includeToday = true): number {
  const tk = ymd(today);
  return weekDates(today).filter((d) => {
    const k = ymd(d);
    if (k > tk || (!includeToday && k === tk) || (since && k < since)) return false;
    return doneOn(dayLog, key, k);
  }).length;
}

/**
 * 주 N회 습관의 이번 주 목표 횟수 — 습관을 정한 주에는 남은 날 수까지만(토요일에 정한 주 3회는 그 주 2회).
 * 주 N회가 아니면 0.
 */
export function weekTarget(a: Pick<Action, 'kind' | 'days' | 'perWeek' | 'since'> | undefined, today: Date): number {
  const n = perWeekOf(a);
  if (n === 0 || !a?.since) return n;
  const week = weekDates(today);
  const mon = ymd(week[0]);
  if (a.since <= mon) return n;
  const left = daysBetween(a.since, ymd(week[6])) + 1;
  return Math.max(1, Math.min(n, left));
}

/** 오늘 했는가 — 습관은 오늘 체크, 쌓기는 오늘 더한 수, 한 번은 칸 달성. 마음가짐은 늘 거짓. */
export function doneToday(doc: Pick<MandaratDoc, 'dayLog'>, a: Action, key: string, todayKey: string): boolean {
  const kind = kindOf(a);
  if (kind === 'habit') return doneOn(doc.dayLog, key, todayKey);
  if (kind === 'count') return (a.log?.[todayKey] ?? 0) > 0;
  if (kind === 'once') return a.done;
  return false;
}

/**
 * 고르지 않아도 오늘 저절로 담기는가.
 * - 요일 습관: 오늘이 반복 요일
 * - 주 N회 습관: 이번 주 횟수를 아직 못 채웠거나 오늘 이미 했다
 * - 한 번: 마감이 D-3 안쪽이거나 지났고 아직 못 했다(오늘 끝냈다면 그날은 '완료'로 남는다)
 */
export function autoToday(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, ti: number, ai: number, today: Date): boolean {
  const a = doc.themes[ti]?.actions[ai];
  if (!a || !a.text.trim()) return false;
  const kind = kindOf(a);
  const tk = ymd(today);
  if (kind === 'habit') {
    if (perWeekOf(a) === 0) return scheduledOn(a, today);
    if (a.since && tk < a.since) return false;
    const key = `${ti}-${ai}`;
    return doneOn(doc.dayLog, key, tk) || weekDone(doc.dayLog, key, today, a.since, false) < weekTarget(a, today);
  }
  if (kind === 'once') {
    if (!a.due || daysBetween(tk, a.due) > DUE_SOON) return false;
    // 체크하자마자 목록에서 사라지지 않게 — 오늘 달성한 것은 그날 동안 '완료'에 남긴다
    return !a.done || doneOn(doc.dayLog, `${ti}-${ai}`, tk);
  }
  return false;
}

/**
 * 날짜가 바뀌면 '오늘' 목록을 정리한다.
 * - 완료한 직접 추가 할 일은 기록(dayLog)만 남기고 목록에서 뺀다. 못 한 일은 이어서 남긴다.
 * - 직접 담은 '한 번' 실천은 달성할 때까지 남기고, 달성했거나 글자가 지워졌으면 뺀다.
 * - 직접 담은 습관·쌓기는 그날 하루만 — 습관은 정한 날이면 어차피 저절로 다시 나타난다.
 *   마음가짐은 오늘 목록에 두지 않는다(유형을 바꾸기 전에 담았던 것).
 * - todayDate가 없던 이전 저장본은 날짜만 찍는다(언제 담았는지 몰라 지우지 않는다).
 * - 날짜가 앞으로 갈 때만 정리하고, 뒤로 가면(시계 되돌림·시간대 이동) 지우지 않고 날짜만 다시 맞춘다.
 * 바뀐 것이 없으면 같은 객체를 돌려줘 불필요한 저장·렌더를 막는다.
 */
export function rolloverToday<T extends Pick<MandaratDoc, 'themes' | 'todayKeys' | 'todayExtra' | 'todayDate'>>(doc: T, todayKey: string): T {
  if (doc.todayDate === todayKey) return doc;
  // 날짜가 없던 이전 저장본, 또는 기기 시계보다 앞선 날짜(시계 조정·다른 시간대에서 가져온 백업)는
  // 아무것도 지우지 않고 오늘로 다시 맞춘다 — 그래야 다음 날 정리가 멈추지 않는다
  if (!doc.todayDate || todayKey < doc.todayDate) return { ...doc, todayDate: todayKey };
  const todayKeys = doc.todayKeys.filter((k) => {
    const [ti, ai] = k.split('-').map(Number);
    const a = doc.themes[ti]?.actions[ai];
    if (!a || !a.text.trim()) return false;
    return kindOf(a) === 'once' && !a.done;
  });
  const todayExtra = doc.todayExtra.filter((x) => !x.done);
  return { ...doc, todayKeys, todayExtra, todayDate: todayKey };
}

export type DayState = 'done' | 'today' | 'missed' | 'planned' | 'off';

/**
 * 습관의 이번 주(월~일) 7칸 상태 — 습관을 정하기 전 날은 쉬는 날로 본다.
 * 주 N회 습관은 정해진 요일이 없어 한 날만 채우고 나머지는 쉬는 날(놓친 날이 없다).
 */
export function routineWeek(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, ti: number, ai: number, today: Date): DayState[] {
  const a = doc.themes[ti]?.actions[ai];
  const key = `${ti}-${ai}`;
  const todayKey = ymd(today);
  const weekly = perWeekOf(a) > 0;
  return weekDates(today).map((d) => {
    const k = ymd(d);
    if (doneOn(doc.dayLog, key, k)) return 'done';
    if (weekly) return k === todayKey && autoToday(doc, ti, ai, today) ? 'today' : 'off';
    if (!scheduledOn(a, d)) return 'off';
    if (k === todayKey) return 'today';
    return k < todayKey ? 'missed' : 'planned';
  });
}

/**
 * 이번 주 해낸 횟수 / 정한 횟수.
 * 요일 습관은 예정일 중 해낸 날 / 예정일 수(쉬는 날에 한 것은 점으로만 보이고 비율엔 넣지 않는다),
 * 주 N회 습관은 이번 주 한 날 수 / 이번 주 목표(정한 주에는 남은 날만큼).
 */
export function routineWeekCount(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, ti: number, ai: number, today: Date): { done: number; planned: number } {
  const a = doc.themes[ti]?.actions[ai];
  const key = `${ti}-${ai}`;
  if (perWeekOf(a) > 0) return { done: weekDone(doc.dayLog, key, today, a?.since), planned: weekTarget(a, today) };
  const planned = weekDates(today).filter((d) => scheduledOn(a, d));
  return { done: planned.filter((d) => doneOn(doc.dayLog, key, ymd(d))).length, planned: planned.length };
}

export interface TodayItem {
  ti: number;
  ai: number;
  key: string;
  kind: ActionKind;
  /** 습관인가(체크가 칸 달성과 따로 그날 기록에 남는다) */
  routine: boolean;
  /** 고르지 않아도 오늘 저절로 담기는가(반복 요일·주 N회·다가온 마감) */
  scheduled: boolean;
  /** 오늘 했는가 (습관은 오늘 체크, 쌓기는 오늘 더한 수, 한 번은 칸 달성) */
  done: boolean;
}

/** 오늘 실천 목록 = 직접 담은 항목 ∪ 저절로 담기는 항목. 글자가 없는 칸과 마음가짐은 뺀다. */
export function todayItems(doc: Pick<MandaratDoc, 'themes' | 'dayLog' | 'todayKeys'>, today: Date): TodayItem[] {
  const tk = ymd(today);
  const seen = new Set<string>();
  const out: TodayItem[] = [];
  const push = (ti: number, ai: number, auto?: boolean) => {
    const key = `${ti}-${ai}`;
    const a = doc.themes[ti]?.actions[ai];
    if (seen.has(key) || !a || !a.text.trim()) return;
    const kind = kindOf(a);
    if (kind === 'mind') return;
    seen.add(key);
    out.push({ ti, ai, key, kind, routine: kind === 'habit', scheduled: auto ?? autoToday(doc, ti, ai, today), done: doneToday(doc, a, key, tk) });
  };
  for (const k of doc.todayKeys) {
    const [ti, ai] = k.split('-').map(Number);
    push(ti, ai);
  }
  doc.themes.forEach((t, ti) => t.actions.forEach((_, ai) => {
    if (autoToday(doc, ti, ai, today)) push(ti, ai, true);
  }));
  return out;
}

/** 오늘 진행: 실천 목록 + 직접 추가한 할 일 */
export function todayProgress(doc: Pick<MandaratDoc, 'themes' | 'dayLog' | 'todayKeys' | 'todayExtra'>, today: Date): { done: number; total: number } {
  const items = todayItems(doc, today);
  return {
    done: items.filter((i) => i.done).length + doc.todayExtra.filter((x) => x.done).length,
    total: items.length + doc.todayExtra.length,
  };
}

/** 이번 주 월~일 하루별 실천 횟수 */
export function weekCounts(dayLog: MandaratDoc['dayLog'], today: Date): { date: string; dow: number; count: number; isToday: boolean }[] {
  const tk = ymd(today);
  return weekDates(today).map((d) => {
    const k = ymd(d);
    return { date: k, dow: d.getDay(), count: (dayLog[k] ?? []).length, isToday: k === tk };
  });
}
