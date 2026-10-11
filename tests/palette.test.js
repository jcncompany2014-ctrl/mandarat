require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { PILLAR_COLORS, ACCENTS, GOLD, INK, SEMANTIC, MOOD_COLORS, contrast, readableOn } = require('../src/theme/palette');

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

test('readableOn: 골드 버튼은 먹색 글씨, 나머지 포인트 색은 흰 글씨 — 어느 쪽이든 AA', () => {
  assert.equal(readableOn(GOLD), INK);
  for (const { color } of ACCENTS) {
    const ink = readableOn(color);
    assert.ok(contrast(ink, color) >= 4.5, `${color} + ${ink}: ${contrast(ink, color).toFixed(2)}`);
    if (color !== GOLD) assert.equal(ink, '#FFFFFF', color);
  }
  assert.equal(readableOn('#CBA352'), INK); // 다크 무드의 밝은 골드
});
