// 'sync' namespace — Settings › iCloud, the choice sheet and the onboarding offer (V5-E).
import type ko from '../ko/sync';
import type { Like } from '../types';

export default {
  sectionTitle: 'iCloud',
  toggle: 'iCloudで端末どうしを同期',
  toggleSub: '同じAppleアカウントのiPhone・iPadどうしで記録を同期します',
  justNow: 'たった今同期しました',
  syncedAt: ({ day, time }) => `${day} ${time}に同期しました`,
  syncing: '同期しています',
  needsChoice: '同期のしかたを選んでください',
  noAccount: 'iCloudにサインインしていません',
  driveOff: 'iCloud Driveがオフになっています',
  settingsBody: '端末の「設定」でiCloudをオンにすると、また同期します',
  accountChanged: '別のiCloudアカウントです。もう一度オンにすると、このアカウントの記録と同期します',
  newerApp: 'ほかの端末のアプリのほうが新しいバージョンです。この端末もアップデートすると、また同期します',
  tooLarge: '記録が多いため、同期に時間がかかることがあります',
  ioError: '今回は同期できませんでした。少したってから、また同期します',
  now: '今すぐ同期',
  webNote: 'iPhone・iPadのアプリでだけ使えます。ほかの端末に移すときは、バックアップファイルを使います。',

  choiceTitle: 'iCloudにほかの端末の記録があります',
  choiceBody: 'この端末とiCloudの記録をどう同期するか選んでください',
  here: 'この端末',
  cloud: 'iCloud',
  merge: '両方を合わせる',
  mergeSub: '同じマスを2つの端末で別々に編集した場合は、あとで編集したほうが残ります',
  adopt: 'iCloudの記録に切り替える',
  adoptSub: 'この端末の表と記録はiCloudのものに替わります。「保管庫」の過去の表は合わせます',
  mine: 'この端末の記録で続ける',
  mineSub: 'その間にほかの端末で書いた記録は、この端末のものに替わります',
  copyNote: '選ぶ前の状態は「設定」›「保存コピー」に今日の日付で残ります',
  confirm: 'この方法で同期',
  confirmHint: '先にひとつ選んでください',

  onbOffer: 'iCloudに記録があります',
  onbImport: '取り込む',
  onbSub: 'ほかのiPhone・iPadで使っていた表を、この端末に取り込みます',
  onbBusy: '取り込んでいます',
  onbFailed: '取り込めませんでした',
} satisfies Like<typeof ko>;
