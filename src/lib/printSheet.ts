// 인쇄용 PDF의 HTML — 만다라트 한 장을 종이에 찍을 HTML로 바꾼다(RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// 칸의 내용은 poster.ts(posterCells), 칸 자리는 theme/chart.ts, 색은 늘 밝은 토큰(theme/tokens LIGHT). 글은 msg().print · msg().fmt.
// 찍기는 print(.web/.native).ts, 글꼴 CSS는 printFonts(.web/.native).ts가 맡는다.
//
// 종이 위의 약속(build-plan §2.7, 목업 chart-text.png): 손으로 쓰는 종이라 81칸의 글을 모두 찍는다. 부드러운 칸(틈 · 둥근 모서리, 괘선 없음):
// 영역 이름 = 그 영역의 물감(dye) + 흰 글씨 · 가운데 = core + 흰 글씨 · 달성 = wash · 적은 칸 = tint · 빈 칸 = 흰 종이에 printMid 0.5pt 테두리
// (빈 칸을 회색으로 칠하지 않는다). 실천 글은 늘 먹(ink) — 흑백으로 찍어도 옅은 칸 위의 먹 글씨, 물감 위의 흰 글씨라 읽힌다.
// 8칸을 다 달성한 블록은 1.5pt 먹 테두리를 블록 안쪽에. 강조색(금색) 없음. 글꼴 Pretendard.
// 모든 크기는 CSS pt(1/72인치) — @page 크기와 같은 단위라 어느 종이에서도 한 쪽에 맞는다.
import type { MandaratDoc } from '../types';
import type { PrintOptions, PrintPaper } from './contracts';
import { msg, type Lang } from '../i18n';
import { CHART_POS } from '../theme/chart';
import { LIGHT } from '../theme/tokens';
import { markTiles } from '../components/chart/geometry';
import { posterCells, posterDone, posterFinished, type PosterCell } from './poster';
import { kindOf, ymd } from './routine';

/** 종이 크기(pt) — B5는 JIS B5(182×257mm) */
export const PAGE_PT: Readonly<Record<PrintPaper, { w: number; h: number }>> = {
  A4: { w: 595.28, h: 841.89 },
  Letter: { w: 612, h: 792 },
  A3: { w: 841.89, h: 1190.55 },
  A5: { w: 419.53, h: 595.28 },
  B5: { w: 515.91, h: 728.5 },
};

/** 인쇄 글꼴 — Pretendard(한글·영문·숫자)를 먼저, 일본어 한자·가나는 기기 글꼴로 */
export const PRINT_FONT = "'PretendardPrint', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans CJK JP', sans-serif";

/** 글꼴 CSS — printFonts(.web/.native).ts가 같은 이름 printFonts로 내보낸다 */
export interface PrintFonts {
  /** 인쇄 HTML의 <style>에 넣을 @font-face — family 'PretendardPrint'(500 · 700). 없으면 '' */
  fontCss(): Promise<string>;
}

/** printNow의 결과 — 웹은 인쇄 창을 닫았는지 알 수 없어 늘 'printed' */
export type PrintNowResult = 'printed' | 'cancelled' | 'failed';
/** exportPdf의 결과 */
export type ExportPdfResult = 'shared' | 'cancelled' | 'failed';

/** 찍기 — print(.web/.native).ts가 같은 이름 printer로 내보낸다. size는 printHtml이 돌려준 종이 크기(pt) */
export interface Printer {
  printNow(html: string, size: { w: number; h: number }): Promise<PrintNowResult>;
  exportPdf(html: string, size: { w: number; h: number }, name: string): Promise<ExportPdfResult>;
}

/** @font-face 두 개(보통 · 굵게) — src는 url(…) 안에 들어갈 주소(웹은 파일 주소, 기기는 data:) */
export function fontFaceCss(medium: string, bold: string): string {
  const face = (src: string, weight: number) =>
    `@font-face{font-family:'PretendardPrint';src:url("${src}") format('opentype');font-weight:${weight};font-style:normal}`;
  // 600 이하는 Medium, 그보다 굵으면 Bold로 찍힌다(브라우저가 가장 가까운 굵기를 고른다)
  return `${face(medium, 500)}\n${face(bold, 700)}`;
}

/** 종이의 색 — 늘 밝은 토큰(화면이 어둡게여도 종이는 흰 종이) */
const T = LIGHT;

/** 기준 종이(A4)의 글자 자리 — 다른 종이는 이 판을 같은 비율로 줄이거나 늘린다 */
const BASE = { w: 515, h: 760 } as const;

/**
 * 81칸 표의 칸 — 목업 chart-text.png(폭 374)의 블록 사이 6.5 · 칸 사이 2 · 모서리 4.1을 표 폭에 비례해.
 * 3×3 판(표지 · 영역 쪽)은 크게 본 블록(342 폭에 틈 6 · 모서리 10)을 판 폭에 비례해.
 */
export const SHEET_TILES = { base: 374, blockGap: 6.5, cellGap: 2, radius: 4.1 } as const;
export const BOARD_TILES = { base: 342, gap: 6, radius: 10 } as const;

/** 81칸 표의 자리(pt) — 칸 한 변 · 칸 사이 · 블록 사이 · 모서리. 칸 아홉과 틈의 합이 표 폭 그대로 */
export function sheetTiles(side: number): { side: number; cell: number; gap: number; blockGap: number; radius: number } {
  const s = side / SHEET_TILES.base;
  const gap = SHEET_TILES.cellGap * s;
  const blockGap = SHEET_TILES.blockGap * s;
  return { side, cell: (side - 2 * blockGap - 6 * gap) / 9, gap, blockGap, radius: SHEET_TILES.radius * s };
}

/** 3×3 판의 자리(pt) */
export function boardTiles(side: number): { side: number; cell: number; gap: number; radius: number } {
  const s = side / BOARD_TILES.base;
  const gap = BOARD_TILES.gap * s;
  return { side, cell: (side - 2 * gap) / 3, gap, radius: BOARD_TILES.radius * s };
}

/** 칸의 칠과 글자 색 — 흑백으로 찍어도 읽히는 짝만: 옅은 칸 위 먹, 물감 · core 위 흰 글씨. edge: 흰 종이 칸의 테두리 */
export function tileColors(kind: PosterCell['kind'], ti: number, done: boolean): { bg: string; ink: string; edge: boolean } {
  if (kind === 'core') return { bg: T.core, ink: T.onCore, edge: false };
  if (kind === 'head') return { bg: T.dye[ti] ?? T.ink, ink: T.onDye, edge: false };
  if (kind === 'action') return { bg: (done ? T.wash : T.tint)[ti] ?? T.tile, ink: T.ink, edge: false };
  return { bg: T.paper, ink: T.ink, edge: true };
}

/** HTML에 넣는 사용자 글 — 태그·따옴표를 모두 글자로 바꾼다 */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/** 여러 줄 글 — 줄바꿈은 <br>로 */
function escLines(s: string): string {
  return esc(s).replace(/\r?\n/g, '<br>');
}

/** 'mandarat-chart-YYYY-MM-DD.pdf' — 영문·숫자만(backupFileName과 같은 까닭: 파일 이름이 깨지지 않게) */
export function printFileName(now = new Date()): string {
  return `mandarat-chart-${ymd(now)}.pdf`;
}

/** 소수 둘째 자리까지의 pt */
const pt = (n: number) => `${Math.round(n * 100) / 100}pt`;

type Opts = PrintOptions & { now: Date; lang: Lang; fontCss: string };
type Doc = Pick<MandaratDoc, 'centerGoal' | 'themes'>;
type M = ReturnType<typeof msg>;

/** 쪽 하나의 틀 — 종이 크기 그대로, 여백 안에 기준 판(BASE)을 k배로 */
interface Frame { w: number; h: number; pad: number; k: number }

function frameOf(paper: PrintPaper): Frame {
  const { w, h } = PAGE_PT[paper] ?? PAGE_PT.A4;
  const pad = Math.round(w * 0.067);
  const k = Math.min((w - pad * 2) / BASE.w, (h - pad * 2) / BASE.h);
  return { w, h, pad, k };
}

/** 쪽마다 판의 폭(pt) — 81칸 표 · 표지 3×3 · 영역 쪽 3×3 */
const sideOf = {
  chart: (k: number) => BASE.w * k,
  cover: (k: number) => 440 * k,
  board: (k: number) => 300 * k,
};

// ── 조각 ────────────────────────────────────────────────────────────────────

/** 꼬리말의 마크(L0 heart) — 가운데 core 둘레에 영역 물감 여덟(G의 markTiles 그대로) */
function markSvg(size: number): string {
  const { tiles } = markTiles('heart', size);
  const n = (v: number) => v.toFixed(2);
  const rects = tiles.map((t) =>
    `<rect x="${n(t.x)}" y="${n(t.y)}" width="${n(t.w)}" height="${n(t.h)}" rx="${n(t.radius)}" fill="${t.ti < 0 ? T.core : T.dye[t.ti]}"/>`);
  return `<svg class="mark" width="${pt(size)}" height="${pt(size)}" viewBox="0 0 ${n(size)} ${n(size)}" aria-hidden="true">${rects.join('')}</svg>`;
}

/** 꼬리말 — 왼쪽 마크 + 앱 이름(표 이미지의 발과 같은 짝), 오른쪽 쪽 번호 */
function footer(m: M, k: number, page: string): string {
  return `<div class="foot"><span class="brand">${markSvg(12 * k)}<span>${esc(m.print.appName)}</span></span><span class="num">${esc(page)}</span></div>`;
}

/** 머리말 한 줄 — 왼쪽 글 · 오른쪽 날짜 */
function headLine(left: string, date: string): string {
  return `<div class="hl"><span>${esc(left)}</span><span class="num">${esc(date)}</span></div>`;
}

/** 목표 — 없으면 손으로 적을 밑줄 한 줄 */
function goalBlock(goal: string, cls = 'goal'): string {
  return goal ? `<div class="${cls}">${escLines(goal)}</div>` : `<div class="${cls} line"></div>`;
}

/** 이름표 칸의 이름 — 이름을 짓지 않았으면 '영역 n' */
function headText(c: PosterCell, m: M): string {
  return c.unnamed ? m.print.areaN({ n: c.ti + 1 }) : c.text;
}

/** 칸 하나(부드러운 칸) — td는 자리(틈의 반씩)만, 칠과 글은 안쪽 div(.in)가 */
function tile(cls: string[], kind: PosterCell['kind'], ti: number, done: boolean, inner: string): string {
  const { bg, ink, edge } = tileColors(kind, ti, done);
  if (edge) cls.push('empty');
  return `<td class="${cls.join(' ')}"><div class="in" style="background:${bg};color:${ink}">${inner}</div></td>`;
}

/** 81칸 표의 칸 하나 */
function chartTd(c: PosterCell, m: M): string {
  const cls = ['c', `r${c.row}`, `k${c.col}`];
  if (c.kind === 'core') cls.push('core');
  else if (c.kind === 'head') cls.push(...(c.unnamed ? ['head', 'unnamed'] : ['head']));
  else if (c.kind === 'action' && c.done) cls.push('done');
  const text = c.kind === 'head' ? headText(c, m) : c.text;
  return tile(cls, c.kind, c.ti, c.done, text ? `<span class="t">${escLines(text)}</span>` : '');
}

/** 8칸을 다 달성한 블록 — 블록 안쪽(바깥 칸 가장자리 위)에 1.5pt 먹 테두리 */
function finishedFrames(finished: number[], g: ReturnType<typeof sheetTiles>): string {
  const span = 3 * g.cell + 2 * g.gap;
  const step = span + g.blockGap;
  return finished
    .map((ti) => {
      const slot = CHART_POS[ti];
      const x = (slot % 3) * step;
      const y = Math.floor(slot / 3) * step;
      return `<div class="finframe" style="left:${pt(x)};top:${pt(y)};width:${pt(span)};height:${pt(span)}"></div>`;
    })
    .join('');
}

/** 9×9 표 — 칸 81개(줄 아홉), 블록 사이는 넓은 틈. 빈 표는 실천 칸이 모두 빈 칸 */
function chartTable(doc: Doc, m: M, blank: boolean, side: number): string {
  const cells = posterCells(doc, blank);
  const finished = posterFinished(doc, blank);
  const rows: string[] = [];
  for (let r = 0; r < 9; r++) rows.push(`<tr>${cells.filter((c) => c.row === r).map((c) => chartTd(c, m)).join('')}</tr>`);
  return `<div class="chart" style="width:${pt(side)};height:${pt(side)}"><table class="t81">${rows.join('')}</table>${finishedFrames(finished, sheetTiles(side))}</div>`;
}

/** 3×3 판의 칸 아홉을 줄 셋으로 — 자리 클래스(i 줄 · j 칸)를 붙인다 */
function boardRows(cells: string[]): string {
  return [0, 1, 2].map((r) => `<tr>${cells.slice(r * 3, r * 3 + 3).join('')}</tr>`).join('');
}

// ── 쪽 ──────────────────────────────────────────────────────────────────────

/** 표 한 장 — 머리말 · 목표 · 81칸 · 달성 수 · 메모 5줄 · 꼬리말. 표는 판의 너비 그대로라 모두 같은 왼쪽 끝에서 시작한다 */
function chartPage(doc: Doc, o: Opts, m: M, f: Frame): string {
  const side = sideOf.chart(f.k);
  const date = m.fmt.dateLong({ d: o.now });
  const done = posterDone(doc);
  const memo = Array.from({ length: 5 }, () => '<div class="rule"></div>').join('');
  return [
    '<section class="page cp">',
    headLine(m.print.sheetTitle, date),
    goalBlock(doc.centerGoal.trim()),
    chartTable(doc, m, o.blank, side),
    `<div class="sum num">${o.blank ? '' : esc(m.print.achieved({ done, total: 64 }))}</div>`,
    `<div class="memo"><div class="ml">${esc(m.print.memo)}</div>${memo}</div>`,
    footer(m, f.k, ''),
    '</section>',
  ].join('');
}

/** 표지 — 목표 · 영역 이름 3×3(물감 칸 + 흰 글씨, 번호 · 달성 수) · 날짜 */
function coverPage(doc: Doc, o: Opts, m: M, f: Frame): string {
  const side = sideOf.cover(f.k);
  const date = m.fmt.dateLong({ d: o.now });
  const cells: string[] = [];
  for (let slot = 0; slot < 9; slot++) {
    const cls = ['cv', `i${Math.floor(slot / 3)}`, `j${slot % 3}`];
    if (slot === 4) {
      const goal = doc.centerGoal.trim();
      cells.push(tile([...cls, 'core'], 'core', -1, false, goal ? `<span class="t">${escLines(goal)}</span>` : ''));
      continue;
    }
    const ti = CHART_POS.indexOf(slot);
    const th = doc.themes[ti];
    const name = th?.title.trim() ?? '';
    const done = th ? th.actions.filter((a) => a.text.trim() && a.done).length : 0;
    const count = o.blank ? '' : `<span class="cnt num">${done}/8</span>`;
    cells.push(tile(
      [...cls, ...(name ? ['head'] : ['head', 'unnamed'])], 'head', ti, false,
      `<span class="no num">${ti + 1}</span><span class="t">${escLines(name || m.print.areaN({ n: ti + 1 }))}</span>${count}`,
    ));
  }
  return [
    '<section class="page">',
    headLine(m.print.coverTitle, date),
    goalBlock(doc.centerGoal.trim()),
    `<div class="chart" style="width:${pt(side)};height:${pt(side)}"><table class="t9 cover">${boardRows(cells)}</table></div>`,
    '<div class="grow"></div>',
    footer(m, f.k, '1 / 9'),
    '</section>',
  ].join('');
}

/** 영역 한 쪽 — 3×3 판 · 실천 8줄(글 · 유형 · 31칸 한 달 기록) */
function areaPage(doc: Doc, o: Opts, m: M, f: Frame, ti: number): string {
  const th = doc.themes[ti];
  const name = th?.title.trim() ?? '';
  const date = m.fmt.dateLong({ d: o.now });
  const side = sideOf.board(f.k);
  const kindName = { once: m.print.kindOnce, habit: m.print.kindHabit, count: m.print.kindCount, mind: m.print.kindMind } as const;

  const board: string[] = [];
  for (let slot = 0; slot < 9; slot++) {
    const cls = ['cv', `i${Math.floor(slot / 3)}`, `j${slot % 3}`];
    if (slot === 4) {
      board.push(tile([...cls, ...(name ? ['head'] : ['head', 'unnamed'])], 'head', ti, false, `<span class="t">${escLines(name || m.print.areaN({ n: ti + 1 }))}</span>`));
      continue;
    }
    const a = th?.actions[CHART_POS.indexOf(slot)];
    const text = o.blank ? '' : a?.text.trim() ?? '';
    const done = !!a?.done && !!text;
    board.push(tile([...cls, ...(done ? ['done'] : [])], text ? 'action' : 'empty', ti, done, text ? `<span class="t">${escLines(text)}</span>` : ''));
  }

  const days = Array.from({ length: 31 }, (_, i) => `<th class="d num">${i + 1}</th>`).join('');
  const boxes = Array.from({ length: 31 }, () => '<td class="d"><i></i></td>').join('');
  const rows = Array.from({ length: 8 }, (_, ai) => {
    const a = th?.actions[ai];
    const text = o.blank ? '' : a?.text.trim() ?? '';
    const kind = text && a ? kindName[kindOf(a)] : '';
    // 달성한 실천 — 체크 칸에 그 영역의 wash, 가장자리는 물감(앱의 체크 칸과 같은 짝)
    const check = text && a?.done ? `<i class="chk on" style="background:${T.wash[ti]};border-color:${T.dye[ti]}"></i>` : '<i class="chk"></i>';
    // 칸은 표의 칸 그대로 두고(그래야 밑줄이 줄 전체와 이어진다) 네모 · 글의 가로 줄은 안쪽 div가 맡는다
    return `<tr><td class="act"><div class="ai">${check}<span>${escLines(text)}</span></div></td><td class="kd">${esc(kind)}</td>${boxes}</tr>`;
  }).join('');

  return [
    '<section class="page">',
    headLine(m.print.areaOf({ n: ti + 1, total: 8 }), date),
    `<div class="area"><i class="sw" style="background:${T.dye[ti]}"></i><span>${escLines(name || m.print.areaN({ n: ti + 1 }))}</span></div>`,
    `<div class="chart" style="width:${pt(side)};height:${pt(side)}"><table class="t9 small">${boardRows(board)}</table></div>`,
    `<table class="rows"><tr><th class="act">${esc(m.print.colAction)}</th><th class="kd">${esc(m.print.colKind)}</th>${days}</tr>${rows}</table>`,
    `<div class="tally-l">${esc(m.print.colTally)}</div>`,
    '<div class="grow"></div>',
    footer(m, f.k, `${ti + 2} / 9`),
    '</section>',
  ].join('');
}

// ── 스타일 ──────────────────────────────────────────────────────────────────

/** 실천 장부의 날 칸 하나의 안쪽 폭(pt) — (표 515 − 실천 170 − 유형 44) ÷ 31일 − 좌우 여백 0.6×2 */
export function dayColumnInner(k: number): number {
  return ((BASE.w - 170 - 44) / 31 - 1.2) * k;
}

/** 날짜 숫자의 상한(pt) — '31'은 숫자 두 개로 1.26em쯤, 여유를 두고 1.3em이 날 칸 안에 들어가게 */
export function dayFontMax(k: number): number {
  return dayColumnInner(k) / 1.3;
}

/**
 * 칸 n개 한 줄의 자리 — 칸마다 앞뒤로 틈의 반씩(바깥 가장자리는 0)을 td의 안쪽 여백으로, 폭(높이)은 칸 + 여백.
 * table: 표 선택자, col · row: 칸 · 줄 클래스 앞글자. wide(i): i번째 칸 뒤가 넓은 틈(블록 사이)인가
 */
function trackRules(table: string, col: string, row: string, n: number, cell: number, gap: number, wideGap: number, wide: (i: number) => boolean): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = i === 0 ? 0 : (wide(i - 1) ? wideGap : gap) / 2;
    const b = i === n - 1 ? 0 : (wide(i) ? wideGap : gap) / 2;
    out.push(`${table} .${col}${i}{width:${pt(cell + a + b)};padding-left:${pt(a)};padding-right:${pt(b)}}`);
    out.push(`${table} .${row}${i}{height:${pt(cell + a + b)};padding-top:${pt(a)};padding-bottom:${pt(b)}}`);
  }
  return out;
}

function css(f: Frame, fontCss: string): string {
  const k = f.k;
  const s = (n: number) => pt(n * k);
  const chart = sheetTiles(sideOf.chart(k));
  const cover = boardTiles(sideOf.cover(k));
  const board = boardTiles(sideOf.board(k));
  // 81칸 글 · 날짜 숫자는 작은 종이(A5)에서도 읽히게 크기에 바닥을 둔다(Math.max)
  // 날짜 숫자는 그래도 날 칸(31칸)에 '31'이 한 줄로 들어가는 크기까지만 — 넘치면 숫자가 두 줄로 쌓인다(A5)
  const dayPt = Math.min(Math.max(5.5, 6.5 * k), dayFontMax(k));
  // 칸의 자리 — 칸마다 앞뒤로 틈의 반씩: 81칸은 세 칸마다 넓은 틈(블록 사이), 3×3 판은 같은 틈
  const rules = [
    ...trackRules('.t81', 'k', 'r', 9, chart.cell, chart.gap, chart.blockGap, (i) => i % 3 === 2),
    ...trackRules('.t9.cover', 'j', 'i', 3, cover.cell, cover.gap, cover.gap, () => false),
    ...trackRules('.t9.small', 'j', 'i', 3, board.cell, board.gap, board.gap, () => false),
  ];
  return `${fontCss}
@page{size:${pt(f.w)} ${pt(f.h)};margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:${T.paper};color:${T.ink};-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:${PRINT_FONT};font-weight:500;-webkit-text-size-adjust:100%;word-break:keep-all;overflow-wrap:anywhere;line-break:strict}
.page{width:${pt(f.w)};height:${pt(f.h - 1)};padding:${pt(f.pad)};display:flex;flex-direction:column;align-items:center;overflow:hidden;break-after:page;page-break-after:always}
.page:last-child{break-after:auto;page-break-after:auto}
.page>*{width:100%}
.page>.chart{flex:none}
.cp>*{width:${s(BASE.w)}}
.num{font-variant-numeric:tabular-nums}
i{display:block;font-style:normal}
.hl{display:flex;justify-content:space-between;font-size:${s(10)};line-height:1.3;font-weight:500;color:${T.print}}
.goal,.area{font-size:${s(20)};line-height:1.3;font-weight:700;letter-spacing:-0.02em;color:${T.ink};margin:${s(6)} 0 ${s(14)};display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.goal.line{height:${s(25)};border-bottom:${s(0.75)} solid ${T.printMid}}
.area{display:flex;align-items:center;gap:${s(8)}}
.area .sw{display:inline-block;flex:none;width:${s(10)};height:${s(10)};border-radius:${s(2.5)}}
.chart{position:relative}
table{border-collapse:separate;border-spacing:0;table-layout:fixed}
.chart table{width:100%;height:100%}
td,th{padding:0;vertical-align:middle;text-align:center}
.in{position:relative;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}
.t{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.t81 .in{font-size:${pt(Math.max(6.5, 8.5 * k))};line-height:1.2;font-weight:500;letter-spacing:-0.02em;height:${pt(chart.cell)};border-radius:${pt(chart.radius)};padding:${s(3)}}
.t81 .head .in,.t81 .core .in{font-size:${pt(Math.max(7, 9 * k))};font-weight:700}
.t81 .head .in{letter-spacing:-0.04em}
.t81 .head.unnamed .in{font-weight:500}
.empty .in{border:0.5pt solid ${T.printMid}}
.finframe{position:absolute;border:${s(1.5)} solid ${T.ink};border-radius:${pt(chart.radius)}}
.t9 .in{font-size:${s(13)};line-height:1.25;font-weight:700;padding:${s(8)}}
.t9.cover .in{height:${pt(cover.cell)};border-radius:${pt(cover.radius)}}
.t9.small .in{height:${pt(board.cell)};border-radius:${pt(board.radius)};font-size:${s(9.5)};font-weight:500;padding:${s(5)}}
.t9.small .head .in{font-weight:700}
.t9 .unnamed .in{font-weight:500}
.t9 .no{position:absolute;left:${s(8)};top:${s(6)};font-size:${s(9)};font-weight:700}
.t9 .cnt{position:absolute;right:${s(8)};bottom:${s(6)};font-size:${s(9)};font-weight:500}
.sum{font-size:${s(10)};line-height:1.3;font-weight:500;color:${T.print};margin-top:${s(8)};min-height:${s(13)}}
.memo{margin-top:${s(14)};flex:1;display:flex;flex-direction:column;justify-content:space-evenly;min-height:0}
.ml{font-size:${s(9)};font-weight:600;color:${T.printStrong}}
.rule{height:${s(22)};border-bottom:0.5pt solid ${T.printMid}}
.rows{width:100%;margin-top:${s(16)};border-collapse:collapse}
.rows th{font-size:${s(7.5)};font-weight:500;color:${T.print};padding-bottom:${s(3)};border-bottom:${s(0.75)} solid ${T.printEdge}}
.rows td{height:${s(34)};border-bottom:0.5pt solid ${T.printMid}}
.rows .act{width:${s(170)};text-align:left;font-size:${s(9)};line-height:1.25;font-weight:500;padding-right:${s(6)}}
.rows td.act{vertical-align:middle}
.rows .ai{display:flex;align-items:center;gap:${s(5)}}
.rows .ai span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.rows .kd{width:${s(44)};font-size:${s(8)};font-weight:500;text-align:left;color:${T.print}}
.rows .d{padding:0 ${s(0.6)}}
.rows th.d{font-size:${pt(dayPt)};font-weight:500;white-space:nowrap}
.rows td.d i{width:100%;aspect-ratio:1;border:0.5pt solid ${T.printEdge};border-radius:${s(1.5)}}
.chk{flex:none;width:${s(8)};height:${s(8)};border:${s(0.75)} solid ${T.printEdge};border-radius:${s(2)}}
.tally-l{font-size:${s(7.5)};text-align:right;margin-top:${s(4)};color:${T.print}}
.grow{flex:1}
.foot{display:flex;justify-content:space-between;align-items:center;font-size:${s(9)};font-weight:500;color:${T.print};margin-top:${s(10)}}
.brand{display:flex;align-items:center;gap:${s(5)};font-weight:700;color:${T.printStrong}}
${rules.join('\n')}`;
}

// ── 바깥으로 ────────────────────────────────────────────────────────────────

/**
 * 만다라트 → 인쇄용 HTML 한 벌.
 * - layout 'chart': 표 한 장(1쪽). 'areas': 표지 + 영역별 8쪽(9쪽).
 * - blank: 이름표와 목표만 찍고 실천 칸은 비운다(손으로 채우는 빈 표).
 * - fontCss: printFonts.fontCss()의 @font-face(Node는 '').
 * 바깥 주소는 fontCss에 든 것(웹의 글꼴 주소, 기기는 data:) 말고는 없다.
 */
export function printHtml(doc: Doc, opts: Opts): { html: string; pages: number; size: { w: number; h: number } } {
  const m = msg(opts.lang);
  const f = frameOf(opts.paper);
  const pages =
    opts.layout === 'areas'
      ? [coverPage(doc, opts, m, f), ...Array.from({ length: 8 }, (_, ti) => areaPage(doc, opts, m, f, ti))]
      : [chartPage(doc, opts, m, f)];
  const title = doc.centerGoal.trim() || m.print.sheetTitle;
  const html = `<!DOCTYPE html>
<html lang="${opts.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
${css(f, opts.fontCss)}
</style>
</head>
<body>
${pages.join('\n')}
</body>
</html>`;
  return { html, pages: pages.length, size: { w: f.w, h: f.h } };
}
