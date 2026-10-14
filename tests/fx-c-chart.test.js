require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { cellLabel, areaLabel, areaTodayCounts } = require('../src/lib/chartSpeech');

const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('cellLabel — 서수 · 글 · 소리 말 · 오늘 · 달성, 빈 칸', () => {
  assert.equal(
    cellLabel({ ai: 2, text: '하루 물 2L', meta: { speech: '이번 주 3회 중 2회' }, isToday: true, didIt: false, done: false }),
    '세 번째 칸, 하루 물 2L, 이번 주 3회 중 2회, 오늘 할 일',
  );
  assert.equal(cellLabel({ ai: 0, text: '책', meta: null, isToday: true, didIt: true, done: true }), '첫 번째 칸, 책, 오늘 했어요, 달성');
  assert.equal(cellLabel({ ai: 7, text: '', meta: null, isToday: false, didIt: false, done: false }), '여덟 번째 칸, 비어 있음');
});

test('areaLabel · areaTodayCounts — 슬래시 없이 소리 말로', () => {
  assert.equal(areaLabel('건강', 5, 3, 2), '건강, 8칸 중 3칸 달성, 오늘 2칸');
  assert.equal(areaLabel('건강', 5, 3, 0), '건강, 8칸 중 3칸 달성');
  assert.equal(areaLabel('영역 2', 0, 0, 0), '영역 2, 실천을 아직 적지 않았어요');
  assert.deepEqual(areaTodayCounts(['0-1', '0-3', '7-0', 'x9']), [2, 0, 0, 0, 0, 0, 0, 1]);
});

test('홈 81칸은 doc 대신 themes · cellShape, 칸은 memo(MiniCell), 괘선은 Rules', () => {
  const d = src('src/screens/Dashboard.tsx');
  assert.match(d, /<MiniChart\s+themes=\{doc\.themes\}\s+cellShape=\{doc\.settings\.cellShape\}/);
  assert.match(d, /todaySig/);
  assert.match(d, /canPickAny\(doc, new Date\(\)\)/);
  assert.doesNotMatch(d, /pickSections/);
  assert.doesNotMatch(d, /disabled=\{!pressable\}/);
  const g = src('src/components/GridMark.tsx');
  assert.match(g, /const MiniCell = memo\(/);
  assert.match(g, /const Rules = memo\(/);
});

test('영역 보드는 칸마다 memo, 유형 한 줄은 1.3배까지, 소리 말은 speech', () => {
  const b = src('src/components/ChartBoard.tsx');
  assert.match(b, /const BoardCell = memo\(/);
  assert.match(b, /maxFontSizeMultiplier=\{META_MAX_SCALE\}/);
  assert.match(b, /META_ROW \* fit\.metaScale/);
  assert.match(b, /useScreenReader\(\)/);
  assert.doesNotMatch(b, /cellSpeech\(|blockSummary\(/);
  const f = src('src/screens/FullGrid.tsx');
  assert.match(f, /const Block = memo\(/);
  assert.match(f, /sendAccessibilityEvent\(node, 'focus'\)/);
  assert.doesNotMatch(f, /금색 네모는 오늘/);
});

test('만다라트 탭 · 공유 시트는 나눠 읽는 훅을 쓴다', () => {
  for (const f of ['src/screens/GridScreen.tsx', 'src/overlays/ShareChart.tsx']) {
    assert.doesNotMatch(src(f), /\buseMandarat\(\)|\buseUI\(\)/, f);
  }
});
