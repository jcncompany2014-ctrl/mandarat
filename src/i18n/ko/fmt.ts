// 날짜·수 표기(한국어) — src/lib/text.ts·home.ts·statsView.ts·routine.ts의 표기와 글자 하나까지 같다(tests/i18n-catalog.test.js).
// Intl은 쓰지 않는다. 주는 월요일부터. 이 이름공간은 Wave 0 뒤로 고정이다(X-0만 더할 수 있다).
import type { Namespace } from '../types';
import { groupNum } from '../num';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const ORD = ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟'];
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const md = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
const pad = (n: number) => String(n).padStart(2, '0');

export default {
  /** '10월 14일 수요일' */
  dateLong: ({ d }: { d: Date }) => `${md(d)} ${DOW[d.getDay()]}요일`,
  /** 해가 다르면 해까지 — '2027년 1월 14일 목요일' */
  dateSpeech: ({ d, today }: { d: Date; today: Date }) =>
    `${d.getFullYear() !== today.getFullYear() ? `${d.getFullYear()}년 ` : ''}${md(d)} ${DOW[d.getDay()]}요일`,
  /** '10.14 (수)' */
  dateShort: ({ d }: { d: Date }) => `${d.getMonth() + 1}.${d.getDate()} (${DOW[d.getDay()]})`,
  /** '10월 14일' */
  monthDay: ({ d }: { d: Date }) => md(d),
  /** '10월 14일 수' */
  monthDayDow: ({ d }: { d: Date }) => `${md(d)} ${DOW[d.getDay()]}`,
  /** '10월 12일 – 18일' · '9월 29일 – 10월 5일' */
  range: ({ from, to }: { from: Date; to: Date }) =>
    `${md(from)} – ${to.getMonth() === from.getMonth() && to.getFullYear() === from.getFullYear() ? `${to.getDate()}일` : md(to)}`,
  /** '2026년' */
  year: ({ y }: { y: number }) => `${y}년`,
  /** '2026년 – 2027년' */
  yearSpan: ({ y, y2 }: { y: number; y2: number }) => `${y}년 – ${y2}년`,
  /** 'D-2' · 'D-day' · 'D+3' */
  dueShort: ({ days }: { days: number }) => {
    const n = Math.round(days);
    return n > 0 ? `D-${n}` : n === 0 ? 'D-day' : `D+${-n}`;
  },
  /** '마감 D-2' · '오늘 마감' · '마감 3일 지남' */
  dueLong: ({ days }: { days: number }) => {
    const n = Math.round(days);
    return n > 0 ? `마감 D-${n}` : n === 0 ? '오늘 마감' : `마감 ${-n}일 지남`;
  },
  /** '25분' · '2시간' · '1시간 5분' */
  duration: ({ mins }: { mins: number }) => {
    const n = Math.max(0, Math.round(mins));
    if (n < 60) return `${n}분`;
    const h = Math.floor(n / 60);
    const m = n % 60;
    return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
  },
  /** '오후 9:00' · 24시간이면 '21:00' */
  time: ({ h, m, h24 }: { h: number; m: number; h24?: boolean }) =>
    h24 ? `${pad(h)}:${pad(m)}` : `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${pad(m)}`,
  /** '3번' */
  times: ({ n }: { n: number }) => `${groupNum(n)}번`,
  /** '3칸' */
  cells: ({ n }: { n: number }) => `${groupNum(n)}칸`,
  /** '3일' */
  days: ({ n }: { n: number }) => `${groupNum(n)}일`,
  /** '3개' */
  items: ({ n }: { n: number }) => `${groupNum(n)}개`,
  /** '7권' · '50만 원' — 단위는 숫자에 붙여 쓴다 */
  count: ({ n, unit }: { n: number; unit: string }) => `${groupNum(n)}${unit}`,
  /** '세 번째 칸' (1부터) */
  ordinalCell: ({ n }: { n: number }) => `${ORD[n - 1] ?? `${n}`} 번째 칸`,
  /** '월' (0 = 일요일) */
  dowNarrow: ({ i }: { i: number }) => DOW[i] ?? '',
  /** '월' */
  dowShort: ({ i }: { i: number }) => DOW[i] ?? '',
  /** '월요일' */
  dowLong: ({ i }: { i: number }) => (DOW[i] ? `${DOW[i]}요일` : ''),
  /** 매일 · 평일 · 주말 · 월·수·금 · 일요일(하루면 '요일'까지) — 요일은 0~6, 정리된 목록 */
  daysLabel: ({ dows }: { dows: readonly number[] }) => {
    const d = [...new Set(dows.filter((x) => Number.isInteger(x) && x >= 0 && x <= 6))].sort((a, b) => a - b);
    if (d.length === 0) return '';
    if (d.length === 7) return '매일';
    if (d.length === 1) return `${DOW[d[0]]}요일`;
    if (d.join() === '1,2,3,4,5') return '평일';
    if (d.join() === '0,6') return '주말';
    return WEEK.filter((x) => d.includes(x)).map((x) => DOW[x]).join('·');
  },
  /** '2026 · 42주' */
  weekNo: ({ y, w }: { y: number; w: number }) => `${y} · ${w}주`,
  /** '올해 78일 남음' */
  daysLeftYear: ({ n }: { n: number }) => `올해 ${n}일 남음`,
} satisfies Namespace;
