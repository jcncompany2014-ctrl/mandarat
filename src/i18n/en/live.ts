// 'live' namespace — focus timer Live Activity and the 25-minute alert (V2-B, docs/v2/plan.md Appendix B).
// Plain strings: the lock screen draws them outside the app.
import type ko from '../ko/live';
import type { Like } from '../types';

export default {
  left: 'Time left',
  paused: 'Paused',
  done: '25 minutes of focus, finished',
  focus: 'Focusing',
  doneTitle: '25 minutes are up',
} satisfies Like<typeof ko>;
