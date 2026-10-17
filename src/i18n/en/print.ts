// 'print' namespace — filled by V1-B · V2-D (docs/v2/plan.md Appendix B).
import type ko from '../ko/print';
import type { Like } from '../types';
import { plural } from './plural';

export default {
  sheetTitle: 'Goal chart',
  coverTitle: 'Areas at a glance',
  achieved: ({ done, total }) => `${done} of ${total} ${plural(total, 'square', 'squares')} achieved`,
  areaN: ({ n }) => `Area ${n}`,
  areaOf: ({ n, total }) => `Area ${n} of ${total}`,
  finished: 'Achieved',
  memo: 'Notes',
  colAction: 'Action',
  colKind: 'Type',
  colTally: 'This month',
  kindOnce: 'Once',
  kindHabit: 'Habit',
  kindCount: 'Build-up',
  kindMind: 'Mindset',
  appName: 'Mandalart',
} satisfies Like<typeof ko>;
