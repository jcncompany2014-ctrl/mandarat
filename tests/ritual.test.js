require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/lib/ritual');
const { blankDoc } = require('../src/data/defaults');
const { weekKey, ymd } = require('../src/lib/routine');

// 2026-10-12 월 · 10-13 화 · 10-14 수 · 10-18 일 / 지난주 월요일 = 10-05
const at = (d, h = 9, m = 0) => new Date(2026, 9, d, h, m);

function doc(extra = {}) {
  const d = blankDoc();
  d.onboarded = true;
  d.themes[0].actions[0] = { text: '하루 물 2L', note: '', done: false };
  d.themes[0].actions[1] = { text: '이력서 갱신', note: '', done: true };
  d.themes[2].actions[3] = { text: '아침 글쓰기', note: '', done: false };
  d.dayLog = { '2026-10-01': ['0-0'] };
  return { ...d, ...extra };
}

test('일요일 18시부터 이번 주를 돌아본다 — 17:59는 아직', () => {
  assert.equal(R.ritualTarget(doc(), at(18, 17, 59)), null);
  assert.equal(R.ritualTarget(doc(), at(18, 18, 0)), '2026-10-12');
  assert.equal(R.ritualTarget(doc(), at(18, 23, 59)), '2026-10-12');
});

test('월·화요일에는 지난주를, 수~토요일에는 권하지 않는다', () => {
  assert.equal(R.ritualTarget(doc(), at(12, 0, 0)), '2026-10-05');
  assert.equal(R.ritualTarget(doc(), at(13, 23, 59)), '2026-10-05');
  for (const day of [14, 15, 16, 17]) assert.equal(R.ritualTarget(doc(), at(day, 20)), null, `10-${day}`);
  assert.equal(R.ritualTarget(doc(), at(18, 9)), null, '일요일 아침');
});

test('이미 돌아본 주, 적힌 실천이 없는 문서는 권하지 않는다', () => {
  const reviewed = doc({ reviews: { '2026-10-05': { at: '2026-10-11', next: [] } } });
  assert.equal(R.ritualTarget(reviewed, at(12)), null);
  assert.equal(R.ritualTarget(reviewed, at(18, 19)), '2026-10-12', '다른 주는 그대로 권한다');
  const blank = { ...blankDoc(), onboarded: true, dayLog: { '2026-10-01': ['0-0'] } };
  assert.equal(R.ritualTarget(blank, at(12)), null);
});

test('그 주가 끝난 뒤에 쓰기 시작했다면 그 주는 권하지 않는다', () => {
  // 월요일에 처음 체크한 사용자 — 지난주는 써 보지 않은 주
  const fresh = doc({ dayLog: { '2026-10-12': ['0-0'] } });
  assert.equal(R.ritualTarget(fresh, at(12, 20)), null);
  assert.equal(R.ritualTarget(fresh, at(18, 19)), '2026-10-12', '이번 주는 돌아본다');
  // 기록이 하나도 없으면 권하지 않는다
  assert.equal(R.ritualTarget(doc({ dayLog: {} }), at(12)), null);
  // 체크는 없어도 습관을 정한 날·마음가짐 점수가 그 주 안이면 쓰던 사용자다
  const habit = doc({ dayLog: {} });
  habit.themes[2].actions[3] = { ...habit.themes[2].actions[3], kind: 'habit', days: [1, 3, 5], since: '2026-10-07' };
  assert.equal(R.ritualTarget(habit, at(13)), '2026-10-05');
  const mind = doc({ dayLog: {} });
  mind.themes[0].actions[0] = { ...mind.themes[0].actions[0], kind: 'mind', ratings: { '2026-09-28': 3 } };
  assert.equal(R.ritualTarget(mind, at(12)), '2026-10-05');
});

test('weekPriority: 지난주를 닫으며 고른 칸 중 글이 있고 아직 달성하지 않은 것(고른 순서)', () => {
  const d = doc({
    reviews: {
      '2026-10-05': { at: '2026-10-11', next: ['2-3', '0-1', '5-5', '0-0'] },
      '2026-10-12': { at: '2026-10-18', next: ['0-1'] },
    },
  });
  // 10-05 주에 고른 칸은 10-12 주(이번 주)에 보인다 — 달성한 0-1·빈 칸 5-5는 뺀다
  assert.deepEqual(R.weekPriority(d, at(14)), ['2-3', '0-0']);
  assert.deepEqual(R.weekPriority(d, at(12, 0, 0)), ['2-3', '0-0']);
  assert.deepEqual(R.weekPriority(d, at(18, 23, 59)), ['2-3', '0-0'], '일요일 밤에 닫아도 이번 주는 그대로');
  // 그 주(10-05~10-11)에는 아직 그 전 주(09-28)의 돌아보기를 본다
  assert.deepEqual(R.weekPriority(d, at(11, 20)), []);
  assert.deepEqual(R.weekPriority(doc(), at(14)), []);
});

test('reviewWeeks는 최근 주 먼저, sundayOf는 그 주 일요일', () => {
  const d = doc({ reviews: { '2026-09-28': { at: '2026-10-04', next: [] }, '2026-10-05': { at: '2026-10-11', next: [] } } });
  assert.deepEqual(R.reviewWeeks(d), ['2026-10-05', '2026-09-28']);
  assert.deepEqual(R.reviewWeeks(blankDoc()), []);
  assert.deepEqual(R.reviewWeeks({}), []);
  const sun = R.sundayOf('2026-10-05');
  assert.equal(ymd(sun), '2026-10-11');
  assert.equal(sun.getDay(), 0);
  assert.equal(weekKey(sun), '2026-10-05', '그 주의 점수는 같은 주 키로 남는다');
  assert.equal(ymd(R.sundayOf('2026-12-28')), '2027-01-03', '해를 넘기는 주');
});
