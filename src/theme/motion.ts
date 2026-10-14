// 모션 토큰 — 앱의 모든 움직임이 같은 호흡을 갖도록 시간·곡선·스프링을 한 곳에서 정한다.
// 원칙: 들어올 땐 빠르게 다가와 부드럽게 멈추고(out), 나갈 땐 망설임 없이(in), 손끝 반응은 탄력 있게(spring).
import { Easing } from 'react-native';

export const DUR = {
  /** 손끝 반응·작은 상태 변화 */
  quick: 140,
  /** 기본 전환 */
  base: 220,
  /** 카드·시트 등장 */
  gentle: 320,
  /** 링·막대가 차오르는 시간 */
  slow: 560,
  /** 숫자가 올라가는 시간 */
  count: 760,
} as const;

export const EASE = {
  /** 등장 — 빠르게 다가와 사뿐히 멈춤 */
  out: Easing.bezier(0.22, 1, 0.36, 1),
  /** 이동 — 양 끝이 부드러운 */
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  /** 퇴장 — 미련 없이 */
  in: Easing.bezier(0.55, 0, 1, 0.45),
  /** 호흡(명상 타이머) — 사인파처럼 */
  breath: Easing.inOut(Easing.sin),
};

export const SPRING = {
  /** 누름 반응 */
  press: { damping: 22, stiffness: 420, mass: 0.8 },
  /** 탭 표시·전환 */
  snappy: { damping: 18, stiffness: 260, mass: 1 },
  /** 시트·카드 */
  gentle: { damping: 20, stiffness: 170, mass: 1 },
  /** 체크·축하처럼 기쁜 순간 */
  bouncy: { damping: 11, stiffness: 220, mass: 1 },
} as const;

/** 차례로 등장할 때 항목 사이 간격(ms) */
export const STAGGER = 45;
