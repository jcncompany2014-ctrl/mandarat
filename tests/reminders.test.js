// 알림 짜기(src/lib/reminders.ts) — 앞날 14일·60개, 아침·저녁·습관·돌아보기의 규칙, 기기와의 차이, 세 언어의 글.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { blankDoc } = require('../src/data/defaults');
const R = require('../src/lib/reminders');
const { textProblems } = require('./i18nLint');

// 2026-10-14 수요일
const at = (d, h = 9, m = 30) => new Date(2026, 9, d, h, m);
const NOW = at(14);

function doc(extra = {}, settings = {}) {
  const d = blankDoc();
  d.onboarded = true;
  d.todayDate = '2026-10-14';
  d.themes[0].title = '건강';
  d.dayLog = { '2026-10-01': ['0-0'] };
  return { ...d, settings: { ...d.settings, ...settings }, ...extra };
}

const habit = (text, more = {}) => ({ text, note: '', done: false, kind: 'habit', days: [0, 1, 2, 3, 4, 5, 6], since: '2026-10-01', ...more });
const kinds = (plan, k) => plan.filter((p) => p.kind === k);
const days = (plan) => plan.map((p) => p.id.split('.')[2]);

test('앞날 14일(오늘 포함) — 지난 시각은 빼고, 울릴 시각 순', () => {
  const d = doc({}, { reminders: { morning: '08:00' } });
  d.themes[0].actions[0] = habit('물 2L');
  // 09:30이면 오늘 아침은 지났다 — 내일부터 13번
  const late = R.planReminders(d, NOW);
  assert.equal(late.length, 13);
  assert.equal(late[0].id, 'mandarat.am.2026-10-15.0800');
  assert.equal(late.at(-1).id, 'mandarat.am.2026-10-27.0800');
  // 07:00이면 오늘부터 14번
  const early = R.planReminders(d, at(14, 7, 0));
  assert.equal(early.length, R.REMINDER_DAYS);
  assert.equal(early[0].id, 'mandarat.am.2026-10-14.0800');
  assert.equal(early.at(-1).id, 'mandarat.am.2026-10-27.0800');
  for (const p of early) assert.ok(p.fireAt > at(14, 7, 0).getTime());
});

test('60개까지 — 시각 순으로 자른다', () => {
  const d = doc({}, { reminders: { morning: '08:00', evening: '21:00' } });
  d.themes[0].actions[0] = habit('물 2L', { remindAt: '07:00' });
  d.themes[0].actions[1] = habit('스트레칭', { remindAt: '12:00' });
  d.themes[0].actions[2] = habit('일기', { remindAt: '22:00' });
  const plan = R.planReminders(d, at(14, 6, 0));
  assert.equal(R.REMINDER_BUDGET, 60);
  assert.equal(plan.length, 60);
  for (let i = 1; i < plan.length; i++) assert.ok(plan[i - 1].fireAt <= plan[i].fireAt, `${i}`);
  // 하루 5개 × 12일 = 60 — 13번째 날부터는 잘린다
  assert.equal(plan.at(-1).id, 'mandarat.habit.2026-10-25.2200');
  assert.equal(new Set(plan.map((p) => p.id)).size, 60);
});

test('아무것도 켜지 않았으면 빈 목록', () => {
  const d = doc();
  d.themes[0].actions[0] = habit('물 2L');
  assert.deepEqual(R.planReminders(d, NOW), []);
});

test('저녁 알림은 오늘 다 하면 사라진다 — 앞날은 할 일이 있으면 남는다', () => {
  const d = doc({}, { reminders: { evening: '21:00' } });
  d.themes[0].actions[0] = habit('물 2L');
  d.todayExtra = [{ id: 'a1', ti: 0, text: '장보기', done: false }];
  let plan = R.planReminders(d, NOW);
  assert.equal(plan[0].id, 'mandarat.pm.2026-10-14.2100');
  assert.equal(plan[0].title, '오늘 남은 일 2개');
  assert.equal(plan[0].body, '물 2L · 장보기');
  // 하나만 하면 남은 것 하나
  plan = R.planReminders({ ...d, dayLog: { ...d.dayLog, '2026-10-14': ['0-0'] } }, NOW);
  assert.equal(plan[0].title, '오늘 남은 일 1개');
  assert.equal(plan[0].body, '장보기');
  // 다 하면 오늘 저녁은 없고, 내일 저녁부터
  const done = { ...d, dayLog: { ...d.dayLog, '2026-10-14': ['0-0'] }, todayExtra: [{ id: 'a1', ti: 0, text: '장보기', done: true }] };
  plan = R.planReminders(done, NOW);
  assert.equal(plan[0].id, 'mandarat.pm.2026-10-15.2100');
  assert.equal(plan[0].title, '오늘 남은 일 1개', '다 한 직접 추가 할 일은 다음 날 목록에서 빠진다');
});

test('아침 알림은 할 일이 없는 날을 건너뛴다 · 본문은 셋까지와 나머지 수', () => {
  const d = doc({}, { reminders: { morning: '08:00' } });
  d.themes[0].actions[0] = habit('걷기', { days: [1, 3, 5] });
  const plan = R.planReminders(d, at(14, 7, 0));
  // 수 10-14 · 금 16 · 월 19 · 수 21 · 금 23 · 월 26
  assert.deepEqual(days(plan), ['2026-10-14', '2026-10-16', '2026-10-19', '2026-10-21', '2026-10-23', '2026-10-26']);
  assert.equal(plan[0].title, '오늘 할 일 1개');
  assert.equal(plan[0].body, '걷기');

  for (let i = 1; i <= 4; i++) d.themes[1].actions[i] = habit(`습관${i}`);
  const many = R.planReminders(d, at(14, 7, 0))[0];
  assert.equal(many.title, '오늘 할 일 5개');
  assert.match(many.body, /^[^·]+ · [^·]+ · [^·]+ 외 2개$/);
});

test('습관 알림 — 같은 시각끼리 묶고, 그날 했으면 빼고, 요일·시작한 날을 따른다', () => {
  const d = doc();
  d.themes[0].actions[0] = habit('물 2L', { remindAt: '07:30' });
  d.themes[0].actions[1] = habit('스트레칭', { remindAt: '07:30' });
  d.themes[2].title = '공부';
  d.themes[2].actions[0] = habit('단어 10개', { remindAt: '20:00', days: [6], since: '2026-10-20' }); // 토요일, 10-20부터
  const plan = R.planReminders(d, at(14, 6, 0));
  const am = kinds(plan, 'habit').filter((p) => p.id.endsWith('.0730'));
  assert.equal(am.length, 14);
  assert.equal(am[0].title, '습관 2개');
  assert.equal(am[0].body, '물 2L · 스트레칭');
  // 토요일 습관 — 10-17은 시작 전이라 없고 10-24만
  assert.deepEqual(days(kinds(plan, 'habit').filter((p) => p.id.endsWith('.2000'))), ['2026-10-24']);
  const sat = plan.find((p) => p.id === 'mandarat.habit.2026-10-24.2000');
  assert.equal(sat.title, '단어 10개');
  assert.equal(sat.body, '공부 · 오늘 할 습관이에요');
  // 오늘 하나를 했으면 오늘 것은 하나만 남는다
  const one = R.planReminders({ ...d, dayLog: { ...d.dayLog, '2026-10-14': ['0-0'] } }, at(14, 6, 0));
  const today = one.find((p) => p.id === 'mandarat.habit.2026-10-14.0730');
  assert.equal(today.title, '스트레칭');
  assert.equal(today.body, '건강 · 오늘 할 습관이에요');
  // 둘 다 했으면 오늘 것은 없다
  const both = R.planReminders({ ...d, dayLog: { ...d.dayLog, '2026-10-14': ['0-0', '0-1'] } }, at(14, 6, 0));
  assert.equal(both.find((p) => p.id === 'mandarat.habit.2026-10-14.0730'), undefined);
  // 글이 없는 칸 · 습관이 아닌 칸의 remindAt은 쓰지 않는다
  d.themes[3].actions[0] = { text: '책 쓰기', note: '', done: false, kind: 'once', remindAt: '09:00', due: '2026-10-15' };
  d.themes[3].actions[1] = habit('  ', { remindAt: '09:00' });
  assert.equal(R.planReminders(d, at(14, 6, 0)).some((p) => p.id.endsWith('.0900')), false);
});

test('주 N회 습관은 이번 주 횟수를 채우면 다음 주까지 멈춘다', () => {
  const d = doc();
  d.themes[0].actions[0] = { text: '운동', note: '', done: false, kind: 'habit', perWeek: 2, since: '2026-10-01', remindAt: '19:00' };
  const open = R.planReminders(d, NOW);
  assert.equal(open[0].id, 'mandarat.habit.2026-10-14.1900', '못 채웠으면 날마다');
  // 월·화에 두 번 했다 — 수~일은 없고, 다음 월요일 10-19부터
  const met = R.planReminders({ ...d, dayLog: { ...d.dayLog, '2026-10-12': ['0-0'], '2026-10-13': ['0-0'] } }, NOW);
  assert.equal(met[0].id, 'mandarat.habit.2026-10-19.1900');
  assert.equal(met.length, 9);
});

test('한 주 돌아보기 — 일요일 18:00, 그 주를 돌아볼 차례일 때만', () => {
  const d = doc({}, { reminders: { review: true } });
  d.themes[0].actions[0] = { text: '하루 물 2L', note: '', done: false };
  let plan = R.planReminders(d, NOW);
  assert.deepEqual(plan.map((p) => p.id), ['mandarat.review.2026-10-18', 'mandarat.review.2026-10-25']);
  assert.equal(plan[0].fireAt, new Date(2026, 9, 18, 18, 0).getTime());
  assert.equal(plan[0].url, 'mandarat://ritual/2026-10-12');
  assert.equal(plan[0].title, '한 주 돌아보기');
  assert.equal(plan[0].body, '10월 12일 – 18일 · 3분이면 돼요');
  assert.deepEqual(plan[0].at, { y: 2026, m: 10, d: 18, hh: 18, mm: 0 });
  // 이미 돌아본 주는 없다
  plan = R.planReminders({ ...d, reviews: { '2026-10-12': { at: '2026-10-17', next: [] } } }, NOW);
  assert.deepEqual(plan.map((p) => p.id), ['mandarat.review.2026-10-25']);
  // 적힌 실천이 없으면 권하지 않는다
  assert.deepEqual(R.planReminders(doc({}, { reminders: { review: true } }), NOW), []);
  // 꺼져 있으면 없다
  assert.deepEqual(R.planReminders({ ...d, settings: { ...d.settings, reminders: undefined } }, NOW), []);
});

test('주소 — 오늘 화면, 돌아보기는 그 주', () => {
  const d = doc({}, { reminders: { morning: '08:00', evening: '21:00', review: true } });
  d.themes[0].actions[0] = habit('물 2L', { remindAt: '07:00' });
  const WEEK = { 'mandarat.review.2026-10-18': 'mandarat://ritual/2026-10-12', 'mandarat.review.2026-10-25': 'mandarat://ritual/2026-10-19' };
  for (const p of R.planReminders(d, NOW)) assert.equal(p.url, p.kind === 'review' ? WEEK[p.id] : 'mandarat://today', p.id);
});

test('triggerFor — iOS 달력 시각은 1월이 1(10월 = 10), 안드로이드는 그 순간', () => {
  const d = doc({}, { reminders: { morning: '08:05' } });
  d.themes[0].actions[0] = habit('물 2L');
  const p = R.planReminders(d, NOW)[0];
  assert.deepEqual(R.triggerFor(p, 'ios'), { type: 'calendar', year: 2026, month: 10, day: 15, hour: 8, minute: 5, repeats: false });
  assert.deepEqual(R.triggerFor(p, 'android'), { type: 'date', date: new Date(2026, 9, 15, 8, 5).getTime(), channelId: 'reminders' });
  assert.equal(p.at.m, 10);
});

test('diffReminders — 남의 알림과 집중 끝 알림은 건드리지 않고, 바뀐 것만 다시 건다', () => {
  const d = doc({}, { reminders: { morning: '08:00' } });
  d.themes[0].actions[0] = habit('물 2L');
  const plan = R.planReminders(d, NOW).slice(0, 3);
  const existing = [
    { id: 'other.app.1', sig: 'x' },
    { id: 'expo-123' },
    { id: 'mandarat.focus.end' },
    { id: plan[0].id, sig: plan[0].sig },
    { id: plan[1].id, sig: 'old' },
    { id: 'mandarat.am.2026-10-13.0800', sig: 'gone' },
  ];
  const { cancel, schedule } = R.diffReminders(existing, plan);
  assert.deepEqual(cancel.sort(), [plan[1].id, 'mandarat.am.2026-10-13.0800'].sort());
  assert.deepEqual(schedule.map((p) => p.id), [plan[1].id, plan[2].id]);
  // 빈 목록이면 우리 알림만 모두 지운다
  assert.deepEqual(R.diffReminders(existing, []).cancel.sort(), [plan[0].id, plan[1].id, 'mandarat.am.2026-10-13.0800'].sort());
  assert.equal(R.isPlannedId('mandarat.focus.end'), false);
});

test('sig와 planKey — 글이나 시각이 바뀌면 달라진다', () => {
  const d = doc({}, { reminders: { morning: '08:00' } });
  d.themes[0].actions[0] = habit('물 2L');
  const a = R.planReminders(d, NOW);
  const b = R.planReminders(d, NOW);
  assert.equal(R.planKey(a), R.planKey(b));
  d.themes[0].actions[0] = habit('물 3L');
  const c = R.planReminders(d, NOW);
  assert.notEqual(c[0].sig, a[0].sig);
  assert.notEqual(R.planKey(c), R.planKey(a));
  assert.equal(R.planKey([]), '');
});

test('하루가 지나면 첫 알림이 바뀐다', () => {
  const d = doc({}, { reminders: { morning: '08:00' } });
  d.themes[0].actions[0] = habit('물 2L');
  const a = R.planReminders(d, at(14, 7, 0));
  const b = R.planReminders({ ...d, todayDate: '2026-10-15' }, at(15, 7, 0));
  assert.equal(a[0].id, 'mandarat.am.2026-10-14.0800');
  assert.equal(b[0].id, 'mandarat.am.2026-10-15.0800');
  assert.notEqual(R.planKey(a), R.planKey(b));
  assert.equal(b.at(-1).id, 'mandarat.am.2026-10-28.0800');
});

test('세 언어의 알림 글 — 빈 값·깨진 값이 없고 그 언어의 규칙을 지킨다', () => {
  const d = doc({}, { reminders: { morning: '08:00', evening: '21:00', review: true } });
  d.themes[0].actions[0] = habit('Water', { remindAt: '07:00' });
  d.themes[0].actions[1] = habit('Stretch', { remindAt: '07:00' });
  d.themes[1].title = 'Study';
  d.themes[1].actions[0] = habit('Words', { remindAt: '06:00' });
  d.themes[2].title = '';
  d.themes[2].actions[0] = habit('Read', { remindAt: '06:30' });
  for (let i = 0; i < 4; i++) d.themes[3].actions[i] = habit(`Item ${i}`);
  for (const lang of ['ko', 'ja', 'en']) {
    const plan = R.planReminders(d, at(14, 5, 0), { lang });
    assert.ok(plan.length > 0, lang);
    assert.deepEqual([...new Set(plan.map((p) => p.kind))].sort(), ['am', 'habit', 'pm', 'review'], lang);
    for (const p of plan) {
      for (const s of [p.title, p.body]) {
        assert.ok(s && s.trim(), `${lang} ${p.id}: 비었다`);
        assert.doesNotMatch(s, /undefined|NaN|\[object/, `${lang} ${p.id}: ${s}`);
        assert.deepEqual(textProblems(lang, s), [], `${lang} ${p.id}: ${s}`);
      }
    }
  }
  const en = R.planReminders(d, at(14, 5, 0), { lang: 'en' });
  assert.equal(en.find((p) => p.kind === 'review').body, 'Oct 12 – 18 · Takes 3 minutes');
  assert.equal(en.find((p) => p.id === 'mandarat.habit.2026-10-14.0630').body, 'A habit for today');
  assert.equal(R.planReminders(d, at(14, 5, 0), { lang: 'ja' }).find((p) => p.kind === 'review').title, '週のふりかえり');
});
