// 'notify' namespace — filled by V1-A (reminder text) · V2-A (settings text) (docs/v2/plan.md Appendix B).
import type ko from '../ko/notify';
import type { Like } from '../types';

export default {
  channel: 'やることの通知',
  sep: '・',
  more: ({ n }) => `ほか${n}件`,
  amTitle: ({ n }) => `今日やること ${n}件`,
  pmTitle: ({ n }) => `今日の残り ${n}件`,
  habitBody: ({ area }) => (area ? `${area}・今日の習慣です` : '今日の習慣です'),
  habitsTitle: ({ n }) => `習慣 ${n}件`,
  reviewTitle: '週のふりかえり',
  reviewBody: ({ range }) => `${range}・3分で終わります`,
} satisfies Like<typeof ko>;
