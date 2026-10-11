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
