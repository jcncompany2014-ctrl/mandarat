// 'paper' namespace — V4-C (docs/v2/plan.md Appendix B).
import type ko from '../ko/paper';
import type { Like } from '../types';

export default {
  head: 'Paper pattern',
  dots: 'Dots (default)',
  grid: 'Grid',
  lines: 'Lined',
  blank: 'Plain',
  pro: 'Pro',
  keptNote: 'Unlock Pro to draw this pattern',
  say: ({ name }) => `Paper pattern ${name}`,
  sayLocked: ({ name }) => `Paper pattern ${name}, Pro`,
  lockedHint: 'Opens the Pro page',
} satisfies Like<typeof ko>;
