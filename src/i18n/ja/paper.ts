// 'paper' 名前空間 — V4-C(docs/v2/plan.md 付録 B)。
import type ko from '../ko/paper';
import type { Like } from '../types';

export default {
  head: '紙の柄',
  dots: 'ドット(標準)',
  grid: '方眼',
  lines: '罫線',
  blank: '無地',
  pro: 'プロ',
  keptNote: 'プロを開くとこの柄で表示されます',
  say: ({ name }) => `紙の柄 ${name}`,
  sayLocked: ({ name }) => `紙の柄 ${name}、プロ`,
  lockedHint: 'プロの案内を開きます',
} satisfies Like<typeof ko>;
