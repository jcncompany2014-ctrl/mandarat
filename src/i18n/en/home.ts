// 'home' namespace — Home (the notebook's today page), the Home strings of lib/home and lib/a11y, and the GuideChips check line (X-H).
import type ko from '../ko/home';
import type { Like } from '../types';
import { plural } from './plural';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default {
  month: ({ n }) => MONTHS[n - 1] ?? '',
  settings: 'Settings',

  chartHint: 'Opens the chart',
  coreGoal: 'Core goal',
  setGoal: 'Set your core goal',
  setGoalHint: 'Sets the core goal',
  setGoalText: 'Set your\ncore goal',
  doneBefore: '',
  doneCount: ({ n }) => `${n}`,
  doneAfter: ' of 64 squares achieved',

  saveFailTitle: "Couldn't save your chart",
  saveFailBody: "Check your device's free space. We'll try again with each change.",
  saveFailAction: 'Export a backup',

  ritualTitle: 'Weekly review',
  ritualSub: ({ range }) => `${range} · Takes 3 minutes`,
  priorityTitle: "This week's focus",
  areaFallback: ({ n }) => `Area ${n}`,
  actionHint: 'Shows the action',

  todayTitle: "Today's list",
  openToday: 'Open Today',
  todayHeadLabel: ({ total, done }) => `Today's list: ${done} of ${total} done, open Today`,
  more: ({ n }) => `${n} more`,
  moreLabel: ({ n }) => `${n} more, open Today`,
  pickMore: 'Pick more from your actions',
  pickMoreLink: 'Pick more from your actions ›',
  addToday: 'Add to Today',
  closeLabel: ({ day, n }) => (n === 1
    ? `${day}, day closed. You did the one thing on Today's list`
    : `${day}, day closed. You did all ${n} ${plural(n, 'item', 'items')} on Today's list`),

  weekTitle: 'This week',
  weekDay: ({ day, n }) => `${day}: ${n} ${plural(n, 'time', 'times')}`,
  weekDayToday: ({ day, n }) => `${day}: ${n} ${plural(n, 'time', 'times')}, today`,

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

  chipWhat: 'What',
  chipHowMuch: 'How much',
  chipWhen: 'When · where',
  chipHint: 'The more specific, the easier it is to do',
  chipHas: ({ label }) => `${label}: yes`,
  chipMissing: ({ label }) => `${label}: missing`,
  chipSpeech: ({ spoken, hint }) => `${spoken}. ${hint}`,
} satisfies Like<typeof ko>;
