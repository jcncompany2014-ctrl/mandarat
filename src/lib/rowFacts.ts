// 오늘 줄 하나에 붙는 계산(유형 한 줄 · 이번 주 7칸 · 이번 주 횟수)을 문서 한 판마다 한 번만 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// TodayRow처럼 줄마다 다시 그려지는 곳이 체크 한 번에 모든 줄의 kindLine·routineWeek를 다시 세지 않게 쓴다.
// themes · dayLog · 날짜가 그대로면 같은(얼린) 객체를 돌려준다 — 고쳐 쓰지 않는다.
import type { MandaratDoc } from '../types';
import { kindLine, type KindLine } from './kinds';
import { kindOf, perWeekOf, routineWeek, routineWeekCount, scheduleAt, ymd, type DayState } from './routine';

export interface RowFacts {
  /** 유형 한 줄 — 붙일 게 없으면 null */
  line: KindLine | null;
  /** 습관의 이번 주 월~일 7칸 — 습관이 아니면 null */
  week: readonly DayState[] | null;
  /** 주 N회 습관의 이번 주 한 번 / 목표 — 그 밖은 null */
  weekCount: { done: number; planned: number } | null;
}

type RowDoc = Pick<MandaratDoc, 'themes' | 'dayLog'>;

interface Memo {
  dayLog: MandaratDoc['dayLog'];
  tk: string;
  rows: Map<string, RowFacts>;
}
const memo = new WeakMap<MandaratDoc['themes'], Memo>();

/** 줄 하나의 계산 — 같은 문서·같은 날이면 다시 세지 않는다 */
export function rowFacts(doc: RowDoc, ti: number, ai: number, now: Date): RowFacts {
  const tk = ymd(now);
  let m = memo.get(doc.themes);
  if (!m || m.dayLog !== doc.dayLog || m.tk !== tk) {
    m = { dayLog: doc.dayLog, tk, rows: new Map() };
    memo.set(doc.themes, m);
  }
  const key = `${ti}-${ai}`;
  const hit = m.rows.get(key);
  if (hit) return hit;
  const a = doc.themes[ti]?.actions[ai];
  const habit = !!a && kindOf(a) === 'habit';
  const facts: RowFacts = Object.freeze({
    line: kindLine(doc, ti, ai, now),
    week: habit ? Object.freeze(routineWeek(doc, ti, ai, now)) : null,
    weekCount: habit && a && perWeekOf(scheduleAt(a, tk)) > 0 ? routineWeekCount(doc, ti, ai, now) : null,
  });
  m.rows.set(key, facts);
  return facts;
}
