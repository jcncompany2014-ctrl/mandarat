require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../src/lib/todayModes');
const { BANNED_COPY } = require('../src/lib/copy');

// 2026-10-14는 수요일 — 이번 주는 10/12(월) ~ 10/18(일), 지난주는 10/05(월) ~ 10/11(일)
const WED = new Date(2026, 9, 14, 12);
const MON = new Date(2026, 9, 12, 12);
const TUE = new Date(2026, 9, 13, 12);

function doc(patch = () => ({})) {
  const themes = Array.from({ length: 8 }, (_, i) => ({
    title: `영역${i}`, color: '#478058', icon: 'heart',
    actions: Array.from({ length: 8 }, () => ({ text: '', note: '', done: false })),
  }));
  return { themes, dayLog: {}, todayKeys: [], todayExtra: [], reviews: {}, ...patch(themes) };
}

function days(...keys) {
  return Object.fromEntries(keys.map(([day, list]) => [day, list]));
}

test('연속 기록 줄은 글이 있는 습관만, 오늘 할 날인 것 먼저 (today-1)', () => {
  const d = doc((th) => {
    th[0].actions[0] = { text: '주말 산책', note: '', done: false, kind: 'habit', days: [0, 6] };
    th[0].actions[1] = { text: '책 읽기', note: '', done: false, kind: 'count', goal: 12, unit: '권' };
    th[1].actions[2] = { text: '물 마시기', note: '', done: false, kind: 'habit', days: [0, 1, 2, 3, 4, 5, 6] };
    th[2].actions[0] = { text: '', note: '', done: false, kind: 'habit', days: [3] };
    th[3].actions[0] = { text: '마음 다스리기', note: '', done: false, kind: 'mind' };
    return {};
  });
  const rows = T.streakRows(d, WED);
  assert.deepEqual(rows.map((r) => r.text), ['물 마시기', '주말 산책']);
  assert.equal(rows[0].item.scheduled, true);
  assert.equal(rows[1].item.scheduled, false);
  assert.equal(rows[0].item.kind, 'habit');
  assert.equal(rows[0].item.key, '1-2');
});

test('월·수·금 습관을 일정대로 지키면 기록이 자란다 — 0일째가 아니다 (ref-7 · ref-11)', () => {
  const d = doc((th) => {
    th[0].actions[0] = { text: '운동', note: '', done: false, kind: 'habit', days: [1, 3, 5], since: '2026-10-05' };
    return { dayLog: days(['2026-10-05', ['0-0']], ['2026-10-07', ['0-0']], ['2026-10-09', ['0-0']], ['2026-10-12', ['0-0']]) };
  });
  const [row] = T.streakRows(d, WED);
  // 오늘(수)은 아직이지만 하루가 끝나지 않아 끊지 않는다
  assert.equal(row.streak.cur, 4);
  assert.equal(row.item.done, false);
  assert.deepEqual(T.streakCell(row.streak), { text: '4일', a11y: '연속 4일' });
});

test('이어 가는 기록이 없으면 — 로 (a11y 아직 없음)', () => {
  assert.deepEqual(T.streakCell({ cur: 0, best: 3, unit: 'day' }), { text: '—', a11y: '연속 기록 아직 없음' });
  assert.equal(T.runText(3, 'week'), '3주');
  assert.equal(T.runText(5, 'day'), '5일');
});

test('맨 위 숫자는 지금 가장 길게 이어 가는 습관 하나 (copy-10)', () => {
  const row = (text, cur, best, unit = 'day') => ({ text, streak: { cur, best, unit }, item: {} });
  const s = T.streakSummary([row('물', 3, 9), row('운동', 2, 2, 'week'), row('독서', 5, 5)]);
  // 주 N회 2주(14일)가 5일보다 길다
  assert.deepEqual(s.lead, { text: '운동', cur: 2, unit: 'week', best: 2 });
  assert.equal(T.streakSummaryLabel(s), '지금 이어 가는 기록 2주, 운동. 최고 2주');
  const tie = T.streakSummary([row('물', 4, 4), row('독서', 4, 7)]);
  assert.equal(tie.lead.text, '물', '같으면 앞 줄');
  const none = T.streakSummary([row('물', 0, 9)]);
  assert.equal(none.lead, null);
  assert.equal(T.streakSummaryLabel(none), '아직 이어 가는 기록이 없어요. 오늘 하나 하면 시작돼요');
});

test('보드 머리와 마음가짐 머리 글 (today-24 · a11y-17)', () => {
  assert.equal(T.columnHead('진행 중', 2), '진행 중 2개');
  assert.equal(T.columnHead('완료', 0), '완료 0개');
  assert.equal(T.mindProgress(4, 1), '4개 중 1개 매겼어요');
});

test('지난주 점수 매기기 — 월·화요일, 지난주 점수 없는 마음가짐이 있고 돌아보기를 권할 때만 (flow-10)', () => {
  const mind = (ratings) => doc((th) => {
    th[0].actions[0] = { text: '감사하기', note: '', done: false, kind: 'mind', ratings };
    th[0].actions[1] = { text: '물 마시기', note: '', done: false };
    return { dayLog: days(['2026-10-06', ['0-1']]) };
  });
  assert.equal(T.lastWeekRatingTarget(mind({}), MON), '2026-10-05');
  assert.equal(T.lastWeekRatingTarget(mind({}), TUE), '2026-10-05');
  assert.equal(T.lastWeekRatingTarget(mind({}), WED), null, '수요일엔 없음');
  assert.equal(T.lastWeekRatingTarget(mind({ '2026-10-05': 4 }), MON), null, '지난주 점수를 이미 매김');
  assert.equal(T.lastWeekRatingTarget(mind({ '2026-10-12': 4 }), MON), '2026-10-05', '이번 주 점수는 상관없다');
  const reviewed = { ...mind({}), reviews: { '2026-10-05': { at: '2026-10-11', next: [] } } };
  assert.equal(T.lastWeekRatingTarget(reviewed, MON), null, '이미 돌아본 주');
  const noMind = doc((th) => { th[0].actions[1] = { text: '물 마시기', note: '', done: false }; return { dayLog: days(['2026-10-06', ['0-1']]) }; });
  assert.equal(T.lastWeekRatingTarget(noMind, MON), null, '마음가짐 칸이 없음');
});

test('보기 글에 쓰지 않는 말이 없다', () => {
  const texts = [
    T.streakSummaryLabel({ lead: null }), T.mindProgress(3, 0), T.columnHead('할 일', 1),
    T.streakCell({ cur: 0, best: 0, unit: 'day' }).a11y,
  ];
  for (const t of texts) for (const w of BANNED_COPY) assert.ok(!t.includes(w), `${t} ⊃ ${w}`);
});
