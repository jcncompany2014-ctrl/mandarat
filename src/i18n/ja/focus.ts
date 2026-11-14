// 'focus' namespace — the 25-minute focus timer and its finish button (X-C, docs/v2/plan.md Appendix B).
// The lock-screen Live Activity text lives in 'live' (V2-B); the same states use the same words here.
import type ko from '../ko/focus';
import type { Like } from '../types';

export default {
  endAchieve: '終えて達成',
  endCheck: '終えて「できた」にする',
  endHere: 'ここで終える',
  markAchieved: '達成にする',
  doneToday: '今日できた',
  left: '残り時間',
  cueDone: '終わりました',
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
  eyebrow: ({ area }) => `${area}・25分集中`,
  endsAt: '終わる時刻',
  endsAtA11y: ({ time }) => `終わる時刻 ${time}`,
  footnote: '25分間、ひとつのことだけ。画面を消しても時間は進みます。',
  stop: 'やめる',
  tallyA11y: ({ n }) => `25分のうち${n}分`,
} satisfies Like<typeof ko>;
