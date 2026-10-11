require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../src/lib/backup');
const { blankDoc, sampleThemes } = require('../src/data/defaults');

function sampleDoc() {
  return {
    ...blankDoc(),
    onboarded: true,
    centerGoal: '2026 최고의 나',
    themes: sampleThemes(),
    dayLog: { '2026-10-13': ['0-0', '0-1'], '2026-10-14': ['1-xab12'] },
    dayMeta: { '2026-10-14': { mood: 4, reflection: '한 걸음' } },
    todayExtra: [{ id: 'ab12', ti: 1, text: '전화', done: true }],
    todayDate: '2026-10-14',
    focusMinutes: 50,
  };
}

test('내보낸 백업을 그대로 불러오면 같은 문서가 된다', () => {
  const doc = sampleDoc();
  const r = B.parseBackup(B.makeBackup(doc, new Date(2026, 9, 14)));
  assert.equal(r.ok, true);
  assert.deepEqual(r.doc, doc);
  const pretty = B.parseBackup(B.makeBackup(doc, new Date(), true));
  assert.equal(pretty.ok, true);
  assert.deepEqual(pretty.doc, doc);
});

test('메신저 등으로 앞뒤에 글이 붙어도 읽는다', () => {
  const text = `내 만다라트 백업이야\n${B.makeBackup(sampleDoc())}\n— 보낸 사람`;
  assert.equal(B.parseBackup(text).ok, true);
});

test('앞뒤 글에 {중괄호}가 섞여 있어도 백업을 찾아 읽는다', () => {
  const b = B.makeBackup(sampleDoc());
  for (const text of [`{홍길동}님이 보낸 백업\n${b}`, `${b}\n:}`, `[메모] {중요} ${b} {끝}`]) {
    const r = B.parseBackup(text);
    assert.equal(r.ok, true, text.slice(0, 20));
    assert.equal(r.doc.centerGoal, '2026 최고의 나');
  }
});

test('겉 포장이 잘려도 안쪽 문서가 온전하면 살려 낸다', () => {
  const b = B.makeBackup(sampleDoc());
  const r = B.parseBackup(b.slice(0, -1)); // 마지막 '}' 하나 빠짐
  assert.equal(r.ok, true);
  assert.equal(r.doc.centerGoal, '2026 최고의 나');
});

test('감싸지 않은 문서(JSON) 자체도 받아들이고, 온보딩은 끝난 것으로 본다', () => {
  const raw = { ...sampleDoc(), onboarded: false };
  const r = B.parseBackup(JSON.stringify(raw));
  assert.equal(r.ok, true);
  assert.equal(r.doc.onboarded, true);
});

test('요약: 목표·채운 칸·달성·기록 일수·루틴 수·백업 시각', () => {
  const at = new Date(2026, 9, 14, 9, 30);
  const r = B.parseBackup(B.makeBackup(sampleDoc(), at));
  assert.equal(r.ok, true);
  const s = r.summary;
  assert.equal(s.goal, '2026 최고의 나');
  assert.equal(s.filled, 64);
  assert.equal(s.done, sampleThemes().flatMap((t) => t.actions).filter((a) => a.done).length);
  assert.equal(s.days, 2);
  assert.equal(s.routines, 5);
  assert.equal(s.exportedAt, at.toISOString());
});

test('잘못된 입력은 이해하기 쉬운 오류로', () => {
  const cases = [
    ['', '붙여넣은 내용이 없어요'],
    ['   \n ', '붙여넣은 내용이 없어요'],
    ['그냥 글', '백업 내용을 찾지 못했어요'],
    ['{"app":"mandarat","doc":{"themes":[', '잘렸거나'],
    ['{"app":"mandarat","doc":{"themes":[{"title":"건강","actions":[{"text":"걷기"}', '잘렸거나'],
    ['{bad}', '잘렸거나'],
    ['{"foo":1}', '만다라트 백업 형식이 아니에요'],
    ['{"app":"mandarat","doc":"x"}', '만다라트 백업 형식이 아니에요'],
    ['{"app":"mandarat","schema":99,"doc":{"themes":[]}}', '업데이트'],
  ];
  for (const [input, msg] of cases) {
    const r = B.parseBackup(input);
    assert.equal(r.ok, false, input);
    assert.ok(r.error.includes(msg), `${input} → ${r.error}`);
  }
});

test('불러온 손상 값은 migrate로 안전하게 보정된다', () => {
  const r = B.parseBackup(JSON.stringify({ app: 'mandarat', schema: 1, doc: { themes: [{ title: 1 }], dayLog: { x: 1 }, settings: { mood: 'x' } } }));
  assert.equal(r.ok, true);
  assert.equal(r.doc.themes.length, 8);
  assert.deepEqual(r.doc.dayLog, {});
  assert.equal(r.doc.settings.mood, '연꽃');
});

test('백업 파일 이름에는 로컬 날짜가 들어간다', () => {
  assert.equal(B.backupFileName(new Date(2026, 9, 11)), 'mandarat-backup-2026-10-11.json');
});
