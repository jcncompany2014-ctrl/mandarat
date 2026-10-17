require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { migrate, blankDoc, sampleThemes, CENTER_EN } = require('../src/data/defaults');
const { PILLAR_COLORS, GOLD, migrateAreaColor, migrateAccent } = require('../src/theme/palette');

function shapeOk(doc) {
  assert.equal(doc.themes.length, 8);
  for (const t of doc.themes) assert.equal(t.actions.length, 8);
}

test('손상된 입력은 빈 문서로', () => {
  for (const bad of [null, undefined, 'garbage', 42, [], [1, 2]]) {
    const d = migrate(bad);
    shapeOk(d);
    assert.deepEqual(d, blankDoc());
  }
});

test('themes는 항상 8영역 × 8실천으로 보정된다', () => {
  const d = migrate({ themes: [{ title: '건강', actions: [{ text: '걷기', done: 1 }] }, 'x', null] });
  shapeOk(d);
  assert.equal(d.themes[0].title, '건강');
  assert.deepEqual(d.themes[0].actions[0], { text: '걷기', note: '', done: true });
  assert.equal(d.themes[1].title, blankDoc().themes[1].title);
  assert.equal(d.themes[7].actions[7].text, '');
});

test('이전 원색 영역 색은 연꽃 팔레트로, 사용자 색은 보존, 잘못된 색은 슬롯 기본색', () => {
  const d = migrate({
    themes: [{ color: '#2FA968' }, { color: '#123456' }, { color: 'red' }],
  });
  assert.equal(d.themes[0].color, PILLAR_COLORS[0]);
  assert.equal(d.themes[1].color, '#123456');
  assert.equal(d.themes[2].color, PILLAR_COLORS[2]);
});

test('아는 아이콘만 남기고 모르는 이름(프로토타입 속성 포함)은 슬롯 기본 아이콘', () => {
  const d = migrate({ themes: [{ icon: 'constructor' }, { icon: '__proto__' }, { icon: 'lotus' }, { icon: 7 }] });
  const base = blankDoc().themes;
  assert.equal(d.themes[0].icon, base[0].icon);
  assert.equal(d.themes[1].icon, base[1].icon);
  assert.equal(d.themes[2].icon, 'lotus');
  assert.equal(d.themes[3].icon, base[3].icon);
});

test('반복 시작일(since)은 날짜 형식이고 반복 요일이 있을 때만 남는다', () => {
  const d = migrate({ themes: [{ actions: [
    { text: 'a', days: [1], since: '2026-10-14' },
    { text: 'b', days: [1], since: 'yesterday' },
    { text: 'c', since: '2026-10-14' },
  ] }] });
  assert.equal(d.themes[0].actions[0].since, '2026-10-14');
  assert.equal('since' in d.themes[0].actions[1], false);
  assert.equal('since' in d.themes[0].actions[2], false);
});

test('반복 요일은 정리해서 보존하고, 비면 days 키를 두지 않는다', () => {
  const d = migrate({ themes: [{ actions: [{ text: 'a', days: [5, 1, 1, 9] }, { text: 'b', days: [] }, { text: 'c', days: 'mon' }] }] });
  assert.deepEqual(d.themes[0].actions[0].days, [1, 5]);
  assert.equal('days' in d.themes[0].actions[1], false);
  assert.equal('days' in d.themes[0].actions[2], false);
});

test('settings: 잘못된 값은 기본값, 이전 포인트 색은 이행', () => {
  const d = migrate({ settings: { mood: '네온', accent: '#F4793B', mgmt: '?', cellShape: '각진' } });
  assert.deepEqual(d.settings, { mood: '연꽃', accent: GOLD, mgmt: '일일 체크', cellShape: '각진' });
  assert.equal(migrate({ settings: { accent: 'blue' } }).settings.accent, GOLD);
  assert.equal(migrate({ settings: { accent: '#5068AB', mood: '다크' } }).settings.mood, '다크');
});

test('dayLog: 날짜·키 형식을 검사하고 중복과 빈 날을 지운다(직접 추가 할 일 키는 유지)', () => {
  const d = migrate({
    dayLog: {
      '2026-10-14': ['0-1', '0-1', '9-9', 5, '3-xab12', '1-x'],
      'yesterday': ['0-0'],
      '2026-10-13': [],
      '2026-10-12': 'nope',
    },
  });
  assert.deepEqual(d.dayLog, { '2026-10-14': ['0-1', '3-xab12'] });
});

test('dayMeta: 기분은 0~4 정수만, 회고는 글자만', () => {
  const d = migrate({
    dayMeta: {
      '2026-10-14': { mood: 3, reflection: '좋은 하루' },
      '2026-10-13': { mood: 7 },
      '2026-10-12': { mood: 2.5, reflection: 12 },
      bad: { mood: 1 },
    },
  });
  assert.deepEqual(d.dayMeta, { '2026-10-14': { mood: 3, reflection: '좋은 하루' } });
});

test('todayExtra·todayKeys·focusMinutes·todayDate를 검증한다', () => {
  const d = migrate({
    todayExtra: [
      { id: 'a1', ti: 2, text: '장보기', done: true },
      { id: 'a1', ti: 99, text: '전화', done: 0 },
      { text: '  ' },
      'x',
      { id: '../bad id', ti: 1, text: '산책' },
    ],
    todayKeys: ['0-1', '0-1', '8-0', 3, '2-7'],
    focusMinutes: 12.6,
    todayDate: '2026-10-14',
  });
  assert.deepEqual(d.todayExtra.map((x) => x.text), ['장보기', '전화', '산책']);
  assert.equal(d.todayExtra[1].ti, 0);
  assert.equal(d.todayExtra[1].done, false);
  const ids = d.todayExtra.map((x) => x.id);
  assert.equal(new Set(ids).size, 3, 'id는 겹치지 않는다');
  assert.deepEqual(d.todayKeys, ['0-1', '2-7']);
  assert.equal(d.focusMinutes, 13);
  assert.equal(d.todayDate, '2026-10-14');
  assert.equal(migrate({ focusMinutes: -5 }).focusMinutes, 0);
  assert.equal(migrate({ focusMinutes: 'x' }).focusMinutes, 0);
  assert.equal('todayDate' in migrate({ todayDate: 'today' }), false);
  assert.equal('todayDate' in migrate({ todayDate: '2026-99-99' }), false);
  assert.deepEqual(migrate({ dayLog: { '2026-13-01': ['0-0'], '2026-02-30': ['0-0'] } }).dayLog, { '2026-02-30': ['0-0'] });
});

test('기본 필드와 알 수 없는 필드', () => {
  const d = migrate({ centerGoal: 7, onboarded: 'yes', hacked: true, version: 99 });
  assert.equal(d.centerGoal, '');
  assert.equal(d.centerGoalEn, CENTER_EN);
  assert.equal(d.onboarded, true);
  assert.equal(d.version, 1);
  assert.equal('hacked' in d, false);
});

test('migrate는 멱등이다', () => {
  const once = migrate({
    centerGoal: '최고의 나', onboarded: true,
    themes: sampleThemes(),
    dayLog: { '2026-10-14': ['0-1', '1-xabc'] },
    todayExtra: [{ id: 'abc', ti: 1, text: '전화', done: true }],
    settings: { accent: '#4f6bed' },
  });
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(once))), once);
});

test('예시 데이터의 루틴이 이행 후에도 남는다', () => {
  const d = migrate({ themes: sampleThemes() });
  const routines = d.themes.flatMap((t) => t.actions).filter((a) => a.days);
  assert.ok(routines.length >= 4);
  assert.deepEqual(d.themes[0].actions[1].days, [0, 1, 2, 3, 4, 5, 6]);
});

test('팔레트 이행 함수는 대소문자를 가리지 않고, 모르는 색은 그대로 둔다', () => {
  assert.equal(migrateAreaColor('#F4793B'), PILLAR_COLORS[7]);
  assert.equal(migrateAreaColor('#abcdef'), '#abcdef');
  assert.equal(migrateAccent('#f4793b'), GOLD);
  assert.equal(migrateAccent(GOLD), GOLD);
});

test('실천 유형 값: 형식이 맞는 것만 남기고, 이전 저장본(유형 없음)은 그대로 둔다', () => {
  const d = migrate({ themes: [{ actions: [
    { text: '책', kind: 'count', goal: 12, unit: ' 권 ', step: 1, count: 3, log: { '2026-10-14': 1, 'x': 2, '2026-10-13': -1 } },
    { text: '운동', kind: 'habit', perWeek: 3, since: '2026-10-01' },
    { text: '이력서', kind: 'once', due: '2026-10-20' },
    { text: '감사', kind: 'mind', ratings: { '2026-10-12': 4, '2026-10-05': 9, '2026-09-28': 2.5 } },
    { text: '이상한', kind: 'magic', goal: -1, count: 'many', step: 0, perWeek: 9, due: 'tomorrow', unit: 7 },
    { text: '저축', kind: 'count', goal: 1e12, count: 50, step: 10, unit: '만원' },
  ] }] });
  const [c, h, o, m, bad, money] = d.themes[0].actions;
  assert.deepEqual(c, { text: '책', note: '', done: false, kind: 'count', goal: 12, unit: '권', count: 3, log: { '2026-10-14': 1 } });
  assert.deepEqual(h, { text: '운동', note: '', done: false, kind: 'habit', perWeek: 3, since: '2026-10-01' });
  assert.deepEqual(o, { text: '이력서', note: '', done: false, kind: 'once', due: '2026-10-20' });
  assert.deepEqual(m, { text: '감사', note: '', done: false, kind: 'mind', ratings: { '2026-10-12': 4 } });
  assert.deepEqual(bad, { text: '이상한', note: '', done: false });
  assert.deepEqual(money, { text: '저축', note: '', done: false, kind: 'count', unit: '만 원', step: 10, count: 50 });
});

test('예시 데이터는 유형을 고루 담고, 저장·이행을 거쳐도 그대로다', () => {
  const themes = sampleThemes(new Date(2026, 9, 14));
  const all = themes.flatMap((t) => t.actions);
  const kinds = new Set(all.map((a) => a.kind ?? (a.days ? 'habit' : 'once')));
  assert.deepEqual([...kinds].sort(), ['count', 'habit', 'mind', 'once']);
  const resume = all.find((a) => a.text === '이력서 갱신');
  assert.equal(resume.due, '2026-10-16');
  const thanks = all.find((a) => a.text === '감사 표현하기');
  assert.deepEqual(thanks.ratings, { '2026-09-14': 2, '2026-09-21': 3, '2026-09-28': 3, '2026-10-05': 4 });
  const again = migrate({ ...blankDoc(), themes });
  assert.deepEqual(again.themes, themes);
});

test('포인트 컬러: 사용자가 고른 색은 그대로 둔다(이전 원색만 옮긴다)', () => {
  const { ACCENTS } = require('../src/theme/palette');
  for (const { color } of ACCENTS) assert.equal(migrate({ settings: { accent: color } }).settings.accent, color);
  assert.equal(migrate({ settings: { accent: '#123456' } }).settings.accent, '#123456');
  assert.equal(migrate({ settings: { accent: 'blue' } }).settings.accent, GOLD);
});

test('areasSet: 저장된 값이 없으면 적힌 실천·고친 영역 이름으로 짐작한다', () => {
  assert.equal(blankDoc().areasSet, false);
  assert.equal(migrate({}).areasSet, false);
  assert.equal(migrate({ areasSet: true }).areasSet, true);
  assert.equal(migrate({ areasSet: 'yes' }).areasSet, false);
  // 기본 이름 그대로(앞뒤 공백 포함)이거나 비운 이름은 정한 것이 아니다
  assert.equal(migrate({ themes: [{ title: ' 건강 ' }, { title: '' }] }).areasSet, false);
  assert.equal(migrate({ themes: [{ title: '운동' }] }).areasSet, true);
  assert.equal(migrate({ themes: [{}, {}, {}, {}, {}, {}, {}, { title: '여행' }] }).areasSet, true);
  // 실천이 하나라도 적혀 있으면 영역도 정한 것으로 본다(공백만 있는 칸은 빈칸)
  assert.equal(migrate({ themes: [{ actions: [{ text: '   ' }] }] }).areasSet, false);
  assert.equal(migrate({ themes: [{ actions: [{ text: '걷기' }] }] }).areasSet, true);
  assert.equal(migrate({ themes: sampleThemes() }).areasSet, true);
});

test('areasSet: 저장된 거짓은 그대로 — 실천을 적은 문서도 다시 열 때 시작하기 단계가 저절로 끝나지 않는다', () => {
  const written = { themes: [{ title: '운동', actions: [{ text: '걷기' }] }] };
  assert.equal(migrate({ ...written, areasSet: false }).areasSet, false);
  assert.equal(migrate({ ...written, areasSet: true }).areasSet, true);
  // 저장했다 다시 읽어도(JSON) 같은 값 — 짐작은 값이 없을 때만
  const once = migrate({ ...written, areasSet: false });
  assert.equal(migrate(JSON.parse(JSON.stringify(once))).areasSet, false);
  assert.equal(migrate(written).areasSet, true);
});

test('reviews: 월요일 키·날짜·칸 키를 검사하고 중점은 3칸, 메모는 다듬는다', () => {
  const d = migrate({
    reviews: {
      '2026-10-05': { at: '2026-10-11', next: ['0-1', '0-1', '9-9', 3, '2-7', '1-1', '4-4'], note: '  아침 운동부터  ' },
      '2026-10-06': { at: '2026-10-12', next: ['0-0'] }, // 화요일 키
      '2026-02-30': { at: '2026-03-01', next: [] }, // 없는 날
      '2026-09-28': { at: 'yesterday', next: ['0-0'] }, // 돌아본 날이 깨짐
      '2026-09-21': { at: '2026-09-27', next: 'nope', note: '   ' },
      '2026-09-14': 'x',
      monday: { at: '2026-09-20', next: [] },
    },
  });
  assert.deepEqual(d.reviews, {
    '2026-10-05': { at: '2026-10-11', next: ['0-1', '2-7', '1-1'], note: '아침 운동부터' },
    '2026-09-21': { at: '2026-09-27', next: [] },
  });
  assert.deepEqual(migrate({ reviews: [1, 2] }).reviews, {});
  assert.deepEqual(migrate({ reviews: 'x' }).reviews, {});
  assert.deepEqual(blankDoc().reviews, {});
});

test('reviews: 메모는 120자까지, 기록은 최근 104주까지', () => {
  const long = '가'.repeat(130);
  assert.equal(migrate({ reviews: { '2026-10-05': { at: '2026-10-11', next: [], note: long } } }).reviews['2026-10-05'].note.length, 120);
  const reviews = {};
  const mon = new Date(2026, 9, 5);
  for (let i = 0; i < 110; i++) {
    const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - i * 7);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    reviews[k] = { at: k, next: [] };
  }
  const kept = Object.keys(migrate({ reviews }).reviews).sort();
  assert.equal(kept.length, 104);
  assert.equal(kept[kept.length - 1], '2026-10-05', '가장 최근 주는 남는다');
  assert.ok(!kept.includes(Object.keys(reviews).sort()[0]), '가장 오래된 주는 빠진다');
});

test('settings.lastBackupAt은 날짜 형식일 때만 남는다', () => {
  assert.equal(migrate({ settings: { lastBackupAt: '2026-10-12' } }).settings.lastBackupAt, '2026-10-12');
  for (const bad of ['어제', '2026-13-01', 20261012, null]) {
    assert.equal('lastBackupAt' in migrate({ settings: { lastBackupAt: bad } }).settings, false, String(bad));
  }
});

test('-0 같은 값도 저장·불러오기 뒤 같은 문서가 되도록 0으로 맞춘다', () => {
  const d = migrate({
    themes: [{ actions: [{ text: '책', kind: 'count', goal: 3, count: -0 }] }],
    dayMeta: { '2026-10-14': { mood: -0 } },
    todayExtra: [{ id: 'a', ti: -0, text: '전화' }],
  });
  assert.deepEqual(JSON.parse(JSON.stringify(d)), d);
});

// ── 스키마 4: 알림 · 종이 무늬 · 습관 알림 · 지난 표 ────────────────────────────
const { TIME_RE, PAPER_OPTS, ARCHIVE_KEEP, ARCHIVE_NOTE_MAX, cleanReminders, cleanThemes } = require('../src/data/defaults');

test('settings.reminders: HH:MM이 맞는 아침·저녁과 참인 돌아보기만, 비면 필드가 없다', () => {
  assert.ok(TIME_RE.test('00:00') && TIME_RE.test('23:59'));
  for (const bad of ['24:00', '7:30', '07:60', '0730', '']) assert.equal(TIME_RE.test(bad), false, bad);
  const d = migrate({ settings: { reminders: { morning: '08:00', evening: '25:00', review: true, extra: 1 } } });
  assert.deepEqual(d.settings.reminders, { morning: '08:00', review: true });
  assert.deepEqual(migrate({ settings: { reminders: { evening: '21:30', review: 'yes' } } }).settings.reminders, { evening: '21:30' });
  for (const empty of [{}, { review: false }, { morning: '8:00' }, 'x', null, []]) {
    assert.equal('reminders' in migrate({ settings: { reminders: empty } }).settings, false, JSON.stringify(empty));
  }
  assert.equal(cleanReminders(undefined), undefined);
  assert.equal('reminders' in blankDoc().settings, false);
});

test('settings.paper: 고를 수 있는 무늬만 남고, 아니면 필드가 없다(점 종이)', () => {
  assert.deepEqual([...PAPER_OPTS], ['grid', 'lines', 'blank']);
  for (const p of PAPER_OPTS) assert.equal(migrate({ settings: { paper: p } }).settings.paper, p);
  for (const bad of ['dots', '', 3, null, '__proto__']) assert.equal('paper' in migrate({ settings: { paper: bad } }).settings, false);
});

test('action.remindAt: 유형과 상관없이 HH:MM일 때만 남는다', () => {
  const d = migrate({ themes: [{ actions: [
    { text: '걷기', kind: 'habit', days: [1], remindAt: '07:30' },
    { text: '책', kind: 'once', remindAt: '21:00' },
    { text: '물', kind: 'habit', days: [1], remindAt: '7:30' },
    { text: '명상', remindAt: 730 },
  ] }] });
  const [a, b, c, e] = d.themes[0].actions;
  assert.equal(a.remindAt, '07:30');
  assert.equal(b.remindAt, '21:00', '다른 유형 값은 남겨 둔다');
  assert.equal('remindAt' in c, false);
  assert.equal('remindAt' in e, false);
});

function arch(over = {}) {
  return {
    id: 'y20260101', from: '2026-01-01', to: '2026-06-30', centerGoal: '지난 목표', themes: [{ title: '건강', actions: [{ text: '걷기', done: true }] }],
    dayLog: { '2025-12-31': ['0-0'], '2026-01-05': ['0-0', '9-9'], '2026-07-01': ['0-1'] },
    dayMeta: { '2026-02-01': { mood: 3 }, '2026-08-01': { mood: 1 } },
    reviews: { '2025-12-29': { at: '2026-01-04', next: ['0-0'] }, '2026-01-05': { at: '2026-01-11', next: [] }, '2026-07-06': { at: '2026-07-12', next: [] } },
    closedDays: ['2026-01-05', '2026-07-01', 'x'],
    focusMinutes: 90,
    note: '  잘 버텼다  ',
    ...over,
  };
}

test('archives: 기간 안의 기록만, 깨진 값은 버리고, 빈 값은 두지 않는다', () => {
  const d = migrate({ archives: [arch()] });
  assert.equal(d.archives.length, 1);
  const a = d.archives[0];
  assert.equal(a.id, 'y20260101');
  assert.equal(a.centerGoal, '지난 목표');
  assert.equal(a.themes.length, 8);
  for (const t of a.themes) assert.equal(t.actions.length, 8);
  assert.deepEqual(a.themes, cleanThemes([{ title: '건강', actions: [{ text: '걷기', done: true }] }]));
  assert.deepEqual(a.dayLog, { '2026-01-05': ['0-0'] });
  assert.deepEqual(a.dayMeta, { '2026-02-01': { mood: 3 } });
  // 기간이 걸친 주(월요일이 from 앞)는 이 표의 주다
  assert.deepEqual(Object.keys(a.reviews), ['2025-12-29', '2026-01-05']);
  assert.deepEqual(a.closedDays, ['2026-01-05']);
  assert.equal(a.focusMinutes, 90);
  assert.equal(a.note, '잘 버텼다');
  const bare = migrate({ archives: [arch({ reviews: undefined, closedDays: [], note: '   ', focusMinutes: -1 })] }).archives[0];
  assert.equal('reviews' in bare, false);
  assert.equal('closedDays' in bare, false);
  assert.equal('note' in bare, false);
  assert.equal(bare.focusMinutes, 0);
  assert.equal(migrate({ archives: [arch({ note: '가'.repeat(200) })] }).archives[0].note.length, ARCHIVE_NOTE_MAX);
});

test('archives: 아이디·기간이 깨진 표와 겹치는 아이디는 버리고, (to, id) 순서로 최근 30장', () => {
  const bad = [
    arch({ id: '../x' }), arch({ id: undefined }), arch({ from: '2026-13-01' }), arch({ to: 'today' }), arch({ from: '2026-07-01', to: '2026-06-30' }), null, 'x',
  ];
  assert.equal('archives' in migrate({ archives: bad }), false, '남는 표가 없으면 필드가 없다');
  assert.equal('archives' in migrate({ archives: [] }), false);
  assert.equal('archives' in migrate({ archives: 'x' }), false);
  const dup = migrate({ archives: [arch({ centerGoal: '처음' }), arch({ centerGoal: '나중' })] }).archives;
  assert.deepEqual(dup.map((a) => a.centerGoal), ['처음']);
  // 35장 — 닫은 날이 겹치는 표(i와 i+28)는 아이디 순서로
  const many = Array.from({ length: 35 }, (_, i) => arch({ id: `a${String(i).padStart(2, '0')}`, from: '2025-01-01', to: `2026-01-${String((i % 28) + 1).padStart(2, '0')}` }));
  const kept = migrate({ archives: many }).archives;
  assert.equal(kept.length, ARCHIVE_KEEP);
  for (let i = 1; i < kept.length; i++) {
    const p = kept[i - 1], c = kept[i];
    assert.ok(p.to < c.to || (p.to === c.to && p.id < c.id), `${p.id} → ${c.id}`);
  }
});

test('chartStart·focusStart: 형식이 맞을 때만, 오늘 날짜로 짐작하지 않는다', () => {
  const d = migrate({ chartStart: '2026-10-01', focusStart: 30, focusMinutes: 50 });
  assert.equal(d.chartStart, '2026-10-01');
  assert.equal(d.focusStart, 30);
  assert.equal(migrate({ focusStart: 0, focusMinutes: 0 }).focusStart, 0);
  for (const bad of [{ chartStart: 'today' }, {}, { chartStart: 7 }]) assert.equal('chartStart' in migrate(bad), false);
  for (const bad of [{ focusStart: 60, focusMinutes: 50 }, { focusStart: -1, focusMinutes: 50 }, { focusStart: 2.5, focusMinutes: 50 }, { focusStart: '3', focusMinutes: 50 }]) {
    assert.equal('focusStart' in migrate(bad), false, JSON.stringify(bad));
  }
  const blank = migrate({});
  for (const k of ['archives', 'chartStart', 'focusStart']) assert.equal(k in blank, false);
});

test('스키마 4 값이 있는 문서도 migrate는 멱등이고 JSON 왕복에 같다', () => {
  const raw = {
    settings: { reminders: { morning: '08:00', review: true }, paper: 'lines' },
    themes: [{ actions: [{ text: '걷기', kind: 'habit', days: [1], remindAt: '07:30' }] }],
    archives: [arch(), arch({ id: 'y20250101', from: '2025-01-01', to: '2025-12-31' })],
    chartStart: '2026-07-01', focusStart: 10, focusMinutes: 20,
    _sync: { hlc: 'x' },
  };
  const m = migrate(raw);
  assert.equal('_sync' in m, false, 'iCloud 봉투는 문서가 아니다');
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(m))), m);
  assert.deepEqual(m.archives.map((a) => a.id), ['y20250101', 'y20260101']);
});
