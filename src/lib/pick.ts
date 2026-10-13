// '오늘 할 일 고르기'와 첫 사용 '시작 가이드' 판단 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
import type { MandaratDoc } from '../types';
import { daysLabel, isRoutine, scheduledOn } from './routine';

/** auto = 반복 요일이 오늘이라 저절로 담김(고를 필요 없음), on/off = 오늘 목록에 담겼는지 */
export type PickState = 'auto' | 'on' | 'off';

export interface PickRow {
  ti: number;
  ai: number;
  text: string;
  state: PickState;
  /** 반복 요일 라벨(매일·평일·월·수…), 반복이 아니면 '' */
  days: string;
}

export interface PickSection {
  ti: number;
  rows: PickRow[];
  /** 이 영역에서 오늘 할 일에 들어간 수(저절로 담긴 반복 포함) */
  inToday: number;
}

/**
 * 영역별로 고를 수 있는 실천 — 글자가 있는 칸만.
 * 이미 달성한 일회성 칸은 오늘 할 일로 담을 이유가 없어 뺀다(반복 실천은 달성해도 날마다 하므로 남긴다).
 */
export function pickSections(doc: Pick<MandaratDoc, 'themes' | 'todayKeys'>, today: Date): PickSection[] {
  const picked = new Set(doc.todayKeys);
  const out: PickSection[] = [];
  doc.themes.forEach((th, ti) => {
    const rows: PickRow[] = [];
    th.actions.forEach((a, ai) => {
      if (!a.text.trim()) return;
      const routine = isRoutine(a);
      if (!routine && a.done) return;
      const state: PickState = routine && scheduledOn(a, today) ? 'auto' : picked.has(`${ti}-${ai}`) ? 'on' : 'off';
      rows.push({ ti, ai, text: a.text, state, days: routine ? daysLabel(a.days) : '' });
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
