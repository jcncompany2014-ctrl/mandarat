// 위젯 고르기 화면의 현지화(plugins/withWidgetStrings.js) — Localizable.strings 내용과 pbxproj 손질.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const plugin = require('../plugins/withWidgetStrings');

const app = JSON.parse(fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8')).expo;
const widget = app.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-widgets')[1].widgets.find((w) => w.name === 'TodayWidget');

/** .strings 한 줄씩 → [열쇠, 값] (따옴표 풀기) */
function parse(text) {
  const un = (s) => s.replace(/\\(["\\])/g, '$1').replace(/\\n/g, '\n');
  return [...text.matchAll(/^"((?:[^"\\]|\\.)*)" = "((?:[^"\\]|\\.)*)";$/gm)].map((m) => [un(m[1]), un(m[2])]);
}

test('열쇠는 app.json의 displayName · description(Swift에 그대로 쓰이는 글자)', () => {
  const ko = plugin.loadCatalog('ko');
  assert.equal(ko.galleryName, widget.displayName);
  assert.equal(ko.galleryDesc, widget.description);
  const s = plugin.widgetStrings();
  assert.deepEqual(Object.keys(s).sort(), ['en', 'ja', 'ko']);
  for (const l of ['ko', 'ja', 'en']) {
    const pairs = parse(s[l]);
    assert.equal(pairs.length, 2, `${l} 두 줄`);
    assert.deepEqual(pairs.map((p) => p[0]), [widget.displayName, widget.description], `${l} 열쇠`);
    const c = plugin.loadCatalog(l);
    assert.deepEqual(pairs.map((p) => p[1]), [c.galleryName, c.galleryDesc], `${l} 값`);
    assert.equal(s[l].split('\n').filter(Boolean).length, 2, `${l} 줄 수`);
  }
  assert.match(s.en, /= "Today";/);
  assert.match(s.ja, /= "今日";/);
});

test('따옴표 · 역빗금 · 줄바꿈을 막는다', () => {
  assert.equal(plugin.escapeStrings('a"b\\c\nd'), 'a\\"b\\\\c\\nd');
  const text = plugin.buildStrings([['열쇠 "따옴"', 'C:\\길 "값"']]);
  assert.equal(text, '"열쇠 \\"따옴\\"" = "C:\\\\길 \\"값\\"";\n');
  assert.deepEqual(parse(text), [['열쇠 "따옴"', 'C:\\길 "값"']]);
  // 카탈로그에 따옴표가 들어와도 줄 모양이 깨지지 않는다
  const s = plugin.widgetStrings({
    ko: { galleryName: '오늘', galleryDesc: '설명' },
    ja: { galleryName: '「今日」', galleryDesc: 'x' },
    en: { galleryName: 'Say "hi"', galleryDesc: 'back\\slash' },
  });
  assert.deepEqual(parse(s.en), [['오늘', 'Say "hi"'], ['설명', 'back\\slash']]);
});

test('pbxproj — 위젯 대상에 Resources 단계 · 변형 묶음 · 개인정보 매니페스트 · 표시 이름 · knownRegions, 두 번 돌아도 한 벌', () => {
  // xcode는 @expo/config-plugins가 쓰는 것을 그대로(직접 의존성이 아니다)
  const xcode = require(require.resolve('xcode', { paths: [path.dirname(require.resolve('@expo/config-plugins/package.json'))] }));
  const proj = xcode.project('/dev/null');
  // 본 앱 + expo-widgets가 만든 모양(Resources 단계가 없는 확장 대상)
  proj.hash = { project: { objects: {
    PBXProject: { P1: { isa: 'PBXProject', targets: [{ value: 'T1' }, { value: 'T2' }], knownRegions: ['en', 'Base'], mainGroup: 'G0' } },
    PBXNativeTarget: {
      T1: { isa: 'PBXNativeTarget', name: 'Mandarat', buildPhases: [{ value: 'R1', comment: 'Resources' }] }, T1_comment: 'Mandarat',
      T2: { isa: 'PBXNativeTarget', name: 'ExpoWidgetsTarget', buildPhases: [{ value: 'S2', comment: 'Sources' }], buildConfigurationList: 'L2' }, T2_comment: 'ExpoWidgetsTarget',
    },
    XCConfigurationList: { L2: { isa: 'XCConfigurationList', buildConfigurations: [{ value: 'C1', comment: 'Debug' }, { value: 'C2', comment: 'Release' }] } },
    XCBuildConfiguration: {
      C1: { isa: 'XCBuildConfiguration', name: 'Debug', buildSettings: { INFOPLIST_KEY_CFBundleDisplayName: 'ExpoWidgetsTarget' } },
      C2: { isa: 'XCBuildConfiguration', name: 'Release', buildSettings: { INFOPLIST_KEY_CFBundleDisplayName: 'ExpoWidgetsTarget' } },
      C9: { isa: 'XCBuildConfiguration', name: 'Release', buildSettings: { INFOPLIST_KEY_CFBundleDisplayName: 'Mandarat' } },
    },
    PBXResourcesBuildPhase: { R1: { isa: 'PBXResourcesBuildPhase', files: [] }, R1_comment: 'Resources' },
    PBXSourcesBuildPhase: { S2: { isa: 'PBXSourcesBuildPhase', files: [] }, S2_comment: 'Sources' },
    PBXGroup: { G0: { isa: 'PBXGroup', children: [{ value: 'G1' }] }, G1: { isa: 'PBXGroup', children: [], name: 'ExpoWidgetsTarget', path: 'ExpoWidgetsTarget' }, G1_comment: 'ExpoWidgetsTarget' },
    PBXFileReference: {}, PBXBuildFile: {},
  } } };
  proj.getFirstProject = () => ({ uuid: 'P1', firstProject: proj.hash.project.objects.PBXProject.P1 });

  plugin.addWidgetStrings(proj);
  plugin.addWidgetStrings(proj);
  const o = proj.hash.project.objects;
  // 본 앱의 Resources는 그대로
  assert.deepEqual(o.PBXResourcesBuildPhase.R1.files, []);
  const phases = o.PBXNativeTarget.T2.buildPhases.filter((p) => o.PBXResourcesBuildPhase[p.value]);
  assert.equal(phases.length, 1, '위젯 대상의 Resources 단계 하나');
  const files = o.PBXResourcesBuildPhase[phases[0].value].files;
  assert.equal(files.length, 2, 'Localizable.strings · PrivacyInfo.xcprivacy');
  const variantKey = o.PBXBuildFile[files[0].value].fileRef;
  const privacyKey = o.PBXBuildFile[files[1].value].fileRef;
  assert.deepEqual(o.PBXFileReference[privacyKey], { isa: 'PBXFileReference', lastKnownFileType: 'text.xml', path: 'PrivacyInfo.xcprivacy', sourceTree: '"<group>"' });
  const variant = o.PBXVariantGroup[variantKey];
  assert.equal(variant.name, 'Localizable.strings');
  assert.deepEqual(variant.children.map((c) => o.PBXFileReference[c.value].path), ['"ko.lproj/Localizable.strings"', '"ja.lproj/Localizable.strings"', '"en.lproj/Localizable.strings"']);
  assert.deepEqual(o.PBXGroup.G1.children.map((c) => c.value), [variantKey, privacyKey], '위젯 파일 묶음 안에 한 번씩');
  assert.deepEqual(o.PBXProject.P1.knownRegions, ['en', 'Base', 'ko', 'ja']);
  assert.equal(Object.keys(o.PBXBuildFile).filter((k) => !k.endsWith('_comment')).length, 2);
  // 표시 이름은 위젯 대상의 설정에만
  assert.equal(o.XCBuildConfiguration.C1.buildSettings.INFOPLIST_KEY_CFBundleDisplayName, '"만다라트"');
  assert.equal(o.XCBuildConfiguration.C2.buildSettings.INFOPLIST_KEY_CFBundleDisplayName, '"만다라트"');
  assert.equal(o.XCBuildConfiguration.C9.buildSettings.INFOPLIST_KEY_CFBundleDisplayName, 'Mandarat');
  assert.equal(plugin.DISPLAY_NAME, app.ios.infoPlist.CFBundleDisplayName, '본 앱 이름과 같다');
});

test('위젯 확장의 개인정보 매니페스트 — 추적 없음 · 모으는 자료 없음 · 이유 있는 API 셋', () => {
  const plist = require('@expo/plist').default;
  const m = plist.parse(plugin.privacyManifest());
  assert.equal(m.NSPrivacyTracking, false);
  assert.deepEqual(m.NSPrivacyTrackingDomains, []);
  assert.deepEqual(m.NSPrivacyCollectedDataTypes, []);
  assert.deepEqual(m.NSPrivacyAccessedAPITypes.map((t) => [t.NSPrivacyAccessedAPIType, t.NSPrivacyAccessedAPITypeReasons]), [
    ['NSPrivacyAccessedAPICategoryUserDefaults', ['1C8F.1', 'CA92.1']],
    ['NSPrivacyAccessedAPICategoryFileTimestamp', ['C617.1']],
    ['NSPrivacyAccessedAPICategorySystemBootTime', ['35F9.1']],
  ]);
});

test('위젯 대상이 없으면 멈춘다(플러그인 순서가 틀렸을 때)', () => {
  const proj = { hash: { project: { objects: {} } }, findTargetKey: () => null };
  assert.throws(() => plugin.addWidgetStrings(proj), /ExpoWidgetsTarget/);
});
