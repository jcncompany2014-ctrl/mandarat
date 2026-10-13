// 실천 유형별 값 다루기 — 쌓기 숫자, 한 번의 마감, 마음가짐 점수, 유형 설정 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
import type { Action, ActionKind, IconName, MandaratDoc } from '../types';
import {
  KINDS, daysBetween, daysLabel, habitDays, kindOf, normalizeDays, normalizePerWeek, perWeekOf, routineWeekCount,
  setDayLog, weekDates, weekKey, ymd,
} from './routine';

export const KIND_LABEL: Record<ActionKind, string> = { once: '한 번', habit: '습관', count: '쌓기', mind: '마음가짐' };

/** 유형 고르기 아래 한 줄 설명 */
export const KIND_HINT: Record<ActionKind, string> = {
  once: '한 번 해내면 끝나는 일이에요. 마감일을 정하면 사흘 전부터 ‘오늘’에 담겨요.',
  habit: '정한 요일마다, 또는 주 N회를 채울 때까지 ‘오늘’에 담겨요.',
  count: '숫자를 채워 가는 목표예요. 목표에 닿으면 칸이 채워져요.',
  mind: '날마다 체크하지 않고, 한 주에 한 번 얼마나 지켰는지 1~5점으로 돌아봐요.',
};

// ── 숫자 ─────────────────────────────────────────────────────────────────────
export const MAX_NUM = 1_000_000_000;

/** 소수 둘째 자리까지 — 0.1 + 0.2 같은 부동소수 찌꺼기를 남기지 않는다 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 저장본·입력 숫자 검증: 유한한 수를 범위 안으로(벗어나면 undefined) */
export function cleanNum(v: unknown, min = 0, max = MAX_NUM): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  const n = round2(v);
  return n >= min && n <= max ? n : undefined;
}

/** 입력 글자 → 숫자. 쉼표·공백은 무시한다('1,000' → 1000). 숫자가 아니면 undefined */
export function parseNum(text: string): number | undefined {
  const t = text.replace(/[,\s]/g, '');
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined;
  return round2(Number(t));
}

/** 1234.5 → '1,234.5' (소수는 있을 때만) */
export function fmtNum(n: number): string {
  const r = round2(n);
  const [i, f] = String(Math.abs(r)).split('.');
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${r < 0 ? '-' : ''}${int}${f ? `.${f}` : ''}`;
}

/** 단위 정리 — 앞뒤 공백, 8글자까지. '만원'은 읽기 쉽게 '만 원'으로 */
export function cleanUnit(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v.trim().replace(/^만원$/, '만 원').replace(/^천원$/, '천 원').slice(0, 8);
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

/** '6/12권' */
export function countText(c: Pick<CountInfo, 'count' | 'goal' | 'unit'>): string {
  return `${fmtNum(c.count)}/${fmtNum(c.goal)}${c.unit}`;
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
 * 0 아래로는 내려가지 않는다. 바뀐 게 없으면 같은 객체.
 */
export function addCount<T extends Pick<MandaratDoc, 'themes' | 'dayLog'>>(doc: T, ti: number, ai: number, delta: number, day: string): T {
  const a = doc.themes[ti]?.actions[ai];
  if (!a || kindOf(a) !== 'count' || !Number.isFinite(delta) || delta === 0) return doc;
  const c = countInfo(a, day);
  const next = Math.min(MAX_NUM, round2(Math.max(0, c.count + delta)));
  const real = round2(next - c.count);
  if (real === 0) return doc;
  const todayAmt = round2(Math.max(0, c.today + real));
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

// ── 한 번: 마감 ───────────────────────────────────────────────────────────────
export interface DueInfo {
  date: string;
  /** 오늘부터 마감까지 남은 날(지났으면 음수) */
  days: number;
  /** 'D-3' · '오늘 마감' · '2일 지남' */
  label: string;
  over: boolean;
}

export function dueInfo(a: Action, today: Date): DueInfo | null {
  if (kindOf(a) !== 'once' || !a.due) return null;
  const days = daysBetween(ymd(today), a.due);
  return { date: a.due, days, label: days > 0 ? `D-${days}` : days === 0 ? '오늘 마감' : `${-days}일 지남`, over: days < 0 };
}

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

/** '10월 20일 (월)' — 올해가 아니면 연도도 */
export function dateText(key: string, today = new Date()): string {
  const [y, m, d] = key.split('-').map(Number);
  const dow = DOW[new Date(y, m - 1, d).getDay()];
  return `${y !== today.getFullYear() ? `${y}년 ` : ''}${m}월 ${d}일 (${dow})`;
}

/** 'YYYY-MM-DD'에 n일 더하기 */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return ymd(new Date(y, m - 1, d + n));
}

/** 마감 빠른 선택 — 이번 주 일요일 · 이번 달 말 · 3개월 뒤 · 올해 말 */
export function duePresets(today: Date): { label: string; date: string }[] {
  const y = today.getFullYear();
  const m = today.getMonth();
  const sun = ymd(weekDates(today)[6]);
  return [
    { label: '이번 주', date: sun },
    { label: '이번 달', date: ymd(new Date(y, m + 1, 0)) },
    { label: '3개월 뒤', date: ymd(new Date(y, m + 3, today.getDate())) },
    { label: '올해 안', date: `${y}-12-31` },
  ];
}

// ── 마음가짐: 한 주 점수 ──────────────────────────────────────────────────────
export const RATING_TEXT = ['', '거의 못 지켰어요', '조금 지켰어요', '반쯤 지켰어요', '잘 지켰어요', '아주 잘 지켰어요'] as const;

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
}

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
    const since = wasKind === 'habit' ? a.since : todayKey;
    if (since) out.since = since;
    else delete out.since;
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
  } else if (cfg.kind === 'once') {
    if (cfg.due && /^\d{4}-\d{2}-\d{2}$/.test(cfg.due)) out.due = cfg.due;
    else delete out.due;
  }
  return out;
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
  /** 쌓기 진행(0~100) */
  pct?: number;
  /** 마감이 지났다 */
  alert?: boolean;
}

/** 유형별 보조 정보 — 붙일 게 없으면(마감 없는 한 번) null */
export function kindLine(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, ti: number, ai: number, today: Date): KindLine | null {
  const a = doc.themes[ti]?.actions[ai];
  if (!a) return null;
  const kind = kindOf(a);
  if (kind === 'habit') {
    const n = perWeekOf(a);
    if (n > 0) {
      const w = routineWeekCount(doc, ti, ai, today);
      return { icon: 'repeat', short: `이번 주 ${w.done}/${n}`, long: `이번 주 ${w.done}/${n}회`, plan: `주 ${n}회` };
    }
    const label = `${daysLabel(habitDays(a))} 반복`;
    return { icon: 'repeat', short: daysLabel(habitDays(a)), long: label, plan: label };
  }
  if (kind === 'count') {
    const c = countInfo(a, ymd(today));
    const text = countText(c);
    return { short: text, long: c.today > 0 ? `${text} · 오늘 +${fmtNum(c.today)}` : text, plan: text, pct: c.pct };
  }
  if (kind === 'once') {
    const d = dueInfo(a, today);
    if (!d || a.done) return null;
    const label = d.days > 0 ? `마감 ${d.label}` : d.label;
    return { icon: 'calendar', short: d.label, long: label, plan: label, alert: d.over };
  }
  const r = ratingOf(a, today);
  return { short: r ? `마음가짐 ${r}점` : '마음가짐', long: r ? `마음가짐 · 이번 주 ${r}점` : '마음가짐', plan: '마음가짐' };
}
