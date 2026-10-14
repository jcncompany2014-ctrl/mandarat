// 손으로 긋는 표시(체크 칸 · 주간 칸 · 동그라미)의 값과 읽기 글 — src/lib/marks.ts
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TICK_PATH, TICK_DASH, MUTED_FILL, CHECK_BORDER, checkBorder, tickInk, seedTilt,
  WEEKDAY_KR, weekdayIndex, STRIP, stripCenters, dayWord, weekStripSummary, weekDayActionLabel, weekDayLabel,
  ellipseLength, ellipsePath,
} = require('../src/lib/marks');
const { MOODS, mix, toHex } = require('../src/theme/moods');
const { PILLAR_COLORS, ACCENTS, GOLD, contrast } = require('../src/theme/palette');

/** 'M5 13.5 L10 18 L19.5 7' → 꺾은선 길이 */
function polylineLength(d) {
  const pts = d.match(/-?\d+(\.\d+)?/g).map(Number);
  let len = 0;
  for (let i = 2; i + 1 < pts.length; i += 2) len += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
  return len;
}

/** 반투명 색(r,g,b,a)을 바탕 위에 겹쳐 그린 실제 색 */
function over(rgba, bg) {
  const [r, g, b, a] = rgba.match(/[\d.]+/g).map(Number);
  const base = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
  return toHex(`rgb(${[r, g, b].map((c, i) => Math.round(c * a + base[i] * (1 - a))).join(', ')})`);
}

test('체크 획: 대시 하나가 획 전체를 덮어 offset 25 → 0이면 한 번에 그어진다', () => {
  const len = polylineLength(TICK_PATH);
  assert.ok(len > 20 && len < TICK_DASH, `획 길이 ${len.toFixed(2)} < 대시 ${TICK_DASH}`);
  // 둥근 끝(굵기 2.6의 절반)까지 더해도 대시 안에 든다
  assert.ok(len + 2.6 <= TICK_DASH);
});

test('빈 체크 칸 테두리: 밝은 종이는 먹 55%, 다크는 흰색 40% — 모든 무드 바탕 위 3:1 이상', () => {
  assert.equal(checkBorder(false), 'rgba(43,38,32,0.55)');
  assert.equal(checkBorder(true), 'rgba(255,255,255,0.40)');
  assert.equal(checkBorder(true), CHECK_BORDER.dark);
  for (const [name, M] of Object.entries(MOODS)) {
    for (const ground of [M.bg, M.surface]) {
      const k = contrast(over(checkBorder(M.dark), ground), ground);
      assert.ok(k >= 3, `${name} ${ground}: ${k.toFixed(2)}`);
    }
  }
});

test('체크 획 색: 진한 칠 위에서도, 옅게(55%) 칠한 칸 위에서도 4.5:1 이상', () => {
  const colors = [...PILLAR_COLORS, ...ACCENTS.map((a) => a.color), GOLD];
  for (const [name, M] of Object.entries(MOODS)) {
    for (const c of colors) {
      const full = tickInk(c, M.bg, false);
      assert.ok(contrast(full, toHex(c)) >= 4.5, `${name} ${c} full`);
      const ground = toHex(mix(M.bg, c, MUTED_FILL));
      const muted = tickInk(c, M.bg, true);
      assert.ok(contrast(muted, ground) >= 4.5, `${name} ${c} muted → ${muted} on ${ground}: ${contrast(muted, ground).toFixed(2)}`);
    }
  }
});

test('seedTilt: 같은 키는 늘 같은 각도, ±3° 안, 키가 없으면 반듯하게', () => {
  assert.equal(seedTilt(undefined), 0);
  assert.equal(seedTilt(''), 0);
  assert.equal(seedTilt('3-5'), seedTilt('3-5'));
  const seen = new Set();
  for (let ti = 0; ti < 8; ti++) {
    for (let ai = 0; ai < 8; ai++) {
      const t = seedTilt(`${ti}-${ai}`);
      assert.ok(Math.abs(t) <= 3, `${ti}-${ai}: ${t}`);
      assert.equal(Math.round(t * 10) / 10, t, '0.1° 단위');
      seen.add(t);
    }
  }
  // 64칸이 몇 가지 각도에 몰리지 않는다(손으로 그은 듯 고르게 흩어짐)
  assert.ok(seen.size >= 30, `서로 다른 각도 ${seen.size}개`);
  assert.ok(Math.abs(seedTilt('x', 1)) <= 1);
});

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
