// 주간 돌아보기 + 달력형 히트맵 날짜 계산 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// "이번 주"는 앱 전체에서 월~일 기준으로 통일한다(홈 주간 띠와 같은 숫자).
import type { MandaratDoc } from '../types';
import { normalizeDays, weekDates, ymd } from './routine';

export interface WeekDay {
  date: string;
  /** 0=일 … 6=토 */
  dow: number;
  count: number;
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
  /** 이번 주 루틴: 예정된 날 중 해낸 횟수 / 예정 횟수(오늘은 해냈을 때만 셈) */
  routineDone: number;
  routinePlanned: number;
  /** 가장 많이 실천한 날 */
  bestDay: { dow: number; count: number } | null;
  /** 가장 많이 실천한 영역 */
  topArea: { ti: number; count: number } | null;
}

const count = (dayLog: MandaratDoc['dayLog'], k: string) => (dayLog[k] ?? []).length;

export function weekReview(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, today: Date): WeekReview {
  const tk = ymd(today);
  const dates = weekDates(today);
  const days: WeekDay[] = dates.map((d) => {
    const k = ymd(d);
    const future = k > tk;
    return { date: k, dow: d.getDay(), count: future ? 0 : count(doc.dayLog, k), isToday: k === tk, future };
  });
  const span = days.filter((d) => !d.future);
  const total = span.reduce((s, d) => s + d.count, 0);
  const prev = dates
    .filter((d) => ymd(d) <= tk)
    .reduce((s, d) => s + count(doc.dayLog, ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7))), 0);

  let routineDone = 0;
  let routinePlanned = 0;
  doc.themes.forEach((t, ti) => t.actions.forEach((a, ai) => {
    const ds = normalizeDays(a.days);
    if (ds.length === 0 || !a.text.trim()) return;
    const key = `${ti}-${ai}`;
    for (const d of span) {
      if (!ds.includes(d.dow) || (a.since && d.date < a.since)) continue; // 반복을 정하기 전 날은 제외
      const done = (doc.dayLog[d.date] ?? []).includes(key);
      if (d.isToday && !done) continue; // 오늘은 아직 진행 중
      routinePlanned++;
      if (done) routineDone++;
    }
  }));

  let bestDay: WeekReview['bestDay'] = null;
  for (const d of span) if (d.count > (bestDay?.count ?? 0)) bestDay = { dow: d.dow, count: d.count };

  const perArea = new Array<number>(8).fill(0);
  for (const d of span) {
    for (const k of doc.dayLog[d.date] ?? []) {
      const ti = Number(k.split('-')[0]);
      if (Number.isInteger(ti) && ti >= 0 && ti < 8) perArea[ti]++;
    }
  }
  let topArea: WeekReview['topArea'] = null;
  perArea.forEach((c, ti) => { if (c > (topArea?.count ?? 0)) topArea = { ti, count: c }; });

  return { days, total, prev, routineDone, routinePlanned, bestDay, topArea };
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
