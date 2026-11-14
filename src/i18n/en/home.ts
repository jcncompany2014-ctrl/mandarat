// 'home' namespace — Home (the notebook's today page), and the Home strings of lib/home and lib/a11y (X-H).
import type ko from '../ko/home';
import type { Like } from '../types';
import { plural } from './plural';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default {
  settings: 'Settings',
  eyebrow: ({ day, w }) => `${day} · Week ${w}`,

  heroToday: 'Today',
  heroDone: 'Achieved',
  heroLeft: 'Left this year',
  unitCells: 'squares',
  unitDays: ({ n }) => plural(n, 'day', 'days'),

  chartHint: 'Opens the chart',
  setGoal: 'Set your core goal',
  setGoalHint: 'Sets the core goal',
  setGoalText: 'Set your\ncore goal',

  saveFailTitle: "Couldn't save your chart",
  saveFailBody: "Check your device's free space. We'll try again with each change.",
  saveFailAction: 'Export a backup',

  ritualTitle: 'Weekly review',
  ritualSub: ({ range }) => `${range} · Takes 3 minutes`,
  areaFallback: ({ n }) => `Area ${n}`,
  actionHint: 'Shows the action',

  todayTitle: "Today's list",
  seeAll: 'See all',
  openToday: 'Open Today',
  todayHeadLabel: ({ total, done }) => `Today's list: ${done} of ${total} done, open Today`,
  pickMore: 'Pick more from your actions',
  addToday: 'Add to Today',
  closeLabel: ({ day, n }) => (n === 1
    ? `${day}, day closed. You did the one thing on Today's list`
    : `${day}, day closed. You did all ${n} ${plural(n, 'item', 'items')} on Today's list`),

  weekTitle: 'This week',
  weekDay: ({ day, n }) => `${day}: ${n} ${plural(n, 'time', 'times')}`,
  weekDayToday: ({ day, n }) => `${day}: ${n} ${plural(n, 'time', 'times')}, today`,
  weekClosed: 'day closed',

  areasTitle: '8 areas',
  areaRowLabel: ({ name, line, n }) => `${name}, ${line}, ${n} of 8 squares achieved`,
  areaAllDone: 'All 8 squares achieved',
  areaNext: ({ text }) => `Next · ${text}`,
  areaBlank: ({ n }) => `${n} empty ${plural(n, 'square', 'squares')}`,

  guideTitle: 'Get started',
  guideProgress: ({ total, done }) => `${done} of ${total} steps`,
  guideFillLabel: ({ label, done, total }) => `${label} · ${done}/${total}`,
  guideFillSpeech: ({ label, done, total }) => `${label}, ${done} of ${total} ${plural(total, 'square', 'squares')}`,
  guideStep: ({ n, text }) => `Step ${n}: ${text}`,
  guideDone: 'done',
  guideNext: 'up next',
  ctaSet: 'Set',
  ctaFill: 'Fill',
  ctaPick: 'Pick',

  sentSep: ' ',
  sumDate: ({ day }) => `${day}.`,
  sumGoal: ({ goal }) => `Core goal: ${goal}.`,
  sumNoGoal: 'No core goal yet.',
  sumDone: ({ n }) => `${n} of 64 squares achieved.`,
  sumNone: "Nothing on Today's list yet.",
  sumAllDone: "Today's list is all done.",
  sumLeft: ({ n }) => `${n} left on Today's list.`,
  todayNone: "Nothing on Today's list yet",
  todayAll: ({ total }) => (total === 1 ? "Today's list: 1 of 1 done" : `Today's list: all ${total} done`),
  todayOf: ({ total, done }) => `Today's list: ${done} of ${total} done`,

} satisfies Like<typeof ko>;
