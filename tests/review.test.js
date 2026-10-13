require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { weekReview, calendarWeeks } = require('../src/lib/review');

// 2026-10-14 수요일 — 이번 주 10/12(월)~10/18(일), 지난주 10/5(월)~10/11(일)
const WED = new Date(2026, 9, 14);

function doc(patch) {
  const themes = Array.from({ length: 8 }, (_, i) => ({
    title: `영역${i}`, color: '#478058', icon: 'heart',
    actions: Array.from({ length: 8 }, () => ({ text: '', note: '', done: false })),
  }));
  return { themes, dayLog: {}, ...patch(themes) };
}

test('이번 주는 월~일, 미래 날은 0이고 future로 표시된다', () => {
  const r = weekReview(doc(() => ({ dayLog: { '2026-10-12': ['0-0', '0-1'], '2026-10-14': ['1-0'], '2026-10-16': ['2-2'] } })), WED);
  assert.deepEqual(r.days.map((d) => d.date), ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
  assert.deepEqual(r.days.map((d) => d.count), [2, 0, 1, 0, 0, 0, 0]);
  assert.deepEqual(r.days.map((d) => d.future), [false, false, false, true, true, true, true]);
  assert.equal(r.total, 3);
});

test('지난주는 같은 기간(월~수)만 비교한다', () => {
  const r = weekReview(doc(() => ({
    dayLog: { '2026-10-05': ['0-0'], '2026-10-07': ['0-0', '0-1'], '2026-10-09': ['0-0', '0-1', '0-2'] },
  })), WED);
  assert.equal(r.prev, 3);
});

test('루틴: 예정일 중 해낸 비율, 오늘은 해냈을 때만, 쉬는 날 실천은 비율에 안 넣는다', () => {
  const d = doc((themes) => {
    themes[0].actions[0] = { text: '물 2L', note: '', done: false, days: [0, 1, 2, 3, 4, 5, 6] };
    themes[1].actions[0] = { text: '글쓰기', note: '', done: false, days: [1, 3, 5] };
    themes[1].actions[1] = { text: '', note: '', done: false, days: [1] }; // 빈 칸은 무시
    return { dayLog: { '2026-10-12': ['0-0', '1-0'], '2026-10-13': ['1-0'] } };
  });
  const r = weekReview(d, WED);
  // 물: 월(O) 화(X) 수(오늘, 아직) → 1/2, 글쓰기: 월(O) 수(오늘, 아직) → 1/1
  assert.equal(r.routineDone, 2);
  assert.equal(r.routinePlanned, 3);
  d.dayLog['2026-10-14'] = ['1-0'];
  const r2 = weekReview(d, WED);
  assert.equal(r2.routineDone, 3);
  assert.equal(r2.routinePlanned, 4);
});

test('가장 많이 한 날과 가장 활발한 영역(직접 추가 할 일 포함)', () => {
  const r = weekReview(doc(() => ({
    dayLog: { '2026-10-12': ['2-0'], '2026-10-13': ['2-1', '2-xab', '5-0'], '2026-10-14': ['5-1'] },
  })), WED);
  assert.deepEqual(r.bestDay, { dow: 2, count: 3 });
  assert.deepEqual(r.topArea, { ti: 2, count: 3 });
});

test('기록이 없으면 최고의 날·영역은 null', () => {
  const r = weekReview(doc(() => ({})), WED);
  assert.equal(r.bestDay, null);
  assert.equal(r.topArea, null);
  assert.equal(r.total, 0);
});

test('calendarWeeks: 열은 월~일, 마지막 열이 이번 주, 행 요일이 고정된다', () => {
  const cols = calendarWeeks(WED, 10);
  assert.equal(cols.length, 10);
  assert.equal(cols[9][0].date, '2026-10-12');
  assert.equal(cols[9][6].date, '2026-10-18');
  assert.equal(cols[0][0].date, '2026-08-10');
  for (const col of cols) {
    assert.equal(new Date(`${col[0].date}T12:00:00`).getDay(), 1);
  }
  assert.deepEqual(cols[9].map((c) => c.future), [false, false, false, true, true, true, true]);
  assert.equal(cols[8].some((c) => c.future), false);
});

test('루틴 지킴은 반복을 정한 날(since) 이후만 센다', () => {
  const d = doc((themes) => {
    themes[0].actions[0] = { text: '물 2L', note: '', done: false, days: [0, 1, 2, 3, 4, 5, 6], since: '2026-10-14' };
    return { dayLog: { '2026-10-14': ['0-0'] } };
  });
  const r = weekReview(d, WED);
  assert.equal(r.routineDone, 1);
  assert.equal(r.routinePlanned, 1);
});

test('유형별 주간 돌아보기: 주 N회는 N까지만, 쌓기는 이번 주 더한 수, 마음가짐은 점수', () => {
  const themes = Array.from({ length: 8 }, () => ({ title: '', color: '#478058', icon: 'heart', actions: Array.from({ length: 8 }, () => ({ text: '', note: '', done: false })) }));
  themes[0].actions[0] = { text: '운동', note: '', done: false, kind: 'habit', perWeek: 2 };
  themes[0].actions[1] = { text: '독서', note: '', done: false, kind: 'count', goal: 12, unit: '권', count: 5, log: { '2026-10-12': 1, '2026-10-14': 2, '2026-10-01': 4 } };
  themes[0].actions[2] = { text: '저축', note: '', done: false, kind: 'count', goal: 100, unit: '만 원', count: 50, log: { '2026-10-13': 30 } };
  themes[0].actions[3] = { text: '감사', note: '', done: false, kind: 'mind', ratings: { '2026-10-12': 4 } };
  themes[0].actions[4] = { text: '경청', note: '', done: false, kind: 'mind' };
  themes[0].actions[5] = { text: '바꾼 칸', note: '', done: false, kind: 'once', days: [1, 2, 3] };
  const dayLog = { '2026-10-12': ['0-0', '0-5'], '2026-10-13': ['0-0', '0-5'], '2026-10-14': ['0-0'] };
  const r = weekReview({ themes, dayLog }, new Date(2026, 9, 14));
  assert.equal(r.weeklyTarget, 2);
  assert.equal(r.weeklyDone, 2, '세 번 했어도 2회까지만');
  assert.deepEqual(r.added.map((x) => [x.ai, x.amount, x.unit]), [[2, 30, '만 원'], [1, 3, '권']]);
  assert.deepEqual([r.mindRated, r.mindSum, r.mindTotal], [1, 4, 2]);
  assert.equal(r.routinePlanned, 0, '한 번으로 바꾼 칸의 남은 요일은 습관으로 세지 않는다');
});
