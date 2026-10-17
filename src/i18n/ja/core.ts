// 「core」— 複数の画面で使う基本の言葉（タブバー・シート・エラー画面・表の読み上げ・曜日のマス・表示名）。
import type ko from '../ko/core';
import type { Like } from '../types';
import fmt from './fmt';

export default {
  tabHome: 'ホーム',
  tabGrid: 'マンダラート',
  tabToday: '今日',
  tabStats: '統計',
  tabAdd: '入れる',
  tabAddHint: '今日やることを書いて入れます',
  todayAllDone: '今日やることがすべてできました',
  areaAllDone: ({ name, n }) => `${name ? `「${name}」` : `分野${n}`}の8マスをすべて達成しました`,
  undoable: ({ message }) => `${message}。元に戻せます`,
  undoStale: 'その間に変更があったため、元に戻せません',

  back: '戻る',
  sheetHandle: 'シートを閉じる',
  sheetHandleHint: '下にスワイプしても閉じます',
  labelCount: ({ label, n }) => `${label}、${n}件`,

  crashTitle: '画面を開けませんでした',
  crashBody: '保存した記録はそのまま残っています。\nもう一度お試しください。同じ画面がまた出る場合は、先に記録を書き出しておいてください。',
  crashExport: '記録を書き出す',
  crashExportEmpty: '保存した記録はまだありません',
  crashExportFailed: '記録を書き出せませんでした。もう一度押してください',

  repeatDow: ({ i }) => `${fmt.dowLong({ i })}に繰り返す`,
  repeatLabel: ({ label }) => `繰り返し：${label}`,
  noRepeat: '繰り返さない',

  ordinal: ({ n }) => `${n}番目`,
  listSep: '、',
  cellEmpty: '空き',
  cellDidToday: '今日できました',
  cellOnToday: '今日やること',
  cellAchieved: '達成',
  areaUnwritten: ({ name }) => `${name}、まだ行動が書かれていません`,
  areaSummary: ({ name, done, n }) => `${name}、8マス中${done}マス達成${n > 0 ? `、今日${n}マス` : ''}`,

  dayDoneToday: '今日できた',
  dayDone: 'できた',
  dayToday: '今日',
  dayMissed: 'できなかった',
  dayPlanned: '予定',
  dayRestToday: '今日は休み',
  dayRest: '休み',
  stripDay: ({ i, word }) => `${fmt.dowLong({ i })} ${word}`,
  dayState: ({ i, word }) => `${fmt.dowLong({ i })} ${word}`,
  dayClear: ({ i }) => `${fmt.dowLong({ i })}の記録を消す`,
  dayMark: ({ i }) => `${fmt.dowLong({ i })}を「できた」にする`,

  mgmtList: 'リスト',
  mgmtStreak: '連続記録',
  mgmtBoard: 'ボード',
  shapeRound: '丸く',
  shapeSquare: '四角く',
  paperIvory: 'アイボリー',
  paperCream: 'クリーム',
  paperGray: 'グレー',
  paperLavender: '藤色',
  paperDark: 'ダーク',
  mood0: 'つらい',
  mood1: 'いまいち',
  mood2: 'ふつう',
  mood3: 'よい',
  mood4: '最高',

  accentGold: 'ゴールド',
  accentRouge: '臙脂',
  accentMugwort: 'よもぎ',
  accentIndigo: '藍',
  accentMulberry: '桑の実',

  fitAll: '81マスにすべて収まります',
  fitLines: ({ max }) => `81マスでは${max}行まで表示されます`,
} satisfies Like<typeof ko>;
