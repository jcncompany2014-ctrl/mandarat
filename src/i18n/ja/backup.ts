// 「backup」— バックアップの読み込みシート・比較表・設定の最後のバックアップ行・文章バックアップの前書き（X-K）。
import type ko from '../ko/backup';
import type { Like } from '../types';
import fmt from './fmt';

export default {
  errEmpty: '貼り付けた内容がありません',
  errNotFound: 'バックアップの内容が見つかりませんでした。書き出した文章をすべて貼り付けてください',
  errBroken: 'バックアップの内容が途中で切れているか、壊れています。最初から最後までもう一度コピーしてください',
  errNotOurs: 'マンダラートのバックアップの形式ではありません',
  errNewer: '新しいバージョンのアプリで作ったバックアップです。アプリをアップデートしてから読み込んでください',
  fileFailed: 'ファイルを読み込めませんでした。もう一度選んでください',

  sheetTitle: 'バックアップを読み込む',
  sheetBody: '今の記録がバックアップの内容に置き換わります。置き換えた直後なら元に戻せます。',
  pickFile: 'バックアップファイルを選ぶ',
  pickOther: '別のバックアップファイルを選ぶ',
  pickSub: '保存しておいたバックアップファイル（.json）',
  pasteHelp: 'メモやメッセージに残したバックアップの文章は、長押しして「すべてを選択」→「コピー」のあと、ここに貼り付けます',
  pasteLabel: 'バックアップの文章を貼り付け',
  pastePlaceholder: 'バックアップの文章をすべて貼り付け',
  fromFile: 'ファイルから読み込みました',
  fromFileSay: ({ name }) => `ファイルから読み込みました、${name}`,
  toPaste: '貼り付けにする',
  toPasteLabel: '貼り付けに切り替える',
  toPasteHint: 'ファイルの代わりにバックアップの文章を貼り付けます',
  apply: 'このバックアップに置き換える',
  applied: 'バックアップを読み込みました',
  readOk: '読み込めるバックアップです',
  exportedOn: ({ d }) => `${fmt.dateLong({ d })}に作ったバックアップ`,
  newerNow: '今の記録のほうがバックアップより新しくなっています。置き換えると、最近の記録は消えます',

  colNow: '今',
  colBackup: 'バックアップ',
  none: 'なし',
  rowGoal: '中心の目標',
  rowFilled: '書いたマス',
  rowDone: '達成',
  rowDays: '記録した日',
  rowLast: '最後の記録',
  filledSay: ({ n }) => `64マス中${n}マス`,
  rowSay: ({ label, now, backup }) => `${label}、今 ${now}、バックアップ ${backup}`,

  ageNever: 'まだバックアップしていません',
  ageToday: '最後のバックアップ・今日',
  ageDays: ({ n }) => `最後のバックアップ・${n}日前`,

  textPrefix: ({ d, y }) => `マンダラートのバックアップ・${fmt.year({ y })}${fmt.monthDay({ d })}\n「設定」›「バックアップを読み込む」にこの文章をすべて貼り付けると、読み込めます。\n\n`,
} satisfies Like<typeof ko>;
