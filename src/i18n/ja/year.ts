// 'year' namespace — filled by V1-D · V2-E · V3-D · V4-B (docs/v2/plan.md Appendix B).
import type ko from '../ko/year';
import type { Like } from '../types';

export default {
  // V1-D — backup import ledger row for past charts
  ledgerArchives: '過去の表',
  archiveCount: ({ n }) => `${n}枚`,
} satisfies Like<typeof ko>;
