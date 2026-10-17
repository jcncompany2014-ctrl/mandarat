// 지난 표 — 닫기 · 새 표 · 저장본 · 초기화 · 백업 합치기 (V1-D, src/lib/archive.ts)
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  chartRange, makeArchive, freshAction, archiveId, startNewChart, archiveAsDoc, archiveAccess,
  resetDoc, unionArchives, yearClosePrompt, yearLabel,
} = require('../src/lib/archive');
const { blankDoc, migrate, sampleThemes, scaffoldThemes, ARCHIVE_KEEP } = require('../src/data/defaults');
const { isArchivedKey } = require('../src/lib/history');

const ROOT = path.join(__dirname, '..');
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const NOW = new Date(2026, 11, 20, 10); // 2026-12-20
const T = 1_790_000_000_000;

/** 2026-01-05부터 쓴 표 — 습관 · 쌓기 · 한 번 · 마음가짐, 기록 · 기분 · 돌아보기 · 마감한 날 */
function usedDoc() {
  const d = blankDoc();
  d.onboarded = true;
  d.centerGoal = '건강한 한 해';
  d.chartStart = '2026-01-05';
  d.focusMinutes = 300;
  d.focusStart = 40;
  d.themes = sampleThemes(new Date(2026, 0, 5));
  d.themes[0].actions[0] = { text: '아침 걷기', note: '공원', done: true, kind: 'habit', days: [1, 3, 5], since: '2026-01-05', schedule: [{ from: '2026-01-05', days: [1] }, { from: '2026-03-01', days: [1, 3, 5] }], remindAt: '07:30' };
  d.themes[0].actions[1] = { text: '책 12권', note: '', done: true, kind: 'count', goal: 12, unit: '권', step: 1, count: 12, log: { '2026-02-01': 6, '2026-06-01': 6 } };
  d.themes[0].actions[2] = { text: '건강검진', note: '', done: true, kind: 'once', due: '2026-04-30' };
  d.themes[0].actions[3] = { text: '천천히 말하기', note: '', done: false, kind: 'mind', ratings: { '2026-03-02': 4 } };
  d.themes[0].actions[4] = { text: '물 마시기', note: '', done: false, kind: 'count', goal: 100, count: 30, step: 2, habitUntil: '2026-02-01', since: '2026-01-05', days: [1], log: { '2026-02-02': 30 } };
  d.dayLog = {
    '2026-01-04': ['0-0'], // 시작 전 날
    '2026-01-05': ['0-0', '0-x1'],
    '2026-02-01': ['0-1'],
    '2026-04-10': ['0-2'],
    '2026-06-01': ['0-1'],
    '2026-12-20': ['0-0'],
  };
  d.dayMeta = { '2026-01-04': { mood: 1 }, '2026-01-05': { mood: 3, reflection: '시작' }, '2026-12-20': { reflection: '오늘' } };
  d.reviews = {
    '2025-12-29': { at: '2026-01-04', next: ['0-0'], note: '시작 전 주' }, // 1/4에 끝난 주 — 기간 밖
    '2026-03-02': { at: '2026-03-08', next: ['0-2'], note: '봄' },
  };
  d.closedDays = ['2026-01-04', '2026-01-05', '2026-12-20'];
  d.todayKeys = ['0-0'];
  d.todayExtra = [{ id: 'a', ti: 0, text: '남은 일', done: false }, { id: 'b', ti: 1, text: '끝낸 일', done: true }];
  return migrate(d);
}

test('chartRange: 시작한 날 → 첫 기록 날 → 오늘, 늦은 시작은 오늘로', () => {
  assert.deepEqual(chartRange({ chartStart: '2026-01-05', dayLog: {} }, NOW), { from: '2026-01-05', to: '2026-12-20' });
  assert.deepEqual(chartRange({ dayLog: { '2026-03-01': ['0-0'], '2026-02-01': [] } }, NOW), { from: '2026-03-01', to: '2026-12-20' });
  assert.deepEqual(chartRange({ dayLog: {} }, NOW), { from: '2026-12-20', to: '2026-12-20' });
  assert.deepEqual(chartRange({ chartStart: '2027-01-01', dayLog: {} }, NOW), { from: '2026-12-20', to: '2026-12-20' });
});

test('archiveId는 시작한 날로 정해진다(두 기기에서 닫아도 하나)', () => {
  assert.equal(archiveId('2026-01-05'), 'y20260105');
  const d = usedDoc();
  assert.equal(makeArchive(d, NOW).id, makeArchive(d, new Date(2026, 11, 21)).id);
});

test('makeArchive: 기간 경계에서 정확히 자르고, 칸 키는 그대로 붙어 있다', () => {
  const d = usedDoc();
  const a = makeArchive(d, NOW, '  한 해 고마웠어  ');
  assert.equal(a.from, '2026-01-05');
  assert.equal(a.to, '2026-12-20');
  assert.deepEqual(Object.keys(a.dayLog).sort(), ['2026-01-05', '2026-02-01', '2026-04-10', '2026-06-01', '2026-12-20']);
  assert.deepEqual(a.dayLog['2026-01-05'], ['0-0', '0-x1']);
  assert.deepEqual(Object.keys(a.dayMeta).sort(), ['2026-01-05', '2026-12-20']);
  assert.deepEqual(Object.keys(a.reviews).sort(), ['2026-03-02']);
  assert.deepEqual(a.reviews['2026-03-02'].next, ['0-2'], '지난 표 안의 중점 칸은 그대로');
  // 시작한 날에 걸친 주(월요일이 6일까지 앞선 주)는 이 표의 주 — 일요일 1/4에 시작하면 12/29 주도 담는다
  const straddle = makeArchive({ ...d, chartStart: '2026-01-04', reviews: { ...d.reviews, '2025-12-29': { at: '2026-01-04', next: [] } } }, NOW);
  assert.deepEqual(Object.keys(straddle.reviews).sort(), ['2025-12-29', '2026-03-02']);
  assert.equal(makeArchive({ ...d, chartStart: '2026-01-05' }, NOW).reviews['2025-12-29'], undefined);
  assert.deepEqual(a.closedDays, ['2026-01-05', '2026-12-20']);
  assert.equal(a.focusMinutes, 260);
  assert.equal(a.note, '한 해 고마웠어');
  assert.equal(a.centerGoal, '건강한 한 해');
  assert.equal(a.themes[0].actions[1].count, 12, '닫을 때 모습 그대로');
  // 한 줄은 120자, 비면 없다
  assert.equal(Array.from(makeArchive(d, NOW, '가'.repeat(200)).note).length, 120);
  assert.equal('note' in makeArchive(d, NOW, '   '), false);
  // migrate(cleanArchives)를 거쳐도 같은 모양
  assert.deepEqual(migrate({ ...d, archives: [a] }).archives, [a]);
});

test('freshAction: 설정은 남기고 기록은 비운다, 습관은 오늘부터', () => {
  const d = usedDoc();
  const day = '2026-12-20';
  assert.deepEqual(freshAction(d.themes[0].actions[0], day), { text: '아침 걷기', note: '공원', done: false, kind: 'habit', days: [1, 3, 5], since: day, remindAt: '07:30' });
  assert.deepEqual(freshAction(d.themes[0].actions[1], day), { text: '책 12권', note: '', done: false, kind: 'count', goal: 12, unit: '권', count: 0 });
  assert.deepEqual(freshAction(d.themes[0].actions[2], day), { text: '건강검진', note: '', done: false, kind: 'once' });
  assert.deepEqual(freshAction(d.themes[0].actions[3], day), { text: '천천히 말하기', note: '', done: false, kind: 'mind' });
  const water = freshAction(d.themes[0].actions[4], day);
  assert.equal(water.step, 2);
  assert.equal('habitUntil' in water, false);
  assert.equal('since' in water, false, '쌓기에는 since가 없다');
  assert.equal('log' in water, false);
});

test('startNewChart — continue: 같은 실천을 새로, 기록은 떼어 두고 지난 표에는 붙어 있다', () => {
  const d = usedDoc();
  const n = startNewChart(d, 'continue', NOW, { goal: '  더 건강한 해 ', note: '끝', time: T });
  assert.ok(n);
  assert.equal(n.archives.length, 1);
  const a = n.archives[0];
  assert.equal(a.id, 'y20260105');
  assert.equal(n.themes[0].actions[0].text, '아침 걷기');
  assert.equal(n.themes[0].actions[0].done, false);
  assert.equal(n.themes[0].actions[0].since, '2026-12-20');
  assert.equal(n.themes[0].actions[1].count, 0);
  assert.equal(n.centerGoal, '더 건강한 해');
  assert.deepEqual(n.todayKeys, []);
  assert.deepEqual(n.todayExtra.map((x) => x.id), ['a'], '끝내지 않은 할 일만');
  // 살아 있는 칸 키는 떼어 두고(지우지 않는다), 지난 표 안에는 칸 키 그대로
  for (const [day, list] of Object.entries(n.dayLog)) {
    assert.equal(list.length, d.dayLog[day].length, day);
    for (const k of list) assert.ok(!/^[0-7]-[0-7]$/.test(k), k);
  }
  assert.ok(n.dayLog['2026-12-20'].every(isArchivedKey));
  assert.deepEqual(n.dayLog['2026-01-05'][1], '0-x1', '직접 추가한 할 일 기록은 그대로');
  assert.deepEqual(a.dayLog['2026-12-20'], ['0-0']);
  // 돌아보기 중점 칸은 떼어 내고 메모는 남긴다
  assert.deepEqual(n.reviews['2026-03-02'], { at: '2026-03-08', next: [], note: '봄' });
  assert.deepEqual(a.reviews['2026-03-02'].next, ['0-2']);
  // 기분 · 한 줄 · 마감한 날은 살아 있는 문서에 그대로
  assert.deepEqual(n.dayMeta, d.dayMeta);
  assert.deepEqual(n.closedDays, d.closedDays);
  assert.equal(n.chartStart, '2026-12-20');
  assert.equal(n.focusStart, 300);
  assert.equal(n.areasSet, true);
  // 저장했다 읽어도 같다
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(n))), n);
});

test('startNewChart — areas: 영역 이름·색·아이콘만, blank: 처음부터', () => {
  const d = usedDoc();
  d.themes[2] = { ...d.themes[2], title: '내 영역' };
  const areas = startNewChart(d, 'areas', NOW, { goal: '', note: '', time: T });
  assert.equal(areas.themes[2].title, '내 영역');
  assert.equal(areas.themes[2].color, d.themes[2].color);
  assert.equal(areas.themes[2].icon, d.themes[2].icon);
  assert.ok(areas.themes.every((t) => t.actions.length === 8 && t.actions.every((a) => a.text === '' && !a.done)));
  assert.equal(areas.centerGoal, '건강한 한 해', '비우면 지금 목표');
  assert.equal(areas.areasSet, true);
  const blank = startNewChart(d, 'blank', NOW, { goal: '', note: '', time: T });
  assert.deepEqual(blank.themes, scaffoldThemes());
  assert.equal(blank.areasSet, false);
  for (const n of [areas, blank]) assert.deepEqual(migrate(JSON.parse(JSON.stringify(n))), n);
});

test('startNewChart: 오늘 시작한 표를 또 닫으면 null(같은 아이디가 이미 있다)', () => {
  const d = usedDoc();
  const first = startNewChart(d, 'continue', NOW, { goal: '', note: '', time: T });
  assert.equal(startNewChart(first, 'continue', NOW, { goal: '', note: '', time: T + 1 }), null);
  // 다음 날 닫으면 새 지난 표
  const next = startNewChart(first, 'continue', new Date(2026, 11, 21), { goal: '', note: '', time: T + 2 });
  assert.deepEqual(next.archives.map((a) => a.id), ['y20260105', 'y20261220']);
});

test('startNewChart: 지난 표는 최근 30장까지(migrate와 같은 순서)', () => {
  const d = usedDoc();
  d.archives = Array.from({ length: ARCHIVE_KEEP }, (_, i) => {
    const day = `2025-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`;
    return makeArchive({ ...blankDoc(), chartStart: day }, new Date(2025, 2, 1));
  });
  assert.equal(migrate(d).archives.length, ARCHIVE_KEEP);
  const n = startNewChart(d, 'continue', NOW, { goal: '', note: '', time: T });
  assert.equal(n.archives.length, ARCHIVE_KEEP);
  assert.equal(n.archives[n.archives.length - 1].id, 'y20260105');
  assert.deepEqual(migrate(n).archives, n.archives);
});

test('migrate는 지난 표를 지키고 멱등이다', () => {
  const n = startNewChart(usedDoc(), 'continue', NOW, { goal: '', note: '한 줄', time: T });
  const once = migrate(n);
  assert.deepEqual(once.archives, n.archives);
  assert.deepEqual(migrate(once), once);
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(once))), once);
});

test('가장 무거운 지난 표(365일 × 8칸 · 날마다 한 줄 · 돌아보기 52주)도 120 KB 아래', () => {
  const d = blankDoc();
  d.onboarded = true;
  d.chartStart = '2026-01-01';
  d.themes = sampleThemes(new Date(2026, 0, 1));
  d.dayLog = {};
  d.dayMeta = {};
  d.reviews = {};
  for (let i = 0; i < 365; i++) {
    const day = new Date(2026, 0, 1 + i);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    d.dayLog[key] = Array.from({ length: 8 }, (_, ai) => `${i % 8}-${ai}`);
    d.dayMeta[key] = { mood: i % 5, reflection: '오늘은 아침에 걷고 책을 조금 읽었다. 내일도 이어서 해 보자.' };
    if (day.getDay() === 1 && Object.keys(d.reviews).length < 52) d.reviews[key] = { at: key, next: ['0-0', '1-1', '2-2'], note: '이번 주는 꾸준했다. 다음 주에는 일찍 자기.' };
  }
  const a = makeArchive(migrate(d), new Date(2026, 11, 31), '가'.repeat(120));
  assert.equal(Object.keys(a.reviews).length, 52);
  const bytes = Buffer.byteLength(JSON.stringify(a), 'utf8');
  assert.ok(bytes < 120 * 1024, `${bytes} bytes`);
});

test('archiveAsDoc: 지난 표를 문서 모양으로 — 오늘 목록은 비우고 지금 설정', () => {
  const d = usedDoc();
  const a = makeArchive(d, NOW);
  const settings = { ...d.settings, mood: '다크' };
  const doc = archiveAsDoc(a, settings);
  assert.equal(doc.todayDate, '2026-12-20');
  assert.deepEqual(doc.todayKeys, []);
  assert.deepEqual(doc.todayExtra, []);
  assert.equal(doc.settings, settings);
  assert.equal(doc.themes, a.themes);
  assert.equal(doc.dayLog, a.dayLog);
  assert.equal(doc.focusMinutes, 260);
  assert.equal(doc.centerGoal, a.centerGoal);
  assert.deepEqual(migrate(doc).themes, a.themes);
});

test('archiveAccess: 모두 프로 여부 그대로', () => {
  assert.deepEqual(archiveAccess(true), { open: true, review: true, print: true, reuse: true });
  assert.deepEqual(archiveAccess(false), { open: false, review: false, print: false, reuse: false });
});

test('resetDoc: 설정과 지난 표는 남긴다', () => {
  const n = startNewChart(usedDoc(), 'continue', NOW, { goal: '', note: '', time: T });
  const r = resetDoc(n);
  assert.equal(r.settings, n.settings);
  assert.equal(r.archives, n.archives);
  assert.equal(r.onboarded, false);
  assert.deepEqual(r.dayLog, {});
  assert.equal('chartStart' in r, false);
  assert.equal('archives' in resetDoc(blankDoc()), false, '없으면 필드를 두지 않는다');
});

test('unionArchives: 지난 표 없는 백업은 지금 것을 지키고, 같은 아이디는 백업의 것', () => {
  const d = usedDoc();
  const mine = makeArchive(d, NOW, '지금');
  const old = makeArchive({ ...blankDoc(), chartStart: '2025-01-01', dayLog: {} }, new Date(2025, 11, 31));
  assert.deepEqual(unionArchives([old, mine], undefined), [old, mine]);
  assert.deepEqual(unionArchives([old, mine], []), [old, mine]);
  const theirs = { ...mine, note: '백업' };
  const u = unionArchives([mine], [theirs, old]);
  assert.deepEqual(u.map((a) => a.id), ['y20250101', 'y20260105']);
  assert.equal(u[1].note, '백업');
  assert.equal(unionArchives(undefined, undefined), undefined);
  assert.equal(unionArchives([], []), undefined);
});

test('yearClosePrompt: 12월 15일 ~ 1월 31일, 12월 1일 전부터 쓴 표, 이번에 닫지 않았을 때', () => {
  const d = usedDoc();
  const at = (y, m, day) => new Date(y, m - 1, day, 12);
  assert.equal(yearClosePrompt(d, at(2026, 12, 14)), false);
  assert.equal(yearClosePrompt(d, at(2026, 12, 15)), true);
  assert.equal(yearClosePrompt(d, at(2026, 12, 31)), true);
  assert.equal(yearClosePrompt(d, at(2027, 1, 1)), true);
  assert.equal(yearClosePrompt(d, at(2027, 1, 31)), true);
  assert.equal(yearClosePrompt(d, at(2027, 2, 1)), false);
  assert.equal(yearClosePrompt(d, at(2026, 11, 30)), false);
  // 온보딩 전
  assert.equal(yearClosePrompt({ ...d, onboarded: false }, at(2026, 12, 20)), false);
  // 12월 1일에 시작한 표는 권하고, 12월 2일에 시작한 표는 권하지 않는다
  assert.equal(yearClosePrompt({ ...d, chartStart: '2026-12-01' }, at(2026, 12, 20)), true);
  assert.equal(yearClosePrompt({ ...d, chartStart: '2026-12-02' }, at(2026, 12, 20)), false);
  // 1월에는 지난해가 닫을 해 — 1월에 새로 시작한 표는 아니다
  assert.equal(yearClosePrompt({ ...d, chartStart: '2027-01-02' }, at(2027, 1, 10)), false);
  // 이번 기간에 이미 닫았으면 그만
  const closed = startNewChart(d, 'continue', at(2026, 12, 16), { goal: '', note: '', time: T });
  assert.equal(yearClosePrompt(closed, at(2026, 12, 20)), false);
  assert.equal(yearClosePrompt(closed, at(2027, 1, 20)), false);
  // 지난해 기간에 닫은 것은 올해 권하기를 막지 않는다
  const lastYear = { ...d, archives: [{ ...makeArchive(d, NOW), id: 'y20250101', from: '2025-01-01', to: '2025-12-20' }] };
  assert.equal(yearClosePrompt(lastYear, at(2026, 12, 20)), true);
});

test('yearLabel: 한 해면 fmt.year, 해를 넘기면 fmt.yearSpan', () => {
  assert.equal(yearLabel('2026-01-05', '2026-12-20', 'ko'), '2026년');
  assert.equal(yearLabel('2026-03-01', '2027-01-10', 'ko'), '2026년 – 2027년');
  assert.equal(yearLabel('2026-03-01', '2027-01-10', 'ja'), '2026年〜2027年');
  assert.equal(yearLabel('2026-03-01', '2026-04-10', 'en'), '2026');
});

// ── 저장소 · 백업 불러오기 (소스 확인) ────────────────────────────────────────

test('저장소: 저장본은 지난 표를 빼고 쓰고, 읽을 때 지금 지난 표를 다시 붙인다', () => {
  const s = src('src/store/MandaratContext.tsx');
  assert.match(s, /AsyncStorage\.setItem\(mine, d\.archives \? JSON\.stringify\(\{ \.\.\.d, archives: undefined \}\) : json\)/);
  const read = s.slice(s.indexOf('const readSnapshot = useCallback'), s.indexOf('const getDoc = useCallback'));
  assert.match(read, /const archives = latest\.current\.archives;\s*return d && archives \? \{ \.\.\.d, archives \} : d;/);
  // 저장본 JSON 모양 — 지난 표 없이, 다시 붙이면 원래 문서
  const n = startNewChart(usedDoc(), 'continue', NOW, { goal: '', note: '', time: T });
  const snap = JSON.parse(JSON.stringify({ ...n, archives: undefined }));
  assert.equal('archives' in snap, false);
  assert.deepEqual({ ...migrate(snap), archives: n.archives }, migrate(n));
});

test('저장소: resetAll은 resetDoc, startNewChart는 먼저 계산해 null이면 false', () => {
  const s = src('src/store/MandaratContext.tsx');
  const reset = s.slice(s.indexOf('const resetAll = useCallback'), s.indexOf('const applyTemplate = useCallback'));
  assert.match(reset, /dropEditorDraft\(\);\s*update\(\(d\) => resetDoc\(d\)\)/);
  assert.doesNotMatch(reset, /blankDoc\(\)/);
  const start = s.slice(s.indexOf('const startNewChart = useCallback'), s.indexOf('const dismissRecovered = useCallback'));
  assert.match(start, /const next = nextChart\(latest\.current, mode, new Date\(\), opts\);\s*if \(!next\) return false;\s*dropEditorDraft\(\);\s*update\(\(\) => next\);\s*return true;/);
  const onboard = s.slice(s.indexOf('const completeOnboarding = useCallback'), s.indexOf('const setCenterGoal = useCallback'));
  assert.match(onboard, /chartStart: dateKey\(\), focusStart: d\.focusMinutes \?\? 0/);
  assert.match(s, /startNewChart: \(mode: NewChartMode, opts: \{ goal: string; note: string \}\) => boolean;/);
});

test('백업 불러오기: 불러온 문서의 지난 표를 지금 것과 합친다(lastBackupAt 처리는 그대로)', () => {
  const s = src('src/overlays/BackupImport.tsx');
  assert.match(s, /const imported = last \? \{ \.\.\.result\.doc, settings: \{ \.\.\.result\.doc\.settings, lastBackupAt: last \} \} : result\.doc;/);
  assert.match(s, /replaceDoc\(\{ \.\.\.imported, archives: unionArchives\(getDoc\(\)\.archives, imported\.archives\) \}\);/);
  assert.match(s, /import \{ unionArchives \} from '\.\.\/lib\/archive';/);
});
