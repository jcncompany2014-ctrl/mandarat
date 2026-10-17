// 인쇄용 PDF의 HTML — 만다라트 한 장을 종이에 찍을 HTML로 바꾼다(RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// 칸의 내용은 poster.ts(공유 이미지와 같은 규칙), 칸 자리·색은 theme/chart.ts에서 가져온다. 글은 msg().print · msg().fmt.
// 찍기는 print(.web/.native).ts, 글꼴 CSS는 printFonts(.web/.native).ts가 맡는다.
//
// 종이 위의 약속(화면의 표와 같다): 칠한 칸 = 달성(영역 색 + 흰 글씨) · 옅은 칸 = 영역 이름표 · 먹색 칸 = 핵심 목표.
// 괘선은 바깥 테두리 > 블록 사이 > 칸 사이 순으로 가늘다. 8칸을 다 달성한 블록은 금색 줄을 한 겹 더 두른다.
// 모든 크기는 CSS pt(1/72인치) — @page 크기와 같은 단위라 어느 종이에서도 한 쪽에 맞는다.
import type { MandaratDoc } from '../types';
import type { PrintOptions, PrintPaper } from './contracts';
import { msg, type Lang } from '../i18n';
import { CHART_POS, DONE_INK, coreBg, coreInk, headBg, headTrack, legibleMark } from '../theme/chart';
import { MOODS, alpha } from '../theme/moods';
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

/** 종이는 늘 흰 바탕에 먹 글씨(기본 무드의 먹·보조 글씨 색) */
const PAPER = '#FFFFFF';
const INK = MOODS['연꽃'].ink;
const SUB = MOODS['연꽃'].sub;
const CENTER = MOODS['연꽃'].center;
const LIGHT = { dark: false, ink: INK, center: CENTER } as const;

/** 기준 종이(A4)의 글자 자리 — 다른 종이는 이 판을 같은 비율로 줄이거나 늘린다 */
const BASE = { w: 515, h: 760 } as const;

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

type Opts = PrintOptions & { now: Date; lang: Lang; fontCss: string; accent: string };
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

// ── 조각 ────────────────────────────────────────────────────────────────────

/** 꼬리말의 3×3 문양(GridMark) — 바깥 8칸은 옅게, 가운데는 또렷하게 */
function gridMarkSvg(size: number): string {
  const gap = size * 0.1;
  const cell = (size - gap * 2) / 3;
  const rects: string[] = [];
  for (let i = 0; i < 9; i++) {
    const x = (i % 3) * (cell + gap);
    const y = Math.floor(i / 3) * (cell + gap);
    rects.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" rx="${(cell * 0.2).toFixed(2)}" fill="${INK}"${i === 4 ? '' : ' fill-opacity="0.32"'}/>`);
  }
  return `<svg class="mark" width="${pt(size)}" height="${pt(size)}" viewBox="0 0 ${size} ${size}" aria-hidden="true">${rects.join('')}</svg>`;
}

function footer(m: M, k: number, page: string): string {
  return `<div class="foot"><span class="num">${esc(page)}</span><span class="brand">${gridMarkSvg(10 * k)}<span>${esc(m.print.appName)}</span></span></div>`;
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

/** 81칸 표의 칸 하나 */
function chartTd(c: PosterCell, m: M, blank: boolean, finished: boolean, accentMark: string): string {
  const cls = ['c', `r${c.row}`, `k${c.col}`];
  let bg = '';
  let ink = INK;
  let text = c.text;
  if (c.kind === 'core') {
    if (!blank) { bg = coreBg(LIGHT); ink = coreInk(LIGHT); }
    cls.push('core');
  } else if (c.kind === 'head') {
    bg = blank ? '' : headBg(c.color, LIGHT);
    text = headText(c, m);
    cls.push('head');
    if (c.unnamed) cls.push('unnamed');
  } else if (c.kind === 'action') {
    if (blank) text = '';
    else if (c.done) { bg = c.color; ink = DONE_INK; cls.push('done'); }
  }
  const style = `${bg ? `background:${bg};` : ''}color:${ink}`;
  const bits: string[] = [];
  if (text) bits.push(`<span class="t">${escLines(text)}</span>`);
  if (finished && c.kind === 'head') bits.push(`<span class="fin" style="color:${legibleMark(accentMark, bg || PAPER, LIGHT, 4.5)}">${esc(m.print.finished)}</span>`);
  if (c.headPct != null) bits.push(`<i class="bar" style="background:${headTrack(c.color)}"><i style="width:${c.headPct}%;background:${c.color}"></i></i>`);
  if (c.barPct != null) bits.push(`<i class="bar"><i style="width:${c.barPct}%;background:${c.color}"></i></i>`);
  return `<td class="${cls.join(' ')}" style="${style}"><div class="in">${bits.join('')}</div></td>`;
}

/** 8칸을 다 달성한 블록 — 블록 괘선 안쪽에 금색 줄 한 겹 */
function finishedFrames(finished: number[], side: number, color: string, k: number): string {
  const b = side / 3;
  const inset = 1.5 * k;
  return finished
    .map((ti) => {
      const slot = CHART_POS[ti];
      const x = (slot % 3) * b + inset;
      const y = Math.floor(slot / 3) * b + inset;
      return `<div class="finframe" style="left:${pt(x)};top:${pt(y)};width:${pt(b - inset * 2)};height:${pt(b - inset * 2)};border-color:${color}"></div>`;
    })
    .join('');
}

/** 9×9 표 — 칸 사이 · 블록 사이 · 바깥 테두리 괘선을 칸마다 정한다 */
function chartTable(doc: Doc, m: M, blank: boolean, side: number, k: number, accentMark: string): string {
  const cells = posterCells(doc, blank);
  const finished = posterFinished(doc, blank);
  const rows: string[] = [];
  for (let r = 0; r < 9; r++) {
    const tds = cells.filter((c) => c.row === r).map((c) => chartTd(c, m, blank, finished.includes(c.ti) && c.kind === 'head', accentMark));
    rows.push(`<tr>${tds.join('')}</tr>`);
  }
  return `<div class="chart" style="width:${pt(side)};height:${pt(side)}"><table class="t81">${rows.join('')}</table>${finishedFrames(finished, side, accentMark, k)}</div>`;
}

// ── 쪽 ──────────────────────────────────────────────────────────────────────

/** 표 한 장 — 머리말 · 목표 · 81칸 · 달성 수 · 메모 5줄 · 꼬리말 */
function chartPage(doc: Doc, o: Opts, m: M, f: Frame, accentMark: string): string {
  const side = 470 * f.k;
  const date = m.fmt.dateLong({ d: o.now });
  const done = posterDone(doc);
  const memo = Array.from({ length: 5 }, () => '<div class="rule"></div>').join('');
  return [
    '<section class="page">',
    headLine(m.print.sheetTitle, date),
    goalBlock(doc.centerGoal.trim()),
    chartTable(doc, m, o.blank, side, f.k, accentMark),
    `<div class="sum num">${o.blank ? '' : esc(m.print.achieved({ done, total: 64 }))}</div>`,
    `<div class="memo"><div class="ml">${esc(m.print.memo)}</div>${memo}</div>`,
    footer(m, f.k, ''),
    '</section>',
  ].join('');
}

/** 표지 — 목표 · 영역 이름 3×3 · 날짜 */
function coverPage(doc: Doc, o: Opts, m: M, f: Frame): string {
  const side = 440 * f.k;
  const date = m.fmt.dateLong({ d: o.now });
  const cells: string[] = [];
  for (let slot = 0; slot < 9; slot++) {
    if (slot === 4) {
      const goal = doc.centerGoal.trim();
      const style = o.blank ? `color:${INK}` : `background:${coreBg(LIGHT)};color:${coreInk(LIGHT)}`;
      cells.push(`<td class="cv core" style="${style}"><div class="in">${goal ? `<span class="t">${escLines(goal)}</span>` : ''}</div></td>`);
      continue;
    }
    const ti = CHART_POS.indexOf(slot);
    const th = doc.themes[ti];
    const name = th?.title.trim() ?? '';
    const color = th?.color ?? INK;
    const done = th ? th.actions.filter((a) => a.text.trim() && a.done).length : 0;
    const bg = o.blank ? '' : `background:${headBg(color, LIGHT)};`;
    const count = o.blank ? '' : `<span class="cnt num">${done}/8</span>`;
    cells.push(
      `<td class="cv head${name ? '' : ' unnamed'}" style="${bg}color:${INK}"><div class="in"><span class="no num" style="color:${legibleMark(color, PAPER, LIGHT)}">${ti + 1}</span><span class="t">${escLines(name || m.print.areaN({ n: ti + 1 }))}</span>${count}</div></td>`,
    );
  }
  const rows = [0, 1, 2].map((r) => `<tr>${cells.slice(r * 3, r * 3 + 3).join('')}</tr>`).join('');
  return [
    '<section class="page">',
    headLine(m.print.coverTitle, date),
    goalBlock(doc.centerGoal.trim()),
    `<div class="chart" style="width:${pt(side)};height:${pt(side)}"><table class="t9">${rows}</table></div>`,
    '<div class="grow"></div>',
    footer(m, f.k, '1 / 9'),
    '</section>',
  ].join('');
}

/** 영역 한 쪽 — 3×3 판 · 실천 8줄(글 · 유형 · 31칸 한 달 기록) */
function areaPage(doc: Doc, o: Opts, m: M, f: Frame, ti: number): string {
  const th = doc.themes[ti];
  const color = th?.color ?? INK;
  const name = th?.title.trim() ?? '';
  const date = m.fmt.dateLong({ d: o.now });
  const side = 300 * f.k;
  const kindName = { once: m.print.kindOnce, habit: m.print.kindHabit, count: m.print.kindCount, mind: m.print.kindMind } as const;

  const board: string[] = [];
  for (let slot = 0; slot < 9; slot++) {
    if (slot === 4) {
      const bg = o.blank ? '' : `background:${headBg(color, LIGHT)};`;
      board.push(`<td class="cv head${name ? '' : ' unnamed'}" style="${bg}color:${INK}"><div class="in"><span class="t">${escLines(name || m.print.areaN({ n: ti + 1 }))}</span></div></td>`);
      continue;
    }
    const a = th?.actions[CHART_POS.indexOf(slot)];
    const text = o.blank ? '' : a?.text.trim() ?? '';
    const done = !o.blank && !!a?.done && !!text;
    const style = done ? `background:${color};color:${DONE_INK}` : `color:${INK}`;
    board.push(`<td class="cv${done ? ' done' : ''}" style="${style}"><div class="in">${text ? `<span class="t">${escLines(text)}</span>` : ''}</div></td>`);
  }
  const boardRows = [0, 1, 2].map((r) => `<tr>${board.slice(r * 3, r * 3 + 3).join('')}</tr>`).join('');

  const days = Array.from({ length: 31 }, (_, i) => `<th class="d num">${i + 1}</th>`).join('');
  const boxes = Array.from({ length: 31 }, () => '<td class="d"><i></i></td>').join('');
  const mark = legibleMark(color, PAPER, LIGHT);
  const rows = Array.from({ length: 8 }, (_, ai) => {
    const a = th?.actions[ai];
    const text = o.blank ? '' : a?.text.trim() ?? '';
    const kind = text && a ? kindName[kindOf(a)] : '';
    const check = text && a?.done ? `<i class="chk on" style="background:${color};border-color:${color}"></i>` : '<i class="chk"></i>';
    return `<tr><td class="act">${check}<span>${escLines(text)}</span></td><td class="kd" style="color:${SUB}">${esc(kind)}</td>${boxes}</tr>`;
  }).join('');

  return [
    '<section class="page">',
    headLine(m.print.areaOf({ n: ti + 1, total: 8 }), date),
    `<div class="area"><i class="sw" style="background:${mark}"></i><span>${escLines(name || m.print.areaN({ n: ti + 1 }))}</span></div>`,
    `<div class="chart" style="width:${pt(side)};height:${pt(side)}"><table class="t9 small">${boardRows}</table></div>`,
    `<table class="rows"><tr><th class="act">${esc(m.print.colAction)}</th><th class="kd">${esc(m.print.colKind)}</th>${days}</tr>${rows}</table>`,
    `<div class="tally-l" style="color:${SUB}">${esc(m.print.colTally)}</div>`,
    '<div class="grow"></div>',
    footer(m, f.k, `${ti + 2} / 9`),
    '</section>',
  ].join('');
}

// ── 스타일 ──────────────────────────────────────────────────────────────────

function css(f: Frame, fontCss: string): string {
  const k = f.k;
  const s = (n: number) => pt(n * k);
  const frame = alpha(INK, 0.85);
  const block = alpha(INK, 0.55);
  const cell = alpha(INK, 0.22);
  // 81칸의 괘선 — 칸마다 왼쪽·위를 긋고, 마지막 줄·칸만 오른쪽·아래를 긋는다(겹치는 선은 굵은 쪽이 이긴다)
  const rules: string[] = [];
  for (let i = 0; i < 9; i++) {
    const w = i === 0 ? 1.5 : i % 3 === 0 ? 1 : 0.5;
    const c = i === 0 ? frame : i % 3 === 0 ? block : cell;
    rules.push(`.t81 .k${i}{border-left:${s(w)} solid ${c}}`, `.t81 .r${i}{border-top:${s(w)} solid ${c}}`);
  }
  rules.push(`.t81 .k8{border-right:${s(1.5)} solid ${frame}}`, `.t81 .r8{border-bottom:${s(1.5)} solid ${frame}}`);
  return `${fontCss}
@page{size:${pt(f.w)} ${pt(f.h)};margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:${PAPER};color:${INK};-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:${PRINT_FONT};font-weight:500;-webkit-text-size-adjust:100%;word-break:keep-all;overflow-wrap:anywhere;line-break:strict}
.page{width:${pt(f.w)};height:${pt(f.h - 1)};padding:${pt(f.pad)};display:flex;flex-direction:column;align-items:center;overflow:hidden;break-after:page;page-break-after:always}
.page:last-child{break-after:auto;page-break-after:auto}
.page>*{width:100%}
.page>.chart{flex:none}
.num{font-variant-numeric:tabular-nums}
.hl{display:flex;justify-content:space-between;font-size:${s(10)};line-height:1.3;font-weight:600;color:${SUB}}
.goal,.area{font-size:${s(20)};line-height:1.25;font-weight:700;margin:${s(6)} 0 ${s(14)};display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.goal.line{height:${s(25)};border-bottom:${s(0.75)} solid ${alpha(INK, 0.35)}}
.area{display:flex;align-items:center;gap:${s(8)}}
.area .sw{display:inline-block;flex:none;width:${s(10)};height:${s(10)}}
.chart{position:relative}
table{border-collapse:collapse;table-layout:fixed}
.chart table{width:100%;height:100%}
td,th{padding:0;vertical-align:middle;text-align:center}
.t81 td{width:11.111%;height:11.111%}
.in{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:${s(2.5)};overflow:hidden}
.t{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.t81 .in{font-size:${s(8.5)};line-height:1.2;font-weight:600}
.t81 .head .in,.t81 .core .in{font-size:${s(9)};font-weight:700}
.t81 .head.unnamed .in{font-weight:500}
.t81 .done .in{font-weight:700}
.fin{font-size:${s(7)};line-height:1.2;font-weight:700;margin-top:${s(1)}}
i{display:block;font-style:normal}
.bar{position:absolute;left:0;right:0;bottom:0;height:${s(2)}}
.bar>i{height:100%}
.finframe{position:absolute;border:${s(1.5)} solid}
.t9{border:${s(1.5)} solid ${frame}}
.t9 td{width:33.333%;height:33.333%;border:${s(1)} solid ${block}}
.t9 .in{font-size:${s(13)};line-height:1.25;font-weight:700;padding:${s(8)}}
.t9.small .in{font-size:${s(9.5)};font-weight:600;padding:${s(4)}}
.t9 .head .in{font-weight:700}
.t9 .unnamed .in{font-weight:500}
.t9 .no{position:absolute;left:${s(6)};top:${s(5)};font-size:${s(9)};font-weight:700}
.t9 .cnt{position:absolute;right:${s(6)};bottom:${s(5)};font-size:${s(9)};font-weight:600;color:${SUB}}
.sum{font-size:${s(10)};line-height:1.3;font-weight:600;color:${SUB};margin-top:${s(6)};min-height:${s(13)}}
.memo{margin-top:${s(14)};flex:1;display:flex;flex-direction:column;justify-content:space-evenly;min-height:0}
.ml{font-size:${s(9)};font-weight:600;color:${SUB}}
.rule{height:${s(22)};border-bottom:${s(0.5)} solid ${alpha(INK, 0.3)}}
.rows{width:100%;margin-top:${s(16)}}
.rows th{font-size:${s(7.5)};font-weight:600;color:${SUB};padding-bottom:${s(3)};border-bottom:${s(1)} solid ${block}}
.rows td{height:${s(34)};border-bottom:${s(0.5)} solid ${alpha(INK, 0.3)}}
.rows .act{width:${s(170)};text-align:left;font-size:${s(9)};line-height:1.25;font-weight:600;padding-right:${s(6)}}
.rows td.act{display:flex;align-items:center;gap:${s(5)}}
.rows td.act span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.rows .kd{width:${s(44)};font-size:${s(8)};font-weight:600;text-align:left}
.rows .d{padding:0 ${s(0.6)}}
.rows th.d{font-size:${s(5.5)};font-weight:500}
.rows td.d i{width:100%;aspect-ratio:1;border:${s(0.5)} solid ${alpha(INK, 0.45)}}
.chk{flex:none;width:${s(8)};height:${s(8)};border:${s(0.75)} solid ${alpha(INK, 0.6)}}
.tally-l{font-size:${s(7.5)};text-align:right;margin-top:${s(4)}}
.grow{flex:1}
.foot{display:flex;justify-content:space-between;align-items:center;font-size:${s(9)};font-weight:700;color:${SUB};margin-top:${s(10)}}
.brand{display:flex;align-items:center;gap:${s(5)}}
${rules.join('\n')}`;
}

// ── 바깥으로 ────────────────────────────────────────────────────────────────

/**
 * 만다라트 → 인쇄용 HTML 한 벌.
 * - layout 'chart': 표 한 장(1쪽). 'areas': 표지 + 영역별 8쪽(9쪽).
 * - blank: 이름표와 목표만 찍고 실천 칸은 비운다(손으로 채우는 빈 표).
 * - fontCss: printFonts.fontCss()의 @font-face(Node는 '') · accent: 다 달성한 블록의 금색 줄(지금 포인트 컬러).
 * 바깥 주소는 fontCss에 든 것(웹의 글꼴 주소, 기기는 data:) 말고는 없다.
 */
export function printHtml(doc: Doc, opts: Opts): { html: string; pages: number; size: { w: number; h: number } } {
  const m = msg(opts.lang);
  const f = frameOf(opts.paper);
  const accentMark = legibleMark(opts.accent, PAPER, LIGHT);
  const pages =
    opts.layout === 'areas'
      ? [coverPage(doc, opts, m, f), ...Array.from({ length: 8 }, (_, ti) => areaPage(doc, opts, m, f, ti))]
      : [chartPage(doc, opts, m, f, accentMark)];
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
