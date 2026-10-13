// '오늘 할 일 고르기'와 첫 사용 '시작 가이드' 판단 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
import type { MandaratDoc } from '../types';
import { autoToday, daysBetween, isRoutine, kindOf, perWeekOf, routineWeekCount, ymd } from './routine';
import { kindLine } from './kinds';

/** auto = 오늘 저절로 담김(반복 요일·주 N회·다가온 마감 — 고를 필요 없음), on/off = 오늘 목록에 담겼는지 */
export type PickState = 'auto' | 'on' | 'off';

export interface PickRow {
  ti: number;
  ai: number;
  text: string;
  state: PickState;
  /** 정한 것 한 줄(월·수·금 반복 · 주 3회 · 6/12권 · 마감 D-3), 붙일 게 없으면 '' */
  hint: string;
  /** 저절로 담긴 까닭, 저절로가 아니면 '' */
  why: string;
}

export interface PickSection {
  ti: number;
  rows: PickRow[];
  /** 이 영역에서 오늘 할 일에 들어간 수(저절로 담긴 반복 포함) */
  inToday: number;
}

/** 저절로 담긴 까닭 한 줄 */
function whyAuto(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, ti: number, ai: number, today: Date): string {
  const a = doc.themes[ti].actions[ai];
  const kind = kindOf(a);
  if (kind === 'once') {
    const due = a.due ? daysBetween(ymd(today), a.due) : 0;
    return due < 0 ? '마감이 지나 저절로 담겨요' : '마감이 다가와 저절로 담겨요';
  }
  const n = perWeekOf(a);
  if (n > 0) {
    const left = n - routineWeekCount(doc, ti, ai, today).done;
    return left > 0 ? `이번 주 ${left}회 남아 저절로 담겨요` : '오늘 했어요';
  }
  return '오늘은 저절로 담겨요';
}

/**
 * 영역별로 고를 수 있는 실천 — 글자가 있는 칸만.
 * 이미 달성한 한 번·쌓기 칸은 오늘 할 일로 담을 이유가 없어 뺀다(습관은 달성해도 날마다 하므로 남긴다).
 * 마음가짐은 날마다 하는 일이 아니라 고르지 않는다.
 */
export function pickSections(doc: Pick<MandaratDoc, 'themes' | 'todayKeys' | 'dayLog'>, today: Date): PickSection[] {
  const picked = new Set(doc.todayKeys);
  const out: PickSection[] = [];
  doc.themes.forEach((th, ti) => {
    const rows: PickRow[] = [];
    th.actions.forEach((a, ai) => {
      if (!a.text.trim()) return;
      const kind = kindOf(a);
      if (kind === 'mind' || (kind !== 'habit' && a.done)) return;
      const auto = autoToday(doc, ti, ai, today);
      const state: PickState = auto ? 'auto' : picked.has(`${ti}-${ai}`) ? 'on' : 'off';
      const line = kindLine(doc, ti, ai, today);
      rows.push({ ti, ai, text: a.text, state, hint: line?.plan ?? '', why: auto ? whyAuto(doc, ti, ai, today) : '' });
    });
    if (rows.length) out.push({ ti, rows, inToday: rows.filter((r) => r.state !== 'off').length });
  });
  return out;
}

/** 아직 글자가 없는 칸이 있는 첫 영역(없으면 -1) — '칸 채우기'로 바로 데려갈 곳 */
export function firstAreaWithEmpty(doc: Pick<MandaratDoc, 'themes'>): number {
  return doc.themes.findIndex((th) => th.actions.some((a) => !a.text.trim()));
}

export interface GuideStep {
  key: 'goal' | 'fill' | 'today' | 'check';
  done: boolean;
}

/** 실천 칸을 이만큼 채우면 '시작'은 된 것으로 본다(64칸을 다 채울 때까지 붙잡아 두지 않는다) */
export const GUIDE_FILL_TARGET = 8;

/**
 * 처음 쓰는 사람의 네 단계: 핵심 목표 → 실천 칸 채우기 → 오늘 할 일 고르기 → 하나 체크하기.
 * 모두 끝나면 홈에서 사라진다(전체 초기화를 하면 다시 나온다).
 */
export function guideSteps(doc: Pick<MandaratDoc, 'centerGoal' | 'themes' | 'todayKeys' | 'todayExtra' | 'dayLog'>): { steps: GuideStep[]; filled: number; next: number } {
  const filled = doc.themes.reduce((s, th) => s + th.actions.filter((a) => a.text.trim()).length, 0);
  const anyRoutine = doc.themes.some((th) => th.actions.some((a) => a.text.trim() && isRoutine(a)));
  const anyDone = doc.themes.some((th) => th.actions.some((a) => a.done));
  const anyLog = Object.values(doc.dayLog).some((v) => v.length > 0);
  // '오늘 할 일'은 날짜가 바뀌면 끝낸 것부터 정리되므로, 한 번이라도 해낸 기록이 있으면 고른 적이 있는 것으로 본다
  // (그래야 다 끝낸 가이드가 다음 날 아침 다시 나오지 않는다)
  const steps: GuideStep[] = [
    { key: 'goal', done: !!doc.centerGoal.trim() },
    { key: 'fill', done: filled >= GUIDE_FILL_TARGET },
    { key: 'today', done: doc.todayKeys.length > 0 || doc.todayExtra.length > 0 || anyRoutine || anyDone || anyLog },
    { key: 'check', done: anyDone || anyLog },
  ];
  return { steps, filled, next: steps.findIndex((s) => !s.done) };
}
