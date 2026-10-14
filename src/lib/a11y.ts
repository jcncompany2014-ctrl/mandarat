// VoiceOver가 읽을 한 문장 — 홈 머리말 · 오늘 카운터 · 만다라트 블록 · 칸 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// 화면에 보이는 낱말 그대로, 상태까지 한 번에 읽히게 만든다. 숫자는 여기서 바로 센다(.tsx를 가져오지 않는다).
// 'D-2'·'6/12'처럼 눈으로 읽는 표기는 소리로 읽기 좋은 말('마감 2일 남음'·'12권 중 6권')로 바꾼다.
import type { Action, MandaratDoc } from '../types';
import { daysBetween, daysLabel, habitDays, kindOf, perWeekOf, todayItems, todayProgress, ymd } from './routine';
import { countInfo, fmtNum, ratingOf } from './kinds';
import { fmtDateLong } from './text';

type SummaryDoc = Pick<MandaratDoc, 'centerGoal' | 'themes' | 'dayLog' | 'todayKeys' | 'todayExtra'>;
type ChartDoc = Pick<MandaratDoc, 'themes' | 'dayLog' | 'todayKeys'>;

const areaName = (doc: Pick<MandaratDoc, 'themes'>, ti: number) => doc.themes[ti]?.title.trim() || `영역 ${ti + 1}`;
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

/** 만다라트 블록 — '건강, 8칸 중 3칸 달성, 오늘 2칸' (오늘 담긴 칸이 없으면 뒤 말은 뺀다) */
export function blockSummary(doc: ChartDoc, ti: number, now: Date): string {
  const th = doc.themes[ti];
  if (!th) return '';
  const name = areaName(doc, ti);
  if (!th.actions.some(written)) return `${name}, 실천을 아직 적지 않았어요`;
  const done = th.actions.filter((a) => written(a) && a.done).length;
  const today = todayItems(doc, now).filter((i) => i.ti === ti).length;
  return `${name}, 8칸 중 ${done}칸 달성${today > 0 ? `, 오늘 ${today}칸` : ''}`;
}

/** 칸의 유형을 소리로 — '습관 매일' · '습관 주 3회' · '쌓기 12권 중 6권' · '한 번, 마감 2일 남음' · '마음가짐, 이번 주 4점' */
function kindSpeech(a: Action, now: Date): string {
  const kind = kindOf(a);
  if (kind === 'habit') {
    const n = perWeekOf(a);
    return `습관 ${n > 0 ? `주 ${n}회` : daysLabel(habitDays(a))}`;
  }
  if (kind === 'count') {
    const c = countInfo(a);
    return `쌓기 ${fmtNum(c.goal)}${c.unit} 중 ${fmtNum(c.count)}${c.unit}`;
  }
  if (kind === 'mind') {
    const r = ratingOf(a, now);
    return r ? `마음가짐, 이번 주 ${r}점` : '마음가짐';
  }
  if (!a.due || a.done) return '한 번';
  const left = daysBetween(ymd(now), a.due);
  return `한 번, ${left > 0 ? `마감 ${left}일 남음` : left === 0 ? '오늘 마감' : `마감 ${-left}일 지남`}`;
}

/** 블록 안 자리 — '3번째'는 '삼번째'로 읽혀서 고유어 서수로 쓴다 */
const ORDINAL = ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟'];

/**
 * 칸 하나 — '세 번째 칸, 하루 물 2L, 습관 매일, 오늘 할 일, 달성'.
 * 오늘 목록에 있으면 '오늘 할 일'(그날 했으면 '오늘 했어요'), 칸이 달성이면 '달성'. 빈 칸은 '세 번째 칸, 비어 있음'.
 */
export function cellSpeech(doc: ChartDoc, ti: number, ai: number, now: Date): string {
  const a = doc.themes[ti]?.actions[ai];
  const pos = `${ORDINAL[ai] ?? `${ai + 1}`} 번째 칸`;
  if (!written(a)) return `${pos}, 비어 있음`;
  const parts = [pos, a.text.trim(), kindSpeech(a, now)];
  const item = todayItems(doc, now).find((i) => i.ti === ti && i.ai === ai);
  if (item) parts.push(item.done ? '오늘 했어요' : '오늘 할 일');
  if (a.done) parts.push('달성');
  return parts.join(', ');
}
