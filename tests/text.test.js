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

// ── W1-C: 날짜·마감·횟수 표기 ────────────────────────────────────────────────────
test('fmtDateLong · fmtDateShort: 키와 Date 모두, 연도 없이', () => {
  const { fmtDateLong, fmtDateShort } = require('../src/lib/text');
  assert.equal(fmtDateLong('2026-10-14'), '10월 14일 수요일');
  assert.equal(fmtDateLong(new Date(2026, 9, 18, 23, 59)), '10월 18일 일요일');
  assert.equal(fmtDateShort('2026-10-14'), '10.14 (수)');
  assert.equal(fmtDateShort(new Date(2026, 8, 3)), '9.3 (목)');
  assert.equal(fmtDateLong('2027-01-01'), '1월 1일 금요일');
});

test('fmtRange: 한 주를 월~일로, 달이 바뀌면 끝에도 달을', () => {
  const { fmtRange } = require('../src/lib/text');
  assert.equal(fmtRange('2026-10-05'), '10월 5일 – 11일');
  assert.equal(fmtRange('2026-09-28'), '9월 28일 – 10월 4일');
  assert.equal(fmtRange('2026-12-28'), '12월 28일 – 1월 3일');
  assert.equal(fmtRange(new Date(2026, 9, 12)), '10월 12일 – 18일');
});

test('fmtDue: 짧게 D-2 · D-day · D+3, 길게 마감 D-2 · 오늘 마감 · 마감 3일 지남', () => {
  const { fmtDue } = require('../src/lib/text');
  assert.deepEqual([2, 0, -3].map((d) => fmtDue(d)), ['D-2', 'D-day', 'D+3']);
  assert.deepEqual([2, 0, -3].map((d) => fmtDue(d, 'long')), ['마감 D-2', '오늘 마감', '마감 3일 지남']);
  assert.equal(fmtDue(-0), 'D-day');
});

test('fmtCount: 단위를 숫자에 붙이고 세 자리마다 쉼표', () => {
  const { fmtCount } = require('../src/lib/text');
  assert.equal(fmtCount(3), '3번');
  assert.equal(fmtCount(1200, '권'), '1,200권');
  assert.equal(fmtCount(50, '만 원'), '50만 원');
  assert.equal(fmtCount(2.5, 'km'), '2.5km');
  assert.equal(fmtCount(0), '0번');
});
