// 'live' namespace — focus timer Live Activity and the 25-minute alert (V2-B, docs/v2/plan.md Appendix B).
// Plain strings: the lock screen draws them outside the app.
import type ko from '../ko/live';
import type { Like } from '../types';

export default {
  left: '残り時間',
  paused: 'いったん止めています',
  done: '25分の集中を終えました',
  focus: '集中しています',
  doneTitle: '25分たちました',
} satisfies Like<typeof ko>;
