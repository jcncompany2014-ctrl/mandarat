// 주간 돌아보기 · 기록 요약 · 달력형 히트맵 계산 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// "이번 주"는 앱 전체에서 월~일 기준으로 통일한다(홈 주간 띠와 같은 숫자).
// 날마다 횟수는 dayLog의 그날 키 개수다 — 칸 기록·직접 추가한 할 일·칸에서 떼어 둔 지난 기록이 모두 들어간다.
import type { MandaratDoc } from '../types';
import { daysBetween, habitDays, kindOf, perWeekOf, scheduleAt, weekDates, weekDone, weekTarget, ymd } from './routine';
import { addDays, cleanNum, countInfo, countWeekAdded, ratingOf, round2 } from './kinds';
import { josa } from './text';

/** 기록이 있는 가장 이른 날 — 그 전 날은 히트맵에 그리지 않는다(쓰기 전의 빈 주를 '놓친 주'로 보이지 않게) */
export { firstLogDay } from './history';

type DayLog = MandaratDoc['dayLog'];

/** 칸 자리 키 "ti-ai" (직접 추가한 할 일·떼어 둔 기록은 칸 활동에 넣지 않는다) */
const CELL_KEY_RE = /^([0-7])-([0-7])$/;

export interface WeekDay {
  date: string;
  /** 0=일 … 6=토 */
  dow: number;
  count: number;
  /** 아직 진행 중인 오늘 — 닫힌 주(closed)에는 어느 날도 오늘이 아니다 */
  isToday: boolean;
  /** 아직 오지 않은 날 */
  future: boolean;
}

export interface WeekReview {
  /** 이번 주 월~일 */
  days: WeekDay[];
  /** 이번 주(오늘까지) 실천 합계 */
  total: number;
  /** 지난주 같은 기간(월~오늘과 같은 요일) 합계 — 공정한 비교용 */
  prev: number;
  /** 영역별 이번 주 실천 수 [0~7] — 직접 추가한 할 일·떼어 둔 기록 포함 */
  areaCounts: number[];
  /** 돌아보는 기간에 정해 둔 습관 수(요일·주 N회 모두) */
  habitCount: number;
  /**
   * 지금까지 했어야 할 습관 횟수.
   * - 요일 습관: 지난 예정일 + 오늘(했을 때만)
   * - 주 N회: min(N, max(한 횟수, ⌈N × 지난 날 / 그 주에 쓸 수 있는 날⌉)) — 지난 날은 습관을 정한 날부터, 오늘은 했을 때만 센다
   * 월요일 아침엔 0이라 '0/14'처럼 밀린 것처럼 보이지 않는다.
   */
  routineDue: number;
  /** 이번 주 해낸 습관 횟수 — 요일 습관은 예정일에 한 날, 주 N회는 N까지(모든 습관) */
  routineDone: number;
  /** 이번 주 전체 계획(일요일까지) — 요일 습관의 예정일 + 주 N회의 N */
  routinePlannedWeek: number;
  /** 이번 주 아직 할 수 있는 습관 횟수 — 지나간 날은 빼고 남은 날(오늘 포함) 안에서만 */
  routineRemaining: number;
  /** 요일 습관만: 예정일 중 지금까지 셀 날(오늘은 했을 때만) — 이전 화면 호환 */
  routinePlanned: number;
  /** 주 N회 습관만: 채운 횟수(습관마다 N까지만) / 정한 횟수의 합 */
  weeklyDone: number;
  weeklyTarget: number;
  /** 이번 주 쌓기: 더한 수(많이 쌓은 순) */
  added: { ti: number; ai: number; amount: number; unit: string }[];
  /** 이번 주 마음가짐: 점수를 매긴 수 · 점수 합 · 마음가짐 칸 수 */
  mindRated: number;
  mindSum: number;
  mindTotal: number;
  /** 가장 많이 실천한 날(같으면 더 최근 날) */
  bestDay: { dow: number; count: number } | null;
  /** 가장 많이 실천한 영역 */
  topArea: { ti: number; count: number } | null;
}

const count = (dayLog: DayLog, k: string) => (dayLog[k] ?? []).length;

/**
 * 한 주 돌아보기 — end가 속한 주(월~일)를 end까지 센다.
 * opts.closed: 지난 주를 닫으며 볼 때(end = 그 주 일요일). 어느 날도 '진행 중인 오늘'로 보지 않아서
 * 일요일에 못 한 습관도 놓친 것으로 센다(열린 주의 오늘은 했을 때만 센다).
 */
export function weekReview(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, end: Date, opts: { closed?: boolean } = {}): WeekReview {
  const closed = opts.closed === true;
  const tk = ymd(end);
  const dates = weekDates(end);
  const days: WeekDay[] = dates.map((d) => {
    const k = ymd(d);
    const future = k > tk;
    return { date: k, dow: d.getDay(), count: future ? 0 : count(doc.dayLog, k), isToday: !closed && k === tk, future };
  });
  const span = days.filter((d) => !d.future);
  const total = span.reduce((s, d) => s + d.count, 0);
  const prev = dates
    .filter((d) => ymd(d) <= tk)
    .reduce((s, d) => s + count(doc.dayLog, ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7))), 0);

  let habitCount = 0;
  let routineDue = 0;
  let routineDone = 0;
  let routinePlannedWeek = 0;
  let routineRemaining = 0;
  let routinePlanned = 0;
  let weeklyDone = 0;
  let weeklyTarget = 0;
  let mindRated = 0;
  let mindSum = 0;
  let mindTotal = 0;
  const added: WeekReview['added'] = [];
  doc.themes.forEach((t, ti) => t.actions.forEach((a, ai) => {
    if (!a.text.trim()) return;
    const key = `${ti}-${ai}`;
    const kind = kindOf(a);
    if (kind === 'count') {
      const amount = countWeekAdded(a, end);
      if (amount > 0) added.push({ ti, ai, amount, unit: countInfo(a).unit });
      return;
    }
    if (kind === 'mind') {
      mindTotal++;
      const r = ratingOf(a, end);
      if (r > 0) { mindRated++; mindSum += r; }
      return;
    }
    if (kind !== 'habit') return;
    if (a.since && a.since > tk) return; // 돌아보는 기간이 끝난 뒤에 정한 습관
    habitCount++;
    const on = (k: string) => (doc.dayLog[k] ?? []).includes(key);
    const inUse = (d: WeekDay) => !a.since || d.date >= a.since; // 반복을 정하기 전 날은 제외

    // 일정을 고쳤다면 그 주에 쓰던 일정으로 — 주 N회는 끝날(end)의 일정, 요일은 날마다 그날의 일정
    if (perWeekOf(scheduleAt(a, tk)) > 0) {
      const n = weekTarget(a, end);
      const did = weekDone(doc.dayLog, key, end, a.since);
      const capped = Math.min(n, did);
      let usable = 0; // 그 주에 이 습관을 할 수 있었던 날
      let elapsed = 0; // 지난 날(오늘은 했을 때만)
      let open = 0; // 아직 할 수 있는 날(오늘 포함)
      for (const d of days) {
        if (!inUse(d)) continue;
        usable++;
        if (d.future) open++;
        else if (d.isToday && !on(d.date)) open++;
        else elapsed++;
      }
      const pace = Math.ceil((n * elapsed) / Math.max(1, usable) - 1e-9);
      routineDue += Math.min(n, Math.max(capped, pace));
      routineDone += capped;
      routinePlannedWeek += n;
      routineRemaining += Math.min(Math.max(0, n - did), open);
      weeklyTarget += n;
      weeklyDone += capped;
      return;
    }

    for (const d of days) {
      if (!habitDays(scheduleAt(a, d.date)).includes(d.dow) || !inUse(d)) continue;
      routinePlannedWeek++;
      if (d.future) { routineRemaining++; continue; }
      const done = on(d.date);
      if (d.isToday && !done) { routineRemaining++; continue; } // 오늘은 아직 진행 중
      routineDue++;
      routinePlanned++;
      if (done) routineDone++;
    }
  }));
  added.sort((x, y) => y.amount - x.amount);

  const best = bestDay(span);

  const areaCounts = new Array<number>(8).fill(0);
  for (const d of span) {
    for (const k of doc.dayLog[d.date] ?? []) {
      const ti = Number(k.split('-')[0]);
      if (Number.isInteger(ti) && ti >= 0 && ti < 8) areaCounts[ti]++;
    }
  }
  let topArea: WeekReview['topArea'] = null;
  areaCounts.forEach((c, ti) => { if (c > (topArea?.count ?? 0)) topArea = { ti, count: c }; });

  return {
    days, total, prev, areaCounts,
    habitCount, routineDue, routineDone, routinePlannedWeek, routineRemaining, routinePlanned,
    weeklyDone, weeklyTarget, added, mindRated, mindSum, mindTotal,
    bestDay: best ? { dow: best.dow, count: best.count } : null,
    topArea,
  };
}

/** 가장 많이 한 날 — 횟수가 같으면 더 최근 날. 기록이 하나도 없으면 null. 받은 칸을 그대로 돌려준다 */
export function bestDay<T extends { date: string; count: number }>(cells: readonly T[]): T | null {
  let best: T | null = null;
  for (const c of cells) {
    if (!(c.count > 0)) continue;
    if (!best || c.count > best.count || (c.count === best.count && c.date > best.date)) best = c;
  }
  return best;
}

// ── 진하기 · 칸 활동 · 기록 ────────────────────────────────────────────────────

/**
 * 하루 실천 수 → 진하기 0~4. 절대 구간(0 · 1 · 2 · 3~4 · 5+)이라 사람마다, 주마다 기준이 흔들리지 않는다
 * (가장 많이 한 날에 맞춰 늘이면 하루 1번만 한 주도 진하게 보인다).
 */
export function dayBin(n: number): 0 | 1 | 2 | 3 | 4 {
  if (!(n >= 1)) return 0;
  if (n < 2) return 1;
  if (n < 3) return 2;
  if (n < 5) return 3;
  return 4;
}

/** 범례 — 진하기 1~4의 이름(적게/많이 대신 실제 횟수) */
export const DAY_BIN_LABELS = ['1', '2', '3', '5+'] as const;

/**
 * 칸마다 최근 days일(오늘 포함) 중 기록이 있던 날 수 — [영역 ti][칸 ai] 8×8.
 * 지금 그 칸에 있는 실천의 기록("ti-ai")만 센다 — 칸을 비우며 떼어 둔 지난 기록과 직접 추가한 할 일은 빠진다.
 */
export function cellActivity(doc: Pick<MandaratDoc, 'dayLog'>, today: Date, days = 28): number[][] {
  const out = Array.from({ length: 8 }, () => new Array<number>(8).fill(0));
  const tk = ymd(today);
  const from = addDays(tk, -(Math.max(1, Math.floor(days)) - 1));
  for (const [day, list] of Object.entries(doc.dayLog)) {
    if (day < from || day > tk) continue;
    for (const k of new Set(list)) {
      const m = CELL_KEY_RE.exec(k);
      if (m) out[Number(m[1])][Number(m[2])]++;
    }
  }
  return out;
}

/** 전체 기록에서 가장 길게 이어진 날 수 — 하나라도 기록이 있는 날을 한 날로 본다 */
export function longestStreak(dayLog: DayLog): number {
  const days = Object.keys(dayLog).filter((k) => (dayLog[k] ?? []).length > 0).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of days) {
    run = prev !== null && daysBetween(prev, k) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = k;
  }
  return best;
}

/**
 * 이번 달(1일~오늘) 달성한 칸 수.
 * - 한 번 · 마음가짐: 이번 달에 달성으로 기록됐고 지금도 달성인 칸
 * - 쌓기: 이번 달에 더한 수로 목표 선을 넘은 칸(지금도 목표 이상이고 달성인 것)
 * - 습관: 칸 달성이 하루 체크와 섞여 날짜를 알 수 없어 세지 않는다
 */
export function doneThisMonth(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, today: Date): number {
  const tk = ymd(today);
  const from = `${tk.slice(0, 8)}01`;
  const logged = new Set<string>();
  for (const [day, list] of Object.entries(doc.dayLog)) {
    if (day < from || day > tk) continue;
    for (const k of list) logged.add(k);
  }
  let n = 0;
  doc.themes.forEach((t, ti) => t.actions.forEach((a, ai) => {
    if (!a.text.trim() || !a.done) return;
    const kind = kindOf(a);
    if (kind === 'once' || kind === 'mind') {
      if (logged.has(`${ti}-${ai}`)) n++;
      return;
    }
    if (kind !== 'count') return;
    const c = countInfo(a);
    if (!c.reached) return;
    const month = round2(Object.entries(a.log ?? {}).reduce((s, [k, v]) => (k >= from && k <= tk ? s + (cleanNum(v) ?? 0) : s), 0));
    if (month > 0 && round2(c.count - month) < c.goal) n++;
  }));
  return n;
}

// ── 한 줄 ─────────────────────────────────────────────────────────────────────

/** 문장에 넣는 영역 이름의 최대 글자 수(말줄임 포함) — 한 줄 문장이 40자를 넘지 않게 */
const NAME_MAX = 10;

/** 영역 이름 + 조사. 긴 이름은 줄이되 조사는 원래 이름의 끝소리로 고른다 */
function areaWith(doc: Pick<MandaratDoc, 'themes'>, ti: number, pair: '은/는'): string {
  const full = doc.themes[ti]?.title.trim() || `영역 ${ti + 1}`;
  const chars = Array.from(full);
  const particle = josa(full, pair).slice(full.length);
  // 자른 끝이 띄어쓰기면 지운다 — '건강하고 활기찬 …는'이 아니라 '건강하고 활기찬…는'
  return (chars.length > NAME_MAX ? `${chars.slice(0, NAME_MAX - 1).join('').trimEnd()}…` : full) + particle;
}

/**
 * 이번 주를 한 문장으로 — 있었던 일만 적는다(칭찬·훈계 없이). 40자 이내.
 * - 기록 없음 → '' (화면이 상태 문장을 대신 보여 준다)
 * - 여덟 영역 모두 한 번 이상 → '여덟 영역을 모두 한 번 이상 챙겼어요'
 * - 그 밖 → '건강은 9번 챙겼고, 관계는 아직이에요'. '아직'인 영역은 실천을 적어 둔 영역 중에서만 고른다
 *   (비어 있는 영역을 탓하지 않는다). 그런 영역이 없으면 '건강은 9번 챙겼어요'.
 */
export function weekSentence(review: Pick<WeekReview, 'total' | 'areaCounts'>, doc: Pick<MandaratDoc, 'themes'>): string {
  const counts = review.areaCounts;
  if (!(review.total > 0) || !counts.some((c) => c > 0)) return '';
  if (counts.length >= 8 && counts.every((c) => c >= 1)) return '여덟 영역을 모두 한 번 이상 챙겼어요';
  let top = 0;
  counts.forEach((c, ti) => { if (c > counts[top]) top = ti; });
  const low = counts.findIndex((c, ti) => c === 0 && !!doc.themes[ti]?.actions.some((a) => a.text.trim() !== ''));
  const head = `${areaWith(doc, top, '은/는')} ${counts[top]}번 챙겼`;
  return low >= 0 ? `${head}고, ${areaWith(doc, low, '은/는')} 아직이에요` : `${head}어요`;
}

/**
 * 달력형 히트맵용 날짜 — 열 = 주(월~일), 마지막 열이 이번 주.
 * 행이 항상 같은 요일이라 왼쪽 월·수·금 라벨이 어긋나지 않는다.
 */
export function calendarWeeks(today: Date, weeks: number): { date: string; future: boolean }[][] {
  const tk = ymd(today);
  const mon = weekDates(today)[0];
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const k = ymd(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - (weeks - 1 - w) * 7 + d));
      return { date: k, future: k > tk };
    }),
  );
}
