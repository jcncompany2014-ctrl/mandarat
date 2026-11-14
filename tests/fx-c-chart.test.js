require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { cellLabel, areaLabel } = require('../src/lib/chartSpeech');

const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('cellLabel — 서수 · 글 · 소리 말 · 오늘 · 달성, 빈 칸', () => {
  assert.equal(
    cellLabel({ ai: 2, text: '하루 물 2L', meta: { speech: '이번 주 3회 중 2회' }, isToday: true, didIt: false, done: false }),
    '세 번째 칸, 하루 물 2L, 이번 주 3회 중 2회, 오늘 할 일',
  );
  assert.equal(cellLabel({ ai: 0, text: '책', meta: null, isToday: true, didIt: true, done: true }), '첫 번째 칸, 책, 오늘 했어요, 달성');
  assert.equal(cellLabel({ ai: 7, text: '', meta: null, isToday: false, didIt: false, done: false }), '여덟 번째 칸, 비어 있음');
});

test('areaLabel — 슬래시 없이 소리 말로', () => {
  assert.equal(areaLabel('건강', 5, 3, 2), '건강, 8칸 중 3칸 달성, 오늘 2칸');
  assert.equal(areaLabel('건강', 5, 3, 0), '건강, 8칸 중 3칸 달성');
  assert.equal(areaLabel('영역 2', 0, 0, 0), '영역 2, 실천을 아직 적지 않았어요');
});

test('홈 81칸은 doc 대신 themes, 칸은 memo(색 지도의 Tile)', () => {
  const d = src('src/screens/Dashboard.tsx');
  // 디자인 A(S1): 히어로의 작은 색 지도 — ColourMap L1, 칸 20(좁은 폰 18), 문서 대신 themes만
  assert.match(d, /<ColourMap\s+level="L1"\s+cell=\{cell\}\s+themes=\{doc\.themes\}/);
  assert.doesNotMatch(d, /cellShape/);
  assert.match(d, /todaySig/);
  assert.match(d, /canPickAny\(doc, new Date\(\)\)/);
  assert.doesNotMatch(d, /pickSections/);
  assert.doesNotMatch(d, /disabled=\{!pressable\}/);
  const g = src('src/components/GridMark.tsx');
  assert.match(g, /export const MiniChart = memo\(function MiniChart\(/);
  assert.match(g, /<ColourMap\s+level="L1"/);
  const c = src('src/components/chart/ColourMap.tsx');
  assert.match(c, /export const ColourMap = memo\(function ColourMap\(/);
  assert.match(c, /const Tile = memo\(/);
});

test('지도 묶음 · 영역 화면은 memo, 크게 보기 · 접기의 화면 읽기 초점은 GridScreen', () => {
  // 디자인 A(S2): 81칸은 색 지도(ColourMap — 칸마다 memo). 지도 묶음(FullGrid) · 영역 화면(AreaPage)도 memo,
  // 크게 보기 · 접기의 화면 읽기 초점 옮기기는 GridScreen
  const f = src('src/screens/FullGrid.tsx');
  assert.match(f, /export const FullGrid = memo\(function FullGrid\(/);
  assert.match(src('src/screens/area/AreaPage.tsx'), /export const AreaPage = memo\(function AreaPage\(/);
  assert.match(src('src/screens/GridScreen.tsx'), /sendAccessibilityEvent\(node, 'focus'\)/);
  assert.doesNotMatch(f, /금색 네모는 오늘/);
});

test('만다라트 탭 · 공유 시트는 나눠 읽는 훅을 쓴다', () => {
  for (const f of ['src/screens/GridScreen.tsx', 'src/overlays/ShareChart.tsx']) {
    assert.doesNotMatch(src(f), /\buseMandarat\(\)|\buseUI\(\)/, f);
  }
});
