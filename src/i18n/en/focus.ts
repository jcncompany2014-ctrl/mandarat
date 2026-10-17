// 'focus' namespace — the 25-minute focus timer and its finish button (X-C, docs/v2/plan.md Appendix B).
// The lock-screen Live Activity text lives in 'live' (V2-B); the same states use the same words here.
import type ko from '../ko/focus';
import type { Like } from '../types';

export default {
  endAchieve: 'End, mark achieved',
  endCheck: 'End, mark done',
  endHere: 'End here',
  markAchieved: 'Mark achieved',
  doneToday: 'Done today',
  cueDone: 'Finished',
  cueRunning: 'Focusing',
  cuePaused: 'Paused',
  resumed: 'Focusing again',
  finished: 'Finished 25 minutes of focus',
  pause: 'Pause',
  resume: 'Resume',
  fullClock: '25 min',
  fullClockA11y: '25 minutes',
  timerLeft: ({ mins, secs }) => `${mins} min ${secs} sec left`,
  timerLeftPaused: ({ mins, secs }) => `Paused, ${mins} min ${secs} sec left`,
  textFallback: 'Focus',
  footnote: 'One thing for 25 minutes',
  tallyA11y: ({ n }) => `${n} of 25 minutes`,
} satisfies Like<typeof ko>;
