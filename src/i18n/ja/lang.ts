// 'lang' namespace — filled by V4-E (docs/v2/plan.md Appendix B). Settings › Language.
import type ko from '../ko/lang';
import type { Like } from '../types';

export default {
  sectionTitle: '言語',
  system: '端末の設定に合わせる',
  footnote: '通知の許可画面とホーム画面の名前は、端末の言語で表示されます。',
  changed: ({ name }) => `${name}に切り替えました。`,
} satisfies Like<typeof ko>;
