// 표 이미지(공유용 한 장)의 내용 — 크기, 날짜 표기, 81칸의 칸 종류, 빈 표, 다 이룬 블록, 달성 수
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { POSTER_W, POSTER_H, POSTER_PX, POSTER_RATIO, posterDate, posterCells, posterFinished, posterDone } = require('../src/lib/poster');

function makeDoc() {
  const themes = Array.from({ length: 8 }, (_, ti) => ({
    title: ti === 7 ? '' : `영역${ti}`,
    color: '#3A77A5',
    icon: 'heart',
    actions: Array.from({ length: 8 }, (_, ai) => ({ text: ti === 6 ? '' : `실천 ${ti}-${ai}`, note: '', done: false })),
  }));
  // 영역 0: 8칸 모두 달성
  themes[0].actions.forEach((a) => { a.done = true; });
  // 영역 1: 쌓기 하나(반쯤) · 달성 하나
  themes[1].actions[0] = { text: '책 읽기', note: '', done: false, kind: 'count', goal: 10, count: 5 };
  themes[1].actions[1].done = true;
  return { centerGoal: '  건강한 한 해  ', themes };
}

test('그림 크기는 4:5(540×675pt), 2배로 찍으면 1080×1350', () => {
  assert.deepEqual([POSTER_W, POSTER_H], [540, 675]);
  assert.equal(POSTER_RATIO, 2);
  assert.equal(POSTER_W * POSTER_RATIO, POSTER_PX.width);
  assert.equal(POSTER_H * POSTER_RATIO, POSTER_PX.height);
  assert.equal(POSTER_W * 5, POSTER_H * 4);
});

test('날짜는 오늘에서 계산한 인쇄 표기', () => {
  assert.equal(posterDate(new Date(2026, 9, 13)), '2026. 10. 13.');
  assert.equal(posterDate(new Date(2027, 0, 5)), '2027. 1. 5.');
});

test('81칸 — 가운데 핵심 목표 1 · 이름표 16 · 나머지 실천 자리 64', () => {
  const cells = posterCells(makeDoc(), false);
  assert.equal(cells.length, 81);
  const by = (k) => cells.filter((c) => c.kind === k).length;
  assert.equal(by('core'), 1);
  assert.equal(by('head'), 16);
  assert.equal(by('action') + by('empty'), 64);
  assert.equal(by('empty'), 8); // 영역 6은 아직 비어 있다
  const core = cells.find((c) => c.kind === 'core');
  assert.deepEqual([core.row, core.col, core.text], [4, 4, '건강한 한 해']);
});

test('진행 표시 — 달성 칸 · 적은 칸 · 이름 없는 이름표', () => {
  const cells = posterCells(makeDoc(), false);
  // 영역 1 블록은 위 가운데(줄 0~2, 칸 3~5) — 첫 실천은 (0,3), 둘째는 (0,4)
  const count = cells.find((c) => c.row === 0 && c.col === 3);
  assert.deepEqual([count.kind, count.done, count.text], ['action', false, '책 읽기']);
  const done = cells.find((c) => c.row === 0 && c.col === 4);
  assert.deepEqual([done.kind, done.done], ['action', true]);
  const head0 = cells.find((c) => c.row === 1 && c.col === 1);
  assert.deepEqual([head0.kind, head0.ti, head0.text], ['head', 0, '영역0']);
  // 이름을 짓지 않은 영역은 '영역 n'으로
  const unnamed = cells.filter((c) => c.kind === 'head' && c.unnamed);
  assert.ok(unnamed.length === 2 && unnamed.every((c) => c.text === '영역 8'));
  // 색은 칸에 싣지 않는다 — 그리는 쪽이 영역 번호로 토큰을 고른다(build-plan §2.5)
  assert.ok(cells.every((c) => !('color' in c)));
});

test('빈 표 — 이름표 · 목표는 그대로, 실천은 모두 손으로 쓸 빈 칸', () => {
  const cells = posterCells(makeDoc(), true);
  assert.ok(cells.every((c) => !c.done));
  assert.equal(cells.filter((c) => c.kind === 'empty').length, 64);
  assert.equal(cells.filter((c) => c.kind === 'head').length, 16);
  assert.equal(cells.find((c) => c.kind === 'core').text, '건강한 한 해');
  assert.equal(cells.find((c) => c.row === 0 && c.col === 4).text, '');
});

test('다 이룬 블록과 달성 수 — 빈 표에는 다 이룬 블록이 없다', () => {
  const doc = makeDoc();
  assert.deepEqual(posterFinished(doc, false), [0]);
  assert.deepEqual(posterFinished(doc, true), []);
  assert.equal(posterDone(doc), 9);
  // 글을 지운 칸의 달성 표시는 세지 않는다
  doc.themes[2].actions[0] = { text: ' ', note: '', done: true };
  assert.equal(posterDone(doc), 9);
});
