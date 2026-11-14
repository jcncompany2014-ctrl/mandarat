import type ko from '../ko/common';
import type { Like } from '../types';

export default {
  close: '閉じる',
  cancel: 'キャンセル',
  retry: 'もう一度',
  openSettings: '設定を開く',
  undo: '元に戻す',
  back: '前へ',
  proMark: 'プロ',
  iosOnly: 'iPhone・iPadのアプリで使えます',
  swatchWord: 'あ',
} satisfies Like<typeof ko>;
