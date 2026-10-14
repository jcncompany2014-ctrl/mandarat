require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../src/lib/home');

test('isoWeek — 월요일 시작, 첫 목요일이 든 주가 1주', () => {
  assert.deepEqual(H.isoWeek(new Date(2026, 9, 14)), { year: 2026, week: 42 });
  assert.deepEqual(H.isoWeek(new Date(2026, 9, 12)), { year: 2026, week: 42 }); // 월
  assert.deepEqual(H.isoWeek(new Date(2026, 9, 18)), { year: 2026, week: 42 }); // 일
  assert.deepEqual(H.isoWeek(new Date(2026, 0, 1)), { year: 2026, week: 1 }); // 목
  assert.deepEqual(H.isoWeek(new Date(2027, 0, 1)), { year: 2026, week: 53 }); // 금 — 지난해 53주
  assert.deepEqual(H.isoWeek(new Date(2024, 11, 30)), { year: 2025, week: 1 }); // 월 — 다음 해 1주
});

test('daysLeftInYear — 오늘은 빼고 12월 31일까지', () => {
  assert.equal(H.daysLeftInYear(new Date(2026, 11, 31, 23)), 0);
  assert.equal(H.daysLeftInYear(new Date(2026, 11, 30)), 1);
  assert.equal(H.daysLeftInYear(new Date(2026, 9, 14)), 78);
  assert.equal(H.daysLeftInYear(new Date(2028, 0, 1)), 365); // 윤년
});

test('headerMeta — 해 · 주 / 올해 남은 날', () => {
  assert.deepEqual(H.headerMeta(new Date(2026, 9, 14)), { week: '2026 · 42주', left: '올해 78일 남음' });
});

test('tallyMarks — 다섯 획까지, 넘치면 +n', () => {
  assert.deepEqual(H.tallyMarks(0), { strokes: 0, extra: 0 });
  assert.deepEqual(H.tallyMarks(3), { strokes: 3, extra: 0 });
  assert.deepEqual(H.tallyMarks(5), { strokes: 5, extra: 0 });
  assert.deepEqual(H.tallyMarks(8), { strokes: 5, extra: 3 });
  assert.deepEqual(H.tallyMarks(-1), { strokes: 0, extra: 0 });
  assert.deepEqual(H.tallyMarks(NaN), { strokes: 0, extra: 0 });
});

const cell = (text, done = false) => ({ text, note: '', done });

test('areaLine — 다음 할 칸 · 빈 칸 · 모두 이룸', () => {
  const blank = Array.from({ length: 8 }, () => cell(''));
  assert.equal(H.areaLine({ actions: blank }), '빈 칸 8개');
  const some = blank.slice();
  some[0] = cell('하루 물 2L', true);
  some[2] = cell('  아침 산책 ');
  assert.equal(H.areaLine({ actions: some }), '다음 · 아침 산책');
  const doneOnly = blank.slice();
  doneOnly[1] = cell('이력서 갱신', true);
  assert.equal(H.areaLine({ actions: doneOnly }), '빈 칸 7개');
  const all = Array.from({ length: 8 }, (_, i) => cell(`칸 ${i}`, true));
  assert.equal(H.areaLine({ actions: all }), '8칸 모두 달성했어요');
});

test('homeGate — 가이드가 남아 있으면 빈 구역을 가린다', () => {
  assert.deepEqual(H.homeGate({ guideActive: true, todayTotal: 0, weekTotal: 0, filled: 0 }), { today: false, week: false, areas: false });
  assert.deepEqual(H.homeGate({ guideActive: true, todayTotal: 2, weekTotal: 1, filled: 8 }), { today: true, week: true, areas: true });
  assert.deepEqual(H.homeGate({ guideActive: true, todayTotal: 0, weekTotal: 0, filled: 7 }).areas, false);
  assert.deepEqual(H.homeGate({ guideActive: false, todayTotal: 0, weekTotal: 0, filled: 0 }), { today: true, week: true, areas: true });
});
