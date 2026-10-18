// 日付・数の表記（日本語）。Intlは使わない。週は月曜始まり。
import type ko from '../ko/fmt';
import type { Like } from '../types';
import { groupNum } from '../num';
import { tsu } from './counter';

const DOW = ['日', '月', '火', '水', '木', '金', '土'];
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const md = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;
const pad = (n: number) => String(n).padStart(2, '0');

export default {
  dateLong: ({ d }) => `${md(d)} ${DOW[d.getDay()]}曜日`,
  dateSpeech: ({ d, today }) => `${d.getFullYear() !== today.getFullYear() ? `${d.getFullYear()}年` : ''}${md(d)} ${DOW[d.getDay()]}曜日`,
  dateShort: ({ d }) => `${d.getMonth() + 1}/${d.getDate()}(${DOW[d.getDay()]})`,
  monthDay: ({ d }) => md(d),
  monthDayDow: ({ d }) => `${md(d)}(${DOW[d.getDay()]})`,
  range: ({ from, to }) => `${md(from)}〜${to.getMonth() === from.getMonth() && to.getFullYear() === from.getFullYear() ? `${to.getDate()}日` : md(to)}`,
  year: ({ y }) => `${y}年`,
  yearSpan: ({ y, y2 }) => `${y}年〜${y2}年`,
  dueShort: ({ days }) => {
    const n = Math.round(days);
    return n > 0 ? `あと${n}日` : n === 0 ? '今日まで' : `${-n}日超過`;
  },
  dueLong: ({ days }) => {
    const n = Math.round(days);
    return n > 0 ? `締め切りまで${n}日` : n === 0 ? '今日が締め切り' : `締め切りを${-n}日過ぎ`;
  },
  duration: ({ mins }) => {
    const n = Math.max(0, Math.round(mins));
    if (n < 60) return `${n}分`;
    const h = Math.floor(n / 60);
    const m = n % 60;
    return m === 0 ? `${h}時間` : `${h}時間${m}分`;
  },
  time: ({ h, m }) => `${h}:${pad(m)}`,
  times: ({ n }) => `${groupNum(n)}回`,
  cells: ({ n }) => `${groupNum(n)}マス`,
  days: ({ n }) => `${groupNum(n)}日`,
  items: ({ n }) => tsu(n),
  count: ({ n, unit }) => `${groupNum(n)}${unit}`,
  ordinalCell: ({ n }) => `${n}番目のマス`,
  dowNarrow: ({ i }) => DOW[i] ?? '',
  dowShort: ({ i }) => DOW[i] ?? '',
  dowLong: ({ i }) => (DOW[i] ? `${DOW[i]}曜日` : ''),
  daysLabel: ({ dows }) => {
    const d = [...new Set(dows.filter((x) => Number.isInteger(x) && x >= 0 && x <= 6))].sort((a, b) => a - b);
    if (d.length === 0) return '';
    if (d.length === 7) return '毎日';
    if (d.length === 1) return `${DOW[d[0]]}曜日`;
    if (d.join() === '1,2,3,4,5') return '平日';
    if (d.join() === '0,6') return '週末';
    return WEEK.filter((x) => d.includes(x)).map((x) => DOW[x]).join('・');
  },
  weekNo: ({ y, w }) => `${y}年 第${w}週`,
  daysLeftYear: ({ n }) => `今年あと${n}日`,
} satisfies Like<typeof ko>;
