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
    areasSet: true,
    reviews: { '2026-10-05': { at: '2026-10-11', next: ['0-2', '3-1'], note: '아침 운동부터' } },
    settings: { ...blankDoc().settings, lastBackupAt: '2026-10-12' },
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

test('스키마 3: 돌아보기·영역 표시·마지막 백업 날이 백업을 오가도 그대로다', () => {
  assert.equal(B.BACKUP_SCHEMA, 4);
  const text = B.makeBackup(sampleDoc(), new Date(2026, 9, 14));
  assert.equal(JSON.parse(text).schema, 4);
  const r = B.parseBackup(text);
  assert.equal(r.ok, true);
  assert.deepEqual(r.doc.reviews, { '2026-10-05': { at: '2026-10-11', next: ['0-2', '3-1'], note: '아침 운동부터' } });
  assert.equal(r.doc.areasSet, true);
  assert.equal(r.doc.settings.lastBackupAt, '2026-10-12');
});

test('더 새로운 스키마(5)의 백업은 거절하고, 이전 스키마(2)는 받아들인다', () => {
  const doc = sampleDoc();
  const v5 = B.parseBackup(JSON.stringify({ app: 'mandarat', schema: 5, exportedAt: '2026-10-14T00:00:00.000Z', doc }));
  assert.equal(v5.ok, false);
  assert.equal(v5.error, 'newer');
  const v4 = B.parseBackup(JSON.stringify({ app: 'mandarat', schema: 4, exportedAt: '2026-10-14T00:00:00.000Z', doc }));
  assert.equal(v4.ok, true);
  // 스키마 2 시절 백업에는 areasSet·reviews가 없다 — 적힌 실천이 있으니 영역은 정한 것으로 본다
  const { areasSet, reviews, ...old } = doc;
  const v2 = B.parseBackup(JSON.stringify({ app: 'mandarat', schema: 2, doc: old }));
  assert.equal(v2.ok, true);
  assert.equal(v2.doc.areasSet, true);
  assert.deepEqual(v2.doc.reviews, {});
});

/** 스키마 4 값이 모두 있는 문서 — 알림·종이 무늬·습관 알림·지난 표 */
function v4Doc() {
  const doc = sampleDoc();
  doc.settings = { ...doc.settings, reminders: { morning: '08:00', evening: '21:30', review: true }, paper: 'grid' };
  doc.themes[0].actions[2] = { ...doc.themes[0].actions[2], remindAt: '07:15' };
  doc.archives = [{
    id: 'y20260101', from: '2026-01-01', to: '2026-09-30', centerGoal: '작년의 나', themes: sampleThemes(),
    dayLog: { '2026-03-02': ['0-0'] }, dayMeta: { '2026-03-02': { mood: 3 } },
    reviews: { '2026-03-02': { at: '2026-03-08', next: ['0-0'] } }, closedDays: ['2026-03-02'], focusMinutes: 40, note: '잘 버텼다',
  }];
  doc.chartStart = '2026-10-01';
  doc.focusStart = 40;
  return doc;
}

test('스키마 4: 알림·종이 무늬·습관 알림·지난 표가 백업을 오가도 그대로다', () => {
  const doc = v4Doc();
  const r = B.parseBackup(B.makeBackup(doc, new Date(2026, 9, 14)));
  assert.equal(r.ok, true);
  assert.deepEqual(r.doc, doc);
  assert.equal(r.summary.archives, 1);
});

test('요약의 지난 표 수(archives)는 없으면 0이고 늘 있다', () => {
  const s = B.summarize(blankDoc());
  assert.equal(s.archives, 0);
  assert.equal('archives' in s, true);
  assert.equal(B.summarize(v4Doc()).archives, 1);
});

test('요약의 마지막 기록 날(lastLog)은 기록이 있는 가장 늦은 날', () => {
  assert.equal(B.summarize(sampleDoc()).lastLog, '2026-10-14');
  const empty = B.summarize(blankDoc());
  assert.equal('lastLog' in empty, false);
  assert.equal(empty.days, 0);
  const d = { ...sampleDoc(), dayLog: { '2026-09-30': ['0-0'], '2026-10-02': [], '2026-09-01': ['1-1'] } };
  assert.equal(B.summarize(d).lastLog, '2026-09-30', '빈 날은 기록으로 보지 않는다');
  assert.equal(B.summarize(d).days, 2);
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

test('같은 백업을 두 번 붙여넣어도 첫 번째를 읽는다', () => {
  const b = B.makeBackup(sampleDoc());
  const r = B.parseBackup(`${b}\n${b}`);
  assert.equal(r.ok, true);
});

test('아주 길거나 이상한 입력도 빨리 끝난다', () => {
  for (const text of ['{'.repeat(300000), `${'{"a":'.repeat(50000)}1`, `"${'{'.repeat(100000)}`]) {
    const t0 = Date.now();
    const r = B.parseBackup(text);
    assert.equal(r.ok, false);
    assert.ok(Date.now() - t0 < 1500, `${Date.now() - t0}ms`);
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
  // 습관 = 요일 습관 7 + 주 N회 습관 3
  assert.equal(s.routines, 10);
  assert.equal(s.exportedAt, at.toISOString());
});

test('잘못된 입력은 까닭 코드로 — 글은 m.backup.err*에서(X-K)', () => {
  const cases = [
    ['', 'empty'],
    ['   \n ', 'empty'],
    ['그냥 글', 'notFound'],
    ['{"app":"mandarat","doc":{"themes":[', 'broken'],
    ['{"app":"mandarat","doc":{"themes":[{"title":"건강","actions":[{"text":"걷기"}', 'broken'],
    ['{bad}', 'notFound'],
    ['안녕 {친구} 잘 지내?', 'notFound'],
    ['{"foo":1}', 'notOurs'],
    ['{"app":"mandarat","doc":"x"}', 'notOurs'],
    ['{"app":"mandarat","schema":99,"doc":{"themes":[]}}', 'newer'],
  ];
  for (const [input, code] of cases) {
    const r = B.parseBackup(input);
    assert.equal(r.ok, false, input);
    assert.equal(r.error, code, input);
  }
  // 한국어 글은 추출 전과 한 글자도 다르지 않다
  const ko = require('../src/i18n/ko/backup').default;
  assert.equal(ko.errEmpty, '붙여넣은 내용이 없어요');
  assert.equal(ko.errNotFound, '백업 내용을 찾지 못했어요. 내보낸 글 전체를 붙여넣어 주세요');
  assert.equal(ko.errBroken, '백업 내용이 잘렸거나 손상됐어요. 처음부터 끝까지 다시 복사해 주세요');
  assert.equal(ko.errNotOurs, '만다라트 백업 형식이 아니에요');
  assert.equal(ko.errNewer, '더 새로운 버전의 앱에서 만든 백업이에요. 앱을 업데이트한 뒤 불러와 주세요');
});

test('ja·en에서 만든 백업도 그대로 불러온다 — 형식은 언어와 무관하다(X-K)', () => {
  const { setLang } = require('../src/i18n');
  const { backupTextPrefix } = require('../src/lib/backupNote');
  const now = new Date(2026, 9, 14, 9);
  const doc = sampleDoc();
  try {
    for (const l of ['ja', 'en']) {
      setLang(l);
      const text = backupTextPrefix(now) + B.makeBackup(doc, now, true);
      assert.ok(!/[{}]/.test(backupTextPrefix(now)), l);
      setLang('ko');
      const r = B.parseBackup(text);
      assert.equal(r.ok, true, l);
      assert.equal(r.doc.centerGoal, doc.centerGoal);
    }
  } finally {
    setLang('ko');
  }
  assert.equal(B.backupFileName(now), 'mandarat-backup-2026-10-14.json');
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
