// 오류가 났을 때의 길 — 화면 하나 · 시트 하나의 경계(ScreenBoundary · OverlayBoundary), 마지막 그물(ErrorBoundary)의 나가는 길,
// 저장본으로 열기 넘겨주기(src/lib/crashRecover.ts · src/store/useCrashRecovery.ts). 그리고 오류 기록이 기기 밖으로 나가는 길을 센다.
// React 트리를 그리지는 않는다 — 기기 모듈을 가짜로 바꿔 클래스를 불러와(tests/helpers/loadTsx) 정적 함수 · 메서드 · render()의 요소를 직접 본다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const L = require('../src/lib/crashLog');
const R = require('../src/lib/crashRecover');
const { setLang, msg } = require('../src/i18n');
const { fmtDateLong } = require('../src/lib/text');
const { loadTsx, findElements } = require('./helpers/loadTsx');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
/** 주석을 뺀 소스 */
const code = (f) => src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const tick = () => new Promise((r) => setImmediate(r));

// ── 가짜 기기 ─────────────────────────────────────────────────────────────────

const device = {
  os: 'ios',
  keys: ['mandarat:doc:v1', 'mandarat:lang:v1', 'mandarat:snap:2026-11-18', 'mandarat:snap:2026-11-19', 'mandarat:snap:2026-11-17', 'mandarat:snap:bogus'],
  alerts: [],
  copied: [],
  copyThrows: false,
};
const stubs = {
  'react-native': {
    Alert: { alert: (title, message, buttons) => device.alerts.push({ title, message, buttons }) },
    Appearance: { getColorScheme: () => 'light' },
    Clipboard: { setString: (t) => { if (device.copyThrows) throw new Error('no clipboard'); device.copied.push(t); } },
    Platform: { get OS() { return device.os; } },
    Pressable: 'Pressable',
    Share: { share: async () => ({}) },
    View: 'View',
  },
  '@react-native-async-storage/async-storage': { __esModule: true, default: { getItem: async () => null, getAllKeys: async () => device.keys } },
  'expo-file-system': { File: class {}, Paths: {} },
  './AppText': { Text: 'Text' },
  './GridMark': { GridMark: 'GridMark' },
  './Splash': { releaseNativeSplash: () => {} },
};
const { ErrorBoundary, ScreenBoundary, OverlayBoundary } = loadTsx('src/components/ErrorBoundary.tsx', stubs);

/** 그리지 않고 세운다 — setState는 곧바로 합친다 */
function mount(Cls, props) {
  const b = new Cls(props);
  b.setState = (patch) => { b.state = { ...b.state, ...patch }; };
  return b;
}
/** 아래에서 오류가 난 것처럼 — React가 하는 순서대로(getDerivedStateFromError → componentDidCatch) */
function fail(b, error = new TypeError("Cannot read property 'actions' of undefined"), componentStack = '\n    at Dashboard\n    at RootView') {
  b.setState(b.constructor.getDerivedStateFromError(error));
  const warn = console.warn;
  console.warn = () => {};
  try {
    b.componentDidCatch(error, { componentStack });
  } finally {
    console.warn = warn;
  }
}
/** 새 props로 다시 그린 것처럼(getDerivedStateFromProps) */
function update(b, props) {
  b.props = { ...b.props, ...props };
  const patch = b.constructor.getDerivedStateFromProps(b.props, b.state);
  if (patch) b.setState(patch);
}
const exits = (b) => findElements(b.render(), (el) => typeof el.type === 'function' && el.type.name === 'Exit').map((el) => el.props.label);

// ── 넘겨주기 · 세기(순수) ──────────────────────────────────────────────────────

test('failStreak: 다시 시도한 뒤 1분 안에 또 멈추면 잇달아 난 것', () => {
  assert.equal(R.STREAK_WINDOW_MS, 60_000);
  assert.equal(R.failStreak(0, 0, 1_000_000), 1, '처음');
  assert.equal(R.failStreak(1, 1_000_000, 1_000_050), 2, '다시 시도하자마자 또');
  assert.equal(R.failStreak(2, 1_000_000, 1_060_000), 3, '꼭 1분');
  assert.equal(R.failStreak(2, 1_000_000, 1_060_001), 1, '한참 잘 돌다 멈춘 것은 처음부터');
  assert.equal(R.failStreak(5, 0, 10), 1, '다시 시도를 누른 적이 없으면 처음');
});

test('snapDays · pickSnapDay: 저장본이 있는 날을 새것부터, 열어 보지 않은 것 가운데 가장 새것', () => {
  assert.deepEqual(R.snapDays(device.keys), ['2026-11-19', '2026-11-18', '2026-11-17']);
  assert.deepEqual(R.snapDays(['mandarat:doc:v1', 'mandarat:snap:', 'mandarat:snap:2026-1-1', 'x:mandarat:snap:2026-11-19']), []);
  const days = R.snapDays(device.keys);
  assert.equal(R.pickSnapDay(days, new Set()), '2026-11-19');
  assert.equal(R.pickSnapDay(days, new Set(['2026-11-19'])), '2026-11-18');
  assert.equal(R.pickSnapDay(days, new Set(days)), null);
  assert.equal(R.pickSnapDay([], new Set()), null);
  // 저장소(MandaratContext)의 열쇠와 같은 앞머리
  const store = src('src/store/MandaratContext.tsx');
  assert.match(store, new RegExp(`const SNAP_PREFIX = '${R.SNAP_PREFIX}';`));
  assert.match(store, /const mine = `\$\{SNAP_PREFIX\}\$\{day\}`;/);
});

test('넘겨주기: 열 날을 적어 두고, 바꾸기 전 문서는 처음 것 하나만 맡는다', () => {
  assert.equal(R.pendingSnapOpen(), null);
  R.requestSnapOpen('not-a-day');
  assert.equal(R.pendingSnapOpen(), null);
  R.requestSnapOpen('2026-01-05');
  assert.equal(R.pendingSnapOpen(), '2026-01-05');
  assert.ok(R.triedSnapDays().has('2026-01-05'));
  R.clearSnapOpen();
  assert.equal(R.pendingSnapOpen(), null);
  assert.ok(R.triedSnapDays().has('2026-01-05'), '열어 본 날은 이번 실행 내내 기억한다');
  // 저장본을 잇달아 열었으면 되돌리기는 맨 처음(오류가 나기 전의 내 기록)으로
  const mine = { centerGoal: 'mine' };
  R.keepSnapUndo('2026-01-05', mine);
  R.keepSnapUndo('2026-01-04', { centerGoal: 'older copy' });
  const u = R.takeSnapUndo();
  assert.equal(u.day, '2026-01-04');
  assert.equal(u.doc, mine);
  assert.equal(R.takeSnapUndo(), null, '한 번만');
});

// ── 마지막 그물(ErrorBoundary) ─────────────────────────────────────────────────

test('오류 화면: 처음에는 다시 시도 · 기록 내보내기뿐, 다시 시도한 뒤 또 멈추면 저장본으로 열기 · 오류 내용 복사가 더 보인다', async () => {
  setLang('ko');
  L.resetLogForTest();
  device.os = 'ios';
  const c = msg('ko').core;
  const b = mount(ErrorBoundary, { children: 'app' });
  assert.equal(b.render(), 'app');

  fail(b);
  await tick();
  assert.equal(b.state.streak, 1);
  assert.deepEqual(exits(b), [c.crashExport]);
  const retry = findElements(b.render(), (el) => el.props.accessibilityLabel === msg('ko').common.retry)[0];
  assert.equal(retry.props.onPress, b.reset);

  b.reset();
  assert.equal(b.render(), 'app', '다시 시도하면 아래를 다시 그린다');
  fail(b);
  await tick();
  assert.equal(b.state.streak, 2);
  assert.equal(b.state.snapDay, '2026-11-19', '가장 새 저장본');
  assert.deepEqual(exits(b), [c.crashExport, c.crashOpenSnap({ date: fmtDateLong('2026-11-19') }), c.crashCopyLog]);
  assert.equal(c.crashOpenSnap({ date: fmtDateLong('2026-11-19') }), '11월 19일 목요일 저장본으로 열기');

  // 오류 내용 복사 — 이 기기에 남은 기록 그대로
  b.copyLog();
  assert.equal(device.copied.length, 1);
  assert.equal(device.copied[0], L.logText());
  assert.match(device.copied[0], /render[^\n]*\nTypeError: Cannot read property 'actions' of undefined\n[\s\S]*in Dashboard < RootView/);
  assert.deepEqual(b.state.exportNote, { text: c.crashCopied, alert: false });
  device.copyThrows = true;
  b.copyLog();
  assert.deepEqual(b.state.exportNote, { text: c.crashCopyFailed, alert: true });
  device.copyThrows = false;
});

test('오류 화면: 저장본으로 열기 — 설정 › 저장본과 같은 물음으로 묻고, 열 날을 적어 둔 뒤 다시 띄운다. 또 멈추면 그다음 저장본', async () => {
  setLang('ko');
  device.os = 'ios';
  device.alerts.length = 0;
  const st = msg('ko').settings;
  const b = mount(ErrorBoundary, { children: 'app' });
  fail(b);
  b.reset();
  fail(b);
  await tick();
  const first = b.state.snapDay;
  assert.ok(first && !R.triedSnapDays().has(first));

  b.openSnapshot();
  assert.equal(device.alerts.length, 1);
  const a = device.alerts[0];
  assert.deepEqual([a.title, a.message], [st.snapAskTitle, st.snapAskBody]);
  assert.deepEqual(a.buttons.map((x) => [x.text, x.style]), [[msg('ko').common.cancel, 'cancel'], [st.snapAskOk, 'destructive']]);
  // 취소하면 아무 일도 없다
  assert.equal(R.pendingSnapOpen(), null);
  assert.ok(b.state.error);
  // 고르면: 열 날을 적고 다시 띄운다(바꾸는 일은 다시 뜬 저장소가 한다)
  a.buttons[1].onPress();
  assert.equal(R.pendingSnapOpen(), first);
  assert.equal(b.state.error, null);
  assert.equal(b.state.snapDay, null);
  assert.equal(b.render(), 'app');

  // 그 저장본으로도 또 멈추면 그다음으로 오래된 것을 권한다 — 같은 날을 다시 권하지 않는다
  R.clearSnapOpen();
  const offered = [first];
  for (;;) {
    fail(b);
    await tick();
    const day = b.state.snapDay;
    if (!day) break;
    assert.equal(offered.includes(day), false, day);
    assert.ok(day < offered[offered.length - 1], '점점 오래된 것으로');
    offered.push(day);
    b.openSnapshot();
    device.alerts.at(-1).buttons[1].onPress();
    R.clearSnapOpen();
  }
  assert.deepEqual(offered, R.snapDays(device.keys));
  // 열어 볼 저장본이 더 없으면 그 줄은 보이지 않는다 — 복사는 남는다
  assert.deepEqual(exits(b), [msg('ko').core.crashExport, msg('ko').core.crashCopyLog]);
});

test('오류 화면: 한참 잘 돌다 멈춘 것은 처음으로 센다 · 웹은 내보내기 없이 window.confirm으로 묻는다 · 세 언어', async () => {
  const realNow = Date.now;
  const b = mount(ErrorBoundary, { children: 'app' });
  try {
    let now = 5_000_000;
    Date.now = () => now;
    fail(b);
    b.reset();
    now += R.STREAK_WINDOW_MS + 1;
    fail(b);
    await tick();
    assert.equal(b.state.streak, 1);
    assert.deepEqual(exits(b), [msg().core.crashExport]);
    b.reset();
    now += 500;
    fail(b);
    assert.equal(b.state.streak, 2);
  } finally {
    Date.now = realNow;
  }
  await tick();
  // 웹
  device.os = 'web';
  const asked = [];
  global.window = { confirm: (text) => { asked.push(text); return false; } };
  try {
    b.setState({ snapDay: '2026-11-17' });
    assert.deepEqual(exits(b), [msg().core.crashOpenSnap({ date: fmtDateLong('2026-11-17') }), msg().core.crashCopyLog]);
    b.openSnapshot();
    assert.equal(asked.length, 1);
    assert.ok(asked[0].startsWith(msg().settings.snapAskTitle));
    assert.ok(b.state.error, '아니오면 그대로');
  } finally {
    delete global.window;
    device.os = 'ios';
  }
  for (const l of ['ko', 'ja', 'en']) {
    setLang(l);
    b.setState({ streak: 2, snapDay: '2026-11-17' });
    const c = msg(l).core;
    assert.deepEqual(exits(b), [c.crashExport, c.crashOpenSnap({ date: fmtDateLong('2026-11-17') }), c.crashCopyLog], l);
  }
  setLang('ko');
});

// ── 화면 하나 · 시트 하나의 경계 ───────────────────────────────────────────────

test('ScreenBoundary: 오류가 나면 그 자리에 fallback을 그리고, 다시 시도하거나 다른 화면으로 옮기면 풀린다', () => {
  L.resetLogForTest();
  const seen = [];
  const b = mount(ScreenBoundary, { name: 'today', resetKey: 'today:0', fallback: (retry) => { seen.push(retry); return 'fallback'; }, children: 'screen' });
  assert.equal(b.render(), 'screen');
  fail(b, new RangeError('Invalid time value'), '\n    at Today\n    at ScreenBoundary');
  assert.equal(b.render(), 'fallback');
  assert.equal(seen.at(-1), b.retry);
  // 기록에는 어느 화면인지 남는다
  const e = L.logEntries().at(-1);
  assert.deepEqual([e.kind, e.where, e.name, e.msg, e.comp], ['render', 'screen:today', 'RangeError', 'Invalid time value', ['Today', 'ScreenBoundary']]);
  // 같은 화면에서 다시 그려져도(문서가 바뀌어 Root가 다시 그림) 풀리지 않는다
  update(b, { resetKey: 'today:0' });
  assert.equal(b.render(), 'fallback');
  // 다시 시도
  b.retry();
  assert.equal(b.render(), 'screen');
  // 다른 화면(또는 다른 영역)으로 옮기면 저절로 풀린다
  fail(b);
  assert.equal(b.render(), 'fallback');
  update(b, { resetKey: 'stats:0' });
  assert.equal(b.render(), 'screen');
  assert.equal(b.state.key, 'stats:0');
});

test('OverlayBoundary: 열린 채 멈추면 닫고 알린다(onFail 한 번) — 스스로 다시 그리지 않고, 다시 열 때 한 번 더 그려 본다', () => {
  L.resetLogForTest();
  let fails = 0;
  const b = mount(OverlayBoundary, { name: 'quick', open: true, onFail: () => { fails += 1; }, children: 'sheet' });
  assert.equal(b.render(), 'sheet');
  fail(b, new TypeError('boom'), '\n    at QuickAdd');
  assert.equal(fails, 1);
  assert.equal(b.render(), null);
  assert.deepEqual([L.logEntries().at(-1).where, L.logEntries().at(-1).kind], ['overlay:quick', 'render']);
  // onFail이 시트를 닫았다(open false) — 여전히 아무것도 그리지 않는다(같은 오류를 되풀이하지 않게)
  update(b, { open: false });
  assert.equal(b.render(), null);
  update(b, { open: false });
  assert.equal(b.render(), null);
  // 사용자가 다시 열면 한 번 더 그려 본다
  update(b, { open: true });
  assert.equal(b.render(), 'sheet');
  // 또 멈추면 또 닫고 알린다
  fail(b);
  assert.equal(fails, 2);
  assert.equal(b.render(), null);

  // 닫힌 채 멈춘 것(보이는 것이 없다)은 알리지 않는다 — 다음에 열 때 그려 본다
  let quiet = 0;
  const c = mount(OverlayBoundary, { name: 'inbound', open: false, onFail: () => { quiet += 1; }, children: 'host' });
  fail(c);
  assert.equal(quiet, 0);
  assert.equal(c.render(), null);
  update(c, { open: true });
  assert.equal(c.render(), 'host');
  // onFail이 없어도 된다
  const d = mount(OverlayBoundary, { name: 'x', open: true, children: 'y' });
  assert.doesNotThrow(() => fail(d));
});

// ── 붙인 자리(소스) ────────────────────────────────────────────────────────────

test('Root: 지금 화면과 시트 하나하나를 따로 감싼다 — 탭 막대는 경계 밖이라 그대로 쓴다', () => {
  const root = src('src/navigation/Root.tsx');
  // 화면: 화면 · 영역이 바뀌면 풀리고, 홈이 아니면 '홈으로'
  assert.match(root, /screen = \(\s*<ScreenBoundary\s+name=\{ui\.screen\}\s+resetKey=\{`\$\{ui\.screen\}:\$\{ui\.ti\}`\}\s+fallback=\{\(retry\) => <ScreenFallback onRetry=\{retry\} onHome=\{ui\.screen === 'dashboard' \? undefined : \(\) => ui\.go\('dashboard'\)\} \/>\}\s*>\s*\{screen\}\s*<\/ScreenBoundary>\s*\);/);
  // 펼침의 곁 쪽도
  assert.match(root, /body = \(\s*<ScreenBoundary name=\{`side:\$\{companion\.screen\}`\} resetKey=\{companionKey\(companion\)\} fallback=\{\(retry\) => <ScreenFallback onRetry=\{retry\} \/>\}>\s*\{body\}\s*<\/ScreenBoundary>\s*\);/);
  // 시트: 저마다 제 상태 · 제 닫기
  const sheets = [
    ['action', '!!ui.sheet', 'closeSheet', 'ActionSheetPure'], ['focus', '!!ui.focus', 'closeFocus', 'FocusTimerPure'],
    ['quick', 'ui.quick', 'closeQuick', 'QuickAddPure'], ['pick', 'ui.pick', 'closePick', 'PickTodayPure'],
    ['editor', '!!ui.editor', 'closeEditor', 'CellEditorPure'], ['ritual', '!!ui.ritual', 'closeRitual', 'WeekRitualPure'],
    ['share', 'ui.share', 'closeShare', 'ShareChartPure'], ['print', '!!ui.print', 'closePrint', 'PrintSheetPure'],
    ['pro', '!!ui.pro', 'closePro', 'ProSheetPure'], ['yearClose', 'ui.yearClose', 'closeYearClose', 'YearClosePure'],
    ['celebrate', '!!ui.celebrate', 'closeCelebrate', 'CelebrationPure'],
  ];
  for (const [name, open, close, comp] of sheets) {
    assert.ok(root.includes(`<OverlayBoundary name="${name}" open={${open}} onFail={sheetFailed(ui.${close})}><${comp} /></OverlayBoundary>`), name);
  }
  // Root에 붙은 시트는 모두 감쌌다(새 시트를 붙이면 여기도 감싼다)
  const overlays = root.slice(root.indexOf('const overlays = ('), root.indexOf('if (!spread) {'));
  const bare = overlays.split('\n').filter((l) => /<\w+Pure \/>/.test(l) && !l.includes('<OverlayBoundary '));
  assert.deepEqual(bare, []);
  assert.equal((overlays.match(/<OverlayBoundary /g) || []).length, sheets.length + 1);
  assert.ok(overlays.includes('<OverlayBoundary name="inbound" open={false}><Inbound /></OverlayBoundary>'));
  assert.ok(overlays.includes('<ToastHost />'));
  // 멈춘 시트: 닫고 조용한 한 줄(토스트)
  assert.match(root, /const sheetFailed = \(close: \(\) => void\) => \(\) => \{\s*close\(\);\s*ui\.showToast\(msg\(\)\.core\.sheetFail\);\s*\};/);
  // 토스트가 멈추면 다른 토스트로 알리지 않고 내린다
  assert.match(root, /<OverlayBoundary name="toast" open=\{!!toast\} onFail=\{hideToast\}>\s*<SnackbarPure \/>\s*<\/OverlayBoundary>/);
  // 탭 막대는 화면 · 시트의 경계 밖(형제)
  assert.match(root, /\{page\}\s*\{tabs\}\s*\{overlays\}/);
  assert.match(root, /const tabs = showTabs && <TabBar /);
  // 그 자리의 안내: 제목 · 한 줄 · 홈으로 · 다시 시도
  const fb = root.slice(root.indexOf('function ScreenFallback('), root.indexOf('function ToastHost('));
  for (const k of ['m.core.screenFailTitle', 'm.core.screenFailBody', 'label={m.core.screenFailHome} onPress={onHome}', 'label={m.common.retry} onPress={onRetry}']) assert.ok(fb.includes(k), k);
  assert.doesNotMatch(fb, /borderRadius|boxShadow|backgroundColor/, '카드 · 그림자 없이 글만');
  // 마지막 그물은 그대로 App에
  assert.match(src('App.tsx'), /<ErrorBoundary>\s*<SafeAreaProvider>/);
});

test('저장본으로 열기는 저장소의 손잡이로 — 문지기가 첫 화면 전에 바꾸고, 설정 › 저장본과 같은 되돌리기를 권한다', () => {
  const app = src('App.tsx');
  const gate = app.slice(app.indexOf('function Gate()'), app.indexOf('function Resume('));
  assert.match(gate, /const ready = useReady\(\);[\s\S]*const opening = useSnapOpen\(ready\);\s*if \(!ready \|\| opening\) return <Splash \/>;\s*return <Shell \/>;/);
  const hook = src('src/store/useCrashRecovery.ts');
  // 처음 그릴 때부터 참 — 지금 문서로는 한 번도 그리지 않는다
  assert.match(hook, /const \[busy, setBusy\] = useState\(\(\) => pendingSnapOpen\(\) !== null\);/);
  assert.match(hook, /readSnapshot\(day\)/);
  assert.match(hook, /replaceDoc\(\{ \.\.\.saved, settings: before\.settings \}\);\s*keepSnapUndo\(day, before\);/);
  assert.match(hook, /if \(!alive \|\| pendingSnapOpen\(\) !== day\) return;\s*clearSnapOpen\(\);/);
  assert.match(hook, /const u = takeSnapUndo\(\);\s*if \(u\) offerUndo\(m\.settings\.snapRestored\(\{ date: fmtDateLong\(u\.day\) \}\), u\.doc\);/);
  assert.match(hook, /const offerUndo = useSnapshotUndo\(\);/);
  // 설정 › 저장본도 같은 손잡이 · 같은 글
  const settings = src('src/screens/Settings.tsx');
  assert.match(settings, /const saved = await readSnapshot\(day\);/);
  assert.match(settings, /replaceDoc\(\{ \.\.\.saved, settings: snapshot\.settings \}\);\s*offerUndo\(st\.snapRestored\(\{ date: fmtDateLong\(day\) \}\), snapshot\);/);
  // Root가 되돌리기 손잡이를 붙인다
  const root = src('src/navigation/Root.tsx');
  assert.ok(root.slice(root.indexOf('export function Root()'), root.indexOf('function Milestones()')).includes('<SnapOpenNotice />'));
  // 오류 화면은 저장소 모듈을 부르지 않는다(저장소가 원인일 수 있다) — 열쇠 이름만 안다
  const eb = code('src/components/ErrorBoundary.tsx');
  assert.doesNotMatch(eb, /MandaratContext|useCrashRecovery|screens\/settings/);
  assert.match(eb, /if \(streak >= 2\) void this\.findSnapshot\(\);/);
  assert.match(eb, /const more = streak >= 2;/);
});

test('새 글: 세 언어에 있고 차분하다(느낌표 없음 · 탓하지 않음)', () => {
  const keys = ['crashOpenSnap', 'crashCopyLog', 'crashCopied', 'crashCopyFailed', 'screenFailTitle', 'screenFailBody', 'screenFailHome', 'sheetFail'];
  for (const l of ['ko', 'ja', 'en']) {
    const c = msg(l).core;
    for (const k of keys) {
      const text = typeof c[k] === 'function' ? c[k]({ date: 'D' }) : c[k];
      assert.ok(typeof text === 'string' && text.length > 0, `${l}.${k}`);
      assert.doesNotMatch(text, /[!！]|잘못|실수|failed|wrong|失敗/, `${l}.${k}: ${text}`);
    }
    assert.ok(msg(l).settings.mailLogHead.length > 0, l);
    // 맨 끝에 더했다(다른 꾸러미가 같은 파일을 고친다)
    assert.deepEqual(Object.keys(c).slice(-keys.length), keys, l);
    assert.equal(Object.keys(msg(l).settings).at(-1), 'mailLogHead', l);
  }
  assert.equal(msg('ko').core.screenFailHome, '홈으로');
  assert.equal(msg('ko').core.crashCopyLog, '오류 내용 복사');
  assert.match(msg('ko').core.sheetFail, /요$/);
  assert.match(msg('ja').core.sheetFail, /ます$/);
});

// ── 사용자가 적은 글이 들어올 자리 · 기기 밖으로 나가는 길 ───────────────────────────

test('crash.crumb · crash.tag를 부르는 자리는 코드가 정한 낱말만 넘긴다 — 새 자리가 생기면 이 목록을 고치며 확인한다', () => {
  const found = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      const rel = `${d}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(e.name)) for (const m of code(rel).matchAll(/crash\.(crumb|tag)\(((?:[^()]|\([^()]*\))*)\)/g)) found.push(`${rel}: ${m[1]}(${m[2].trim()})`);
    }
  };
  walk('src');
  assert.deepEqual(found.sort(), [
    // 링크의 종류(home · today · focus …) — src/lib/links.ts LinkTarget['to']
    "src/hosts/Inbound.tsx: crumb('link', target.to)",
    // 맞추기 단계 · 문제 이름(SyncPhase · SyncProblem)
    "src/hosts/ICloudSync.tsx: crumb('sync', phase)",
    // 위젯에서 온 체크의 수
    "src/hosts/WidgetSync.tsx: crumb('widget', `ops ${ops.length}`)",
    "src/i18n/react.tsx: tag('lang', l)",
    "src/i18n/react.tsx: tag('lang', to)",
    // 배치(phone · column · spread) · 화면 이름 · 시트 이름
    "src/navigation/Root.tsx: tag('layout', mode)",
    "src/navigation/Root.tsx: tag('overlay', shownOverlay)",
    "src/navigation/Root.tsx: tag('screen', shownScreen)",
    // 결제 단계 · 가졌는지(y · n)
    "src/store/ProContext.tsx: crumb('pro', s.phase)",
    "src/store/ProContext.tsx: tag('pro', s.owned ? 'y' : 'n')",
  ].sort());
  // 화면 · 시트 이름은 화면 상태에서 고른 고정 낱말이다
  const root = src('src/navigation/Root.tsx');
  assert.match(root, /const shownScreen = onboarded \? ui\.screen : 'onboarding';/);
  assert.match(root, /\['action', ui\.sheet\], \['focus', ui\.focus\], \['quick', ui\.quick\]/);
  // crash.report의 ctx는 where · componentStack만 읽는다 — 부르는 자리의 where도 고정 낱말
  assert.match(src('src/lib/crash.ts'), /report: \(e: unknown, ctx\?: Record<string, string>\) => record\(e, \{ where: ctx\?\.where, componentStack: ctx\?\.componentStack \}\),/);
  const wheres = [];
  const walkWhere = (d) => {
    for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      const rel = `${d}/${e.name}`;
      if (e.isDirectory()) walkWhere(rel);
      else if (/\.tsx?$/.test(e.name)) for (const m of code(rel).matchAll(/crash\.report\([^;]*?where: (`[^`]*`|'[^']*'|[^,}]+)/g)) wheres.push(m[1].trim());
    }
  };
  walkWhere('src');
  assert.deepEqual(wheres.sort(), ["'inbound'", "'widgetSync'", '`overlay:${this.props.name}`', '`screen:${this.props.name}`']);
});

test('어디에도 보내지 않는다 — 오류 기록 쪽 파일에 통신 코드가 없다', () => {
  for (const f of ['src/lib/crashLog.ts', 'src/lib/crashBoot.ts', 'src/lib/crash.ts', 'src/lib/crashRecover.ts', 'src/store/useCrashRecovery.ts']) {
    assert.doesNotMatch(code(f), /\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|https?:\/\/|expo-network|uploadAsync|\.upload\(/, f);
  }
  // 기기 밖으로 나가는 길은 둘뿐: 사용자가 여는 메일(설정 › 문의하기)과 오류 화면의 복사
  const users = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      const rel = `${d}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(e.name) && rel !== 'src/lib/crashLog.ts' && /\blogText\(|\blogEntries\(/.test(code(rel))) users.push(rel);
    }
  };
  walk('src');
  assert.deepEqual(users.sort(), ['src/components/ErrorBoundary.tsx', 'src/lib/appInfo.ts']);
  assert.match(src('src/components/ErrorBoundary.tsx'), /Clipboard\.setString\(logText\(\)\);/);
});
