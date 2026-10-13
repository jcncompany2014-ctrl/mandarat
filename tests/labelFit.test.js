require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { fitLabel, labelLines, textWidth } = require('../src/lib/labelFit');

test('한글은 1em, 공백은 좁게 잰다', () => {
  assert.equal(textWidth('건강', 10), 20);
  assert.equal(textWidth('a b', 10), 6.2 + 3.2 + 6.2);
});

test('들어가면 그대로, 넘치면 말줄임', () => {
  assert.equal(fitLabel('건강', 40, 10), '건강');
  assert.equal(fitLabel('마음챙김과 감정', 40, 10), '마음챙…');
});

test('긴 이름은 가운데 띄어쓰기에서 두 줄로', () => {
  assert.deepEqual(labelLines('건강하고 활기찬 몸 만들기', 100, 11.5), ['건강하고 활기찬', '몸 만들기']);
});

test('나눠도 넘치거나 띄어쓰기가 없으면 한 줄 말줄임', () => {
  assert.deepEqual(labelLines('마음챙김과 감정 돌보기', 47, 11.5), ['마음챙…']);
  assert.deepEqual(labelLines('마음챙김돌보기', 47, 11.5), ['마음챙…']);
  assert.deepEqual(labelLines('재정', 47, 11.5), ['재정']);
});
