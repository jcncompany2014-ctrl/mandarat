// 'chart' namespace — filled by X-E (docs/v2/plan.md Appendix B).
import type ko from '../ko/chart';
import type { Like } from '../types';

const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ord = (n: number) => ORD[n - 1] ?? `#${n}`;

export default {
  areaN: ({ n }) => `Area ${n}`,
  done: 'Achieved',
  fillAction: ({ n }) => `Write action ${n}`,
  sep: ', ',
  coreGoal: 'Core goal',
  goalPrompt: 'Set your core goal',
  areaOrdinalSay: ({ n }) => `${ord(n)} of 8 areas`,
  editAreaName: 'Edit area name',

  coreSay: ({ goal }) => `Core goal, ${goal}`,
  coreUnsetSay: 'No core goal yet',
  centerBlockSay: 'Center block, core goal and 8 areas',
  zoomCenterSay: 'Zoomed in on the center block',
  zoomBlockSay: ({ name }) => `Zoomed in on the ${name} block`,
  wholeSay: 'Showing all 81 squares',
  doneOf64Say: ({ done }) => `${done} of 64 squares achieved`,
  centerBlock: 'Center block',

  tabTitle: 'Mandalart',
  shareSay: 'Share chart as image',
  editGoal: 'Edit core goal',
  next: 'Up next',
  nextBlanks: ({ n, area }) => `${n} empty · start with ${area}`,
  nextStepSay: ({ title }) => `Up next, ${title}`,
  nextStepAreaSay: ({ title, area }) => `Up next, ${title}, ${area}`,
  formName: ({ y }) => `Mandalart ${y}`,
  writtenFolio: 'Written',
  of64: ({ n }) => `${n}/64`,
  writtenOf64Say: ({ n }) => `${n} of 64 squares written`,
  mapNote: 'Tap an area to see its eight actions',
  mapBlockHint: 'Double-tap to see its eight actions',
  startFrom: ({ area, n }) => `${area} · from square ${n}`,
  startPrompt: ({ area }) => `What will you do for ${area}?`,
  startNote: 'One thing per square. Write eight and the area is ready.',
  startWrite: 'Write my own',
  suggestSay: ({ text, n }) => `${text}, write in square ${n}`,
  habitWeek: 'Habits this week',
  habitTimes: 'Times',
  otherActions: 'Other actions',
  areaMore: 'Area options',

  areaOf: ({ n }) => `Area ${n} of 8`,
  areaDoneSay: ({ done, days }) => `${done} of 8 squares achieved${days > 0 ? `, ${days}-day streak` : ''}`,
  emptyHint: 'Tap a square to write your 8 actions',
  prevAreaSay: ({ name }) => `Previous area, ${name}`,
  nextAreaSay: ({ name }) => `Next area, ${name}`,
  undoDone: 'Mark not achieved',
  markDone: 'Mark achieved',
  rowHint: 'Opens details',
  weekCount: ({ done, total }) => `This week ${done}/${total}`,
  points: ({ n }) => `${n}/5`,
  pageSay: ({ name, n }) => `${name}, ${ord(n)} of 8 areas`,


  posterDate: ({ y, m, n }) => `${MON[m - 1] ?? ''} ${n}, ${y}`,
  brand: 'Mandalart',
  shareTitle: 'Chart image',
  shareWebOnly: 'You can share it as an image in the app',
  previewBlankSay: 'Chart image preview, blank chart',
  previewSay: ({ done }) => `Chart image preview, ${done} of 64 squares achieved`,
  modeProgress: 'With progress',
  modeBlank: 'Blank chart',
  making: 'Making the image',
  makeFailed: "Couldn't make the image",
  shareFailed: "Couldn't share the image",
  saveShare: 'Save or share image',

  markSay: ({ done }) => `My chart, 81 squares, ${done} of 64 achieved`,
  markTodaySay: ({ total, done }) => `, ${done} of ${total} on Today's list done`,
  sketchSay: ({ goal, areas }) => `Mandalart chart, center square ${goal}, areas ${areas}`,
  sketchEmpty: 'empty',
} satisfies Like<typeof ko>;
