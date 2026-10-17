// 어느 하루의 '오늘' 목록을 미리 센다(순수) — 알림(V1-A)과 위젯 타임라인(V1-C)이 앞으로 며칠을 내다볼 때 쓴다.
// 그날로 하루 정리(rolloverToday)를 한 뒤 목록을 센다. 기억해 두지 않는 computeTodayItems를 써서
// 앞날을 세어도 화면이 쓰는 todayItems의 기억(같은 배열)은 그대로 남는다.
import type { MandaratDoc, TodayExtra } from '../types';
import { computeTodayItems, rolloverToday, ymd, type TodayItem } from './routine';

export interface DayProjection {
  /** 그날 'YYYY-MM-DD' */
  key: string;
  /** 그날 '오늘' 목록의 실천(todayItems와 같은 순서) */
  items: TodayItem[];
  /** 그날 남아 있는 직접 추가한 할 일 */
  extras: TodayExtra[];
  /** 그날 한 것(실천 + 직접 추가한 할 일) */
  done: number;
  /** 그날 할 것 전체 */
  total: number;
}

type ProjectDoc = Pick<MandaratDoc, 'themes' | 'dayLog' | 'todayKeys' | 'todayExtra' | 'todayDate'>;

/** date 하루의 목록 — 오늘이면 지금 목록과 같고, 앞날이면 그날 아침 하루 정리를 마친 모습 */
export function projectDay(doc: ProjectDoc, date: Date): DayProjection {
  const key = ymd(date);
  const day = rolloverToday(doc, key);
  const items = computeTodayItems(day, date);
  const extras = day.todayExtra;
  const done = items.filter((i) => i.done).length + extras.filter((x) => x.done).length;
  return { key, items, extras, done, total: items.length + extras.length };
}
