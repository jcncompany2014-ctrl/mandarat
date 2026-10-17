// 'settings' namespace — Settings rows, paper and accent choosers, template confirm, backup rows, saved copies, colophon and alerts (X-G).
import type ko from '../ko/settings';
import type { Like } from '../types';
import fmt from './fmt';

/** 「このiPhone」・「このiPad」 */
const thisDevice = (device: string) => (device === 'iPad' ? 'このiPad' : 'このiPhone');

export default {
  screenTitle: '設定',

  secGoal: '中心の目標',
  goalEmpty: '中心の目標を決めてください',
  goalLabel: ({ goal }) => `中心の目標、${goal}`,
  goalHint: '編集',

  secView: '表示',
  subPaper: '紙',
  paperLabel: ({ name }) => `紙、${name}`,
  swatchGlyph: 'あ',
  subAccent: 'アクセントカラー',
  accentLabel: ({ name }) => `アクセントカラー、${name}`,
  subShape: 'マスの角',
  shapeLabel: ({ name }) => `マスの角、${name}`,

  secRecords: '記録',
  subBackup: 'バックアップ',
  exportTitle: 'バックアップを書き出す',
  exportHint: ({ age }) => `${age}。記録をファイルに書き出します`,
  exportSaved: 'バックアップファイルを保存しました',
  exportWebFail: 'このブラウザでは保存できません',
  exportDone: 'バックアップを書き出しました',
  importTitle: 'バックアップを読み込む',
  importSub: '書き出したバックアップから記録を戻します',

  snapTitle: '保存コピー',
  snapSub: '直近7日間、1日1回自動で残します',
  snapBody: '直近7日間、1日1回自動で残します。選ぶと、その日の記録に戻します。',
  snapLoading: '保存コピーを探しています',
  snapEmpty: 'まだ保存コピーはありません。その日に初めて記録したときに1つ残します。',
  snapRow: ({ date }) => `${date}の保存コピー`,
  snapRowSub: ({ n, days }) => `記入したマス${n}・記録${days}日`,
  snapHint: 'この保存コピーに戻す',
  snapAskTitle: 'この保存コピーに戻しますか？',
  snapAskBody: '今の記録がこの保存コピーの内容に置き換わります。置き換えた直後なら元に戻せます。',
  snapAskOk: '戻す',
  snapReadFail: '保存コピーを読み込めませんでした',
  snapRestored: ({ date }) => `${date}の保存コピーに戻しました`,

  storageNoteLocal: '記録はこの端末に保存されます。端末を替える前に、バックアップを書き出しておいてください。',
  storagePlaceLocal: 'この端末',
  storageNoteBackup: ({ device }) =>
    `記録は${thisDevice(device)}とiCloudバックアップに保存されます。iCloudバックアップをオフにしている場合は、機種変更の前にバックアップを書き出しておいてください。`,
  storagePlaceBackup: ({ device }) => `${thisDevice(device)}とiCloudバックアップ`,
  storageNoteSync: ({ device }) =>
    `記録は${thisDevice(device)}とiCloudに保存され、同じAppleアカウントのiPhone・iPadどうしで同期します。AndroidやWebに移すときは、バックアップを書き出してください。`,
  storagePlaceSync: ({ device }) => `${thisDevice(device)}とiCloud`,

  subRestart: '新しく始める',
  templateRow: 'テンプレートで書き直す',
  templateRowSub: ({ n }) => `${n}種類のテンプレートから選びます`,
  templateAskTitle: 'テンプレートに切り替えますか？',
  templateAskBody: ({ n, name }) =>
    `今書いてある行動${fmt.items({ n })}と今日やることが消え、8つの分野が「${name}」の分野に変わります。中心の目標とこれまでの記録はそのままです。切り替えた直後なら元に戻せます。`,
  templateAskOk: '切り替える',
  templateDone: ({ name }) => `「${name}」のテンプレートに切り替えました`,
  sampleRow: '例を入れる',
  sampleRowSub: '8つの分野・64マスの行動の例を入れます',
  sampleAskTitle: '例を入れますか？',
  sampleAskBody: '今書いてある分野と行動が例に置き換わります。置き換えた直後なら元に戻せます。',
  sampleAskOk: '入れる',
  sampleDone: '例を入れました',
  resetRow: 'すべてリセット',
  resetRowSub: 'すべての目標と記録を消します',
  resetAskTitle: 'すべての記録を消しますか？',
  resetAskBody: '中心の目標、行動64マス、できた記録がすべて消えます。消した直後なら元に戻せます。',
  resetAskOk: '消す',
  resetDone: 'すべての記録を消しました',

  secInfo: '情報',
  colName: '名前',
  appName: 'マンダラート',
  colVersion: '版',
  colFont: '書体',
  colPlace: '保存先',
  privacy: 'プライバシーポリシー',
  contact: 'お問い合わせ',
  contactHint: 'メールアプリが開きます',
  licenses: 'オープンソースライセンス',
  licensesBody: 'このアプリは次のオープンソースを使っています。',
  licLucide: 'Lucideのアイコン図形',
  mailSubject: ({ version }) => `マンダラートお問い合わせ ${version}`,
  openFail: '開けませんでした',
} satisfies Like<typeof ko>;
