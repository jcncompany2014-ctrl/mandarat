require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  sheetSubtitle, canBackfill, backfillToast, yesterdayOffer, canPostpone, postponedDue, POSTPONE, goalToast,
  noteChanged, memoRules, historyStartLabel, weekDayKey, dowOf,
} = require('../src/lib/actionSheet');

const WED = new Date(2026, 9, 14); // 수요일 — 이번 주는 10/12(월) ~ 10/18(일)
const MON = new Date(2026, 9, 12);

function doc(a, dayLog = {}) {
  const themes = Array.from({ length: 8 }, (_, i) => ({
    title: `영역${i}`, color: '#478058', icon: 'heart',
    actions: Array.from({ length: 8 }, () => ({ text: '', note: '', done: false })),
  }));
  themes[0].actions[0] = { note: '', done: false, ...a };
  return { centerGoal: '', themes, todayKeys: [], todayExtra: [], dayLog };
}

test('제목 아래 한 줄 — 정한 것만, 아래 블록을 되풀이하지 않는다', () => {
  assert.equal(sheetSubtitle(doc({ text: '산책', kind: 'habit', days: [1, 3, 5] }), 0, 0, WED), '습관 · 월·수·금 반복');
  assert.equal(sheetSubtitle(doc({ text: '산책', kind: 'habit', perWeek: 3 }), 0, 0, WED), '습관 · 주 3회');
  assert.equal(sheetSubtitle(doc({ text: '책', kind: 'count', goal: 12, unit: '권', step: 1, count: 7 }), 0, 0, WED), '쌓기 · 한 번에 1권');
  assert.equal(sheetSubtitle(doc({ text: '서류', kind: 'once', due: '2026-10-20' }), 0, 0, WED), '한 번');
  assert.equal(sheetSubtitle(doc({ text: '감사', kind: 'mind' }), 0, 0, WED), '마음가짐 · 한 주에 한 번');
});

test('지난 날 채우기 — 습관을 정한 날부터 어제까지, 오늘·내일은 아니다', () => {
  const a = { text: '산책', note: '', done: false, kind: 'habit', days: [0, 1, 2, 3, 4, 5, 6], since: '2026-10-13' };
  assert.deepEqual([0, 1, 2, 3].map((i) => canBackfill(a, WED, i)), [false, true, false, false]);
  assert.equal(canBackfill({ ...a, since: undefined }, WED, 0), true);
  assert.equal(canBackfill({ ...a, kind: 'once' }, WED, 1), false);
  assert.equal(canBackfill({ ...a, text: ' ' }, WED, 1), false);
  assert.equal(weekDayKey(WED, 1), '2026-10-13');
});

test('지난 날 알림 글', () => {
  assert.equal(dowOf('2026-10-13'), '화');
  assert.equal(backfillToast('2026-10-13', true), '화요일에 한 걸로 남겼어요');
  assert.equal(backfillToast('2026-10-13', false), '화요일 기록을 지웠어요');
});

test('어제도 했어요 — 어제가 하는 날·주 N회·지난주일 때만, 기록이 없을 때만', () => {
  const daily = { text: '산책', kind: 'habit', days: [0, 1, 2, 3, 4, 5, 6] };
  assert.equal(yesterdayOffer(doc(daily), 0, 0, WED), '2026-10-13');
  assert.equal(yesterdayOffer(doc(daily, { '2026-10-13': ['0-0'] }), 0, 0, WED), null);
  // 화요일은 쉬는 날
  assert.equal(yesterdayOffer(doc({ ...daily, days: [1, 3, 5] }), 0, 0, WED), null);
  // 주 N회는 요일이 없어 늘
  assert.equal(yesterdayOffer(doc({ text: '산책', kind: 'habit', perWeek: 3 }), 0, 0, WED), '2026-10-13');
  // 월요일의 어제(일요일)는 지난주 — 이번 주 칸에 없으니 쉬는 날이어도 보인다
  assert.equal(yesterdayOffer(doc({ ...daily, days: [1, 3, 5] }), 0, 0, MON), '2026-10-11');
  // 습관을 오늘 정했으면 어제는 아니다
  assert.equal(yesterdayOffer(doc({ ...daily, since: '2026-10-14' }), 0, 0, WED), null);
  assert.equal(yesterdayOffer(doc({ text: '서류', kind: 'once' }), 0, 0, WED), null);
});

test('마감 미루기 — 다 하지 않은 칸의 마감이 오늘이거나 지났을 때, 오늘부터 센다', () => {
  const a = { text: '서류', note: '', done: false, kind: 'once', due: '2026-10-10' };
  assert.equal(canPostpone(a, WED), true);
  assert.equal(canPostpone({ ...a, due: '2026-10-14' }, WED), true);
  assert.equal(canPostpone({ ...a, due: '2026-10-15' }, WED), false);
  assert.equal(canPostpone({ ...a, done: true }, WED), false);
  assert.equal(canPostpone({ ...a, due: undefined }, WED), false);
  assert.equal(postponedDue(WED, 'tomorrow'), '2026-10-15');
  assert.equal(postponedDue(WED, 'nextWeek'), '2026-10-21');
  assert.equal(POSTPONE.tomorrow.toast, '마감을 내일로 옮겼어요');
  assert.equal(POSTPONE.nextWeek.toast, '마감을 다음 주로 옮겼어요');
});

test('쌓기 목표 알림', () => {
  assert.equal(goalToast(12, '권'), '12권 목표에 닿았어요');
  assert.equal(goalToast(1000, 'km'), '1,000km 목표에 닿았어요');
});

test('메모 — 바뀐 때만 저장, 줄 수는 글 높이를 덮게', () => {
  assert.equal(noteChanged('a', 'a'), false);
  assert.equal(noteChanged('', undefined), false);
  assert.equal(noteChanged('b', 'a'), true);
  assert.equal(memoRules(0, 28, 4), 3);
  assert.equal(memoRules(88, 28, 4), 3);
  assert.equal(memoRules(116, 28, 4), 4);
  assert.equal(memoRules(150, 28, 4), 6);
});

test('마음가짐 막대 첫 이름표', () => {
  assert.equal(historyStartLabel(8), '7주 전');
});
