// 'core' — shared base strings (tab bar, sheets, error screen, chart speech, week strip, display names).
import type ko from '../ko/core';
import type { Like } from '../types';
import fmt from './fmt';
import { plural } from './plural';

export default {
  tabHome: 'Home',
  tabGrid: 'Chart',
  tabToday: 'Today',
  tabStats: 'Stats',
  tabAdd: 'Add',
  tabAddHint: 'Write something and add it to Today',
  todayAllDone: "Everything on Today's list is done",
  areaAllDone: ({ name, n }) => `${name || `Area ${n}`}: all 8 squares achieved`,
  undoable: ({ message }) => `${message}. You can undo this`,
  undoStale: "Something changed in the meantime, so this can't be undone",
  dot: ' · ',

  back: 'Back',
  sheetHandle: 'Close sheet',
  sheetHandleHint: 'You can also swipe down to close',
  labelCount: ({ label, n }) => `${label}, ${n} ${plural(n, 'item', 'items')}`,

  crashTitle: "This screen couldn't open",
  crashBody: 'Your saved records are safe.\nPlease try again. If this screen comes back, export your records first.',
  crashExport: 'Export records',
  crashExportEmpty: 'No saved records yet',
  crashExportFailed: "Couldn't export your records. Please try once more.",

  repeatDow: ({ i }) => `Repeat on ${fmt.dowLong({ i })}s`,
  repeatLabel: ({ label }) => `Repeat: ${label}`,
  noRepeat: "Don't repeat",

  ordinal: ({ n }) => ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'][n - 1] ?? `${n}`,
  listSep: ', ',
  cellEmpty: 'empty',
  cellDidToday: 'done today',
  cellOnToday: "on Today's list",
  cellAchieved: 'achieved',
  areaUnwritten: ({ name }) => `${name}, no actions written yet`,
  areaSummary: ({ name, done, n }) => `${name}, ${done} of 8 squares achieved${n > 0 ? `, ${n} on Today's list` : ''}`,

  dayDoneToday: 'done today',
  dayDone: 'done',
  dayToday: 'today',
  dayMissed: 'missed',
  dayPlanned: 'planned',
  dayRestToday: 'rest day today',
  dayRest: 'rest day',
  stripDay: ({ i, word }) => `${fmt.dowLong({ i })}: ${word}`,
  dayState: ({ i, word }) => `${fmt.dowLong({ i })}: ${word}`,
  dayClear: ({ i }) => `Clear ${fmt.dowLong({ i })}`,
  dayMark: ({ i }) => `Mark ${fmt.dowLong({ i })} done`,

  mgmtList: 'List',
  mgmtStreak: 'Streak',
  mgmtBoard: 'Board',
  shapeRound: 'Rounded',
  shapeSquare: 'Sharp',
  paperIvory: 'Ivory',
  paperCream: 'Cream',
  paperGray: 'Gray',
  paperLavender: 'Lavender',
  paperDark: 'Dark',
  mood0: 'Rough',
  mood1: 'Meh',
  mood2: 'Okay',
  mood3: 'Good',
  mood4: 'Great',

  accentGold: 'Gold',
  accentRouge: 'Rouge',
  accentMugwort: 'Sage',
  accentIndigo: 'Indigo',
  accentMulberry: 'Mulberry',

  fitAll: 'Fits in the 81-square chart',
  fitLines: ({ max }) => `Only ${max} ${plural(max, 'line', 'lines')} show in the 81-square chart`,
} satisfies Like<typeof ko>;
