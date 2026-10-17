import type ko from '../ko/common';
import type { Like } from '../types';

export default {
  close: '閉じる',
  cancel: 'キャンセル',
  retry: 'もう一度',
  openSettings: '設定を開く',
  on: 'オン',
  off: 'オフ',
  later: 'あとで',
  undo: '元に戻す',
  proMark: 'プロ',
  iosOnly: 'iPhone・iPadのアプリで使えます',
} satisfies Like<typeof ko>;
