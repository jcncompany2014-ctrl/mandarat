require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  reachesGoal, goalText, undoAddText, checkLabelText, checkHintText, checkedSpeech, addedSpeech, EXTRA_REMOVED,
} = require('../src/lib/todayCheck');
const { BANNED_COPY } = require('../src/lib/copy');

test('쌓기 목표는 이번 한 번으로 처음 닿을 때만 알린다', () => {
  assert.equal(reachesGoal({ count: 11, goal: 12, step: 1, reached: false }), true);
  assert.equal(reachesGoal({ count: 10, goal: 12, step: 1, reached: false }), false);
  assert.equal(reachesGoal({ count: 10.5, goal: 12, step: 2, reached: false }), true);
  // 이미 닿아 있던 칸은 다시 알리지 않는다
  assert.equal(reachesGoal({ count: 12, goal: 12, step: 1, reached: true }), false);
});

test('목표 · 빼기 토스트 (copy-3 · copy-17)', () => {
  assert.equal(goalText({ goal: 12, unit: '권' }), '12권 목표를 달성했어요');
  assert.equal(goalText({ goal: 10000, unit: '보' }), '10,000보 목표를 달성했어요');
  assert.equal(undoAddText(3, '권'), '오늘 더한 3권을 뺐어요');
  assert.equal(undoAddText(2, 'L'), '오늘 더한 2L를 뺐어요');
  assert.equal(undoAddText(1, ''), '오늘 더한 1을 뺐어요');
});

test('체크 칸 이름은 글 그대로 — 쌓기만 더하는 양까지 (a11y-10 · copy-14)', () => {
  assert.equal(checkLabelText('물 2L 마시기', 'habit'), '물 2L 마시기');
  assert.equal(checkLabelText('보고서 내기', 'once'), '보고서 내기');
  assert.equal(checkLabelText('책 읽기', 'count', { step: 1, unit: '권' }), '책 읽기, 1권 더하기');
  assert.equal(checkLabelText('걷기', 'count', { step: 1000, unit: '보' }), '걷기, 1,000보 더하기');
  for (const kind of ['once', 'habit', 'count']) {
    assert.ok(!checkLabelText('x', kind, { step: 1, unit: '' }).endsWith('완료'));
  }
});

test('힌트는 지금 누르면 되는 일', () => {
  assert.equal(checkHintText(false, 'habit'), '했어요로 남겨요');
  assert.equal(checkHintText(true, 'once'), '했어요를 지워요');
  assert.equal(checkHintText(true, 'count'), '오늘 더한 것을 빼요');
});

test('체크하고 읽어 주는 한 문장 (a11y-9)', () => {
  assert.equal(checkedSpeech('물 마시기', 3), '물 마시기, 했어요. 오늘 3개 남았어요');
  // 마지막 하나 — '다 했어요'는 하루 마감이 따로 읽는다
  assert.equal(checkedSpeech('물 마시기', 0), '물 마시기, 했어요');
  assert.equal(addedSpeech('책 읽기', { count: 7, goal: 12, unit: '권' }), '책 읽기, 12권 중 7권');
});

test('쓰지 않기로 한 말이 없다', () => {
  const all = [
    goalText({ goal: 3, unit: '권' }), undoAddText(1, '권'), EXTRA_REMOVED, checkedSpeech('a', 1),
    checkHintText(false, 'once'), checkHintText(true, 'count'), checkLabelText('a', 'count', { step: 1, unit: '권' }),
  ];
  for (const s of all) for (const w of BANNED_COPY) assert.ok(!s.includes(w), `${s} ⊃ ${w}`);
});
