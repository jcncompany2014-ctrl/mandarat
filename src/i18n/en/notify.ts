// 'notify' namespace — filled by V1-A (reminder text) · V2-A (settings text) (docs/v2/plan.md Appendix B).
import type ko from '../ko/notify';
import type { Like } from '../types';
import { plural } from './plural';

export default {
  channel: 'Reminders',
  sep: ' · ',
  more: ({ n }) => `and ${n} more`,
  amTitle: ({ n }) => `${n} ${plural(n, 'thing', 'things')} on Today's list`,
  pmTitle: ({ n }) => `${n} ${plural(n, 'thing', 'things')} left for today`,
  habitBody: ({ area }) => (area ? `${area} · A habit for today` : 'A habit for today'),
  habitsTitle: ({ n }) => `${n} ${plural(n, 'habit', 'habits')}`,
  reviewTitle: 'Weekly review',
  reviewBody: ({ range }) => `${range} · Takes 3 minutes`,
} satisfies Like<typeof ko>;
