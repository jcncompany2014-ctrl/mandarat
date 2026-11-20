// 한 해 화면의 무게 — 움직이지 않는 그림은 칸마다 View 대신 Svg 길로(lib/tilePath · MapThumb · YearLedger).
// 장부의 칸 자리는 tests/yearClose.test.js('장부 그림')가, '더 보기'는 tests/moreLists.test.js가 본다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const { roundRectPath, tilePaths } = require('../src/lib/tilePath');
const { mapGeometry } = require('../src/components/chart/geometry');
const { mapCells } = require('../src/lib/mapCells');
const { LIGHT, DARK } = require('../src/theme/tokens');
const { blankDoc, sampleThemes } = require('../src/data/defaults');
const { msg } = require('../src/i18n');

const THUMB = 'src/screens/year/MapThumb.tsx';
const REVIEW = 'src/screens/year/YearReview.tsx';
const SHELF = 'src/screens/year/YearShelf.tsx';

/** 길 글자 → 네모들 { x0, y0, x1, y1, r } */
function rectsOf(d) {
  return d.split('z').filter(Boolean).map((sub) => {
    const m = /^M([\d.]+) ([\d.]+)H[\d.]+A([\d.]+) [\d.]+ 0 0 1 ([\d.]+) [\d.]+V[\d.]+A[\d.]+ [\d.]+ 0 0 1 [\d.]+ ([\d.]+)H[\d.]+A[\d.]+ [\d.]+ 0 0 1 ([\d.]+) [\d.]+V[\d.]+A[\d.]+ [\d.]+ 0 0 1 [\d.]+ [\d.]+$/.exec(sub);
    assert.ok(m, sub);
    const [, y0, r, x1, y1, x0] = m.slice(1).map(Number);
    return { x0, y0, x1, y1, r };
  });
}

const r3 = (v) => Math.round(v * 1000) / 1000;

// ── 길 ──────────────────────────────────────────────────────────────────────

test('roundRectPath: 닫힌 둥근 네모 하나 — 절대 좌표, 원호 넷, 반지름은 짧은 변의 반까지', () => {
  assert.equal(
    roundRectPath(10, 20, 8, 6, 2),
    'M12 20H16A2 2 0 0 1 18 22V24A2 2 0 0 1 16 26H12A2 2 0 0 1 10 24V22A2 2 0 0 1 12 20z',
  );
  // 반지름이 크면 짧은 변의 반으로(View의 borderRadius도 그렇게 줄어든다)
  assert.deepEqual(rectsOf(roundRectPath(0, 0, 4, 10, 9))[0], { x0: 0, y0: 0, x1: 4, y1: 10, r: 2 });
  // 모서리가 없으면 네모
  assert.equal(roundRectPath(1, 2, 3, 4, 0), 'M1 2H4V6H1z');
  // 크기가 없는 칸은 그리지 않는다
  assert.equal(roundRectPath(1, 2, 0, 4, 2), '');
  assert.equal(roundRectPath(1, 2, 3, -1, 2), '');
  assert.equal(roundRectPath(1, 2, Number.NaN, 4, 2), '');
  // 3배 화면의 1/3pt 자리도 0.0005pt 안쪽 — 변이 밀리지 않는다
  const q = rectsOf(roundRectPath(30 + 2 / 3, 7 + 2 / 3, 8 + 2 / 3, 8 + 2 / 3, 2))[0];
  assert.deepEqual(q, { x0: 30.667, y0: 7.667, x1: 39.333, y1: 16.333, r: 2 });
  assert.doesNotMatch(roundRectPath(-0.0001, 0, 5, 5, 1), /-0\b/);
});

test('tilePaths: 색마다 길 하나 — 색은 처음 나온 차례, 칸은 받은 차례', () => {
  const tiles = [
    { x: 0, y: 0, w: 4, h: 4, fill: 'a' },
    { x: 5, y: 0, w: 4, h: 4, fill: 'b' },
    { x: 10, y: 0, w: 4, h: 4, fill: 'a' },
    { x: 15, y: 0, w: 0, h: 4, fill: 'c' },
  ];
  const out = tilePaths(tiles, 1);
  assert.deepEqual(out.map((p) => p.fill), ['a', 'b'], '크기 없는 칸뿐인 색은 길이 없다');
  assert.deepEqual(rectsOf(out[0].d).map((r) => r.x0), [0, 10]);
  assert.deepEqual(rectsOf(out[1].d).map((r) => r.x0), [5]);
  assert.deepEqual(tilePaths([], 1), []);
});

// ── 작은 색 지도(L1) ─────────────────────────────────────────────────────────

/** ColourMap의 칸 색(mapFill, L1)을 토큰으로 다시 적은 것 */
function fillOf(c, T) {
  if (c.kind === 'core') return T.core;
  if (c.kind !== 'action') return T.dye[c.ti];
  if (c.state === 'done') return T.washL1[c.ti];
  if (c.state === 'written') return T.tint[c.ti];
  return T.tile;
}

function sampleDoc() {
  const d = blankDoc();
  d.themes = sampleThemes();
  // 달성 · 적은 칸 · 빈 칸이 섞이게
  d.themes.forEach((th, ti) => th.actions.forEach((a, ai) => {
    a.done = (ti + ai) % 3 === 0;
    if ((ti * 3 + ai) % 5 === 0) { a.text = ''; a.done = false; }
  }));
  return d;
}

test('MapThumb: 칸 81개가 ColourMap L1과 같은 자리 · 같은 색 — 색마다 길 하나(많아야 26)', () => {
  const doc = sampleDoc();
  const cells = mapCells({ themes: doc.themes, centerGoal: '' });
  for (const T of [LIGHT, DARK]) {
    // 액자(칸 6~16pt) · 보관함 줄(폭 56pt), 2배 · 3배 화면
    for (const o of [{ cell: 8 }, { cell: 6 }, { cell: 11 }, { cell: 16 }, { width: 56 }]) {
      for (const ratio of [2, 3]) {
        const g = mapGeometry({ level: 'L1', ...o, ratio });
        // MapThumb이 길로 바꾸는 칸 — ColourMap의 tiles와 같은 식
        const tiles = cells.map((c) => ({ x: g.pos[c.col], y: g.pos[c.row], w: g.cells[c.col], h: g.cells[c.row], fill: fillOf(c, T) }));
        const paths = tilePaths(tiles, g.radius);
        const tag = `${JSON.stringify(o)}@${ratio} ${T.dark ? 'dark' : 'light'}`;
        assert.ok(paths.length <= 26, `${tag}: 길 ${paths.length}개`);
        assert.equal(new Set(paths.map((p) => p.fill)).size, paths.length, '색마다 하나');
        const drawn = paths.flatMap((p) => rectsOf(p.d).map((r) => ({ ...r, fill: p.fill })));
        assert.equal(drawn.length, 81, tag);
        const want = tiles.map((t) => ({ x0: r3(t.x), y0: r3(t.y), x1: r3(t.x + t.w), y1: r3(t.y + t.h), r: r3(Math.min(g.radius, t.w / 2, t.h / 2)), fill: t.fill }));
        const by = (a, b) => a.y0 - b.y0 || a.x0 - b.x0;
        assert.deepEqual(drawn.sort(by), want.sort(by), tag);
        // 변은 모두 온 픽셀(geometry가 맞춘 값 그대로) · 지도 밖으로 나가지 않는다
        for (const r of drawn) {
          for (const v of [r.x0, r.y0, r.x1, r.y1]) assert.ok(Math.abs(v * ratio - Math.round(v * ratio)) < 0.01, `${tag}: ${v}`);
          assert.ok(r.x0 >= 0 && r.y0 >= 0 && r.x1 <= g.size + 0.001 && r.y1 <= g.size + 0.001, tag);
        }
      }
    }
  }
});

test('MapThumb: Svg 하나 · 색마다 Path 하나, 칸마다 View가 없다 — 화면 읽기는 그림 하나(64칸 중 n칸 달성)', () => {
  const s = src(THUMB);
  assert.match(s, /export const MapThumb = memo\(function MapThumb\(/);
  // 자리와 색은 ColourMap L1과 같은 곳에서
  assert.match(s, /const g = mapGeometry\(\{ level: 'L1', width, cell, ratio: PixelRatio\.get\(\) \}\);/);
  assert.match(s, /cells\.map\(\(c\) => \(\{ x: g\.pos\[c\.col\], y: g\.pos\[c\.row\], w: g\.cells\[c\.col\], h: g\.cells\[c\.row\], fill: mapFill\(c, P, 'L1'\) \}\)\),\s*g\.radius,/);
  assert.equal((s.match(/<Svg /g) ?? []).length, 1);
  assert.match(s, /<Svg width=\{g\.size\} height=\{g\.size\}>\s*\{pic\.paths\.map\(\(p\) => <Path key=\{p\.fill\} d=\{p\.d\} fill=\{p\.fill\} \/>\)\}/);
  assert.equal((s.match(/<View\b/g) ?? []).length, 1, '바깥 틀 하나');
  assert.match(s, /style=\{\{ width: g\.size, height: g\.size \}\}/);
  // 칸의 상태가 같으면 다시 만들지 않는다
  assert.match(s, /const key = mapKey\(\{ themes \}\);/);
  assert.match(s, /\}, \[key, g, P\]\);/);
  // 화면 읽기 — ColourMap의 누를 수 없는 지도와 같은 말
  assert.match(s, /accessible\s+accessibilityRole="image"\s+accessibilityLabel=\{m\.chart\.markSay\(\{ done: pic\.done \}\)\}\s+\{\.\.\.a11yLangProp\(\)\}/);
  assert.equal(msg('ko').chart.markSay({ done: 24 }), '내 만다라트 81칸, 64칸 중 24칸 달성');
  // 손으로 적은 색이 없다
  assert.doesNotMatch(s, /#[0-9A-Fa-f]{3,8}\b|rgba?\(/);

  // 쓰는 곳 — 액자 넷(읽는 말은 액자가) · 보관함 줄(읽는 말은 줄이, 지도는 숨긴다)
  const review = src(REVIEW);
  assert.match(review, /accessible accessibilityLabel=\{m\.year\.frameSpeech\(\{ label, n \}\)\} \{\.\.\.a11yLangProp\(\)\}[^>]*>\s*\{\/\*[^*]*\*\/\}\s*<MapThumb themes=\{f\.themes\} cell=\{cell\} \/>/);
  assert.doesNotMatch(review, /level="L1"/);
  const shelf = src(SHELF);
  assert.match(shelf, /<View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">\s*<MapThumb themes=\{a\.themes\} width=\{MINI\} \/>/);
  assert.doesNotMatch(shelf, /ColourMap/);
});
