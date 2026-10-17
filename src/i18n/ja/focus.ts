// 'focus' namespace — the 25-minute focus timer and its finish button (X-C, docs/v2/plan.md Appendix B).
// The lock-screen Live Activity text lives in 'live' (V2-B); the same states use the same words here.
import type ko from '../ko/focus';
import type { Like } from '../types';

export default {
  endAchieve: '終えて達成',
  endCheck: '終えて「できた」',
  endHere: 'ここで終える',
  markAchieved: '達成にする',
  doneToday: '今日できた',
  cueDone: '終わりました',
  cueRunning: '集中しています',
  cuePaused: 'いったん止めています',
  resumed: '集中を再開します',
  finished: '25分の集中を終えました',
  pause: '一時停止',
  resume: '再開',
  fullClock: '25分',
  fullClockA11y: '25分',
  timerLeft: ({ mins, secs }) => `残り${mins}分${secs}秒`,
  timerLeftPaused: ({ mins, secs }) => `一時停止中、残り${mins}分${secs}秒`,
  textFallback: '集中',
  footnote: '25分間、ひとつのことだけ',
  tallyA11y: ({ n }) => `25分のうち${n}分`,
} satisfies Like<typeof ko>;
