// v2 뼈대(Wave 0) — 뒤 꾸러미가 채울 자리가 제자리에 있는지: 설정 구역 순서, Root가 붙인 시트·손잡이, '한 해' 화면, 빈 파일들.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('설정: v2 구역 자리가 정해진 순서로 있다', () => {
  const s = src('src/screens/Settings.tsx');
  const at = (needle) => {
    const i = s.indexOf(needle);
    assert.ok(i >= 0, needle);
    return i;
  };
  const order = [
    '<Section M={M} label="핵심 목표" />',
    '<Section M={M} label="보기" />', '<SubHead M={M} label="칸 모서리" />', '<PaperRows M={M} />',
    '<LanguageSection M={M} />', '<NotifySection M={M} />', '<SyncSection M={M} />',
    '<Section M={M} label="기록" />', 'last title="저장본"', '{STORAGE_NOTE}', '<YearRows M={M} />', '<SubHead M={M} label="새로 시작" />',
    'last danger title="전체 초기화"', '<ProSection M={M} />',
    '<Section M={M} label="정보" />', '<CrashRow M={M} />',
  ].map(at);
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  // 줄 모양은 settings/rows.tsx 한 곳에
  const rows = src('src/screens/settings/rows.tsx');
  for (const name of ['Section', 'SubHead', 'RadioRow', 'TextLink', 'ColophonRow', 'rowBase', 'ask']) {
    assert.match(rows, new RegExp(`export function ${name}\\(`), name);
    assert.doesNotMatch(s, new RegExp(`\\nfunction ${name}\\(`), `${name}는 Settings.tsx에 다시 두지 않는다`);
  }
});

test('Root: 시트 셋과 손잡이 넷을 붙이고, 들어오는 링크(Inbound)는 시작하기를 마친 쪽에만', () => {
  const s = src('src/navigation/Root.tsx');
  for (const name of ['PrintSheetPure', 'ProSheetPure', 'YearClosePure']) {
    assert.match(s, new RegExp(`const ${name} = memo\\(`), name);
    assert.match(s, new RegExp(`<${name} />`), name);
  }
  // 시트는 공유 시트 뒤에
  assert.ok(s.indexOf('<ShareChartPure />') < s.indexOf('<PrintSheetPure />'));
  // 그리지 않는 손잡이는 Milestones 옆에
  const root = s.slice(s.indexOf('export function Root()'), s.indexOf('function Milestones()'));
  for (const host of ['<Milestones />', '<ReminderSync />', '<WidgetSync />', '<ICloudSync />']) assert.ok(root.includes(host), host);
  assert.equal(root.includes('<Inbound />'), false);
  // Inbound는 RootView에서 시작하기 갈래(!onboarded)가 돌아간 뒤에
  const view = s.slice(s.indexOf('const RootView = memo'));
  const notOnboarded = view.indexOf('if (!onboarded) {');
  const afterReturn = view.indexOf('let screen: React.ReactNode');
  assert.ok(notOnboarded >= 0 && afterReturn > notOnboarded);
  assert.equal(view.slice(notOnboarded, afterReturn).includes('<Inbound />'), false);
  assert.ok(view.indexOf('<Inbound />') > afterReturn);
  // '한 해' 화면
  assert.match(s, /else if \(ui\.screen === 'year'\) screen = <YearPure \/>;/);
  // 탭바 testID
  assert.match(s, /testID=\{TID\.tab\(id\)\}/);
  assert.match(s, /testID=\{TID\.tabAdd\}/);
});

test('ui.tsx: 프로 · 인쇄 · 한 해 닫기는 늘 대기열(afterOverlays)을 거치고 anyOpen에 든다', () => {
  const s = src('src/navigation/ui.tsx');
  assert.match(s, /export type Screen = 'dashboard' \| 'grid' \| 'detail' \| 'today' \| 'stats' \| 'settings' \| 'year';/);
  assert.match(s, /return s === 'detail' \|\| s === 'settings' \|\| s === 'year';/);
  assert.match(s, /s === 'year' \? 'stats'/);
  for (const name of ['openPro', 'openPrint', 'openYearClose']) {
    const body = s.slice(s.indexOf(`const ${name} = useCallback`), s.indexOf('}, [afterOverlays]', s.indexOf(`const ${name} = useCallback`)));
    assert.match(body, /afterOverlays\(/, name);
  }
  assert.match(s, /\|\| pro \|\| print \|\| yearClose\) \|\| mounted > 0/);
  assert.match(s, /initialScreen\?: Screen/);
  assert.match(s, /if \(backGuardRef\.current\?\.\(\)\) return;/);
  const hooks = s.split('\n').find((l) => l.includes('g.__ui = {'));
  for (const k of ['go', 'openPro', 'openPrint', 'openYearClose', 'openYear']) assert.match(hooks, new RegExp(`\\b${k}\\b`), k);
});

test('App: 오류 수집 · 언어 · 프로 공급자 순서', () => {
  const s = src('App.tsx');
  assert.match(s, /^crash\.init\(\);$/m);
  assert.match(s, /export default crash\.wrap\(App\);/);
  const order = ['<LangBoot fallback={<Splash />}>', '<ErrorBoundary>', '<SafeAreaProvider>', '<ProProvider>', '<MandaratProvider>', '<Gate />'].map((n) => {
    const i = s.indexOf(n);
    assert.ok(i >= 0, n);
    return i;
  });
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  // 언어를 바꿔 LangRoot가 다시 마운트될 때 돌아올 화면은 그 아래에서 다시 읽는다(V4-E 넘겨줄 일 → Resume)
  assert.match(s, /<LangRoot>\s*<Resume>/);
  assert.match(s, /const \[hint\] = useState\(takeResumeHint\);\s*return <UIProvider initialScreen=\{hint\}>/);
  assert.match(src('src/components/ErrorBoundary.tsx'), /crash\.report\(error, \{ componentStack: info\.componentStack \?\? '' \}\);/);
  assert.match(src('src/screens/Dashboard.tsx'), /testID=\{TID\.homeSettings\}/);
});

test('뒤 꾸러미가 채울 빈 파일이 모두 있다', () => {
  const stubs = [
    'src/overlays/ProSheet.tsx', 'src/overlays/PrintSheet.tsx', 'src/overlays/YearClose.tsx',
    'src/screens/Year.tsx',
    ...['PaperRows', 'LanguageSection', 'NotifySection', 'SyncSection', 'YearRows', 'ProSection', 'CrashRow'].map((n) => `src/screens/settings/${n}.tsx`),
    ...['ReminderSync', 'WidgetSync', 'ICloudSync', 'Inbound'].map((n) => `src/hosts/${n}.tsx`),
    'src/store/ProContext.tsx',
    'src/lib/notifier.ts', 'src/lib/notifier.native.ts', 'src/lib/crash.ts', 'src/lib/crash.native.ts',
    'src/widgets/bridge.ts', 'src/widgets/bridge.ios.ts', 'src/widgets/focusLive.ts', 'src/widgets/focusLive.ios.ts',
    'plugins/withWidgetStrings.js', 'native/ios/AppIntents.swift',
  ];
  for (const f of stubs) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
  // 설정 구역은 { M }을 받는 함수
  for (const n of ['PaperRows', 'LanguageSection', 'NotifySection', 'SyncSection', 'YearRows', 'ProSection', 'CrashRow']) {
    assert.match(src(`src/screens/settings/${n}.tsx`), new RegExp(`export function ${n}\\(\\{ M \\}: \\{ M: M \\}\\)`), n);
  }
  // 위젯 문자열 플러그인은 설정 플러그인(V2-C) — 자세한 것은 tests/widgetStrings.test.js
  const plugin = require('../plugins/withWidgetStrings');
  assert.equal(typeof plugin, 'function');
  assert.match(src('native/ios/AppIntents.swift'), /^import Foundation$/m);
});

test('기본 파일의 기기 기능은 아무것도 하지 않는다(웹 · Node)', async () => {
  const { notifier } = require('../src/lib/notifier');
  assert.equal(notifier.supported, false);
  assert.equal(await notifier.status(), 'unsupported');
  assert.equal(await notifier.request(), 'unsupported');
  const off = notifier.onOpen(() => {});
  assert.equal(typeof off, 'function');
  const { crash } = require('../src/lib/crash');
  const root = () => null;
  assert.equal(crash.wrap(root), root);
  const { widgetBridge } = require('../src/widgets/bridge');
  assert.deepEqual(await widgetBridge.readOps(), []);
  const { focusLive } = require('../src/widgets/focusLive');
  for (const k of ['start', 'update', 'end', 'endAll']) assert.equal(typeof focusLive[k], 'function');
});
