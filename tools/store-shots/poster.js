// 앱스토어 포스터 한 장 — 바탕 · 작은 머리말(eyebrow) · 두 줄 제목(700) · 그림 하나(docs/design/mockups/a/store.png).
// 그림은 앱을 잘라 낸 것(plain: 바탕에 그대로 · sheet: 흰 종이 한 장이 캔버스 밖으로 이어진다)이거나, 예시 문서로 그린 위젯(widgets).
// 색은 모두 앱의 토큰(src/theme/tokens.ts LIGHT) — 스토어 그림은 늘 밝게(build-plan §2.4). 그라데이션 · 기기 테두리 · 이모지 없음.
// 위젯은 위젯 코드가 받는 값(lib/widgetSnapshot widgetProps) 그대로를 parts-widgets.css(목업의 위젯 부품)로 그린 모습이다.
// 순수 모듈(브라우저 없음): shoot.js가 이 HTML을 Chromium에 띄워 찍는다. 수는 CSS px = 논리 pt.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
require(path.join(ROOT, 'tests', 'register'));
const { LIGHT } = require(path.join(ROOT, 'src', 'theme', 'tokens'));
const { markTiles } = require(path.join(ROOT, 'src', 'components', 'chart', 'geometry'));

const WIDGET_CSS = path.join(ROOT, 'docs', 'design', 'mockups', 'a', 'parts-widgets.css');
const ICON = path.join(ROOT, 'assets', 'icon.png');

/** 바탕 셋 — 앱의 회색들(영역 색은 영역을 뜻하므로 바탕에 쓰지 않는다) */
const GROUNDS = { paper: LIGHT.paper, tile: LIGHT.tile, mid: LIGHT.printMid };

/** 글꼴 — 한국어 · 영어는 Pretendard, 일본어는 Hiragino(맥) 또는 Noto Sans JP(shoot.js가 /__jp/에서 띄운다) */
const SANS = `'Pretendard', -apple-system, sans-serif`;
const JA = `'Hiragino Sans', 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif`;
const fontOf = (lang) => (lang === 'ja' ? JA : SANS);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const half = (x) => Math.round(x * 2) / 2;

/**
 * 캔버스의 뼈대(pt) — 폰은 440pt 폭 기준(목업 430 × 932)에서 폭에 맞춰, 아이패드는 따로.
 * m: 글의 왼쪽 여백 · eyebrow/head: 머리말과 제목의 자리와 크기 · pic: 그림이 시작하는 높이 · bottom: 아래 여백.
 */
function layout(device) {
  const W = device.width;
  const H = device.height;
  if (W >= 700) {
    // 아이패드: 글과 그림이 같은 단(여백 120) — 지도가 높이에 맞춰 그 단을 채운다
    const eyebrow = { top: 96, size: 24, line: 32 };
    const head = { top: 140, size: 64, line: 80 };
    return { W, H, pad: true, s: 1.5, m: 120, eyebrow, head, pic: head.top + 2 * head.line + 84, bottom: 80 };
  }
  const s = W / 440;
  const eyebrow = { top: Math.round(H * 0.088), size: half(16 * s), line: half(22 * s) };
  const head = { top: eyebrow.top + half(30 * s), size: half(40 * s), line: half(52 * s) };
  return { W, H, pad: false, s, m: 32, eyebrow, head, pic: Math.round(head.top + 2 * head.line + 82 * s), bottom: Math.round(64 * s) };
}

// ── 위젯(홈 화면) ─────────────────────────────────────────────────────────────

/** 토큰 → CSS 변수(parts-widgets.css가 읽는 이름, tokens.css와 같은 이름) */
function tokenVars(lang) {
  const T = LIGHT;
  const v = {
    paper: T.paper, ink: T.ink, 'ink-2': T.ink2, 'ink-3': T.ink3, 'print-strong': T.printStrong, print: T.print,
    'print-edge': T.printEdge, 'print-mid': T.printMid, 'print-rule': T.printRule, ghost: T.ghost, tile: T.tile,
    signal: T.signal, core: T.core, 'on-core': T.onCore, 'on-dye': T.onDye, tick: T.tick, 'float-shadow': T.float, hair: '0.5px',
    sans: fontOf(lang),
  };
  T.dye.forEach((c, i) => { v[`dye-${i + 1}`] = c; });
  T.washL1.forEach((c, i) => { v[`wash-l1-${i + 1}`] = c; });
  T.tint.forEach((c, i) => { v[`tint-${i + 1}`] = c; });
  return `:root { ${Object.entries(v).map(([k, x]) => `--${k}: ${x};`).join(' ')} }`;
}

/** tokens.css의 작은 부품 셋(인쇄된 이름 · 오늘 점 · 영역 표시) — parts-widgets.css가 기대한다 */
const BASE_PARTS = `
.t-label { font: 500 13px/18px var(--sans); letter-spacing: 0; color: var(--print); font-variant-numeric: tabular-nums; }
.a-today { display: inline-block; width: 6px; height: 6px; margin-right: 6px; background: var(--signal); border-radius: 50%; vertical-align: 2px; }
.a-dye { display: inline-block; width: 8px; height: 8px; margin-right: 6px; background: var(--d, var(--ink)); border-radius: 2px; vertical-align: -0.5px; }
`;

/** 위젯의 색 지도(TodayWidget colourMap: 칸 9 · 칸 사이 1 · 블록 사이 2) — 가운데 core, 영역 16칸 dye, 실천 washL1 · tint · tile */
function widgetMap(cells, c = 9, g = 1, b = 2) {
  const T = LIGHT;
  const slot = (s) => (s < 4 ? s : s - 1);
  const pos = (i) => i * c + (i - Math.floor(i / 3)) * g + Math.floor(i / 3) * b;
  const w = 9 * c + 6 * g + 2 * b;
  const r = Math.max(1.5, 0.14 * c);
  let rects = '';
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const block = Math.floor(row / 3) * 3 + Math.floor(col / 3);
      const at = (row % 3) * 3 + (col % 3);
      let fill;
      if (block === 4 && at === 4) fill = T.core;
      else if (block === 4 || at === 4) fill = T.dye[slot(block === 4 ? at : block)];
      else {
        const ti = slot(block);
        const st = cells.charAt(ti * 8 + slot(at));
        fill = st === '2' ? T.washL1[ti] : st === '1' ? T.tint[ti] : T.tile;
      }
      rects += `<rect x="${pos(col)}" y="${pos(row)}" width="${c}" height="${c}" rx="${r}" fill="${fill}"/>`;
    }
  }
  return `<svg width="${w}" height="${w}" viewBox="0 0 ${w} ${w}" style="display:block" aria-hidden="true">${rects}</svg>`;
}

/** 위젯의 체크 상자(20, 모서리 6, 테두리 1.5) — 한 일은 washL1 칠 + dye 테두리 + 굵은 체크(위젯은 SF Symbol checkmark) */
function widgetBox(on, a) {
  const T = LIGHT;
  const fill = on ? (a >= 0 ? T.washL1[a] : T.tile) : 'none';
  const edge = on ? (a >= 0 ? T.dye[a] : T.printEdge) : T.printEdge;
  const mark = on ? `<path d="M5.7 10.4 8.7 13.4 14.4 6.9" fill="none" stroke="${T.ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` : '';
  return `<svg width="20" height="20" viewBox="0 0 20 20" style="display:block;flex:none" aria-hidden="true"><rect x=".75" y=".75" width="18.5" height="18.5" rx="5.25" fill="${fill}" stroke="${edge}" stroke-width="1.5"/>${mark}</svg>`;
}

/** 줄 하나(34pt) — 상자 · 할 일 · 오른쪽(중점 · D-2, 없으면 영역 표시) */
function widgetRow(p, it) {
  const a = typeof it.a === 'number' && it.a >= 0 && it.a <= 7 ? it.a : -1;
  const right = it.r
    ? `<span class="w-row-right${it.r === p.lines.focus ? ' is-print' : ''}">${esc(it.r)}</span>`
    : a >= 0 ? `<span class="w-row-area"><i class="a-dye" style="--d:var(--dye-${a + 1})"></i>${esc(p.names[a] || '')}</span>` : '';
  return `<div class="w-row${it.d ? ' is-done' : ''}">${widgetBox(it.d, a)}<span class="w-row-title"><span class="w-strike">${esc(it.t)}</span></span>${right}</div>`;
}

/** 머리 한 줄 — '● 오늘 … 1/10'(작게) · '● 오늘 할 일 … 9개 남음'(중간, 틀의 앞뒤 글은 작게) */
function widgetHead(label, figure) {
  return `<div class="w-head"><span class="t-label"><i class="a-today"></i>${esc(label)}</span><span class="w-fig">${figure}</span></div>`;
}

/**
 * 홈 화면에 둔 위젯 두 개를 그릴 값 — widgetProps 그대로에서, 중간 위젯의 셋째 줄을 막 체크한 모습(위젯 버튼 press()와 같이
 * 그 자리에서 d만 바뀌고 한 수가 하나 는다). 줄 순서 · 오른쪽 글 · 지도 칸은 바꾸지 않는다.
 */
function tickThird(props) {
  const items = props.items.map((x) => ({ ...x }));
  const it = items[2];
  if (!it || it.d) return { ...props, items };
  it.d = true;
  return { ...props, items, done: Math.min(props.total, props.done + 1) };
}

function smallWidget(p) {
  const w = 9 * 9 + 6 + 4;
  return `<div class="w w-small"><div class="w-col" style="width:${w}px">${widgetHead(p.lines.today, `${p.done}/${p.total}`)}<div class="w-sheet">${widgetMap(p.cells)}</div></div></div>`;
}

function mediumWidget(p) {
  const left = Math.max(0, p.total - p.done);
  const [before, ...rest] = String(p.lines.leftUnit || '{n}').split('{n}');
  const after = rest.join('');
  const fig = `${before ? `<small style="margin:0 1px 0 0">${esc(before)}</small>` : ''}${left}${after ? `<small>${esc(after)}</small>` : ''}`;
  return `<div class="w w-medium">${widgetHead(p.lines.listHead, fig)}<div class="w-list">${p.items.slice(0, 3).map((it) => widgetRow(p, it)).join('')}</div></div>`;
}

/**
 * 홈 화면의 자리(pt, 배율 1) — 목업 store.html 3번(폰: 네 칸 줄). 아이패드는 여섯 칸 줄.
 * 위젯 둘(작게 158 · 중간 338), 앱 아이콘(60), 나머지는 글 없는 흐린 칸(다른 앱).
 */
function homeGrid(pad, rows) {
  const P = 92.67;
  const cols = pad ? 6 : 4;
  const x = (i) => 26 + i * P;
  const apps = [];
  for (let i = 2; i < cols; i++) for (const y of [6, 98]) if (!(i === 2 && y === 6)) apps.push({ x: x(i), y });
  for (let i = 4; i < cols; i++) for (const y of [196, 288]) apps.push({ x: x(i), y });
  for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) apps.push({ x: x(i), y: 380 + r * 92 });
  return { width: x(cols - 1) + 60 - 26, height: 380 + (rows - 1) * 92 + 60, small: { x: 26, y: 0 }, icon: { x: x(2), y: 6 }, medium: { x: 26, y: 190 }, apps };
}

/** 위젯 그림 — 캔버스 L 위에 놓을 자리와 HTML. k(배율)는 여백 안에 들어가게 */
function widgetsBlock(L, props, iconData) {
  const fit = (rows) => {
    const g = homeGrid(L.pad, rows);
    const k = Math.min(L.pad ? 1.8 : 1.15, (L.W - 2 * (L.pad ? L.m : 31)) / g.width);
    return { g, k, fits: L.pic + g.height * k <= L.H - L.bottom };
  };
  let f = fit(1);
  for (let rows = 2; rows <= 4; rows++) {
    const next = fit(rows);
    if (!next.fits) break;
    f = next;
  }
  const { g, k } = f;
  const left = L.pad ? L.m - 26 * k : (L.W - g.width * k) / 2 - 26 * k;
  const p = tickThird(props);
  const app = (a, ours) => `<div class="app${ours ? ' app-ours' : ''}" style="left:${a.x}px;top:${a.y}px">${ours ? `<img alt="" src="${iconData}">` : ''}</div>`;
  const html = `<div class="home" style="left:${left}px;top:${L.pic}px;transform:scale(${k})">`
    + `<div style="position:absolute;left:${g.small.x}px;top:${g.small.y}px">${smallWidget(p)}</div>`
    + app(g.icon, true)
    + g.apps.map((a) => app(a, false)).join('')
    + `<div style="position:absolute;left:${g.medium.x}px;top:${g.medium.y}px">${mediumWidget(p)}</div>`
    + '</div>';
  return { html, k, grid: g };
}

// ── 브랜드(1번 아래) ───────────────────────────────────────────────────────────

/** L0 마크(마음: 영역 여덟 + 가운데 core) — chart/geometry markTiles 그대로 */
function markSvg(size) {
  const { tiles } = markTiles('heart', size);
  const rects = tiles.map((t) => `<rect x="${t.x.toFixed(3)}" y="${t.y.toFixed(3)}" width="${t.w.toFixed(3)}" height="${t.h.toFixed(3)}" rx="${t.radius.toFixed(3)}" fill="${t.ti < 0 ? LIGHT.core : LIGHT.dye[t.ti]}"/>`).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block;flex:none" aria-hidden="true">${rects}</svg>`;
}

// ── 한 장 ─────────────────────────────────────────────────────────────────────

/** 종이(시트)의 모서리 — 'top'(위 둘) · 'tl'(왼쪽 위만) · 'tr'(오른쪽 위만) */
const corners = (round, r) => ({ top: `${r}px ${r}px 0 0`, tl: `${r}px 0 0 0`, tr: `0 ${r}px 0 0` }[round] || '0');

/**
 * 포스터 HTML.
 * - caption: { eyebrow, head: [줄1, 줄2] } · brand: 앱 이름(1번 아래에만)
 * - scene: { id, ground, brand? } · plan: scenes.js의 plan(L) 결과(picture가 있을 때)
 * - picture: { png, w, h } — 앱을 자른 그림, w · h는 놓을 크기(pt)
 * - widgets: widgetProps 값(위젯 장면)
 */
function composeHtml({ device, lang, scene, caption, brand, plan, picture, widgets, icon }) {
  const L = layout(device);
  const ground = GROUNDS[scene.ground] || GROUNDS.paper;
  const font = fontOf(lang);
  const track = lang === 'ja' ? '0.01em' : lang === 'en' ? '-0.02em' : '-0.03em';
  const capInk = scene.ground === 'mid' ? LIGHT.printStrong : LIGHT.print;
  const iconData = `data:image/png;base64,${(icon || fs.readFileSync(ICON)).toString('base64')}`;

  let body = '';
  if (picture && plan) {
    const src = `data:image/png;base64,${picture.png.toString('base64')}`;
    const s = plan.sheet;
    // 종이 위의 그림은 종이 안에 넣어 둥근 모서리로 함께 자른다
    const ox = s ? s.x : 0;
    const oy = s ? s.y : 0;
    const img = `<img class="pic" alt="" src="${src}" style="left:${plan.at.x - ox}px;top:${plan.at.y - oy}px;width:${picture.w}px;height:${picture.h}px">`;
    if (s) {
      const w = s.w == null ? L.W - s.x : s.w;
      body += `<div class="sheet" style="left:${s.x}px;top:${s.y}px;width:${w}px;height:${L.H - s.y}px;border-radius:${corners(s.round, s.radius)}">${img}</div>`;
    } else {
      body += img;
    }
  }
  if (widgets) body += widgetsBlock(L, widgets, iconData).html;
  if (scene.brand && brand) {
    const size = Math.round((L.pad ? 30 : 22) * (L.pad ? 1 : L.s));
    const fs2 = half((L.pad ? 21 : 15) * (L.pad ? 1 : L.s));
    body += `<div class="brand" style="left:${L.m}px;bottom:${L.bottom}px;gap:${Math.round(size * 0.38)}px">${markSvg(size)}<span style="font:700 ${fs2}px/${size}px ${font};color:${LIGHT.printStrong};letter-spacing:${lang === 'ja' ? '0.02em' : '-0.01em'}">${esc(brand)}</span></div>`;
  }

  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">${lang === 'ja' ? '<link rel="stylesheet" href="/__jp/noto-sans-jp.css">' : ''}<style>
@font-face { font-family: 'Pretendard'; font-weight: 500; src: url('/__font/Pretendard-Medium.woff2') format('woff2'); }
@font-face { font-family: 'Pretendard'; font-weight: 600; src: url('/__font/Pretendard-SemiBold.woff2') format('woff2'); }
@font-face { font-family: 'Pretendard'; font-weight: 700; src: url('/__font/Pretendard-Bold.woff2') format('woff2'); }
${tokenVars(lang)}
${BASE_PARTS}
${widgets ? fs.readFileSync(WIDGET_CSS, 'utf8') : ''}
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: ${ground}; -webkit-font-smoothing: antialiased; }
.page { position: relative; width: ${L.W}px; height: ${L.H}px; overflow: hidden; background: ${ground}; }
.cap { position: absolute; left: ${L.m}px; right: ${L.m}px; top: ${L.eyebrow.top}px; margin: 0;
  font: 600 ${L.eyebrow.size}px/${L.eyebrow.line}px ${font}; color: ${capInk}; letter-spacing: ${lang === 'ja' ? '0.04em' : '0'}; white-space: nowrap; }
.head { position: absolute; left: ${L.m}px; right: ${L.m}px; top: ${L.head.top}px; margin: 0;
  font: 700 ${L.head.size}px/${L.head.line}px ${font}; color: ${LIGHT.ink}; letter-spacing: ${track};
  ${lang === 'ja' ? "font-feature-settings: 'palt' 1;" : ''} }
.head .ln { display: block; white-space: nowrap; width: max-content; }
.sheet { position: absolute; overflow: hidden; background: ${LIGHT.paper}; }
.pic { position: absolute; display: block; }
.brand { position: absolute; display: flex; align-items: center; }
.home { position: absolute; width: 0; height: 0; transform-origin: 0 0; }
.app { position: absolute; width: 60px; height: 60px; border-radius: 13.5px; overflow: hidden; background: rgba(255, 255, 255, 0.42); }
.app-ours { background: ${LIGHT.paper}; box-shadow: ${LIGHT.float}; }
.app img { display: block; width: 60px; height: 60px; }
/* 위젯 머리: 이름과 수 사이 최소 4(위젯의 Spacer(minLength: 4)) — 수가 길면 지도 폭보다 조금 넓어진다 */
.w-head { gap: 4px; white-space: nowrap; }
</style></head><body><div class="page">
<p class="cap">${esc(caption.eyebrow)}</p>
<h1 class="head">${caption.head.map((l) => `<span class="ln">${esc(l)}</span>`).join('')}</h1>
${body}
</div></body></html>`;
}

module.exports = { layout, composeHtml, widgetsBlock, widgetMap, tickThird, homeGrid, GROUNDS, fontOf };
