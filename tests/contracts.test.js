// v2 공통 약속(src/lib/contracts.ts)이 app.json · expo-widgets · 저장 키와 어긋나지 않는지.
// 위젯·Siri(Swift)·iCloud는 이 값을 글자 그대로 읽으므로 한쪽만 바뀌면 기기에서야 드러난다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../src/lib/contracts');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const app = JSON.parse(read('app.json')).expo;
const widgets = app.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-widgets')[1];

test('App Group은 expo-widgets의 groupIdentifier와 같다', () => {
  assert.equal(C.APP_GROUP, widgets.groupIdentifier);
});

test('iCloud 컨테이너는 entitlements의 두 키에 있다', () => {
  assert.ok(app.ios.entitlements['com.apple.developer.icloud-container-identifiers'].includes(C.ICLOUD_CONTAINER));
  assert.ok(app.ios.entitlements['com.apple.developer.ubiquity-container-identifiers'].includes(C.ICLOUD_CONTAINER));
});

test('위젯 이름과 타임라인 키 — expo-widgets가 같은 키 꼴을 쓴다', () => {
  assert.equal(C.WIDGET_KIND, widgets.widgets[0].name);
  assert.equal(C.WIDGET_TIMELINE_KEY, `__expo_widgets_${C.WIDGET_KIND}_timeline`);
  // V3-B의 Swift가 이 키를 바로 읽는다 — expo-widgets가 이름을 바꾸면 여기서 실패해야 한다
  const plugin = read('node_modules/expo-widgets/plugin/build/ios/withWidgetSourceFiles.js');
  assert.match(plugin, /__expo_widgets_\$\{[^}]+\}_timeline/);
  const intent = read('node_modules/expo-widgets/ios/Widgets/AppIntent.swift');
  assert.match(intent, /__expo_widgets_\\\([^)]+\)_timeline/);
});

test('링크 scheme은 app.json scheme', () => {
  assert.equal(C.LINK_SCHEME, app.scheme);
});

test('프로 상품 아이디는 번들 아이디로 시작한다', () => {
  assert.ok(C.PRO_PRODUCT_ID.startsWith(`${app.ios.bundleIdentifier}.`));
  assert.deepEqual([...C.PRO_FEATURES], ['paper', 'widgetStyle', 'printSize', 'archive']);
});

test('기기 저장 키는 mandarat:로 시작하고 문서·저장본 키와 겹치지 않는다', () => {
  const values = Object.values(C.STORE_KEYS);
  assert.equal(new Set(values).size, values.length);
  for (const v of values) {
    assert.ok(v.startsWith('mandarat:'), v);
    assert.notEqual(v, 'mandarat:doc:v1');
    assert.equal(v.startsWith('mandarat:snap:'), false, v);
  }
});

test('인쇄 용지 — 무료는 A4 · Letter', () => {
  assert.deepEqual([...C.PRINT_PAPERS], ['A4', 'Letter', 'A3', 'A5', 'B5']);
  assert.deepEqual([...C.FREE_PAPERS], ['A4', 'Letter']);
  for (const p of C.FREE_PAPERS) assert.ok(C.PRINT_PAPERS.includes(p));
});

test('EXPO_PUBLIC_PRO_PREVIEW는 빌드·배포 설정과 .env에 없다(웹 스크린샷 전용)', () => {
  for (const f of ['vercel.json', 'eas.json']) assert.equal(read(f).includes('EXPO_PUBLIC_PRO_PREVIEW'), false, f);
  for (const f of fs.readdirSync(ROOT).filter((n) => n.startsWith('.env'))) {
    assert.equal(read(f).includes('EXPO_PUBLIC_PRO_PREVIEW'), false, f);
  }
  const eas = JSON.parse(read('eas.json'));
  for (const [name, profile] of Object.entries(eas.build)) {
    assert.equal('EXPO_PUBLIC_PRO_PREVIEW' in (profile.env ?? {}), false, name);
  }
});

test('eas.json: 미리보기 · e2e · 출시 — 출시는 Sentry 업로드 실패를 넘기지 않는다', () => {
  const eas = JSON.parse(read('eas.json'));
  assert.deepEqual(Object.keys(eas.build), ['preview', 'e2e', 'production']);
  assert.equal(eas.build.preview.env.SENTRY_ALLOW_FAILURE, 'true');
  assert.equal(eas.build.e2e.ios.simulator, true);
  assert.equal(eas.build.e2e.env.SENTRY_DISABLE_AUTO_UPLOAD, 'true');
  assert.equal('SENTRY_ALLOW_FAILURE' in eas.build.production.env, false);
  assert.equal(eas.build.production.autoIncrement, true);
});
