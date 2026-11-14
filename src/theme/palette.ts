// 문서에 적는 색(영역 색 · 포인트 컬러의 저장값)과 그 이행, 대비 계산.
// 그리기는 영역 번호로 토큰에서(M.dye[ti]) — 문서의 theme.color · settings.accent는 데이터로만 남는다(build-plan §2.4 · 2.5).
// RN 의존이 없는 순수 모듈이라 단위 테스트에서 그대로 쓸 수 있다.
import { LIGHT } from './tokens';

/**
 * 8영역 슬롯 색 (쑥·쪽빛·황토·연지·청자·오디·비색·주홍) = LIGHT.dye — 새 문서 · 템플릿 · 깨진 색의 기본값.
 * 이미 적힌 예전 값(#478058 …)은 옮기지 않는다(migrateAreaColor를 늘리지 않는다 — 동기화가 출렁이지 않게).
 */
export const PILLAR_COLORS: readonly string[] = LIGHT.dye;

/**
 * 저장값 settings.accent의 기본값(예전 기본 포인트 컬러 골드) — 새 문서에 적고 이행의 목적지로 쓴다.
 * 새 앱은 포인트 컬러를 그리지 않는다(build-plan §2.4). 옛 앱 · 다른 기기가 읽으므로 값은 바꾸지 않는다.
 */
export const GOLD = '#B0883C';

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
