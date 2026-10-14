require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { areaPicks, firstEmptyCell, choosableRows, autoLine, QUICK_PICK_MAX } = require('../src/lib/quickAdd');
const { pickSections } = require('../src/lib/pick');

const WED = new Date(2026, 9, 14); // 수요일

function doc(patch) {
  const themes = Array.from({ length: 8 }, (_, i) => ({
    title: `영역${i}`, color: '#478058', icon: 'heart',
    actions: Array.from({ length: 8 }, () => ({ text: '', note: '', done: false })),
  }));
  return { centerGoal: '', themes, todayKeys: [], todayExtra: [], dayLog: {}, ...patch(themes) };
}

test('areaPicks: 아직 담지 않은 칸만, 칸 순서로 3개까지', () => {
  const d = doc((t) => {
    ['가', '나', '다', '라', '마'].forEach((s, i) => { t[1].actions[i] = { text: s, note: '', done: false }; });
    return { todayKeys: ['1-1'] };
  });
  const rows = areaPicks(d, 1, WED);
  assert.equal(rows.length, QUICK_PICK_MAX);
  assert.deepEqual(rows.map((r) => r.text), ['가', '다', '라']);
  assert.deepEqual(areaPicks(d, 2, WED), []);
});

test('areaPicks: 저절로 담긴 반복 칸과 달성한 칸은 빼고, 마음가짐도 뺀다', () => {
  const d = doc((t) => {
    t[0].actions[0] = { text: '매일 산책', note: '', done: false, kind: 'habit', days: [0, 1, 2, 3, 4, 5, 6] };
    t[0].actions[1] = { text: '끝낸 일', note: '', done: true };
    t[0].actions[2] = { text: '감사하기', note: '', done: false, kind: 'mind' };
    t[0].actions[3] = { text: '서류 내기', note: '', done: false };
    return {};
  });
  assert.deepEqual(areaPicks(d, 0, WED).map((r) => r.ai), [3]);
});

test('firstEmptyCell: 글자 없는 첫 칸, 다 찼으면 -1', () => {
  const d = doc((t) => {
    t[0].actions[0] = { text: '가', note: '', done: false };
    t[0].actions[1] = { text: '  ', note: '', done: false };
    t[3].actions.forEach((_, i) => { t[3].actions[i] = { text: `칸${i}`, note: '', done: false }; });
    return {};
  });
  assert.equal(firstEmptyCell(d, 0), 1);
  assert.equal(firstEmptyCell(d, 3), -1);
  assert.equal(firstEmptyCell(d, 9), -1);
});

test('choosableRows: 저절로 담긴 줄은 빼고 중점 칸을 고른 순서대로 먼저', () => {
  const d = doc((t) => {
    t[0].actions[0] = { text: '매일 산책', note: '', done: false, kind: 'habit', days: [0, 1, 2, 3, 4, 5, 6] };
    t[0].actions[1] = { text: '가', note: '', done: false };
    t[0].actions[2] = { text: '나', note: '', done: false };
    t[0].actions[3] = { text: '다', note: '', done: false };
    return { todayKeys: ['0-2'] };
  });
  const sec = pickSections(d, WED)[0];
  const rows = choosableRows(sec, ['0-3', '0-1', '5-5']);
  assert.deepEqual(rows.map((r) => r.text), ['다', '가', '나']);
  assert.deepEqual(rows.map((r) => r.focus), [true, true, false]);
  assert.deepEqual(rows.map((r) => r.state), ['off', 'off', 'on']);
  assert.deepEqual(choosableRows(sec, []).map((r) => r.text), ['가', '나', '다']);
});

test('autoLine: 이름 둘까지, 나머지는 외 N', () => {
  assert.equal(autoLine({ autoCount: 0, autoNames: [] }), '');
  assert.equal(autoLine({ autoCount: 1, autoNames: ['산책'] }), '저절로 담김 1 · 산책');
  assert.equal(autoLine({ autoCount: 2, autoNames: ['산책', '물'] }), '저절로 담김 2 · 산책, 물');
  assert.equal(autoLine({ autoCount: 4, autoNames: ['산책', '물', '일기', '독서'] }), '저절로 담김 4 · 산책, 물 외 2');
});
