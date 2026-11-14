require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  todayAreaTabs, effectiveArea, todayEmptyKind, dayCloseText,
} = require('../src/lib/todayList');
const { BANNED_COPY } = require('../src/lib/copy');

const blank = () => ({ text: '' });
const themes = (fill = {}) =>
  Array.from({ length: 8 }, (_, ti) => ({
    title: `영역 ${ti + 1}`,
    color: '#000000',
    actions: Array.from({ length: 8 }, (_, ai) => fill[`${ti}-${ai}`] ?? blank()),
  }));

test('색인 탭 — 할 일이 있는 영역만, 영역 순서대로, 실천 줄과 직접 추가를 함께 센다 (today-7 · today-8)', () => {
  const tabs = todayAreaTabs([{ ti: 3 }, { ti: 0 }, { ti: 3 }], [{ ti: 5 }, { ti: 0 }]);
  assert.deepEqual(tabs, [{ ti: 0, count: 2 }, { ti: 3, count: 2 }, { ti: 5, count: 1 }]);
  assert.deepEqual(todayAreaTabs([], []), []);
});

test('고른 영역이 비면 전체로 돌아간다', () => {
  const tabs = [{ ti: 1, count: 2 }];
  assert.equal(effectiveArea(null, tabs), null);
  assert.equal(effectiveArea(1, tabs), 1);
  assert.equal(effectiveArea(4, tabs), null);
  assert.equal(effectiveArea(1, []), null);
});

test('빈 목록 — 채우기 · 고르기 · 다 담음 (today-17 · flow-4)', () => {
  assert.equal(todayEmptyKind({ themes: themes() }, false), 'fill');
  assert.equal(todayEmptyKind({ themes: themes() }, true), 'fill');
  const filled = { themes: themes({ '2-4': { text: '물 마시기' } }) };
  assert.equal(todayEmptyKind(filled, true), 'pick');
  assert.equal(todayEmptyKind(filled, false), 'allIn');
  // 띄어쓰기만 있는 칸은 빈 칸
  assert.equal(todayEmptyKind({ themes: themes({ '0-0': { text: '  ' } }) }, true), 'fill');
});

test('마감 줄 글 (ref-u2)', () => {
  const t = dayCloseText(new Date(2026, 9, 14), 10);
  assert.equal(t.left, '10월 14일 수요일 마감');
  assert.equal(t.right, '10 / 10');
  assert.equal(t.speech, '10월 14일 수요일 마감, 오늘 할 일 10개를 다 했어요');
  for (const w of BANNED_COPY) assert.ok(!t.speech.includes(w), w);
});
