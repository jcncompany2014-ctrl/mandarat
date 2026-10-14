// VoiceOver가 읽을 한 문장 — 홈 머리말 · 오늘 카운터 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// 화면에 보이는 낱말 그대로, 상태까지 한 번에 읽히게 만든다. 숫자는 여기서 바로 센다(.tsx를 가져오지 않는다).
// 'D-2'·'6/12'처럼 눈으로 읽는 표기는 소리로 읽기 좋은 말('마감 2일 남음'·'12권 중 6권')로 바꾼다.
// 표(81칸 · 영역 보드)의 칸·블록 말과 고유어 서수(ORDINAL)는 chartSpeech.ts 한 곳에 둔다.
import type { Action, MandaratDoc } from '../types';
import { todayProgress } from './routine';
import { fmtDateLong } from './text';

type SummaryDoc = Pick<MandaratDoc, 'centerGoal' | 'themes' | 'dayLog' | 'todayKeys' | 'todayExtra'>;

const written = (a: Action | undefined): a is Action => !!a && a.text.trim() !== '';

/** 64칸 중 달성한 칸 수(글이 있는 칸만) */
function doneCells(doc: Pick<MandaratDoc, 'themes'>): number {
  let n = 0;
  for (const t of doc.themes) for (const a of t.actions) if (written(a) && a.done) n++;
  return n;
}

/**
 * 홈 머리말 — '10월 14일 수요일. 핵심 목표, 건강한 한 해. 64칸 중 29칸 달성. 오늘 할 일 8개 남았어요.'
 * 목표가 없으면 '핵심 목표를 아직 정하지 않았어요.'
 */
export function homeSummary(doc: SummaryDoc, now: Date): string {
  const goal = doc.centerGoal.trim().replace(/[.。!?]+$/, '');
  const p = todayProgress(doc, now);
  const left = p.total === 0
    ? '오늘 할 일은 아직 없어요.'
    : p.done >= p.total
      ? '오늘 할 일을 다 했어요.'
      : `오늘 할 일 ${p.total - p.done}개 남았어요.`;
  return [
    `${fmtDateLong(now)}.`,
    goal ? `핵심 목표, ${goal}.` : '핵심 목표를 아직 정하지 않았어요.',
    `64칸 중 ${doneCells(doc)}칸 달성.`,
    left,
  ].join(' ');
}

/** 오늘 카운터 — '오늘 할 일 10개 중 2개 했어요' (없으면 '오늘 할 일이 아직 없어요', 다 하면 '오늘 할 일 10개를 다 했어요') */
export function todaySummary(doc: Pick<MandaratDoc, 'themes' | 'dayLog' | 'todayKeys' | 'todayExtra'>, now: Date): string {
  const p = todayProgress(doc, now);
  if (p.total === 0) return '오늘 할 일이 아직 없어요';
  if (p.done >= p.total) return `오늘 할 일 ${p.total}개를 다 했어요`;
  return `오늘 할 일 ${p.total}개 중 ${p.done}개 했어요`;
}
