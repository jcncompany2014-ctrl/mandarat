require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeAction, guideScore } = require('../src/lib/coach');
const { suggestActions } = require('../src/lib/suggest');

test('빈 문구는 아무 단서도 없다', () => {
  assert.deepEqual(analyzeAction('  '), { what: false, howMuch: false, when: false });
  assert.equal(guideScore(analyzeAction('')), 0);
});

test('무엇을 · 얼마나 · 언제가 모두 있는 문구', () => {
  const g = analyzeAction('매일 아침 30분 걷기');
  assert.deepEqual(g, { what: true, howMuch: true, when: true });
  assert.equal(guideScore(g), 3);
});

test('행동만 있는 문구는 1점', () => {
  assert.deepEqual(analyzeAction('운동'), { what: true, howMuch: false, when: false });
});

test('수량 단위와 장소 단서를 알아본다', () => {
  assert.equal(analyzeAction('책 두 권 읽기').howMuch, true);
  assert.equal(analyzeAction('헬스장 가기').when, true);
  assert.equal(analyzeAction('자기 전 스트레칭').when, true);
});

test('영역 제목에 맞는 실천 예시, 모르면 범용 예시', () => {
  assert.ok(suggestActions('건강').includes('자기 전 스트레칭 10분'));
  assert.ok(suggestActions('나의 재정 관리').some((s) => s.includes('지출')));
  assert.deepEqual(suggestActions('알 수 없는 영역'), ['매일 10분 투자하기', '주 3회 실천하기', '10분만 해 보기']);
  assert.ok(suggestActions('').length > 0);
});
