require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/lib/routine');

// 2026-10-14는 수요일 — 이번 주는 10/12(월) ~ 10/18(일)
const WED = new Date(2026, 9, 14);
const SUN = new Date(2026, 9, 11);

function blankActions() {
  return Array.from({ length: 8 }, () => ({ text: '', note: '', done: false }));
}

function docWith(patch) {
  const themes = Array.from({ length: 8 }, (_, i) => ({ title: `영역${i}`, color: '#478058', icon: 'heart', actions: blankActions() }));
  return { themes, dayLog: {}, todayKeys: [], todayExtra: [], ...patch(themes) };
}

test('ymd는 로컬 날짜를 YYYY-MM-DD로 만든다', () => {
  assert.equal(R.ymd(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(R.ymd(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
});

test('normalizeDays는 0~6 정수만 남기고 중복 제거·정렬한다', () => {
  assert.deepEqual(R.normalizeDays([3, 1, 1, 7, -1, 2.5, '2', 0]), [0, 1, 3]);
  assert.deepEqual(R.normalizeDays(undefined), []);
  assert.deepEqual(R.normalizeDays('1,2'), []);
});

test('daysLabel은 매일·평일·주말·요일 나열(월요일 시작)로 읽힌다', () => {
  assert.equal(R.daysLabel([]), '');
  assert.equal(R.daysLabel([0, 1, 2, 3, 4, 5, 6]), '매일');
  assert.equal(R.daysLabel([5, 4, 3, 2, 1]), '평일');
  assert.equal(R.daysLabel([6, 0]), '주말');
  assert.equal(R.daysLabel([5, 1, 3]), '월·수·금');
  assert.equal(R.daysLabel([0, 1]), '월·일');
  assert.equal(R.daysLabel([0]), '일요일', "하루만이면 '일'이 '일(work)'로 읽히지 않게");
});

test('isRoutine은 유효한 반복 요일이 있을 때만 참', () => {
  assert.equal(R.isRoutine({ days: [2] }), true);
  assert.equal(R.isRoutine({ days: [] }), false);
  assert.equal(R.isRoutine({}), false);
  assert.equal(R.isRoutine({ days: [9] }), false);
});

test('weekDates는 오늘이 속한 주의 월~일을 돌려준다(일요일은 그 주의 끝)', () => {
  const w = R.weekDates(WED).map(R.ymd);
  assert.equal(w.length, 7);
  assert.equal(w[0], '2026-10-12');
  assert.equal(w[6], '2026-10-18');
  const s = R.weekDates(SUN).map(R.ymd);
  assert.equal(s[0], '2026-10-05');
  assert.equal(s[6], '2026-10-11');
});

test('weekDates는 월 경계를 넘어도 올바르다', () => {
  const w = R.weekDates(new Date(2026, 10, 1)).map(R.ymd); // 2026-11-01 일요일
  assert.equal(w[0], '2026-10-26');
  assert.equal(w[6], '2026-11-01');
});

test('toggleDayLog는 넣고 빼며, 빈 날은 지우고, 원본을 바꾸지 않는다', () => {
  const log = { '2026-10-13': ['0-1'] };
  const a = R.toggleDayLog(log, '0-2', '2026-10-14');
  assert.deepEqual(a['2026-10-14'], ['0-2']);
  assert.deepEqual(log, { '2026-10-13': ['0-1'] });
  const b = R.toggleDayLog(a, '0-2', '2026-10-14');
  assert.equal('2026-10-14' in b, false);
});

test('setDayLog는 이미 원하는 상태면 같은 객체를 돌려준다', () => {
  const log = { '2026-10-14': ['1-1'] };
  assert.equal(R.setDayLog(log, '1-1', '2026-10-14', true), log);
  assert.equal(R.setDayLog(log, '1-2', '2026-10-14', false), log);
  assert.deepEqual(R.setDayLog(log, '1-1', '2026-10-14', false), {});
  assert.deepEqual(R.setDayLog(log, '1-2', '2026-10-14', true)['2026-10-14'], ['1-1', '1-2']);
});

test('extraLogKey는 영역 접두사를 가진다', () => {
  assert.equal(R.extraLogKey(3, 'abc'), '3-xabc');
});

test('routineWeek: 완료·오늘·놓침·예정·쉬는 날을 구분하고, 쉬는 날 완료도 완료로 보인다', () => {
  const doc = docWith((themes) => {
    themes[0].actions[0] = { text: '글쓰기', note: '', done: false, days: [1, 3, 5] };
    return { dayLog: { '2026-10-13': ['0-0'] } };
  });
  assert.deepEqual(R.routineWeek(doc, 0, 0, WED), ['missed', 'done', 'today', 'off', 'planned', 'off', 'off']);
  doc.dayLog = { ...doc.dayLog, ['2026-10-12']: ['0-0'] };
  doc.dayLog = { ...doc.dayLog, ['2026-10-14']: ['0-0'] };
  assert.deepEqual(R.routineWeek(doc, 0, 0, WED), ['done', 'done', 'done', 'off', 'planned', 'off', 'off']);
  // 쉬는 날(화) 실천은 점으로만 보이고 n/m 비율은 예정일만 센다 → 4/3회 같은 표시가 없다
  assert.deepEqual(R.routineWeekCount(doc, 0, 0, WED), { done: 2, planned: 3 });
});

test('since: 반복을 정하기 전 날은 놓친 날이 아니라 쉬는 날 — 그 전 기록도 했어요로 보이지 않는다', () => {
  const doc = docWith((themes) => {
    themes[0].actions[0] = { text: '물', note: '', done: false, days: [0, 1, 2, 3, 4, 5, 6], since: '2026-10-14' };
    return { dayLog: { '2026-10-13': ['0-0'] } };
  });
  // 화요일 기록(한 번이던 칸을 달성한 날 등)은 이 습관의 기록이 아니다 — 이번 주 0/5회와 어긋나지 않게
  assert.deepEqual(R.routineWeek(doc, 0, 0, WED), ['off', 'off', 'today', 'planned', 'planned', 'planned', 'planned']);
  assert.deepEqual(R.routineWeekCount(doc, 0, 0, WED), { done: 0, planned: 5 });
  assert.equal(R.scheduledOn(doc.themes[0].actions[0], new Date(2026, 9, 13)), false);
  assert.equal(R.scheduledOn(doc.themes[0].actions[0], WED), true);
});

test('sameDays는 순서·중복을 무시한다', () => {
  assert.equal(R.sameDays([5, 1, 3], [1, 3, 5, 5]), true);
  assert.equal(R.sameDays([1], [1, 2]), false);
  assert.equal(R.sameDays(undefined, []), true);
});

test('todayItems: 직접 담은 항목이 먼저, 오늘 요일 루틴이 뒤에, 중복·빈 칸은 빠진다', () => {
  const doc = docWith((themes) => {
    themes[0].actions[2] = { text: '책 읽기', note: '', done: true };
    themes[1].actions[0] = { text: '물 2L', note: '', done: false, days: [0, 1, 2, 3, 4, 5, 6] };
    themes[1].actions[1] = { text: '주말 산책', note: '', done: false, days: [0, 6] };
    themes[1].actions[2] = { text: '   ', note: '', done: false, days: [3] };
    return { todayKeys: ['0-2', '1-0', '0-5'], dayLog: { '2026-10-14': ['1-0'] } };
  });
  const items = R.todayItems(doc, WED);
  assert.deepEqual(items.map((i) => i.key), ['0-2', '1-0']);
  assert.deepEqual(items.map((i) => i.done), [true, true]);
  assert.deepEqual(items.map((i) => i.routine), [false, true]);
  assert.equal(items[1].scheduled, true);
});

test('todayItems: 루틴의 오늘 완료는 영구 달성(done)이 아니라 오늘 기록을 따른다', () => {
  const doc = docWith((themes) => {
    themes[2].actions[3] = { text: '명상', note: '', done: true, days: [3] };
    return {};
  });
  const [it] = R.todayItems(doc, WED);
  assert.equal(it.key, '2-3');
  assert.equal(it.done, false);
});

test('todayProgress는 직접 추가한 할 일까지 센다', () => {
  const doc = docWith((themes) => {
    themes[0].actions[0] = { text: '물', note: '', done: false, days: [3] };
    return {
      dayLog: { '2026-10-14': ['0-0'] },
      todayExtra: [{ id: 'a', ti: 0, text: '장보기', done: true }, { id: 'b', ti: 1, text: '전화', done: false }],
    };
  });
  assert.deepEqual(R.todayProgress(doc, WED), { done: 2, total: 3 });
});

test('weekCounts는 월~일 하루별 횟수와 오늘 표시를 준다', () => {
  const wc = R.weekCounts({ '2026-10-12': ['0-0', '1-1'], '2026-10-14': ['2-2'], '2026-10-20': ['0-0'] }, WED);
  assert.deepEqual(wc.map((d) => d.count), [2, 0, 1, 0, 0, 0, 0]);
  assert.deepEqual(wc.map((d) => d.isToday), [false, false, true, false, false, false, false]);
  assert.deepEqual(wc.map((d) => d.dow), [1, 2, 3, 4, 5, 6, 0]);
});

test('rolloverToday: 같은 날이면 같은 객체, 날짜가 없던 저장본은 날짜만 찍는다', () => {
  const doc = docWith(() => ({ todayDate: '2026-10-14', todayExtra: [{ id: 'a', ti: 0, text: 'x', done: true }] }));
  assert.equal(R.rolloverToday(doc, '2026-10-14'), doc);
  const legacy = docWith(() => ({ todayExtra: [{ id: 'a', ti: 0, text: 'x', done: true }] }));
  const r = R.rolloverToday(legacy, '2026-10-14');
  assert.equal(r.todayDate, '2026-10-14');
  assert.equal(r.todayExtra.length, 1);
});

test('rolloverToday: 다음 날엔 완료한 할 일·달성한 칸·직접 담은 루틴을 정리하고 못 한 일은 남긴다', () => {
  const doc = docWith((themes) => {
    themes[0].actions[0] = { text: '끝낸 칸', note: '', done: true };
    themes[0].actions[1] = { text: '남은 칸', note: '', done: false };
    themes[0].actions[2] = { text: '루틴', note: '', done: true, days: [1] };
    return {
      todayDate: '2026-10-13',
      todayKeys: ['0-0', '0-1', '0-2', '0-3'],
      todayExtra: [{ id: 'a', ti: 0, text: '끝낸 일', done: true }, { id: 'b', ti: 1, text: '못 한 일', done: false }],
    };
  });
  const r = R.rolloverToday(doc, '2026-10-14');
  // 루틴(0-2)은 그날 하루만 — 반복 요일엔 어차피 자동으로 다시 나타난다
  assert.deepEqual(r.todayKeys, ['0-1']);
  assert.deepEqual(r.todayExtra.map((x) => x.id), ['b']);
  assert.equal(r.todayDate, '2026-10-14');
  assert.equal(doc.todayKeys.length, 4, '원본은 그대로');
});

test('rolloverToday: 날짜가 뒤로 가면 지우지 않고 날짜만 다시 맞춰, 다음 날 정리가 멈추지 않는다', () => {
  const doc = docWith(() => ({ todayDate: '2027-01-05', todayExtra: [{ id: 'a', ti: 0, text: '끝낸 일', done: true }] }));
  const back = R.rolloverToday(doc, '2026-10-13');
  assert.equal(back.todayDate, '2026-10-13');
  assert.equal(back.todayExtra.length, 1);
  const next = R.rolloverToday(back, '2026-10-14');
  assert.equal(next.todayExtra.length, 0);
});

test('todayItems: 반복 시작일(since)이 아직 오지 않은 루틴은 자동으로 나타나지 않는다', () => {
  const doc = docWith((themes) => {
    themes[0].actions[0] = { text: '물', note: '', done: false, days: [3], since: '2026-10-21' };
    return {};
  });
  assert.deepEqual(R.todayItems(doc, WED), []);
});

test('직접 담은 루틴은 쉬는 날에도 그날은 보이고, 다음 날엔 사라진다', () => {
  const doc = docWith((themes) => {
    themes[1].actions[0] = { text: '글쓰기', note: '', done: false, days: [1, 3, 5] };
    return { todayKeys: ['1-0'], todayDate: '2026-10-13' };
  });
  const tue = new Date(2026, 9, 13);
  assert.deepEqual(R.todayItems(doc, tue).map((i) => [i.key, i.scheduled]), [['1-0', false]]);
  const next = R.rolloverToday(doc, '2026-10-15');
  assert.deepEqual(next.todayKeys, []);
});

test('routineWeek: 주 N회도 습관을 정한 날 전은 쉬는 날이고, 그 전 기록은 했어요로 보이지 않는다', () => {
  const doc = docWith((themes) => {
    themes[0].actions[0] = { text: '운동', note: '', done: false, kind: 'habit', perWeek: 2, since: '2026-10-14' };
    return { dayLog: { '2026-10-12': ['0-0'] } };
  });
  assert.deepEqual(R.routineWeek(doc, 0, 0, WED), ['off', 'off', 'today', 'off', 'off', 'off', 'off']);
  assert.equal(R.routineWeekCount(doc, 0, 0, WED).done, 0, '주간 칸과 n/m회가 같은 날만 센다');
  doc.dayLog = { ...doc.dayLog, ['2026-10-14']: ['0-0'] };
  assert.deepEqual(R.routineWeek(doc, 0, 0, WED), ['off', 'off', 'done', 'off', 'off', 'off', 'off']);
  assert.equal(R.routineWeekCount(doc, 0, 0, WED).done, 1);
});

// ── 습관 연속 기록 ──────────────────────────────────────────────────────────
/** WED에서 n일 전 날짜 키 */
const ago = (n) => R.ymd(new Date(2026, 9, 14 - n));
/** 날짜 키들에 같은 칸 키를 찍은 dayLog */
function logOn(keys, key = '0-0') {
  return Object.fromEntries(keys.map((k) => [k, [key]]));
}
const EVERY = [0, 1, 2, 3, 4, 5, 6];

test('habitStreak: 매일 습관은 이어서 한 날을 센다 — 끊긴 앞 기록은 최고 기록에만', () => {
  const doc = docWith((themes) => {
    themes[0].actions[0] = { text: '물 2L', note: '', done: false, days: EVERY };
    // 10/10(토)~10/14(수) 다섯 날 + 그 전 10/08 하루(10/09에 끊김)
    return { dayLog: logOn([ago(6), ago(4), ago(3), ago(2), ago(1), ago(0)]) };
  });
  assert.deepEqual(R.habitStreak(doc, 0, 0, WED), { cur: 5, best: 5, unit: 'day' });
});

test('habitStreak: 월·수·금 습관은 화·목에 쉬어도 끊기지 않고, 쉬는 날에 한 것은 더하지 않는다', () => {
  const doc = docWith((themes) => {
    themes[0].actions[0] = { text: '글쓰기', note: '', done: false, days: [1, 3, 5], since: '2026-09-28' };
    return { dayLog: logOn(['2026-09-28', '2026-09-30', '2026-10-02', '2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-14']) };
  });
  assert.deepEqual(R.habitStreak(doc, 0, 0, WED), { cur: 8, best: 8, unit: 'day' });
  doc.dayLog = { ...doc.dayLog, ['2026-10-13']: ['0-0'] }; // 쉬는 날(화)에도 함
  assert.equal(R.habitStreak(doc, 0, 0, WED).cur, 8);
  // 금요일(10/09)을 놓치면 거기서 끊긴다
  doc.dayLog = Object.fromEntries(Object.entries(doc.dayLog).filter(([k]) => k !== '2026-10-09'));
  assert.deepEqual(R.habitStreak(doc, 0, 0, WED), { cur: 2, best: 5, unit: 'day' });
});

test('habitStreak: 아직 체크하지 않은 오늘은 끊지 않고, 하루가 지나 못 한 날이 되면 끊는다', () => {
  const doc = docWith((themes) => {
    themes[0].actions[0] = { text: '스트레칭', note: '', done: false, days: EVERY };
    return { dayLog: logOn([ago(3), ago(2), ago(1)]) };
  });
  assert.deepEqual(R.habitStreak(doc, 0, 0, WED), { cur: 3, best: 3, unit: 'day' });
  const THU = new Date(2026, 9, 15);
  assert.deepEqual(R.habitStreak(doc, 0, 0, THU), { cur: 0, best: 3, unit: 'day' }, '수요일을 놓쳤다');
  doc.dayLog = { ...doc.dayLog, [ago(0)]: ['0-0'] };
  assert.deepEqual(R.habitStreak(doc, 0, 0, WED), { cur: 4, best: 4, unit: 'day' });
});

test('habitStreak: 습관을 정한 날(since) 전 기록은 세지 않는다', () => {
  const doc = docWith((themes) => {
    // 한 번이던 칸을 10/09~10/11에 달성해 남은 기록 — 10/12에 습관이 됐다
    themes[0].actions[0] = { text: '산책', note: '', done: false, days: EVERY, since: '2026-10-12' };
    return { dayLog: logOn([ago(5), ago(4), ago(3), ago(2), ago(1), ago(0)]) };
  });
  assert.deepEqual(R.habitStreak(doc, 0, 0, WED), { cur: 3, best: 3, unit: 'day' });
  // since 당일부터 빠지면 그날 끊긴다(그 전 날은 놓친 날이 아니다)
  doc.themes = doc.themes.map((t, ti) => (ti === 0 ? { ...t, actions: t.actions.map((a, ai) => (ai === 0 ? { ...a, since: '2026-10-13' } : a)) } : t));
  doc.dayLog = Object.fromEntries(Object.entries(doc.dayLog).filter(([k]) => k !== ago(1)));
  assert.deepEqual(R.habitStreak(doc, 0, 0, WED), { cur: 1, best: 1, unit: 'day' });
});

test('habitStreak: 주 3회를 세 주 채우고 이번 주도 아직 채울 수 있으면 3주', () => {
  const doc = docWith((themes) => {
    themes[0].actions[0] = { text: '운동', note: '', done: false, kind: 'habit', perWeek: 3, since: '2026-09-21' };
    return {
      dayLog: logOn([
        '2026-09-21', '2026-09-23', '2026-09-25', // 9/21~27
        '2026-09-29', '2026-10-01', '2026-10-04', // 9/28~10/4
        '2026-10-05', '2026-10-06', '2026-10-11', // 10/5~11
        '2026-10-12', // 이번 주 1회 — 수~일 다섯 날로 두 번 더 할 수 있다
      ]),
    };
  });
  assert.deepEqual(R.habitStreak(doc, 0, 0, WED), { cur: 3, best: 3, unit: 'week' });
  // 일요일인데 아직 1회 — 오늘 해도 2회라 이번 주는 못 채운다 → 끊긴다
  const SUN18 = new Date(2026, 9, 18);
  assert.deepEqual(R.habitStreak(doc, 0, 0, SUN18), { cur: 0, best: 3, unit: 'week' });
  // 이번 주를 채우면 4주
  doc.dayLog = { ...doc.dayLog, ['2026-10-13']: ['0-0'] };
  doc.dayLog = { ...doc.dayLog, ['2026-10-14']: ['0-0'] };
  assert.deepEqual(R.habitStreak(doc, 0, 0, WED), { cur: 4, best: 4, unit: 'week' });
  // 가운데 주를 못 채웠으면 그 뒤부터 다시
  doc.dayLog = Object.fromEntries(Object.entries(doc.dayLog).filter(([k]) => k !== '2026-10-01'));
  assert.deepEqual(R.habitStreak(doc, 0, 0, WED), { cur: 2, best: 2, unit: 'week' });
});

test('habitStreak: 주 N회를 정한 주에는 남은 날만큼이 목표', () => {
  const doc = docWith((themes) => {
    // 토요일에 정한 주 3회 → 그 주는 토·일 2회면 채운 것
    themes[0].actions[0] = { text: '운동', note: '', done: false, kind: 'habit', perWeek: 3, since: '2026-10-10' };
    return { dayLog: logOn(['2026-10-10', '2026-10-11']) };
  });
  assert.deepEqual(R.habitStreak(doc, 0, 0, WED), { cur: 1, best: 1, unit: 'week' });
});

test('habitStreak: 200일 전 30일 연속도 최고 기록으로 남고, 2년보다 오래된 기록은 보지 않는다', () => {
  const doc = docWith((themes) => {
    themes[0].actions[0] = { text: '물 2L', note: '', done: false, days: EVERY };
    const run = Array.from({ length: 30 }, (_, i) => ago(200 + i));
    return { dayLog: logOn([...run, ago(1), ago(0)]) };
  });
  assert.deepEqual(R.habitStreak(doc, 0, 0, WED), { cur: 2, best: 30, unit: 'day' });
  const old = docWith((themes) => {
    themes[0].actions[0] = { text: '물 2L', note: '', done: false, days: EVERY };
    return { dayLog: logOn([...Array.from({ length: 10 }, (_, i) => ago(R.STREAK_SPAN + 5 + i)), ago(0)]) };
  });
  assert.deepEqual(R.habitStreak(old, 0, 0, WED), { cur: 1, best: 1, unit: 'day' });
});

test('habitStreak: 습관이 아니거나 기록이 없으면 0', () => {
  const doc = docWith((themes) => {
    themes[0].actions[0] = { text: '이력서', note: '', done: true, kind: 'once' };
    themes[0].actions[1] = { text: '운동', note: '', done: false, kind: 'habit', perWeek: 2 };
    themes[0].actions[2] = { text: '책', note: '', done: false, kind: 'count', goal: 12, count: 3 };
    return { dayLog: logOn([ago(1), ago(0)], '0-0') };
  });
  assert.deepEqual(R.habitStreak(doc, 0, 0, WED), { cur: 0, best: 0, unit: 'day' });
  assert.deepEqual(R.habitStreak(doc, 0, 1, WED), { cur: 0, best: 0, unit: 'week' });
  assert.deepEqual(R.habitStreak(doc, 0, 2, WED), { cur: 0, best: 0, unit: 'day' });
  assert.deepEqual(R.habitStreak(doc, 7, 7, WED), { cur: 0, best: 0, unit: 'day' });
});

// ── 오늘 목록 순서 ──────────────────────────────────────────────────────────
test('sortTodayItems: 마감 지남 → 오늘 마감 → D-1~3 → 직접 담은 한 번 → 쌓기 → 습관, 같은 무게는 원래 순서', () => {
  const doc = docWith((themes) => {
    themes[0].actions[0] = { text: '서류 정리', note: '', done: false, kind: 'once' };
    themes[0].actions[1] = { text: '책 12권', note: '', done: false, kind: 'count', goal: 12, count: 3 };
    themes[0].actions[2] = { text: '여행 계획', note: '', done: false, kind: 'once', due: '2026-10-24' };
    themes[1].actions[0] = { text: '세금 신고', note: '', done: false, kind: 'once', due: '2026-10-15' };
    themes[1].actions[1] = { text: '물 2L', note: '', done: false, days: EVERY };
    themes[2].actions[0] = { text: '보고서', note: '', done: false, kind: 'once', due: '2026-10-12' };
    themes[2].actions[1] = { text: '병원 예약', note: '', done: false, kind: 'once', due: '2026-10-14' };
    themes[3].actions[0] = { text: '회비 입금', note: '', done: false, kind: 'once', due: '2026-10-13' };
    return { todayKeys: ['3-0', '0-0', '0-1', '0-2'] };
  });
  const items = R.todayItems(doc, WED);
  // todayItems 자체는 직접 담은 것 → 저절로 담긴 것(칸 순서) 그대로
  assert.deepEqual(items.map((i) => i.key), ['3-0', '0-0', '0-1', '0-2', '1-0', '1-1', '2-0', '2-1']);
  const sorted = R.sortTodayItems(items, doc, WED);
  // 지난 마감 둘(3-0 직접 담음, 2-0 저절로)은 원래 순서대로
  assert.deepEqual(sorted.map((i) => i.key), ['3-0', '2-0', '2-1', '1-0', '0-0', '0-2', '0-1', '1-1']);
  assert.notEqual(sorted, items);
  assert.equal(items[0].key, '3-0', '원본 배열은 그대로');
  assert.deepEqual(R.orderedTodayItems(doc, WED).map((i) => i.key), sorted.map((i) => i.key));
});

test('todayRank: 마감 없는 한 번·먼 마감은 직접 담은 한 번(3), 잘못된 마감도 3', () => {
  const doc = docWith((themes) => {
    themes[0].actions[0] = { text: 'a', note: '', done: false, kind: 'once', due: '2026-10-17' };
    themes[0].actions[1] = { text: 'b', note: '', done: false, kind: 'once', due: '2026-10-18' };
    themes[0].actions[2] = { text: 'c', note: '', done: false, kind: 'once', due: 'x' };
    return {};
  });
  const rank = (ai, kind = 'once') => R.todayRank({ ti: 0, ai, kind }, doc, '2026-10-14');
  assert.equal(rank(0), 2, 'D-3');
  assert.equal(rank(1), 3, 'D-4');
  assert.equal(rank(2), 3);
  assert.equal(rank(3), 3, '마감 없음');
  assert.equal(rank(3, 'count'), 4);
  assert.equal(rank(3, 'habit'), 5);
  assert.equal(rank(3, 'mind'), 6);
});
