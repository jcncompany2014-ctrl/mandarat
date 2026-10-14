require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../src/lib/history');
const { migrate } = require('../src/data/defaults');
const { doneOn, weekCounts } = require('../src/lib/routine');

const T0 = Date.UTC(2026, 9, 14, 9, 30);

function lengths(dayLog) {
  return Object.fromEntries(Object.entries(dayLog).map(([d, l]) => [d, l.length]));
}

test('칸 하나를 떼어 두면 그 칸 키는 사라지고, 날마다 개수와 영역 접두사는 그대로다', () => {
  const dayLog = {
    '2026-10-12': ['0-1', '0-2', '3-xab12'],
    '2026-10-13': ['0-1'],
    '2026-10-14': ['1-1'],
  };
  const out = H.archiveCellLog(dayLog, '0-1', T0);
  assert.deepEqual(lengths(out), lengths(dayLog));
  for (const day of ['2026-10-12', '2026-10-13']) {
    assert.equal(doneOn(out, '0-1', day), false, `${day}: 칸에서 떨어졌다`);
    const moved = out[day].filter((k) => H.isArchivedKey(k));
    assert.equal(moved.length, 1);
    assert.ok(moved[0].startsWith('0-'), '영역 접두사가 남아 영역 연속 기록이 이어진다');
  }
  assert.deepEqual(out['2026-10-12'].filter((k) => !H.isArchivedKey(k)), ['0-2', '3-xab12'], '다른 칸·할 일은 그대로');
  assert.equal(out['2026-10-14'], dayLog['2026-10-14'], '바뀌지 않은 날은 같은 배열');
  assert.deepEqual(dayLog['2026-10-12'], ['0-1', '0-2', '3-xab12'], '원본은 건드리지 않는다');
  // 이번 주 날별 합계도 그대로 — 히트맵·주간 합계가 이어진다
  const today = new Date(2026, 9, 14);
  assert.deepEqual(weekCounts(out, today).map((c) => c.count), weekCounts(dayLog, today).map((c) => c.count));
});

test('떼어 둔 키의 꼴: "ti-xh<시각>_ai"', () => {
  const k = H.archivedKey(5, 7, T0);
  assert.equal(k, `5-xh${T0.toString(36)}_7`);
  assert.ok(H.isArchivedKey(k));
  assert.equal(H.isArchivedKey('5-7'), false);
  assert.equal(H.isArchivedKey('5-xab12'), false, '직접 추가한 할 일 키와 구분된다');
  assert.equal(H.archivedKey(0, 0, NaN), '0-xh0_0', '이상한 시각도 키 형식을 지킨다');
  assert.equal(H.archivedKey(0, 0, 12.7), '0-xhc_0');
  assert.ok(H.isArchivedKey(H.archivedKey(1, 2, 1e300)), '아주 큰 수도 짧은 키로');
  assert.deepEqual(migrate({ dayLog: { '2026-10-14': [H.archivedKey(1, 2, 1e300)] } }).dayLog['2026-10-14'].length, 1);
});

test('바뀐 게 없으면 같은 객체, 칸 키가 아니면 무시', () => {
  const dayLog = { '2026-10-14': ['1-1', '2-xab'] };
  assert.equal(H.archiveCellLog(dayLog, '0-1', T0), dayLog);
  assert.equal(H.archiveCellLog(dayLog, '2-xab', T0), dayLog);
  assert.equal(H.archiveCellLog(dayLog, '9-9', T0), dayLog);
  const onlyExtras = { '2026-10-14': ['2-xab'] };
  assert.equal(H.archiveAllCells(onlyExtras, T0), onlyExtras);
});

test('64칸 모두 떼어 두기 — 직접 추가한 할 일과 이미 떼어 둔 기록은 그대로', () => {
  const old = H.archivedKey(4, 4, T0 - 1000);
  const dayLog = { '2026-10-13': ['0-0', '7-7', '2-xab', old], '2026-10-14': ['3-5'] };
  const out = H.archiveAllCells(dayLog, T0);
  assert.deepEqual(lengths(out), lengths(dayLog));
  for (const list of Object.values(out)) {
    assert.equal(list.some((k) => /^[0-7]-[0-7]$/.test(k)), false, '칸 자리 키가 남지 않는다');
  }
  assert.ok(out['2026-10-13'].includes('2-xab'));
  assert.ok(out['2026-10-13'].includes(old));
  assert.deepEqual(out['2026-10-13'].map((k) => k[0]), ['0', '7', '2', '4'], '순서와 영역 접두사가 그대로');
});

test('같은 시각에 두 번 떼어 내도 한 날에 같은 키가 겹치지 않는다', () => {
  const once = H.archiveCellLog({ '2026-10-14': ['0-1'] }, '0-1', T0);
  const again = H.archiveCellLog({ '2026-10-14': [...once['2026-10-14'], '0-1'] }, '0-1', T0);
  assert.equal(new Set(again['2026-10-14']).size, again['2026-10-14'].length);
});

test('떼어 둔 기록은 저장본 이행(migrate)을 거쳐도 남는다', () => {
  const dayLog = H.archiveAllCells({ '2026-10-13': ['0-0', '7-7'], '2026-10-14': ['3-5', '1-xab'] }, Date.now());
  assert.deepEqual(migrate({ dayLog }).dayLog, dayLog);
});

test('firstLogDay: 기록이 있는 가장 이른 날, 없으면 null', () => {
  assert.equal(H.firstLogDay({}), null);
  assert.equal(H.firstLogDay({ '2026-10-02': [] }), null);
  assert.equal(H.firstLogDay({ '2026-10-14': ['0-0'], '2026-09-30': ['1-1'], '2026-09-01': [] }), '2026-09-30');
});

test('detachReviewPicks: 비운 칸(또는 전체)을 중점에서 떼고 메모는 남긴다', () => {
  const reviews = {
    '2026-10-05': { at: '2026-10-11', next: ['0-1', '2-2'], note: '메모' },
    '2026-09-28': { at: '2026-10-04', next: ['3-3'] },
  };
  const one = H.detachReviewPicks(reviews, '0-1');
  assert.deepEqual(one['2026-10-05'], { at: '2026-10-11', next: ['2-2'], note: '메모' });
  assert.equal(one['2026-09-28'], reviews['2026-09-28']);
  const all = H.detachReviewPicks(reviews);
  assert.deepEqual(Object.values(all).map((r) => r.next), [[], []]);
  assert.equal(all['2026-10-05'].note, '메모');
  assert.equal(H.detachReviewPicks(reviews, '7-7'), reviews, '바뀐 게 없으면 같은 객체');
  assert.equal(H.detachReviewPicks(undefined, '0-1'), undefined);
});

test('areaStreak: 오늘 비어도 어제까지 이어지면 끊기지 않고, 최고 기록은 전체 기록에서 센다', () => {
  const now = new Date(2026, 9, 14, 21); // 수요일
  const dayLog = {};
  const add = (y, m, d, key) => {
    const k = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dayLog[k] = [...(dayLog[k] ?? []), key];
  };
  // 9-30 ~ 10-13: 14일 연속(달을 넘김) — 칸·직접 추가한 할 일·떼어 둔 기록이 섞여 있다
  for (let i = 0; i < 14; i++) {
    const d = new Date(2026, 8, 30 + i);
    add(d.getFullYear(), d.getMonth() + 1, d.getDate(), i % 3 === 0 ? '2-1' : i % 3 === 1 ? '2-xab' : H.archivedKey(2, 5, T0));
  }
  // 200일쯤 전의 30일 연속
  for (let i = 0; i < 30; i++) {
    const d = new Date(2026, 2, 1 + i);
    add(d.getFullYear(), d.getMonth() + 1, d.getDate(), '2-0');
  }
  add(2026, 10, 12, '5-5'); // 다른 영역은 세지 않는다
  let s = H.areaStreak(dayLog, 2, now);
  assert.equal(s.cur, 14, '오늘은 아직 — 어제까지 14일');
  assert.equal(s.best, 30, '오래전 30일 연속도 최고 기록');
  assert.deepEqual(s.week, [1, 1, 0, 0, 0, 0, 0], '이번 주 월~일');
  add(2026, 10, 14, '2-3');
  s = H.areaStreak(dayLog, 2, now);
  assert.equal(s.cur, 15);
  assert.deepEqual(s.week, [1, 1, 1, 0, 0, 0, 0]);
  // 어제가 비면 끊긴다
  const gap = { ...dayLog };
  delete gap['2026-10-13'];
  delete gap['2026-10-14'];
  assert.equal(H.areaStreak(gap, 2, now).cur, 0);
  assert.equal(H.areaStreak({}, 2, now).best, 0);
  assert.deepEqual(H.areaStreak(dayLog, 5, now), { cur: 0, best: 1, week: [1, 0, 0, 0, 0, 0, 0] });
});
