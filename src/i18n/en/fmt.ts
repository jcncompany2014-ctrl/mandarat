// Dates and numbers (English). No Intl. Weeks start on Monday.
import type ko from '../ko/fmt';
import type { Like } from '../types';
import { groupNum } from '../num';
import { plural } from './plural';

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const NARROW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const short = (s: string) => s.slice(0, 3);
const md = (d: Date) => `${short(MONTH[d.getMonth()])} ${d.getDate()}`;
const pad = (n: number) => String(n).padStart(2, '0');
const nth = (n: number) => {
  const t = n % 100;
  return `${n}${t >= 11 && t <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
};

export default {
  dateLong: ({ d }) => `${DOW[d.getDay()]}, ${MONTH[d.getMonth()]} ${d.getDate()}`,
  dateSpeech: ({ d, today }) => `${DOW[d.getDay()]}, ${MONTH[d.getMonth()]} ${d.getDate()}${d.getFullYear() !== today.getFullYear() ? `, ${d.getFullYear()}` : ''}`,
  dateShort: ({ d }) => `${short(DOW[d.getDay()])}, ${md(d)}`,
  monthDay: ({ d }) => md(d),
  monthDayDow: ({ d }) => `${short(DOW[d.getDay()])}, ${md(d)}`,
  range: ({ from, to }) => `${md(from)} – ${to.getMonth() === from.getMonth() && to.getFullYear() === from.getFullYear() ? `${to.getDate()}` : md(to)}`,
  year: ({ y }) => `${y}`,
  yearSpan: ({ y, y2 }) => `${y} – ${y2}`,
  dueShort: ({ days }) => {
    const n = Math.round(days);
    return n > 0 ? `in ${n}d` : n === 0 ? 'today' : `${-n}d late`;
  },
  dueLong: ({ days }) => {
    const n = Math.round(days);
    return n > 0 ? `Due in ${n} ${plural(n, 'day', 'days')}` : n === 0 ? 'Due today' : `${-n} ${plural(-n, 'day', 'days')} overdue`;
  },
  duration: ({ mins }) => {
    const n = Math.max(0, Math.round(mins));
    if (n < 60) return `${n} min`;
    const h = Math.floor(n / 60);
    const m = n % 60;
    return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
  },
  time: ({ h, m, h24 }) => (h24 ? `${pad(h)}:${pad(m)}` : `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`),
  times: ({ n }) => `${groupNum(n)} ${plural(n, 'time', 'times')}`,
  cells: ({ n }) => `${groupNum(n)} ${plural(n, 'square', 'squares')}`,
  days: ({ n }) => `${groupNum(n)} ${plural(n, 'day', 'days')}`,
  items: ({ n }) => `${groupNum(n)} ${plural(n, 'item', 'items')}`,
  count: ({ n, unit }) => `${groupNum(n)} ${unit}`,
  ordinalCell: ({ n }) => `${ORD[n - 1] ?? nth(n)} square`,
  dowNarrow: ({ i }) => NARROW[i] ?? '',
  dowShort: ({ i }) => (DOW[i] ? short(DOW[i]) : ''),
  dowLong: ({ i }) => DOW[i] ?? '',
  daysLabel: ({ dows }) => {
    const d = [...new Set(dows.filter((x) => Number.isInteger(x) && x >= 0 && x <= 6))].sort((a, b) => a - b);
    if (d.length === 0) return '';
    if (d.length === 7) return 'Every day';
    if (d.length === 1) return `${DOW[d[0]]}s`;
    if (d.join() === '1,2,3,4,5') return 'Weekdays';
    if (d.join() === '0,6') return 'Weekends';
    return WEEK.filter((x) => d.includes(x)).map((x) => short(DOW[x])).join(', ');
  },
  weekNo: ({ y, w }) => `${y} · Week ${w}`,
  daysLeftYear: ({ n }) => `${n} ${plural(n, 'day', 'days')} left this year`,
} satisfies Like<typeof ko>;
