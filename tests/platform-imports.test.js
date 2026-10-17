// 플랫폼 나누기(docs/v2/plan.md §2.1) — 기기에만 있는 모듈은 *.native.ts(x) · *.ios.ts(x)에서만 불러온다.
// 웹 미리보기(Vercel)와 Node 테스트가 그 모듈을 불러오면 깨진다. 또 '.native' · '.ios' · '.web'으로 끝나는 경로를
// 직접 부르지 않는다(Metro가 고른다) — 단, 같은 꼬리표를 가진 파일끼리는 된다(bridge.ios.ts → ./TodayWidget.ios).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
/** 기기 전용 모듈 — 이름 그대로이거나 그 아래 경로 */
const DEVICE_ONLY = ['expo-notifications', 'expo-widgets', '@expo/ui', 'expo-print', '@sentry/react-native'];
const SCAN = ['App.tsx', 'index.ts', 'src', 'modules', 'scripts', 'plugins'];

function files() {
  const out = [];
  const walk = (p) => {
    if (!fs.existsSync(p)) return;
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      for (const e of fs.readdirSync(p)) if (e !== 'node_modules' && !e.startsWith('.')) walk(path.join(p, e));
    } else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(p) && !p.endsWith('.d.ts')) out.push(path.relative(ROOT, p).split(path.sep).join('/'));
  };
  for (const s of SCAN) walk(path.join(ROOT, s));
  return out.sort();
}

/** 파일 하나가 부르는 경로들 — import · export from · require() · import() */
function specifiers(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const sf = ts.createSourceFile(rel, src, ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out = [];
  const visit = (n) => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) out.push(n.moduleSpecifier.text);
    else if (ts.isCallExpression(n) && n.arguments[0] && ts.isStringLiteral(n.arguments[0])
      && ((ts.isIdentifier(n.expression) && n.expression.text === 'require') || n.expression.kind === ts.SyntaxKind.ImportKeyword)) out.push(n.arguments[0].text);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

const deviceFile = (rel) => /\.(native|ios)\.[jt]sx?$/.test(rel);
const isDeviceOnly = (spec) => DEVICE_ONLY.some((m) => spec === m || spec.startsWith(`${m}/`));
/** 파일 이름의 꼬리표 — 'ios' · 'native' · 'web' · '' */
const suffixOf = (rel) => /\.(native|ios|web)\.[jt]sx?$/.exec(rel)?.[1] ?? '';

/** 한 파일의 위반 — 테스트가 검사기 자체도 확인할 수 있게 함수로 */
function violations(rel, specs) {
  const out = [];
  for (const spec of specs) {
    if (isDeviceOnly(spec) && !deviceFile(rel)) out.push(`${rel}: ${spec} (기기 전용 — *.native/*.ios 파일에서만)`);
    const m = /\.(native|ios|web)$/.exec(spec);
    if (m && !(spec.startsWith('.') && m[1] === suffixOf(rel))) out.push(`${rel}: ${spec} (플랫폼 꼬리표를 직접 부르지 않는다)`);
  }
  return out;
}

test('검사기: 기기 전용 모듈과 꼬리표 경로를 가린다', () => {
  assert.deepEqual(violations('src/lib/a.ts', ['expo-notifications']).length, 1);
  assert.deepEqual(violations('src/lib/a.native.ts', ['expo-notifications', '@sentry/react-native/metro']), []);
  assert.deepEqual(violations('src/widgets/b.ios.ts', ['@expo/ui/swift-ui', './TodayWidget.ios']), []);
  assert.equal(violations('src/widgets/b.ts', ['./TodayWidget.ios']).length, 1, '.ios 경로는 .ios 파일에서만');
  assert.equal(violations('src/widgets/b.native.ts', ['./TodayWidget.ios']).length, 1, '.native 파일도 .ios는 안 된다');
  assert.equal(violations('src/lib/a.ts', ['./print.web']).length, 1);
  assert.deepEqual(violations('src/lib/a.ts', ['expo-print-helper', 'react-native']), []);
});

test('기기 전용 모듈은 *.native · *.ios 파일에서만, 꼬리표 경로는 같은 꼬리표 파일에서만', () => {
  const found = [];
  for (const f of files()) found.push(...violations(f, specifiers(f)));
  assert.deepEqual(found, []);
});

test('metro.config.js는 Sentry의 metro 도우미만 쓴다(앱 번들에 들어가지 않는다)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'metro.config.js'), 'utf8');
  assert.match(src, /require\('@sentry\/react-native\/metro'\)/);
  assert.match(src, /module\.exports = getSentryExpoConfig\(__dirname\);/);
});
