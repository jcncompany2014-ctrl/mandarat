// 색 지도 · 크게 본 블록 · 분 칸 · 위치 표시 · 마크의 자리와 글 맞추기 — RN 의존 없는 순수 모듈(단위 테스트 대상).
// docs/design/build-plan.md §3 G, 목업 docs/design/mockups/a/shared.js(A.chart map · A.block · A.mark),
// parts-sheets.js(S.locator), parts-focus-dayclose.js(A.minutes), icon-mark.js(AI.app).
//
// 자리는 기기 픽셀(ratio = PixelRatio.get())로 셈한 뒤 pt로 나눈다 — 칸 사이 틈이 늘 온 픽셀에 떨어져 또렷하고,
// 칸은 틈을 빼고 남은 픽셀을 나눠 가진다. 나머지 픽셀은 가운데 칸부터(4, 그다음 3 · 5 …) 하나씩 —
// 그래서 바깥 크기가 @2x · @3x 모두 요청한 폭과 꼭 같다.
import { breakUnits, PRETENDARD_GLYPHS, textWidth } from '../../lib/labelFit';
import { lang, type Lang } from '../../i18n';

/** 기본 기기 배율 — 순수 셈(편집 창의 '표에 다 들어가요' 안내 · 테스트)에서 기기를 모를 때. 칸이 가장 좁게 나오는 쪽 */
export const DEFAULT_RATIO = 3;

export type Rect = { x: number; y: number; w: number; h: number };

/** n칸 한 줄 — 칸 크기와 시작 자리(pt), 바깥 크기, 모서리 */
export interface Track {
  /** 바깥 크기(pt) — 요청한 크기와 같다 */
  size: number;
  /** 칸 크기(pt) n개 */
  cells: number[];
  /** 칸이 시작하는 자리(pt) n개 */
  pos: number[];
  /** 칸 모서리(pt) */
  radius: number;
  ratio: number;
}

/**
 * 기기 픽셀 한 줄 나누기 — totalPx에서 틈(gapsPx, n−1개)을 빼고 남은 픽셀을 n칸이 나눈다.
 * 나머지는 가운데 칸부터 바깥으로 번갈아(목업 shared.js grid()의 fitPt와 같은 차례: 9칸이면 4 · 3 · 5 · 2 · 6 …).
 */
export function fitTrackPx(n: number, totalPx: number, gapsPx: readonly number[]): { cells: number[]; pos: number[] } {
  const gapSum = gapsPx.slice(0, n - 1).reduce((s, g) => s + g, 0);
  const room = Math.max(0, totalPx - gapSum);
  const c = Math.floor(room / n);
  const cells = new Array<number>(n).fill(c);
  const mid = Math.floor(n / 2);
  for (let k = 0, spare = room - c * n; k < spare; k++) cells[mid + (k % 2 ? -1 : 1) * Math.ceil(k / 2)] += 1;
  const pos: number[] = [];
  let x = 0;
  for (let i = 0; i < n; i++) {
    pos.push(x);
    x += cells[i] + (i < n - 1 ? gapsPx[i] : 0);
  }
  return { cells, pos };
}

/** pt → 기기 픽셀(틈 · 선: 적어도 1픽셀) */
const pxOf = (pt: number, ratio: number) => Math.max(1, Math.round(pt * ratio));

/** 같은 틈 n칸 한 줄(블록 · 분 칸 · 위치 표시) — size pt 안에 gap pt 틈 */
export function track(n: number, size: number, gap: number, radius: number, ratio: number = DEFAULT_RATIO): Track {
  const g = pxOf(gap, ratio);
  const { cells, pos } = fitTrackPx(n, Math.round(size * ratio), new Array(n - 1).fill(g));
  return { size: Math.round(size * ratio) / ratio, cells: cells.map((c) => c / ratio), pos: pos.map((p) => p / ratio), radius, ratio };
}

const memo = new Map<string, unknown>();
function cached<T>(key: string, make: () => T): T {
  const hit = memo.get(key);
  if (hit) return hit as T;
  if (memo.size > 200) memo.clear();
  const v = make();
  memo.set(key, v);
  return v;
}

// ── 색 지도(9×9) ─────────────────────────────────────────────────────────────

/** L2 = 만다라트 탭의 큰 지도(이름 · 목표 글), L1 = 홈 · 통계 · 한 해의 작은 지도(글 없음) */
export type MapLevel = 'L2' | 'L1';

/** L2 지도의 기준 폭 — 목업의 390pt 화면 본문 폭(342). 틈 · 모서리는 폭 / 342에 비례한다 */
export const MAP_BASE = 342;
/** L2 지도의 틈 · 모서리(342pt에서) — 블록 사이 11.5 · 칸 사이 3.7 · 모서리 6.5 */
export const MAP_L2 = { blockGap: 11.5, cellGap: 3.7, radius: 6.5 } as const;
/** 아이패드 · 넓은 창에서 지도의 가장 큰 폭(§4.4) */
export const MAP_MAX = 520;

/** L1 지도의 바깥 폭 — 칸 c(pt)의 '예전 표' 크기: 9c + (c ≥ 11이면 6, 아니면 4) */
export const l1Width = (c: number): number => 9 * c + (c >= 11 ? 6 : 4);
/** l1Width를 거꾸로 — 바깥 폭 W의 칸 c */
export function l1Cell(width: number): number {
  const c = (width - 6) / 9;
  return c >= 11 ? c : (width - 4) / 9;
}

export interface MapGeometry extends Track {
  level: MapLevel;
  /** 블록 사이 · 칸 사이 틈(pt, 기기 픽셀에 맞춘 값) */
  blockGap: number;
  cellGap: number;
  /** L1의 이름 칸 크기 c(L2는 실제 칸 크기의 평균) */
  nominal: number;
  /** 아홉 블록의 누르는 자리(줄 우선, 가운데 4) — 블록 사이 틈의 반씩을 더해 지도를 빈틈없이 덮는다 */
  blocks: Rect[];
}

/**
 * 색 지도의 자리.
 * - L2(width, 기본 342): s = width / 342, 블록 사이 round(11.5s) · 칸 사이 round(3.7s)(기기 픽셀) · 모서리 6.5s.
 * - L1(cell c, 또는 width): 바깥 = 9c + (c ≥ 11 ? 6 : 4), 블록 사이 c ≥ 14 ? 4 : 2, 칸 사이 c ≥ 11 ? 1.5 : 0.75,
 *   모서리 max(1.5, 0.14c). 칸은 그 바깥 안에 맞춘다(목업 A.chart L1: cell은 예전 표의 칸 크기라는 뜻을 지킨다).
 */
export function mapGeometry(o: { level?: MapLevel; width?: number; cell?: number; ratio?: number } = {}): MapGeometry {
  const level = o.level ?? 'L2';
  const ratio = o.ratio ?? DEFAULT_RATIO;
  let width: number;
  let nominal: number;
  if (level === 'L1') {
    nominal = o.cell ?? (o.width != null ? l1Cell(o.width) : 20);
    width = o.cell != null ? l1Width(o.cell) : o.width ?? l1Width(nominal);
  } else {
    width = o.width ?? MAP_BASE;
    nominal = 0;
  }
  return cached(`map|${level}|${width}|${o.cell ?? ''}|${ratio}`, () => {
    let bg: number;
    let cg: number;
    let radius: number;
    if (level === 'L1') {
      bg = pxOf(nominal >= 14 ? 4 : 2, ratio);
      cg = pxOf(nominal >= 11 ? 1.5 : 0.75, ratio);
      radius = Math.max(1.5, 0.14 * nominal);
    } else {
      const s = width / MAP_BASE;
      bg = pxOf(MAP_L2.blockGap * s, ratio);
      cg = pxOf(MAP_L2.cellGap * s, ratio);
      radius = MAP_L2.radius * s;
    }
    const gaps = [cg, cg, bg, cg, cg, bg, cg, cg];
    const { cells, pos } = fitTrackPx(9, Math.round(width * ratio), gaps);
    const size = Math.round(width * ratio) / ratio;
    const cellsPt = cells.map((c) => c / ratio);
    const posPt = pos.map((p) => p / ratio);
    const half = bg / ratio / 2;
    const span = (b: number) => {
      const a = posPt[b * 3];
      const z = posPt[b * 3 + 2] + cellsPt[b * 3 + 2];
      const from = b === 0 ? 0 : a - half;
      const to = b === 2 ? size : z + half;
      return [from, to - from];
    };
    const blocks: Rect[] = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const [x, w] = span(c);
        const [y, h] = span(r);
        blocks.push({ x, y, w, h });
      }
    }
    return {
      level, size, cells: cellsPt, pos: posPt, radius, ratio, blocks,
      blockGap: bg / ratio, cellGap: cg / ratio,
      nominal: level === 'L1' ? nominal : cellsPt.reduce((s, c) => s + c, 0) / 9,
    };
  });
}

// ── 크게 본 블록 · 분 칸 · 위치 표시 ─────────────────────────────────────────────

/** 크게 본 블록(3×3) — 틈 6 · 모서리 10. 폭은 본문 폭(아이패드는 min(본문, 480)) */
export const BLOCK = { gap: 6, radius: 10, pad: 10, tick: 13, tickStroke: 1.75, tickInset: 10, dot: 3.5, dotAt: 14, extraBottom: 9, focus: 2 } as const;
export const blockGeometry = (width: number, ratio: number = DEFAULT_RATIO): Track =>
  cached(`block|${width}|${ratio}`, () => track(3, width, BLOCK.gap, BLOCK.radius, ratio));

/** 25분 칸(5×5) — 틈 5.5 · 모서리 8, 칸 = (W − 22) / 5. 지금 분의 점 r 3 · (12, 12) */
export const MINUTES = { n: 5, gap: 5.5, radius: 8, dot: 3, dotAt: 12 } as const;
export const minuteGeometry = (width: number, ratio: number = DEFAULT_RATIO): Track =>
  cached(`min|${width}|${ratio}`, () => track(MINUTES.n, width, MINUTES.gap, MINUTES.radius, ratio));

/** 위치 표시(시트 머리): 블록 하나를 36pt 3×3으로 — 틈 2 · 모서리 2.5, 이 칸은 1.5 먹 테두리 */
export const LOCATOR = { size: 36, gap: 2, radius: 2.5, ring: 1.5 } as const;
export const locatorGeometry = (size: number = LOCATOR.size, ratio: number = DEFAULT_RATIO): Track =>
  cached(`loc|${size}|${ratio}`, () => track(3, size, LOCATOR.gap, LOCATOR.radius, ratio));

/** 넘기기 줄의 표 위치(22pt): 블록 아홉을 3×3 — 칸 6 · 틈 2 · 모서리 1.5 */
export const PAGER_MARK = { size: 22, gap: 2, radius: 1.5 } as const;
export const pagerGeometry = (size: number = PAGER_MARK.size, ratio: number = DEFAULT_RATIO): Track =>
  cached(`pager|${size}|${ratio}`, () => track(3, size, PAGER_MARK.gap, PAGER_MARK.radius, ratio));

// ── 마크(L0) ─────────────────────────────────────────────────────────────────

/** 마음(heart, 16~40pt): 가운데 핵심 목표 둘레에 영역 색 여덟 — 틈 max(1, 0.06 × 크기), 모서리 0.22 × 칸 */
export const MARK_HEART = { gap: 0.06, gapMin: 1, radius: 0.22 } as const;
/**
 * 앱 아이콘(app, 목업 icon-mark.js AI.app): 종이 바탕 위 가운데에 마음 — 여백 0.2 × 크기(40pt 이하 0.17),
 * 틈 max(1, 0.025 × 크기), 모서리 0.22 × 칸. N2(아이콘 · 스플래시 PNG)가 이 수를 그대로 쓴다.
 */
export const MARK_APP = { pad: 0.2, padSmall: 0.17, smallMax: 40, gap: 0.025, gapMin: 1, radius: 0.22 } as const;

export type MarkVariant = 'heart' | 'app';

/** 마크의 칸 하나 — ti는 영역 번호(dye[ti]), -1은 핵심 목표(core) */
export interface MarkTile { x: number; y: number; w: number; h: number; radius: number; ti: number }

/**
 * 마크의 아홉 칸(pt). ratio를 주면 기기 픽셀에 맞추고(앱 화면), 없으면 비율 그대로(아이콘 PNG를 그릴 때).
 * ground: 종이 바탕을 칠하는가(app).
 */
export function markTiles(variant: MarkVariant, size: number, ratio?: number): { size: number; ground: boolean; tiles: MarkTile[] } {
  return cached(`mark|${variant}|${size}|${ratio ?? ''}`, () => {
    const app = variant === 'app';
    const pad = app ? size * (size <= MARK_APP.smallMax ? MARK_APP.padSmall : MARK_APP.pad) : 0;
    const gap = app ? Math.max(MARK_APP.gapMin, size * MARK_APP.gap) : Math.max(MARK_HEART.gapMin, size * MARK_HEART.gap);
    const r = app ? MARK_APP.radius : MARK_HEART.radius;
    let cells: number[];
    let pos: number[];
    let off: number;
    if (ratio) {
      const padPx = Math.round(pad * ratio);
      const inner = Math.round(size * ratio) - 2 * padPx;
      const g = pxOf(gap, ratio);
      const t = fitTrackPx(3, inner, [g, g]);
      cells = t.cells.map((c) => c / ratio);
      pos = t.pos.map((p) => p / ratio);
      off = padPx / ratio;
    } else {
      const t = (size - 2 * pad - 2 * gap) / 3;
      cells = [t, t, t];
      pos = [0, t + gap, 2 * (t + gap)];
      off = pad;
    }
    const nominal = (size - 2 * pad - 2 * gap) / 3;
    const tiles: MarkTile[] = [];
    for (let i = 0; i < 9; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      tiles.push({
        x: off + pos[col], y: off + pos[row], w: cells[col], h: cells[row], radius: nominal * r,
        ti: i === 4 ? -1 : i < 4 ? i : i - 1,
      });
    }
    return { size: ratio ? Math.round(size * ratio) / ratio : size, ground: app, tiles };
  });
}

// ── 이번 주 막대 ───────────────────────────────────────────────────────────────

/**
 * 이번 주 막대(목업 A.weekStrip): 그림 자리 64, 막대 폭 16 · 모서리 6, 높이 max(6, round(n / max × 44)),
 * max = max(5, 그 주의 수). 수는 막대 위(틈 5), 요일은 그림 아래(틈 8), 아직 오지 않은 날은 4pt 점.
 * stack(통계): 그림 자리 84, 칸 28 × 18 · 모서리 6 · 틈 3, 맨 아래가 가장 많이 한 영역.
 */
export const WEEK_BARS = {
  plot: 64, bar: 16, radius: 6, top: 44, min: 6, floor: 5, gapN: 5, gapDay: 8, later: 4, nH: 14,
  stack: { plot: 84, w: 28, h: 18, radius: 6, gap: 3 },
} as const;

export const weekMax = (counts: readonly (number | null | undefined)[]): number =>
  Math.max(WEEK_BARS.floor, ...counts.map((n) => n ?? 0));

export const barHeight = (n: number, max: number): number =>
  Math.max(WEEK_BARS.min, Math.round((n / Math.max(1, max)) * WEEK_BARS.top));

/** 쌓인 칸 n개가 그림 자리(수 · 틈을 뺀 높이)에 들어가는 칸 높이와 틈 — 넘치면 칸을 낮추고 틈을 줄인다 */
export function stackFit(n: number): { h: number; gap: number } {
  const S = WEEK_BARS.stack;
  const room = S.plot - WEEK_BARS.nH - WEEK_BARS.gapN;
  if (n <= 0) return { h: S.h, gap: S.gap };
  if (n * S.h + (n - 1) * S.gap <= room) return { h: S.h, gap: S.gap };
  const gap = n > 8 ? 1 : 2;
  return { h: Math.max(1, (room - (n - 1) * gap) / n), gap };
}

// ── 색 지도의 글(영역 이름 · 핵심 목표) ─────────────────────────────────────────

/**
 * 지도 칸의 글 — 영역 이름(head: 10 · 9 · 8pt, 3줄까지) · 핵심 목표(core: 11 · 10 · 9 · 8pt, 4줄까지).
 * 줄 높이 round(1.2 × 크기)(10/12 · 11/13), 칸 높이에 들어가는 줄 수까지만. 좌우 여백 1.5.
 * 자간은 크기에 비례(이름 −0.04em, 목표 −0.02em — ROLE.mapHead · mapCore).
 */
export const MAP_LABEL = {
  head: { sizes: [10, 9, 8], maxLines: 3, tracking: -0.04 },
  core: { sizes: [11, 10, 9, 8], maxLines: 4, tracking: -0.02 },
  pad: 1.5,
  lineRatio: 1.2,
} as const;

export type MapLabelKind = keyof Pick<typeof MAP_LABEL, 'head' | 'core'>;

export interface MapLabel {
  /** 줄을 나눈 글(줄마다 '\n') — 그대로 그리면 기기마다 같은 자리에서 끊긴다 */
  text: string;
  fs: number;
  lh: number;
  letterSpacing: number;
  /** 그리는 줄 수 */
  lines: number;
  /** 다 담으려면 가장 작은 크기에서 몇 줄이 필요한가(담기면 lines와 같다) */
  need: number;
  /** 칸에 들어가는 가장 많은 줄 수(가장 작은 크기에서) */
  max: number;
  /** 다 담지 못해 말줄임표로 줄였다 */
  cut: boolean;
}

const NBSP = '\u00a0';
const HANGUL = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;
const JA_SCRIPT = /[\u3000-\u30ff\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/;
const LATIN_WORD = /^[A-Za-z\u00c0-\u024f]+$/;
const VOWEL = /[aeiouyAEIOUY\u00c0-\u00c6\u00c8-\u00cf\u00d2-\u00d6\u00d9-\u00dc\u00e0-\u00e6\u00e8-\u00ef\u00f2-\u00f6\u00f9-\u00fc]/;
const DIGRAPH = new Set(['ch', 'sh', 'th', 'ph', 'wh', 'ck', 'ng', 'qu', 'gh']);

/** 줄 단위 — gap: 앞 단위와 띄어 쓴다 · hard: 이 단위 뒤에서 반드시 줄을 바꾼다 · parts: 묶은 어절(넘치면 다시 푼다) */
type Unit = { t: string; gap: boolean; hard?: boolean; parts?: Unit[] };

/** 줄바꿈을 정할 언어 — 일본어 · 영어 앱에서도 가나 · 한자 없이 한글이 든 글은 한국어처럼(AppText breakLang과 같다) */
const breakLangOf = (l: Lang, text: string): Lang => (l !== 'ko' && !JA_SCRIPT.test(text) && HANGUL.test(text) ? 'ko' : l);

function labelUnits(text: string, bl: Lang): Unit[] {
  if (bl !== 'ko') return breakUnits(text, bl).map((u) => ({ t: u.t, gap: u.gap }));
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    // 네 음절 이상 한 낱말(자기계발 · 마음챙김)은 둘로 나눠 두 줄(목업 headText) — 칸 양쪽에 숨 쉴 자리가 남는다
    const ch = Array.from(words[0]);
    if (ch.length >= 4 && HANGUL.test(words[0]) && !/\d/.test(words[0])) {
      const h = Math.ceil(ch.length / 2);
      return [{ t: ch.slice(0, h).join(''), gap: false, hard: true }, { t: ch.slice(h).join(''), gap: false }];
    }
    return [{ t: words[0], gap: false }];
  }
  // 한 음절 낱말은 옆 낱말에 붙인다(목업 A.keep: '새 친구' · '주 3회' · '한 해')
  const out: Unit[] = [];
  words.forEach((w, i) => {
    const prevShort = i > 0 && Array.from(words[i - 1]).length === 1;
    const lastShort = i > 0 && i === words.length - 1 && Array.from(w).length === 1;
    if (prevShort || lastShort) {
      const prev = out[out.length - 1];
      const parts = prev.parts ?? [{ t: prev.t, gap: prev.gap }];
      out[out.length - 1] = { t: `${prev.t}${NBSP}${w}`, gap: prev.gap, parts: [...parts, { t: w, gap: true }] };
    } else {
      out.push({ t: w, gap: i > 0 });
    }
  });
  return out;
}

type Measure = (s: string) => number;

/** 영문 낱말의 끊는 자리가 자연스러운가 — 모음|자음+모음(Rela|tion) · 자음|자음(tion|ships, 두 글자 소리는 빼고) */
function goodBreak(ch: string[], i: number): boolean {
  const a = ch[i - 1];
  const b = ch[i];
  const v = (c: string | undefined) => !!c && VOWEL.test(c);
  if (v(a) && !v(b) && v(ch[i + 1])) return true;
  return !v(a) && !v(b) && !DIGRAPH.has(`${a}${b}`.toLowerCase());
}

/**
 * 칸 폭보다 긴 낱말을 k조각(k ≤ maxPieces)으로 — 조각은 고르게, 영문은 붙임표(-)를 달고 자연스러운 자리를 먼저.
 * 가나 · 한자 · 한글은 붙임표 없이 글자 사이에서.
 */
function splitWord(t: string, w: number, measure: Measure, maxPieces: number, goodOnly: boolean): string[] | null {
  const ch = Array.from(t);
  const latin = LATIN_WORD.test(t);
  const minPiece = latin ? 2 : 1;
  for (let k = 2; k <= Math.min(maxPieces, ch.length); k++) {
    let best: { pieces: string[]; score: number } | null = null;
    const pick = (cuts: number[]) => {
      const edges = [0, ...cuts, ch.length];
      const pieces: string[] = [];
      let bad = 0;
      let widest = 0;
      for (let j = 0; j < k; j++) {
        if (edges[j + 1] - edges[j] < minPiece) return;
        const p = ch.slice(edges[j], edges[j + 1]).join('') + (latin && j < k - 1 ? '-' : '');
        const pw = measure(p);
        if (pw > w) return;
        widest = Math.max(widest, pw);
        pieces.push(p);
        if (latin && j < k - 1 && !goodBreak(ch, edges[j + 1])) bad++;
      }
      if (goodOnly && bad > 0) return;
      const score = bad * 1000 + widest;
      if (!best || score < best.score) best = { pieces, score };
    };
    // 고른 자리 i·len/k 둘레 ±2만 본다(조합이 늘 작다)
    const near = (j: number) => {
      const c = Math.round((j * ch.length) / k);
      return [c - 2, c - 1, c, c + 1, c + 2];
    };
    const walk = (j: number, cuts: number[]) => {
      if (j === k) return pick(cuts);
      for (const c of near(j)) {
        if (c <= (cuts[cuts.length - 1] ?? 0) || c >= ch.length) continue;
        walk(j + 1, [...cuts, c]);
      }
    };
    walk(1, []);
    if (best) return (best as { pieces: string[] }).pieces;
  }
  return null;
}

/** 넘치는 단위를 풀거나 나눈다 — 묶은 어절은 다시 풀고, 그래도 긴 낱말은 조각으로. 못 하면 null */
function expandUnits(units: readonly Unit[], w: number, measure: Measure, maxLines: number, goodOnly: boolean): Unit[] | null {
  const out: Unit[] = [];
  for (const u of units) {
    if (measure(u.t) <= w) { out.push(u); continue; }
    if (u.parts) {
      const parts = u.parts.map((p, i) => ({ ...p, gap: i === 0 ? u.gap : p.gap, hard: i === u.parts!.length - 1 ? u.hard : undefined }));
      const sub = expandUnits(parts, w, measure, maxLines, goodOnly);
      if (!sub) return null;
      out.push(...sub);
      continue;
    }
    const pieces = splitWord(u.t, w, measure, maxLines, goodOnly);
    if (!pieces) return null;
    pieces.forEach((p, i) => out.push({ t: p, gap: i === 0 ? u.gap : false, hard: i < pieces.length - 1 ? true : u.hard }));
  }
  return out;
}

const joinUnits = (us: readonly Unit[]) => us.map((u, i) => (i > 0 && u.gap ? ` ${u.t}` : u.t)).join('');

/**
 * 단위를 maxLines줄 이하로, 줄마다 폭 w 안에, 가장 넓은 줄이 가장 좁도록(목업의 text-wrap: balance) 나눈다.
 * 가장 적은 줄 수를 고른다. 못 하면 null.
 */
function balance(units: readonly Unit[], w: number, measure: Measure, maxLines: number): string[] | null {
  const m = units.length;
  if (m === 0) return [];
  // lineW[i][j]: 단위 i..j−1을 한 줄에 — 줄 가운데 hard 단위가 있으면 안 된다
  const lineW = (i: number, j: number) => {
    for (let k = i; k < j - 1; k++) if (units[k].hard) return Infinity;
    const s = joinUnits(units.slice(i, j).map((u, k) => (k === 0 ? { ...u, gap: false } : u)));
    const x = measure(s);
    return x <= w ? x : Infinity;
  };
  const W: number[][] = [];
  for (let i = 0; i < m; i++) {
    W[i] = [];
    for (let j = i + 1; j <= m; j++) W[i][j] = lineW(i, j);
  }
  // best[n][j]: 앞 j단위를 n줄에 — 가장 넓은 줄의 폭(작을수록 좋다), from: 마지막 줄의 시작
  for (let n = 1; n <= maxLines; n++) {
    const best: number[][] = [];
    const from: number[][] = [];
    for (let k = 0; k <= n; k++) { best[k] = new Array(m + 1).fill(Infinity); from[k] = new Array(m + 1).fill(-1); }
    best[0][0] = 0;
    for (let k = 1; k <= n; k++) {
      for (let j = 1; j <= m; j++) {
        for (let i = k - 1; i < j; i++) {
          if (best[k - 1][i] === Infinity) continue;
          const x = Math.max(best[k - 1][i], W[i][j]);
          if (x < best[k][j]) { best[k][j] = x; from[k][j] = i; }
        }
      }
    }
    if (best[n][m] === Infinity) continue;
    const lines: string[] = [];
    let j = m;
    for (let k = n; k >= 1; k--) {
      const i = from[k][j];
      lines.unshift(joinUnits(units.slice(i, j).map((u, q) => (q === 0 ? { ...u, gap: false } : u))));
      j = i;
    }
    return lines;
  }
  return null;
}

/** 넘칠 때 — 글자 단위로라도 줄을 채운 줄들(줄 수 제한 없음) */
function greedyLines(units: readonly Unit[], w: number, measure: Measure): string[] {
  const lines: string[] = [];
  let cur = '';
  const flush = () => { if (cur) lines.push(cur); cur = ''; };
  for (const u of units) {
    const words = u.parts ?? [u];
    for (const [i, p] of words.entries()) {
      const sep = cur && (i === 0 ? u.gap : p.gap) ? ' ' : '';
      if (measure(cur + sep + p.t) <= w) { cur += sep + p.t; continue; }
      flush();
      if (measure(p.t) <= w) { cur = p.t; continue; }
      for (const c of Array.from(p.t)) {
        if (measure(cur + c) > w && cur) flush();
        cur += c;
      }
    }
    if (u.hard) flush();
  }
  flush();
  return lines;
}

const labelMemo = new Map<string, MapLabel>();

/**
 * 지도 칸(width × height pt) 하나의 글을 맞춘다 — 큰 크기부터, 낱말을 끊지 않고 → 긴 낱말만 자연스러운 자리에서 조각내서 →
 * 아무 자리에서나 조각내서 → 그래도 넘치면 가장 작은 크기로 칸에 드는 줄까지 쓰고 말줄임표.
 * 화면 읽기 이름에는 늘 전체 이름을 쓴다(부르는 쪽).
 */
export function mapLabel(text: string, kind: MapLabelKind, width: number, height: number, l: Lang = lang()): MapLabel {
  const t = text.trim().replace(/\s+/g, ' ');
  const key = `${kind}|${l}|${width.toFixed(2)}|${height.toFixed(2)}|${t}`;
  const hit = labelMemo.get(key);
  if (hit) return hit;
  const spec = MAP_LABEL[kind];
  const w = width - 2 * MAP_LABEL.pad;
  const lhOf = (fs: number) => Math.round(fs * MAP_LABEL.lineRatio);
  const smallest = spec.sizes[spec.sizes.length - 1];
  const allowedAt = (fs: number) => Math.min(spec.maxLines, Math.floor(height / lhOf(fs)));
  const max = Math.max(1, allowedAt(smallest));
  const made = (fs: number, lines: string[], need: number, cut: boolean): MapLabel => ({
    text: lines.join('\n'), fs, lh: lhOf(fs), letterSpacing: Math.round(spec.tracking * fs * 100) / 100,
    lines: lines.length, need, max, cut,
  });
  let out: MapLabel | null = null;
  if (!t) out = made(spec.sizes[0], [], 0, false);
  const bl = breakLangOf(l, t);
  const units = t ? labelUnits(t, bl) : [];
  for (const split of ['none', 'good', 'any'] as const) {
    if (out) break;
    for (const fs of spec.sizes) {
      const allowed = allowedAt(fs);
      if (allowed < 1) continue;
      const measure: Measure = (s) => textWidth(s.replace(/\u00a0/g, ' '), fs, PRETENDARD_GLYPHS, l);
      const us = split !== 'none'
        ? expandUnits(units, w, measure, allowed, split === 'good')
        : units.some((u) => measure(u.t) > w) ? null : units;
      if (!us) continue;
      const lines = balance(us, w, measure, allowed);
      if (lines) { out = made(fs, lines, lines.length, false); break; }
    }
  }
  if (!out) {
    // 다 담지 못한다 — 가장 작은 크기로 칸에 드는 줄까지, 마지막 줄은 말줄임표
    const measure: Measure = (s) => textWidth(s.replace(/\u00a0/g, ' '), smallest, PRETENDARD_GLYPHS, l);
    const all = greedyLines(units, w, measure);
    const lines = all.slice(0, max);
    let last = `${lines[lines.length - 1] ?? ''}${all.length > max ? ` ${all.slice(max).join(' ')}` : ''}`;
    const chars = Array.from(last);
    while (chars.length > 1 && measure(`${chars.join('').trimEnd()}…`) > w) chars.pop();
    last = `${chars.join('').trimEnd()}…`;
    lines[lines.length - 1] = last;
    out = made(smallest, lines, all.length, true);
  }
  if (labelMemo.size > 500) labelMemo.clear();
  labelMemo.set(key, out);
  return out;
}

/**
 * 이름표를 k배로 — 줄은 칸을 k로 줄인 상자에서 나누고(mapLabel) 글자만 키운다. 화면의 지도와 같은 자리에서 끊긴다.
 * 표 이미지가 피드에서 읽히게 이름을 키울 때(ColourMap textScale, lib/poster POSTER_LABEL). k = 1이면 mapLabel 그대로.
 */
export function scaleMapLabel(text: string, kind: MapLabelKind, width: number, height: number, k: number, l: Lang = lang()): MapLabel {
  if (k === 1) return mapLabel(text, kind, width, height, l);
  const lab = mapLabel(text, kind, width / k, height / k, l);
  return { ...lab, fs: lab.fs * k, lh: Math.round(lab.lh * k), letterSpacing: Math.round(lab.letterSpacing * k * 100) / 100 };
}

/**
 * 한 음절 낱말을 옆 낱말에 붙인다(목업 A.keep) — '주 3회 운동' → '주\u00a03회 운동', '단단한 한 해' → '단단한 한\u00a0해'.
 * 어떤 음절도 줄에 홀로 남지 않게. 한국어 글(한글이 들고 가나 · 한자가 없는 글)에만 — 그 밖의 글은 그대로.
 */
export function keepWords(text: string): string {
  if (!HANGUL.test(text) || JA_SCRIPT.test(text)) return text;
  const w = text.split(' ');
  if (w.length < 2) return text;
  let out = w[0];
  for (let i = 1; i < w.length; i++) {
    const prevShort = Array.from(w[i - 1]).length === 1;
    const lastShort = i === w.length - 1 && Array.from(w[i]).length === 1;
    out += (prevShort || lastShort ? NBSP : ' ') + w[i];
  }
  return out;
}

/** 펜으로 쓴 체크(목업 shared.js TICK) — 1 × 1 상자 안의 길. 크게 본 블록은 13pt · 1.75 선 */
export const TICK_PATH = 'M.04 .52 C.16 .62 .28 .78 .36 .93 C.5 .6 .72 .28 1 .04';

/** 지도 한 칸의 글 상자 — 가장 좁은 칸(가운데 아닌 칸)의 폭과 높이(pt). 편집 창의 안내가 지도와 같은 칸으로 잰다 */
export function mapLabelBox(g: MapGeometry): { w: number; h: number } {
  const c = Math.min(...g.cells);
  return { w: c, h: c };
}
