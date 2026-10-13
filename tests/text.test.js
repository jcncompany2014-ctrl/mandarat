require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { noOrphan } = require('../src/lib/text');

test('마지막 한 글자 단어는 앞 단어와 붙인다', () => {
  assert.equal(noOrphan('건강하고 단단한 한 해'), '건강하고 단단한 한 해');
  assert.equal(noOrphan('단단하고 다정한 나'), '단단하고 다정한 나');
});

test('마지막 두 글자 단어도 붙인다', () => {
  assert.equal(noOrphan('건강한 몸과 마음'), '건강한 몸과 마음');
});

test('마지막 단어가 세 글자 이상이거나 띄어쓰기가 없으면 그대로', () => {
  assert.equal(noOrphan('매일 조금씩 성장하기'), '매일 조금씩 성장하기');
  assert.equal(noOrphan('2026 최고의 한해다'), '2026 최고의 한해다');
  assert.equal(noOrphan('나'), '나');
});

test('끝 공백은 지우고 나서 판단한다', () => {
  assert.equal(noOrphan('2026 최고의 나 '), '2026 최고의 나');
});
