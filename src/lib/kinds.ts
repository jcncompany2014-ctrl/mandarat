// 실천 유형별 값 다루기 — 쌓기 숫자, 한 번의 마감, 마음가짐 점수, 유형 설정 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
import type { Action, ActionKind, HabitSchedule, IconName, MandaratDoc } from '../types';
import {
  KINDS, daysBetween, habitDays, kindOf, normalizeDays, normalizePerWeek, perWeekOf, routineWeekCount,
  setDayLog, weekDates, weekKey, ymd,
} from './routine';
import { fmtNum } from './text';
import { msg, type Lang } from '../i18n';
import { liveList, liveRecord } from '../i18n/live';
import { MONEY_SPACE } from '../i18n/ko/kindSuggest.data';

/** 유형 이름 — 말은 msg().kinds.label*에 있다 */
export function kindLabels(l?: Lang): Record<ActionKind, string> {
  const k = msg(l).kinds;
  return { once: k.labelOnce, habit: k.labelHabit, count: k.labelCount, mind: k.labelMind };
}

/** 유형 고르기 아래 한 줄 설명 — 짧게, 그 유형이 '오늘'과 칸에 어떻게 이어지는지만(msg().kinds.hint*) */
export function kindHints(l?: Lang): Record<ActionKind, string> {
  const k = msg(l).kinds;
  return { once: k.hintOnce, habit: k.hintHabit, count: k.hintCount, mind: k.hintMind };
}

/** @deprecated kindLabels() — 지금 언어로 읽히는 보기(V8-A가 쓰는 곳이 없어지면 지운다) */
export const KIND_LABEL: Record<ActionKind, string> = liveRecord(() => kindLabels());
/** @deprecated kindHints() — 지금 언어로 읽히는 보기(V8-A가 쓰는 곳이 없어지면 지운다) */
export const KIND_HINT: Record<ActionKind, string> = liveRecord(() => kindHints());

// ── 숫자 ─────────────────────────────────────────────────────────────────────
export const MAX_NUM = 1_000_000_000;

/** 소수 둘째 자리까지 — 0.1 + 0.2 같은 부동소수 찌꺼기를 남기지 않는다 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 저장본·입력 숫자 검증: 유한한 수를 범위 안으로(벗어나면 undefined) */
export function cleanNum(v: unknown, min = 0, max = MAX_NUM): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  const n = round2(v) + 0; // -0 → 0 (JSON을 거쳐도 같은 값이 되게)
  return n >= min && n <= max ? n : undefined;
}

/**
 * 입력 글자 → 숫자. 쉼표·공백은 무시한다('1,000' → 1000).
 * 숫자 키패드로 치다 만 꼴도 받는다('.5' → 0.5, '7.' → 7). 숫자가 아니면('1..5' · '7권' · '-3') undefined
 */
export function parseNum(text: string): number | undefined {
  const t = text.replace(/[,\s]/g, '');
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(t)) return undefined;
  return round2(Number(t));
}

// 1234.5 → '1,234.5' — 표기 함수는 text.ts에 두고(kinds ↔ text가 서로 불러오지 않게) 예전 자리에서도 쓸 수 있게 내보낸다
export { fmtNum };

/** 단위 정리 — 앞뒤 공백, 8글자까지. '만원'은 읽기 쉽게 '만 원'으로 */
export function cleanUnit(v: unknown): string {
  if (typeof v !== 'string') return '';
  const t = v.trim();
  return (MONEY_SPACE.get(t) ?? t).slice(0, 8);
}

// ── 쌓기 ─────────────────────────────────────────────────────────────────────
export interface CountInfo {
  count: number;
  goal: number;
  unit: string;
  step: number;
  /** 0~100 */
  pct: number;
  reached: boolean;
  /** 그날 더한 수 */
  today: number;
}

export function countInfo(a: Action, todayKey?: string): CountInfo {
  const goal = cleanNum(a.goal, 0.01) ?? 1;
  const count = cleanNum(a.count) ?? 0;
  const step = cleanNum(a.step, 0.01) ?? 1;
  return {
    count, goal, step,
    unit: cleanUnit(a.unit),
    pct: Math.min(100, Math.round((count / goal) * 100)),
    reached: count >= goal,
    today: todayKey ? cleanNum(a.log?.[todayKey]) ?? 0 : 0,
  };
}

/** '6/12권' · '6/12冊' · '6/12 books' */
export function countText(c: Pick<CountInfo, 'count' | 'goal' | 'unit'>, l?: Lang): string {
  return msg(l).kinds.countText({ count: c.count, total: c.goal, unit: c.unit });
}

function editAction<T extends Pick<MandaratDoc, 'themes'>>(doc: T, ti: number, ai: number, fn: (a: Action) => Action): T {
  return {
    ...doc,
    themes: doc.themes.map((t, i) => (i === ti ? { ...t, actions: t.actions.map((a, j) => (j === ai ? fn(a) : a)) } : t)),
  };
}

/**
 * 쌓기 수를 delta만큼 바꾼 새 문서. 그날 기록(action.log·dayLog)을 함께 맞추고,
 * 목표 선을 넘나들 때만 칸 달성을 바꾼다(직접 달성으로 표시해 둔 것은 그대로 둔다).
 * 0 아래로는 내려가지 않고, 그날 더한 수는 지금까지의 수를 넘지 않는다(편집 창에서 수를 줄인 뒤에도 어긋나지 않게).
 * 바뀐 게 없으면 같은 객체.
 */
export function addCount<T extends Pick<MandaratDoc, 'themes' | 'dayLog'>>(doc: T, ti: number, ai: number, delta: number, day: string): T {
  const a = doc.themes[ti]?.actions[ai];
  if (!a || kindOf(a) !== 'count' || !Number.isFinite(delta) || delta === 0) return doc;
  const c = countInfo(a, day);
  const next = Math.min(MAX_NUM, round2(Math.max(0, c.count + delta)));
  const real = round2(next - c.count);
  const todayAmt = round2(Math.min(next, Math.max(0, c.today + real)));
  if (real === 0 && todayAmt === c.today) return doc;
  const log = { ...(a.log ?? {}) };
  if (todayAmt > 0) log[day] = todayAmt;
  else delete log[day];
  let done = a.done;
  if (!c.reached && next >= c.goal) done = true;
  else if (c.reached && next < c.goal) done = false;
  const key = `${ti}-${ai}`;
  const out = editAction(doc, ti, ai, (x) => ({ ...x, count: next, log, done }));
  return { ...out, dayLog: setDayLog(doc.dayLog, key, day, todayAmt > 0) };
}

/** 목록의 체크 — 그날 더한 게 없으면 한 번(step)만큼 더하고, 있으면 그날 더한 만큼 되돌린다 */
export function toggleCountToday<T extends Pick<MandaratDoc, 'themes' | 'dayLog'>>(doc: T, ti: number, ai: number, day: string): T {
  const a = doc.themes[ti]?.actions[ai];
  if (!a || kindOf(a) !== 'count') return doc;
  const c = countInfo(a, day);
  return c.today > 0 ? addCount(doc, ti, ai, -c.today, day) : addCount(doc, ti, ai, c.step, day);
}

/** 이번 주(월~오늘) 더한 수 */
export function countWeekAdded(a: Action, today: Date): number {
  const tk = ymd(today);
  return round2(weekDates(today).reduce((s, d) => {
    const k = ymd(d);
    return k > tk ? s : s + (cleanNum(a.log?.[k]) ?? 0);
  }, 0));
}

export interface CountPace {
  /** 최근 기간의 하루 평균 더한 수 — 0이면 아직 속도를 알 수 없다 */
  rate: number;
  /** 이 속도로 목표에 닿는 날 'YYYY-MM-DD' — 이미 닿았거나, 속도가 0이거나, 10년 넘게 걸리면 null */
  eta: string | null;
  /** 최근 기간(오늘 포함 days일)에 더한 수 */
  added: number;
  /** 기간이 시작되기 전까지 쌓인 수 — 막대 위 'n주 전' 눈금 자리 */
  before: number;
}

/** 이 속도면 언제 — 최근 days일(오늘 포함)에 더한 수로 목표에 닿는 날을 어림한다 */
export function countPace(a: Action, today: Date, days = 28): CountPace {
  const c = countInfo(a);
  const tk = ymd(today);
  const n = Math.max(1, Math.floor(days));
  const from = addDays(tk, -(n - 1));
  let added = 0;
  let first: string | null = null;
  for (const [k, v] of Object.entries(a.log ?? {})) {
    const amt = cleanNum(v) ?? 0;
    if (amt <= 0 || k > tk) continue;
    if (first === null || k < first) first = k;
    if (k >= from) added += amt;
  }
  added = round2(added);
  // 기간 중간에 처음 쌓기 시작했다면 그날부터 나눈다(사흘 전에 시작한 속도를 28일로 나누지 않게).
  // 하루 이틀로 부풀지 않게 일주일보다 짧게는 나누지 않는다.
  const span = first !== null && first > from ? Math.min(n, Math.max(Math.min(7, n), daysBetween(first, tk) + 1)) : n;
  const rate = added / span;
  const before = round2(Math.max(0, c.count - added));
  let eta: string | null = null;
  if (!c.reached && rate > 0) {
    const need = Math.ceil((c.goal - c.count) / rate - 1e-9);
    if (need <= 3650) eta = addDays(tk, need);
  }
  return { rate, eta, added, before };
}

// ── 한 번: 마감 ───────────────────────────────────────────────────────────────
export interface DueInfo {
  date: string;
  /** 오늘부터 마감까지 남은 날(지났으면 음수) */
  days: number;
  /** 좁은 자리 — 'D-3' · 'D-day' · 'D+2' (text.fmtDue 짧게) */
  label: string;
  /** 글 속 — '마감 D-3' · '오늘 마감' · '마감 2일 지남' (text.fmtDue 길게) */
  long: string;
  over: boolean;
}

export function dueInfo(a: Action, today: Date, l?: Lang): DueInfo | null {
  if (kindOf(a) !== 'once' || !a.due) return null;
  const days = daysBetween(ymd(today), a.due);
  const f = msg(l).fmt;
  return { date: a.due, days, label: f.dueShort({ days }), long: f.dueLong({ days }), over: days < 0 };
}

/** 'YYYY-MM-DD' → 그날 0시 */
function keyDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** '10.20 (월)' (fmt.dateShort) — 올해가 아니면 연도까지('2027년 1.4 (월)') */
export function dateText(key: string, today = new Date(), l?: Lang): string {
  const d = keyDate(key);
  const m = msg(l);
  return d.getFullYear() !== today.getFullYear() ? m.kinds.dateOtherYear({ d, y: d.getFullYear() }) : m.fmt.dateShort({ d });
}

/** 'YYYY-MM-DD'에 n일 더하기 */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return ymd(new Date(y, m - 1, d + n));
}

/**
 * 마감 빠른 선택 — 이번 주 일요일 · 이번 달 말 · 3개월 뒤 · 올해 말.
 * '3개월 뒤'는 그달에 없는 날이면 그달 마지막 날로(11월 30일 → 2월 28일).
 * 날짜가 겹치면(달 끝이 일요일, 12월 31일) 앞의 것만 남긴다.
 */
export function duePresets(today: Date, l?: Lang): { label: string; date: string }[] {
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  const sun = ymd(weekDates(today)[6]);
  const k = msg(l).kinds;
  const all = [
    { label: k.presetWeek, date: sun },
    { label: k.presetMonth, date: ymd(new Date(y, m + 1, 0)) },
    { label: k.preset3Months, date: ymd(new Date(y, m + 3, Math.min(d, new Date(y, m + 4, 0).getDate()))) },
    { label: k.presetYear, date: `${y}-12-31` },
  ];
  const seen = new Set<string>();
  return all.filter((p) => (seen.has(p.date) ? false : (seen.add(p.date), true)));
}

// ── 마음가짐: 한 주 점수 ──────────────────────────────────────────────────────
/** 점수(1~5) 아래 한 줄 — 0은 빈 글 */
export function ratingTexts(l?: Lang): readonly string[] {
  const k = msg(l).kinds;
  return ['', k.rating1, k.rating2, k.rating3, k.rating4, k.rating5];
}

/** @deprecated ratingTexts() — 지금 언어로 읽히는 보기(V8-A가 쓰는 곳이 없어지면 지운다) */
export const RATING_TEXT: readonly string[] = liveList(() => ratingTexts());

/** 이번 주 점수(1~5), 아직이면 0 */
export function ratingOf(a: Action, today: Date): number {
  const r = a.ratings?.[weekKey(today)];
  return Number.isInteger(r) && (r as number) >= 1 && (r as number) <= 5 ? (r as number) : 0;
}

/** 이번 주 점수를 매긴 새 문서 — 0이면 지운다 */
export function rateWeek<T extends Pick<MandaratDoc, 'themes'>>(doc: T, ti: number, ai: number, score: number, today: Date): T {
  const a = doc.themes[ti]?.actions[ai];
  if (!a || kindOf(a) !== 'mind') return doc;
  const wk = weekKey(today);
  const s = Number.isInteger(score) && score >= 1 && score <= 5 ? score : 0;
  if ((a.ratings?.[wk] ?? 0) === s) return doc;
  return editAction(doc, ti, ai, (x) => {
    const ratings = { ...(x.ratings ?? {}) };
    if (s) ratings[wk] = s;
    else delete ratings[wk];
    return { ...x, ratings };
  });
}

/** 최근 n주 점수(오래된 주 → 이번 주). 매기지 않은 주는 0 */
export function ratingHistory(a: Action, today: Date, weeks = 8): { week: string; score: number }[] {
  const mon = weekDates(today)[0];
  return Array.from({ length: weeks }, (_, i) => {
    const wk = ymd(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - (weeks - 1 - i) * 7));
    const r = a.ratings?.[wk];
    return { week: wk, score: Number.isInteger(r) && (r as number) >= 1 && (r as number) <= 5 ? (r as number) : 0 };
  });
}

// ── 유형 설정 ─────────────────────────────────────────────────────────────────
export interface KindConfig {
  kind: ActionKind;
  /** 습관: 요일(비면 주 N회) */
  days?: number[];
  /** 습관: 주 N회 */
  perWeek?: number;
  /** 쌓기 */
  goal?: number;
  unit?: string;
  step?: number;
  count?: number;
  /** 한 번: 마감일(없으면 마감 없음) */
  due?: string;
  /** 습관: 알림 시각 'HH:MM'(없으면 알림 없음) */
  remindAt?: string;
}

/** 알림 시각 'HH:MM' — src/data/defaults.ts TIME_RE와 같다 */
const REMIND_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** 지금 칸의 설정(편집 화면의 처음 값). 쌓기로 처음 바꿀 때 이미 달성한 칸은 목표만큼 채워 둔다. */
export function configOf(a: Action): KindConfig {
  const kind = kindOf(a);
  const c = countInfo(a);
  const pw = normalizePerWeek(a.perWeek);
  return {
    kind,
    days: normalizeDays(a.days).length > 0 || pw === 0 ? habitDaysOrEvery(a) : [],
    perWeek: pw || 3,
    goal: cleanNum(a.goal, 0.01),
    unit: cleanUnit(a.unit),
    step: c.step,
    count: a.count !== undefined ? c.count : a.done && cleanNum(a.goal, 0.01) ? c.goal : 0,
    ...(a.due ? { due: a.due } : {}),
    ...(a.remindAt ? { remindAt: a.remindAt } : {}),
  };
}

function habitDaysOrEvery(a: Action): number[] {
  const d = normalizeDays(a.days);
  return d.length > 0 ? d : [0, 1, 2, 3, 4, 5, 6];
}

/** 두 설정이 칸에 같은 결과를 내는가 — 그 유형에 쓰이는 값만 비교한다 */
export function sameConfig(x: KindConfig, y: KindConfig): boolean {
  if (x.kind !== y.kind) return false;
  if (x.kind === 'habit') {
    const dx = normalizeDays(x.days);
    const dy = normalizeDays(y.days);
    if ((x.remindAt ?? '') !== (y.remindAt ?? '')) return false;
    if (dx.length > 0 || dy.length > 0) return dx.join() === dy.join();
    return normalizePerWeek(x.perWeek) === normalizePerWeek(y.perWeek);
  }
  if (x.kind === 'count') {
    return (x.goal ?? 0) === (y.goal ?? 0) && cleanUnit(x.unit) === cleanUnit(y.unit) && (x.step ?? 1) === (y.step ?? 1) && (x.count ?? 0) === (y.count ?? 0);
  }
  if (x.kind === 'once') return (x.due ?? '') === (y.due ?? '');
  return true;
}

/**
 * 칸에 유형 설정을 입힌다. 다른 유형의 값(요일·숫자·점수)은 지우지 않고 남겨 둬서,
 * 유형을 바꿨다가 되돌려도 이전 설정이 그대로 돌아온다(쓰지 않는 값은 화면·계산에서 무시된다).
 * - 습관이 새로 되는 날을 since로 남긴다(그 전 날은 놓친 날이 아님). 이미 습관이면 since 유지.
 * - 쌓기는 목표나 지금까지의 수가 바뀔 때 목표에 닿았는지로 칸 달성을 다시 정한다.
 */
export function applyConfig(a: Action, cfg: KindConfig, todayKey: string): Action {
  if (!KINDS.includes(cfg.kind)) return a;
  const wasKind = kindOf(a);
  const out: Action = { ...a, kind: cfg.kind };
  // 습관 → 쌓기는 바꾼 날을 남긴다 — 같은 날 습관으로 되돌리면 그 습관이 이어진다(아래 keep). 쌓기가 아니게 되면 지운다
  if (cfg.kind === 'count' && wasKind === 'habit') out.habitUntil = todayKey;
  else if (cfg.kind !== 'count') delete out.habitUntil;
  if (cfg.kind === 'habit') {
    const days = normalizeDays(cfg.days);
    const pw = normalizePerWeek(cfg.perWeek);
    if (days.length > 0 || pw === 0) {
      out.days = days.length > 0 ? days : [0, 1, 2, 3, 4, 5, 6];
      delete out.perWeek;
    } else {
      out.perWeek = pw;
      delete out.days;
    }
    // 이미 습관이던 칸, 또는 오늘 습관에서 쌓기로 바꿨다가 되돌린 칸은 습관이 이어진다(since·일정 내력 그대로).
    // 그 밖(한 번·마음가짐에서, 또는 며칠 지나 쌓기에서)은 오늘부터 새 습관 — 지난 날을 놓친 날로 세지 않게
    const keep = wasKind === 'habit' || (wasKind === 'count' && !!a.since && a.habitUntil === todayKey);
    const since = keep ? a.since : todayKey;
    if (since) out.since = since;
    else delete out.since;
    // 이어지는 습관의 일정을 고치면 지난 일정을 남겨 둔다(지난 날은 그때 일정으로 센다). 새로 습관이 되면 처음부터
    const schedule = keep ? nextSchedule(a, out, todayKey) : undefined;
    if (schedule) out.schedule = schedule;
    else delete out.schedule;
    // 알림 시각은 습관에서만 정한다 — 다른 유형으로 바꿔도 남겨 둔다(되돌리면 다시 울린다)
    if (cfg.remindAt && REMIND_RE.test(cfg.remindAt)) out.remindAt = cfg.remindAt;
    else delete out.remindAt;
  } else if (cfg.kind === 'count') {
    const before = wasKind === 'count' ? countInfo(a) : null;
    const goal = cleanNum(cfg.goal, 0.01) ?? cleanNum(a.goal, 0.01) ?? 1;
    const count = cleanNum(cfg.count) ?? cleanNum(a.count) ?? 0;
    const step = cleanNum(cfg.step, 0.01) ?? 1;
    out.goal = goal;
    out.count = count;
    const unit = cleanUnit(cfg.unit);
    if (unit) out.unit = unit;
    else delete out.unit;
    if (step !== 1) out.step = step;
    else delete out.step;
    if (!before || before.goal !== goal || before.count !== count) out.done = count >= goal;
    // 지금까지의 수를 줄였다면 그날 더한 수도 그 안으로 — 목록 체크가 그날 기록과 어긋나지 않게
    const todayAmt = cleanNum(out.log?.[todayKey]) ?? 0;
    if (todayAmt > count) {
      const log = { ...(out.log ?? {}) };
      if (count > 0) log[todayKey] = count;
      else delete log[todayKey];
      out.log = log;
    }
  } else if (cfg.kind === 'once') {
    if (cfg.due && /^\d{4}-\d{2}-\d{2}$/.test(cfg.due)) out.due = cfg.due;
    else delete out.due;
  }
  return out;
}

/** 일정 한 토막의 값(요일 또는 주 N회) — 요일 습관이면 요일, 주 N회면 횟수 */
function scheduleValue(a: Pick<Action, 'days' | 'perWeek'>): Omit<HabitSchedule, 'from'> {
  const days = normalizeDays(a.days);
  const pw = normalizePerWeek(a.perWeek);
  if (days.length > 0 || pw === 0) return { days: days.length > 0 ? days : [0, 1, 2, 3, 4, 5, 6] };
  return { perWeek: pw };
}

function sameSchedule(x: Omit<HabitSchedule, 'from'>, y: Omit<HabitSchedule, 'from'>): boolean {
  return (x.perWeek ?? 0) === (y.perWeek ?? 0) && normalizeDays(x.days).join() === normalizeDays(y.days).join();
}

/**
 * 습관 일정을 고친 뒤의 내력 — 오늘부터 새 일정. 오늘 이미 고친 것은 덮어쓰고, 앞 토막과 같아지면 합친다.
 * 토막이 하나뿐이면(지난 일정이 지금과 같으면) 내력을 두지 않는다(undefined) — 이전 저장본과 같은 모양.
 */
function nextSchedule(prev: Action, next: Action, todayKey: string): HabitSchedule[] | undefined {
  const before = scheduleValue(prev);
  const after = scheduleValue(next);
  const had = prev.schedule && prev.schedule.length > 0 ? prev.schedule : undefined;
  if (sameSchedule(before, after)) return had;
  const list: HabitSchedule[] = had ? [...had] : [{ from: prev.since ?? EPOCH, ...before }];
  while (list.length > 0 && list[list.length - 1].from >= todayKey) list.pop();
  if (list.length === 0 || !sameSchedule(list[list.length - 1], after)) list.push({ from: todayKey, ...after });
  return list.length > 1 ? list : undefined;
}

/** 첫 일정의 시작 — 습관을 정한 날(since)을 모르는 이전 칸 */
const EPOCH = '1970-01-01';

/** 칸을 비울 때 — 글과 유형별 값·달성·알림 시각을 모두 지우고 메모만 남긴다(다음에 쓰는 실천이 이전 숫자·기록을 이어받지 않게) */
export function clearedAction(a: Action): Action {
  return { text: '', note: a.note, done: false };
}

// ── 화면에 붙는 한 줄 ─────────────────────────────────────────────────────────
export interface KindLine {
  icon?: IconName;
  /** 좁은 칸용 — '월·수·금' · '이번 주 2/3' · '6/12권' · 'D-3' · '마음가짐 4점' */
  short: string;
  /** 목록용(진행) — '월·수·금 반복' · '이번 주 2/3회' · '6/12권 · 오늘 +1' · '마감 D-3' · '마음가짐 · 이번 주 4점' */
  long: string;
  /** 정한 것(계획) — '월·수·금 반복' · '주 3회' · '6/12권' · '마감 D-3' · '마음가짐' */
  plan: string;
  /**
   * 소리로 읽을 말(long과 같은 내용) — '이번 주 3회 중 2회' · '12권 중 6권, 오늘 1권 더함' · '마감 3일 남음' · '마음가짐, 이번 주 4점'.
   * '6/12권'·'D-3'은 VoiceOver가 날짜·'디 마이너스'로 읽으므로 화면 읽기 라벨에는 long 대신 이것을 쓴다.
   */
  speech: string;
  /** 쌓기 진행(0~100) */
  pct?: number;
  /** 마감이 지났다 */
  alert?: boolean;
}

/** 마감을 소리로 — '마감 3일 남음' · '오늘 마감' · '마감 2일 지남' ('D-3'은 '디 마이너스 삼'으로 읽힌다). KindLine.speech가 쓴다 */
export function dueSpeech(days: number, l?: Lang): string {
  return msg(l).kinds.dueSpeech({ days });
}

/** 쌓기를 소리로 — '12권 중 6권' ('6/12권'은 날짜로 읽힌다). KindLine.speech가 쓴다 */
export function countSpeech(c: Pick<CountInfo, 'count' | 'goal' | 'unit'>, l?: Lang): string {
  return msg(l).kinds.countSpeech({ count: c.count, total: c.goal, unit: c.unit });
}

/** 유형별 보조 정보 — 붙일 게 없으면(마감 없는 한 번) null. 말은 msg(l).kinds */
export function kindLine(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, ti: number, ai: number, today: Date, l?: Lang): KindLine | null {
  const a = doc.themes[ti]?.actions[ai];
  if (!a) return null;
  const k = msg(l).kinds;
  const kind = kindOf(a);
  if (kind === 'habit') {
    const n = perWeekOf(a);
    if (n > 0) {
      const w = routineWeekCount(doc, ti, ai, today);
      const p = { done: w.done, total: w.planned };
      return { icon: 'repeat', short: k.weekShort(p), long: k.weekLong(p), plan: k.weekPlan({ n }), speech: k.weekSpeech(p) };
    }
    const dows = habitDays(a);
    const label = k.daysLong({ dows });
    return { icon: 'repeat', short: k.daysShort({ dows }), long: label, plan: label, speech: label };
  }
  if (kind === 'count') {
    const c = countInfo(a, ymd(today));
    const text = countText(c, l);
    const said = countSpeech(c, l);
    return {
      short: text, long: c.today > 0 ? k.countToday({ text, n: c.today }) : text, plan: text, pct: c.pct,
      speech: c.today > 0 ? k.countTodaySpeech({ said, n: c.today, unit: c.unit }) : said,
    };
  }
  if (kind === 'once') {
    const d = dueInfo(a, today, l);
    if (!d || a.done) return null;
    const label = d.long;
    const said = dueSpeech(d.days, l);
    return { icon: 'calendar', short: d.label, long: label, plan: label, speech: said, alert: d.over };
  }
  const r = ratingOf(a, today);
  return {
    short: r ? k.mindShort({ n: r }) : k.labelMind, long: r ? k.mindLong({ n: r }) : k.labelMind, plan: k.labelMind,
    speech: r ? k.mindSpeech({ n: r }) : k.labelMind,
  };
}
