// 한 주 돌아보기 — 언제 권할지, 지난 돌아보기에서 고른 이번 주 중점 (React·RN 의존 없는 순수 모듈 — 단위 테스트 대상).
//
// - 일요일 저녁(18시부터)에는 이번 주를, 월·화요일에는 지난주를 돌아보자고 권한다.
//   그 주를 이미 돌아봤거나, 적힌 실천이 없거나, 그 주가 끝난 뒤에야 쓰기 시작했다면 권하지 않는다.
// - 주 W를 닫으며 고른 중점 칸은 그다음 주(W+1)에 '중점'으로 보인다.
// - 주는 늘 그 주 월요일 'YYYY-MM-DD'로 부른다(마음가짐 점수의 키와 같다).
import type { MandaratDoc } from '../types';
import { weekKey } from './routine';
import { addDays } from './kinds';

/** 일요일 이 시각부터 이번 주 돌아보기를 권한다 */
export const RITUAL_HOUR = 18;

/** 돌아본 주(월요일 키)의 일요일 — 그 주의 요약·점수를 낼 때 기준이 되는 날 */
export function sundayOf(week: string): Date {
  const [y, m, d] = week.split('-').map(Number);
  return new Date(y, m - 1, d + 6);
}

/**
 * 이 문서로 처음 무언가를 한 날 — 실천 기록, 습관을 정한 날, 쌓기를 더한 날, 마음가짐 점수를 매긴 주 중 가장 이른 것.
 * 아무것도 없으면 null.
 */
function firstActivity(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>): string | null {
  const days = Object.entries(doc.dayLog).filter(([, list]) => list.length > 0).map(([day]) => day);
  for (const t of doc.themes) {
    for (const a of t.actions) {
      if (a.since) days.push(a.since);
      days.push(...Object.keys(a.log ?? {}), ...Object.keys(a.ratings ?? {}));
    }
  }
  return days.length > 0 ? days.reduce((x, y) => (y < x ? y : x)) : null;
}

/**
 * 지금 돌아볼 주(월요일 키) — 없으면 null.
 * 일요일 18시부터는 이번 주, 월·화요일에는 지난주. 다른 날은 null.
 */
export function ritualTarget(doc: Pick<MandaratDoc, 'themes' | 'dayLog' | 'reviews'>, now: Date): string | null {
  const dow = now.getDay();
  const thisWeek = weekKey(now);
  const week = dow === 0 && now.getHours() >= RITUAL_HOUR
    ? thisWeek
    : dow === 1 || dow === 2
      ? addDays(thisWeek, -7)
      : null;
  if (!week || doc.reviews?.[week]) return null;
  if (!doc.themes.some((t) => t.actions.some((a) => a.text.trim() !== ''))) return null;
  // 그 주가 끝난 뒤에 시작한 사용자에게 써 보지도 않은 주를 돌아보자고 하지 않는다
  const first = firstActivity(doc);
  if (first === null || first > addDays(week, 6)) return null;
  return week;
}

/**
 * 이번 주 중점 칸 "ti-ai" — 지난주를 닫으며 고른 칸 중 아직 글이 있고 달성하지 않은 것(고른 순서대로).
 */
export function weekPriority(doc: Pick<MandaratDoc, 'themes' | 'reviews'>, now: Date): string[] {
  const picks = doc.reviews?.[addDays(weekKey(now), -7)]?.next ?? [];
  return picks.filter((k) => {
    const [ti, ai] = k.split('-').map(Number);
    const a = doc.themes[ti]?.actions[ai];
    return !!a && a.text.trim() !== '' && !a.done;
  });
}

/** 돌아본 주들(월요일 키) — 최근 주 먼저 */
export function reviewWeeks(doc: Pick<MandaratDoc, 'reviews'>): string[] {
  return Object.keys(doc.reviews ?? {}).sort().reverse();
}
