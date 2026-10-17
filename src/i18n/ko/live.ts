// 'live' 이름공간 — 집중 타이머 Live Activity와 25분 알림(V2-B, docs/v2/plan.md 부록 B).
// Live Activity 문구는 함수가 아니라 글자 그대로다 — 잠금 화면(앱 밖)이 props에 담긴 글을 그대로 그린다.
import type { Namespace } from '../types';

export default {
  /** 남은 시간 숫자 옆의 이름 */
  left: '남은 시간',
  paused: '잠시 멈췄어요',
  done: '25분 집중을 마쳤어요',
  /** 도는 중 — 실천 글이 없으면 이 글을 대신 쓴다 */
  focus: '집중하는 중',
  /** 잠금 화면에서 25분이 끝났을 때 알림 제목(본문은 실천 글) */
  doneTitle: '25분이 지났어요',
} satisfies Namespace;
