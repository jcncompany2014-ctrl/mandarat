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

test('josa: 받침에 따라 조사를 고른다(ㄹ 받침의 으로/로, 숫자·영문 단위 읽기 포함)', () => {
  const { josa } = require('../src/lib/text');
  assert.equal(josa('주 3회 습관', '으로/로'), '주 3회 습관으로');
  assert.equal(josa('한 번', '으로/로'), '한 번으로');
  assert.equal(josa('쌓기 12권', '으로/로'), '쌓기 12권으로');
  assert.equal(josa('마음가짐', '으로/로'), '마음가짐으로');
  assert.equal(josa('매일 습관', '으로/로'), '매일 습관으로');
  assert.equal(josa('서울', '으로/로'), '서울로');
  assert.equal(josa('쌓기', '으로/로'), '쌓기로');
  assert.equal(josa('2권', '을/를'), '2권을');
  assert.equal(josa('5km', '을/를'), '5km를');
  assert.equal(josa('10kg', '을/를'), '10kg을');
  assert.equal(josa('3', '을/를'), '3을');
  assert.equal(josa('2', '을/를'), '2를');
  assert.equal(josa('50만 원', '을/를'), '50만 원을');
  assert.equal(josa('습관', '이/가'), '습관이');
  assert.equal(josa('쌓기', '이/가'), '쌓기가');
});
