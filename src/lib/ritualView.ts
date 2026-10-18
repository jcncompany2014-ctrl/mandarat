// 한 주 돌아보기 화면에 쓰는 글·목록 (React·RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// 무엇을 권할지(ritualTarget)·이번 주 중점(weekPriority)은 ritual.ts가, 여기서는 세 쪽에 놓을 것만 고른다.
import type { MandaratDoc } from '../types';
import type { WeekReview } from './review';
import { kindOf } from './routine';
import { addDays } from './kinds';
import { msg, type Lang } from '../i18n';

/** 다음 주 중점으로 고를 수 있는 칸 수 */
export const MAX_PICKS = 3;
/** 한 줄 메모 길이 */
export const NOTE_MAX = 80;

export type RitualPage = 'week' | 'mind' | 'next';

/** 지난주와 견준 한 줄 — 4번 더 / 같아요 / 2번 적어요 */
export function deltaLine(total: number, prev: number, l?: Lang): string {
  const t = msg(l).ritual;
  const d = total - prev;
  if (d > 0) return t.deltaMore({ n: d });
  if (d < 0) return t.deltaLess({ n: -d });
  return t.deltaSame;
}

/** 쌓은 것 — 많이 쌓은 두 가지 '+2권 · +50만 원', 없으면 '—' */
export function addedLine(added: WeekReview['added'], l?: Lang): string {
  if (added.length === 0) return '—';
  const t = msg(l).ritual;
  return added.slice(0, 2).map((x) => t.addedValue({ n: x.amount, unit: x.unit })).join(t.addedSep);
}

/** addedLine을 소리로 — '2권 더함, 50만 원 더함' ('+2권 · +50만 원'의 기호를 읽지 않게), 없으면 '' */
export function addedSpeech(added: WeekReview['added'], l?: Lang): string {
  const t = msg(l).ritual;
  return added.slice(0, 2).map((x) => t.addedSay({ n: x.amount, unit: x.unit })).join(t.addedSaySep);
}

/** 습관 '5/7번', 그 주에 습관이 없으면 '—' */
export function habitLine(r: Pick<WeekReview, 'habitCount' | 'routineDone' | 'routineDue'>, l?: Lang): string {
  return r.habitCount > 0 ? msg(l).ritual.habitValue({ done: r.routineDone, total: r.routineDue }) : '—';
}

/** 마음가짐 '평균 3.5점', 매긴 점수가 없으면 '—' */
export function mindLine(r: Pick<WeekReview, 'mindRated' | 'mindSum'>, l?: Lang): string {
  if (!(r.mindRated > 0)) return '—';
  const avg = Math.round((r.mindSum / r.mindRated) * 10) / 10;
  return msg(l).ritual.mindValue({ n: avg });
}

/** 그 주에 점수를 매길 마음가짐 칸 — 적혀 있고, 그 주가 끝나기 전에 정한 것 (영역 · 칸 순서) */
export function mindItems(doc: Pick<MandaratDoc, 'themes'>, week: string): { ti: number; ai: number }[] {
  const end = addDays(week, 6);
  const out: { ti: number; ai: number }[] = [];
  doc.themes.forEach((t, ti) => t.actions.forEach((a, ai) => {
    if (!a.text.trim() || kindOf(a) !== 'mind') return;
    if (a.since && a.since > end) return;
    out.push({ ti, ai });
  }));
  return out;
}

/** 다음 주 중점 후보 — 적혀 있고 아직 달성하지 않은 칸을 영역별로, 덜 이룬 영역부터(같으면 영역 순서) */
export function focusGroups(doc: Pick<MandaratDoc, 'themes'>): { ti: number; ais: number[] }[] {
  return doc.themes
    .map((t, ti) => ({
      ti,
      done: t.actions.filter((a) => a.done).length,
      ais: t.actions.map((a, ai) => (a.text.trim() && !a.done ? ai : -1)).filter((ai) => ai >= 0),
    }))
    .filter((g) => g.ais.length > 0)
    .sort((x, y) => x.done - y.done || x.ti - y.ti)
    .map(({ ti, ais }) => ({ ti, ais }));
}

/** 보여 줄 쪽 — 보여 줄 게 없는 쪽은 건너뛴다. 지난 기록 보기(readOnly)는 첫 쪽만 */
export function ritualPages(opts: { readOnly?: boolean; mind: number; candidates: number }): RitualPage[] {
  if (opts.readOnly) return ['week'];
  const pages: RitualPage[] = ['week'];
  if (opts.mind > 0) pages.push('mind');
  if (opts.candidates > 0) pages.push('next');
  return pages;
}

/** 중점 칸을 누를 때 — 고른 순서를 지키며 넣고 빼기. 이미 셋이면 null(더 못 고른다) */
export function togglePick(picks: readonly string[], key: string, max = MAX_PICKS): string[] | null {
  if (picks.includes(key)) return picks.filter((k) => k !== key);
  if (picks.length >= max) return null;
  return [...picks, key];
}

/** 마치며 띄우는 안내 */
export function finishToast(n: number, l?: Lang): string {
  const t = msg(l).ritual;
  return n > 0 ? t.finishPicked({ n }) : t.finishNone;
}
