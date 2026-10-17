// 'kinds' namespace — action kind names, hints, the one-line summary (KindLine) and kind suggestions (X-B).
import type ko from '../ko/kinds';
import type { Like } from '../types';
import { groupNum } from '../num';
import fmt from './fmt';
import { plural } from './plural';

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** A unit made of letters is set off by a space ('12 books', '30 km'); a sign is not ('80%') */
const withUnit = (n: string, unit: string) => (/^\p{L}/u.test(unit) ? `${n} ${unit}` : `${n}${unit}`);

const sorted = (dows: readonly number[]) => [...new Set(dows.filter((x) => Number.isInteger(x) && x >= 0 && x <= 6))].sort((a, b) => a - b);

/** Every day · Every weekday · Every weekend · Every Sunday · Every Mon, Wed, Fri */
function repeatDays(dows: readonly number[]): string {
  const d = sorted(dows);
  if (d.length === 0) return '';
  if (d.length === 7) return 'Every day';
  if (d.length === 1) return `Every ${DOW[d[0]]}`;
  if (d.join() === '1,2,3,4,5') return 'Every weekday';
  if (d.join() === '0,6') return 'Every weekend';
  return `Every ${fmt.daysLabel({ dows: d })}`;
}

/** daily habit · weekday habit · weekend habit · Sunday habit · Mon, Wed, Fri habit */
function daysHabit(dows: readonly number[]): string {
  const d = sorted(dows);
  if (d.length === 7) return 'daily habit';
  if (d.length === 1) return `${DOW[d[0]]} habit`;
  if (d.join() === '1,2,3,4,5') return 'weekday habit';
  if (d.join() === '0,6') return 'weekend habit';
  return `${fmt.daysLabel({ dows: d })} habit`;
}

export default {
  labelOnce: 'One-time',
  labelHabit: 'Habit',
  labelCount: 'Count',
  labelMind: 'Mindset',
  hintOnce: 'Shows up in Today 3 days before the due date',
  hintHabit: 'Shows up in Today on the days you pick. With N times a week, it shows up every day until you reach that number.',
  hintCount: 'An action you count up. The square is achieved when you reach the goal.',
  hintMind: 'Once a week, rate how it went from 1 to 5',
  presetWeek: 'This week',
  presetMonth: 'This month',
  preset3Months: 'In 3 months',
  presetYear: 'By year end',
  dateOtherYear: ({ d, y }) => `${fmt.dateShort({ d })}, ${y}`,
  rating1: 'Hardly kept it',
  rating2: 'Kept it a little',
  rating3: 'Kept it about half the time',
  rating4: 'Kept it well',
  rating5: 'Kept it very well',
  weekShort: ({ done, total }) => `${done}/${total} this week`,
  weekLong: ({ done, total }) => `${done}/${total} ${plural(total, 'time', 'times')} this week`,
  weekPlan: ({ n }) => (n === 1 ? 'Once a week' : `${n} ${plural(n, 'time', 'times')} a week`),
  weekSpeech: ({ done, total }) => `${done} of ${total} ${plural(total, 'time', 'times')} this week`,
  daysShort: ({ dows }) => fmt.daysLabel({ dows }),
  daysLong: ({ dows }) => repeatDays(dows),
  countText: ({ count, total, unit }) => withUnit(`${groupNum(count)}/${groupNum(total)}`, unit).trim(),
  countSpeech: ({ count, total, unit }) => withUnit(`${groupNum(count)} of ${groupNum(total)}`, unit).trim(),
  countToday: ({ text, n }) => `${text} · +${groupNum(n)} today`,
  countTodaySpeech: ({ said, n }) => `${said}, ${groupNum(n)} logged today`,
  dueSpeech: ({ days }) => (days > 0 ? `Due in ${days} ${plural(days, 'day', 'days')}` : days === 0 ? 'Due today' : `${-days} ${plural(-days, 'day', 'days')} overdue`),
  mindShort: ({ n }) => `Mindset ${n}/5`,
  mindLong: ({ n }) => `Mindset · ${n}/5 this week`,
  mindSpeech: ({ n }) => `Mindset, ${n} out of 5 this week`,
  suggestPerWeek: ({ n }) => (n === 1 ? 'a weekly habit' : `a habit, ${n} ${plural(n, 'time', 'times')} a week`),
  suggestDays: ({ dows }) => `a ${daysHabit(dows)}`,
  suggestCount: ({ n, unit }) => `a count to ${withUnit(groupNum(n), unit).trim()}`,
  suggestOnce: 'a one-time action',
  suggestMind: 'a mindset',
} satisfies Like<typeof ko>;
