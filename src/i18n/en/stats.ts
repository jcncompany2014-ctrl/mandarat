// 'stats' namespace — the Stats screen, its four charts and statsView (X-F).
import type ko from '../ko/stats';
import type { Like } from '../types';
import fmt from './fmt';
import { plural } from './plural';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const times = (n: number) => plural(n, 'time', 'times');
const days = (n: number) => plural(n, 'day', 'days');

export default {
  screenTitle: 'Stats',
  empty: 'Do one and your record starts here',

  heroStreak: 'Streak',
  heroDays: ({ n }) => ` ${days(n)}`,
  heroDone: 'Achieved',
  heroOf64: 'of 64 squares',
  streakStart: 'Do one to start',
  streakKept: 'Kept up through today',
  streakNext: ({ n }) => `Do one today for day ${n}`,
  streakSay: ({ n }) => `Streak ${n} ${days(n)}`,
  streakSayPending: ({ n }) => `Streak ${n} ${days(n)}, nothing yet today`,
  recordNow: 'Your best streak yet',
  recordBest: ({ n }) => `Best ${n} ${days(n)}`,
  recordMonth: ({ n }) => `${n} ${plural(n, 'square', 'squares')} achieved this month`,

  secWeek: 'This week',
  reviewLink: 'Review ›',
  reviewLinkSay: 'Weekly review',
  weekDid: ({ n }) => `Done ${n} ${times(n)} this week`,
  weekNoDone: ({ n }) => `Done ${n} ${times(n)} this week. A square is achieved when you finish a one-time action or reach its target.`,
  deltaSame: 'Same as this time last week',
  deltaMore: ({ n }) => `+${n} vs. this time last week`,
  deltaLess: ({ n }) => `−${n} vs. this time last week`,
  barDaySay: ({ i, n }) => `${fmt.dowLong({ i })}: ${n} ${times(n)}`,
  barTodaySay: ({ i, n }) => `Today, ${fmt.dowLong({ i })}: ${n} ${times(n)}`,
  barFutureSay: ({ i }) => `${fmt.dowLong({ i })} on: not yet`,

  ledgerAdded: 'Added',
  ledgerFocus: 'Focus',
  ledgerNone: 'none',
  ledgerSay: ({ label, value }) => `${label}: ${value}`,
  habitValue: ({ done, total }) => `${done}/${total}`,
  habitFromToday: 'Counting from today',
  habitAll: 'All done this week',
  habitMissed: ({ n }) => `${n} missed`,
  habitLeft: ({ n }) => `${n} to go`,
  mindRatedOf: ({ total, done }) => `Rated ${done} of ${total}`,
  mindNotYet: 'Not rated yet this week',
  soFar: 'So far',

  secReviewed: 'Reviewed weeks',
  weeksN: ({ n }) => `${n} ${plural(n, 'week', 'weeks')}`,
  reviewHabit: ({ pct }) => `Habits ${pct}%`,
  reviewMind: ({ avg }) => `Mindset ${avg}`,
  openReview: 'Open review',
  moreWeeks: ({ n }) => `Show ${n} more ${plural(n, 'week', 'weeks')}`,
  more: 'Show more',

  secTenWeeks: 'Last 10 weeks',
  since: ({ date }) => `Since ${date}`,
  monthLabel: ({ n }) => MON[n - 1] ?? '',
  bestNone: 'No record yet',
  bestDay: ({ date, n }) => `Busiest day ${date} · ${n} ${times(n)}`,
  thisWeek: 'this week',
  heatSay: ({ n }) => `Active on ${n} ${days(n)} in the last 10 weeks`,
  heatBestSay: ({ date, n }) => `busiest day ${date}, ${n} ${times(n)}`,
  heatHint: 'Swipe up or down to move one day',
  pastAction: 'Past action',
  namesMore: ({ names, n }) => `${names} and ${n} more`,
  pickedHead: ({ date, n }) => `${date} · ${n} ${times(n)}`,
  pickedSay: ({ date, n }) => `${date}, ${n} ${times(n)}`,
  noPick: 'No day picked',

  secCount: 'Count goals',
  countRight: 'So far / goal',
  secMind: 'Mindset',
  last8w: 'Last 8 weeks',
  pace: ({ date }) => `At this pace, ${date}`,
  monthZero: ({ unit }) => `0 ${unit} this month`,
  goalReached: 'Goal reached',
  weekAdded: ({ num, unit }) => `+${num} ${unit} this week`,
  mindAvg: ({ n, avg }) => `${n} rated ${plural(n, 'week', 'weeks')}, avg ${avg}`,
  mindNoWeeks: 'No weeks rated yet',
  mindWeekSay: ({ n }) => `This week ${n} of 5`,
  mindWeekNone: 'Not rated this week',
  mindOf8Say: ({ sub }) => `Last 8 weeks: ${sub}`,

  secAreas: '8 areas',
  areasRight: 'Last 4 weeks',
  openArea: 'Open area',
  wearSay: ({ n }) => `last 4 weeks: ${n} ${days(n)}`,
  wearNone: 'nothing in the last 4 weeks',
  legendLast4: 'Last 4 weeks ·',
  // label is the top bin ('5+'), always plural
  legendTimes: ({ label }) => `${label} ${days(5)}`,

  secReflect: 'Reflections',
  last14d: 'Last 14 days',
  reflectEmpty: 'Lines you write on Today gather here',
  moreNotes: ({ n }) => `Show ${n} more ${plural(n, 'line', 'lines')}`,
  moodNoneSay: ({ days: d }) => `No mood logged in the last ${d} ${days(d)}`,
  moodSay: ({ days: d, n }) => `Mood logged on ${n} of the last ${d} ${days(d)}`,
  moodDaySay: ({ date, word }) => `${date}: ${word}`,
} satisfies Like<typeof ko>;
