// O5 · 공유와 인쇄(build-plan §1 share · §2.7 print) — 표 이미지 share.png, 인쇄물 chart-text.png의 그림.
// 표 이미지: 540×675(1080×1350px), 늘 LIGHT, 제목 = 핵심 목표, L2 색 지도(본문 폭 468, 이름은 피드 크기 13/16), 발에 마크 + 날짜.
// 인쇄물: 부드러운 칸, 영역 이름 = 물감 + 흰 글씨, 달성 = wash, 적은 칸 = tint, 빈 칸 = 흰 종이 + printMid 0.5pt, 강조색 없음,
// 다 이룬 블록은 1.5pt 먹 테두리, 흑백으로 찍어도 읽힌다(글과 바탕의 대비).
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { LIGHT } = require('../src/theme/tokens');
const { msg } = require('../src/i18n');
const P = require('../src/lib/poster');
const S = require('../src/lib/printSheet');
const { mapGeometry } = require('../src/components/chart/geometry');
const { demoDoc } = require('../scripts/smoke/demoDoc');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const NOW = new Date(2026, 9, 14, 9, 30);
const render = (doc, o = {}) => S.printHtml(doc, { paper: 'A4', layout: 'chart', blank: false, now: NOW, lang: 'ko', fontCss: '', ...o });
const count = (s, re) => (s.match(re) || []).length;

/** WCAG 상대 휘도 · 대비 — 흑백 인쇄는 휘도를 회색으로 옮기므로 이 대비가 그대로 남는다 */
const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** 0번 영역을 8칸 모두 적고 달성한 문서 */
function finishedDoc() {
  const doc = demoDoc();
  doc.themes[0].actions.forEach((a, i) => {
    if (!a.text.trim()) a.text = `일 ${i}`;
    a.done = true;
  });
  return doc;
}

// ── 표 이미지 ─────────────────────────────────────────────────────────────────

test('표 이미지의 자리 — share.html 값 그대로, 지도는 본문 폭 468', () => {
  assert.deepEqual([P.POSTER_W, P.POSTER_H, P.POSTER_RATIO], [540, 675, 2]);
  assert.deepEqual([P.POSTER.pad, P.POSTER.top, P.POSTER.bottom, P.POSTER.mapTop, P.POSTER.footH], [36, 34, 30, 22, 24]);
  assert.equal(P.POSTER_MAP, 468);
  assert.deepEqual([P.POSTER.eyebrowFs, P.POSTER.eyebrowLh, P.POSTER.figFs, P.POSTER.figLh, P.POSTER.unitFs, P.POSTER.mark], [15, 20, 24, 30, 14, 22]);
  // 지도는 2배 픽셀에 맞춰도 바깥 크기가 468 그대로
  assert.equal(mapGeometry({ level: 'L2', width: P.POSTER_MAP, ratio: P.POSTER_RATIO }).size, 468);
  // 한 줄 제목이든 두 줄 제목이든 지도와 발이 한 장 안에 든다
  for (const lh of [54, 2 * 34]) {
    const mapEnd = P.POSTER.top + P.POSTER.eyebrowLh + P.POSTER.headGap + lh + P.POSTER.mapTop + P.POSTER_MAP;
    assert.ok(mapEnd <= P.POSTER_H - P.POSTER.bottom - P.POSTER.footH, `제목 ${lh}: ${mapEnd}`);
  }
});

test('지도의 이름은 피드 크기 — 영역 이름 13/16, 핵심 목표 13.5/16, 화면의 지도와 같은 자리에서 끊긴다', () => {
  const g = mapGeometry({ level: 'L2', width: P.POSTER_MAP, ratio: P.POSTER_RATIO });
  const c = g.cells[1];
  const head = P.posterLabel('건강', 'head', c, c, 'ko');
  assert.deepEqual([head.text, head.fs, head.lh], ['건강', 13, 16]);
  assert.equal(P.posterLabel('자기계발', 'head', c, c, 'ko').text, '자기\n계발');
  assert.equal(P.posterLabel('마음챙김', 'head', c, c, 'ko').text, '마음\n챙김');
  const core = P.posterLabel('단단한 한 해', 'core', c, c, 'ko');
  // 한 음절 낱말은 옆 낱말에 붙는다(한\u00a0해 — 목업 A.keep)
  assert.deepEqual([core.text, core.fs, core.lh], ['단단한\n한\u00a0해', 13.5, 16]);
  // 360pt 피드에서도 영역 이름이 8.5pt 넘게
  assert.ok(head.fs * (360 / P.POSTER_W) >= 8.5);
  // 긴 이름도 칸 안에 — 영어 · 일본어 기본 이름
  for (const [t, l] of [['Relationships', 'en'], ['人間関係', 'ja'], ['自己成長', 'ja']]) {
    const lab = P.posterLabel(t, 'head', c, c, l);
    assert.equal(lab.cut, false, t);
    assert.ok(lab.lines * lab.lh <= c, `${t}: ${lab.lines} × ${lab.lh}`);
  }
});

test('제목은 한 줄에 드는 가장 큰 크기(44~28), 넘치면 28/34 두 줄 — 빈 표는 숫자가 없어 자리가 넓다', () => {
  assert.deepEqual(P.posterGoal('단단한 한 해', '24/64', '칸', 'ko'), { fs: 44, lh: 54, letterSpacing: -1.54, lines: 1 });
  const mid = P.posterGoal('매일 조금씩 더 나은 내가 되는 한 해', '24/64', '칸', 'ko');
  assert.equal(mid.lines, 2);
  assert.equal(P.posterGoal('매일 조금씩 더 나은 내가 되는 한 해', '', '칸', 'ko').lines, 1);
  assert.deepEqual(P.posterGoal('x'.repeat(80), '24/64', '칸', 'ko'), { fs: 28, lh: 34, letterSpacing: -0.98, lines: 2 });
  assert.equal(P.posterFigure(24), '24/64');
});

test('ChartPoster: 늘 LIGHT · G의 지도 칸 색(mapFill) · 마크 · 날짜, 강조색과 오늘 표시 없음', () => {
  const s = src('src/components/ChartPoster.tsx');
  assert.match(s, /const T: Tokens = LIGHT;/);
  assert.doesNotMatch(s, /usePalette|MOODS|GOLD|legibleMark|headBg|DONE_INK/);
  assert.match(s, /import \{ Mark, mapFill, mapGeometry \} from '\.\/chart';/);
  assert.match(s, /mapFill\(c, T, 'L2'\)/);
  assert.match(s, /blank && c\.kind === 'action' \? T\.tile/);
  assert.match(s, /<Mark variant="heart" size=\{k\.mark\} tokens=\{T\} \/>/);
  assert.match(s, /m\.print\.posterEyebrow\(\{ y: now\.getFullYear\(\) \}\)/);
  assert.match(s, /posterDate\(now, l\)/);
  assert.doesNotMatch(s, /today|signal/);
  assert.match(s, /maxFontSizeMultiplier: 1, allowFontScaling: false/);
});

test('ShareChart: 진행 표시 · 빈 표는 Segment, 머리 줄 · 단추는 C의 시트 부품, 찍을 원본은 540×675 그대로', () => {
  const s = src('src/overlays/ShareChart.tsx');
  assert.match(s, /<Segment\b/);
  assert.doesNotMatch(s, /SegmentedControl|CloseBtn|PrimaryButton/);
  assert.match(s, /header=\{<SheetHeader M=\{M\} title=\{m\.chart\.shareTitle\} \/>\}/);
  assert.match(s, /<Button M=\{M\} label=\{m\.chart\.saveShare\} onPress=\{save\} disabled=\{busy\} \/>/);
  assert.match(s, /<ChartPoster doc=\{doc\} blank=\{blank\} now=\{now\} scale=\{scale\} \/>/);
  assert.match(s, /<ChartPoster ref=\{posterRef\} doc=\{doc\} blank=\{blank\} now=\{now\} \/>/);
  assert.match(s, /return \{ width: POSTER_PX\.width \/ r, height: POSTER_PX\.height \/ r \};/);
  // 미리보기도 치수로 줄인다(transform 없음)
  assert.doesNotMatch(s, /transform: \[/);
});

test('말 — 표 이미지 머리 줄 · 단위(세 언어)', () => {
  assert.equal(msg('ko').print.posterEyebrow({ y: 2026 }), '2026 핵심 목표');
  assert.equal(msg('ja').print.posterEyebrow({ y: 2026 }), '2026年の中心の目標');
  assert.equal(msg('en').print.posterEyebrow({ y: 2026 }), 'Core goal for 2026');
  assert.deepEqual(['ko', 'ja', 'en'].map((l) => msg(l).print.posterUnit), ['칸', 'マス', 'squares']);
});

// ── 인쇄물 ───────────────────────────────────────────────────────────────────

test('칸의 칠 — 영역 이름은 물감 + 흰 글씨, 달성 wash, 적은 칸 tint, 빈 칸은 흰 종이 + 테두리, 가운데 core', () => {
  assert.deepEqual(S.tileColors('core', -1, false), { bg: LIGHT.core, ink: LIGHT.onCore, edge: false });
  for (let ti = 0; ti < 8; ti++) {
    assert.deepEqual(S.tileColors('head', ti, false), { bg: LIGHT.dye[ti], ink: LIGHT.onDye, edge: false });
    assert.deepEqual(S.tileColors('action', ti, true), { bg: LIGHT.wash[ti], ink: LIGHT.ink, edge: false });
    assert.deepEqual(S.tileColors('action', ti, false), { bg: LIGHT.tint[ti], ink: LIGHT.ink, edge: false });
  }
  assert.deepEqual(S.tileColors('empty', 3, false), { bg: LIGHT.paper, ink: LIGHT.ink, edge: true });

  const doc = demoDoc();
  const { html } = render(doc);
  const table = html.slice(html.indexOf('<table class="t81">'), html.indexOf('</table>'));
  assert.equal(count(table, /class="[^"]*\bhead\b[^"]*"><div class="in" style="background:#[0-9A-F]{6};color:#FFFFFF">/g), 16);
  doc.themes.forEach((th, ti) => {
    const written = th.actions.filter((a) => a.text.trim() && !a.done).length;
    const done = th.actions.filter((a) => a.text.trim() && a.done).length;
    assert.equal(count(table, new RegExp(`style="background:${LIGHT.dye[ti]};color:${LIGHT.onDye}"`, 'g')), 2, `영역 ${ti} 이름표 둘`);
    assert.equal(count(table, new RegExp(`style="background:${LIGHT.wash[ti]};color:${LIGHT.ink}"`, 'g')), done, `영역 ${ti} 달성`);
    assert.equal(count(table, new RegExp(`style="background:${LIGHT.tint[ti]};color:${LIGHT.ink}"`, 'g')), written, `영역 ${ti} 적은 칸`);
  });
  // 빈 칸은 회색을 칠하지 않는다 — 흰 종이에 printMid 0.5pt 테두리
  assert.ok(!table.includes(`background:${LIGHT.tile}`));
  assert.ok(html.includes(`.empty .in{border:0.5pt solid ${LIGHT.printMid}}`));
  // 괘선 없음 — 칸 사이는 틈
  assert.doesNotMatch(html, /border-collapse:collapse;table-layout|\.t81 \.k\d\{border-left/);
});

test('흑백으로 찍어도 읽힌다 — 칸의 글과 바탕, 종이 위의 글이 모두 4.5:1 넘게, 달성 · 적은 칸은 회색으로도 갈린다', () => {
  for (const [layout, blank] of [['chart', false], ['chart', true], ['areas', false]]) {
    const { html } = render(demoDoc(), { layout, blank });
    const pairs = [...html.matchAll(/background:(#[0-9A-F]{6});color:(#[0-9A-F]{6})/gi)];
    assert.ok(pairs.length > 0);
    for (const [, bg, ink] of pairs) assert.ok(contrast(bg, ink) >= 4.5, `${layout}: ${ink} on ${bg} ${contrast(bg, ink).toFixed(2)}`);
    // 종이 위 글(머리말 · 달성 수 · 유형 · 꼬리말 …)
    const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
    for (const [, c] of css.matchAll(/[;{]color:(#[0-9A-F]{6})/gi)) assert.ok(contrast(c, LIGHT.paper) >= 4.5, `${c} on paper`);
  }
  for (let ti = 0; ti < 8; ti++) assert.ok(contrast(LIGHT.wash[ti], LIGHT.tint[ti]) >= 1.35, `영역 ${ti}: wash ↔ tint`);
});

test('강조색 없음 — 다 이룬 블록은 1.5pt 먹 테두리를 블록 안쪽에(블록 칸 셋 + 틈 둘 폭)', () => {
  const doc = finishedDoc();
  const { html } = render(doc, { accent: '#B0883C' });
  assert.ok(!/#B0883C|gold/i.test(html));
  assert.ok(html.includes(`.finframe{position:absolute;border:1.5pt solid ${LIGHT.ink};`));
  const g = S.sheetTiles(515 * ((595.28 - 2 * 40) / 515));
  const span = Math.round((3 * g.cell + 2 * g.gap) * 100) / 100;
  // 영역 0은 왼쪽 위 블록
  assert.ok(html.includes(`<div class="finframe" style="left:0pt;top:0pt;width:${span}pt;height:${span}pt"></div>`), html.match(/<div class="finframe"[^>]*>/)?.[0]);
});

test('81칸의 자리 — 칸 아홉과 틈(칸 사이 2 · 블록 사이 6.5, 374 폭 기준)의 합이 표 폭 그대로', () => {
  for (const side of [345, 515, 760]) {
    const g = S.sheetTiles(side);
    assert.ok(Math.abs(9 * g.cell + 6 * g.gap + 2 * g.blockGap - side) < 1e-9);
    assert.ok(Math.abs(g.blockGap / g.gap - 3.25) < 1e-9);
  }
  for (const paper of ['A4', 'A5', 'Letter']) {
    const { html } = render(demoDoc(), { paper });
    const side = parseFloat(html.match(/<div class="chart" style="width:([\d.]+)pt/)[1]);
    const widths = [...html.matchAll(/\.t81 \.k\d\{width:([\d.]+)pt/g)].map((x) => parseFloat(x[1]));
    assert.equal(widths.length, 9);
    assert.ok(Math.abs(widths.reduce((a, b) => a + b, 0) - side) < 0.1, `${paper}: ${widths.join('+')} ≠ ${side}`);
  }
});

test('빈 표 — 실천 64칸은 모두 흰 빈 칸, 이름표 16칸은 물감 그대로', () => {
  const { html } = render(demoDoc(), { blank: true });
  const table = html.slice(html.indexOf('<table class="t81">'), html.indexOf('</table>'));
  assert.equal(count(table, /class="[^"]*\bempty\b/g), 64);
  assert.equal(count(table, /class="[^"]*\bhead\b/g), 16);
  for (let ti = 0; ti < 8; ti++) {
    assert.ok(!table.includes(`background:${LIGHT.wash[ti]}`) && !table.includes(`background:${LIGHT.tint[ti]}`), `영역 ${ti}`);
  }
});

test('표지 · 영역 쪽도 같은 칠 — 표지 이름표는 물감, 달성한 실천의 체크 칸은 wash + 물감 가장자리', () => {
  const doc = demoDoc();
  const { html } = render(doc, { layout: 'areas' });
  const cover = html.slice(html.indexOf('<table class="t9 cover">'), html.indexOf('</table>'));
  assert.equal(count(cover, /<td /g), 9);
  for (let ti = 0; ti < 8; ti++) assert.equal(count(cover, new RegExp(`background:${LIGHT.dye[ti]};color:${LIGHT.onDye}`, 'g')), 1, `영역 ${ti}`);
  assert.ok(cover.includes(`background:${LIGHT.core};color:${LIGHT.onCore}`));
  const done0 = doc.themes[0].actions.filter((a) => a.text.trim() && a.done).length;
  assert.equal(count(html, new RegExp(`<i class="chk on" style="background:${LIGHT.wash[0]};border-color:${LIGHT.dye[0]}"></i>`, 'g')), done0);
  assert.equal(count(html, /<table class="t9 small">/g), 8);
});

test('PrintSheet: 강조색을 넘기지 않고, 고른 것 한 줄은 머리 줄 둘째 줄, 단추는 바닥에', () => {
  const s = src('src/overlays/PrintSheet.tsx');
  assert.doesNotMatch(s, /accent|M\.gold/);
  assert.match(s, /header=\{<SheetHeader M=\{M\} title=\{m\.print\.sheetHead\} sub=\{summary\} \/>\}/);
  assert.match(s, /footer=\{<PrintActions /);
  assert.match(s, /<Section M=\{M\} label=\{m\.print\.paperHead\}/);
  assert.match(s, /<Section M=\{M\} label=\{m\.print\.layoutHead\}/);
  // 잠긴 줄은 설명 끝에 '프로' 한 낱말 — 배지 · 자물쇠 없음
  assert.match(s, /locked \? `\$\{sub\}\$\{m\.core\.dot\}\$\{m\.print\.pro\}` : sub/);
});

test('스모크: 공유 이미지(진행 · 빈 표)를 찍는다', () => {
  const s = src('scripts/smoke/yearSheet.js');
  assert.match(s, /h\.shot\('share-poster'\)/);
  assert.match(s, /h\.shot\('share-poster-blank'\)/);
});
