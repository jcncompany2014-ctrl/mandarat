/**
 * 간격(SP)·라운드(R) 스케일 토큰 — 화면 전반의 리듬을 한 곳에서 관리한다.
 * 새 UI는 이 토큰을 우선 사용하고, 기존 화면도 점진적으로 옮겨간다.
 */
export const SP = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const R = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;
