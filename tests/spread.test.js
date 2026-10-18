// 두 쪽 펼침(V5-A) — 오른쪽 쪽 고르기, 81칸 표 폭 맞추기, 표는 한 장만, 끄는 줄
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const {
  SPREAD_ENABLED, BINDING_W, SPREAD_PAGE_MAX_W, companionFor, companionKey, fitTableW, modeFor, spreadPageW,
} = require('../src/lib/spread');

const SCREENS = ['dashboard', 'grid', 'detail', 'today', 'stats', 'settings', 'year'];

test('companionFor: 모든 화면 — 만다라트 탭이 아니면 오른쪽은 81칸 표', () => {
  for (const s of SCREENS.filter((x) => x !== 'grid')) {
    for (const ti of [null, 0, 3, 7]) assert.deepEqual(companionFor(s, ti), { screen: 'grid' }, `${s} ${ti}`);
  }
});

test('companionFor: 만다라트 탭 — 크게 보는 영역 블록이면 그 영역 화면, 아니면 홈', () => {
  for (let ti = 0; ti < 8; ti++) assert.deepEqual(companionFor('grid', ti), { screen: 'detail', ti });
  assert.deepEqual(companionFor('grid', null), { screen: 'dashboard' });
  assert.deepEqual(companionFor('grid', -1), { screen: 'dashboard' });
  assert.deepEqual(companionFor('grid', 8), { screen: 'dashboard' });
});

test('81칸 표는 한 장만 — 왼쪽과 오른쪽이 함께 표인 화면은 없다', () => {
  for (const s of SCREENS) {
    for (const ti of [null, 0, 5]) {
      const right = companionFor(s, ti).screen;
      assert.ok(!(s === 'grid' && right === 'grid'), `${s}/${ti}`);
    }
  }
  // Root에서 GridScreen을 그리는 곳은 왼쪽 쪽(화면) 하나와 오른쪽 쪽(companion.screen === 'grid') 하나뿐
  const root = src('src/navigation/Root.tsx');
  assert.equal((root.match(/<GridScreenPure\b/g) || []).length, 3, '왼쪽(펼침·한 단 두 갈래) + 오른쪽');
  assert.match(root, /if \(companion\.screen === 'grid'\) body = <GridScreenPure/);
  assert.match(root, /const companion = companionFor\(ui\.screen, focusTi\);/);
  // FullGrid는 GridScreen 안에만
  assert.equal((src('src/screens/GridScreen.tsx').match(/<FullGrid\b/g) || []).length, 1);
  for (const f of ['src/screens/Dashboard.tsx', 'src/screens/Detail.tsx', 'src/navigation/Root.tsx']) {
    assert.doesNotMatch(src(f), /<FullGrid\b/, f);
  }
});

test('companionKey: 곁들인 화면이 바뀔 때만 다른 열쇠', () => {
  assert.equal(companionKey({ screen: 'grid' }), 'grid');
  assert.equal(companionKey({ screen: 'dashboard' }), 'dashboard');
  assert.equal(companionKey({ screen: 'detail', ti: 2 }), 'detail-2');
  assert.notEqual(companionKey({ screen: 'detail', ti: 2 }), companionKey({ screen: 'detail', ti: 3 }));
});

test('fitTableW: 폰 크기는 그대로(390×844 → 368), 낮은 쪽에서는 표 높이가 들어가게 줄인다', () => {
  assert.equal(fitTableW(390 - 22, 844), 368);
  assert.equal(fitTableW(375 - 22, 667), 353);
  // 표 높이 = 폭 / 0.84 ≤ availH
  for (const [w, h] of [[572, 400], [618, 700], [491, 1100], [300, 10]]) {
    const t = fitTableW(w, h);
    assert.ok(t <= w, `${w}×${h}`);
    assert.ok(t / 0.84 <= h + 1e-9 || t === w, `${w}×${h} → ${t}`);
  }
  assert.equal(fitTableW(572, 400), 336);
  assert.equal(fitTableW(100, -50), 0);
});

test('끄는 줄: 꺼지면 펼침도 한 단, 폰 · 한 단은 그대로', () => {
  assert.equal(SPREAD_ENABLED, true);
  assert.equal(modeFor('spread', false), 'column');
  assert.equal(modeFor('spread', true), 'spread');
  assert.equal(modeFor('spread'), 'spread');
  for (const k of ['phone', 'column']) {
    assert.equal(modeFor(k, false), k);
    assert.equal(modeFor(k, true), k);
  }
  assert.match(src('src/lib/spread.ts'), /^export const SPREAD_ENABLED = true;$/m);
  // Root는 끄는 줄을 거친 배치(modeFor)로만 펼친다
  assert.match(src('src/navigation/Root.tsx'), /const mode = modeFor\(useLayout\(\)\.kind\);/);
});

test('쪽 폭: 제본(1·4·1)을 빼고 반, 640 상한', () => {
  assert.equal(BINDING_W, 6);
  assert.equal(spreadPageW(1032), 513);
  assert.equal(spreadPageW(1194), 594);
  assert.equal(spreadPageW(1376), SPREAD_PAGE_MAX_W);
  assert.equal(spreadPageW(2000), SPREAD_PAGE_MAX_W);
});

test('Root 펼침: 두 쪽 testID · 쪽마다 스크롤과 도트 · 그림자 없음 · 배치 태그', () => {
  const s = src('src/navigation/Root.tsx');
  assert.match(s, /testID=\{TID\.spreadLeft\}/);
  assert.match(s, /testID=\{TID\.spreadRight\}/);
  assert.match(s, /useEffect\(\(\) => \{ crash\.tag\('layout', mode\); \}, \[mode\]\);/);
  const comp = s.slice(s.indexOf('const CompanionPage = memo('), s.indexOf('const TAB_ORDER'));
  assert.match(comp, /<Animated\.ScrollView/);
  assert.match(comp, /<PaperDotsPure/);
  const spreadPart = s.slice(s.indexOf('두 쪽 펼침 — 펼친 수첩'), s.indexOf('const TAB_ORDER'));
  assert.doesNotMatch(spreadPart, /shadow|elevation|borderRadius|LinearGradient/);
  // 가장자리 쓸기(뒤로)는 왼쪽 쪽 하나에만
  assert.equal((s.match(/edgeSwipe\.panHandlers/g) || []).length, 1);
});

test('영역 화면 embedded: 뒤로 가기 · 제목 초점 · 이전/다음 없이', () => {
  const d = src('src/screens/Detail.tsx');
  assert.match(d, /export const Detail = memo\(function Detail\(\{ ti, embedded = false \}/);
  assert.match(d, /onBack=\{embedded \? undefined : back\}/);
  assert.match(d, /focusTitle=\{!embedded\}/);
  assert.match(d, /\{!embedded && \(\s*<View style=\{\{ marginHorizontal: RHYTHM\.gutter, height: 56/);
  assert.match(src('src/navigation/Root.tsx'), /<DetailPure ti=\{companion\.ti\} embedded \/>/);
});

test('FullGrid: availH가 있을 때만 표 폭을 줄이고, 크게 보는 영역을 알린다', () => {
  const f = src('src/screens/FullGrid.tsx');
  assert.match(f, /const fitW = availH != null \? fitTableW\(fullW, availH - GRID_CHROME\) : fullW;/);
  assert.match(f, /onFocusArea\?\.\(typeof focus === 'number' \? focus : null\);/);
  assert.match(f, /style=\{fitW < fullW \? \{ width: fitW, alignSelf: 'center' \} : null\}/);
  // 폰 · 한 단(펼침이 아닐 때)은 GridScreen에 availH를 주지 않는다
  assert.match(src('src/navigation/Root.tsx'), /screen = spread \? <GridScreenPure availH=\{pageH\} onFocusArea=\{setFocusTi\} \/> : <GridScreenPure \/>;/);
});
