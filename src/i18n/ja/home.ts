// 'home' namespace — Home (the notebook's today page), and the Home strings of lib/home and lib/a11y (X-H).
import type ko from '../ko/home';
import type { Like } from '../types';
import { tsu } from './counter';

export default {
  settings: '設定',
  eyebrow: ({ day, w }) => `${day}・第${w}週`,

  heroToday: '今日',
  heroDone: '達成',
  heroLeft: '今年の残り',
  unitCells: 'マス',
  unitDays: () => '日',

  chartHint: 'マンダラートを開きます',
  setGoal: '中心の目標を決めてください',
  setGoalHint: '中心の目標を決めます',
  setGoalText: '中心の目標を\n決めてください',

  saveFailTitle: '記録を保存できませんでした',
  saveFailBody: '端末の空き容量を確認してください。変更のたびに、もう一度保存を試みます。',
  saveFailAction: 'バックアップを書き出す',

  ritualTitle: '週のふりかえり',
  ritualSub: ({ range }) => `${range}・3分で終わります`,
  areaFallback: ({ n }) => `分野${n}`,
  actionHint: '行動の詳細を見る',

  todayTitle: '今日やること',
  seeAll: 'すべて見る',
  openToday: '「今日」を開く',
  todayHeadLabel: ({ total, done }) => `今日やること${tsu(total)}のうち${tsu(done)}できました。「今日」を開く`,
  pickMore: '行動からもっと選ぶ',
  addToday: '今日やることを入れる',
  closeLabel: ({ day, n }) => `${day}、締めました。今日やること${tsu(n)}が全部できました`,

  weekTitle: '今週',
  weekDay: ({ day, n }) => `${day} ${n}回`,
  weekDayToday: ({ day, n }) => `${day} ${n}回、今日`,
  weekClosed: '締め',

  areasTitle: '8つの分野',
  areaRowLabel: ({ name, line, n }) => `${name}、${line}、8マス中${n}マス達成`,
  areaAllDone: '8マスすべて達成しました',
  areaNext: ({ text }) => `次・${text}`,
  areaBlank: ({ n }) => `空き${n}マス`,

  guideTitle: 'はじめに',
  guideProgress: ({ total, done }) => `${total}ステップ中${done}ステップ`,
  guideFillLabel: ({ label, done, total }) => `${label}・${done}/${total}`,
  guideFillSpeech: ({ label, done, total }) => `${label}、${total}マス中${done}マス`,
  guideStep: ({ n, text }) => `ステップ${n} ${text}`,
  guideDone: '済み',
  guideNext: '次にやること',
  ctaSet: '決める',
  ctaFill: '埋める',
  ctaPick: '選ぶ',

  sentSep: '',
  sumDate: ({ day }) => `${day}。`,
  sumGoal: ({ goal }) => `中心の目標は「${goal}」。`,
  sumNoGoal: '中心の目標はまだ決めていません。',
  sumDone: ({ n }) => `64マス中${n}マス達成。`,
  sumNone: '今日やることはまだありません。',
  sumAllDone: '今日やることは全部できました。',
  sumLeft: ({ n }) => `今日やることは残り${tsu(n)}です。`,
  todayNone: '今日やることはまだありません',
  todayAll: ({ total }) => `今日やること${tsu(total)}が全部できました`,
  todayOf: ({ total, done }) => `今日やること${tsu(total)}のうち${tsu(done)}できました`,

} satisfies Like<typeof ko>;
