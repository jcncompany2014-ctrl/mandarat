// 한 해 돌아보기 계산 — 지금 표(또는 지난 표)의 기간 from..to를 숫자·달력·칸 활동으로 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// 지난 표는 archive.archiveAsDoc으로 문서 모양을 만들어 같은 함수에 넣는다. 화면 글은 만들지 않는다(코드와 수만).
import type { MandaratDoc, Theme } from '../types';
import { daysBetween, kindOf } from './routine';
import { addDays, cleanNum, round2 } from './kinds';
import { lastLogDay } from './history';
import { cellActivity, dayBin, longestStreak } from './review';

type DayLog = MandaratDoc['dayLog'];
type Bin = 0 | 1 | 2 | 3 | 4;

/** 한 화면에 그리는 달은 13개까지 — 기간이 더 길면 끝(to)에서 거슬러 13달 */
export const YEAR_MONTHS_MAX = 13;

function parse(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** from..to가 걸친 달 'YYYY-MM' — 오래된 달부터, 마지막 13달까지 */
export function rangeMonths(from: string, to: string): string[] {
  const out: string[] = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  const ty = Number(to.slice(0, 4));
  const tm = Number(to.slice(5, 7));
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out.slice(-YEAR_MONTHS_MAX);
}

function within<T>(rec: Record<string, T> | undefined, from: string, to: string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(rec ?? {})) if (k >= from && k <= to) out[k] = v;
  return out;
}

/**
 * 칸을 달성한 날 'YYYY-MM-DD' — 모르면 null.
 * - 한 번 · 마음가짐: 달성 기록을 남긴 마지막 날(lastLogDay)
 * - 쌓기: 날마다 더한 수(log)를 쌓아 목표에 닿은 날(기록 전에 있던 수부터 센다)
 * - 습관: 칸 달성이 하루 체크와 섞여 날짜를 알 수 없다 — null
 * 달성하지 않은 칸은 null.
 */
export function doneDay(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, ti: number, ai: number): string | null {
  const a = doc.themes[ti]?.actions[ai];
  if (!a || !a.done) return null;
  const kind = kindOf(a);
  if (kind === 'habit') return null;
  if (kind === 'once' || kind === 'mind') return lastLogDay(doc.dayLog, `${ti}-${ai}`);
  const goal = cleanNum(a.goal, 0.01) ?? 1;
  const log = Object.entries(a.log ?? {})
    .map(([day, n]) => [day, cleanNum(n) ?? 0] as const)
    .filter(([, n]) => n > 0)
    .sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
  const logged = round2(log.reduce((s, [, n]) => s + n, 0));
  let sum = round2(Math.max(0, (cleanNum(a.count) ?? 0) - logged));
  if (sum >= goal) return null; // 기록을 남기기 전부터 목표에 닿아 있었다
  for (const [day, n] of log) {
    sum = round2(sum + n);
    if (sum >= goal) return day;
  }
  return null;
}

export interface YearDigest {
  /** 기록이 있는 날 수 */
  days: number;
  /** 기록 수(날마다 키 수의 합) */
  checks: number;
  /** 가장 길게 이어 온 날 수 */
  longest: number;
  /** 달성한 칸 수(0~64) */
  achieved: number;
  /** 한 줄을 적은 날 수 */
  written: number;
  /** 이 표를 쓰는 동안 집중한 분 */
  focusMins: number;
  /** 달 'YYYY-MM' — 아래 두 배열과 같은 순서(13개까지) */
  months: string[];
  /** 달마다 기록이 있는 날 수 */
  monthDays: number[];
  /** 달마다 달성한 칸 수(달성한 날을 아는 칸만) */
  monthDone: number[];
  /** [영역 ti][칸 ai] — 기간 중 그 칸 기록이 있던 날 수 */
  cellDays: number[][];
  /** 한 주 돌아보기의 한 줄 — 주(월요일) 순서 */
  weekNotes: { week: string; note: string }[];
  /** 그날의 한 줄 — 달마다 묶어 오래된 것부터 */
  reflections: { month: string; items: { date: string; text: string }[] }[];
}

/**
 * 한 해 돌아보기 숫자 — from..to('YYYY-MM-DD')의 기록만 센다. focus: 이 표의 집중 시간(분).
 * 돌아보기 한 줄은 기간에 걸친 주(월요일이 from보다 6일까지 앞선 주)도 넣는다(지난 표에 담는 주와 같다).
 */
export function yearDigest(
  doc: Pick<MandaratDoc, 'themes' | 'dayLog' | 'dayMeta' | 'reviews'>,
  from: string,
  to: string,
  focus: number,
): YearDigest {
  const log = within(doc.dayLog, from, to);
  const months = rangeMonths(from, to);
  const monthIdx = new Map(months.map((m, i) => [m, i]));
  const monthDays = months.map(() => 0);
  const monthDone = months.map(() => 0);
  let days = 0;
  let checks = 0;
  for (const [day, list] of Object.entries(log)) {
    if (list.length === 0) continue;
    days++;
    checks += list.length;
    const i = monthIdx.get(day.slice(0, 7));
    if (i !== undefined) monthDays[i]++;
  }
  let achieved = 0;
  doc.themes.forEach((t, ti) => t.actions.forEach((a, ai) => {
    if (!a.done) return;
    achieved++;
    const d = doneDay(doc, ti, ai);
    if (!d || d < from || d > to) return;
    const i = monthIdx.get(d.slice(0, 7));
    if (i !== undefined) monthDone[i]++;
  }));
  const meta = within(doc.dayMeta, from, to);
  const byMonth = new Map<string, { date: string; text: string }[]>();
  let written = 0;
  for (const date of Object.keys(meta).sort()) {
    const text = meta[date]?.reflection?.trim();
    if (!text) continue;
    written++;
    const m = date.slice(0, 7);
    const list = byMonth.get(m) ?? [];
    list.push({ date, text });
    byMonth.set(m, list);
  }
  const reviews = within(doc.reviews, addDays(from, -6), to);
  const weekNotes = Object.keys(reviews)
    .sort()
    .flatMap((week) => {
      const note = reviews[week]?.note?.trim();
      return note ? [{ week, note }] : [];
    });
  return {
    days,
    checks,
    longest: longestStreak(log),
    achieved,
    written,
    focusMins: Math.max(0, Math.round(focus)),
    months,
    monthDays,
    monthDone,
    cellDays: cellActivity({ dayLog: log }, parse(to), daysBetween(from, to) + 1),
    weekNotes,
    reflections: [...byMonth.keys()].sort().map((month) => ({ month, items: byMonth.get(month) ?? [] })),
  };
}

export interface YearCalendarRow {
  /** 'YYYY-MM' */
  month: string;
  /** 1일~31일의 진하기(dayBin) — 그달에 없는 날은 null, 기간 밖의 날은 0 */
  cells: (Bin | null)[];
}

/** 한 해 달력 — 달마다 한 줄(13줄까지) × 31칸. 진하기는 그날 기록 수의 dayBin */
export function yearCalendar(dayLog: DayLog, from: string, to: string): YearCalendarRow[] {
  return rangeMonths(from, to).map((month) => {
    const y = Number(month.slice(0, 4));
    const m = Number(month.slice(5, 7));
    const last = new Date(y, m, 0).getDate();
    const cells: (Bin | null)[] = [];
    for (let d = 1; d <= 31; d++) {
      if (d > last) {
        cells.push(null);
        continue;
      }
      const key = `${month}-${String(d).padStart(2, '0')}`;
      cells.push(key < from || key > to ? 0 : dayBin(dayLog[key]?.length ?? 0));
    }
    return { month, cells };
  });
}

export interface FillFrame {
  /** 이 장면의 마지막 날 'YYYY-MM-DD' */
  end: string;
  themes: Theme[];
}

/**
 * 표가 채워져 간 모습 — 기간을 n(기본 4, 분기)토막으로 나눠 토막 끝마다의 8×8.
 * 달성한 날을 아는 칸(한 번 · 마음가짐 · 쌓기)은 그날부터 달성으로, 날짜를 모르는 칸(습관 · 기록 없는 달성)은 마지막 장면에서만.
 * 쌓기의 수는 그날까지 더한 만큼으로 줄여 보인다.
 */
export function fillFrames(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, from: string, to: string, n = 4): FillFrame[] {
  const parts = Math.max(1, Math.floor(n));
  const span = Math.max(0, daysBetween(from, to));
  const dated = doc.themes.map((t, ti) => t.actions.map((_, ai) => doneDay(doc, ti, ai)));
  const out: FillFrame[] = [];
  for (let k = 0; k < parts; k++) {
    const isLast = k === parts - 1;
    const end = isLast ? to : addDays(from, Math.round((span * (k + 1)) / parts));
    const themes = doc.themes.map((t, ti) => ({
      ...t,
      actions: t.actions.map((a, ai) => {
        if (!a.done) return a;
        const d = dated[ti][ai];
        const done = d ? d <= end : isLast;
        const sliced = kindOf(a) === 'count' && a.log && !isLast ? countUntil(a, end) : a;
        return done === a.done && sliced === a ? a : { ...sliced, done };
      }),
    }));
    out.push({ end, themes });
  }
  return out;
}

/** 쌓기의 수를 end까지 더한 만큼으로 — 기록 전부터 있던 수는 그대로 */
function countUntil(a: Theme['actions'][number], end: string): Theme['actions'][number] {
  const entries = Object.entries(a.log ?? {});
  const total = round2(entries.reduce((s, [, n]) => s + (cleanNum(n) ?? 0), 0));
  const later = round2(entries.reduce((s, [day, n]) => (day > end ? s + (cleanNum(n) ?? 0) : s), 0));
  if (later === 0) return a;
  const base = Math.max(0, (cleanNum(a.count) ?? 0) - total);
  return { ...a, count: round2(base + total - later) };
}
