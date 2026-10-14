require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/lib/routine');
const K = require('../src/lib/kinds');

// 2026-10-14는 수요일 — 이번 주는 10/12(월) ~ 10/18(일)
const WED = new Date(2026, 9, 14);
const MON = new Date(2026, 9, 12);
const SUN = new Date(2026, 9, 18);

function blankActions() {
  return Array.from({ length: 8 }, () => ({ text: '', note: '', done: false }));
}
function docWith(patch) {
  const themes = Array.from({ length: 8 }, (_, i) => ({ title: `영역${i}`, color: '#478058', icon: 'heart', actions: blankActions() }));
  return { themes, dayLog: {}, todayKeys: [], todayExtra: [], ...patch(themes) };
}

// ── 유형 ────────────────────────────────────────────────────────────────────
test('kindOf: 저장된 유형이 우선, 없으면 반복 요일로 습관/한 번을 가린다', () => {
  assert.equal(R.kindOf({ text: 'a', days: [1] }), 'habit');
  assert.equal(R.kindOf({ text: 'a' }), 'once');
  assert.equal(R.kindOf({ kind: 'count', days: [1] }), 'count');
  assert.equal(R.kindOf({ kind: 'mind' }), 'mind');
  assert.equal(R.kindOf({ kind: 'weird', days: [2] }), 'habit');
  assert.equal(R.kindOf({ perWeek: 3 }), 'habit');
  assert.equal(R.kindOf(undefined), 'once');
});

test('isRoutine은 습관만 참 — 다른 유형으로 바꾼 칸의 남은 요일은 무시한다', () => {
  assert.equal(R.isRoutine({ days: [2] }), true);
  assert.equal(R.isRoutine({ kind: 'habit', perWeek: 2 }), true);
  assert.equal(R.isRoutine({ kind: 'once', days: [2] }), false);
  assert.equal(R.isRoutine({ kind: 'count', days: [2] }), false);
});

test('habitDays·perWeekOf: 요일이 있으면 요일, 없으면 주 N회, 둘 다 없으면 매일', () => {
  assert.deepEqual(R.habitDays({ kind: 'habit', days: [5, 1] }), [1, 5]);
  assert.deepEqual(R.habitDays({ kind: 'habit', perWeek: 3 }), []);
  assert.equal(R.perWeekOf({ kind: 'habit', perWeek: 3 }), 3);
  assert.equal(R.perWeekOf({ kind: 'habit', days: [1], perWeek: 3 }), 0);
  assert.deepEqual(R.habitDays({ kind: 'habit' }), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(R.habitDays({ kind: 'once', days: [1] }), []);
  assert.equal(R.normalizePerWeek(7), 0);
  assert.equal(R.normalizePerWeek(2.5), 0);
});

test('weekKey는 그 주 월요일, daysBetween은 달력 날 수', () => {
  assert.equal(R.weekKey(WED), '2026-10-12');
  assert.equal(R.weekKey(SUN), '2026-10-12');
  assert.equal(R.daysBetween('2026-10-14', '2026-10-17'), 3);
  assert.equal(R.daysBetween('2026-10-14', '2026-10-10'), -4);
  assert.equal(R.daysBetween('2026-03-28', '2026-03-30'), 2); // 서머타임이 있는 곳에서도
});

// ── 주 N회 습관 ──────────────────────────────────────────────────────────────
test('주 N회 습관은 이번 주 횟수를 채울 때까지 날마다 담기고, 채우면 빠진다', () => {
  const doc = docWith((t) => {
    t[0].actions[0] = { text: '운동', note: '', done: false, kind: 'habit', perWeek: 2 };
    return {};
  });
  assert.equal(R.todayItems(doc, WED).length, 1);
  assert.equal(R.todayItems(doc, WED)[0].scheduled, true);
  doc.dayLog = { '2026-10-12': ['0-0'], '2026-10-13': ['0-0'] };
  assert.equal(R.todayItems(doc, WED).length, 0, '월·화에 두 번 했으니 수요일엔 안 담김');
  // 오늘 이미 했다면(세 번째) 완료로 남는다
  doc.dayLog = { ...doc.dayLog, ['2026-10-14']: ['0-0'] };
  const it = R.todayItems(doc, WED);
  assert.equal(it.length, 1);
  assert.equal(it[0].done, true);
  assert.deepEqual(R.routineWeekCount(doc, 0, 0, WED), { done: 3, planned: 2 });
  // 다음 주 월요일이면 다시 담긴다
  assert.equal(R.todayItems(doc, new Date(2026, 9, 19)).length, 1);
});

test('주 N회 습관의 주간 칸: 한 날만 채우고 놓친 날은 없다', () => {
  const doc = docWith((t) => {
    t[0].actions[0] = { text: '운동', note: '', done: false, kind: 'habit', perWeek: 3 };
    return { dayLog: { '2026-10-12': ['0-0'] } };
  });
  assert.deepEqual(R.routineWeek(doc, 0, 0, WED), ['done', 'off', 'today', 'off', 'off', 'off', 'off']);
});

test('주 N회는 습관을 정한 날(since) 전 기록을 세지 않는다', () => {
  const doc = docWith((t) => {
    t[0].actions[0] = { text: '운동', note: '', done: false, kind: 'habit', perWeek: 1, since: '2026-10-14' };
    return { dayLog: { '2026-10-12': ['0-0'] } };
  });
  assert.equal(R.todayItems(doc, WED).length, 1);
  assert.equal(R.routineWeekCount(doc, 0, 0, WED).done, 0);
});

// ── 한 번: 마감 ──────────────────────────────────────────────────────────────
test('마감이 D-3 안쪽이거나 지난 한 번 실천은 저절로 담기고, 달성하면 빠진다', () => {
  const doc = docWith((t) => {
    t[0].actions[0] = { text: '이력서', note: '', done: false, kind: 'once', due: '2026-10-17' }; // D-3
    t[0].actions[1] = { text: '검진', note: '', done: false, kind: 'once', due: '2026-10-18' }; // D-4
    t[0].actions[2] = { text: '서류', note: '', done: false, kind: 'once', due: '2026-10-01' }; // 지남
    t[0].actions[3] = { text: '끝냄', note: '', done: true, kind: 'once', due: '2026-10-15' };
    return {};
  });
  assert.deepEqual(R.todayItems(doc, WED).map((i) => i.key), ['0-0', '0-2']);
  // 오늘 끝낸 마감 일은 그날 '완료'로 남고(체크하자마자 사라지지 않게), 다음 날엔 빠진다
  doc.themes = doc.themes.map((t, ti) => (ti === 0 ? { ...t, actions: t.actions.map((a, ai) => (ai === 0 ? { ...a, done: true } : a)) } : t));
  doc.dayLog = { '2026-10-14': ['0-0'] };
  const after = R.todayItems(doc, WED);
  assert.deepEqual(after.map((i) => [i.key, i.done]), [['0-0', true], ['0-2', false]]);
  // 다음 날(목): 끝낸 이력서는 빠지고, 검진(10/18)이 D-3이 되어 들어온다
  assert.deepEqual(R.todayItems(doc, new Date(2026, 9, 15)).map((i) => i.key), ['0-1', '0-2']);
  doc.themes = doc.themes.map((t, ti) => (ti === 0 ? { ...t, actions: t.actions.map((a, ai) => (ai === 0 ? { ...a, done: false } : a)) } : t));
  doc.dayLog = {};
  assert.equal(K.dueInfo(doc.themes[0].actions[0], WED).label, 'D-3');
  assert.equal(K.dueInfo(doc.themes[0].actions[2], WED).label, 'D+13');
  assert.equal(K.dueInfo({ text: 'x', note: '', done: false, kind: 'once', due: '2026-10-14' }, WED).label, 'D-day');
  assert.deepEqual([-2, 0, 3].map((n) => K.dueInfo({ text: 'x', note: '', done: false, kind: 'once', due: K.addDays('2026-10-14', n) }, WED).long), ['마감 2일 지남', '오늘 마감', '마감 D-3']);
  assert.equal(K.dueInfo({ text: 'x', note: '', done: false, kind: 'habit', due: '2026-10-14' }, WED), null);
});

// ── 마음가짐 ────────────────────────────────────────────────────────────────
test('마음가짐은 오늘 목록에 넣지 않는다(직접 담아 둔 것도)', () => {
  const doc = docWith((t) => {
    t[1].actions[0] = { text: '감사 표현', note: '', done: false, kind: 'mind' };
    return { todayKeys: ['1-0'] };
  });
  assert.equal(R.todayItems(doc, WED).length, 0);
  assert.deepEqual(R.todayProgress({ ...doc }, WED), { done: 0, total: 0 });
});

test('rateWeek는 이번 주 점수를 매기고 0이면 지우며, 같은 점수면 같은 객체', () => {
  const doc = docWith((t) => {
    t[1].actions[0] = { text: '감사 표현', note: '', done: false, kind: 'mind' };
    return {};
  });
  const a = K.rateWeek(doc, 1, 0, 4, WED);
  assert.deepEqual(a.themes[1].actions[0].ratings, { '2026-10-12': 4 });
  assert.equal(K.ratingOf(a.themes[1].actions[0], SUN), 4);
  assert.equal(K.rateWeek(a, 1, 0, 4, MON), a);
  const b = K.rateWeek(a, 1, 0, 0, WED);
  assert.deepEqual(b.themes[1].actions[0].ratings, {});
  assert.equal(K.rateWeek(doc, 1, 0, 9, WED).themes[1].actions[0].ratings, undefined, '1~5만');
  assert.equal(K.rateWeek(doc, 0, 0, 3, WED), doc, '마음가짐이 아니면 그대로');
  const hist = K.ratingHistory({ ...a.themes[1].actions[0], ratings: { '2026-10-12': 4, '2026-09-28': 2 } }, WED, 3);
  assert.deepEqual(hist, [{ week: '2026-09-28', score: 2 }, { week: '2026-10-05', score: 0 }, { week: '2026-10-12', score: 4 }]);
});

// ── 쌓기 ────────────────────────────────────────────────────────────────────
function countDoc(extra) {
  return docWith((t) => {
    t[2].actions[0] = { text: '책 12권', note: '', done: false, kind: 'count', goal: 12, unit: '권', count: 10, ...extra };
    return {};
  });
}

test('addCount: 수·그날 기록·dayLog를 함께 맞추고, 목표를 넘으면 달성', () => {
  const day = '2026-10-14';
  let d = K.addCount(countDoc(), 2, 0, 1, day);
  let a = d.themes[2].actions[0];
  assert.equal(a.count, 11);
  assert.deepEqual(a.log, { [day]: 1 });
  assert.deepEqual(d.dayLog[day], ['2-0']);
  assert.equal(a.done, false);
  d = K.addCount(d, 2, 0, 1, day);
  a = d.themes[2].actions[0];
  assert.equal(a.count, 12);
  assert.equal(a.done, true, '12/12 → 달성');
  // 되돌려 목표 아래로 → 달성 해제, 그날 더한 게 없으면 기록도 지운다
  d = K.addCount(d, 2, 0, -2, day);
  a = d.themes[2].actions[0];
  assert.equal(a.count, 10);
  assert.equal(a.done, false);
  assert.equal(day in a.log, false);
  assert.equal(day in d.dayLog, false);
});

test('addCount: 0 아래로 내려가지 않고, 쌓기가 아니면 그대로, 소수도 깔끔하게', () => {
  const day = '2026-10-14';
  const doc = countDoc({ count: 1 });
  const d = K.addCount(doc, 2, 0, -5, day);
  assert.equal(d.themes[2].actions[0].count, 0);
  assert.equal(K.addCount(d, 2, 0, -1, day), d);
  assert.equal(K.addCount(doc, 2, 1, 1, day), doc);
  const f = K.addCount(countDoc({ count: 0.1, goal: 5, unit: 'km' }), 2, 0, 0.2, day);
  assert.equal(f.themes[2].actions[0].count, 0.3);
});

test('직접 달성으로 표시한 칸은 목표 선을 넘나들지 않는 한 그대로', () => {
  const day = '2026-10-14';
  const d = K.addCount(countDoc({ count: 3, done: true }), 2, 0, 1, day);
  assert.equal(d.themes[2].actions[0].done, true);
});

test('toggleCountToday: 그날 더한 게 없으면 한 번(step) 더하고, 있으면 그만큼 되돌린다', () => {
  const day = '2026-10-14';
  const doc = countDoc({ count: 2, step: 3 });
  const on = K.toggleCountToday(doc, 2, 0, day);
  assert.equal(on.themes[2].actions[0].count, 5);
  const off = K.toggleCountToday(on, 2, 0, day);
  assert.equal(off.themes[2].actions[0].count, 2);
  assert.equal(day in off.dayLog, false);
});

test('쌓기는 직접 담은 날에만 오늘 목록에 있고, 그날 더했으면 완료', () => {
  const doc = countDoc({ log: { '2026-10-14': 1 } });
  assert.equal(R.todayItems(doc, WED).length, 0);
  doc.todayKeys = ['2-0'];
  const it = R.todayItems(doc, WED);
  assert.equal(it.length, 1);
  assert.equal(it[0].kind, 'count');
  assert.equal(it[0].done, true);
  assert.equal(R.todayItems(doc, new Date(2026, 9, 15))[0].done, false);
});

test('rollover: 담아 둔 쌓기·습관·마음가짐은 그날만, 못 한 한 번은 남는다', () => {
  const doc = docWith((t) => {
    t[0].actions[0] = { text: '한 번', note: '', done: false };
    t[0].actions[1] = { text: '쌓기', note: '', done: false, kind: 'count', goal: 3, count: 0 };
    t[0].actions[2] = { text: '습관', note: '', done: false, kind: 'habit', perWeek: 2 };
    t[0].actions[3] = { text: '마음', note: '', done: false, kind: 'mind' };
    return { todayKeys: ['0-0', '0-1', '0-2', '0-3'], todayDate: '2026-10-13' };
  });
  assert.deepEqual(R.rolloverToday(doc, '2026-10-14').todayKeys, ['0-0']);
});

test('countInfo·countText·countWeekAdded', () => {
  const a = { text: 'x', note: '', done: false, kind: 'count', goal: 1000, unit: '만 원', count: 250, log: { '2026-10-12': 50, '2026-10-14': 30, '2026-10-05': 99 } };
  const c = K.countInfo(a, '2026-10-14');
  assert.equal(c.pct, 25);
  assert.equal(c.today, 30);
  assert.equal(K.countText(c), '250/1,000만 원');
  assert.equal(K.countWeekAdded(a, WED), 80);
  const broken = K.countInfo({ text: 'x', note: '', done: false, kind: 'count', goal: -3, count: NaN });
  assert.equal(broken.goal, 1);
  assert.equal(broken.count, 0);
});

// ── 숫자 ────────────────────────────────────────────────────────────────────
test('fmtNum·parseNum·cleanUnit', () => {
  assert.equal(K.fmtNum(1234567), '1,234,567');
  assert.equal(K.fmtNum(1234.5), '1,234.5');
  assert.equal(K.fmtNum(0.30000000000000004), '0.3');
  assert.equal(K.parseNum('1,000'), 1000);
  assert.equal(K.parseNum(' 2.5 '), 2.5);
  assert.equal(K.parseNum('abc'), undefined);
  assert.equal(K.parseNum('-3'), undefined);
  assert.equal(K.cleanUnit('만원'), '만 원');
  assert.equal(K.cleanUnit('  권 '), '권');
  assert.equal(K.cleanUnit('아주아주긴단위이름입니다'), '아주아주긴단위이');
  assert.equal(K.cleanUnit(3), '');
});

// ── 유형 설정 ────────────────────────────────────────────────────────────────
test('applyConfig: 습관이 되는 날을 since로, 이미 습관이면 since 유지', () => {
  const once = { text: '운동', note: '', done: false };
  const h = K.applyConfig(once, { kind: 'habit', days: [], perWeek: 3 }, '2026-10-14');
  assert.equal(h.kind, 'habit');
  assert.equal(h.perWeek, 3);
  assert.equal('days' in h, false);
  assert.equal(h.since, '2026-10-14');
  const h2 = K.applyConfig(h, { kind: 'habit', days: [1, 3] }, '2026-10-20');
  assert.deepEqual(h2.days, [1, 3]);
  assert.equal('perWeek' in h2, false);
  assert.equal(h2.since, '2026-10-14');
});

test('applyConfig: 다른 유형으로 바꿔도 이전 값은 남아 되돌릴 수 있다', () => {
  const h = { text: '글쓰기', note: '', done: false, days: [1, 3, 5], since: '2026-10-01' };
  const o = K.applyConfig(h, { kind: 'once', due: '2026-11-01' }, '2026-10-14');
  assert.equal(R.kindOf(o), 'once');
  assert.deepEqual(o.days, [1, 3, 5]);
  assert.equal(o.due, '2026-11-01');
  assert.deepEqual(K.configOf(o).days, [1, 3, 5]);
  const back = K.applyConfig(o, { kind: 'habit', days: [1, 3, 5] }, '2026-10-14');
  assert.equal(back.since, '2026-10-14', '다시 습관이 된 날부터 센다');
});

test('applyConfig: 쌓기는 목표·지금까지가 바뀔 때 목표 도달로 달성을 정한다', () => {
  const a = { text: '책', note: '', done: true };
  const c = K.applyConfig(a, { kind: 'count', goal: 12, unit: '권', step: 1, count: 3 }, '2026-10-14');
  assert.equal(c.done, false);
  assert.equal(c.goal, 12);
  assert.equal('step' in c, false);
  const reached = K.applyConfig(c, { kind: 'count', goal: 12, unit: '권', step: 1, count: 12 }, '2026-10-14');
  assert.equal(reached.done, true);
  // 단위만 바꾸면 직접 정한 달성은 그대로
  const manual = { ...c, done: true };
  assert.equal(K.applyConfig(manual, { kind: 'count', goal: 12, unit: '책', step: 1, count: 3 }, '2026-10-14').done, true);
  // 이미 달성한 한 번 칸을 쌓기로 처음 바꿀 땐 목표만큼 채운 값으로 시작
  assert.equal(K.configOf({ text: '책', note: '', done: true, goal: 12 }).count, 12);
});

test('sameConfig는 그 유형에 쓰이는 값만 비교한다', () => {
  assert.equal(K.sameConfig({ kind: 'once', due: undefined, goal: 3 }, { kind: 'once' }), true);
  assert.equal(K.sameConfig({ kind: 'habit', days: [1, 3] }, { kind: 'habit', days: [3, 1], perWeek: 2 }), true);
  assert.equal(K.sameConfig({ kind: 'habit', days: [], perWeek: 2 }, { kind: 'habit', days: [], perWeek: 3 }), false);
  assert.equal(K.sameConfig({ kind: 'count', goal: 3, count: 0 }, { kind: 'count', goal: 3, count: 1 }), false);
  assert.equal(K.sameConfig({ kind: 'mind' }, { kind: 'once' }), false);
});

test('kindLine: 유형별 한 줄', () => {
  const doc = docWith((t) => {
    t[0].actions[0] = { text: 'a', note: '', done: false, days: [1, 3, 5] };
    t[0].actions[1] = { text: 'b', note: '', done: false, kind: 'habit', perWeek: 3 };
    t[0].actions[2] = { text: 'c', note: '', done: false, kind: 'count', goal: 12, unit: '권', count: 5, log: { '2026-10-14': 1 } };
    t[0].actions[3] = { text: 'd', note: '', done: false, kind: 'once', due: '2026-10-16' };
    t[0].actions[4] = { text: 'e', note: '', done: false, kind: 'mind', ratings: { '2026-10-12': 4 } };
    t[0].actions[5] = { text: 'f', note: '', done: false };
    return { dayLog: { '2026-10-13': ['0-1'] } };
  });
  assert.equal(K.kindLine(doc, 0, 0, WED).long, '월·수·금 반복');
  assert.equal(K.kindLine(doc, 0, 1, WED).long, '이번 주 1/3회');
  assert.equal(K.kindLine(doc, 0, 1, WED).plan, '주 3회');
  assert.equal(K.kindLine(doc, 0, 2, WED).long, '5/12권 · 오늘 +1');
  assert.equal(K.kindLine(doc, 0, 2, WED).pct, 42);
  assert.equal(K.kindLine(doc, 0, 3, WED).long, '마감 D-2');
  assert.equal(K.kindLine(doc, 0, 4, WED).long, '마음가짐 · 이번 주 4점');
  assert.equal(K.kindLine(doc, 0, 5, WED), null);
});

test('duePresets·addDays·dateText', () => {
  const p = K.duePresets(WED);
  assert.deepEqual(p.map((x) => x.date), ['2026-10-18', '2026-10-31', '2027-01-14', '2026-12-31']);
  assert.equal(K.addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(K.dateText('2026-10-20', WED), '10.20 (화)');
  assert.equal(K.dateText('2027-01-04', WED), '2027년 1.4 (월)');
});

test('주 N회를 정한 주에는 남은 날만큼만 목표로 센다(토요일에 정한 주 3회 → 그 주 2회)', () => {
  const SAT = new Date(2026, 9, 17);
  const doc = docWith((t) => {
    t[0].actions[0] = { text: '운동', note: '', done: false, kind: 'habit', perWeek: 3, since: '2026-10-17' };
    return {};
  });
  assert.equal(R.weekTarget(doc.themes[0].actions[0], SAT), 2);
  assert.deepEqual(R.routineWeekCount(doc, 0, 0, SAT), { done: 0, planned: 2 });
  assert.equal(K.kindLine(doc, 0, 0, SAT).long, '이번 주 0/2회');
  // 토·일 두 번 하면 그 주는 다 채운 것
  doc.dayLog = { '2026-10-17': ['0-0'] };
  assert.equal(R.todayItems(doc, new Date(2026, 9, 18)).length, 1, '일요일: 1/2라 아직 담김');
  doc.dayLog = { ...doc.dayLog, ['2026-10-18']: ['0-0'] };
  assert.equal(R.routineWeekCount(doc, 0, 0, new Date(2026, 9, 18)).done, 2);
  // 다음 주부터는 3회
  assert.equal(R.weekTarget(doc.themes[0].actions[0], new Date(2026, 9, 20)), 3);
});

test('편집 창에서 지금까지를 줄이면 그날 더한 수도 그 안으로 — 체크 해제가 어긋나지 않는다', () => {
  const day = '2026-10-14';
  let d = K.addCount(countDoc({ count: 10 }), 2, 0, 3, day); // 13, 오늘 +3
  const a = K.applyConfig(d.themes[2].actions[0], { kind: 'count', goal: 12, unit: '권', step: 1, count: 2 }, day);
  assert.equal(a.count, 2);
  assert.deepEqual(a.log, { [day]: 2 });
  d = { ...d, themes: d.themes.map((t, i) => (i === 2 ? { ...t, actions: t.actions.map((x, j) => (j === 0 ? a : x)) } : t)) };
  const off = K.toggleCountToday(d, 2, 0, day);
  assert.equal(off.themes[2].actions[0].count, 0);
  assert.equal(day in off.themes[2].actions[0].log, false);
  assert.equal(day in off.dayLog, false);
  // 0으로 줄였다면 그날 기록도 지운다
  const zero = K.applyConfig(d.themes[2].actions[0], { kind: 'count', goal: 12, step: 1, count: 0 }, day);
  assert.equal(day in zero.log, false);
});

test('어긋난 기록(지금까지 0인데 그날 +1)도 체크 해제로 정리된다', () => {
  const day = '2026-10-14';
  const d = countDoc({ count: 0, log: { [day]: 1 } });
  d.dayLog = { [day]: ['2-0'] };
  const off = K.toggleCountToday(d, 2, 0, day);
  assert.notEqual(off, d);
  assert.equal(day in off.themes[2].actions[0].log, false);
  assert.equal(day in off.dayLog, false);
});

test('clearedAction: 글·유형 값·달성을 지우고 메모만 남긴다', () => {
  const a = { text: '책', note: '메모', done: true, kind: 'count', goal: 12, count: 12, log: { '2026-10-14': 1 }, ratings: { '2026-10-12': 3 }, days: [1], since: '2026-10-01' };
  assert.deepEqual(K.clearedAction(a), { text: '', note: '메모', done: false });
});

// ── W1-C: 마감 빠른 선택 · 숫자 입력 · 쌓기 속도 · 유형 설명 ─────────────────────
test('duePresets: 3개월 뒤는 그달 마지막 날로 맞춘다(11월 30일 → 2월 28일)', () => {
  const p = K.duePresets(new Date(2026, 10, 30));
  assert.deepEqual(p.map((x) => [x.label, x.date]), [
    ['이번 주', '2026-12-06'], ['이번 달', '2026-11-30'], ['3개월 뒤', '2027-02-28'], ['올해 안', '2026-12-31'],
  ]);
  assert.equal(K.duePresets(new Date(2026, 7, 31)).find((x) => x.label === '3개월 뒤').date, '2026-11-30', '8월 31일 → 11월 30일');
  assert.equal(K.duePresets(new Date(2027, 10, 29)).find((x) => x.label === '3개월 뒤').date, '2028-02-29', '윤년 2월');
});

test('duePresets: 날짜가 겹치면 앞의 것만 남긴다', () => {
  // 12월 31일(목): 이번 달 = 올해 안
  assert.deepEqual(K.duePresets(new Date(2026, 11, 31)).map((x) => [x.label, x.date]), [
    ['이번 주', '2027-01-03'], ['이번 달', '2026-12-31'], ['3개월 뒤', '2027-03-31'],
  ]);
  // 5월 31일(일): 이번 주 = 이번 달
  assert.deepEqual(K.duePresets(new Date(2026, 4, 31)).map((x) => [x.label, x.date]), [
    ['이번 주', '2026-05-31'], ['3개월 뒤', '2026-08-31'], ['올해 안', '2026-12-31'],
  ]);
  for (const day of [new Date(2026, 9, 14), new Date(2026, 11, 27), new Date(2026, 1, 28)]) {
    const dates = K.duePresets(day).map((x) => x.date);
    assert.equal(new Set(dates).size, dates.length);
  }
});

test('parseNum: 치다 만 소수도 받고, 숫자가 아닌 꼴은 거른다', () => {
  assert.equal(K.parseNum('.5'), 0.5);
  assert.equal(K.parseNum('7.'), 7);
  assert.equal(K.parseNum('1,000.5'), 1000.5);
  assert.equal(K.parseNum(' 12 '), 12);
  assert.equal(K.parseNum('0.125'), 0.13);
  for (const bad of ['1..5', '7권', '.', '', '-3', '1.2.3', 'e5', '1e3', '0x10']) assert.equal(K.parseNum(bad), undefined, bad);
});

test('countPace: 최근 28일에 더한 수로 목표에 닿는 날을 어림한다', () => {
  const base = { text: '책', note: '', done: false, kind: 'count', goal: 12, unit: '권', count: 6 };
  // 28일 창(9/17~10/14)에 4권 — 하루 1/7권, 남은 6권은 42일 → 11/25
  const a = { ...base, log: { '2026-08-01': 2, '2026-09-16': 5, '2026-09-20': 2, '2026-10-01': 1, '2026-10-10': 1, '2026-10-20': 9 } };
  const p = K.countPace(a, WED);
  assert.equal(p.added, 4, '창 밖(9/16 이전)과 미래 기록은 빼고');
  assert.equal(p.before, 2);
  assert.ok(Math.abs(p.rate - 4 / 28) < 1e-12);
  assert.equal(p.eta, '2026-11-25');
  // 사흘 전에 시작했다면 일주일로 나눈다(사흘로 나눠 부풀리지 않게) — 2권/7일, 남은 8권은 28일
  const fresh = K.countPace({ ...base, goal: 10, count: 2, log: { '2026-10-12': 1, '2026-10-14': 1 } }, WED);
  assert.equal(fresh.eta, '2026-11-11');
  // 열흘 전에 시작 — 열흘로 나눈다: 5권/10일, 남은 5권은 10일
  const tenDays = K.countPace({ ...base, goal: 10, count: 5, log: { '2026-10-05': 3, '2026-10-12': 2 } }, WED);
  assert.ok(Math.abs(tenDays.rate - 0.5) < 1e-12);
  assert.equal(tenDays.eta, '2026-10-24');
});

test('countPace: 이미 닿았거나 속도를 모르면(또는 10년 넘게 걸리면) eta는 null', () => {
  const base = { text: '저축', note: '', done: false, kind: 'count', goal: 100, unit: '만 원', count: 100 };
  assert.equal(K.countPace({ ...base, log: { '2026-10-10': 10 } }, WED).eta, null, '닿았다');
  const idle = K.countPace({ ...base, count: 10, log: { '2026-01-10': 10 } }, WED);
  assert.deepEqual([idle.rate, idle.eta, idle.added, idle.before], [0, null, 0, 10]);
  assert.equal(K.countPace({ ...base, goal: 1_000_000, count: 1, log: { '2026-10-14': 1 } }, WED).eta, null, '10년 넘게');
  assert.equal(K.countPace({ text: 'x', note: '', done: false, kind: 'count', goal: 3 }, WED).eta, null, '기록 없음');
});

test('KIND_HINT: 유형마다 한두 문장, 달성과 헷갈리는 "채워져요"는 쓰지 않는다', () => {
  assert.equal(K.KIND_HINT.once, '마감 사흘 전부터 ‘오늘’에 담겨요');
  assert.equal(K.KIND_HINT.mind, '한 주에 한 번 1~5점으로 돌아봐요');
  for (const h of Object.values(K.KIND_HINT)) assert.equal(h.includes('채워져요'), false, h);
});
