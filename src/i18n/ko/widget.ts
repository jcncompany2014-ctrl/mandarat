// 'widget' 이름공간 — V1-C · V2-C가 채운다(docs/v2/plan.md 부록 B).
// 위젯 문구는 함수가 아니라 '{n}' · '{t}' 틀이다 — 위젯(앱 밖)이 버튼을 누를 때 남은 수를 다시 세어 채운다.
import type { Namespace } from '../types';

export default {
  /** 남은 수 '{n}' */
  left: '오늘 {n}개 남았어요',
  allDone: '오늘 할 일을 다 했어요',
  empty: '오늘 담은 일이 없어요',
  /** 목록에 다 못 보인 수 '{n}' */
  more: '그 밖에 {n}개',
  leftShort: '남음',
  doneShort: '끝',
  today: '오늘',
  /** 다음 할 일 '{t}' */
  next: '다음 할 일: {t}',
  /** 한 일 '{t}' — 체크한 줄의 읽어 주기 */
  checked: '{t} — 했어요',
  /** 위젯 고르기 화면의 이름 — app.json expo-widgets displayName과 같아야 한다(위젯 확장 Localizable.strings의 열쇠) */
  galleryName: '오늘',
  /** 위젯 고르기 화면의 설명 — app.json expo-widgets description과 같아야 한다 */
  galleryDesc: '오늘 할 일과 남은 수를 보여 줘요.',
} satisfies Namespace;
