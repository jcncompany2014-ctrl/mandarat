// 'year' namespace — filled by V1-D · V2-E · V3-D · V4-B (docs/v2/plan.md Appendix B).
import type ko from '../ko/year';
import type { Like } from '../types';
import { plural } from './plural';

export default {
  // V1-D — backup import ledger row for past charts
  ledgerArchives: 'Past charts',
  archiveCount: ({ n }) => `${n} ${plural(n, 'chart', 'charts')}`,
} satisfies Like<typeof ko>;
