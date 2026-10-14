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
import type { Action, ActionKind, HabitSchedule, MandaratDoc } from '../types';

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

// 같은 배열을 다시 다듬지 않게 — 입력 배열(그대로 저장돼 있는 요일 배열)마다 결과를 한 번만 만든다.
// 입력 배열을 고치면 결과가 어긋나지만, 앱의 요일 배열은 늘 새로 만들어 넣고 고쳐 쓰지 않는다.
const daysCache = new WeakMap<readonly unknown[], number[]>();

/** 0~6 정수만 남기고 중복 제거·정렬. 저장본 검증에도 쓴다. 같은 배열에는 같은 결과 배열을 주므로 고쳐 쓰지 않는다. */
export function normalizeDays(days: unknown): number[] {
  if (!Array.isArray(days)) return [];
  const hit = daysCache.get(days);
  if (hit) return hit;
  const ok = days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6);
  const out = [...new Set(ok)].sort((a, b) => a - b);
  daysCache.set(days, out);
  return out;
}

/** 주 N회 값 검증: 1~6 정수만(7회는 '매일' 요일 반복과 같다) */
export function normalizePerWeek(v: unknown): number {
  return Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 6 ? (v as number) : 0;
}

export type KindFields = Pick<Action, 'kind' | 'days' | 'perWeek'>;

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

// ── 일정의 지난 모습 ─────────────────────────────────────────────────────────
// 습관의 요일·주 N회를 고쳐도 지난 날은 그때의 일정으로 센다(action.schedule).
// schedule은 오래된 것부터 { from, days | perWeek } — 각 일정은 from부터 다음 일정의 from 전날까지 쓰였다.
// 마지막 일정은 지금 값(days · perWeek)과 같고, 첫 일정보다 이른 날은 첫 일정으로 본다.
// schedule이 없는 칸(이전 저장본, 일정을 고친 적 없는 습관)은 모든 날을 지금 값으로 센다 — 예전과 같다.

type SchedFields = Pick<Action, 'kind' | 'days' | 'perWeek' | 'schedule'>;

const entryCache = new WeakMap<HabitSchedule, KindFields>();

function entryFields(kind: Action['kind'], e: HabitSchedule): KindFields {
  let f = entryCache.get(e);
  if (!f || f.kind !== kind) {
    f = { kind, ...(e.days ? { days: e.days } : {}), ...(e.perWeek ? { perWeek: e.perWeek } : {}) };
    entryCache.set(e, f);
  }
  return f;
}

/** 그날(day 'YYYY-MM-DD') 쓰던 일정 — 일정을 고친 적이 없거나 마지막 일정 이후면 칸 그대로 */
export function scheduleAt<T extends SchedFields>(a: T, day: string): T | KindFields {
  const list = a.schedule;
  if (!list || list.length === 0 || day >= list[list.length - 1].from) return a;
  let e = list[0];
  for (let i = 1; i < list.length - 1 && list[i].from <= day; i++) e = list[i];
  return entryFields(a.kind, e);
}

/** 이 요일 습관이 그날 예정돼 있었나 — 그날의 반복 요일이고, 습관을 정한 날(since) 이후 (주 N회는 요일이 없어 늘 거짓) */
export function scheduledOn(a: Pick<Action, 'kind' | 'days' | 'perWeek' | 'since' | 'schedule'> | undefined, date: Date): boolean {
  if (!a) return false;
  const k = ymd(date);
  if (a.since && k < a.since) return false;
  return habitDays(scheduleAt(a, k)).includes(date.getDay());
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
export function weekTarget(a: Pick<Action, 'kind' | 'days' | 'perWeek' | 'since' | 'schedule'> | undefined, today: Date): number {
  // 그 주의 횟수는 today에 쓰던 일정으로(나중에 횟수를 고쳐도 지난 주 목표는 그대로)
  const n = a ? perWeekOf(scheduleAt(a, ymd(today))) : 0;
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
    if (perWeekOf(scheduleAt(a, tk)) === 0) return scheduledOn(a, today);
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
 * 그 전 날에 남은 기록(한 번이던 칸을 달성한 날 등)은 이 습관의 기록이 아니라서 '했어요'로 보이지 않는다
 * (이번 주 n/m회와 같은 날만 센다).
 * 주 N회 습관은 정해진 요일이 없어 한 날만 채우고 나머지는 쉬는 날(놓친 날이 없다).
 */
export function routineWeek(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, ti: number, ai: number, today: Date): DayState[] {
  const a = doc.themes[ti]?.actions[ai];
  const key = `${ti}-${ai}`;
  const todayKey = ymd(today);
  const weekly = !!a && perWeekOf(scheduleAt(a, todayKey)) > 0;
  return weekDates(today).map((d) => {
    const k = ymd(d);
    if (a?.since && k < a.since) return 'off';
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
  if (a && perWeekOf(scheduleAt(a, ymd(today))) > 0) return { done: weekDone(doc.dayLog, key, today, a.since), planned: weekTarget(a, today) };
  const planned = weekDates(today).filter((d) => scheduledOn(a, d));
  return { done: planned.filter((d) => doneOn(doc.dayLog, key, ymd(d))).length, planned: planned.length };
}

// ── 습관 연속 기록 ─────────────────────────────────────────────────────────────
/** 연속 기록을 거슬러 보는 최대 날 수(약 2년) — 그보다 오래된 기록은 최고 기록에도 넣지 않는다 */
export const STREAK_SPAN = 730;

export interface HabitStreak {
  /** 지금 이어 가는 기록 — 요일 습관은 이어서 지킨 예정일 수, 주 N회는 이어서 채운 주 수 */
  cur: number;
  /** 가장 길게 이어 간 기록(지금 기록 포함) */
  best: number;
  unit: 'day' | 'week';
}

/**
 * 습관 하나의 연속 기록 — 정한 일정대로 센다(일정을 고쳤다면 지난 날은 그때의 일정으로).
 * - 요일 습관: 예정일만 센다. 쉬는 날(월·수·금 습관의 화·목)은 건너뛰어 끊기지 않고, 쉬는 날에 한 것은 더하지도 않는다.
 *   아직 체크하지 않은 오늘은 끊지 않는다(하루가 끝나지 않았다).
 * - 주 N회 습관: 월~일 한 주에 목표 횟수를 채운 주를 이어서 센다(습관을 정한 주는 남은 날만큼이 목표).
 *   이번 주는 채웠으면 1을 더하고, 아직 못 채웠어도 남은 날로 채울 수 있으면 더하지도 끊지도 않는다.
 * - 습관을 정한 날(since) 전과 STREAK_SPAN일보다 오래된 기록은 보지 않는다.
 * 습관이 아니면 { cur: 0, best: 0, unit: 'day' }.
 *
 * 빠르게: dayLog마다 칸별 기록한 날 모음(logIndex)을 한 번만 만들고, 날짜는 정수로 걷는다.
 * 결과는 칸(실천 객체)마다 기억해 두고, 그 칸의 기록한 날 모음·오늘이 그대로면 다시 세지 않는다 —
 * 체크 하나에는 그 칸 하나만 다시 센다. 돌려주는 객체는 고쳐 쓰지 않는다.
 */
export function habitStreak(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, ti: number, ai: number, today: Date): HabitStreak {
  const a = doc.themes[ti]?.actions[ai];
  if (!a || kindOf(a) !== 'habit') return { cur: 0, best: 0, unit: 'day' };
  const key = `${ti}-${ai}`;
  const tk = ymd(today);
  const days = logIndex(doc.dayLog).get(key);
  const memo = streakMemo.get(a);
  if (memo && memo.key === key && memo.tk === tk && memo.days === days) return memo.res;
  const res = countStreak(a, days, tk);
  streakMemo.set(a, { key, tk, days, res });
  return res;
}

// ── 연속 기록 계산 도구 ──────────────────────────────────────────────────────
const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' → 1970-01-01부터 센 날 수(달력 날짜라 서머타임과 무관) */
export function dayNum(key: string): number {
  return Math.round(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10))) / DAY_MS);
}

/** 날 수 → 요일(0=일) — 1970-01-01은 목요일 */
function dowOf(n: number): number {
  return (((n + 4) % 7) + 7) % 7;
}

type DayLog = MandaratDoc['dayLog'];
/** 칸 키 → 기록한 날(날 수) 모음 */
type LogIndex = Map<string, Set<number>>;

const indexCache = new WeakMap<DayLog, LogIndex>();
// 바로 앞 dayLog와 그 모음 — 다음 dayLog는 바뀐 날만 고쳐 만든다(체크 하나는 날 하나만 바꾼다)
let prevLog: DayLog | null = null;
let prevIndex: LogIndex | null = null;

function buildIndex(dayLog: DayLog): LogIndex {
  const idx: LogIndex = new Map();
  for (const [day, list] of Object.entries(dayLog)) {
    const n = dayNum(day);
    for (const k of list) {
      let set = idx.get(k);
      if (!set) idx.set(k, (set = new Set()));
      set.add(n);
    }
  }
  return idx;
}

/** prev에서 next로 바뀐 날(배열이 바뀐 날)만 살펴 새 모음을 만든다 — 바뀐 칸의 모음만 새 Set(나머지는 그대로 같은 Set) */
function patchIndex(prev: DayLog, idx: LogIndex, next: DayLog): LogIndex {
  const touched = new Map<string, Set<number>>();
  const edit = (k: string) => {
    let set = touched.get(k);
    if (!set) touched.set(k, (set = new Set(idx.get(k))));
    return set;
  };
  const diff = (day: string, before: readonly string[], after: readonly string[]) => {
    const n = dayNum(day);
    for (const k of before) if (!after.includes(k)) edit(k).delete(n);
    for (const k of after) if (!before.includes(k)) edit(k).add(n);
  };
  for (const day of Object.keys(next)) {
    const after = next[day];
    const before = Object.prototype.hasOwnProperty.call(prev, day) ? prev[day] : undefined;
    if (after !== before) diff(day, before ?? [], after);
  }
  for (const day of Object.keys(prev)) {
    if (!Object.prototype.hasOwnProperty.call(next, day)) diff(day, prev[day], []);
  }
  if (touched.size === 0) return idx;
  const out = new Map(idx);
  for (const [k, set] of touched) {
    if (set.size > 0) out.set(k, set);
    else out.delete(k);
  }
  return out;
}

/** dayLog의 칸별 기록한 날 모음 — 같은 dayLog에는 같은 모음 */
export function logIndex(dayLog: DayLog): LogIndex {
  const hit = indexCache.get(dayLog);
  if (hit) return hit;
  const idx = prevLog && prevIndex ? patchIndex(prevLog, prevIndex, dayLog) : buildIndex(dayLog);
  indexCache.set(dayLog, idx);
  prevLog = dayLog;
  prevIndex = idx;
  return idx;
}

interface StreakMemo {
  key: string;
  tk: string;
  days: Set<number> | undefined;
  res: HabitStreak;
}
const streakMemo = new WeakMap<Action, StreakMemo>();

/** 일정 한 구간 — from(날 수)부터. mask: 반복 요일 비트(요일 습관), perWeek: 주 N회 */
interface Segment {
  from: number;
  mask: number;
  perWeek: number;
}

function segmentOf(from: number, f: KindFields): Segment {
  let mask = 0;
  for (const d of habitDays(f)) mask |= 1 << d;
  return { from, mask, perWeek: perWeekOf(f) };
}

/** 칸의 일정 구간들(오래된 것부터) — 고친 적이 없으면 지금 일정 하나. 첫 구간보다 이른 날은 첫 구간으로 본다 */
function segmentsOf(a: Action): Segment[] {
  const list = a.schedule;
  if (!list || list.length === 0) return [segmentOf(-Infinity, a)];
  const segs = list.slice(0, -1).map((e) => segmentOf(dayNum(e.from), entryFields(a.kind, e)));
  segs.push(segmentOf(dayNum(list[list.length - 1].from), a));
  return segs;
}

function countStreak(a: Action, days: Set<number> | undefined, tk: string): HabitStreak {
  const unit = perWeekOf(a) > 0 ? 'week' : 'day';
  const none: HabitStreak = { cur: 0, best: 0, unit };
  if (!days || days.size === 0) return none;
  const T = dayNum(tk);
  // 셀 첫날 = 이 칸 기록이 처음 남은 날 — 단, 습관을 정한 날 전이나 STREAK_SPAN일보다 앞이면 거기서부터
  let start = Infinity;
  for (const n of days) if (n <= T && n < start) start = n;
  if (start === Infinity) return none;
  const since = a.since ? dayNum(a.since) : -Infinity;
  if (since > start) start = since;
  const floor = T - (STREAK_SPAN - 1);
  if (floor > start) start = floor;
  if (start > T) return none;
  const segs = segmentsOf(a);
  // 구간은 한두 개뿐이라 뒤에서부터 찾는다
  const segAt = (n: number) => {
    let i = segs.length - 1;
    while (i > 0 && segs[i].from > n) i--;
    return segs[i];
  };

  let run = 0;
  let best = 0;
  if (unit === 'day') {
    // 하루씩 앞으로 — 예정일에 했으면 잇고, 못 했으면 끊는다(오늘은 끊지 않는다)
    for (let n = start; n <= T; n++) {
      if (!((segAt(n).mask >> dowOf(n)) & 1)) continue;
      if (days.has(n)) best = Math.max(best, ++run);
      else if (n !== T) run = 0;
    }
    return { cur: run, best, unit };
  }

  // 한 주씩 앞으로(월요일 기준)
  const doneToday = days.has(T);
  for (let mon = start - ((dowOf(start) + 6) % 7); mon <= T; mon += 7) {
    const sun = mon + 6;
    const current = sun >= T;
    const ref = current ? T : sun;
    // 그 주의 목표는 그 주(이번 주는 오늘)에 쓰던 일정으로 — 그때 요일 습관이었다면 예정일 수
    const seg = segAt(ref);
    let done = 0;
    let target: number;
    if (seg.perWeek > 0) {
      for (let n = Math.max(mon, since); n <= ref; n++) if (days.has(n)) done++;
      target = since > mon ? Math.max(1, Math.min(seg.perWeek, sun - since + 1)) : seg.perWeek;
    } else {
      target = 0;
      for (let n = Math.max(mon, since); n <= sun; n++) {
        if (!((segAt(n).mask >> dowOf(n)) & 1)) continue;
        target++;
        if (n <= ref && days.has(n)) done++;
      }
      if (target === 0) continue;
    }
    if (done >= target) best = Math.max(best, ++run);
    else if (!current) run = 0;
    else {
      // 이번 주: 남은 날(오늘을 아직 안 했으면 오늘 포함)로 아직 채울 수 있으면 그대로 둔다
      const left = sun - T + (doneToday ? 0 : 1);
      if (left < target - done) run = 0;
    }
  }
  return { cur: run, best, unit };
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

interface TodayMemo {
  dayLog: MandaratDoc['dayLog'];
  todayKeys: readonly string[];
  tk: string;
  items: TodayItem[];
}
// themes마다 마지막 결과 — 홈·오늘·만다라트가 한 번 바뀔 때 여러 번 부르므로 같은 문서면 한 번만 센다
const todayMemo = new WeakMap<MandaratDoc['themes'], TodayMemo>();

/**
 * 오늘 실천 목록 = 직접 담은 항목 ∪ 저절로 담기는 항목. 글자가 없는 칸과 마음가짐은 뺀다.
 * themes · dayLog · todayKeys · 날짜가 그대로면 같은(얼린) 배열을 돌려준다 — 고쳐 쓰지 말고 새 배열로 만들어 쓴다.
 */
export function todayItems(doc: Pick<MandaratDoc, 'themes' | 'dayLog' | 'todayKeys'>, today: Date): TodayItem[] {
  const tk = ymd(today);
  const memo = todayMemo.get(doc.themes);
  if (memo && memo.dayLog === doc.dayLog && memo.todayKeys === doc.todayKeys && memo.tk === tk) return memo.items;
  const seen = new Set<string>();
  const out: TodayItem[] = [];
  const push = (ti: number, ai: number, auto?: boolean) => {
    const key = `${ti}-${ai}`;
    const a = doc.themes[ti]?.actions[ai];
    if (seen.has(key) || !a || !a.text.trim()) return;
    const kind = kindOf(a);
    if (kind === 'mind') return;
    seen.add(key);
    out.push(Object.freeze({
      ti, ai, key, kind, routine: kind === 'habit', scheduled: auto ?? autoToday(doc, ti, ai, today), done: doneToday(doc, a, key, tk),
    }));
  };
  for (const k of doc.todayKeys) {
    const [ti, ai] = k.split('-').map(Number);
    push(ti, ai);
  }
  doc.themes.forEach((t, ti) => t.actions.forEach((_, ai) => {
    if (autoToday(doc, ti, ai, today)) push(ti, ai, true);
  }));
  const items = Object.freeze(out) as TodayItem[];
  todayMemo.set(doc.themes, { dayLog: doc.dayLog, todayKeys: doc.todayKeys, tk, items });
  return items;
}

/**
 * '오늘' 목록에서의 급한 정도 — 작을수록 위.
 * 마감 지남 0 · 오늘 마감 1 · 마감 D-1~3 2 · 그 밖의 한 번(직접 담은 것) 3 · 쌓기 4 · 습관 5 · 그 밖 6
 */
export function todayRank(item: Pick<TodayItem, 'ti' | 'ai' | 'kind'>, doc: Pick<MandaratDoc, 'themes'>, todayKey: string): number {
  if (item.kind === 'once') {
    const due = doc.themes[item.ti]?.actions[item.ai]?.due;
    const days = due ? daysBetween(todayKey, due) : NaN;
    if (days < 0) return 0;
    if (days === 0) return 1;
    if (days <= DUE_SOON) return 2;
    return 3;
  }
  if (item.kind === 'count') return 4;
  if (item.kind === 'habit') return 5;
  return 6;
}

/**
 * 급한 것부터 다시 늘어놓은 새 배열(todayRank 순). 같은 무게끼리는 원래 순서를 지킨다.
 * todayItems 자체의 순서(직접 담은 것 → 저절로 담긴 것)는 바꾸지 않는다.
 */
export function sortTodayItems<T extends Pick<TodayItem, 'ti' | 'ai' | 'kind'>>(items: readonly T[], doc: Pick<MandaratDoc, 'themes'>, today: Date): T[] {
  const tk = ymd(today);
  return items
    .map((item, i) => ({ item, i, rank: todayRank(item, doc, tk) }))
    .sort((x, y) => x.rank - y.rank || x.i - y.i)
    .map((x) => x.item);
}

/** 화면에 늘어놓을 '오늘' 실천 목록 — 급한 것부터(마감 지남 → 오늘 마감 → 다가온 마감 → 직접 담은 한 번 → 쌓기 → 습관) */
export function orderedTodayItems(doc: Pick<MandaratDoc, 'themes' | 'dayLog' | 'todayKeys'>, today: Date): TodayItem[] {
  return sortTodayItems(todayItems(doc, today), doc, today);
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
