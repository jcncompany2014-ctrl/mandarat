// 'pro' namespace — filled by V1-E · V3-C (docs/v2/plan.md Appendix B).
import type ko from '../ko/pro';
import type { Like } from '../types';

export default {
  noteBought: 'プロを開きました。ありがとうございます。',
  noteRestored: '購入を復元しました。プロが開いています。',
  noteRestoredNone: 'このAppleアカウントで購入したプロはありません。',
  notePending: '承認を待っています。承認されるとプロが開きます。',
  noteUnverified: '購入を確認できませんでした。しばらくしてから「購入を復元」を押してください。',
  noteNetwork: 'インターネットに接続されていません。接続してからもう一度お試しください。',
  noteNotAllowed: 'この端末では支払いが制限されています。スクリーンタイムの設定を確認してください。',
  noteUnavailable: '今はプロを購入できません。あとでもう一度お試しください。',
  noteUnknown: '支払いを終えられませんでした。もう一度お試しください。',
} satisfies Like<typeof ko>;
