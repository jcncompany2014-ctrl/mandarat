// 'focus' 이름공간 — 25분 집중 타이머 화면과 끝내기 버튼 글(X-C, docs/v2/plan.md 부록 B).
// 잠금 화면(Live Activity)의 글은 'live' 이름공간(V2-B)이 따로 갖는다 — 같은 상태는 같은 말로 맞춘다.
import type { Namespace } from '../types';

export default {
  /** 끝내기 버튼 — 도는 중 */
  endAchieve: '끝내고 달성',
  endCheck: '끝내고 했어요',
  endHere: '여기서 끝내기',
  /** 끝내기 버튼 — 25분을 다 채운 뒤 */
  markAchieved: '달성으로 표시',
  doneToday: '오늘 했어요',
  /** 시계 위 이름표 — 도는 중 · 멈춤 · 다 채움 */
  left: '남은 시간',
  cueDone: '끝났어요',
  cuePaused: '잠시 멈췄어요',
  /** 멈춤·계속을 바꿀 때 읽어 주는 말(VoiceOver) */
  resumed: '다시 집중해요',
  /** 25분을 다 채운 순간에 읽어 주는 말 */
  finished: '25분 집중을 마쳤어요',
  pause: '멈추기',
  resume: '계속',
  /** 25분을 다 채운 뒤 큰 숫자 자리 */
  fullClock: '25분',
  fullClockA11y: '25분',
  timerLeft: ({ mins, secs }: { mins: number; secs: number }) => `남은 시간 ${mins}분 ${secs}초`,
  timerLeftPaused: ({ mins, secs }: { mins: number; secs: number }) => `멈춤, 남은 시간 ${mins}분 ${secs}초`,
  /** 실천 글이 비었을 때 */
  textFallback: '집중',
  /** 머리 위 줄 — '커리어 · 25분 집중' */
  eyebrow: ({ area }: { area: string }) => `${area} · 25분 집중`,
  /** 시계 오른쪽 — 끝나는 시각(도는 동안만) */
  endsAt: '끝나는 시각',
  endsAtA11y: ({ time }: { time: string }) => `끝나는 시각 ${time}`,
  /** 시계 아래 안내 — 벽시계로 가니 화면을 꺼도 흐른다 */
  footnote: '25분 동안 한 가지에만. 화면을 꺼 두어도 시간은 흘러가요.',
  /** 엄지 자리 아래 — 기록은 남기고 나간다 */
  stop: '그만하기',
  /** 25칸 표 — '25분 중 7분' */
  tallyA11y: ({ n }: { n: number }) => `25분 중 ${n}분`,
} satisfies Namespace;
