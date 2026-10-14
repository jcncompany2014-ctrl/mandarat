// 연꽃 팔레트 — 8영역·포인트·의미 색의 단일 출처.
// 영역 색은 천연 염료 톤으로, 흰 글씨 대비 WCAG AA(≥4.5)와 다크 카드 대비(≥3.1)를 모두 만족한다.
// RN 의존이 없는 순수 모듈이라 단위 테스트에서 그대로 쓸 수 있다.

/** 8영역 슬롯 색 (쑥·쪽빛·황토·연지·청자·오디·비색·주홍) */
export const PILLAR_COLORS = [
  '#478058', '#5068AB', '#9C6A2A', '#B35A72', '#2F7D79', '#7E60A8', '#3A77A5', '#AE5A35',
] as const;

export const GOLD = '#B0883C';

/**
 * 포인트 컬러 선택지 — 기본 골드가 항상 첫 번째.
 * 버튼 바탕으로 쓰면 readableOn() 글씨가 AA, 글씨로 쓸 때는 accentInk(M)(moods.ts)를 쓴다.
 */
export const ACCENTS: { color: string; name: string }[] = [
  { color: GOLD, name: '골드' },
  { color: '#B35A72', name: '연지' },
  { color: '#478058', name: '쑥' },
  { color: '#5068AB', name: '쪽빛' },
  { color: '#7E60A8', name: '오디' },
];

/** 상태 의미 색 */
export const SEMANTIC = {
  done: '#478058',
  /** 달성 초록을 글씨로 쓸 때(밝은 무드 바탕·면 위 5.1~5.6:1). 다크에서는 areaInk(SEMANTIC.done, M) */
  doneInk: '#3D6E4B',
  danger: '#B35A72',
} as const;

/** 기분 5단계(힘듦→최고) 색 */
export const MOOD_COLORS = ['#B35A72', '#AE5A35', '#9C6A2A', '#478058', '#3A77A5'] as const;

// 이전 원색 팔레트 → 연꽃 팔레트 (저장된 문서 이행용)
const LEGACY_AREA: Record<string, string> = {
  '#2fa968': '#478058', '#4f6bed': '#5068AB', '#e8a33d': '#9C6A2A', '#e5547f': '#B35A72',
  '#159e9e': '#2F7D79', '#8b5cf6': '#7E60A8', '#4da3e0': '#3A77A5', '#f4793b': '#AE5A35',
};
const LEGACY_ACCENT: Record<string, string> = {
  '#f4793b': GOLD, '#4f6bed': '#5068AB', '#2fa968': '#478058', '#8b5cf6': '#7E60A8',
};

/** 이전 기본 영역 색이면 연꽃 팔레트로 바꾸고, 사용자가 고른 다른 색은 그대로 둔다. */
export function migrateAreaColor(color: string): string {
  return LEGACY_AREA[color.toLowerCase()] ?? color;
}

/** 이전 포인트 컬러(주황·파랑·초록·보라)를 연꽃 팔레트의 대응 색으로 옮긴다. */
export function migrateAccent(color: string): string {
  return LEGACY_ACCENT[color.toLowerCase()] ?? color;
}

/** 진한 먹색 — 밝은 바탕(골드 등) 위 글씨 */
export const INK = '#2B2620';

function luminance(hex: string): number {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = ch.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 대비율 (1~21) */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** 이 바탕색 위에서 읽기 쉬운 글씨색 — 흰 글씨가 AA(4.5)에 못 미치면 먹색. (골드 버튼은 먹색) */
export function readableOn(bg: string): string {
  return contrast('#FFFFFF', bg) >= 4.5 ? '#FFFFFF' : INK;
}
