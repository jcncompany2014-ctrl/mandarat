// 불변식 퍼즈 테스트 — 씨앗을 고정한 무작위 저장본과 무작위 조작 2,000벌로 순수 함수의 약속을 확인한다.
// 1) migrate는 멱등이다(JSON으로 저장했다 읽어도 같다)
// 2) 백업을 만들고 다시 읽으면 같은 문서다
// 3) 칸을 비우고(기록 떼어 두기) 같은 칸에 새 습관을 쓰면 오늘 한 것으로 보이지 않는다
// 4) 하루 정리(rolloverToday)는 멱등이다
// 5) 기록 떼어 두기는 날마다 개수를 바꾸지 않는다
// (스키마 4: 알림·종이 무늬·습관 알림·지난 표도 무작위로 만든다)
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { migrate } = require('../src/data/defaults');
const { makeBackup, parseBackup } = require('../src/lib/backup');
const { archiveAllCells, archiveCellLog, detachReviewPicks } = require('../src/lib/history');
const { doneToday, rolloverToday, toggleDayLog, ymd } = require('../src/lib/routine');
const { addCount, applyConfig, clearedAction, rateWeek, toggleCountToday } = require('../src/lib/kinds');

const RUNS = 2000;

/** mulberry32 — 씨앗이 같으면 늘 같은 수열 */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gen(r) {
  const int = (n) => Math.floor(r() * n);
  const chance = (p) => r() < p;
  const one = (xs) => xs[int(xs.length)];
  const JUNK = [null, undefined, 'x', -0, NaN, Infinity, -1, 0.5, 1e12, [], {}, true, '__proto__', 'constructor', '2026-13-01'];
  const junk = () => one(JUNK);
  const date = () => (chance(0.08) ? one(['yesterday', '2026-02-30', '2026-13-01', '']) : ymd(new Date(2026, 8, 1 + int(61))));
  const monday = () => ymd(new Date(2026, 8, 7 + 7 * int(8)));
  const cellKey = () => `${int(8)}-${int(8)}`;
  const logKey = () => one([cellKey, cellKey, cellKey, () => `${int(8)}-x${one(['ab12', 'm0', 'zz_9'])}`, () => `${int(8)}-xh${int(1e9).toString(36)}_${int(8)}`, () => one(['9-9', '0-8', 5, null])])();
  const num = () => (chance(0.15) ? junk() : one([0, 1, 2, 3, 12, 0.25, 7.5, 300, -0.001, 1e10]));
  const record = (n, k, v) => {
    const o = {};
    for (let i = 0; i < n; i++) o[k()] = v();
    return o;
  };
  const action = () => {
    if (chance(0.05)) return junk();
    const a = { text: one(['', '', '  ', '걷기', '책 12권 읽기', '물 2L', '명상']), note: one(['', '메모']), done: chance(0.1) ? junk() : chance(0.3) };
    if (chance(0.6)) a.kind = one(['once', 'habit', 'count', 'mind', 'magic']);
    if (chance(0.3)) a.days = chance(0.1) ? junk() : Array.from({ length: int(5) }, () => one([0, 1, 2, 3, 4, 5, 6, 7, -0, 'mon']));
    if (chance(0.2)) a.perWeek = one([0, 1, 3, 6, 7, 2.5, '3']);
    if (chance(0.3)) a.since = date();
    if (chance(0.3)) a.goal = num();
    if (chance(0.2)) a.unit = one(['권', ' 만원 ', 'km', 7, '아주아주긴단위이름']);
    if (chance(0.2)) a.step = num();
    if (chance(0.3)) a.count = num();
    if (chance(0.3)) a.log = record(int(4), date, num);
    if (chance(0.2)) a.due = date();
    if (chance(0.2)) a.ratings = record(int(4), monday, () => one([1, 3, 5, 0, 6, 2.5, -0]));
    if (chance(0.2)) a.remindAt = one(['07:30', '21:05', '24:00', '7:30', '', 730, null]);
    return a;
  };
  const theme = () => (chance(0.05) ? junk() : {
    title: one(['건강', '커리어', '', '여행', 7]),
    color: one(['#478058', '#2FA968', '#123456', 'red']),
    icon: one(['heart', 'lotus', 'flame', 'constructor', 3]),
    actions: chance(0.05) ? junk() : Array.from({ length: int(10) }, action),
  });
  const raw = {
    version: one([1, 2, undefined]),
    onboarded: chance(0.8),
    centerGoal: one(['', '최고의 나', 7, '  ']),
    themes: chance(0.05) ? junk() : Array.from({ length: int(10) }, theme),
    todayKeys: Array.from({ length: int(6) }, () => (chance(0.8) ? cellKey() : junk())),
    todayExtra: Array.from({ length: int(4) }, () => (chance(0.1) ? junk() : { id: one(['a1', 'a1', 'zz', '../bad', undefined]), ti: one([0, 3, -0, 9, 2.5]), text: one(['전화', '', '  ', '장보기']), done: chance(0.5) })),
    dayLog: record(int(12), date, () => (chance(0.05) ? junk() : Array.from({ length: int(5) }, logKey))),
    dayMeta: record(int(4), date, () => (chance(0.1) ? junk() : { mood: one([0, 2, 4, 5, -0, 1.5]), reflection: one(['좋은 하루', 3, undefined]) })),
    focusMinutes: num(),
    settings: chance(0.1) ? junk() : {
      mood: one(['연꽃', '다크', '네온']), accent: one(['#B0883C', '#F4793B', '#5068AB', 'blue']), mgmt: one(['칸반', '?']),
      cellShape: one(['각진', '둥근', 0]), lastBackupAt: chance(0.5) ? date() : undefined,
      reminders: chance(0.5) ? undefined : chance(0.1) ? junk() : {
        morning: one(['08:00', '8:00', '23:59', '', undefined, 9]), evening: one(['21:30', '25:00', undefined]), review: one([true, false, 'yes', undefined]),
      },
      paper: one(['grid', 'lines', 'blank', 'dots', undefined, 3]),
    },
    todayDate: chance(0.7) ? date() : junk(),
    areasSet: one([true, false, undefined, 'yes']),
    reviews: chance(0.1) ? junk() : record(int(4), () => (chance(0.8) ? monday() : date()), () => (chance(0.1) ? junk() : {
      at: date(), next: Array.from({ length: int(6) }, () => (chance(0.8) ? cellKey() : junk())), note: one([undefined, '', '  메모  ', '가'.repeat(130)]),
    })),
    archives: chance(0.5) ? undefined : chance(0.05) ? junk() : Array.from({ length: int(4) }, () => (chance(0.1) ? junk() : {
      id: one(['y20260901', 'y20260901', 'y20260915', '../bad', undefined]), from: date(), to: date(),
      centerGoal: one(['지난 목표', 7, undefined]),
      themes: chance(0.1) ? junk() : Array.from({ length: int(9) }, theme),
      dayLog: record(int(5), date, () => Array.from({ length: int(3) }, logKey)),
      dayMeta: record(int(3), date, () => ({ mood: one([0, 3, 9]), reflection: one(['괜찮은 날', undefined]) })),
      reviews: record(int(3), monday, () => ({ at: date(), next: [cellKey()], note: one([undefined, '메모']) })),
      closedDays: Array.from({ length: int(4) }, date),
      focusMinutes: one([0, 25, -3, 2.5, '9', undefined]),
      note: one([undefined, '', '  한 줄  ', '나'.repeat(130)]),
    })),
    chartStart: one([undefined, date(), 'today']),
    focusStart: one([undefined, 0, 5, 10, 1e12, -1, 2.5]),
  };
  return { raw, int, chance, one, date, cellKey };
}

const roundTrip = (x) => JSON.parse(JSON.stringify(x));
const TODAY = new Date(2026, 9, 14, 9, 30);
const TK = ymd(TODAY);

/** 무작위 조작 하나 — 앱의 저장소가 쓰는 순수 함수만 */
function step(d, g) {
  const ti = g.int(8);
  const ai = g.int(8);
  const key = `${ti}-${ai}`;
  const day = g.chance(0.6) ? TK : g.date();
  switch (g.int(9)) {
    case 0: return { ...d, dayLog: toggleDayLog(d.dayLog, key, day) };
    case 1: return addCount(d, ti, ai, g.one([1, -1, 2.5, 100, -1000]), day);
    case 2: return toggleCountToday(d, ti, ai, day);
    case 3: return rateWeek(d, ti, ai, g.int(7), TODAY);
    case 4: {
      const cfg = g.one([{ kind: 'habit', days: [1, 3, 5] }, { kind: 'habit', perWeek: 3, remindAt: '07:30' }, { kind: 'habit', days: [0], remindAt: '99:99' }, { kind: 'count', goal: 5, step: 2 }, { kind: 'once', due: TK }, { kind: 'mind' }]);
      return { ...d, themes: d.themes.map((t, i) => (i === ti ? { ...t, actions: t.actions.map((a, j) => (j === ai ? { ...applyConfig(a, cfg, TK), text: a.text || '새 실천' } : a)) } : t)) };
    }
    case 5: return {
      ...d,
      dayLog: archiveCellLog(d.dayLog, key, 1_760_000_000_000 + g.int(1e6)),
      reviews: detachReviewPicks(d.reviews, key),
      themes: d.themes.map((t, i) => (i === ti ? { ...t, actions: t.actions.map((a, j) => (j === ai ? clearedAction(a) : a)) } : t)),
    };
    case 6: return { ...d, dayLog: archiveAllCells(d.dayLog, 1_760_000_000_000 + g.int(1e6)), reviews: detachReviewPicks(d.reviews) };
    case 7: return rolloverToday(d, day);
    default: return { ...d, todayKeys: [...new Set([...d.todayKeys, key])] };
  }
}

test(`불변식 ${RUNS}벌: migrate 멱등 · 백업 왕복 · 칸 비우기 뒤 새 습관 · 하루 정리 멱등`, () => {
  const r = rng(20261014);
  for (let run = 0; run < RUNS; run++) {
    const g = gen(r);
    const label = `run ${run}`;

    // 1) 무작위 저장본 → migrate는 멱등(JSON 왕복 포함)
    const m = migrate(g.raw);
    assert.deepEqual(migrate(roundTrip(m)), m, `${label}: migrate(migrate(x))`);
    assert.deepEqual(roundTrip(m), m, `${label}: JSON 왕복`);

    // 무작위 조작
    let d = m;
    for (let i = 0, n = 1 + g.int(8); i < n; i++) d = step(d, g);
    const m2 = migrate(roundTrip(d));
    assert.deepEqual(migrate(roundTrip(m2)), m2, `${label}: 조작 뒤 migrate 멱등`);

    // 2) 백업 왕복
    const doc = { ...m2, onboarded: true };
    const back = parseBackup(makeBackup(doc, TODAY));
    assert.equal(back.ok, true, label);
    assert.deepEqual(back.doc, doc, `${label}: parseBackup(makeBackup(d)).doc`);

    // 3) 오늘 체크한 칸을 비우고 같은 칸에 새 습관을 쓰면 — 오늘 한 것으로 보이지 않는다
    const ti = g.int(8);
    const ai = g.int(8);
    const key = `${ti}-${ai}`;
    const before = { ...m2, dayLog: toggleDayLog(m2.dayLog, key, TK) };
    const logged = (before.dayLog[TK] ?? []).includes(key) ? before : { ...m2, dayLog: toggleDayLog(before.dayLog, key, TK) };
    assert.ok(logged.dayLog[TK].includes(key), label);
    const time = 1_760_000_000_000 + run;
    const cleared = clearedAction(logged.themes[ti].actions[ai]);
    const dayLog = archiveCellLog(logged.dayLog, key, time);
    const habit = { ...applyConfig(cleared, { kind: 'habit', days: [0, 1, 2, 3, 4, 5, 6] }, TK), text: '새 습관' };
    assert.equal(doneToday({ dayLog }, habit, key, TK), false, `${label}: 새 습관이 이전 체크를 이어받지 않는다`);
    const count = { ...applyConfig(cleared, { kind: 'count', goal: 3 }, TK), text: '새 쌓기' };
    assert.equal(doneToday({ dayLog }, count, key, TK), false, `${label}: 새 쌓기도 마찬가지`);

    // 5) 떼어 두기는 날마다 개수를 지킨다
    for (const [k, list] of Object.entries(logged.dayLog)) assert.equal(dayLog[k].length, list.length, `${label}: ${k}`);
    const all = archiveAllCells(logged.dayLog, time);
    for (const [k, list] of Object.entries(logged.dayLog)) assert.equal(all[k].length, list.length, `${label}: 전체 ${k}`);

    // 4) 하루 정리는 멱등
    const day = g.date();
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      const once = rolloverToday(m2, day);
      assert.deepEqual(rolloverToday(once, day), once, `${label}: rolloverToday`);
    }
  }
});
