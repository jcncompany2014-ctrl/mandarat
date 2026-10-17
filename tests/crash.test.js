// V4-F 오류 수집 — crash.native.ts(Sentry)를 가짜 Sentry · 저장소로 Node에서 불러 보고, 걸러 내기 · 끄기 · 출시 막음을 확인한다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const NATIVE = path.join(ROOT, 'src/lib/crash.native.ts');
const PREFS = path.join(ROOT, 'src/lib/crashPrefs.ts');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
/** 주석을 뺀 소스 */
const code = (f) => src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const DSN = 'https://0123456789abcdef0123456789abcdef@o4500000000000000.ingest.us.sentry.io/4500000000000001';

global.__DEV__ = false;

/** 가짜 Sentry — 부른 것을 적는다 */
function fakeSentry() {
  const calls = { init: [], captureException: [], addBreadcrumb: [], setTag: [], wrap: [] };
  return {
    calls,
    init: (o) => calls.init.push(o),
    captureException: (e, hint) => calls.captureException.push([e, hint]),
    addBreadcrumb: (b) => calls.addBreadcrumb.push(b),
    setTag: (k, v) => calls.setTag.push([k, v]),
    wrap: (root, opts) => { calls.wrap.push(opts); return { wrapped: root }; },
  };
}

/** 가짜 AsyncStorage */
function fakeStorage(init = {}) {
  const map = new Map(Object.entries(init));
  return {
    __esModule: true,
    map,
    default: {
      getItem: async (k) => (map.has(k) ? map.get(k) : null),
      setItem: async (k, v) => { map.set(k, v); },
    },
  };
}

/** crash.native.ts를 새로 불러온다 — dsn을 주면 SENTRY_DSN 줄만 바꿔 컴파일한다 */
function loadNative({ dsn = DSN, stored = {} } = {}) {
  const sentry = fakeSentry();
  const storage = fakeStorage(stored);
  const orig = Module._load;
  Module._load = function load(req, parent, isMain) {
    if (req === '@sentry/react-native') return sentry;
    if (req === '@react-native-async-storage/async-storage') return storage;
    return orig.call(this, req, parent, isMain);
  };
  try {
    delete require.cache[PREFS];
    let text = fs.readFileSync(NATIVE, 'utf8');
    assert.match(text, /^export const SENTRY_DSN = '';$/m, 'SENTRY_DSN 줄');
    if (dsn !== '') text = text.replace(/^export const SENTRY_DSN = '';$/m, `export const SENTRY_DSN = '${dsn}';`);
    const { outputText } = ts.transpileModule(text, { fileName: NATIVE, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
    const m = new Module(NATIVE, module);
    m.filename = NATIVE;
    m.paths = Module._nodeModulePaths(path.dirname(NATIVE));
    m._compile(outputText, NATIVE);
    return { mod: m.exports, sentry, storage };
  } finally {
    Module._load = orig;
  }
}

const tick = () => new Promise((r) => setImmediate(r));

/** 한국어 글이 든 가짜 사건 */
function koreanEvent() {
  return {
    exception: { values: [
      { type: 'TypeError', value: "Cannot read property 'length' of \"매일 아침 30분 달리기\" — 「건강」 영역" },
      { type: 'Error', value: `JSON 오류: '${'가'.repeat(400)}' 끝 ${'나'.repeat(300)}` },
    ] },
    extra: { text: '핵심 목표: 올해 마라톤 완주' },
    user: { id: 'abc', ip_address: '1.2.3.4', username: '김민지' },
    request: { url: 'https://example.com/?q=비밀' },
    server_name: '민지의 iPhone',
    contexts: { device: { name: '민지의 iPhone', model: 'iPhone16,1' } },
    breadcrumbs: [
      { category: 'console', level: 'log', message: '실천: 물 2L' },
      { category: 'console', level: 'warning', message: 'short', data: { arguments: [{ text: '핵심 목표' }] } },
      { category: 'widget', level: 'info', message: 'ops 2' },
      { category: 'link', level: 'info', message: `x${'가'.repeat(90)}` },
    ],
  };
}

test('beforeSend: 개인정보 칸을 지우고 오류 글의 따옴표 안을 "…"로, 200자로 자른다', () => {
  const { mod } = loadNative();
  const ev = mod.scrubEvent(koreanEvent(), false);
  assert.ok(ev);
  for (const k of ['extra', 'user', 'request', 'server_name']) assert.equal(k in ev, false, k);
  assert.equal('name' in ev.contexts.device, false, '기기 이름');
  assert.equal(ev.contexts.device.model, 'iPhone16,1');
  assert.equal(ev.exception.values[0].value, 'Cannot read property "…" of "…" — "…" 영역');
  assert.ok(ev.exception.values[1].value.length <= 200, '200자');
  assert.doesNotMatch(ev.exception.values[1].value, /가/, '따옴표 안의 글이 남지 않는다');
  const json = JSON.stringify(ev);
  for (const s of ['매일 아침', '건강', '마라톤', '김민지', '비밀', '민지의', '물 2L', '핵심 목표']) assert.equal(json.includes(s), false, s);
  // 남는 발자국: 경고 이상 console(인자 없이) · 짧은 앱 발자국
  assert.deepEqual(ev.breadcrumbs.map((b) => b.message), ['short', 'ops 2']);
  assert.equal('data' in ev.breadcrumbs[0], false);
});

test('beforeBreadcrumb: 경고보다 낮은 console · 80자보다 긴 글은 버린다', () => {
  const { mod } = loadNative();
  for (const level of ['log', 'info', 'debug', undefined]) assert.equal(mod.keepCrumb({ category: 'console', level, message: 'x' }), null, String(level));
  for (const level of ['warning', 'error', 'fatal']) assert.ok(mod.keepCrumb({ category: 'console', level, message: 'x' }), level);
  assert.equal(mod.keepCrumb({ category: 'pro', level: 'info', message: 'a'.repeat(81) }), null);
  assert.deepEqual(mod.keepCrumb({ category: 'pro', level: 'info', message: 'a'.repeat(80) }), { category: 'pro', level: 'info', message: 'a'.repeat(80) });
  assert.deepEqual(mod.keepCrumb({ category: 'touch', level: 'info', message: 'Touch event within element: View' }).category, 'touch');
});

test('init: 개인정보 · 화면 캡처 · 화면 구조 · 추적 없이 한 번만, 미리 단 tag · report · crumb는 시작할 때', async () => {
  const { mod, sentry } = loadNative();
  mod.crash.tag('lang', 'ja');
  mod.crash.crumb('pro', 'ready');
  mod.crash.report(new Error('early'), { where: 'boot' });
  assert.equal(sentry.calls.init.length, 0, '저장소를 읽기 전');
  mod.crash.init();
  mod.crash.init();
  await tick();
  assert.equal(sentry.calls.init.length, 1);
  const o = sentry.calls.init[0];
  assert.equal(o.dsn, DSN);
  assert.equal(o.sendDefaultPii, false);
  assert.equal(o.attachScreenshot, false);
  assert.equal(o.attachViewHierarchy, false);
  assert.equal(o.enableAutoPerformanceTracing, false);
  assert.equal(o.maxBreadcrumbs, 50);
  assert.equal(o.enabled, true);
  assert.equal(o.environment, process.env.EXPO_PUBLIC_APP_ENV ?? 'production');
  for (const k of ['tracesSampleRate', 'tracesSampler', 'profilesSampleRate', 'replaysSessionSampleRate', 'replaysOnErrorSampleRate']) assert.equal(k in o, false, k);
  assert.deepEqual(sentry.calls.setTag, [['lang', 'ja']]);
  assert.deepEqual(sentry.calls.addBreadcrumb, [{ category: 'pro', message: 'ready', level: 'info' }]);
  assert.equal(sentry.calls.captureException.length, 1);
  assert.deepEqual(sentry.calls.captureException[0][1], { contexts: { where: { where: 'boot' } } });
  // 시작한 뒤에는 곧바로
  mod.crash.tag('pro', 'y');
  assert.deepEqual(sentry.calls.setTag.at(-1), ['pro', 'y']);
  mod.crash.report(new Error('render'), { componentStack: '\n    at Grid\n    at App' });
  assert.deepEqual(sentry.calls.captureException.at(-1)[1], { contexts: { react: { componentStack: '\n    at Grid\n    at App' } } });
  // beforeSend · beforeBreadcrumb가 걸러 낸다
  assert.equal(o.beforeSend(koreanEvent(), {}).exception.values[0].value.includes('달리기'), false);
  assert.equal(o.beforeBreadcrumb({ category: 'console', level: 'log', message: 'x' }), null);
});

test('wrap: 누른 곳의 이름표를 읽지 않는다(labelName undefined)', () => {
  const { mod, sentry } = loadNative();
  const Root = () => null;
  assert.deepEqual(mod.crash.wrap(Root), { wrapped: Root });
  assert.deepEqual(sentry.calls.wrap, [{ touchEventBoundaryProps: { labelName: undefined } }]);
});

test('끄기: 꺼 둔 기기는 Sentry를 시작하지 않고, 쓰는 중에 끄면 beforeSend가 모두 버린다', async () => {
  // 꺼 둔 채 켠 앱
  const a = loadNative({ stored: { 'mandarat:crash:v1': '{"off":true}' } });
  a.mod.crash.report(new Error('x'));
  a.mod.crash.init();
  await tick();
  a.mod.crash.report(new Error('y'));
  a.mod.crash.crumb('pro', 'ready');
  assert.equal(a.sentry.calls.init.length, 0);
  assert.equal(a.sentry.calls.captureException.length, 0);
  assert.equal(a.sentry.calls.addBreadcrumb.length, 0);
  // 다시 켜면 그때 시작한다
  a.mod.crash.setEnabled(true);
  assert.equal(a.sentry.calls.init.length, 1);
  a.mod.crash.report(new Error('z'));
  assert.equal(a.sentry.calls.captureException.length, 1);

  // 켜진 채 시작한 뒤 끄기 — 사건은 beforeSend에서 버려진다
  const b = loadNative();
  b.mod.crash.init();
  await tick();
  const o = b.sentry.calls.init[0];
  assert.ok(o.beforeSend(koreanEvent(), {}));
  b.mod.crash.setEnabled(false);
  assert.equal(o.beforeSend(koreanEvent(), {}), null);
  b.mod.crash.setEnabled(true);
  assert.ok(o.beforeSend(koreanEvent(), {}));
  assert.equal(b.sentry.calls.init.length, 1, '두 번 시작하지 않는다');
});

test('crashPrefs: { off: true }만 꺼짐, 모르는 꼴은 켜짐', async () => {
  const { parseCrashPrefs, serializeCrashPrefs } = require('../src/lib/crashPrefs');
  assert.equal(parseCrashPrefs(null), false);
  assert.equal(parseCrashPrefs(''), false);
  assert.equal(parseCrashPrefs('{"off":true}'), true);
  assert.equal(parseCrashPrefs('{"off":false}'), false);
  assert.equal(parseCrashPrefs('{"off":"yes"}'), false);
  assert.equal(parseCrashPrefs('nope'), false);
  assert.equal(parseCrashPrefs(serializeCrashPrefs(true)), true);
  assert.equal(parseCrashPrefs(serializeCrashPrefs(false)), false);
  const { STORE_KEYS } = require('../src/lib/contracts');
  assert.match(src('src/lib/crashPrefs.ts'), /STORE_KEYS\.crash/);
  assert.equal(STORE_KEYS.crash, 'mandarat:crash:v1');
});

test('DSN이 비면(지금) init · report · wrap 모두 아무것도 하지 않는다', async () => {
  const { mod, sentry } = loadNative({ dsn: '' });
  assert.equal(mod.SENTRY_DSN, '');
  mod.crash.init();
  await tick();
  mod.crash.report(new Error('x'));
  mod.crash.crumb('a', 'b');
  mod.crash.tag('lang', 'ko');
  mod.crash.setEnabled(true);
  const Root = () => null;
  assert.equal(mod.crash.wrap(Root), Root);
  for (const [k, v] of Object.entries(sentry.calls)) assert.equal(v.length, 0, k);
});

test('@sentry/react-native를 부르는 앱 파일은 crash.native.ts 하나', () => {
  const hits = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(rel); continue; }
      if (!/\.(tsx?|jsx?)$/.test(e.name)) continue;
      if (/['"]@sentry\/react-native(\/[^'"]*)?['"]/.test(code(rel))) hits.push(rel);
    }
  };
  for (const d of ['src', 'modules', 'plugins']) if (fs.existsSync(path.join(ROOT, d))) walk(d);
  for (const f of ['App.tsx', 'index.ts']) if (/@sentry\/react-native/.test(code(f))) hits.push(f);
  assert.deepEqual(hits, ['src/lib/crash.native.ts']);
  // 웹·Node 기본 파일은 Sentry를 모른다
  assert.doesNotMatch(code('src/lib/crash.ts'), /sentry/i);
  assert.match(code('src/lib/crash.ts'), /satisfies CrashApi/);
  assert.match(code('src/lib/crash.native.ts'), /satisfies CrashApi/);
});

test('crashProblems: DSN이 비거나 모양이 틀리면 출시를 막는다', () => {
  const { crashProblems, readSentryDsn } = require('../scripts/releaseCheck');
  assert.equal(crashProblems({ SENTRY_DSN: '' }).length, 1);
  assert.match(crashProblems({ SENTRY_DSN: '' })[0], /SENTRY_DSN.*farmerstail.*mandarat/);
  assert.equal(crashProblems({ SENTRY_DSN: '  ' }).length, 1);
  assert.equal(crashProblems({}).length, 1);
  assert.equal(crashProblems({ SENTRY_DSN: 'http://abc@sentry.io/1' }).length, 1);
  assert.equal(crashProblems({ SENTRY_DSN: 'https://0123456789abcdef0123456789abcdef@o1.ingest.sentry.io/' }).length, 1);
  assert.deepEqual(crashProblems({ SENTRY_DSN: DSN }), []);
  assert.deepEqual(crashProblems({ SENTRY_DSN: 'https://0123456789abcdef0123456789abcdef@o123.ingest.sentry.io/456' }), []);
  // 지금 소스의 값 — 비어 있다(owner 할 일)
  assert.equal(readSentryDsn(), '');
  assert.match(src('scripts/releaseCheck.js'), /\.\.\.crashProblems\(\{ SENTRY_DSN: readSentryDsn\(\) \}\)/);
});

test('CrashRow: iOS에서만, 체크 줄 · 기기마다 저장 · 미리보기 빌드에서만 길게 눌러 시험 오류', () => {
  const s = code('src/screens/settings/CrashRow.tsx');
  assert.match(s, /const SHOWN = Platform\.OS === 'ios';/);
  assert.match(s, /if \(!SHOWN\) return null;/);
  assert.match(s, /const PREVIEW = process\.env\.EXPO_PUBLIC_APP_ENV === 'preview';/);
  assert.match(s, /crash\.report\(new Error\('qa-test'\)/);
  assert.equal((s.match(/onLongPress=/g) ?? []).length, 1);
  assert.ok(s.indexOf('onLongPress=') > s.indexOf('if (PREVIEW)'), '길게 누르기는 미리보기 갈래 안에만');
  assert.match(s, /crash\.setEnabled\(next\)/);
  assert.match(s, /writeCrashOff\(!next\)/);
  assert.match(s, /accessibilityRole="checkbox"/);
  assert.match(s, /testID=\{TID\.setCrash\}/);
  assert.match(s, /t\.crash\.row/);
  assert.match(s, /t\.crash\.rowSub/);
  const ko = require('../src/i18n/ko/crash').default;
  assert.equal(ko.row, '오류 기록 보내기');
  assert.equal(ko.rowSub, '앱이 멈추면 기기 정보와 오류 내용만 보내요. 적은 글은 보내지 않아요');
});

test('웹 스모크가 웹 번들에 Sentry SDK가 없는지 본다', () => {
  const s = src('scripts/smoke/v4-f.js');
  assert.match(s, /__SENTRY__/);
  assert.match(s, /sentry\.javascript\.react-native/);
});
