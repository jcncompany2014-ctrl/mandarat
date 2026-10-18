// 'crash' namespace — V4-F (Settings › About, the error-report row). docs/v2/plan.md Appendix B.
import type ko from '../ko/crash';
import type { Like } from '../types';

export default {
  row: 'エラーの記録を送る',
  rowSub: 'アプリが止まったとき、端末の情報とエラーの内容だけを送ります。書いた内容は送りません',
  qaSent: 'テスト用のエラーを送りました',
  qaNative: 'ネイティブのエラーを試す（アプリが閉じます）',
} satisfies Like<typeof ko>;
