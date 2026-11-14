// 만다라트 표의 규칙 — 칸 자리와 글 맞추기의 단일 출처 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// 색 지도 · 크게 본 블록 · 공유 이미지 · 인쇄가 여기서 자리를 가져간다. 색은 토큰(tokens.ts)과 components/chart가 맡는다.
import { breakUnits, textWidth, type Glyphs } from '../lib/labelFit';
import { lang, msg, type Lang } from '../i18n';
import { DEFAULT_RATIO, MAP_LABEL, MAP_MAX, mapGeometry, mapLabel, mapLabelBox } from '../components/chart/geometry';

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

/** 색 지도(L2) 칸 글의 처음 크기 — 영역 이름 10pt(ROLE.mapHead). 넘치면 9 · 8pt(components/chart/geometry MAP_LABEL) */
export const CHART_HEAD_FS = MAP_LABEL.head.sizes[0];

/**
 * 색 지도(만다라트 탭의 L2)에서 영역 이름(theme)·핵심 목표(center)가 몇 줄로 보이는지 — 지도가 그리는 그대로 잰다.
 * 지도 폭은 화면 폭 − 48(본문 폭, 아이패드는 520까지), 칸은 그 지도의 가장 좁은 칸, 글은 mapLabel이 맞추는 크기(10 → 9 → 8pt).
 * lines: 다 담으려면 필요한 줄 수(가장 작은 크기에서), max: 칸에 드는 줄 수(이름 3줄 · 목표 4줄까지, 칸 높이만큼).
 */
export function chartFit(
  text: string, kind: 'theme' | 'center', winW: number, l: Lang = lang(), ratio: number = DEFAULT_RATIO,
): { lines: number; max: number } {
  const g = mapGeometry({ width: Math.max(0, Math.min(MAP_MAX, winW - 48)), ratio });
  const box = mapLabelBox(g);
  const lab = mapLabel(text, kind === 'center' ? 'core' : 'head', box.w, box.h, l);
  return { lines: lab.need, max: lab.max };
}

/** 고치는 칸 아래 한 줄 — 색 지도에 다 들어가는지(빈 글이면 null) */
export function chartFitHint(text: string, kind: 'theme' | 'center', winW: number, l: Lang = lang()): string | null {
  if (!text.trim()) return null;
  const { lines, max } = chartFit(text, kind, winW, l);
  const c = msg(l).core;
  return lines <= max ? c.fitAll : c.fitLines({ max });
}

