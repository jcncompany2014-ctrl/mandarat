require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../src/lib/ritualView');
const { blankDoc } = require('../src/data/defaults');

function doc() {
  const d = blankDoc();
  d.onboarded = true;
  d.themes[0].actions[0] = { text: '하루 물 2L', note: '', done: true };
  d.themes[0].actions[1] = { text: '이력서 갱신', note: '', done: false };
  d.themes[2].actions[3] = { text: '아침 글쓰기', note: '', done: false };
  d.themes[2].actions[4] = { text: '감사하는 마음', note: '', done: false, kind: 'mind' };
  d.themes[5].actions[0] = { text: '늦게 정한 마음', note: '', done: false, kind: 'mind', since: '2026-10-20' };
  return d;
}

test('지난주와 견준 한 줄', () => {
  assert.equal(V.deltaLine(12, 8), '지난주보다 4번 더 했어요');
  assert.equal(V.deltaLine(5, 5), '지난주와 같아요');
  assert.equal(V.deltaLine(3, 5), '지난주보다 2번 적어요');
});

test('장부 값 — 없으면 —', () => {
  assert.equal(V.addedLine([]), '—');
  assert.equal(
    V.addedLine([{ ti: 0, ai: 0, amount: 2, unit: '권' }, { ti: 0, ai: 1, amount: 50, unit: '만 원' }, { ti: 1, ai: 0, amount: 1, unit: 'km' }]),
    '+2권 · +50만 원',
  );
  assert.equal(V.habitLine({ habitCount: 0, routineDone: 0, routineDue: 0 }), '—');
  assert.equal(V.habitLine({ habitCount: 2, routineDone: 5, routineDue: 7 }), '5/7번');
  assert.equal(V.mindLine({ mindRated: 0, mindSum: 0 }), '—');
  assert.equal(V.mindLine({ mindRated: 2, mindSum: 7 }), '평균 3.5점');
  assert.equal(V.mindLine({ mindRated: 3, mindSum: 10 }), '평균 3.3점');
});

test('마음가짐 칸 — 그 주가 끝난 뒤에 정한 것은 빼고', () => {
  assert.deepEqual(V.mindItems(doc(), '2026-10-05'), [{ ti: 2, ai: 4 }]);
  assert.deepEqual(V.mindItems(doc(), '2026-10-19'), [{ ti: 2, ai: 4 }, { ti: 5, ai: 0 }]);
});

test('중점 후보 — 적었고 달성하지 않은 칸, 덜 이룬 영역부터', () => {
  const g = V.focusGroups(doc());
  // 영역 2(0/8)가 영역 0(1/8)보다 먼저, 영역 5는 0/8이지만 2보다 뒤
  assert.deepEqual(g.map((x) => x.ti), [2, 5, 0]);
  assert.deepEqual(g[0].ais, [3, 4]);
  assert.deepEqual(g[2].ais, [1]);
});

test('쪽 구성 — 보여 줄 게 없는 쪽은 건너뛰고, 지난 기록은 첫 쪽만', () => {
  assert.deepEqual(V.ritualPages({ mind: 1, candidates: 3 }), ['week', 'mind', 'next']);
  assert.deepEqual(V.ritualPages({ mind: 0, candidates: 3 }), ['week', 'next']);
  assert.deepEqual(V.ritualPages({ mind: 0, candidates: 0 }), ['week']);
  assert.deepEqual(V.ritualPages({ readOnly: true, mind: 2, candidates: 3 }), ['week']);
});

test('중점 고르기 — 고른 순서대로, 넷째는 막는다', () => {
  let p = [];
  p = V.togglePick(p, '2-3');
  p = V.togglePick(p, '0-1');
  p = V.togglePick(p, '5-0');
  assert.deepEqual(p, ['2-3', '0-1', '5-0']);
  assert.equal(V.togglePick(p, '2-4'), null);
  assert.deepEqual(V.togglePick(p, '0-1'), ['2-3', '5-0']);
});

test('마치는 안내 — 중점이라고만 쓴다(집중은 타이머의 말)', () => {
  assert.equal(V.finishToast(2), '다음 주 중점 2칸을 정했어요');
  assert.equal(V.finishToast(0), '한 주를 돌아봤어요');
  assert.ok(!V.finishToast(3).includes('집중'));
});
