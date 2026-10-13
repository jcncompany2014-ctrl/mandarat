require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { suggestKind } = require('../src/lib/kindSuggest');

const pick = (text) => {
  const s = suggestKind(text);
  if (!s) return null;
  if (s.kind === 'habit') return s.perWeek ? `habit:주${s.perWeek}` : `habit:${s.days.join('')}`;
  if (s.kind === 'count') return `count:${s.goal}${s.unit}`;
  return s.kind;
};

test('주 N회 → 주 N회 습관 (시간·숫자보다 먼저)', () => {
  assert.equal(pick('주 3회 운동'), 'habit:주3');
  assert.equal(pick('주3회 30분 달리기'), 'habit:주3');
  assert.equal(pick('일주일에 2번 헬스'), 'habit:주2');
  assert.equal(pick('부모님 주 1통화'), 'habit:주1');
  assert.equal(pick('주 1회 가계부 정리'), 'habit:주1');
  assert.equal(pick('주 7회 걷기'), 'habit:0123456');
});

test('요일 → 그 요일 습관', () => {
  assert.equal(pick('매주 일요일 주간 회고'), 'habit:0');
  assert.equal(pick('월수금 수영'), 'habit:135');
  assert.equal(pick('화·목 요가'), 'habit:24');
  assert.equal(pick('화목마다 영어'), 'habit:24');
  assert.equal(pick('평일 아침 독서'), 'habit:12345');
  assert.equal(pick('주말마다 등산'), 'habit:06');
  assert.equal(pick('토요일 대청소'), 'habit:6');
});

test('요일처럼 보여도 요일이 아닌 말은 건너뛴다', () => {
  assert.notEqual(pick('가족 화목'), 'habit:24');
  assert.equal(pick('일일 계획 세우기'), null);
  assert.equal(pick('월 1회 새로운 시도'), null, '한 달 단위는 고르지 않는다');
  assert.equal(pick('적금 월 50만 원'), null);
  assert.equal(pick('한 달 한 권 취미 책'), null);
});

test('날마다 하는 일 → 매일 습관', () => {
  for (const t of ['하루 물 2L', '매일 글쓰기', '11시 취침', '1만보 걷기', '스트레칭 10분', '명상 10분', '감사일기', '일기 쓰기',
    '자기 전 스마트폰 안 보기', '아침 6시 기상', '공부 2시간', '자기 전 책 10쪽 읽기', '점심 후 15분 산책', '하루 한 번 감사 표현']) {
    assert.equal(pick(t), 'habit:0123456', t);
  }
});

test('숫자 + 단위 → 쌓기, 1이면 한 번', () => {
  assert.equal(pick('책 12권 읽기'), 'count:12권');
  assert.equal(pick('새 도시 3곳'), 'count:3곳');
  assert.equal(pick('요리 10가지'), 'count:10가지');
  assert.equal(pick('1,000만 원 모으기'), 'count:1000만 원');
  assert.equal(pick('저축 500만원'), 'count:500만 원');
  assert.equal(pick('봉사 20시간'), 'count:20시간');
  assert.equal(pick('10kg 감량'), 'count:10kg');
  assert.equal(pick('헌혈 10회'), 'count:10회');
  assert.equal(pick('새 친구 5명'), 'count:5명');
  assert.equal(pick('100km 달리기'), 'count:100km');
  assert.equal(pick('발표 1회'), 'once');
  assert.equal(pick('새 기술 1개'), 'once');
  assert.equal(pick('5km 달리기'), null, '짧은 거리는 알 수 없음');
  assert.equal(pick('3개월 안에 자격증 취득'), 'once', '3개월은 단위가 아님');
});

test('태도·생각 → 마음가짐', () => {
  for (const t of ['감사 표현하기', '경청 연습', '긍정적으로 생각하기', '인사 잘하기', '심판을 대하는 태도', '화내지 않기']) {
    assert.equal(pick(t), 'mind', t);
  }
});

test('끝이 있는 일 → 한 번', () => {
  for (const t of ['자격증 취득', '정기 건강검진', '이력서 갱신', '멘토 찾기', '콘서트 가기', '마라톤 완주', '비상금 마련', '일출 보기']) {
    assert.equal(pick(t), 'once', t);
  }
});

test('알 수 없으면 고르지 않는다', () => {
  for (const t of ['', '  ', '사이드 프로젝트', '영어 회화', '봉사활동', '단 음식 줄이기', '작은 한 걸음 정하기']) {
    assert.equal(pick(t), null, t);
  }
});

test('제안에는 화면에 쓸 이름이 붙는다', () => {
  assert.equal(suggestKind('주 3회 운동').label, '주 3회 습관');
  assert.equal(suggestKind('월수금 수영').label, '월·수·금 습관');
  assert.equal(suggestKind('매일 글쓰기').label, '매일 습관');
  assert.equal(suggestKind('책 12권 읽기').label, '쌓기 12권');
  assert.equal(suggestKind('1,000만 원 모으기').label, '쌓기 1,000만 원');
});
