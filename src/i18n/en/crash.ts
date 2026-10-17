// 'crash' namespace — V4-F (Settings › About, the error-report row). docs/v2/plan.md Appendix B.
import type ko from '../ko/crash';
import type { Like } from '../types';

export default {
  row: 'Send error reports',
  rowSub: 'If the app stops, only device details and the error are sent. Nothing you write is sent',
  qaSent: 'Test error sent',
} satisfies Like<typeof ko>;
