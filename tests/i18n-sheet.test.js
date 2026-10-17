// X-C — 실천 시트 · 오늘 줄 체크 · 집중 타이머의 말이 언어마다 자연스러운 꼴로 나온다(한국어는 그대로).
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const TC = require('../src/lib/todayCheck');
const AS = require('../src/lib/actionSheet');
const { finishLabel } = require('../src/lib/focusClock');
const { msg, setLang } = require('../src/i18n');

test('읽어 주는 말 — 세 언어', () => {
  assert.equal(TC.addedSpeech('책 읽기', { count: 7, goal: 12, unit: '권' }, 'ko'), '책 읽기, 12권 중 7권');
  assert.equal(TC.addedSpeech('読書', { count: 7, goal: 12, unit: '冊' }, 'ja'), '読書、12冊のうち7冊');
  assert.equal(TC.addedSpeech('Read', { count: 7, goal: 12, unit: 'books' }, 'en'), 'Read, 7 of 12 books');
  assert.equal(TC.addedSpeech('Walk', { count: 1500, goal: 10000, unit: '' }, 'en'), 'Walk, 1,500 of 10,000');
  assert.equal(TC.checkedSpeech('水を飲む', 3, 'ja'), '水を飲む、できました。今日はあと3つです');
  assert.equal(TC.checkedSpeech('水を飲む', 12, 'ja'), '水を飲む、できました。今日はあと12個です');
  assert.equal(TC.checkedSpeech('Drink water', 3, 'en'), 'Drink water, done. 3 left today');
  assert.equal(TC.checkedSpeech('Drink water', 0, 'en'), 'Drink water, done');
});

test('단위 — ja는 붙이고, en은 띄우며 비면 숫자만', () => {
  assert.equal(TC.goalText({ goal: 12, unit: '冊' }, 'ja'), '目標の12冊に届きました');
  assert.equal(TC.goalText({ goal: 1000, unit: 'km' }, 'en'), 'Reached your goal of 1,000 km');
  assert.equal(TC.undoAddText(1, '', 'en'), "Removed today's 1");
  assert.equal(TC.checkLabelText('Read', 'count', { step: 2, unit: 'pages' }, 'en'), 'Read, Log 2 pages');
  assert.equal(msg('en').sheet.plusShort({ n: 1, unit: '' }), '+1');
});

test('요일 · 미루기 · 지난 점수 이름표', () => {
  assert.equal(AS.backfillToast('2026-10-13', true, 'ja'), '火曜日をできた日として記録しました');
  assert.equal(AS.backfillToast('2026-10-13', false, 'en'), 'Cleared Tuesday');
  assert.equal(AS.postponeCopy('nextWeek', 'en').a11y, 'Move due date to next week');
  assert.equal(AS.historyStartLabel(8, 'en'), '7 weeks ago');
  assert.equal(AS.historyStartLabel(2, 'en'), '1 week ago');
  assert.equal(AS.postponedDue(new Date(2026, 9, 14), 'nextWeek'), '2026-10-21');
});

test('끝내기 버튼 — 여섯 갈래가 언어마다 다르고 비지 않는다', () => {
  for (const l of ['ko', 'ja', 'en']) {
    const all = ['done', 'check', 'time'].flatMap((o) => [finishLabel(o, false, l), finishLabel(o, true, l)]);
    assert.equal(new Set(all).size, 6, l);
    for (const s of all) assert.ok(s.length > 0 && s.length <= 18, `${l}: ${s}`);
  }
  assert.equal(finishLabel('time', true, 'ja'), msg('ja').common.close);
});

test('POSTPONE 보기는 지금 언어를 따른다(V8-A가 지운다)', () => {
  try {
    setLang('en');
    assert.equal(AS.POSTPONE.tomorrow.label, 'Tomorrow');
    assert.equal(AS.POSTPONE.tomorrow.days, 1);
  } finally {
    setLang('ko');
  }
  assert.equal(AS.POSTPONE.tomorrow.toast, '마감을 내일로 옮겼어요');
});
