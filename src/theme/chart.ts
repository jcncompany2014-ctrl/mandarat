// 인쇄된 만다라트 표의 규칙 — 칸 자리·칸 색·괘선 굵기의 단일 출처 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// 81칸 표·홈의 작은 표·영역 보드·통계의 표·공유 이미지가 모두 여기서 자리와 색을 가져간다.
//
// 표 한 장의 약속:
// - 칠한 칸(영역 색 그대로) = 달성. 그 밖에는 칠하지 않는다.
// - 칸 전체에 옅게 깔리고 맨 아래에 가는 진행 막대가 붙은 칸 = 인쇄된 이름표(영역 이름) — 달성으로 읽히지 않게.
//   칸 안에 작은 네모 테두리를 그리지 않는다(빈 체크 칸처럼 보인다).
// - 가운데 칸 = 핵심 목표(먹색, 다크에서는 뒤집어 밝게).
// - 괘선은 바깥 테두리 > 블록 사이 > 칸 사이 순으로 가늘어진다.
import type { CellShape } from '../types';
import { PRETENDARD_GLYPHS, breakUnits, textWidth, type Glyphs } from '../lib/labelFit';
import { lang, type Lang } from '../i18n';
import { alpha, mix, tint, toHex } from './moods';
import { contrast } from './palette';

/** 표 색을 고를 때 필요한 팔레트 조각 — 무드 팔레트(Palette)나 앱 팔레트(M)를 그대로 넘긴다 */
type Ground = { dark: boolean; ink: string; center: string };

// ── 자리 ────────────────────────────────────────────────────────────────────

/**
 * 영역 번호(0~7) → 3×3 안의 자리(0~8). 가운데(4)는 핵심 목표 자리라 비우고, 왼쪽 위부터 읽는 순서로 놓는다.
 *
 *   0 1 2        왼쪽 위 · 위 · 오른쪽 위
 *   3 · 4    →   왼쪽 · (가운데) · 오른쪽
 *   5 6 7        왼쪽 아래 · 아래 · 오른쪽 아래
 */
export const CHART_POS: readonly number[] = [0, 1, 2, 3, 5, 6, 7, 8];

/** 실천 번호(0~7) → 블록 안의 자리(0~8) — 영역과 같은 읽는 순서(블록 가운데는 영역 이름 칸) */
export const CELL_POS: readonly number[] = [0, 1, 2, 3, 5, 6, 7, 8];

/** 가운데 자리 — 3×3에서 핵심 목표(가운데 블록) · 영역 이름(바깥 블록)이 놓이는 곳 */
export const CENTER_SLOT = 4;

/** 자리(0~8) → 영역·실천 번호. 가운데 자리는 null (CHART_POS·CELL_POS를 거꾸로 본 표) */
export const SLOT_INDEX: readonly (number | null)[] = [0, 1, 2, 3, null, 4, 5, 6, 7];

/** 가운데를 한 바퀴 도는 순서(왼쪽 위에서 시계 방향) — 영역·실천 번호로. 차례로 채우거나 보여 줄 때 */
export const CLOCKWISE: readonly number[] = [0, 1, 2, 4, 7, 6, 5, 3];

/** 81칸 표의 칸 하나가 무엇인가 — 핵심 목표 · 영역 이름표 · 실천 */
export type ChartCell =
  | { kind: 'core'; block: number; slot: number }
  | { kind: 'head'; block: number; slot: number; ti: number }
  | { kind: 'action'; block: number; slot: number; ti: number; ai: number };

/**
 * 9×9 표의 (줄, 칸) → 그 칸의 정체. 가운데 블록의 둘레 8칸과 바깥 블록의 가운데 칸이 영역 이름표(head)다.
 * 범위를 벗어난 자리는 null.
 */
export function chartCell(row: number, col: number): ChartCell | null {
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row > 8 || col < 0 || col > 8) return null;
  const block = Math.floor(row / 3) * 3 + Math.floor(col / 3);
  const slot = (row % 3) * 3 + (col % 3);
  if (block === CENTER_SLOT) {
    if (slot === CENTER_SLOT) return { kind: 'core', block, slot };
    return { kind: 'head', block, slot, ti: SLOT_INDEX[slot] as number };
  }
  const ti = SLOT_INDEX[block] as number;
  if (slot === CENTER_SLOT) return { kind: 'head', block, slot, ti };
  return { kind: 'action', block, slot, ti, ai: SLOT_INDEX[slot] as number };
}

/**
 * 표 위 한 점(x, y) → 그 점이 든 블록: 바깥 블록이면 영역 번호(0~7), 가운데 블록이면 'c'.
 * 표 밖이거나 값이 없으면(웹 클릭처럼 위치가 안 오는 경우) null.
 */
export function blockAt(x: number | undefined, y: number | undefined, width: number, height = width): number | 'c' | null {
  if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y) || width <= 0 || height <= 0) return null;
  if (x < 0 || y < 0 || x > width || y > height) return null;
  const col = Math.min(2, Math.floor((x / width) * 3));
  const row = Math.min(2, Math.floor((y / height) * 3));
  const slot = row * 3 + col;
  return slot === CENTER_SLOT ? 'c' : (SLOT_INDEX[slot] as number);
}

/**
 * 가운데에서 바깥으로 도는 소용돌이 순번(작을수록 먼저) — 가운데 칸 0, 그다음 둘레 한 바퀴씩.
 * 한 바퀴 안에서는 그 바퀴의 왼쪽 위 모서리부터 시계 방향. 81칸 모두 서로 다른 값.
 */
export function spiralRank(row: number, col: number): number {
  const dr = row - 4;
  const dc = col - 4;
  const ring = Math.max(Math.abs(dr), Math.abs(dc));
  if (ring === 0) return 0;
  const side = ring * 2;
  let t: number;
  if (dr === -ring) t = dc + ring; // 윗변: 왼쪽 → 오른쪽
  else if (dc === ring) t = side + (dr + ring); // 오른쪽 변: 위 → 아래
  else if (dr === ring) t = side * 2 + (ring - dc); // 아랫변: 오른쪽 → 왼쪽
  else t = side * 3 + (ring - dr); // 왼쪽 변: 아래 → 위
  return ring * 100 + t;
}

// ── 색 ──────────────────────────────────────────────────────────────────────

/** 칠한 칸(달성) 위의 글자·체크 — 영역 색 8가지 모두 흰 글씨가 4.5:1 이상 */
export const DONE_INK = '#FFFFFF';

/** 가운데 칸(핵심 목표) 바탕 — 다크 모드에선 어두운 칸이 바탕에 묻히므로 밝게 뒤집는다 */
export function coreBg(M: Ground): string {
  return M.dark ? M.ink : M.center;
}

/** 가운데 칸 글자 */
export function coreInk(M: Ground): string {
  return M.dark ? M.center : '#FFFFFF';
}

/** 영역 이름표 칸의 옅은 바탕 — 인쇄된 머리 칸. 달성(칠한 칸)과 헷갈리지 않게 아주 옅게 */
export function headBg(color: string, M: Pick<Ground, 'dark'>): string {
  return tint(color, M.dark ? 24 : 16, M.dark);
}

/**
 * 이름표 칸 맨 아래 진행 막대의 바탕(영역 색 25%) — 그 위에 달성 비율만큼 영역 색을 채운다.
 * 영역 보드의 머리 칸과 홈의 작은 표가 같은 막대를 쓴다(작은 표에서는 이 막대가 이름표와 쓴 칸을 가른다).
 */
export function headTrack(color: string): string {
  return alpha(color, 0.25);
}

/** 적어 두었지만 아직 달성하지 않은 칸(작은 표) — 이름표보다 조금 짙고, 달성보다 훨씬 옅게 */
export function writtenBg(color: string, M: Pick<Ground, 'dark'>): string {
  return tint(color, M.dark ? 30 : 22, M.dark);
}

/** 괘선 굵기(pt) — 바깥 테두리 · 블록 사이 · 칸 사이 */
export const RULE = { frame: 2, block: 1.5, cell: 0.75 } as const;

export type RuleKind = keyof typeof RULE;

/** 괘선 색 — 먹색을 굵기 순서대로 옅게(다크의 칸 사이 선은 흰 선) */
export function ruleColor(M: Pick<Ground, 'dark' | 'ink'>, kind: RuleKind): string {
  if (kind === 'frame') return alpha(M.ink, 0.85);
  if (kind === 'block') return alpha(M.ink, 0.55);
  return M.dark ? 'rgba(255,255,255,0.16)' : alpha(M.ink, 0.2);
}

/** 표 바깥 모서리 둥글기 — 칸 모서리 설정(반듯하게면 0) */
export function frameRadius(shape: CellShape | undefined): number {
  return shape === '각진' ? 0 : 3;
}

const markCache = new Map<string, string>();

/**
 * 바탕 위에서 눈에 띄는 표시 색 — 글자가 아닌 표시(점·선·밑줄·테두리)는 3:1 이상이어야 보인다.
 * 이미 넉넉하면 그대로, 모자라면 같은 색조를 지키며 밝은 바탕에서는 먹색 쪽으로, 다크에서는 흰색 쪽으로 필요한 만큼만 옮긴다.
 * (미색·크림 종이 위 금색 표시는 2.7~3.1:1이라 조금 짙어진다)
 */
export function legibleMark(color: string, bg: string, M: Pick<Ground, 'dark' | 'ink'>, min = 3): string {
  const key = `${color}|${bg}|${M.dark ? 1 : 0}|${M.ink}|${min}`;
  const hit = markCache.get(key);
  if (hit) return hit;
  const base = toHex(bg);
  let out = color;
  if (contrast(toHex(color), base) < min) {
    const toward = M.dark ? '#FFFFFF' : M.ink;
    out = toward;
    for (let i = 1; i <= 20; i++) {
      const c = toHex(mix(toHex(color), toward, i / 20));
      if (contrast(c, base) >= min) { out = c; break; }
    }
  }
  markCache.set(key, out);
  return out;
}

// ── 글자 맞추기 ──────────────────────────────────────────────────────────────

/**
 * 폭 width에 글자 크기 fs로 쓰면 몇 줄이 되는지 어림한다 — 한글은 어절 단위로 줄을 바꾸고(iOS hangul-word · 웹 keep-all),
 * 한 줄보다 긴 어절만 글자 단위로 끊긴다. 줄바꿈 문자는 그대로 지킨다. 빈 글은 0줄. g는 글자 폭(기본 SVG 근사치).
 * 일본어·영어는 가나·한자를 한 글자씩(금칙을 지켜) 끊는다 — 단위는 labelFit의 breakUnits(longestWord·fitBox와 같은 규칙).
 */
export function estimateLines(text: string, width: number, fs: number, g?: Glyphs, l: Lang = lang()): number {
  if (!text.trim() || width <= 0) return 0;
  const space = textWidth(' ', fs, g, l);
  let lines = 0;
  for (const para of text.split('\n')) {
    let cur = 0;
    let n = 1;
    for (const { t: word, gap } of breakUnits(para, l)) {
      const w = textWidth(word, fs, g, l);
      if (w > width) {
        // 긴 어절 — 앞 줄을 닫고 글자 단위로 이어 쓴다
        if (cur > 0) n++;
        const full = Math.ceil(w / width);
        n += full - 1;
        cur = w - (full - 1) * width;
        continue;
      }
      const need = cur === 0 ? w : cur + (gap ? space : 0) + w;
      if (need <= width) cur = need;
      else { n++; cur = w; }
    }
    lines += n;
  }
  return lines;
}

/** 81칸 표의 칸 글자 크기 — 영역 이름·핵심 목표(FullGrid의 머리 칸·가운데 칸) */
export const CHART_HEAD_FS = 9.5;

/**
 * 81칸에서 영역 이름(theme)·핵심 목표(center)가 몇 줄로 보이는지 — 화면 폭 winW의 실제 칸으로 어림한다.
 * 표 폭은 winW − 22, 칸 폭은 (표 폭 − 테두리 2개) / 9, 글자 자리는 칸 안쪽 여백 2씩과 칸 사이 선을 뺀 폭.
 * 머리 칸은 3줄, 가운데 칸은 4줄까지 보인다(그 뒤는 말줄임).
 */
export function chartFit(text: string, kind: 'theme' | 'center', winW: number): { lines: number; max: number } {
  const cellW = (winW - 22 - RULE.frame * 2) / 9;
  const max = kind === 'center' ? 4 : 3;
  return { lines: estimateLines(text.trim(), cellW - 4 - RULE.cell, CHART_HEAD_FS, PRETENDARD_GLYPHS), max };
}

/** 고치는 칸 아래 한 줄 — 81칸에 다 들어가는지(빈 글이면 null) */
export function chartFitHint(text: string, kind: 'theme' | 'center', winW: number): string | null {
  if (!text.trim()) return null;
  const { lines, max } = chartFit(text, kind, winW);
  return lines <= max ? '81칸에 다 들어가요' : `81칸에서는 ${max}줄까지만 보여요`;
}

/**
 * 칸 하나에 글을 maxLines줄 안에 담을 수 있는 가장 큰 글자 크기 — sizes는 큰 것부터.
 * 어느 크기로도 넘치면 가장 작은 크기(나머지는 말줄임표가 맡는다).
 */
export function fitFontSize(text: string, width: number, maxLines: number, sizes: readonly number[] = [14, 13, 12, 11, 10]): number {
  for (const fs of sizes) if (estimateLines(text, width, fs) <= maxLines) return fs;
  return sizes[sizes.length - 1];
}
