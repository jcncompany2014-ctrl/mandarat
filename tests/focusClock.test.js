require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  FOCUS_TOTAL, TALLY_BOXES, leftAt, leftOfMs, elapsedOf, minutesToRecord, filledBoxes, fmtClock, focusOutcome, finishLabel,
} = require('../src/lib/focusClock');

test('남은 시간은 벽시계에서 구한다 — 잠금 2분 뒤 돌아오면 2분이 지나 있다', () => {
  const start = 1_000_000;
  const endAt = start + FOCUS_TOTAL * 1000;
  assert.equal(leftAt(endAt, start), 1500);
  assert.equal(leftAt(endAt, start + 120_000), 1380);
  assert.equal(elapsedOf(leftAt(endAt, start + 120_000)), 120);
});

test('남은 초는 올림 — 00:00은 정말 끝났을 때만, 0 아래로 내려가지 않는다', () => {
  assert.equal(leftAt(10_000, 9_001), 1);
  assert.equal(leftAt(10_000, 10_000), 0);
  assert.equal(leftAt(10_000, 99_999), 0);
  assert.equal(leftOfMs(1), 1);
  assert.equal(leftOfMs(-5), 0);
});

test('기록할 분은 다 채운 1분만 센다', () => {
  assert.equal(minutesToRecord(0), 0);
  assert.equal(minutesToRecord(59), 0);
  assert.equal(minutesToRecord(600), 10);
  assert.equal(minutesToRecord(640), 10);
  assert.equal(minutesToRecord(elapsedOf(0)), 25);
});

test('집중 표는 1분에 한 칸, 25칸을 넘지 않는다', () => {
  assert.equal(TALLY_BOXES, 25);
  assert.equal(filledBoxes(0), 0);
  assert.equal(filledBoxes(61), 1);
  assert.equal(filledBoxes(FOCUS_TOTAL), 25);
  assert.equal(filledBoxes(FOCUS_TOTAL + 300), 25);
  assert.equal(elapsedOf(-10), FOCUS_TOTAL);
  assert.equal(elapsedOf(FOCUS_TOTAL + 10), 0);
});

test('시계 글자', () => {
  assert.equal(fmtClock(1500), '25:00');
  assert.equal(fmtClock(1453), '24:13');
  assert.equal(fmtClock(5), '00:05');
  assert.equal(fmtClock(0), '00:00');
});

test('끝내기가 기록하는 것은 유형과 오늘 상태를 따른다', () => {
  assert.equal(focusOutcome('once', { done: false }), 'done');
  assert.equal(focusOutcome('once', { done: true }), 'time');
  assert.equal(focusOutcome('habit', { checkedToday: false }), 'check');
  assert.equal(focusOutcome('habit', { checkedToday: true }), 'time');
  assert.equal(focusOutcome('count', {}), 'time');
  assert.equal(focusOutcome('mind', {}), 'time');
});

test('버튼 글 — 도는 중과 끝난 뒤', () => {
  assert.equal(finishLabel('done', false), '여기서 끝내고 완료');
  assert.equal(finishLabel('check', false), '여기서 끝내고 체크');
  assert.equal(finishLabel('time', false), '여기서 끝내기');
  assert.equal(finishLabel('done', true), '완료로 표시');
  assert.equal(finishLabel('check', true), '오늘 했어요');
  assert.equal(finishLabel('time', true), '닫기');
});
