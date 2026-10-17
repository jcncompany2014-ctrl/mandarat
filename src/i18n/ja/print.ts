// 'print' namespace — filled by V1-B · V2-D (docs/v2/plan.md Appendix B).
import type ko from '../ko/print';
import type { Like } from '../types';

export default {
  sheetTitle: '目標達成表',
  coverTitle: '分野の一覧',
  achieved: ({ done, total }) => `${total}マス中 ${done}マス達成`,
  areaN: ({ n }) => `分野 ${n}`,
  areaOf: ({ n, total }) => `分野 ${n} / ${total}`,
  finished: '達成',
  memo: 'メモ',
  colAction: '行動',
  colKind: '種類',
  colTally: '1か月の記録',
  kindOnce: '一度だけ',
  kindHabit: '習慣',
  kindCount: '積み上げ',
  kindMind: '心がけ',
  appName: 'マンダラート',
} satisfies Like<typeof ko>;
