// 부품 상자(kit)의 자리 수치 — 순수 모듈(react-native를 들이지 않는다; 테스트가 Node에서 require한다).
// 값은 docs/design/build-plan.md 패키지 K와 목업(docs/design/mockups/a: tokens.css · shared.js · parts-*.js|css).
// 색은 여기 없다 — 부품이 팔레트(M, 토큰 이름)에서 고른다. 머리카락 선은 쓰는 곳에서 StyleSheet.hairlineWidth.
// 글자 모양은 모두 ROLE(theme/type.ts)에 있다.
import { GEO, LIGHT, type Tokens } from '../../theme/tokens';

/** 줄(A.row) — 54 높이, 상자 칸 24 + 사이 14 = 줄 사이 선이 시작하는 38 */
export const ROW = {
  h: GEO.row,
  gap: 14,
  box: 24,
  /** 상자 칸이 있는 줄의 줄 사이 선 시작 x(= box + gap) */
  inset: 24 + 14,
  /** 오른쪽 글(rowRight 13/18)이 제목 줄(16/23) 위에서 내려앉는 거리 — 정보 줄이 있을 때 · 없을 때(목업 7 · 18) */
  rightDrop: 0.5,
  rightDropAlone: 2.5,
  /** 끝낸 줄의 먹선 — 제목 줄 위 12(한글 가운데), 굵기 1 */
  strikeY: 12,
  strike: 1,
} as const;

/** 줄 사이 선의 시작 x — 상자 칸이 있으면 글이 시작하는 38, 없으면 0 */
export function rowInset(hasBox: boolean): number {
  return hasBox ? ROW.inset : 0;
}

/**
 * 끝낸 줄 먹선의 y — 글자 크기를 키우면(더 큰 텍스트) 줄 높이도 같은 비율로 커진다(AppText는 2배까지).
 * scale: useWindowDimensions().fontScale.
 */
export function strikeTop(scale = 1): number {
  const s = Math.min(Math.max(Number.isFinite(scale) ? scale : 1, 0.5), 2);
  return Math.round(ROW.strikeY * s * 2) / 2;
}

/** 먹선의 가로 자리 — 잰 글 폭보다 양쪽으로 1씩 길게(목업 left −1 · right −1) */
export function strikeBox(textWidth: number): { left: number; width: number } {
  return { left: -1, width: Math.max(0, textWidth) + 2 };
}

/** 영역 표시(A.dye) — 8×8, 모서리 2, 오른쪽 6 */
export const DYE = { size: GEO.dye, radius: GEO.rTag, gap: 6 } as const;

/** 구역 머리 줄 — 18 높이, 아래 6. 글자 링크는 위아래 13씩 더 눌린다(44) */
export const SECTION = { h: 18, gap: 6, hit: 13, chevron: 16 } as const;

/** 분절 선택기 — 받침(track) 40, 안쪽 3, 모서리 12, 칸 사이 2, 칸 모서리 9 · 낱칸(tiles) 44, 사이 6, 모서리 12 */
export const SEG = {
  h: 40, pad: 3, radius: GEO.rField, gap: 2, cellRadius: GEO.rSegCell,
  tileH: 44, tileGap: 6, tileRadius: GEO.rField,
  minScale: 0.85,
} as const;

/** 받침 폭 w에 칸 n개 — 칸 하나의 폭과 i번째 칸의 x(받침 안쪽 기준) */
export function segmentCells(w: number, n: number): { cell: number; x: (i: number) => number } {
  const k = Math.max(1, n);
  const cell = Math.max(0, (w - SEG.pad * 2 - SEG.gap * (k - 1)) / k);
  return { cell, x: (i: number) => SEG.pad + i * (cell + SEG.gap) };
}

/** 입력 칸 — tile, 모서리 12. 큰 칸 56 · 한 줄 칸 54 · 메모 84(안쪽 14/16). 글자 수는 오른쪽 16에서 */
export const FIELD = {
  h: 56, hSmall: 54, hMemo: 84, padX: 16, padMemoY: 14, radius: GEO.rField,
  /** 글자 수가 들어갈 오른쪽 자리(목업 padding-right 64) */
  countRoom: 64,
  /** 칸 안 작은 단추 — 36 높이, 모서리 18, 칸 오른쪽 안쪽 8 */
  button: { h: 36, radius: 18, padX: 16, inset: 8 },
} as const;

/** 고르기 줄 — 펜 획 18, 오른쪽 2 */
export const CHOICE = { tick: 18, tickInset: 2 } as const;

/** 시각 칩(ToggleRow) — tile, 모서리 10, 안쪽 6/10 */
export const CHIP = { padY: 6, padX: 10, radius: GEO.rChip } as const;

/** 요일 칸(S.days) — 칸 58 높이, 위 2, 글자와 상자 사이 6, 상자 24, 오늘 점 5. 묶음은 양옆으로 6씩 넓다 */
export const DAYS = { h: 58, top: 2, gap: 6, box: 24, dot: 5, bleed: 6 } as const;

/** 영역 고르기 — 4 × 2, 사이 6, 낱칸 44 높이 모서리 12 */
export const AREA = { cols: 4, gap: 6, h: 44, radius: GEO.rField, padX: 4, minScale: 0.7 } as const;

/** 거르기 줄 — 44 높이, 낱말 사이 18(범위 24), 고른 낱말 밑줄 1(아래에서 9 위), 수는 왼쪽 4 */
export const FILTER = { h: 44, gap: 18, gapScope: 24, underline: 1, underlineBottom: 9, countGap: 4 } as const;

/**
 * 보기 견본(S.swatch) — 틀(안쪽 3, 모서리 15, 고르면 먹 고리 1.5) · 우물(tile, 안쪽 8 8 0, 모서리 12)
 * · 쪽(높이 46, 위 모서리 7; 글자 9/5, 줄 3 높이 사이 5, 짧은 줄 55%) · 이름 위 8.
 */
export const SWATCH = {
  framePad: 3, frameRadius: 15, ring: 1.5,
  wellPad: 8, wellRadius: 12,
  pageH: 46, pageRadius: 7, wordX: 9, wordY: 5, lineTop: 27, lineH: 3, lineGap: 5, short: 0.55,
  labelGap: 8, gap: 12,
  /** 무늬 견본의 한 칸 — 화면의 24를 견본 크기로 줄인 것 */
  module: 8,
} as const;

/** 견본 쪽 하나의 세 가지 색 — 바탕 · 글자 · 줄 */
export interface PageInk {
  page: string;
  word: string;
  line: string;
}

/**
 * 화면 모드 견본의 쪽 — 어느 모드에서 보든 같은 그림(밝게 = 흰 종이, 어둡게 = 먹 종이, 자동 = 두 쪽 반씩).
 * 목업처럼 밝은 토큰에서 먹을 바꿔 그린다: 밝게 paper · ink · printMid, 어둡게 ink · paper · ink2.
 */
export function lookPages(look: 'auto' | 'light' | 'dark', t: Pick<Tokens, 'paper' | 'ink' | 'ink2' | 'printMid'> = LIGHT): PageInk[] {
  const day: PageInk = { page: t.paper, word: t.ink, line: t.printMid };
  const night: PageInk = { page: t.ink, word: t.paper, line: t.ink2 };
  if (look === 'auto') return [day, night];
  return [look === 'dark' ? night : day];
}

/** 쌓기 막대 — 4 높이, 모서리 2 */
export const COUNT_BAR = { h: 4 } as const;

/** 44pt 누르는 자리를 만드는 위아래(또는 사방) 여유 */
export function hitFor(size: number): number {
  return Math.max(0, (44 - size) / 2);
}
