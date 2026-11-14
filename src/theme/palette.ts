// 8영역 · 포인트 · 의미 색과 대비 계산.
// 영역 색은 천연 염료 톤 — 새 문서 · 템플릿에 적는 값은 디자인 A의 밝은 염료(tokens LIGHT.dye, build-plan §2.5).
// 그리기는 웨이브 2–3에서 영역 번호로 옮긴다(M.dye[ti]) — 문서의 theme.color는 데이터로만 남는다.
// RN 의존이 없는 순수 모듈이라 단위 테스트에서 그대로 쓸 수 있다.
import { msg } from '../i18n';
import { LIGHT } from './tokens';

/**
 * 8영역 슬롯 색 (쑥·쪽빛·황토·연지·청자·오디·비색·주홍) = LIGHT.dye — 새 문서 · 템플릿 · 깨진 색의 기본값.
 * 이미 적힌 예전 값(#478058 …)은 옮기지 않는다(migrateAreaColor를 늘리지 않는다 — 동기화가 출렁이지 않게).
 */
export const PILLAR_COLORS: readonly string[] = LIGHT.dye;

export const GOLD = '#B0883C';

/**
 * 포인트 컬러 선택지 — 기본 골드가 항상 첫 번째.
 * 버튼 바탕으로 쓰면 readableOn() 글씨가 AA, 글씨로 쓸 때는 accentInk(M)(moods.ts)를 쓴다.
 */
export const ACCENTS: { readonly color: string; readonly name: string }[] = [
  // 이름은 읽을 때마다 지금 언어로(core.accent*)
  { color: GOLD, get name() { return msg().core.accentGold; } },
  { color: '#B35A72', get name() { return msg().core.accentRouge; } },
  { color: '#478058', get name() { return msg().core.accentMugwort; } },
  { color: '#5068AB', get name() { return msg().core.accentIndigo; } },
  { color: '#7E60A8', get name() { return msg().core.accentMulberry; } },
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

// 이전 원색 팔레트 → 연꽃 팔레트 (저장된 문서 이행용 — 값은 그때의 연꽃 팔레트 그대로)
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
