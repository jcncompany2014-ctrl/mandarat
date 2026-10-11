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
  doc.dayLog['2026-10-12'] = ['0-0'];
  doc.dayLog['2026-10-14'] = ['0-0'];
  assert.deepEqual(R.routineWeek(doc, 0, 0, WED), ['done', 'done', 'done', 'off', 'planned', 'off', 'off']);
  // 쉬는 날(화) 실천은 점으로만 보이고 n/m 비율은 예정일만 센다 → 4/3회 같은 표시가 없다
  assert.deepEqual(R.routineWeekCount(doc, 0, 0, WED), { done: 2, planned: 3 });
});

test('since: 반복을 정하기 전 날은 놓친 날이 아니라 쉬는 날', () => {
  const doc = docWith((themes) => {
    themes[0].actions[0] = { text: '물', note: '', done: false, days: [0, 1, 2, 3, 4, 5, 6], since: '2026-10-14' };
    return { dayLog: { '2026-10-13': ['0-0'] } };
  });
  assert.deepEqual(R.routineWeek(doc, 0, 0, WED), ['off', 'done', 'today', 'planned', 'planned', 'planned', 'planned']);
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

test('rolloverToday: 시계를 되돌려도(날짜가 뒤로 가도) 오늘 기록을 지우지 않는다', () => {
  const doc = docWith(() => ({ todayDate: '2026-10-14', todayExtra: [{ id: 'a', ti: 0, text: '끝낸 일', done: true }] }));
  assert.equal(R.rolloverToday(doc, '2026-10-13'), doc);
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
