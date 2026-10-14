// 영역 화면(Detail)의 글 — 실천 8개 줄의 오른쪽 상태, 화면 읽기 이름, 이웃 영역 이름, 넘길 때 읽어 줄 말.
// RN에 의존하지 않는 순수 모듈(단위 테스트 대상). 영역 화면은 달성을 보여 주기만 하고 하루 체크는 하지 않는다.
import type { Action, MandaratDoc } from '../types';
import { countInfo, countText, kindLine, ratingOf, type KindLine } from './kinds';
import { daysBetween, kindOf, routineWeekCount, ymd } from './routine';
import { fmtDue } from './text';
import { ORDINAL } from './chartSpeech';

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

/** 줄의 화면 읽기 이름 — '책 12권, 12권 중 7권' · '하루 물 2L, 달성, 매일 반복' (유형 줄은 소리로 읽는 말 KindLine.speech) */
export function rowLabel(doc: AreaDoc, ti: number, ai: number, now: Date): string {
  const a = doc.themes[ti]?.actions[ai];
  if (!a || !a.text.trim()) return `실천 ${ai + 1} 채우기`;
  return rowLabelFor(a, ai, kindLine(doc, ti, ai, now));
}

/**
 * rowLabel과 같은 말 — 유형 줄(kindLine)을 이미 센 쪽(영역 화면은 줄마다 한 번 센다)이 다시 세지 않게 받는다.
 * '6/12권'·'D-3'을 날짜·글자로 읽지 않게 유형 줄은 소리 말(KindLine.speech)
 */
export function rowLabelFor(a: Action, ai: number, line: KindLine | null): string {
  if (!a.text.trim()) return `실천 ${ai + 1} 채우기`;
  return `${a.text.trim()}${a.done ? ', 달성' : ''}${line ? `, ${line.speech}` : ''}`;
}

/** 이전·다음 영역으로 넘긴 뒤 읽어 줄 말 — '건강, 8개 영역 중 첫 번째' ('1/8'은 날짜로 읽히고 '1번째'는 '일번째'로 읽혀 고유어 서수로) */
export function pageSpeech(doc: Pick<MandaratDoc, 'themes'>, ti: number): string {
  return `${areaTitle(doc, ti)}, 8개 영역 중 ${ORDINAL[ti] ?? `${ti + 1}`} 번째`;
}
