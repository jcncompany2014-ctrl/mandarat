// 'widget' namespace — filled by V1-C · V2-C (docs/v2/plan.md Appendix B).
// Templates with '{n}' / '{t}', not functions: the widget fills them outside the app.
import type ko from '../ko/widget';
import type { Like } from '../types';

export default {
  left: '今日はあと{n}件',
  allDone: '今日やることは全部できました',
  empty: '今日やることはありません',
  more: 'ほかに{n}件',
  leftShort: '残り',
  doneShort: 'できた',
  today: '今日',
  next: '次にやること：{t}',
  checked: '{t}　できました',
  galleryName: '今日',
  galleryDesc: '今日やることと残りの数を表示します。',
} satisfies Like<typeof ko>;
