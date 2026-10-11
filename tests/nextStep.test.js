require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { nextStep } = require('../src/lib/nextStep');

const WED = new Date(2026, 9, 14);

function doc(patch) {
  const themes = Array.from({ length: 8 }, (_, i) => ({
    title: `영역${i}`, color: '#478058', icon: 'heart',
    actions: Array.from({ length: 8 }, (_, j) => ({ text: `실천${i}-${j}`, note: '', done: false })),
  }));
  return { themes, dayLog: {}, todayKeys: [], ...patch(themes) };
}

test('오늘 목록에 남은 일이 있으면 그것부터', () => {
  const d = doc(() => ({ todayKeys: ['3-2', '1-1'] }));
  assert.deepEqual(nextStep(d, WED), { kind: 'today', ti: 3, ai: 2 });
});

test('오늘 할 일을 다 했으면 가장 덜 핀 영역의 다음 실천', () => {
  const d = doc((themes) => {
    themes.forEach((t, ti) => t.actions.forEach((a, ai) => { a.done = ai < (ti === 5 ? 1 : 3); }));
    return { todayKeys: ['0-0'] };
  });
  assert.deepEqual(nextStep(d, WED), { kind: 'weakest', ti: 5, ai: 1 });
});

test('루틴은 오늘 예정이 아니면 다음 실천으로 고르지 않는다', () => {
  const d = doc((themes) => {
    themes.forEach((t) => t.actions.forEach((a) => { a.done = true; }));
    themes[2].actions[0] = { text: '주말 산책', note: '', done: false, days: [0, 6] };
    themes[2].actions[1] = { text: '책 읽기', note: '', done: false };
    return {};
  });
  assert.deepEqual(nextStep(d, WED), { kind: 'weakest', ti: 2, ai: 1 });
});

test('모두 달성했으면 빈 칸 채우기, 그것도 없으면 null', () => {
  const d = doc((themes) => {
    themes.forEach((t) => t.actions.forEach((a) => { a.done = true; }));
    themes[6].actions[4] = { text: '', note: '', done: false };
    return {};
  });
  assert.deepEqual(nextStep(d, WED), { kind: 'empty', ti: 6, ai: 4 });
  d.themes[6].actions[4] = { text: '채움', note: '', done: true };
  assert.equal(nextStep(d, WED), null);
});
