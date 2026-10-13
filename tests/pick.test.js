require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { pickSections, firstAreaWithEmpty, guideSteps } = require('../src/lib/pick');
const { rolloverToday } = require('../src/lib/routine');

const WED = new Date(2026, 9, 14); // 수요일

function doc(patch) {
  const themes = Array.from({ length: 8 }, (_, i) => ({
    title: `영역${i}`, color: '#478058', icon: 'heart',
    actions: Array.from({ length: 8 }, () => ({ text: '', note: '', done: false })),
  }));
  return { centerGoal: '', themes, todayKeys: [], todayExtra: [], dayLog: {}, ...patch(themes) };
}

test('글자 있는 칸만, 달성한 일회성 칸은 빼고, 오늘 반복은 저절로 담김', () => {
  const d = doc((t) => {
    t[0].actions[0] = { text: '책 읽기', note: '', done: false };
    t[0].actions[1] = { text: '끝낸 일', note: '', done: true };
    t[0].actions[2] = { text: '물 2L', note: '', done: true, days: [0, 1, 2, 3, 4, 5, 6] };
    t[0].actions[3] = { text: '주말 산책', note: '', done: false, days: [0, 6] };
    t[3].actions[5] = { text: '안부 전화', note: '', done: false };
    return { todayKeys: ['3-5', '0-3'] };
  });
  const s = pickSections(d, WED);
  assert.deepEqual(s.map((x) => x.ti), [0, 3]);
  assert.deepEqual(s[0].rows.map((r) => [r.ai, r.state, r.hint]), [[0, 'off', ''], [2, 'auto', '매일 반복'], [3, 'on', '주말 반복']]);
  assert.equal(s[0].rows[1].why, '오늘은 저절로 담겨요');
  assert.equal(s[0].inToday, 2);
  assert.deepEqual(s[1].rows.map((r) => r.state), ['on']);
});

test('반복을 정한 날(since)보다 앞이면 오늘 자동이 아니다', () => {
  const d = doc((t) => {
    t[1].actions[0] = { text: '명상', note: '', done: false, days: [3], since: '2026-10-20' };
    return {};
  });
  assert.equal(pickSections(d, WED)[0].rows[0].state, 'off');
});

test('빈 칸이 있는 첫 영역', () => {
  const full = doc((t) => { t.forEach((th) => th.actions.forEach((a, i) => { a.text = `실천${i}`; })); return {}; });
  assert.equal(firstAreaWithEmpty(full), -1);
  full.themes[5].actions[7].text = ' ';
  assert.equal(firstAreaWithEmpty(full), 5);
});

test('시작 가이드: 순서대로 다음 단계를 알려 주고, 다 하면 끝', () => {
  const d = doc(() => ({}));
  let g = guideSteps(d);
  assert.equal(g.next, 0);
  d.centerGoal = '나다운 한 해';
  d.themes[0].actions.slice(0, 7).forEach((a, i) => { a.text = `실천${i}`; });
  g = guideSteps(d);
  assert.deepEqual([g.filled, g.next], [7, 1]);
  d.themes[1].actions[0].text = '하나 더';
  assert.equal(guideSteps(d).next, 2);
  d.todayKeys = ['0-0'];
  assert.equal(guideSteps(d).next, 3);
  d.dayLog = { '2026-10-14': ['0-0'] };
  assert.equal(guideSteps(d).next, -1);
});

test('반복 실천이 있으면 오늘 할 일은 이미 정해진 것으로 본다', () => {
  const d = doc((t) => { t[2].actions[0] = { text: '스트레칭', note: '', done: false, days: [1, 3, 5] }; return {}; });
  assert.equal(guideSteps(d).steps[2].done, true);
});

test('다 끝낸 가이드는 날짜가 바뀌어 오늘 목록이 정리돼도 다시 나오지 않는다', () => {
  const d = doc((t) => {
    t[0].actions.forEach((a, i) => { a.text = `실천${i}`; });
    t[0].actions[0].done = true; // 고른 일을 해냄
    return { centerGoal: '나다운 한 해', todayKeys: ['0-0'], todayDate: '2026-10-14', dayLog: { '2026-10-14': ['0-0'] } };
  });
  assert.equal(guideSteps(d).next, -1);
  const next = rolloverToday(d, '2026-10-15');
  assert.deepEqual(next.todayKeys, []); // 끝낸 일은 정리됨
  assert.equal(guideSteps(next).next, -1);
});

test('유형별: 마음가짐은 빼고, 다 쌓은 칸도 빼고, 주 N회·다가온 마감은 저절로', () => {
  const d = doc((t) => {
    t[0].actions[0] = { text: '감사 표현', note: '', done: false, kind: 'mind' };
    t[0].actions[1] = { text: '책 12권', note: '', done: true, kind: 'count', goal: 12, count: 12 };
    t[0].actions[2] = { text: '요리 10가지', note: '', done: false, kind: 'count', goal: 10, unit: '가지', count: 4 };
    t[0].actions[3] = { text: '운동', note: '', done: false, kind: 'habit', perWeek: 3 };
    t[0].actions[4] = { text: '이력서', note: '', done: false, kind: 'once', due: '2026-10-16' };
    return { dayLog: { '2026-10-12': ['0-3'] } };
  });
  const rows = pickSections(d, WED)[0].rows;
  assert.deepEqual(rows.map((r) => [r.ai, r.state]), [[2, 'off'], [3, 'auto'], [4, 'auto']]);
  assert.equal(rows[0].hint, '4/10가지');
  assert.equal(rows[1].why, '이번 주 2회 남아 저절로 담겨요');
  assert.equal(rows[2].why, '마감이 다가와 저절로 담겨요');
  assert.equal(rows[2].hint, '마감 D-2');
});
