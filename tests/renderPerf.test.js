require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { sameProps, sameIgnoringHandlers } = require('../src/lib/sameProps');

const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

// ── memo 비교 함수 ─────────────────────────────────────────────────────────────

test('sameProps — 같은 값, 배열은 칸마다, 객체는 한 겹 아래까지 값으로', () => {
  const fn = () => {};
  assert.equal(sameProps({ a: 1, s: 'x', f: fn }, { a: 1, s: 'x', f: fn }), true);
  assert.equal(sameProps({ a: 1 }, { a: 2 }), false);
  assert.equal(sameProps({ states: ['done', 'off'] }, { states: ['done', 'off'] }), true);
  assert.equal(sameProps({ states: ['done', 'off'] }, { states: ['done', 'today'] }), false);
  assert.equal(sameProps({ states: ['done'] }, { states: ['done', 'off'] }), false);
  assert.equal(sameProps({ line: { short: '월·수', alert: false } }, { line: { short: '월·수', alert: false } }), true);
  assert.equal(sameProps({ line: { short: '월·수' } }, { line: { short: '화·목' } }), false);
  assert.equal(sameProps({ line: { short: '월·수' } }, { line: null }), false);
  assert.equal(sameProps({ v: NaN }, { v: NaN }), true);
});

test('sameProps — 두 겹 아래는 같은 것이어야 같다(깊이 비교하지 않는다)', () => {
  assert.equal(sameProps({ o: { inner: { a: 1 } } }, { o: { inner: { a: 1 } } }), false);
  const inner = { a: 1 };
  assert.equal(sameProps({ o: { inner } }, { o: { inner } }), true);
});

test('sameProps — 칸 수가 다르거나 이름이 다르면 다르다', () => {
  assert.equal(sameProps({ a: 1 }, { a: 1, b: undefined }), false);
  assert.equal(sameProps({ a: 1, b: undefined }, { a: 1, c: undefined }), false);
});

test('sameProps — 함수는 같은 것이어야 같다, sameIgnoringHandlers는 둘 다 함수면 같다', () => {
  assert.equal(sameProps({ f: () => 1 }, { f: () => 1 }), false);
  assert.equal(sameIgnoringHandlers({ f: () => 1, a: 1 }, { f: () => 2, a: 1 }), true);
  assert.equal(sameIgnoringHandlers({ f: () => 1 }, { f: undefined }), false);
  assert.equal(sameIgnoringHandlers({ f: () => 1, a: 1 }, { f: () => 1, a: 2 }), false);
});

// ── 문서 · 화면 상태를 나눠 읽는다 ─────────────────────────────────────────────

const OWNED = [
  'src/navigation/Root.tsx', 'src/components/TodayRow.tsx', 'src/lib/useTodayCheck.ts', 'src/screens/Dashboard.tsx',
  'src/screens/Today.tsx', 'src/screens/TodayModes.tsx', 'src/screens/FullGrid.tsx', 'src/screens/Detail.tsx', 'src/screens/Stats.tsx',
];

test('화면·줄은 예전 한꺼번에 읽기(useMandarat · useUI) 대신 나눠 읽는다', () => {
  for (const f of OWNED) {
    const s = src(f);
    assert.doesNotMatch(s, /\buseMandarat\(\)/, `${f} reads the whole store`);
    assert.doesNotMatch(s, /\buseUI\(\)/, `${f} reads the whole UI context`);
  }
});

test('저장소는 문서 · 함수 · 팔레트를 따로 내보내고, 예전 모양(useMandarat)도 남긴다', () => {
  const s = src('src/store/MandaratContext.tsx');
  for (const name of ['useDoc', 'useActions', 'useMandarat', 'usePaletteValue']) {
    assert.match(s, new RegExp(`export function ${name}\\(`), name);
  }
  // 문서에 따라 바뀌던 inToday는 함수 묶음에 없다(예전 모양에서만 문서로 만든다)
  const actions = s.slice(s.indexOf('export interface Actions'), s.indexOf('export interface Ctx'));
  assert.doesNotMatch(actions, /inToday:/);
  assert.match(actions, /getDoc: \(\) => MandaratDoc/);
});

test('화면 상태는 상태 · 함수 · 토스트로 나뉘고, 공유 시트(share)도 그대로 있다', () => {
  const s = src('src/navigation/ui.tsx');
  for (const name of ['useUIState', 'useUIActions', 'useToast', 'useUI']) {
    assert.match(s, new RegExp(`export function ${name}\\(`), name);
  }
  const state = s.slice(s.indexOf('export interface UIState'), s.indexOf('export interface UIActions'));
  const actions = s.slice(s.indexOf('export interface UIActions'), s.indexOf('export interface UICtx'));
  assert.match(state, /\bshare: boolean/);
  assert.match(actions, /\bopenShare: \(\) => void/);
  assert.match(actions, /\bcloseShare: \(\) => void/);
  assert.doesNotMatch(state, /\btoast\b/);
});

test('화면은 memo로 감싸 Root가 다시 그려져도 그대로 둔다', () => {
  for (const [f, name] of [
    ['src/screens/Dashboard.tsx', 'Dashboard'], ['src/screens/Today.tsx', 'Today'], ['src/screens/Stats.tsx', 'Stats'],
    ['src/screens/Detail.tsx', 'Detail'], ['src/screens/FullGrid.tsx', 'FullGrid'], ['src/components/TodayRow.tsx', 'TodayRow'],
  ]) {
    assert.match(src(f), new RegExp(`export const ${name} = memo\\(function ${name}\\(`), f);
  }
});

test('탭 바꾸기 촉감은 고르기(select)', () => {
  const s = src('src/navigation/Root.tsx');
  const onTab = s.slice(s.indexOf('const onTab = useCallback'), s.indexOf('const onAdd = useCallback'));
  assert.match(onTab, /\bselect\(\)/);
  assert.doesNotMatch(onTab, /\btap\(\)/);
});

test('하루를 마감하면 문서에도 남긴다(markClosedDay) — 홈의 지난 날 칸이 읽는다', () => {
  assert.match(src('src/navigation/Root.tsx'), /ui\.markDayClosed\(today\);[\s\S]{0,120}markClosedDay\(today\)/);
  assert.match(src('src/screens/Dashboard.tsx'), /closedDays\?\.includes\(d\.date\)/);
});

// ── 앞 단계에서 넘겨받은 일 ───────────────────────────────────────────────────

test('마무리 페이지는 64칸(bloom) 하나 — 하루 마감(today) 갈래가 없다', () => {
  assert.match(src('src/navigation/ui.tsx'), /export type CelebrateKind = 'bloom';/);
  assert.match(src('src/navigation/ui.tsx'), /fireCelebrate = useCallback\(\(kind: CelebrateKind = 'bloom'\)/);
  assert.doesNotMatch(src('src/overlays/Celebration.tsx'), /'today'/);
});

test('되돌리기 토스트는 보이는 시간을 넘길 수 있고, 백업 불러오기는 그것을 쓴다', () => {
  assert.match(src('src/store/useSnapshotUndo.ts'), /\(message: string, snapshot: MandaratDoc, opts\?: ToastOptions\)/);
  assert.match(src('src/store/useSnapshotUndo.ts'), /\}, opts\);/);
  const backup = src('src/overlays/BackupImport.tsx');
  assert.match(backup, /offerUndo\('백업을 불러왔어요', snapshot, \{ duration: UNDO_MS \}\)/);
  assert.match(backup, /const UNDO_MS = 10000;/);
  assert.doesNotMatch(backup, /revision\(\)/);
});
