// 만다라트 탭의 기억 — 크게 볼 블록, 처음 한 번 안내, 새로 달성한 칸 칠하기, 옆으로 밀기
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { gridMemory, showGridAt, takeFreshDone, resetGridMemory, swipeStep, stepArea } = require('../src/screens/gridMemory');

test('showGridAt은 크게 볼 블록만 정한다(보기 전환은 없다)', () => {
  resetGridMemory();
  showGridAt(3);
  assert.equal(gridMemory.focus, 3);
  showGridAt('c');
  assert.equal(gridMemory.focus, 'c');
  showGridAt(null);
  assert.equal(gridMemory.focus, null);
  assert.equal('view' in gridMemory, false);
  assert.equal(gridMemory.zoomedOnce, false);
});

test('처음 본 표는 칠하지 않고, 그 뒤 새로 달성한 칸만 한 번 칠한다', () => {
  resetGridMemory();
  assert.deepEqual(takeFreshDone(['0-0', '1-2']), []);
  assert.deepEqual(takeFreshDone(['0-0', '1-2']), []);
  assert.deepEqual(takeFreshDone(['0-0', '1-2', '4-5']), ['4-5']);
  assert.deepEqual(takeFreshDone(['0-0', '1-2', '4-5']), []);
});

test('달성을 풀었다가 다시 달성하면 또 칠한다', () => {
  resetGridMemory();
  takeFreshDone(['0-0', '2-3']);
  assert.deepEqual(takeFreshDone(['0-0']), []);
  assert.equal(gridMemory.seenDone.has('2-3'), false);
  assert.deepEqual(takeFreshDone(['0-0', '2-3']), ['2-3']);
});

test('가로로 민 거리·속도로 이웃 영역을 고른다', () => {
  assert.equal(swipeStep(-61, 0), 1);
  assert.equal(swipeStep(61, 0), -1);
  assert.equal(swipeStep(-20, -0.7), 1);
  assert.equal(swipeStep(20, 0.7), -1);
  assert.equal(swipeStep(-60, -0.6), 0);
  assert.equal(swipeStep(30, 0.2), 0);
});

test('영역은 8개를 돌아서 넘긴다', () => {
  assert.equal(stepArea(7, 1), 0);
  assert.equal(stepArea(0, -1), 7);
  assert.equal(stepArea(3, 1), 4);
});
