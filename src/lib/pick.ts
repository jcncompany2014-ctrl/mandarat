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
  /** 저절로 담긴 까닭(whyAuto), 저절로가 아니면 '' */
  why: string;
}

export interface PickSection {
  ti: number;
  /** 글자가 있는 고를 만한 칸 — 저절로 담긴 줄(state 'auto')도 들어 있다 */
  rows: PickRow[];
  /** 이 영역에서 오늘 할 일에 들어간 수(저절로 담긴 반복 포함) */
  inToday: number;
  /** 저절로 담긴 칸의 글(칸 순서) — 고를 수 없는 줄 대신 한 줄로 알려 줄 때 */
  autoNames: string[];
  /** 저절로 담긴 칸 수 */
  autoCount: number;
}

/**
 * 저절로 '오늘'에 담긴 까닭 한 줄 — 저절로 담기지 않았으면 ''.
 * 마감 지남 · 마감 가까움 · 주 N회 남은 횟수 · 반복하는 날.
 */
export function whyAuto(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, ti: number, ai: number, today: Date): string {
  if (!autoToday(doc, ti, ai, today)) return '';
  const a = doc.themes[ti].actions[ai];
  if (kindOf(a) === 'once') {
    const due = a.due ? daysBetween(ymd(today), a.due) : 0;
    return due < 0 ? '마감이 지나 ‘오늘’에 이미 있어요' : '마감이 가까워 ‘오늘’에 이미 있어요';
  }
  if (perWeekOf(a) > 0) {
    // 정한 주에는 남은 날만큼이 목표라 N이 아니라 이번 주 목표(planned)로 센다
    const w = routineWeekCount(doc, ti, ai, today);
    const left = w.planned - w.done;
    // 남은 횟수가 없는데도 담겨 있다면 오늘 체크로 채운 것
    return left > 0 ? `이번 주 ${left}회 남아 ‘오늘’에 이미 있어요` : `이번 주 ${w.planned}회를 오늘 다 했어요`;
  }
  return '반복하는 날이라 ‘오늘’에 이미 있어요';
}

/**
 * 영역별로 고를 수 있는 실천 — 글자가 있는 칸만.
 * 이미 달성한 한 번·쌓기 칸은 오늘 할 일로 담을 이유가 없어 뺀다(습관은 달성해도 날마다 하므로 남긴다).
 * 마음가짐은 날마다 하는 일이 아니라 고르지 않는다.
 * 저절로 담긴 칸은 고를 수 없으므로 autoNames·autoCount로도 따로 준다(줄은 호환을 위해 rows에도 남긴다).
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
    if (!rows.length) return;
    const autoNames = rows.filter((r) => r.state === 'auto').map((r) => r.text.trim());
    out.push({ ti, rows, inToday: rows.filter((r) => r.state !== 'off').length, autoNames, autoCount: autoNames.length });
  });
  return out;
}

/**
 * 더 고를 칸이 하나라도 있는가 — pickSections(...).some(r => r.state === 'off')와 같은 답을, 첫 칸을 찾는 즉시 낸다.
 * (글이 있고 · 마음가짐이 아니고 · 달성하지 않았거나 습관이고 · 저절로 담기지 않았고 · 아직 고르지 않은 칸)
 */
export function canPickAny(doc: Pick<MandaratDoc, 'themes' | 'todayKeys' | 'dayLog'>, today: Date): boolean {
  const picked = new Set(doc.todayKeys);
  for (let ti = 0; ti < doc.themes.length; ti++) {
    const actions = doc.themes[ti].actions;
    for (let ai = 0; ai < actions.length; ai++) {
      const a = actions[ai];
      if (!a.text.trim() || picked.has(`${ti}-${ai}`)) continue;
      const kind = kindOf(a);
      if (kind === 'mind' || (kind !== 'habit' && a.done)) continue;
      if (!autoToday(doc, ti, ai, today)) return true;
    }
  }
  return false;
}

/** 아직 글자가 없는 칸이 있는 첫 영역(없으면 -1) — '칸 채우기'로 바로 데려갈 곳 */
export function firstAreaWithEmpty(doc: Pick<MandaratDoc, 'themes'>): number {
  return doc.themes.findIndex((th) => th.actions.some((a) => !a.text.trim()));
}

export type GuideKey = 'goal' | 'areas' | 'fill' | 'today' | 'check';

export interface GuideStep {
  key: GuideKey;
  /** 단계 이름 — '핵심 목표 정하기' · '영역 8개 정하기' · '실천 칸 8개 채우기' · '오늘 할 일 고르기' · '하나 해 보기' */
  label: string;
  done: boolean;
}

/** 실천 칸을 이만큼 채우면 '시작'은 된 것으로 본다(64칸을 다 채울 때까지 붙잡아 두지 않는다) */
export const GUIDE_FILL_TARGET = 8;
/** 시작 가이드 단계 수 */
export const GUIDE_STEP_COUNT = 5;

/**
 * 처음 쓰는 사람의 다섯 단계: 핵심 목표 → 영역 8개 → 실천 칸 채우기 → 오늘 할 일 고르기 → 하나 체크하기.
 * 영역 8개를 정하는 것이 만다라트의 핵심 단계라 따로 둔다(영역 이름 칸을 저장하거나 — 기본 이름 그대로여도 —
 * 템플릿·예시를 쓰면 areasSet. 실천을 적는 것만으로는 끝나지 않는다).
 * 모두 끝나면 홈에서 사라진다(전체 초기화를 하면 다시 나온다).
 * areasSet은 구조로만 받는다 — 저장본에 없던 이전 문서도 그대로 넘길 수 있게.
 */
export function guideSteps(
  doc: Pick<MandaratDoc, 'centerGoal' | 'themes' | 'todayKeys' | 'todayExtra' | 'dayLog'> & { areasSet?: boolean },
): { steps: GuideStep[]; filled: number; next: number } {
  const filled = doc.themes.reduce((s, th) => s + th.actions.filter((a) => a.text.trim()).length, 0);
  const anyRoutine = doc.themes.some((th) => th.actions.some((a) => a.text.trim() && isRoutine(a)));
  const anyDone = doc.themes.some((th) => th.actions.some((a) => a.done));
  const anyLog = Object.values(doc.dayLog).some((v) => v.length > 0);
  // '오늘 할 일'은 날짜가 바뀌면 끝낸 것부터 정리되므로, 한 번이라도 해낸 기록이 있으면 고른 적이 있는 것으로 본다
  // (그래야 다 끝낸 가이드가 다음 날 아침 다시 나오지 않는다)
  const steps: GuideStep[] = [
    { key: 'goal', label: '핵심 목표 정하기', done: !!doc.centerGoal.trim() },
    { key: 'areas', label: '영역 8개 정하기', done: doc.areasSet === true },
    { key: 'fill', label: `실천 칸 ${GUIDE_FILL_TARGET}개 채우기`, done: filled >= GUIDE_FILL_TARGET },
    { key: 'today', label: '오늘 할 일 고르기', done: doc.todayKeys.length > 0 || doc.todayExtra.length > 0 || anyRoutine || anyDone || anyLog },
    { key: 'check', label: '하나 해 보기', done: anyDone || anyLog },
  ];
  return { steps, filled, next: steps.findIndex((s) => !s.done) };
}
