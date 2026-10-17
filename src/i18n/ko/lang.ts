// 'lang' 이름공간 — V4-E가 채운다(docs/v2/plan.md 부록 B). 설정 › 언어.
import { josa } from './josa';
import type { Namespace } from '../types';

export default {
  /** 구역 제목 */
  sectionTitle: '언어',
  /** 기기 언어를 따르는 줄(언어 이름은 names.ts — 저마다 제 글자로) */
  system: '기기 설정 따르기',
  /** 구역 아래 한 줄 — 앱 안에서 바꿀 수 없는 글 */
  footnote: '알림 허락 창과 홈 화면 이름은 iPhone 언어를 따라요',
  /** 바꾼 뒤 화면 읽기 — 새 언어로 읽는다 */
  changed: ({ name }: { name: string }) => `${josa(name, '으로/로')} 바꿨어요`,
} satisfies Namespace;
