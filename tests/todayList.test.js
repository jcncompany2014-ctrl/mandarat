require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TALLY_MAX, todayAreaTabs, effectiveArea, isOverdue, tallyShape, todayEmptyKind, dayCloseText,
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

test('마감 지남 — 끝내지 않은 한 번짜리만', () => {
  const now = new Date(2026, 9, 14);
  const doc = {
    themes: themes({
      '0-0': { text: '보고서 내기', kind: 'once', due: '2026-10-13' },
      '0-1': { text: '서류 내기', kind: 'once', due: '2026-10-14' },
      '0-2': { text: '끝낸 일', kind: 'once', due: '2026-10-10', done: true },
      '0-3': { text: '책 읽기', kind: 'count', goal: 12, unit: '권', due: '2026-10-01' },
    }),
  };
  assert.equal(isOverdue(doc, { ti: 0, ai: 0 }, now), true);
  assert.equal(isOverdue(doc, { ti: 0, ai: 1 }, now), false);
  assert.equal(isOverdue(doc, { ti: 0, ai: 2 }, now), false);
  assert.equal(isOverdue(doc, { ti: 0, ai: 3 }, now), false);
  assert.equal(isOverdue(doc, { ti: 0, ai: 7 }, now), false);
});

test('집계 칸 — 30개까지 네모, 넘으면 막대 (today-up-3)', () => {
  assert.equal(tallyShape(0), 'none');
  assert.equal(tallyShape(1), 'boxes');
  assert.equal(tallyShape(TALLY_MAX), 'boxes');
  assert.equal(tallyShape(TALLY_MAX + 1), 'bar');
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
