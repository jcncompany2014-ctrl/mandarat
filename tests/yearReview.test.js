// 한 해 돌아보기 계산 (V1-D, src/lib/yearReview.ts)
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { yearDigest, yearCalendar, doneDay, fillFrames, rangeMonths } = require('../src/lib/yearReview');
const { blankDoc } = require('../src/data/defaults');

function doc() {
  const d = blankDoc();
  d.onboarded = true;
  const A = d.themes[0].actions;
  A[0] = { text: '건강검진', note: '', done: true, kind: 'once' };
  A[1] = { text: '책 12권', note: '', done: true, kind: 'count', goal: 12, count: 12, log: { '2026-02-10': 5, '2026-05-01': 4, '2026-08-20': 3 } };
  A[2] = { text: '아침 걷기', note: '', done: true, kind: 'habit', days: [1, 3, 5], since: '2026-01-01' };
  A[3] = { text: '천천히 말하기', note: '', done: true, kind: 'mind' };
  A[4] = { text: '저금', note: '', done: false, kind: 'count', goal: 100, count: 40, log: { '2026-03-01': 40 } };
  A[5] = { text: '여권', note: '', done: true, kind: 'once' }; // 달성 기록 없음(날짜 모름)
  A[6] = { text: '이미 다 읽음', note: '', done: true, kind: 'count', goal: 5, count: 7, log: { '2026-04-01': 2 } }; // 기록 전부터 목표
  d.dayLog = {
    '2025-12-31': ['0-2'], // 기간 밖
    '2026-01-01': ['0-2'],
    '2026-01-02': ['0-2', '1-x1'],
    '2026-01-03': ['0-2'],
    '2026-02-10': ['0-1'],
    '2026-03-15': ['0-0', '0-3', '0-2'],
    '2026-05-01': ['0-1', '0-2', '1-xhabc_2', '2-0', '3-0'],
    '2026-08-20': ['0-1'],
    '2026-11-30': ['0-3'],
    '2027-01-01': ['0-2'], // 기간 밖
  };
  d.dayMeta = {
    '2026-01-02': { mood: 3, reflection: '시작' },
    '2026-01-20': { reflection: '  ' },
    '2026-03-15': { reflection: '검진' },
    '2026-03-16': { mood: 2 },
    '2027-01-01': { reflection: '밖' },
  };
  d.reviews = {
    '2025-12-29': { at: '2026-01-04', next: [], note: '첫 주' }, // 1/1에 걸친 주
    '2025-12-22': { at: '2025-12-28', next: [], note: '밖' },
    '2026-03-09': { at: '2026-03-15', next: ['0-0'] }, // 메모 없음
    '2026-06-01': { at: '2026-06-07', next: [], note: '여름' },
  };
  return d;
}

test('rangeMonths: 해를 넘기고, 13달까지', () => {
  assert.deepEqual(rangeMonths('2026-11-20', '2027-02-01'), ['2026-11', '2026-12', '2027-01', '2027-02']);
  const long = rangeMonths('2025-01-01', '2026-12-31');
  assert.equal(long.length, 13);
  assert.equal(long[0], '2025-12');
  assert.equal(long[12], '2026-12');
});

test('yearCalendar: 해를 넘는 기간 — 달마다 31칸, 없는 날은 null, 기간 밖은 0', () => {
  const rows = yearCalendar({ '2026-11-19': ['a'], '2026-11-20': ['a', 'b', 'c'], '2026-12-31': ['a', 'b', 'c', 'd', 'e'], '2027-01-02': ['a', 'b'], '2027-01-03': ['a'] }, '2026-11-20', '2027-01-02');
  assert.deepEqual(rows.map((r) => r.month), ['2026-11', '2026-12', '2027-01']);
  for (const r of rows) assert.equal(r.cells.length, 31);
  assert.equal(rows[0].cells[18], 0, '11/19는 기간 전');
  assert.equal(rows[0].cells[19], 3, '11/20 — 3개');
  assert.equal(rows[0].cells[30], null, '11/31은 없다');
  assert.equal(rows[1].cells[30], 4, '12/31 — 5개 이상');
  assert.equal(rows[2].cells[1], 2);
  assert.equal(rows[2].cells[2], 0, '1/3은 기간 뒤');
});

test('yearCalendar: 윤년 2월은 29일까지, 평년은 28일까지', () => {
  const leap = yearCalendar({ '2028-02-29': ['a'] }, '2028-01-01', '2028-03-31');
  assert.equal(leap[1].month, '2028-02');
  assert.equal(leap[1].cells[28], 1);
  assert.equal(leap[1].cells[29], null);
  assert.equal(leap[1].cells[30], null);
  const plain = yearCalendar({}, '2027-02-01', '2027-02-28');
  assert.equal(plain[0].cells[27], 0);
  assert.equal(plain[0].cells[28], null);
});

test('doneDay: 유형마다 — 한 번·마음가짐은 마지막 기록, 쌓기는 목표에 닿은 날, 습관은 null', () => {
  const d = doc();
  assert.equal(doneDay(d, 0, 0), '2026-03-15');
  assert.equal(doneDay(d, 0, 1), '2026-08-20', '5 + 4 + 3 = 12');
  assert.equal(doneDay(d, 0, 2), null, '습관');
  assert.equal(doneDay(d, 0, 3), '2026-11-30');
  assert.equal(doneDay(d, 0, 4), null, '달성 전');
  assert.equal(doneDay(d, 0, 5), null, '기록 없는 달성');
  assert.equal(doneDay(d, 0, 6), null, '기록 전부터 목표에 닿아 있었다');
  // 기록 전 수부터 센다: 이미 6 + 2월 3 + 3월 3 = 12
  d.themes[0].actions[1] = { ...d.themes[0].actions[1], count: 12, log: { '2026-03-01': 3, '2026-02-01': 3 } };
  assert.equal(doneDay(d, 0, 1), '2026-03-01');
});

test('fillFrames: 분기 끝마다 — 날짜를 아는 칸은 그날부터, 습관·날짜 모르는 칸은 마지막에만', () => {
  const d = doc();
  const frames = fillFrames(d, '2026-01-01', '2026-12-31', 4);
  assert.equal(frames.length, 4);
  assert.equal(frames[3].end, '2026-12-31');
  assert.ok(frames[0].end < frames[1].end && frames[1].end < frames[2].end && frames[2].end < frames[3].end);
  const done = (f, ai) => f.themes[0].actions[ai].done;
  // 3/15 달성 — 1분기 끝(4/1 언저리)에 이미
  assert.equal(done(frames[0], 0), true);
  // 쌓기 8/20 — 3분기부터
  assert.deepEqual(frames.map((f) => done(f, 1)), [false, false, true, true]);
  assert.deepEqual(frames.map((f) => f.themes[0].actions[1].count), [5, 9, 12, 12], '그날까지 더한 수');
  // 습관 · 기록 없는 달성 · 기록 전부터 목표 — 마지막에만
  for (const ai of [2, 5, 6]) assert.deepEqual(frames.map((f) => done(f, ai)), [false, false, false, true], String(ai));
  // 마음가짐 11/30 — 마지막에만(3분기 끝 9/30 뒤)
  assert.deepEqual(frames.map((f) => done(f, 3)), [false, false, false, true]);
  // 달성 전 칸은 그대로
  assert.ok(frames.every((f) => f.themes[0].actions[4] === d.themes[0].actions[4]));
  assert.equal(frames[3].themes[0].actions[0], d.themes[0].actions[0], '마지막 장면은 지금 모습 그대로');
  // 하루짜리 기간도 n장
  assert.equal(fillFrames(d, '2026-05-01', '2026-05-01').length, 4);
});

test('yearDigest: 손으로 센 수와 같다', () => {
  const d = doc();
  const g = yearDigest(d, '2026-01-01', '2026-12-31', 125);
  assert.equal(g.days, 8);
  assert.equal(g.checks, 1 + 2 + 1 + 1 + 3 + 5 + 1 + 1);
  assert.equal(g.longest, 3, '1/1 ~ 1/3');
  assert.equal(g.achieved, 6);
  assert.equal(g.written, 2, '빈 한 줄과 기간 밖은 빼고');
  assert.equal(g.focusMins, 125);
  assert.equal(g.months.length, 12);
  assert.deepEqual(g.monthDays, [3, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0]);
  // 3월: 검진 · 4월: 없음 · 8월: 책 · 11월: 마음가짐
  assert.deepEqual(g.monthDone, [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0]);
  assert.equal(g.cellDays.length, 8);
  assert.ok(g.cellDays.every((r) => r.length === 8));
  assert.equal(g.cellDays[0][2], 5, '습관 칸 — 기간 안의 날만');
  assert.equal(g.cellDays[0][1], 3);
  assert.equal(g.cellDays[2][0], 1);
  assert.equal(g.cellDays[1][2], 0, '떼어 둔 기록 · 직접 추가한 할 일은 칸 활동에 넣지 않는다');
  assert.deepEqual(g.weekNotes, [{ week: '2025-12-29', note: '첫 주' }, { week: '2026-06-01', note: '여름' }]);
  assert.deepEqual(g.reflections, [
    { month: '2026-01', items: [{ date: '2026-01-02', text: '시작' }] },
    { month: '2026-03', items: [{ date: '2026-03-15', text: '검진' }] },
  ]);
});

test('yearDigest: 해를 넘는 기간은 13달까지, 빈 문서는 0', () => {
  const g = yearDigest(blankDoc(), '2026-01-01', '2027-03-31', 0);
  assert.equal(g.months.length, 13);
  assert.equal(g.months[0], '2026-03');
  assert.equal(g.days, 0);
  assert.equal(g.longest, 0);
  assert.equal(g.achieved, 0);
  assert.deepEqual(g.weekNotes, []);
  assert.deepEqual(g.reflections, []);
});
