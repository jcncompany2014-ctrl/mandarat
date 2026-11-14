// 손으로 긋는 표시(요일 칸 · 동그라미)의 값과 읽기 글 — src/lib/marks.ts
// 체크 칸(펜 획 · 네 모습 · 치수)은 tests/a-kit.test.js(패키지 K)가 본다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  WEEKDAY_KR, weekdayIndex, STRIP, stripCenters, dayWord, weekStripSummary, weekDayActionLabel, weekDayLabel,
  ellipseLength, ellipsePath,
} = require('../src/lib/marks');

test('요일 자리: 월요일 0 … 일요일 6', () => {
  assert.deepEqual([...WEEKDAY_KR], ['월', '화', '수', '목', '금', '토', '일']);
  assert.equal(weekdayIndex(new Date(2026, 9, 12)), 0); // 월
  assert.equal(weekdayIndex(new Date(2026, 9, 14)), 2); // 수
  assert.equal(weekdayIndex(new Date(2026, 9, 18)), 6); // 일
});

test('줄 주간 칸: 9pt 일곱 칸 + 사이 3pt = 81pt, 머리글자는 칸 가운데에', () => {
  assert.equal(STRIP.box * 7 + STRIP.gap * 6, STRIP.width);
  assert.deepEqual(stripCenters(), [4.5, 16.5, 28.5, 40.5, 52.5, 64.5, 76.5]);
  const wide = stripCenters(130, 5);
  assert.equal(wide.length, 7);
  assert.ok(Math.abs(wide[0] - (130 - 30) / 7 / 2) < 0.01);
  assert.ok(Math.abs(wide[6] - (130 - wide[0])) < 0.01, '양 끝이 대칭');
});

test('주간 칸 읽기 글: 요일 + 상태, 오늘 한 날은 오늘 함', () => {
  assert.equal(dayWord('done'), '함');
  assert.equal(dayWord('done', true), '오늘 함');
  assert.equal(dayWord('today'), '오늘');
  assert.equal(dayWord('missed'), '놓침');
  assert.equal(dayWord('planned'), '예정');
  assert.equal(dayWord('off'), '쉬는 날');
  assert.equal(
    weekStripSummary(['done', 'missed', 'today', 'planned', 'off', 'off', 'planned'], 2),
    '월 함, 화 놓침, 수 오늘, 목 예정, 금 쉬는 날, 토 쉬는 날, 일 예정',
  );
  // routineWeek()는 오늘 한 날을 'done'으로 준다
  assert.equal(weekStripSummary(['done', 'done', 'off', 'off', 'off', 'off', 'off'], 1).split(', ')[1], '화 오늘 함');
  // 지난주처럼 오늘이 없는 주
  assert.ok(!weekStripSummary(['done', 'done', 'done', 'done', 'done', 'done', 'done'], -1).includes('오늘'));
});

test('시트 주간 칸 버튼 이름: 한 날은 기록 지우기, 아닌 날은 했어요로 남기기', () => {
  assert.equal(weekDayActionLabel(1, false), '화요일 했어요로 남기기');
  assert.equal(weekDayActionLabel(4, true), '금요일 기록 지우기');
  assert.equal(weekDayLabel(2, 'today', true), '수요일 오늘');
  assert.equal(weekDayLabel(0, 'done'), '월요일 함');
});

test('동그라미: 원이면 둘레 2πr, 길쭉한 타원도 근사가 맞고, 경로는 왼쪽 끝에서 시작해 두 호로 닫힌다', () => {
  assert.ok(Math.abs(ellipseLength(10, 10) - 2 * Math.PI * 10) < 1e-9);
  // rx 23, ry 14 — 수치 적분과 비교
  let num = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) {
    const t0 = (i / N) * 2 * Math.PI;
    const t1 = ((i + 1) / N) * 2 * Math.PI;
    num += Math.hypot(23 * (Math.cos(t1) - Math.cos(t0)), 14 * (Math.sin(t1) - Math.sin(t0)));
  }
  assert.ok(Math.abs(ellipseLength(23, 14) - num) < 0.05, `${ellipseLength(23, 14)} vs ${num}`);
  assert.equal(ellipseLength(-1, 5), ellipseLength(0, 5));
  assert.equal(ellipsePath(25, 15.5, 23, 14), 'M2 15.5 A23 14 0 1 1 48 15.5 A23 14 0 1 1 2 15.5');
});
