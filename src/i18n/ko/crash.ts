// 'crash' 이름공간 — V4-F(설정 › 정보의 오류 기록 줄). docs/v2/plan.md 부록 B.
import type { Namespace } from '../types';

export default {
  /** 설정 › 정보 — 체크 줄 이름 */
  row: '오류 기록 보내기',
  /** 그 아래 설명 — 무엇을 보내고 무엇을 보내지 않는지 */
  rowSub: '앱이 멈추면 기기 정보와 오류 내용만 보내요. 적은 글은 보내지 않아요',
  /** 미리보기 빌드에서만: 줄을 길게 눌러 시험 오류를 보냈을 때 */
  qaSent: '시험 오류를 보냈어요',
  /** 미리보기 빌드에서만: 네이티브에서 앱을 멈추는 시험 링크(누르면 앱이 닫힌다) */
  qaNative: '네이티브 오류 시험 — 앱이 닫혀요',
} satisfies Namespace;
