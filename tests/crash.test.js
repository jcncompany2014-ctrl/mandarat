// 오류 수집 — 1.0은 Sentry를 빼고 낸다(owner 결정 2026-11). 앱 곳곳이 부르는 crash 자리는 남기되 아무것도 보내지 않고,
// Sentry SDK · 빌드 단계 · 설정 줄 · 수집 항목이 하나도 남지 않았는지 본다. 다시 켤 때는 이 파일도 V4-F 판으로 되돌린다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
/** 주석을 뺀 소스 */
const code = (f) => src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

test('crash 자리는 모든 플랫폼에서 아무것도 하지 않는다(기기 판 crash.native.ts가 없다)', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'src/lib/crash.native.ts')), false);
  const { crash } = require('../src/lib/crash');
  const root = () => null;
  assert.equal(crash.wrap(root), root);
  for (const k of ['init', 'report', 'crumb', 'tag', 'setEnabled', 'qaNativeCrash']) assert.equal(typeof crash[k], 'function', k);
  assert.doesNotThrow(() => {
    crash.init();
    crash.report(new Error('x'), { where: 'test' });
    crash.crumb('c', 'm');
    crash.tag('k', 'v');
    crash.setEnabled(false);
  });
  assert.match(code('src/lib/crash.ts'), /satisfies CrashApi/);
});

test('Sentry가 어디에도 없다 — 의존성 · 앱 설정 · metro · 빌드 프로필 · 앱 코드', () => {
  const pkg = JSON.parse(src('package.json'));
  assert.equal({ ...pkg.dependencies, ...pkg.devDependencies }['@sentry/react-native'], undefined, 'package.json');
  assert.doesNotMatch(src('app.json'), /sentry/i, 'app.json 플러그인');
  assert.doesNotMatch(src('eas.json'), /SENTRY/, 'eas.json 환경 변수');
  assert.equal(fs.existsSync(path.join(ROOT, 'metro.config.js')), false, 'metro는 Expo 기본 설정');
  const hits = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      const rel = path.join(d, e.name);
      if (e.isDirectory()) walk(rel);
      else if (/\.(tsx?|js)$/.test(e.name) && /@sentry\/|SENTRY_DSN/.test(code(rel))) hits.push(rel);
    }
  };
  for (const d of ['src', 'modules', 'plugins']) if (fs.existsSync(path.join(ROOT, d))) walk(d);
  for (const f of ['App.tsx', 'index.ts']) if (fs.existsSync(path.join(ROOT, f)) && /@sentry\//.test(code(f))) hits.push(f);
  assert.deepEqual(hits, []);
});

test("설정에 '오류 기록 보내기' 줄이 없고, 그 저장 열쇠 · 화면 글도 없다", () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'src/screens/settings/CrashRow.tsx')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'src/lib/crashPrefs.ts')), false);
  assert.doesNotMatch(src('src/screens/Settings.tsx'), /CrashRow/);
  assert.doesNotMatch(src('src/lib/contracts.ts'), /mandarat:crash:v1/);
  for (const l of ['ko', 'ja', 'en']) assert.equal(fs.existsSync(path.join(ROOT, `src/i18n/${l}/crash.ts`)), false, l);
});

test('개인정보 목록(PrivacyInfo)은 아무것도 모으지 않는다 — App Privacy 답 "데이터를 수집하지 않음"과 같다', () => {
  const app = JSON.parse(src('app.json')).expo;
  const pm = app.ios.privacyManifests;
  assert.equal(pm.NSPrivacyTracking, false);
  assert.deepEqual(pm.NSPrivacyCollectedDataTypes, []);
});

test('envProblems: 프로 미리보기 값이 환경에 있으면 출시를 막는다', () => {
  const { envProblems } = require('../scripts/releaseCheck');
  assert.deepEqual(envProblems({}), []);
  assert.deepEqual(envProblems({ EXPO_PUBLIC_APP_ENV: 'production' }), []);
  for (const v of ['1', '0', '']) {
    assert.equal(envProblems({ EXPO_PUBLIC_PRO_PREVIEW: v }).length, 1, JSON.stringify(v));
    assert.match(envProblems({ EXPO_PUBLIC_PRO_PREVIEW: v })[0], /EXPO_PUBLIC_PRO_PREVIEW/);
  }
  assert.match(src('scripts/releaseCheck.js'), /\.\.\.envProblems\(\)/, '실행할 때 검사에 들어간다');
  // 출시 막음 검사는 Sentry DSN을 묻지 않는다
  assert.doesNotMatch(src('scripts/releaseCheck.js'), /SENTRY_DSN|crashProblems/);
});

test('웹 스모크가 웹 번들에 Sentry SDK가 없는지 본다', () => {
  const s = src('scripts/smoke/v4-f.js');
  assert.match(s, /__SENTRY__/);
  assert.match(s, /sentry\.javascript\.react-native/);
});
