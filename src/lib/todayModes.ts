// 오늘 화면 보기(연속 기록 · 보드 · 이번 주 마음가짐)의 순수 계산과 글 — React·RN 의존 없음(단위 테스트 대상).
import type { MandaratDoc } from '../types';
import { autoToday, doneToday, habitStreak, kindOf, weekKey, ymd, type HabitStreak, type TodayItem } from './routine';
import { addDays, ratingOf } from './kinds';
import { ritualTarget } from './ritual';

type Doc = Pick<MandaratDoc, 'themes' | 'dayLog'>;

/** 연속 기록 보기의 한 줄 — 글이 있는 습관 칸 하나 */
export interface StreakRow {
  /** 체크(useTodayCheck.toggle)에 그대로 넘기는 오늘 줄 */
  item: TodayItem;
  text: string;
  streak: HabitStreak;
}

/**
 * 연속 기록 보기의 줄 — 글이 있는 습관 칸만, 오늘 할 날인 것 먼저(그 안에서는 만다라트 순서).
 * 오늘 할 날이 아닌 습관도 체크할 수 있다(쉬는 날에 한 것은 기록으로 남지만 연속 기록에는 더하지 않는다).
 */
export function streakRows(doc: Doc, now: Date): StreakRow[] {
  const tk = ymd(now);
  const rows: (StreakRow & { order: number })[] = [];
  doc.themes.forEach((t, ti) => t.actions.forEach((a, ai) => {
    if (!a.text.trim() || kindOf(a) !== 'habit') return;
    const key = `${ti}-${ai}`;
    const scheduled = autoToday(doc, ti, ai, now);
    rows.push({
      item: { ti, ai, key, kind: 'habit', routine: true, scheduled, done: doneToday(doc, a, key, tk) },
      text: a.text,
      streak: habitStreak(doc, ti, ai, now),
      order: ti * 8 + ai,
    });
  }));
  return rows
    .sort((x, y) => Number(y.item.scheduled) - Number(x.item.scheduled) || x.order - y.order)
    .map(({ order: _order, ...r }) => r);
}

/** 단위가 붙은 기록 — 요일 습관은 '일', 주 N회는 '주' */
export function runText(n: number, unit: HabitStreak['unit']): string {
  return `${n}${unit === 'week' ? '주' : '일'}`;
}

/** 줄 오른쪽 기록 — 이어 가는 기록이 없으면 '—'(화면 읽기 '아직 없음') */
export function streakCell(s: HabitStreak): { text: string; a11y: string } {
  if (s.cur <= 0) return { text: '—', a11y: '연속 기록 아직 없음' };
  return { text: runText(s.cur, s.unit), a11y: `연속 ${runText(s.cur, s.unit)}` };
}

/** 주 N회 기록 한 주를 날로 견줄 때 — 이어 온 길이를 비교하는 데만 쓴다 */
const WEEK_DAYS = 7;
const span = (s: HabitStreak, n: number) => n * (s.unit === 'week' ? WEEK_DAYS : 1);

export interface StreakSummary {
  /** 지금 가장 길게 이어 가는 습관 — 없으면 null */
  lead: { text: string; cur: number; unit: HabitStreak['unit']; best: number } | null;
}

/**
 * 맨 위 큰 숫자 — 지금 이어 가는 기록 중 가장 긴 것(주 N회는 한 주를 7일로 견준다. 같으면 앞 줄).
 * 최고 기록은 그 습관의 것(단위가 같아야 한 줄로 읽힌다).
 */
export function streakSummary(rows: readonly StreakRow[]): StreakSummary {
  let lead: StreakRow | null = null;
  for (const r of rows) {
    if (r.streak.cur <= 0) continue;
    if (!lead || span(r.streak, r.streak.cur) > span(lead.streak, lead.streak.cur)) lead = r;
  }
  if (!lead) return { lead: null };
  return { lead: { text: lead.text, cur: lead.streak.cur, unit: lead.streak.unit, best: lead.streak.best } };
}

/** 큰 숫자 묶음의 화면 읽기 한 마디 — 보이는 머리 글('지금 연속')과 같은 말로 시작한다 */
export function streakSummaryLabel(s: StreakSummary): string {
  if (!s.lead) return '아직 이어 가는 기록이 없어요. 오늘 하나 하면 시작돼요';
  const { text, cur, unit, best } = s.lead;
  return `지금 연속 ${runText(cur, unit)}, ${text}. 최고 ${runText(best, unit)}`;
}

/** 보드 칸 머리 — '진행 중 2개' */
export function columnHead(label: string, count: number): string {
  return `${label} ${count}개`;
}

/** 이번 주 마음가짐 머리 오른쪽 — '4개 중 1개 매겼어요' */
export function mindProgress(total: number, rated: number): string {
  return `${total}개 중 ${rated}개 매겼어요`;
}

/**
 * '지난주 점수 매기기 ›'를 걸 주(월요일 키) — 없으면 null.
 * 월·화요일에, 지난주 점수를 매기지 않은 마음가짐 칸이 있고, 지난주 돌아보기를 권할 때(ritualTarget)만.
 */
export function lastWeekRatingTarget(doc: Pick<MandaratDoc, 'themes' | 'dayLog' | 'reviews'>, now: Date): string | null {
  const dow = now.getDay();
  if (dow !== 1 && dow !== 2) return null;
  const target = ritualTarget(doc, now);
  const lastWeek = addDays(weekKey(now), -7);
  if (!target || target !== lastWeek) return null;
  const [y, m, d] = lastWeek.split('-').map(Number);
  const inLastWeek = new Date(y, m - 1, d + 3);
  const unrated = doc.themes.some((t) => t.actions.some((a) => (
    a.text.trim() !== '' && kindOf(a) === 'mind' && ratingOf(a, inLastWeek) === 0
  )));
  return unrated ? target : null;
}
