// 'year' namespace — filled by V1-D · V2-E · V3-D · V4-B (docs/v2/plan.md Appendix B).
import type ko from '../ko/year';
import type { Like } from '../types';
import { plural } from './plural';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default {
  // V1-D — backup import ledger row for past charts
  ledgerArchives: 'Past charts',
  archiveCount: ({ n }) => `${n} ${plural(n, 'chart', 'charts')}`,

  // V2-E — year close (overlay · settings rows · home prompt)
  pageReview: 'The year in review',
  pageNew: 'New chart',
  pageStart: 'Wrap up',
  pageSpeech: ({ n, total }) => `Page ${n} of ${total}`,
  next: 'Next',
  statDays: 'Days with records',
  statLongest: 'Longest streak',
  statAchieved: 'Achieved',
  statFocus: 'Focus',
  achievedSpeech: ({ n }) => `${n} of 64 ${plural(n, 'square', 'squares')}`,
  ledgerTitle: 'Days with records, by month',
  monthShort: ({ m }) => MONTHS[(m - 1 + 12) % 12],
  monthLong: ({ y, m }) => `${MONTHS_LONG[(m - 1 + 12) % 12]} ${y}`,
  monthSpeech: ({ label, n }) => (n > 0 ? `${label}, ${n} ${plural(n, 'day', 'days')} with records` : `${label}, no records`),
  noteLabel: 'The year in one line',
  noteCount: ({ n, max }) => `${n} of ${max} characters`,
  modeContinue: 'Keep the actions',
  modeContinueSub: 'Achieved marks and records start empty',
  modeAreas: 'Keep only the areas',
  modeAreasSub: 'Action squares start empty',
  modeBlank: 'Blank chart',
  modeBlankSub: 'Start again from the areas',
  goalLabel: 'Core goal of the new chart',
  goalHint: 'Leave it empty to keep the current goal',
  keepNote: 'This chart stays in the Archive as it is',
  keepSub: 'Its records are kept too, so you can look back any time',
  start: 'Start a new chart',
  started: 'New chart started',
  sameDay: 'You can wrap up a chart started today from tomorrow on',
  settingsHead: 'The year',
  shelf: 'Past charts in the Archive',
  shelfEmpty: 'None yet',
  homePrompt: "Time to wrap up this year's chart",
  homePromptAction: 'The year in review',

  // V3-D — year screen (review · Stats section)
  sheetTitle: 'Past chart',
  loading: 'Not ready yet',
  currentChart: 'The chart in use',
  statStreak: 'Longest streak',
  calendarTitle: 'The year by day',
  framesTitle: 'How the chart filled in',
  frameSpeech: ({ label, n }) => `By ${label}, ${n} of 64 squares achieved`,
  wearTitle: 'Well-worn squares',
  wearRight: 'Avg per 4 weeks',
  weeksTitle: 'Reviewed weeks',
  notesTitle: 'Reflections',
  notesEmpty: 'No one-line notes were written on this chart',
  notesMore: ({ n }) => `Show ${n} more ${plural(n, 'reflection', 'reflections')}`,
  more: 'Show more',
  printLink: 'Printable PDF',
  lockedLine: 'Year reviews of past charts open with Pro',
  lockedLink: 'About Pro',
  statsShelf: ({ n }) => `Archive · ${n} ${plural(n, 'chart', 'charts')}`,

  // V4-B — archive shelf · one past chart
  shelfNone: 'No charts in the Archive yet',
  shelfNoneSub: 'When you wrap up a year, its chart stays here',
  shelfLine: ({ n, days }) => `${n} of 64 squares achieved · ${days} ${plural(days, 'day', 'days')} recorded`,
  shelfMore: ({ n }) => `Show ${n} more past ${plural(n, 'chart', 'charts')}`,
  shelfLockedHint: 'Opens with Pro',
  sheetSpeech: ({ label, goal, n }) => (goal ? `${label} chart, ${goal}, ${n} of 64 squares achieved` : `${label} chart, ${n} of 64 squares achieved`),
  areasTitle: 'By area',
  areaUnnamed: ({ n }) => `Area ${n}`,
  areaLine: ({ n, of }) => `${n} of ${of} achieved`,
  areaOpenHint: 'Shows the nine squares of this area',
  areaCloseHint: 'Hides the nine squares',
  sheetReview: 'Review this year',
  sheetLocked: 'Opening past charts comes with Pro',
} satisfies Like<typeof ko>;
