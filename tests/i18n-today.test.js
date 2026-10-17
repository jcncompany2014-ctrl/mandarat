// X-D — 'today' 이름공간: 오늘 화면 · 담기 · 고르기의 글이 언어마다 자연스럽게 나오고, ko는 예전 글과 글자 하나까지 같다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { msg } = require('../src/i18n');
const T = require('../src/lib/todayModes');
const { dayCloseText } = require('../src/lib/todayList');
const { autoLine } = require('../src/lib/quickAdd');
const { guideSteps, whyAuto } = require('../src/lib/pick');

const WED = new Date(2026, 9, 14);

test('ko — 예전 글 그대로(바이트 같음)', () => {
  const t = msg('ko').today;
  assert.equal(T.runText(3, 'week', 'ko'), '3주');
  assert.deepEqual(T.streakCell({ cur: 4, best: 4, unit: 'day' }, 'ko'), { text: '4일', a11y: '연속 4일' });
  assert.equal(T.streakSummaryLabel({ lead: { text: '운동', cur: 2, unit: 'week', best: 2 } }, 'ko'), '지금 연속 2주, 운동. 최고 2주');
  assert.equal(T.columnHead(t.colDoing, 2, 'ko'), '진행 중 2개');
  assert.equal(T.mindProgress(4, 1, 'ko'), '4개 중 1개 매겼어요');
  assert.deepEqual(dayCloseText(WED, 10, 'ko'), {
    left: '10월 14일 수요일 마감', right: '10 / 10', speech: '10월 14일 수요일 마감, 오늘 할 일 10개를 다 했어요',
  });
  assert.equal(autoLine({ autoCount: 4, autoNames: ['산책', '물', '일기', '독서'] }, 'ko'), '저절로 담김 4 · 산책, 물 외 2');
  assert.equal(t.quickCount({ n: 45, max: 60 }), '45자, 최대 60자');
  assert.equal(t.quickWroteCell({ area: '건강', n: 3 }), '건강 3번 칸에 적었어요');
  assert.equal(t.pickDone({ n: 3 }), '오늘 3개 · 다 골랐어요');
  assert.equal(t.movedDoing({ text: '산책' }), '산책, 진행 중으로 옮겼어요');
  assert.equal(t.weekCount({ total: 3, done: 2 }), '이번 주 3회 중 2회');
  assert.equal(t.focus25, '25분 집중');
  assert.equal(t.areaFallback({ n: 3 }), '영역 3');
});

test('ja — 数え方と区切り', () => {
  assert.equal(T.runText(5, 'day', 'ja'), '5日');
  assert.deepEqual(T.streakCell({ cur: 3, best: 9, unit: 'week' }, 'ja'), { text: '3週', a11y: '3週連続' });
  assert.equal(T.streakSummaryLabel({ lead: null }, 'ja'), '続いている記録はまだありません。今日ひとつやれば始まります');
  assert.equal(T.columnHead(msg('ja').today.colDoing, 2, 'ja'), '進行中、2つ');
  assert.equal(T.columnHead(msg('ja').today.colTodo, 12, 'ja'), 'やること、12個');
  assert.deepEqual(dayCloseText(WED, 3, 'ja'), {
    left: '10月14日 水曜日　締め', right: '3 / 3', speech: '10月14日 水曜日、締めました。今日やること3つが全部できました',
  });
  assert.equal(autoLine({ autoCount: 3, autoNames: ['散歩', '水', '日記'] }, 'ja'), '自動で入った 3・散歩、水 ほか1');
  assert.equal(guideSteps({ centerGoal: '', themes: [], todayKeys: [], todayExtra: [], dayLog: {} }, 'ja').steps[2].label, '行動のマスを8つ埋める');
});

test('en — plurals and short streak cells', () => {
  const t = msg('en').today;
  assert.equal(T.runText(1, 'day', 'en'), '1 day');
  assert.equal(T.runText(3, 'week', 'en'), '3 weeks');
  assert.deepEqual(T.streakCell({ cur: 12, best: 12, unit: 'day' }, 'en'), { text: '12d', a11y: 'Streak of 12 days' });
  assert.equal(T.streakSummaryLabel({ lead: { text: 'Walk', cur: 1, unit: 'day', best: 5 } }, 'en'), 'Current streak 1 day, Walk. Best 5 days');
  assert.equal(T.mindProgress(4, 1, 'en'), '1 of 4 rated');
  assert.equal(dayCloseText(WED, 1, 'en').speech, "Wednesday, October 14, day closed. You did the one thing on Today's list");
  assert.equal(dayCloseText(WED, 4, 'en').speech, "Wednesday, October 14, day closed. You did all 4 items on Today's list");
  assert.equal(dayCloseText(WED, 4, 'en').left, 'Wednesday, October 14 · closed');
  assert.equal(autoLine({ autoCount: 4, autoNames: ['Walk', 'Water', 'Journal', 'Read'] }, 'en'), 'Added automatically 4 · Walk, Water + 2 more');
  assert.equal(t.unitDay({ n: 1 }), ' day');
  assert.equal(t.unitWeek({ n: 2 }), ' weeks');
  assert.equal(t.whyWeekLeft({ n: 1 }), 'Already on Today with 1 more time to go this week');
  assert.equal(t.guideFill({ n: 8 }), 'Fill in 8 action squares');
});

test('whyAuto는 고른 언어로 — 반복하는 날', () => {
  const action = { text: 'Walk', note: '', done: false, kind: 'habit', days: [0, 1, 2, 3, 4, 5, 6] };
  const themes = Array.from({ length: 8 }, () => ({ title: '', color: '#478058', icon: 'heart', actions: Array.from({ length: 8 }, () => ({ text: '', note: '', done: false })) }));
  themes[0].actions[0] = action;
  const doc = { themes, dayLog: {} };
  assert.equal(whyAuto(doc, 0, 0, WED, 'ko'), '반복하는 날이라 ‘오늘’에 이미 있어요');
  assert.equal(whyAuto(doc, 0, 0, WED, 'ja'), '繰り返す日なので「今日」に入っています');
  assert.equal(whyAuto(doc, 0, 0, WED, 'en'), 'Already on Today because it repeats today');
});
