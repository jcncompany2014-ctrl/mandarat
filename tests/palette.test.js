require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PILLAR_COLORS, ACCENTS, GOLD, INK, SEMANTIC, MOOD_COLORS, contrast, readableOn, migrateAccent,
} = require('../src/theme/palette');

test('contrast는 WCAG 대비율을 계산한다', () => {
  assert.equal(contrast('#FFFFFF', '#000000').toFixed(1), '21.0');
  assert.equal(contrast('#777777', '#777777'), 1);
  assert.equal(contrast('#000000', '#FFFFFF'), contrast('#FFFFFF', '#000000'));
});

test('8영역 색은 흰 글씨와 AA(4.5) 이상 — 칸 위 흰 글씨가 늘 읽힌다', () => {
  for (const c of PILLAR_COLORS) assert.ok(contrast('#FFFFFF', c) >= 4.5, `${c}: ${contrast('#FFFFFF', c).toFixed(2)}`);
});

test('의미·기분 색도 흰 바탕 위에서 읽힌다(3:1 이상)', () => {
  for (const c of [...Object.values(SEMANTIC), ...MOOD_COLORS]) assert.ok(contrast('#FFFFFF', c) >= 3, c);
});

test('포인트 컬러: 기본 골드가 첫 번째, 다섯 가지 선택지는 그대로(주인 결정) — 이름·색이 겹치지 않는다', () => {
  assert.equal(ACCENTS[0].color, GOLD);
  assert.deepEqual(ACCENTS.map((a) => a.color), [GOLD, '#B35A72', '#478058', '#5068AB', '#7E60A8']);
  assert.equal(new Set(ACCENTS.map((a) => a.name)).size, ACCENTS.length);
  assert.equal(new Set(ACCENTS.map((a) => a.color.toUpperCase())).size, ACCENTS.length);
  for (const { color } of ACCENTS) assert.match(color, /^#[0-9A-F]{6}$/);
});

test('migrateAccent: 예전 원색만 대응 색으로 옮기고, 고른 포인트 컬러는 그대로 둔다', () => {
  assert.equal(migrateAccent('#F4793B'), GOLD);
  assert.equal(migrateAccent('#f4793b'), GOLD);
  assert.equal(migrateAccent('#4f6bed'), '#5068AB');
  assert.equal(migrateAccent('#2FA968'), '#478058');
  assert.equal(migrateAccent('#8b5cf6'), '#7E60A8');
  for (const { color } of ACCENTS) assert.equal(migrateAccent(color), color);
  assert.equal(migrateAccent('#123456'), '#123456');
});

test('readableOn: 골드 버튼은 먹색 글씨, 나머지 포인트 색은 흰 글씨 — 어느 쪽이든 AA', () => {
  assert.equal(readableOn(GOLD), INK);
  for (const { color } of ACCENTS) {
    const ink = readableOn(color);
    assert.ok(contrast(ink, color) >= 4.5, `${color} + ${ink}: ${contrast(ink, color).toFixed(2)}`);
    if (color !== GOLD) assert.equal(ink, '#FFFFFF', color);
  }
  assert.equal(readableOn('#CBA352'), INK); // 다크 무드의 밝은 골드
});

test('SEMANTIC.doneInk: 달성 초록을 글씨로 쓸 때의 색 — 같은 초록 계열, 흰 면 위 AA', () => {
  assert.equal(SEMANTIC.doneInk, '#3D6E4B');
  assert.ok(contrast(SEMANTIC.doneInk, '#FFFFFF') >= 4.5);
  assert.ok(contrast(SEMANTIC.doneInk, '#FFFFFF') > contrast(SEMANTIC.done, '#FFFFFF'));
});
