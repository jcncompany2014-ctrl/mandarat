// 'ritual' 이름공간 — X-L가 채운다(docs/v2/plan.md 부록 B).
// 한 주 돌아보기(WeekRitual) 세 쪽 · 쪽에 놓는 글(ritualView) · 이번 주 한 문장(review.weekSentence).
import { josa } from './josa';
import { groupNum } from '../num';
import type { Namespace } from '../types';

/** 줄인 이름 + 조사 — 조사는 원래 이름의 끝소리로 고른다('건강하고 활기찬…는') */
const topic = (name: string, full: string) => name + josa(full, '은/는').slice(full.length);

export default {
  // ── 함께 쓰는 말 ──
  /** 이름을 아직 짓지 않은 영역 — '영역 3' */
  areaN: ({ n }: { n: number }) => `영역 ${n}`,

  // ── 쪽 ──
  pageWeek: '한 주',
  pageMind: '마음가짐',
  pageNext: '다음 주 중점',
  /** 쪽을 넘길 때 읽는 말 — '마음가짐, 3쪽 중 2쪽' */
  pageSay: ({ title, page }: { title: string; page: string }) => `${title}, ${page}`,
  next: '다음',
  finish: '마치기',
  /** 고른 수를 버튼에도 — '중점 2칸 · 마치기' */
  finishWith: ({ n }: { n: number }) => `중점 ${n}칸 · 마치기`,
  finishWithSay: ({ n }: { n: number }) => `중점 ${n}칸 골랐어요, 마치기`,

  // ── 1쪽 · 한 주 ──
  /** 큰 숫자 — '12번' */
  total: ({ n }: { n: number }) => `${n}번`,
  totalSay: ({ range, n }: { range: string; n: number }) => `${range} 모두 ${n}번`,
  deltaMore: ({ n }: { n: number }) => `지난주보다 ${n}번 더 했어요`,
  deltaLess: ({ n }: { n: number }) => `지난주보다 ${n}번 적어요`,
  deltaSame: '지난주와 같아요',
  rowHabit: '습관',
  rowAdded: '쌓은 것',
  rowMind: '마음가짐',
  /** 장부 한 줄을 읽는 말 — '습관 7번 중 5번' */
  rowSay: ({ label, value }: { label: string; value: string }) => `${label} ${value}`,
  rowNone: '없음',
  /** 습관 '5/7번' */
  habitValue: ({ done, total }: { done: number; total: number }) => `${done}/${total}번`,
  /** 쌓은 것 한 가지 '+2권' */
  addedValue: ({ n, unit }: { n: number; unit: string }) => `+${groupNum(n)}${unit}`,
  addedSep: ' · ',
  /** 쌓은 것을 소리로 — '2권 더함' */
  addedSay: ({ n, unit }: { n: number; unit: string }) => `${groupNum(n)}${unit} 더함`,
  addedSaySep: ', ',
  /** 마음가짐 '평균 3.5점' */
  mindValue: ({ n }: { n: number }) => `평균 ${n}점`,
  pickSay: ({ area, text }: { area: string; text: string }) => `${area}, ${text}`,
  noteSay: ({ note }: { note: string }) => `한 줄 메모, ${note}`,

  // ── 2쪽 · 마음가짐 ──
  mindHint: '그 주를 떠올리며 1~5점',

  // ── 3쪽 · 다음 주 중점 ──
  nextHint: ({ n }: { n: number }) => `다음 주에 힘쓸 칸을 ${n}개까지 골라요`,
  pickedSay: ({ n }: { n: number }) => `${n}개 골랐어요`,
  pickMax: ({ n }: { n: number }) => `${n}개까지 고를 수 있어요`,
  note: '한 줄 메모',

  // ── 마치며 ──
  finishPicked: ({ n }: { n: number }) => `다음 주 중점 ${n}칸을 정했어요`,
  finishNone: '한 주를 돌아봤어요',

  // ── 이번 주 한 문장(weekSentence) — 있었던 일만, 칭찬·훈계 없이 ──
  sentenceAll: '여덟 영역을 모두 한 번 이상 챙겼어요',
  /** '건강은 9번 챙겼어요' — area는 줄인 이름, full은 조사를 고를 원래 이름 */
  sentenceTop: ({ area, full, n }: { area: string; full: string; n: number }) => `${topic(area, full)} ${n}번 챙겼어요`,
  /** '건강은 9번 챙겼고, 관계는 아직이에요' */
  sentenceTopLow: ({ area, full, n, low, lowFull }: { area: string; full: string; n: number; low: string; lowFull: string }) =>
    `${topic(area, full)} ${n}번 챙겼고, ${topic(low, lowFull)} 아직이에요`,
} satisfies Namespace;
