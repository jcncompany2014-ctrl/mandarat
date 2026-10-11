// 요일 반복 루틴 + "오늘 실천" 목록 계산 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
//
// 모델:
// - 실천(Action)에 반복 요일(days, 0=일 … 6=토)이 있으면 루틴이다.
// - 루틴의 오늘 체크는 dayLog[날짜]에만 기록한다. 만다라트 칸의 영구 달성(done)과는 별개라서
//   월요일에 체크해도 수요일 칸은 다시 비어 있다.
// - 루틴이 아닌 실천은 지금처럼 done(영구 달성)이 곧 오늘 완료 여부다.
import type { Action, MandaratDoc } from '../types';

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

export function isRoutine(a: Pick<Action, 'days'>): boolean {
  return normalizeDays(a.days).length > 0;
}

/** 반복 요일 라벨: 매일 · 평일 · 주말 · 월·수·금 (없으면 빈 문자열) */
export function daysLabel(days: unknown): string {
  const d = normalizeDays(days);
  if (d.length === 0) return '';
  if (d.length === 7) return '매일';
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

export type DayState = 'done' | 'today' | 'missed' | 'planned' | 'off';

/** 루틴의 이번 주(월~일) 7칸 상태 */
export function routineWeek(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, ti: number, ai: number, today: Date): DayState[] {
  const days = normalizeDays(doc.themes[ti]?.actions[ai]?.days);
  const key = `${ti}-${ai}`;
  const todayKey = ymd(today);
  return weekDates(today).map((d) => {
    const k = ymd(d);
    const scheduled = days.includes(d.getDay());
    if (doneOn(doc.dayLog, key, k)) return 'done';
    if (!scheduled) return 'off';
    if (k === todayKey) return 'today';
    return k < todayKey ? 'missed' : 'planned';
  });
}

/** 이번 주 달성 횟수 / 예정 횟수 (예정 = 이번 주에 반복 요일이 돌아오는 날 수) */
export function routineWeekCount(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, ti: number, ai: number, today: Date): { done: number; planned: number } {
  const states = routineWeek(doc, ti, ai, today);
  const days = normalizeDays(doc.themes[ti]?.actions[ai]?.days);
  return { done: states.filter((s) => s === 'done').length, planned: days.length };
}

export interface TodayItem {
  ti: number;
  ai: number;
  key: string;
  /** 반복 요일이 있는 실천인가 */
  routine: boolean;
  /** 오늘 요일이 반복 요일에 포함되는가 */
  scheduled: boolean;
  /** 오늘 완료했는가 (루틴은 오늘 기록, 아니면 영구 달성) */
  done: boolean;
}

/** 오늘 실천 목록 = 직접 담은 항목 ∪ 오늘 요일 루틴. 글자가 없는 칸은 뺀다. */
export function todayItems(doc: Pick<MandaratDoc, 'themes' | 'dayLog' | 'todayKeys'>, today: Date): TodayItem[] {
  const dow = today.getDay();
  const tk = ymd(today);
  const seen = new Set<string>();
  const out: TodayItem[] = [];
  const push = (ti: number, ai: number) => {
    const key = `${ti}-${ai}`;
    const a = doc.themes[ti]?.actions[ai];
    if (seen.has(key) || !a || !a.text.trim()) return;
    seen.add(key);
    const days = normalizeDays(a.days);
    const routine = days.length > 0;
    out.push({ ti, ai, key, routine, scheduled: days.includes(dow), done: routine ? doneOn(doc.dayLog, key, tk) : a.done });
  };
  for (const k of doc.todayKeys) {
    const [ti, ai] = k.split('-').map(Number);
    push(ti, ai);
  }
  doc.themes.forEach((t, ti) => t.actions.forEach((a, ai) => {
    if (normalizeDays(a.days).includes(dow)) push(ti, ai);
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
