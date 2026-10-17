// 'ritual' namespace — filled by X-L (docs/v2/plan.md Appendix B).
// The Weekly review (WeekRitual), its page copy (ritualView) and the one-line week summary (review.weekSentence).
import type ko from '../ko/ritual';
import { plural } from './plural';
import { groupNum } from '../num';
import type { Like } from '../types';

/** A Latin unit is set off by a space ('+2 books', '+5 km'); a sign or a unit in another script is not ('+12권') */
const withUnit = (n: string, unit: string) => (/^[a-z]/i.test(unit) ? `${n} ${unit}` : `${n}${unit}`);
const times = (n: number) => (n === 1 ? 'once' : `${groupNum(n)} ${plural(n, 'time', 'times')}`);

export default {
  areaN: ({ n }) => `Area ${n}`,

  pageWeek: 'The week',
  pageMind: 'Mindset',
  pageNext: "Next week's focus",
  pageSay: ({ title, page }) => `${title}, ${page}`,
  next: 'Next',
  finish: 'Finish',
  finishWith: ({ n }) => `${n} picked · Finish`,
  finishWithSay: ({ n }) => `${n} ${plural(n, 'square', 'squares')} picked, finish`,

  total: ({ n }) => `${groupNum(n)}`,
  totalSay: ({ range, n }) => `${range}, ${groupNum(n)} ${plural(n, 'time', 'times')} in all`,
  deltaMore: ({ n }) => `${groupNum(n)} more than last week`,
  deltaLess: ({ n }) => `${groupNum(n)} fewer than last week`,
  deltaSame: 'Same as last week',
  rowHabit: 'Habits',
  rowAdded: 'Added',
  rowMind: 'Mindset',
  rowSay: ({ label, value }) => `${label}, ${value}`,
  rowNone: 'none',
  habitValue: ({ done, total }) => `${done}/${total}`,
  addedValue: ({ n, unit }) => withUnit(`+${groupNum(n)}`, unit),
  addedSep: ' · ',
  addedSay: ({ n, unit }) => `${withUnit(groupNum(n), unit)} added`,
  addedSaySep: ', ',
  mindValue: ({ n }) => `Avg ${n} of 5`,
  pickSay: ({ area, text }) => `${area}, ${text}`,
  noteSay: ({ note }) => `Note, ${note}`,

  mindHint: 'Think back on the week and rate it 1 to 5',

  nextHint: ({ n }) => `Pick up to ${n} ${plural(n, 'square', 'squares')} to work on next week`,
  pickedSay: ({ n }) => `${n} picked`,
  pickMax: ({ n }) => `You can pick up to ${n}`,
  note: 'One-line note',

  finishPicked: ({ n }) => `Set ${n} ${plural(n, 'square', 'squares')} to focus on next week`,
  finishNone: 'Week reviewed',

  sentenceAll: 'You worked on all eight areas at least once',
  sentenceTop: ({ area, n }) => `You worked on ${area} ${times(n)}`,
  sentenceTopLow: ({ area, n, low }) => `You worked on ${area} ${times(n)}, and not yet on ${low}`,
} satisfies Like<typeof ko>;
