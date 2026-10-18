// V3-B 단축어 · Siri — native/ios(Swift 인텐트 + ko/ja/en .lproj)가 inline modules의 동기화 묶음으로 본 앱 대상에만 들어가는지.
// - PBXFileSystemSynchronizedRootGroup(path = ../native/ios)이 Mandarat 대상에 붙고, 위젯 확장 대상에는 없다
//   (AppShortcutsProvider는 앱에 하나뿐이어야 하고, 확장에는 App Group 밖 앱 이름 · 문구가 없다).
// - 그 묶음에 빼는 목록(exception set)이 없다 — 폴더의 Swift와 .strings가 모두 Sources · Resources로 간다.
// - 본 앱 대상에 Sources · Resources 단계가 있고, Localizable/AppShortcuts.strings가 따로 겹치지 않는다.
// - 알려진 지역에 ko · ja · en, 배포 대상 iOS 16 이상(App Intents), 본 앱 권한에 App Group.
const fs = require('fs');
const path = require('path');

const FILES = [
  'AppIntents.swift',
  'TodayStore.swift',
  ...['ko', 'ja', 'en'].flatMap((l) => [`${l}.lproj/Localizable.strings`, `${l}.lproj/AppShortcuts.strings`]),
];

/** 'UUID /* 주석 *\/ = { … };' 덩어리 — 짝 맞는 중괄호까지 */
function objectBody(pbx, uuid) {
  const start = pbx.search(new RegExp(`\\n\\s*${uuid}\\s*(/\\*[^*]*\\*/)?\\s*=\\s*\\{`));
  if (start < 0) return null;
  const i = pbx.indexOf('{', start);
  let depth = 0;
  for (let j = i; j < pbx.length; j++) {
    if (pbx[j] === '{') depth++;
    else if (pbx[j] === '}' && --depth === 0) return pbx.slice(i, j + 1);
  }
  return null;
}

module.exports = (ctx, assert) => {
  const pbx = ctx.pbxproj;

  // 폴더에 Swift 둘과 .strings 여섯
  const dir = path.join(ctx.root, 'native', 'ios');
  for (const f of FILES) assert.ok(fs.existsSync(path.join(dir, f)), `native/ios/${f} 있음`);

  // 동기화 묶음 — 빼는 목록 없이
  const groups = [...pbx.matchAll(/\n\t\t(\w+)(?: \/\* [^*]+ \*\/)? = \{\s*isa = PBXFileSystemSynchronizedRootGroup;/g)].map((m) => m[1]);
  const gid = groups.find((id) => /path = \.\.\/native\/ios;/.test(objectBody(pbx, id) ?? ''));
  assert.ok(gid, 'PBXFileSystemSynchronizedRootGroup native/ios');
  const group = [null, gid];
  const gb = objectBody(pbx, gid);
  assert.doesNotMatch(gb, /exceptions\s*=/, 'native/ios 묶음에 빼는 목록이 없다');
  assert.doesNotMatch(pbx, /PBXFileSystemSynchronizedBuildFileExceptionSet/, '동기화 묶음 예외 목록이 없다');

  // 본 앱 대상에만
  const targets = [...pbx.matchAll(/\n\t\t(\w+) \/\* ([^*]+) \*\/ = \{\s*isa = PBXNativeTarget;/g)].map((m) => ({ id: m[1], name: m[2], body: objectBody(pbx, m[1]) }));
  const main = targets.find((t) => t.name === 'Mandarat');
  assert.ok(main, 'native target Mandarat');
  const withGroup = targets.filter((t) => new RegExp(`fileSystemSynchronizedGroups = \\([^)]*\\b${group[1]}\\b`).test(t.body)).map((t) => t.name);
  assert.deepEqual(withGroup, ['Mandarat'], `native/ios를 가진 대상: ${withGroup}`);

  // 본 앱 대상의 Sources · Resources 단계 — 동기화 묶음의 Swift는 Sources로, .lproj는 Resources로 간다
  const phases = /buildPhases = \(([^)]*)\)/.exec(main.body)[1];
  for (const isa of ['PBXSourcesBuildPhase', 'PBXResourcesBuildPhase']) {
    const ids = [...phases.matchAll(/(\w{24})/g)].map((m) => m[1]);
    assert.ok(ids.some((id) => new RegExp(`isa = ${isa};`).test(objectBody(pbx, id) ?? '')), `Mandarat ${isa}`);
  }

  // 본 앱 쪽에 같은 이름의 문자열 표가 따로 없다(겹치면 "Multiple commands produce")
  const mainResources = (() => {
    const id = [...phases.matchAll(/(\w{24})/g)].map((m) => m[1]).find((x) => /isa = PBXResourcesBuildPhase;/.test(objectBody(pbx, x) ?? ''));
    return objectBody(pbx, id);
  })();
  assert.doesNotMatch(mainResources, /(Localizable|AppShortcuts)\.strings/, '본 앱 Resources에 따로 넣은 Localizable/AppShortcuts.strings가 없다');
  for (const l of ['ko', 'ja', 'en']) {
    for (const n of ['Localizable', 'AppShortcuts']) {
      assert.ok(!ctx.exists(`Mandarat/${l}.lproj/${n}.strings`) && !ctx.exists(`Mandarat/Supporting/${l}.lproj/${n}.strings`), `ios/Mandarat에 ${l}/${n}.strings가 없다`);
    }
  }

  // 알려진 지역 · 배포 대상
  const regions = /knownRegions = \(([^)]*)\)/.exec(pbx)[1];
  for (const l of ['ko', 'ja', 'en']) assert.match(regions, new RegExp(`\\b${l}\\b`), `knownRegions ${l}`);
  const configList = /buildConfigurationList = (\w+)/.exec(main.body)[1];
  const configs = [...(objectBody(pbx, configList) ?? '').matchAll(/(\w{24})/g)].map((m) => objectBody(pbx, m[1]) ?? '');
  assert.ok(configs.length >= 2, 'Mandarat Debug · Release');
  const project = /IPHONEOS_DEPLOYMENT_TARGET = "?([\d.]+)"?;/;
  for (const c of configs) {
    const own = project.exec(c);
    const v = own ? own[1] : project.exec(pbx)[1];
    assert.ok(parseFloat(v) >= 16, `Mandarat 배포 대상 iOS ${v} ≥ 16(App Intents)`);
  }

  // Swift 파일은 Expo 모듈이 아니다 — ExpoModulesProvider에 이름이 들어가지 않는다
  const classes = (ctx.autolinking.modules ?? []).flatMap((m) => (m.modules ?? []).map((x) => x.class ?? x));
  for (const c of ['AppIntents', 'TodayStore']) assert.ok(!classes.includes(c), `${c}는 모듈 클래스가 아니다`);
  for (const f of ['AppIntents.swift', 'TodayStore.swift']) {
    assert.doesNotMatch(fs.readFileSync(path.join(dir, f), 'utf8'), /func\s+definition\s*\(\s*\)\s*->\s*[\w.]*ModuleDefinition/, `${f}에 ModuleDefinition이 없다`);
  }

  // 인텐트는 앱 과정에서 돈다 — 본 앱 권한에 위젯과 같은 App Group
  assert.ok((ctx.entitlements['com.apple.security.application-groups'] ?? []).includes('group.com.jcncompany.mandarat'), '본 앱 App Group');
};
