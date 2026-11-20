// 출시 전 감사에서 나온 위젯 · 저장소 고침의 지킴이.
// 1. 위젯이 지난 칸에 머문다 — 타임라인 30칸, 지난 칸에서는 목록 대신 한 줄 · 체크를 받지 않는다(src/widgets/TodayWidget.ios.tsx)
// 2. 위젯 · Siri의 한 번 · 직접 추가한 할 일 체크가 앱을 연 날로 적힌다 — 체크한 그날로(src/lib/widgetOps.ts)
// 3. 템플릿으로 바꾸면 아직 안 한 직접 추가한 할 일까지 지운다 — 남긴다(src/store/MandaratContext.tsx applyTemplate)
// 4. 켤 때마다 바뀌지 않은 문서를 다시 쓴다 — 읽은 그대로면 쓰지 않는다(같은 파일의 저장 효과)
// 위젯 모습은 tests/helpers/widgetVm.js의 vm에서 돌린다 — 지금(now)을 따로 주어 앱을 오래 열지 않은 날을 흉내 낸다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { blankDoc, migrate, sampleThemes } = require('../src/data/defaults');
const { msg, LANGS } = require('../src/i18n');
const { widgetTimeline, WIDGET_DAYS } = require('../src/lib/widgetSnapshot');
const { planOps, checkOnceOn, checkExtraOn, STALE_DAYS } = require('../src/lib/widgetOps');
const { activeStreak, toggleCellDone } = require('../src/lib/history');
const { rolloverToday, todayProgress, ymd } = require('../src/lib/routine');
const { openStored } = require('../src/lib/syncEnvelope');
const { serializeStored } = require('../src/lib/syncCommitBase');
const { newSyncMeta } = require('../src/lib/syncMeta');
const webCommit = require('../src/lib/syncCommit');
const { extractLayout, widgetRuntime, walk } = require('./helpers/widgetVm');

const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const rt = widgetRuntime(extractLayout());
const FAMILIES = ['systemSmall', 'systemMedium', 'systemLarge', 'accessoryInline', 'accessoryCircular', 'accessoryRectangular'];

const texts = (node) => { const out = []; walk(node, (n) => { if (n.type === 'TextView' && n.props.text) out.push(n.props.text); }); return out; };
const buttons = (node) => { const out = []; walk(node, (n) => { if (n.type === 'Button') out.push(n.props.target); }); return out; };
/** 수정자 하나의 인자(없으면 null) — vm 안에서 만든 값은 원형(prototype)이 달라 JSON으로 옮겨 견준다 */
const modArgs = (n, type) => { const m = (n.props.modifiers || []).find((x) => x.$type === type); return m ? JSON.parse(JSON.stringify(m.args)) : null; };
const said = (node) => { const out = []; walk(node, (n) => { const a = modArgs(n, 'accessibilityLabel'); if (a) out.push(a[0]); }); return out; };

// ── 2. 위젯 · Siri 체크는 체크한 그날의 기록으로 ─────────────────────────────────

/** 목요일 23:10에 위젯에서 한 번 하나 · 직접 추가한 할 일 하나를 체크하고, 금요일 08:00에 앱을 연다 */
function thursdayNight(extra = {}) {
  const d = blankDoc();
  d.themes[0].actions[0] = { text: 'Send the tax form', note: '', done: false, kind: 'once', due: '2026-11-20' };
  d.themes[0].actions[1] = { text: 'Call the bank', note: '', done: false, kind: 'once' };
  const doc = {
    ...d, onboarded: true, todayDate: '2026-11-19', dayLog: { '2026-11-18': ['1-1'] },
    todayExtra: [{ id: 'e1', ti: 1, text: 'Buy stamps', done: false }], ...extra,
  };
  const at = new Date(2026, 10, 19, 23, 10).getTime();
  const op = (k, o = {}) => ({ kind: 'check', k, on: true, day: '2026-11-19', at, t: '', src: 'widget', ...o });
  return { doc, op, fri: new Date(2026, 10, 20, 8) };
}
/** 손잡이(WidgetSync.run)가 저장소에 시키는 일을 순수하게 — 저장소의 checkOnceOn · checkExtraOn은 이 두 함수를 dateKey()와 함께 부른다 */
function runCommands(doc, cmds, todayKey) {
  let d = doc;
  for (const c of cmds) {
    if (c.kind === 'checkOnceOn') d = checkOnceOn(d, c.ti, c.ai, c.day, todayKey);
    else if (c.kind === 'checkExtraOn') d = checkExtraOn(d, c.id, c.day, todayKey);
    else if (c.kind === 'checkToday') d = toggleCellDone(d, c.ti, c.ai, todayKey);
    else assert.fail(`unexpected ${c.kind}`);
  }
  return d;
}

test('위젯 2: 목요일 밤의 체크는 금요일에 앱을 열어도 목요일의 기록 — 금요일은 비어 있고 연속 기록이 이어진다', () => {
  const { doc, op, fri } = thursdayNight();
  const ops = [op('0-0'), op('x:e1', { at: op('x').at + 1 })];
  const opened = rolloverToday(doc, '2026-11-20'); // 저장소: 앱을 열면 하루 정리가 먼저 돈다
  const cmds = planOps(ops, opened, fri);
  assert.deepEqual(cmds, [
    { kind: 'checkOnceOn', ti: 0, ai: 0, day: '2026-11-19' },
    { kind: 'checkExtraOn', id: 'e1', day: '2026-11-19' },
  ]);
  const after = runCommands(opened, cmds, '2026-11-20');
  // 전에는 {"2026-11-18":[…],"2026-11-20":["0-0","1-xe1"]} — 목요일은 빈 날, 금요일 08:00에 2/2
  assert.deepEqual(after.dayLog, { '2026-11-18': ['1-1'], '2026-11-19': ['0-0', '1-xe1'] });
  assert.equal(after.themes[0].actions[0].done, true);
  assert.deepEqual(after.todayExtra, [], '끝낸 할 일은 날을 넘기며 목록에서 빠진다(하루 정리와 같게)');
  assert.deepEqual(todayProgress(after, fri), { done: 0, total: 0 }, '금요일 아침에 다 한 것으로 보이지 않는다');
  assert.equal(activeStreak(after.dayLog, fri), 2, '수 · 목 이틀 — 목요일이 구멍이 되지 않는다');
  // 다시 읽어도(쓰기 전에 늘 읽는다) 아무것도
  assert.deepEqual(planOps(ops, after, fri), []);
  assert.deepEqual(planOps([...ops, ...ops], after, fri), []);
});

test('위젯 2: 직접 담아 둔 한 번은 오늘 목록에서도 빠진다 — 남으면 금요일에 한 것으로 센다', () => {
  const { doc, op, fri } = thursdayNight({ todayKeys: ['0-1'] });
  const opened = rolloverToday(doc, '2026-11-20');
  assert.deepEqual(opened.todayKeys, ['0-1'], '아직 안 한 한 번은 날을 넘어 남아 있다');
  const cmds = planOps([op('0-1')], opened, fri);
  assert.deepEqual(cmds, [{ kind: 'checkOnceOn', ti: 0, ai: 1, day: '2026-11-19' }]);
  const after = runCommands(opened, cmds, '2026-11-20');
  assert.deepEqual(after.todayKeys, []);
  assert.deepEqual(after.dayLog['2026-11-19'], ['0-1']);
  assert.equal(after.dayLog['2026-11-20'], undefined);
  const p = todayProgress(after, fri);
  assert.equal(p.done, 0);
  // 같은 날(오늘) 체크는 목록의 체크 그대로 — 한 것으로 목록에 남는다
  const same = checkOnceOn(opened, 0, 1, '2026-11-20', '2026-11-20');
  assert.deepEqual(same.todayKeys, ['0-1']);
  assert.deepEqual(same.dayLog['2026-11-20'], ['0-1']);
  const sameX = checkExtraOn(opened, 'e1', '2026-11-20', '2026-11-20');
  assert.deepEqual(sameX.todayExtra, [{ id: 'e1', ti: 1, text: 'Buy stamps', done: true }]);
  assert.deepEqual(sameX.dayLog['2026-11-20'], ['1-xe1']);
});

test('위젯 2: 목요일에 켜고 금요일에 또 켠 것은 목요일에 한 것 — 위젯의 다음 날 칸은 어제 켠 한 번을 다시 안 한 것으로 그린다', () => {
  const { doc, op } = thursdayNight();
  const sat = new Date(2026, 10, 21, 9);
  const opened = rolloverToday(doc, '2026-11-21');
  const again = (k) => [op(k), op(k, { day: '2026-11-20', at: new Date(2026, 10, 20, 7).getTime() })];
  assert.deepEqual(planOps([...again('0-0'), ...again('x:e1')], opened, sat), [
    { kind: 'checkOnceOn', ti: 0, ai: 0, day: '2026-11-19' },
    { kind: 'checkExtraOn', id: 'e1', day: '2026-11-19' },
  ]);
  // 금요일에 앱을 열었을 때도(오늘의 op가 가장 늦다) 한 날은 목요일
  assert.deepEqual(planOps(again('0-0'), rolloverToday(doc, '2026-11-20'), new Date(2026, 10, 20, 8)), [{ kind: 'checkOnceOn', ti: 0, ai: 0, day: '2026-11-19' }]);
  // 목요일에 껐다가 금요일에 켠 것은 금요일에 한 것
  const off = op('0-0', { on: false, at: op('x').at + 5 });
  assert.deepEqual(planOps([op('0-0'), off, op('0-0', { day: '2026-11-20', at: off.at + 9 })], rolloverToday(doc, '2026-11-20'), new Date(2026, 10, 20, 8)), [{ kind: 'checkToday', ti: 0, ai: 0 }]);
});

test('위젯 2: 지난 날의 끔은 달성을 남겼던 날의 기록을 뺀다 · 바꿀 것이 없으면 같은 문서', () => {
  const { doc, op, fri } = thursdayNight();
  // 수요일에 앱에서 달성한 한 번을 목요일 밤 위젯에서 풀었다
  const done = toggleCellDone(doc, 0, 0, '2026-11-18');
  assert.deepEqual(done.dayLog['2026-11-18'], ['1-1', '0-0']);
  const opened = rolloverToday(done, '2026-11-20');
  const cmds = planOps([op('0-0', { on: false })], opened, fri);
  assert.deepEqual(cmds, [{ kind: 'checkToday', ti: 0, ai: 0 }]);
  const after = runCommands(opened, cmds, '2026-11-20');
  assert.equal(after.themes[0].actions[0].done, false);
  assert.deepEqual(after.dayLog, { '2026-11-18': ['1-1'] });
  // 이미 달성 · 한 번이 아닌 칸 · 빈 칸 · 앞날 · 날짜가 아닌 것 → 그대로(같은 객체)
  assert.equal(checkOnceOn(done, 0, 0, '2026-11-19', '2026-11-20'), done);
  const habit = { ...doc, themes: doc.themes.map((t, i) => (i === 0 ? { ...t, actions: t.actions.map((a, j) => (j === 0 ? { ...a, kind: 'habit', days: [1] } : a)) } : t)) };
  assert.equal(checkOnceOn(habit, 0, 0, '2026-11-19', '2026-11-20'), habit);
  assert.equal(checkOnceOn(doc, 5, 5, '2026-11-19', '2026-11-20'), doc);
  assert.equal(checkOnceOn(doc, 0, 0, '2026-11-21', '2026-11-20'), doc);
  assert.equal(checkOnceOn(doc, 0, 0, 'yesterday', '2026-11-20'), doc);
  // 없는 할 일 · 이미 끝낸 것 · 앞날
  assert.equal(checkExtraOn(doc, 'gone', '2026-11-19', '2026-11-20'), doc);
  const finished = { ...doc, todayExtra: [{ id: 'e1', ti: 1, text: 'Buy stamps', done: true }] };
  assert.equal(checkExtraOn(finished, 'e1', '2026-11-19', '2026-11-20'), finished);
  assert.equal(checkExtraOn(doc, 'e1', '2026-11-21', '2026-11-20'), doc);
});

test('위젯 2: 저장소 · 손잡이 — checkOnceOn · checkExtraOn은 그날(day)과 오늘(dateKey())을 넘겨 그 두 함수를 부른다', () => {
  const s = src('src/store/MandaratContext.tsx');
  assert.match(s, /import \{ checkExtraOn as extraOn, checkOnceOn as onceOn \} from '\.\.\/lib\/widgetOps';/);
  assert.match(s, /checkOnceOn: \(ti: number, ai: number, day: string\) => void;/);
  assert.match(s, /checkExtraOn: \(id: string, day: string\) => void;/);
  assert.match(s, /const checkOnceOn = useCallback\(\s*\(ti: number, ai: number, day: string\) => update\(\(d\) => onceOn\(d, ti, ai, day, dateKey\(\)\)\),/);
  assert.match(s, /const checkExtraOn = useCallback\(\s*\(id: string, day: string\) => update\(\(d\) => extraOn\(d, id, day, dateKey\(\)\)\),/);
  assert.equal((s.match(/^\s*checkOnceOn, checkExtraOn,$/gm) || []).length, 2, '함수 묶음과 그 의존성 목록');
  const host = src('src/hosts/WidgetSync.tsx');
  assert.match(host, /cmd\.kind === 'checkOnceOn'\) actions\.checkOnceOn\(cmd\.ti, cmd\.ai, cmd\.day\)/);
  assert.match(host, /cmd\.kind === 'checkExtraOn'\) actions\.checkExtraOn\(cmd\.id, cmd\.day\)/);
  // 손잡이는 planOps가 내는 모든 명령을 안다 — 모르는 것은 마지막 else(오늘 열기)로 떨어진다
  const kinds = [...src('src/lib/widgetOps.ts').matchAll(/^\s*\| \{ kind: '(\w+)'/gm)].map((m) => m[1]);
  assert.deepEqual(kinds, ['checkToday', 'toggleHabitOn', 'addCountOn', 'checkOnceOn', 'toggleExtra', 'checkExtraOn', 'focus', 'open']);
  for (const k of kinds.filter((x) => x !== 'open')) assert.ok(host.includes(`cmd.kind === '${k}'`), k);
});

// ── 3. 템플릿으로 바꿔도 아직 안 한 직접 추가한 할 일은 남는다 ─────────────────────

test('저장소 3: 템플릿으로 바꾸기는 아직 안 한 직접 추가한 할 일을 남긴다 — 예시로 채우기 · 새 표와 같게', () => {
  const s = src('src/store/MandaratContext.tsx');
  const tpl = s.slice(s.indexOf('const applyTemplate = useCallback('), s.indexOf('const replaceDoc = useCallback('));
  assert.match(tpl, /todayKeys: \[\],\s*todayExtra: d\.todayExtra\.filter\(\(x\) => !x\.done\),\s*dayLog: archiveAllCells\(d\.dayLog, Date\.now\(\)\),/);
  assert.doesNotMatch(s, /todayExtra: \[\]/, '저장소는 직접 추가한 할 일을 통째로 비우지 않는다');
  // 새 표(archive.startNewChart)와 같은 식 · 예시로 채우기는 목록을 건드리지 않는다
  assert.match(src('src/lib/archive.ts'), /todayExtra: doc\.todayExtra\.filter\(\(x\) => !x\.done\),/);
  const sample = s.slice(s.indexOf('const loadSample = useCallback('), s.indexOf('const resetUndo = useRef'));
  assert.doesNotMatch(sample, /todayExtra/);
  // 그 식이 하는 일
  const d = { ...blankDoc(), todayDate: '2026-11-20', todayExtra: [{ id: 'a', ti: 0, text: '우체국', done: false }, { id: 'b', ti: 3, text: '전화', done: true }, { id: 'c', ti: 7, text: '장보기', done: false }] };
  assert.deepEqual(d.todayExtra.filter((x) => !x.done).map((x) => x.id), ['a', 'c']);
  // 되돌리기는 바꾸기 전 문서를 통째로 넣는다(replaceDoc → 같은 날이면 하루 정리는 그대로 돌려준다) — 끝낸 할 일까지 그대로 돌아온다
  assert.equal(rolloverToday(d, '2026-11-20'), d);
  assert.match(src('src/screens/Settings.tsx'), /const snapshot = d; \/\/ 되돌리기용[\s\S]{0,260}applyTemplate\([\s\S]{0,120}offerUndo\(st\.templateDone\(\{ name: t\.name \}\), snapshot\);/);
  assert.match(s, /const replaceDoc = useCallback\(\(d: MandaratDoc\) => \{\s*dropEditorDraft\(\);\s*revRef\.current \+= 1;\s*commit\(rolloverToday\(d, dateKey\(\)\)\);/);
});

// ── 4. 켤 때 읽은 그대로면 다시 쓰지 않는다 ─────────────────────────────────────

/** 앱이 쓰던 문서 — 오늘 몇 가지를 한 뒤 저장된 모습 */
function usedDoc(todayKey) {
  let d = migrate({ ...blankDoc(), onboarded: true, centerGoal: '단단한 한 해', themes: sampleThemes(new Date(2026, 10, 20), 'ko') });
  d = rolloverToday(d, todayKey);
  d = toggleCellDone(d, 0, 0, todayKey);
  return { ...d, todayKeys: ['0-2'], todayExtra: [{ id: 'e1', ti: 1, text: '우체국', done: true }, { id: 'e2', ti: 2, text: '전화', done: false }], dayMeta: { [todayKey]: { mood: 3, reflection: '괜찮은 하루' } } };
}

test('저장소 4: 읽은 값과 다시 쓸 값이 글자까지 같으면 켤 때 쓰지 않는다 — 날이 넘어갔거나 메타가 새로 생기면 쓴다', () => {
  const TK = '2026-11-20';
  const wall = new Date(2026, 10, 20, 9).getTime();
  for (const [name, makeMeta, open] of [['ios', () => newSyncMeta(Math.random), openStored], ['web', null, webCommit.openStored]]) {
    // 한 번 열어 저장한 값(앱이 실제로 쓰는 모양)
    const first = open(serializeStored(usedDoc(TK), makeMeta ? makeMeta() : null), TK, wall, makeMeta);
    const stored = serializeStored(first.doc, first.meta);
    // 같은 날 다시 켠다 — 저장소가 견주는 그대로: serializeStored(읽은 문서, 읽은 메타) === 읽은 값
    const again = open(stored, TK, wall + 60_000, makeMeta);
    assert.equal(serializeStored(again.doc, again.meta), stored, `${name}: 바뀐 것이 없으면 같은 글자 → 쓰지 않는다`);
    // 다음 날 켠다 — 하루 정리(끝낸 할 일 빼기 · 날짜)가 바꿨으니 쓴다
    const next = open(stored, '2026-11-21', wall + 86_400_000, makeMeta);
    assert.notEqual(serializeStored(next.doc, next.meta), stored, `${name}: 날이 넘어가면 쓴다`);
    assert.deepEqual(next.doc.todayExtra.map((x) => x.id), ['e2']);
    // 옛 모양(정리가 고치는 값)이면 쓴다
    const legacy = JSON.stringify({ ...JSON.parse(stored), todayKeys: ['0-2', '0-2', '9-9'] });
    const fixed = open(legacy, TK, wall, makeMeta);
    assert.notEqual(serializeStored(fixed.doc, fixed.meta), legacy, `${name}: 정리로 바뀌면 쓴다`);
  }
  // iOS: 저장본에 메타가 없으면(처음 맞추기를 넣은 판) 새 메타를 써야 한다 — 기기 번호가 켤 때마다 바뀌지 않게
  const bare = serializeStored(usedDoc(TK), null);
  const withMeta = openStored(bare, TK, wall, () => newSyncMeta(Math.random));
  assert.ok(withMeta.meta);
  assert.notEqual(serializeStored(withMeta.doc, withMeta.meta), bare);
});

test('저장소 4: 저장 효과 — 켤 때 한 번만 건너뛰고, 하루 저장본은 같은 때(300ms 뒤)에 그대로 챙긴다', () => {
  const s = src('src/store/MandaratContext.tsx');
  // 읽은 뒤: persist가 쓸 짝(latest · metaRef)을 읽은 값과 견준다. 저장본이 없던 첫 실행(loaded === null)은 늘 쓴다
  const load = s.slice(s.indexOf('// load once'), s.indexOf('// debounced persist'));
  assert.match(load, /if \(loaded\) commit\(loaded\.doc, 'none'\);\s*\/\/[^\n]*\n\s*launchSame\.current = loaded !== null && read\.ok && serializeStored\(latest\.current, metaRef\.current\) === read\.raw;/);
  assert.ok(load.indexOf('launchSame.current =') < load.indexOf('setReady(true)'), '준비됐다고 알리기 전에 정한다');
  const effect = s.slice(s.indexOf('// debounced persist'), s.indexOf('// 내려갈 때(오류 화면 등)'));
  // 건너뛰는 것은 한 번 — 그 뒤(문서 · 메타가 바뀌면)는 보통 저장. 되돌리기로 읽은 문서와 같은 객체가 돌아와도 쓴다
  assert.match(effect, /if \(!ready \|\| blockSave\.current\) return;\s*(\/\/[^\n]*\n\s*)*if \(launchSame\.current\) \{\s*launchSame\.current = false;\s*const snap = setTimeout\(\(\) => snapshot\(latest\.current\), 300\);\s*return \(\) => clearTimeout\(snap\);\s*\}\s*if \(saveTimer\.current\) clearTimeout\(saveTimer\.current\);\s*pendingSave\.current = true;/);
  assert.match(effect, /\}, \[doc, saveTick, ready, persist, snapshot\]\);/);
  assert.equal((s.match(/launchSame\.current = /g) || []).length, 2, '읽을 때 정하고, 효과가 한 번 내린다');
  // 하루 저장본은 예전처럼 저장 뒤에도 남긴다(그날 처음 한 번 — snapshot이 날을 기억한다)
  assert.match(s, /setSaveFailed\(false\);\s*snapshot\(d\);/);
  assert.match(s, /const snapshot = useCallback\(\(d: MandaratDoc\) => \{\s*const day = dateKey\(\);\s*if \(!d\.onboarded \|\| snapDay\.current === day\) return;/);
  // 위젯 타임라인 · 맞추기는 이 저장에 기대지 않는다: 위젯은 처음 한 번 늘 쓰고(lastSig가 null), 메타만 바뀌면 saveTick이 저장을 부른다
  assert.match(src('src/hosts/WidgetSync.tsx'), /const lastSig = useRef<string \| null>\(null\);/);
  assert.match(s, /setMeta: \(m\) => \{\s*metaRef\.current = m;\s*setSaveTick\(\(t\) => t \+ 1\);/);
});
