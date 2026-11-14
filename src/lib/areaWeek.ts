// 영역 화면의 '이번 주 습관' — 이 영역의 습관 칸(블록 순서)을 이번 주 월~일 일곱 날로(build-plan §1 block.png · §3 S2).
// 날마다의 모습: 한 날 done · 누를 수 있는 날(지난날 · 오늘) open · 정해 둔 앞날 later · 정하지 않은 날 none(칸 없음).
// 세는 법은 routine(routineWeek · routineWeekCount)과 같다 — 실천 시트 · 오늘 · 칸의 '이번 주 n/m'과 같은 수.
// RN 의존 없는 순수 모듈(단위 테스트 대상: tests/a-s2.test.js).
import type { MandaratDoc } from '../types';
import { CELL_POS } from '../theme/chart';
import { kindOf, routineWeek, routineWeekCount, weekDates, ymd, type DayState } from './routine';

/** 습관 표의 칸 하나 — 체크 칸(kit CheckBox)의 모습 셋, 또는 칸 없음 */
export type WeekBox = 'done' | 'open' | 'later' | 'none';

export interface AreaWeekRow {
  /** 실천 번호 0~7 */
  ai: number;
  /** 칸의 글(다듬은 것) */
  text: string;
  /** 월~일 일곱 날의 모습 */
  days: WeekBox[];
  /** 월~일 일곱 날의 상태(routineWeek) — 화면 읽기 말(lib/marks weekDayLabel)에 */
  states: DayState[];
  /** 그 날을 눌러 기록을 남기거나 지울 수 있다(오늘 · 지난날, 습관을 정한 날 이후, 칸이 있는 날) */
  canPress: boolean[];
  /** 이번 주 한 횟수 / 정한 횟수 — 칸 아래 '이번 주 0/3'과 같은 수 */
  done: number;
  planned: number;
}

export interface AreaWeek {
  /** 이번 주 월~일 'YYYY-MM-DD' */
  dates: string[];
  /** 오늘의 자리(월 0 … 일 6) */
  todayIndex: number;
  /** 습관 칸 — 블록 안 자리 순서(CELL_POS)대로. 습관이 없으면 빈 목록 */
  rows: AreaWeekRow[];
}

/** 하루 상태(routineWeek) → 습관 표의 칸 — 한 날 done · 오늘과 놓친 날 open · 정해 둔 앞날 later · 쉬는 날 none */
export function weekBox(s: DayState): WeekBox {
  if (s === 'done') return 'done';
  if (s === 'today' || s === 'missed') return 'open';
  if (s === 'planned') return 'later';
  return 'none';
}

/** 이 영역의 습관 칸(글이 있는 것) — 블록 안 자리 순서 */
export function habitCells(doc: Pick<MandaratDoc, 'themes'>, ti: number): number[] {
  const th = doc.themes[ti];
  if (!th) return [];
  return th.actions
    .map((a, ai) => ({ a, ai }))
    .filter(({ a }) => !!a?.text.trim() && kindOf(a) === 'habit')
    .sort((x, y) => (CELL_POS[x.ai] ?? x.ai) - (CELL_POS[y.ai] ?? y.ai))
    .map(({ ai }) => ai);
}

/**
 * 영역 ti의 이번 주 습관 표 — 줄은 습관 칸(블록 순서), 칸은 월~일.
 * 누를 수 있는 날: 칸이 있고(none 아님) 오늘이나 지난날이며 습관을 정한 날(since) 이후 — 저장소의 toggleHabitOn과 같은 조건.
 */
export function areaWeek(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, ti: number, today: Date): AreaWeek {
  const week = weekDates(today);
  const dates = week.map(ymd);
  const todayKey = ymd(today);
  const todayIndex = dates.indexOf(todayKey);
  const rows = habitCells(doc, ti).map((ai): AreaWeekRow => {
    const a = doc.themes[ti].actions[ai];
    const states = routineWeek(doc, ti, ai, today);
    const days = states.map(weekBox);
    const canPress = days.map((d, i) => d !== 'none' && dates[i] <= todayKey && (!a.since || dates[i] >= a.since));
    const n = routineWeekCount(doc, ti, ai, today);
    return { ai, text: a.text.trim(), days, states, canPress, done: n.done, planned: n.planned };
  });
  return { dates, todayIndex, rows };
}

/** 표가 다시 그려야 하는지 가르는 열쇠 — 날짜 · 줄의 글 · 칸 모습 · 수가 같으면 같은 글자 */
export function areaWeekKey(w: AreaWeek): string {
  return `${w.dates[0]}|${w.todayIndex}|${w.rows.map((r) => `${r.ai}:${r.text}:${r.days.join('')}:${r.canPress.map(Number).join('')}:${r.done}/${r.planned}`).join('\n')}`;
}
