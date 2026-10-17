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

  sectionTitle: '通知',
  morning: '朝に今日やること',
  morningSub: ({ time }) => `毎日${time}・やることがある日だけ`,
  evening: '夜に残っていること',
  eveningSub: ({ time }) => `${time}・残りがある日だけ`,
  reviewSub: ({ dow, time }) => `${dow} ${time}`,
  habitNote: '習慣ごとの通知時刻は、行動を編集する画面で決めます',
  deviceAlso: 'この端末でも通知を受け取る',
  device: 'この端末で通知を受け取る',
  denied: 'この端末では通知がオフになっています',
  deniedBody: '端末の「設定」で通知をオンにすると届きます',
  undetermined: 'この端末ではまだ通知を許可していません',
  allow: '通知を許可する',
  earlier: '10分早める',
  later: '10分遅らせる',
  morningTime: '朝の通知時刻',
  eveningTime: '夜の通知時刻',
  habitTime: '習慣の通知時刻',
  editorNone: 'なし',
  editorPick: '時刻を決める',
  editorNoneA11y: '通知なし',
  editorPickA11y: '通知の時刻を決める',
  habitHint: 'この習慣をする日だけ届きます',
} satisfies Like<typeof ko>;
