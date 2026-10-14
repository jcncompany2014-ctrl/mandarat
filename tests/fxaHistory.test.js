// FX-A: 습관 일정 내력(M2) · 유형 바꾸기와 기록(M1·L3) · 달성 풀기(L10) · 연속 기록 상한(L5) · 계산 캐시(P-1·P-3·P-6·P-7)
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/lib/routine');
const K = require('../src/lib/kinds');
const H = require('../src/lib/history');
const RV = require('../src/lib/review');
const { rowFacts } = require('../src/lib/rowFacts');
const { migrate } = require('../src/data/defaults');
const B = require('../src/lib/backup');

const WED = new Date(2026, 9, 14);
const SAT = new Date(2026, 9, 17);
const MWF = [1, 3, 5];
const EVERY = [0, 1, 2, 3, 4, 5, 6];

function blankActions() {
  return Array.from({ length: 8 }, () => ({ text: '', note: '', done: false }));
}
function docWith(patch) {
  const themes = Array.from({ length: 8 }, (_, i) => ({ title: `영역${i}`, color: '#478058', icon: 'heart', actions: blankActions() }));
  return { themes, dayLog: {}, todayKeys: [], todayExtra: [], ...patch(themes) };
}
/** from 날짜부터 거꾸로, 그 요일인 날 n개 */
function lastDays(from, dows, n) {
  const out = [];
  for (let d = new Date(from); out.length < n; d.setDate(d.getDate() - 1)) if (dows.includes(d.getDay())) out.push(R.ymd(d));
  return out.reverse();
}
const logOn = (keys, key = '0-0') => Object.fromEntries(keys.map((k) => [k, [key]]));

// ── M2: 일정 내력 ────────────────────────────────────────────────────────────
test('M2 재현: 월·수·금 20번을 지키고 토요일에 매일로 바꿔도 연속 기록·지난 날은 그대로', () => {
  const days = lastDays(new Date(2026, 9, 16), MWF, 20);
  const doc = docWith((t) => {
    t[0].actions[0] = { text: '글쓰기', note: '', done: false, kind: 'habit', days: MWF, since: days[0] };
    return { dayLog: logOn(days) };
  });
  assert.deepEqual(R.habitStreak(doc, 0, 0, SAT), { cur: 20, best: 20, unit: 'day' });
  assert.deepEqual(R.routineWeek(doc, 0, 0, SAT), ['done', 'off', 'done', 'off', 'done', 'off', 'off']);

  const after = H.configCell(doc, 0, 0, { kind: 'habit', days: EVERY }, '2026-10-17', 1);
  const a = after.themes[0].actions[0];
  assert.deepEqual(a.days, EVERY);
  assert.equal(a.since, days[0], 'since는 그대로');
  assert.deepEqual(a.schedule, [{ from: days[0], days: MWF }, { from: '2026-10-17', days: EVERY }]);
  assert.deepEqual(R.habitStreak(after, 0, 0, SAT), { cur: 20, best: 20, unit: 'day' }, '오늘은 아직이라 끊지 않는다');
  assert.deepEqual(R.routineWeek(after, 0, 0, SAT), ['done', 'off', 'done', 'off', 'done', 'today', 'planned']);
  assert.deepEqual(R.routineWeekCount(after, 0, 0, SAT), { done: 3, planned: 5 }, '화·목은 그때 쉬는 날');
  const rv = RV.weekReview(after, SAT);
  assert.equal(rv.routineDue, 3);
  assert.equal(rv.routineDone, 3);
  // 다음 날(일)을 놓치면 그때부터 끊긴다 — 새 일정은 오늘부터
  assert.deepEqual(R.habitStreak(after, 0, 0, new Date(2026, 9, 19)), { cur: 0, best: 20, unit: 'day' });
});

test('M2: 일정을 고친 적 없는 칸(이전 저장본)은 예전과 같고, 같은 날 되돌리면 내력을 두지 않는다', () => {
  const a = { text: '산책', note: '', done: false, kind: 'habit', days: MWF, since: '2026-09-01' };
  assert.equal(R.scheduleAt(a, '2026-01-01'), a);
  const once = K.applyConfig(a, { kind: 'habit', days: [1, 3] }, '2026-10-14');
  assert.equal(once.schedule.length, 2);
  const again = K.applyConfig(once, { kind: 'habit', days: [2] }, '2026-10-14');
  assert.deepEqual(again.schedule, [{ from: '2026-09-01', days: MWF }, { from: '2026-10-14', days: [2] }], '오늘 고친 것은 덮어쓴다');
  const back = K.applyConfig(again, { kind: 'habit', days: MWF }, '2026-10-14');
  assert.equal(back.schedule, undefined, '지금과 같아지면 내력 없음');
  // 일정 말고 다른 값만 바뀌면 내력도 그대로
  assert.equal(K.applyConfig({ ...once, kind: 'habit' }, { kind: 'habit', days: [1, 3] }, '2026-10-20').schedule, once.schedule);
  // 새로 습관이 되면 처음부터(내력 없음)
  const fresh = K.applyConfig({ ...once, kind: 'once' }, { kind: 'habit', days: EVERY }, '2026-10-20');
  assert.equal(fresh.schedule, undefined);
  assert.equal(fresh.since, '2026-10-20');
});

test('M2: 주 3회 → 주 1회로 줄여도 지난 주의 목표는 3회', () => {
  const days = ['2026-09-28', '2026-09-30', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-08'];
  const doc = docWith((t) => {
    t[0].actions[0] = { text: '운동', note: '', done: false, kind: 'habit', perWeek: 1, since: '2026-09-28',
      schedule: [{ from: '2026-09-28', perWeek: 3 }, { from: '2026-10-12', perWeek: 1 }] };
    return { dayLog: logOn(days) };
  });
  assert.equal(R.weekTarget(doc.themes[0].actions[0], new Date(2026, 9, 4)), 3);
  assert.equal(R.weekTarget(doc.themes[0].actions[0], WED), 1);
  assert.deepEqual(R.habitStreak(doc, 0, 0, WED), { cur: 2, best: 2, unit: 'week' }, '지난 두 주는 3회를 채웠다');
  // 지난주 목표가 3회로 남아 있으니 2회만 한 주는 끊는다
  const short = { ...doc, dayLog: logOn(days.slice(0, 5)) };
  assert.deepEqual(R.habitStreak(short, 0, 0, WED), { cur: 0, best: 1, unit: 'week' });
});

test('M2: migrate·백업이 일정 내력을 다듬어 남기고, 다시 해도 같다', () => {
  const raw = docWith((t) => {
    t[0].actions[0] = {
      text: '물', note: '', done: false, kind: 'habit', days: EVERY, since: '2026-09-01',
      schedule: [
        { from: '2026-10-12', days: [6, 0, 1, 2, 3, 4, 5, 9] },
        { from: 'bad', days: [1] },
        { from: '2026-09-01', days: [3, 1, 5, 5] },
        { from: '2026-09-15', days: [1, 3, 5] }, // 앞과 같아 합친다
        { from: '2026-09-20' }, // 값 없음
        { from: '2026-10-01', perWeek: 9 }, // 범위 밖
      ],
    };
    t[0].actions[1] = { text: '한 번', note: '', done: false, schedule: [{ from: '2026-09-01', days: [1] }, { from: '2026-10-01', days: [2] }] };
    t[0].actions[2] = { text: '하나뿐', note: '', done: false, days: [1], schedule: [{ from: '2026-09-01', days: [1] }] };
    return {};
  });
  const m = migrate(raw);
  assert.deepEqual(m.themes[0].actions[0].schedule, [{ from: '2026-09-01', days: MWF }, { from: '2026-10-12', days: EVERY }]);
  assert.equal(m.themes[0].actions[1].schedule, undefined, '습관 값이 없는 칸은 내력도 없다');
  assert.equal(m.themes[0].actions[2].schedule, undefined, '한 토막은 지금 값과 같다');
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(m))), m);
  const r = B.parseBackup(B.makeBackup(m));
  assert.ok(r.ok);
  assert.deepEqual(r.doc.themes[0].actions[0].schedule, m.themes[0].actions[0].schedule);
  // 이전 저장본(내력 없음)은 필드를 만들지 않는다
  assert.ok(!('schedule' in migrate(docWith((t) => { t[0].actions[0] = { text: 'a', note: '', done: false, days: [1] }; return {}; })).themes[0].actions[0]));
});

// ── M1 · L3: 유형 바꾸기 ─────────────────────────────────────────────────────
test('M1: 오늘 체크한 습관을 쌓기로 바꿨다 되돌려도 오늘 체크와 지난 기록이 남는다', () => {
  const doc = docWith((t) => {
    t[0].actions[0] = { text: '물', note: '', done: false, kind: 'habit', days: EVERY, since: '2026-01-01' };
    return { dayLog: { '2026-10-13': ['0-0'], '2026-10-14': ['0-0'] } };
  });
  const count = H.configCell(doc, 0, 0, { kind: 'count', goal: 10 }, '2026-10-14', 1);
  assert.deepEqual(count.dayLog, doc.dayLog, '습관이던 칸의 기록은 그대로');
  const back = H.configCell(count, 0, 0, { kind: 'habit', days: EVERY }, '2026-10-14', 2);
  assert.ok(R.doneOn(back.dayLog, '0-0', '2026-10-14'));
  assert.equal(R.todayItems(back, WED)[0].done, true);
});

test('L3: 오늘 끝낸 한 번을 습관으로 바꾸면 그 기록은 칸에서 떼어 둔다(오늘 습관 했어요로 보이지 않게)', () => {
  const doc = docWith((t) => {
    t[0].actions[0] = { text: '정리', note: '', done: true };
    return { dayLog: { '2026-10-14': ['0-0', '1-1'] } };
  });
  const out = H.configCell(doc, 0, 0, { kind: 'habit', days: EVERY }, '2026-10-14', 36);
  assert.deepEqual(out.dayLog['2026-10-14'], ['0-xh10_0', '1-1'], '지우지 않고 이름만 바꾼다');
  assert.equal(R.routineWeek(out, 0, 0, WED)[2], 'today');
  assert.equal(R.todayItems(out, WED).find((i) => i.key === '0-0').done, false);
});

test('쌓기 → 쌓기는 줄인 만큼 그날 기록을 맞추고, 한 번 → 쌓기는 쌓은 수(log)만 기록으로', () => {
  const doc = docWith((t) => {
    t[0].actions[0] = { text: '책', note: '', done: false, kind: 'count', goal: 10, count: 2, log: { '2026-10-14': 2 } };
    t[0].actions[1] = { text: '정리', note: '', done: true };
    return { dayLog: { '2026-10-14': ['0-0', '0-1'] } };
  });
  const cut = H.configCell(doc, 0, 0, { kind: 'count', goal: 10, count: 0 }, '2026-10-14', 1);
  assert.deepEqual(cut.dayLog['2026-10-14'], ['0-1']);
  const toCount = H.configCell(doc, 0, 1, { kind: 'count', goal: 5 }, '2026-10-14', 36);
  assert.deepEqual(toCount.dayLog['2026-10-14'], ['0-0', '0-xh10_1']);
  // 쌓기 → 습관: 쌓은 날만 떼어 낸다(그 밖의 날 기록은 습관이던 때의 체크)
  const mixed = { ...doc, dayLog: { '2026-10-13': ['0-0'], '2026-10-14': ['0-0'] } };
  const toHabit = H.configCell(mixed, 0, 0, { kind: 'habit', days: EVERY }, '2026-10-14', 36);
  assert.deepEqual(toHabit.dayLog, { '2026-10-13': ['0-0'], '2026-10-14': ['0-xh10_0'] });
});

// ── L10 · L5 ─────────────────────────────────────────────────────────────────
test('L10: 어제 끝낸 한 번을 오늘 풀면 어제 기록을 뺀다', () => {
  const doc = docWith((t) => {
    t[0].actions[0] = { text: '정리', note: '', done: true };
    return { dayLog: { '2026-10-13': ['0-0', '1-1'] } };
  });
  const out = H.toggleCellDone(doc, 0, 0, '2026-10-14');
  assert.equal(out.themes[0].actions[0].done, false);
  assert.deepEqual(out.dayLog, { '2026-10-13': ['1-1'] });
  const again = H.toggleCellDone(out, 0, 0, '2026-10-14');
  assert.deepEqual(again.dayLog['2026-10-14'], ['0-0'], '다시 달성하면 오늘에');
  // 습관의 칸 달성은 기록을 건드리지 않는다
  const h = docWith((t) => { t[0].actions[0] = { text: 'h', note: '', done: false, days: EVERY }; return { dayLog: { '2026-10-14': ['0-0'] } }; });
  assert.equal(H.toggleCellDone(h, 0, 0, '2026-10-14').dayLog, h.dayLog);
});

test('L5: 지금 이어 가는 날은 400일에서 멈추지 않는다', () => {
  const days = lastDays(new Date(2026, 9, 13), EVERY, 450);
  assert.equal(H.activeStreak(logOn(days), WED), 450, '오늘이 비어도 어제까지');
  assert.equal(H.activeStreak({ ...logOn(days), '2026-10-14': ['0-0'] }, WED), 451);
  assert.equal(H.activeStreak({ '2026-10-12': ['0-0'] }, WED), 0);
});

// ── P-1: habitStreak 빠른 계산이 예전 계산과 같다 ─────────────────────────────
/** 예전(5fc3a3e) 알고리즘 그대로 — 일정 내력이 없는 칸에서 비교 */
function oldHabitStreak(doc, ti, ai, today) {
  const a = doc.themes[ti]?.actions[ai];
  if (!a || R.kindOf(a) !== 'habit') return { cur: 0, best: 0, unit: 'day' };
  const key = `${ti}-${ai}`;
  const tk = R.ymd(today);
  const unit = R.perWeekOf(a) > 0 ? 'week' : 'day';
  let start = null;
  for (const [day, list] of Object.entries(doc.dayLog)) if (day <= tk && (start === null || day < start) && list.includes(key)) start = day;
  if (start === null) return { cur: 0, best: 0, unit };
  if (a.since && a.since > start) start = a.since;
  const floor = R.ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (R.STREAK_SPAN - 1)));
  if (floor > start) start = floor;
  if (start > tk) return { cur: 0, best: 0, unit };
  const [sy, sm, sd] = start.split('-').map(Number);
  let run = 0;
  let best = 0;
  if (unit === 'day') {
    for (let i = 0; ; i++) {
      const d = new Date(sy, sm - 1, sd + i);
      const k = R.ymd(d);
      if (k > tk) break;
      if (!R.scheduledOn(a, d)) continue;
      if (R.doneOn(doc.dayLog, key, k)) best = Math.max(best, ++run);
      else if (k !== tk) run = 0;
    }
    return { cur: run, best, unit };
  }
  const first = R.weekDates(new Date(sy, sm - 1, sd))[0];
  for (let w = 0; ; w++) {
    const week = R.weekDates(new Date(first.getFullYear(), first.getMonth(), first.getDate() + w * 7));
    if (R.ymd(week[0]) > tk) break;
    const sun = R.ymd(week[6]);
    const current = sun >= tk;
    const target = R.weekTarget(a, week[0]);
    const done = R.weekDone(doc.dayLog, key, current ? today : week[6], a.since);
    if (done >= target) best = Math.max(best, ++run);
    else if (!current) run = 0;
    else {
      const left = R.daysBetween(tk, sun) + (R.doneOn(doc.dayLog, key, tk) ? 0 : 1);
      if (left < target - done) run = 0;
    }
  }
  return { cur: run, best, unit };
}

/** 시드가 있는 의사 난수 */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('P-1: 2년치 무작위 문서에서 habitStreak이 예전 계산과 같다(체크를 하나씩 바꿔 가며)', () => {
  const rand = rng(20261014);
  const today = new Date(2026, 9, 14);
  const doc = docWith((t) => {
    for (let ti = 0; ti < 8; ti++) for (let ai = 0; ai < 4; ai++) {
      const weekly = rand() < 0.35;
      const days = EVERY.filter(() => rand() < 0.55);
      const since = rand() < 0.5 ? R.ymd(new Date(2025, Math.floor(rand() * 20), 1 + Math.floor(rand() * 28))) : undefined;
      t[ti].actions[ai] = {
        text: `습관${ti}${ai}`, note: '', done: false, kind: 'habit',
        ...(weekly ? { perWeek: 1 + Math.floor(rand() * 6) } : { days: days.length ? days : [1] }),
        ...(since ? { since } : {}),
      };
    }
    const dayLog = {};
    for (let i = 0; i < 760; i++) {
      const k = R.ymd(new Date(2026, 9, 14 - i));
      const list = [];
      for (let ti = 0; ti < 8; ti++) for (let ai = 0; ai < 4; ai++) if (rand() < 0.7) list.push(`${ti}-${ai}`);
      if (rand() < 0.1) list.push('0-x123');
      if (list.length) dayLog[k] = list;
    }
    return { dayLog };
  });
  const check = (d, when) => {
    for (let ti = 0; ti < 8; ti++) for (let ai = 0; ai < 4; ai++) {
      assert.deepEqual(R.habitStreak(d, ti, ai, when), oldHabitStreak(d, ti, ai, when), `${ti}-${ai} ${R.ymd(when)}`);
    }
  };
  check(doc, today);
  check(doc, new Date(2026, 9, 18));
  check(doc, new Date(2025, 11, 31));
  // 체크를 하나씩 뒤집는다(저장소처럼 새 dayLog) — 바뀐 날만 고쳐 만든 모음도 같아야 한다
  let d = doc;
  for (let n = 0; n < 40; n++) {
    const day = R.ymd(new Date(2026, 9, 14 - Math.floor(rand() * 60)));
    const key = `${Math.floor(rand() * 8)}-${Math.floor(rand() * 4)}`;
    d = { ...d, dayLog: R.toggleDayLog(d.dayLog, key, day) };
    check(d, today);
  }
  // 같은 문서·같은 날이면 같은 객체(다시 세지 않는다)
  assert.equal(R.habitStreak(d, 0, 0, today), R.habitStreak(d, 0, 0, today));
});

// ── P-3 · P-6 · P-7 캐시 ─────────────────────────────────────────────────────
test('P-3: todayItems는 같은 문서·같은 날이면 같은 얼린 배열, 바뀌면 새로 센다', () => {
  const doc = docWith((t) => {
    t[0].actions[0] = { text: '물', note: '', done: false, days: EVERY };
    return {};
  });
  const a = R.todayItems(doc, WED);
  assert.equal(R.todayItems({ ...doc }, new Date(2026, 9, 14, 23)), a);
  assert.ok(Object.isFrozen(a) && Object.isFrozen(a[0]));
  const b = R.todayItems({ ...doc, dayLog: { '2026-10-14': ['0-0'] } }, WED);
  assert.notEqual(b, a);
  assert.equal(b[0].done, true);
  assert.notEqual(R.todayItems(doc, new Date(2026, 9, 15)), a);
});

test('P-6: normalizeDays는 같은 배열에 같은 결과', () => {
  const days = [5, 1, 3, 3];
  assert.equal(R.normalizeDays(days), R.normalizeDays(days));
  assert.deepEqual(R.normalizeDays(days), MWF);
});

test('P-7: rowFacts는 문서 한 판마다 줄 계산을 한 번만', () => {
  const doc = docWith((t) => {
    t[0].actions[0] = { text: '운동', note: '', done: false, kind: 'habit', perWeek: 3 };
    t[0].actions[1] = { text: '책', note: '', done: false, kind: 'count', goal: 12, unit: '권', count: 7 };
    return { dayLog: { '2026-10-12': ['0-0'] } };
  });
  const f = rowFacts(doc, 0, 0, WED);
  assert.equal(rowFacts(doc, 0, 0, WED), f);
  assert.deepEqual(f.weekCount, { done: 1, planned: 3 });
  assert.equal(f.week.length, 7);
  assert.equal(rowFacts(doc, 0, 1, WED).line.speech, '12권 중 7권');
  assert.equal(rowFacts(doc, 0, 1, WED).week, null);
  assert.notEqual(rowFacts({ ...doc, dayLog: {} }, 0, 0, WED), f);
});
