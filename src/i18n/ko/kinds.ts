// 'kinds' 이름공간 — 실천 유형의 이름·설명·한 줄(KindLine)·유형 제안 이름(X-B, docs/v2/plan.md 부록 B).
// src/lib/kinds.ts와 src/lib/kindSuggest.ts가 함수 안에서 msg().kinds로 읽는다. 표기는 v1과 글자 하나까지 같다.
import type { Namespace } from '../types';
import { groupNum } from '../num';
import fmt from './fmt';

export default {
  // ── 유형 이름(유형 고르기 · 인쇄의 print.kind*와 같은 말) ──
  labelOnce: '한 번',
  labelHabit: '습관',
  labelCount: '쌓기',
  labelMind: '마음가짐',
  // ── 유형 고르기 아래 한 줄 설명 ──
  hintOnce: '마감 사흘 전부터 ‘오늘’에 담겨요',
  hintHabit: '정한 요일마다 ‘오늘’에 담겨요. 주 N회로 정하면 횟수를 다 할 때까지 매일 담겨요.',
  hintCount: '숫자를 쌓아 가는 실천이에요. 목표 수에 닿으면 칸이 달성돼요.',
  hintMind: '한 주에 한 번 1~5점으로 돌아봐요',
  // ── 마감 빠른 선택 ──
  presetWeek: '이번 주',
  presetMonth: '이번 달',
  preset3Months: '3개월 뒤',
  presetYear: '올해 안',
  /** 올해가 아닌 날 — '2027년 1.4 (월)' (y는 d의 해 — 숫자로 따로 받는다) */
  dateOtherYear: ({ d, y }: { d: Date; y: number }) => `${y}년 ${fmt.dateShort({ d })}`,
  // ── 마음가짐 한 주 점수(1~5) ──
  rating1: '거의 못 지켰어요',
  rating2: '조금 지켰어요',
  rating3: '반쯤 지켰어요',
  rating4: '잘 지켰어요',
  rating5: '아주 잘 지켰어요',
  // ── 습관 한 줄 ──
  /** 주 N회 — 좁은 칸 '이번 주 2/3' */
  weekShort: ({ done, total }: { done: number; total: number }) => `이번 주 ${done}/${total}`,
  /** '이번 주 2/3회' */
  weekLong: ({ done, total }: { done: number; total: number }) => `이번 주 ${done}/${total}회`,
  /** 정한 것 — '주 3회' */
  weekPlan: ({ n }: { n: number }) => `주 ${n}회`,
  /** '이번 주 3회 중 2회' */
  weekSpeech: ({ done, total }: { done: number; total: number }) => `이번 주 ${total}회 중 ${done}회`,
  /** 요일 습관 — 좁은 칸 '월·수·금' */
  daysShort: ({ dows }: { dows: readonly number[] }) => fmt.daysLabel({ dows }),
  /** '월·수·금 반복' · '매일 반복' */
  daysLong: ({ dows }: { dows: readonly number[] }) => `${fmt.daysLabel({ dows })} 반복`,
  // ── 쌓기 한 줄 ──
  /** '6/12권' */
  countText: ({ count, total, unit }: { count: number; total: number; unit: string }) => `${groupNum(count)}/${groupNum(total)}${unit}`,
  /** '12권 중 6권' ('6/12권'은 날짜로 읽힌다) */
  countSpeech: ({ count, total, unit }: { count: number; total: number; unit: string }) => `${groupNum(total)}${unit} 중 ${groupNum(count)}${unit}`,
  /** '6/12권 · 오늘 +1' — text는 countText */
  countToday: ({ text, n }: { text: string; n: number }) => `${text} · 오늘 +${groupNum(n)}`,
  /** '12권 중 6권, 오늘 1권 더함' — said는 countSpeech */
  countTodaySpeech: ({ said, n, unit }: { said: string; n: number; unit: string }) => `${said}, 오늘 ${groupNum(n)}${unit} 더함`,
  // ── 한 번 한 줄 ──
  /** 마감을 소리로 — '마감 3일 남음' · '오늘 마감' · '마감 2일 지남' ('D-3'은 '디 마이너스 삼'으로 읽힌다) */
  dueSpeech: ({ days }: { days: number }) => (days > 0 ? `마감 ${days}일 남음` : days === 0 ? '오늘 마감' : `마감 ${-days}일 지남`),
  // ── 마음가짐 한 줄 ──
  mindShort: ({ n }: { n: number }) => `마음가짐 ${n}점`,
  mindLong: ({ n }: { n: number }) => `마음가짐 · 이번 주 ${n}점`,
  mindSpeech: ({ n }: { n: number }) => `마음가짐, 이번 주 ${n}점`,
  // ── 유형 제안(kindSuggest) 이름 — 편집 창의 'X 같아요' · josa(X, '으로/로') 문장에 그대로 들어간다 ──
  /** '주 3회 습관' */
  suggestPerWeek: ({ n }: { n: number }) => `주 ${n}회 습관`,
  /** '월·수·금 습관' · '매일 습관' */
  suggestDays: ({ dows }: { dows: readonly number[] }) => `${fmt.daysLabel({ dows })} 습관`,
  /** '12권 쌓기' */
  suggestCount: ({ n, unit }: { n: number; unit: string }) => `${groupNum(n)}${unit} 쌓기`,
  /** '한 번'만으로는 문장에서 뜻이 흐려서('한 번 같아요') 무엇인지까지 말한다 */
  suggestOnce: '한 번 하는 일',
  suggestMind: '마음가짐',
} satisfies Namespace;
