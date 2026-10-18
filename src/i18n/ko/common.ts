// 여러 화면이 함께 쓰는 짧은 말. Wave 0 뒤로 고정이다.
import type { Namespace } from '../types';

export default {
  close: '닫기',
  cancel: '취소',
  retry: '다시 시도',
  openSettings: '설정 열기',
  on: '켬',
  off: '끔',
  later: '나중에',
  undo: '되돌리기',
  /** 여러 쪽으로 된 흐름에서 한 쪽 앞으로(한 해 닫기) */
  back: '이전',
  proMark: '프로',
  iosOnly: 'iPhone·iPad 앱에서 쓸 수 있어요',
} satisfies Namespace;
