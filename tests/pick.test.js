require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { pickSections, firstAreaWithEmpty, guideSteps, whyAuto, GUIDE_STEP_COUNT, GUIDE_FILL_TARGET } = require('../src/lib/pick');
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
  assert.equal(s[0].rows[1].why, '반복하는 날이라 ‘오늘’에 이미 있어요');
  assert.equal(s[0].inToday, 2);
  assert.deepEqual([s[0].autoNames, s[0].autoCount], [['물 2L'], 1]);
  assert.deepEqual(s[1].rows.map((r) => r.state), ['on']);
  assert.deepEqual([s[1].autoNames, s[1].autoCount], [[], 0]);
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
  full.themes = full.themes.map((t, ti) => (ti === 5 ? { ...t, actions: t.actions.map((a, ai) => (ai === 7 ? { ...a, text: ' ' } : a)) } : t));
  assert.equal(firstAreaWithEmpty(full), 5);
});

test('시작 가이드: 다섯 단계를 순서대로 알려 주고, 다 하면 끝', () => {
  const d = doc(() => ({}));
  let g = guideSteps(d);
  assert.equal(g.steps.length, GUIDE_STEP_COUNT);
  assert.deepEqual(g.steps.map((st) => st.key), ['goal', 'areas', 'fill', 'today', 'check']);
  assert.deepEqual(g.steps.map((st) => st.label), ['핵심 목표 정하기', '영역 8개 정하기', `실천 칸 ${GUIDE_FILL_TARGET}개 채우기`, '오늘 할 일 고르기', '하나 해 보기']);
  assert.equal(g.next, 0);
  d.centerGoal = '나다운 한 해';
  d.themes[0].actions.slice(0, 7).forEach((a, i) => { a.text = `실천${i}`; });
  g = guideSteps(d);
  assert.deepEqual([g.filled, g.next], [7, 1], '영역 8개를 아직 정하지 않았다');
  d.areasSet = true;
  assert.equal(guideSteps(d).next, 2);
  d.themes = d.themes.map((t, ti) => (ti === 1 ? { ...t, actions: t.actions.map((a, ai) => (ai === 0 ? { ...a, text: '하나 더' } : a)) } : t));
  assert.equal(guideSteps(d).next, 3);
  d.todayKeys = ['0-0'];
  assert.equal(guideSteps(d).next, 4);
  d.dayLog = { '2026-10-14': ['0-0'] };
  assert.equal(guideSteps(d).next, -1);
});

test('시작 가이드: 영역 단계는 areasSet이 참일 때만 끝난다(없거나 거짓이면 다음 할 일로 남는다)', () => {
  const d = doc((t) => {
    t.forEach((th) => th.actions.forEach((a, i) => { a.text = `실천${i}`; }));
    return { centerGoal: '나다운 한 해', todayKeys: ['0-0'], dayLog: { '2026-10-14': ['0-0'] } };
  });
  // 칸을 다 채워도 영역을 정하지 않았다면 영역 단계가 다음
  assert.deepEqual([guideSteps(d).steps[1].done, guideSteps(d).next], [false, 1]);
  assert.equal(guideSteps({ ...d, areasSet: false }).next, 1);
  assert.equal(guideSteps({ ...d, areasSet: true }).next, -1);
});

test('반복 실천이 있으면 오늘 할 일은 이미 정해진 것으로 본다', () => {
  const d = doc((t) => { t[2].actions[0] = { text: '스트레칭', note: '', done: false, days: [1, 3, 5] }; return {}; });
  assert.equal(guideSteps(d).steps.find((st) => st.key === 'today').done, true);
});

test('다 끝낸 가이드는 날짜가 바뀌어 오늘 목록이 정리돼도 다시 나오지 않는다', () => {
  const d = doc((t) => {
    t[0].actions.forEach((a, i) => { a.text = `실천${i}`; });
    t[0].actions[0].done = true; // 고른 일을 해냄
    return { centerGoal: '나다운 한 해', areasSet: true, todayKeys: ['0-0'], todayDate: '2026-10-14', dayLog: { '2026-10-14': ['0-0'] } };
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
  assert.equal(rows[1].why, '이번 주 2회 남아 ‘오늘’에 이미 있어요');
  assert.equal(rows[2].why, '마감이 가까워 ‘오늘’에 이미 있어요');
  assert.equal(rows[2].hint, '마감 D-2');
  // 소리로는 '/' · 'D-' 없이 (FX-VERIFY A-1)
  assert.deepEqual(rows.map((r) => r.say), ['10가지 중 4가지', '주 3회', '마감 2일 남음']);
  for (const r of rows) assert.doesNotMatch(r.say, /\d\s*\/\s*\d|D[-+]\d|D-day/, r.say);
  // 저절로 담긴 칸은 칸 순서대로 이름만 — 고를 수 있는 줄(쌓기 2)은 들어가지 않는다
  assert.deepEqual(pickSections(d, WED)[0].autoNames, ['운동', '이력서']);
  assert.equal(pickSections(d, WED)[0].autoCount, 2);
});

test('autoNames: 영역마다 저절로 담긴 칸 글(앞뒤 공백 없이), 고른 칸·고를 칸은 빠진다', () => {
  const d = doc((t) => {
    t[2].actions[1] = { text: ' 물 2L ', note: '', done: false, days: [3] };
    t[2].actions[4] = { text: '보고서', note: '', done: false, kind: 'once', due: '2026-10-10' };
    t[2].actions[6] = { text: '책 읽기', note: '', done: false };
    t[2].actions[7] = { text: '안부 전화', note: '', done: false };
    t[5].actions[0] = { text: '주말 산책', note: '', done: false, days: [0, 6] };
    return { todayKeys: ['2-7'] };
  });
  const s = pickSections(d, WED);
  assert.deepEqual(s.map((x) => [x.ti, x.autoNames, x.autoCount, x.inToday]), [
    [2, ['물 2L', '보고서'], 2, 3],
    [5, [], 0, 0],
  ]);
  // 줄은 호환을 위해 'auto'로 남는다
  assert.deepEqual(s[0].rows.map((r) => r.state), ['auto', 'auto', 'off', 'on']);
});

test('whyAuto: 저절로 담긴 까닭 — 마감 지남 · 마감 가까움 · 주 N회 남은 횟수 · 반복하는 날', () => {
  const SAT = new Date(2026, 9, 17);
  const d = doc((t) => {
    t[0].actions[0] = { text: '보고서', note: '', done: false, kind: 'once', due: '2026-10-12' };
    t[0].actions[1] = { text: '병원 예약', note: '', done: false, kind: 'once', due: '2026-10-14' };
    t[0].actions[2] = { text: '세금 신고', note: '', done: false, kind: 'once', due: '2026-10-17' };
    t[0].actions[3] = { text: '물 2L', note: '', done: false, days: [3] };
    t[0].actions[4] = { text: '운동', note: '', done: false, kind: 'habit', perWeek: 2 };
    t[0].actions[5] = { text: '수영', note: '', done: false, kind: 'habit', perWeek: 3, since: '2026-10-17' };
    t[0].actions[6] = { text: '여행 계획', note: '', done: false, kind: 'once', due: '2026-10-30' };
    t[0].actions[7] = { text: '감사 표현', note: '', done: false, kind: 'mind' };
    return { dayLog: { '2026-10-12': ['0-4'] } };
  });
  assert.equal(whyAuto(d, 0, 0, WED), '마감이 지나 ‘오늘’에 이미 있어요');
  assert.equal(whyAuto(d, 0, 1, WED), '마감이 가까워 ‘오늘’에 이미 있어요');
  assert.equal(whyAuto(d, 0, 2, WED), '마감이 가까워 ‘오늘’에 이미 있어요');
  assert.equal(whyAuto(d, 0, 3, WED), '반복하는 날이라 ‘오늘’에 이미 있어요');
  assert.equal(whyAuto(d, 0, 4, WED), '이번 주 1회 남아 ‘오늘’에 이미 있어요');
  // 저절로 담기지 않았으면 빈 글
  assert.equal(whyAuto(d, 0, 3, new Date(2026, 9, 15)), '');
  assert.equal(whyAuto(d, 0, 6, WED), '');
  assert.equal(whyAuto(d, 0, 7, WED), '');
  // 오늘 체크로 이번 주 횟수를 채웠으면 그날은 했어요로 남는다
  d.dayLog = { ...d.dayLog, ['2026-10-14']: ['0-4'] };
  assert.equal(whyAuto(d, 0, 4, WED), '이번 주 2회를 오늘 다 했어요');
  // 토요일에 정한 주 3회 → 그 주 목표는 2회
  assert.equal(whyAuto(d, 0, 5, SAT), '이번 주 2회 남아 ‘오늘’에 이미 있어요');
});
