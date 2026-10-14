// 영역 화면(Detail)의 글 — 실천 8개 줄의 오른쪽 상태, 화면 읽기 이름, 이웃 영역 이름, 넘길 때 읽어 줄 말.
// RN에 의존하지 않는 순수 모듈(단위 테스트 대상). 영역 화면은 달성을 보여 주기만 하고 하루 체크는 하지 않는다.
import type { MandaratDoc } from '../types';
import { countInfo, countText, kindLine, ratingOf } from './kinds';
import { daysBetween, kindOf, routineWeekCount, ymd } from './routine';
import { fmtDue } from './text';

type AreaDoc = Pick<MandaratDoc, 'themes' | 'dayLog'>;

/** 영역 이름 — 비어 있으면 '영역 3' */
export function areaTitle(doc: Pick<MandaratDoc, 'themes'>, ti: number): string {
  return doc.themes[ti]?.title.trim() || `영역 ${ti + 1}`;
}

/** 앞(-1)·뒤(+1) 영역 번호 — 8개를 한 바퀴로 돈다 */
export function neighborArea(ti: number, dir: -1 | 1): number {
  return (ti + dir + 8) % 8;
}

/**
 * 실천 줄 오른쪽 상태(짧게, 고정폭 숫자) —
 * 습관 '이번 주 2/3' · 쌓기 '7/12권' · 마음가짐 '4점'(아직이면 '—') · 마감 있는 한 번 'D-2'(달성했거나 마감이 없으면 '').
 */
export function rowStatus(doc: AreaDoc, ti: number, ai: number, now: Date): string {
  const a = doc.themes[ti]?.actions[ai];
  if (!a || !a.text.trim()) return '';
  const kind = kindOf(a);
  if (kind === 'habit') {
    const w = routineWeekCount(doc, ti, ai, now);
    return `이번 주 ${w.done}/${w.planned}`;
  }
  if (kind === 'count') return countText(countInfo(a));
  if (kind === 'mind') {
    const r = ratingOf(a, now);
    return r ? `${r}점` : '—';
  }
  if (a.done || !a.due) return '';
  return fmtDue(daysBetween(ymd(now), a.due));
}

/** 줄의 화면 읽기 이름 — '하루 물 2L, 달성, 매일 반복' (붙일 유형 줄이 없으면 글과 상태만) */
export function rowLabel(doc: AreaDoc, ti: number, ai: number, now: Date): string {
  const a = doc.themes[ti]?.actions[ai];
  if (!a || !a.text.trim()) return `실천 ${ai + 1} 채우기`;
  const line = kindLine(doc, ti, ai, now);
  return `${a.text.trim()}${a.done ? ', 달성' : ''}${line ? `, ${line.long}` : ''}`;
}

/** 이전·다음 영역으로 넘긴 뒤 읽어 줄 말 — '건강, 영역 1/8' */
export function pageSpeech(doc: Pick<MandaratDoc, 'themes'>, ti: number): string {
  return `${areaTitle(doc, ti)}, 영역 ${ti + 1}/8`;
}
