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

// ── W1-C: 정직한 습관 수 · 닫힌 주 · 진하기 · 칸 활동 · 기록 · 한 문장 ─────────────
const R = require('../src/lib/review');
const EVERY = [0, 1, 2, 3, 4, 5, 6];
const habitDoc = (habits, dayLog = {}) => doc((themes) => {
  habits.forEach((h, i) => { themes[0].actions[i] = { text: `습관${i}`, note: '', done: false, kind: 'habit', ...h }; });
  return { dayLog };
});

test('월요일 아침: 습관이 있어도 아직 할 차례는 0 — 밀린 것처럼 보이지 않는다', () => {
  const MON_AM = new Date(2026, 9, 12, 8);
  const r = R.weekReview(habitDoc([{ days: EVERY, since: '2026-10-01' }, { perWeek: 3, since: '2026-10-01' }]), MON_AM);
  assert.equal(r.habitCount, 2);
  assert.equal(r.routineDue, 0);
  assert.equal(r.routineDone, 0);
  assert.equal(r.routinePlannedWeek, 10, '매일 7 + 주 3회');
  assert.equal(r.routineRemaining, 10);
});

test('주 N회를 일찍 채우면 한 만큼이 할 차례 — 다 채운 습관은 남은 게 없다', () => {
  const TUE = new Date(2026, 9, 13, 21);
  const log = { '2026-10-12': ['0-0', '0-1'], '2026-10-13': ['0-0', '0-1'] };
  const r = R.weekReview(habitDoc([{ perWeek: 3, since: '2026-10-01' }, { perWeek: 2, since: '2026-10-01' }], log), TUE);
  assert.equal(r.routineDone, 4);
  assert.equal(r.routineDue, 4, '앞서 간 만큼이 할 차례(⌈3×2/7⌉=1보다 크다)');
  assert.equal(r.routinePlannedWeek, 5);
  assert.equal(r.routineRemaining, 1, '주 3회에 한 번 남음, 주 2회는 다 함');
  assert.equal(r.weeklyDone, 4);
  assert.equal(r.weeklyTarget, 5);
});

test('주 N회의 할 차례는 지난 날만큼 나눈 몫(오늘은 했을 때만), 주 중간에 정했으면 그날부터', () => {
  // 목요일에 정한 주 3회, 토요일 저녁(아직 안 함): 쓸 수 있는 날 목~일 4일 중 지난 날 2일 → ⌈3×2/4⌉ = 2
  const SAT = new Date(2026, 9, 17, 20);
  const r = R.weekReview(habitDoc([{ perWeek: 3, since: '2026-10-15' }], { '2026-10-15': ['0-0'] }), SAT);
  assert.equal(r.routineDue, 2);
  assert.equal(r.routineDone, 1);
  assert.equal(r.routinePlannedWeek, 3);
  assert.equal(r.routineRemaining, 2, '토·일 이틀 안에서 두 번');
  // 오늘 하면 오늘까지 센다
  const r2 = R.weekReview(habitDoc([{ perWeek: 3, since: '2026-10-15' }], { '2026-10-15': ['0-0'], '2026-10-17': ['0-0'] }), SAT);
  assert.deepEqual([r2.routineDue, r2.routineDone, r2.routineRemaining], [3, 2, 1]);
});

test('남은 횟수는 지나간 날을 빼고 센다 — 월요일을 놓친 매일 습관은 수요일에 5번 남음', () => {
  const r = R.weekReview(habitDoc([{ days: EVERY, since: '2026-10-01' }], { '2026-10-13': ['0-0'] }), WED);
  assert.deepEqual([r.routineDone, r.routineDue, r.routinePlannedWeek, r.routineRemaining], [1, 2, 7, 5]);
});

test('닫힌 주: 일요일에 못 한 습관도 놓친 것으로 센다(열린 주는 오늘을 빼고 6, 닫으면 7)', () => {
  const SUN = new Date(2026, 9, 18, 19);
  const log = {};
  for (const d of ['12', '13', '14', '15', '16', '17']) log[`2026-10-${d}`] = ['0-0'];
  log['2026-10-12'].push('0-1');
  log['2026-10-14'].push('0-1');
  const d = habitDoc([{ days: EVERY, since: '2026-10-01' }, { perWeek: 3, since: '2026-10-01' }], log);
  const open = R.weekReview(d, SUN);
  assert.equal(open.routinePlanned, 6);
  assert.equal(open.days.some((x) => x.isToday), true);
  assert.deepEqual([open.routineDone, open.routineDue, open.routineRemaining], [8, 9, 2]);
  const closed = R.weekReview(d, SUN, { closed: true });
  assert.equal(closed.routinePlanned, 7);
  assert.equal(closed.days.some((x) => x.isToday), false);
  assert.deepEqual([closed.routineDone, closed.routineDue, closed.routineRemaining], [8, 10, 0]);
  assert.equal(closed.total, open.total);
});

test('돌아보는 주가 끝난 뒤에 정한 습관은 세지 않는다', () => {
  const r = R.weekReview(habitDoc([{ perWeek: 2, since: '2026-10-20' }, { days: EVERY, since: '2026-10-20' }]), new Date(2026, 9, 18), { closed: true });
  assert.deepEqual([r.habitCount, r.routineDue, r.routinePlannedWeek, r.weeklyTarget], [0, 0, 0, 0]);
});

test('dayBin: 절대 구간 0 · 1 · 2 · 3~4 · 5+', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 12].map(R.dayBin), [0, 1, 2, 3, 3, 4, 4, 4]);
  assert.equal(R.dayBin(-1), 0);
  assert.equal(R.dayBin(NaN), 0);
  assert.deepEqual([...R.DAY_BIN_LABELS], ['1', '2', '3', '5+']);
});

test('cellActivity: 최근 28일(오늘 포함) 칸별로 기록이 있던 날 수, 칸 자리 키만', () => {
  const act = R.cellActivity({ dayLog: {
    '2026-10-14': ['0-0', '0-1', '0-xab', '1-xh1a2b_2', '0-0'],
    '2026-10-13': ['0-0'],
    '2026-09-17': ['7-7'], // 창의 첫날
    '2026-09-16': ['0-0'], // 창 밖
    '2026-10-15': ['0-0'], // 미래
  } }, WED);
  assert.equal(act.length, 8);
  assert.ok(act.every((row) => row.length === 8));
  assert.equal(act[0][0], 2);
  assert.equal(act[0][1], 1);
  assert.equal(act[7][7], 1);
  assert.equal(act[1][2], 0, '떼어 둔 지난 기록은 지금 칸에 붙지 않는다');
  assert.equal(R.cellActivity({ dayLog: { '2026-10-08': ['3-4'] } }, WED, 7)[3][4], 1);
  assert.equal(R.cellActivity({ dayLog: { '2026-10-07': ['3-4'] } }, WED, 7)[3][4], 0);
});

test('longestStreak: 전체 기록에서 가장 길게 이어진 날(빈 날은 끊김, 달이 바뀌어도 이어짐)', () => {
  assert.equal(R.longestStreak({}), 0);
  assert.equal(R.longestStreak({
    '2026-09-29': ['0-0'], '2026-09-30': ['1-0'], '2026-10-01': ['0-0'], '2026-10-02': ['2-x1'],
    '2026-10-03': [], '2026-10-04': ['0-0'], '2026-10-05': ['0-0'],
  }), 4);
  assert.equal(R.longestStreak({ '2026-03-28': ['0-0'], '2026-03-29': ['0-0'], '2026-03-30': ['0-0'] }), 3);
});

test('doneThisMonth: 이번 달에 달성한 한 번·마음가짐 칸과 이번 달에 목표를 넘은 쌓기 칸', () => {
  const d = doc((themes) => {
    const a = themes[0].actions;
    a[0] = { text: '서류', note: '', done: true, kind: 'once' }; // 10/3 달성
    a[1] = { text: '검진', note: '', done: true, kind: 'once' }; // 9/28 달성 — 지난달
    a[2] = { text: '이력서', note: '', done: false, kind: 'once' }; // 기록은 있지만 지금은 달성 아님
    a[3] = { text: '감사', note: '', done: true, kind: 'mind' }; // 10/10 달성
    a[4] = { text: '책', note: '', done: true, kind: 'count', goal: 12, count: 12, log: { '2026-10-02': 3, '2026-09-20': 2 } }; // 9 → 12
    a[5] = { text: '저축', note: '', done: true, kind: 'count', goal: 5, count: 8, log: { '2026-10-02': 2 } }; // 이미 6이었다
    a[6] = { text: '운동', note: '', done: true, kind: 'habit', days: [1] };
    a[7] = { text: '', note: '', done: true };
    return { dayLog: {
      '2026-10-03': ['0-0'], '2026-09-28': ['0-1'], '2026-10-05': ['0-2'], '2026-10-10': ['0-3'],
      '2026-10-12': ['0-6'], '2026-10-15': ['0-7'],
    } };
  });
  assert.equal(R.doneThisMonth(d, WED), 3);
  assert.equal(R.doneThisMonth(d, new Date(2026, 10, 2)), 0, '다음 달에는 다시 0부터');
});

test('weekSentence: 있었던 일만 한 문장으로(받침에 맞는 조사, 40자 이내)', () => {
  const titles = ['건강', '커리어', '공부', '재정', '관계', '취미', '마음', '모험'];
  const mk = (written) => ({ themes: titles.map((title, i) => ({
    title, color: '#478058', icon: 'heart',
    actions: Array.from({ length: 8 }, (_, j) => ({ text: written.includes(i) && j === 0 ? '실천' : '', note: '', done: false })),
  })) });
  const all = [0, 1, 2, 3, 4, 5, 6, 7];
  assert.equal(R.weekSentence({ total: 0, areaCounts: new Array(8).fill(0) }, mk(all)), '');
  assert.equal(R.weekSentence({ total: 9, areaCounts: [9, 0, 0, 0, 0, 0, 0, 0] }, mk(all)), '건강은 9번 챙겼고, 커리어는 아직이에요');
  assert.equal(R.weekSentence({ total: 12, areaCounts: [2, 7, 3, 0, 0, 0, 0, 0] }, mk([0, 1, 2, 5])), '커리어는 7번 챙겼고, 취미는 아직이에요', '비어 있는 영역은 아직이라 하지 않는다');
  assert.equal(R.weekSentence({ total: 5, areaCounts: [5, 0, 0, 0, 0, 0, 0, 0] }, mk([0])), '건강은 5번 챙겼어요');
  assert.equal(R.weekSentence({ total: 8, areaCounts: [1, 1, 1, 1, 1, 1, 1, 1] }, mk(all)), '여덟 영역을 모두 한 번 이상 챙겼어요');
  const long = mk(all);
  long.themes[0].title = '매일 아침 운동하는 건강한 몸 만들기';
  long.themes[1].title = '';
  const s = R.weekSentence({ total: 120, areaCounts: [120, 0, 0, 0, 0, 0, 0, 0] }, long);
  assert.equal(s, '매일 아침 운동하…는 120번 챙겼고, 영역 2는 아직이에요');
  assert.ok(Array.from(s).length <= 40, s);
});

test('weekSentence는 weekReview의 영역별 수를 그대로 쓴다', () => {
  const d = doc((themes) => {
    themes[1].title = '관계';
    themes[3].title = '재정';
    themes[3].actions[0] = { text: '가계부', note: '', done: false };
    return { dayLog: { '2026-10-12': ['1-0', '1-x9'], '2026-10-14': ['1-2'] } };
  });
  const r = R.weekReview(d, WED);
  assert.deepEqual(r.areaCounts, [0, 3, 0, 0, 0, 0, 0, 0]);
  assert.equal(R.weekSentence(r, d), '관계는 3번 챙겼고, 재정은 아직이에요');
});

test('bestDay: 같은 횟수면 더 최근 날, 기록이 없으면 null', () => {
  const cells = [{ date: '2026-10-12', count: 3 }, { date: '2026-10-14', count: 3 }, { date: '2026-10-13', count: 1 }];
  assert.equal(R.bestDay(cells).date, '2026-10-14');
  assert.equal(R.bestDay([...cells].reverse()).date, '2026-10-14');
  assert.equal(R.bestDay([{ date: '2026-10-12', count: 0 }]), null);
  assert.equal(R.bestDay([]), null);
  const r = R.weekReview(doc(() => ({ dayLog: { '2026-10-12': ['0-0', '0-1'], '2026-10-14': ['1-0', '1-1'] } })), WED);
  assert.deepEqual(r.bestDay, { dow: 3, count: 2 }, '월·수 동점 → 수요일');
});

test('firstLogDay: 기록이 있는 가장 이른 날(빈 날은 건너뜀)', () => {
  assert.equal(R.firstLogDay({ '2026-10-03': ['0-0'], '2026-09-30': [], '2026-10-01': ['1-1'] }), '2026-10-01');
  assert.equal(R.firstLogDay({}), null);
});
