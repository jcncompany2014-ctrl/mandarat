// V2-C 위젯 — 위젯 고르기 화면의 현지화 문자열(plugins/withWidgetStrings.js)과 위젯 확장 대상의 모양.
// - ExpoWidgetsTarget/{ko,ja,en}.lproj/Localizable.strings에 열쇠(ko 원문) 두 개가 있다.
// - 그 파일들이 pbxproj의 Localizable.strings 변형 묶음에 있고, 그 묶음이 ExpoWidgetsTarget의 Resources 단계에 들어 있다.
// - 위젯 확장 Info.plist가 있고, 위젯 대상의 TARGETED_DEVICE_FAMILY는 "1,2"(아이패드도).
// - 위젯 확장의 PrivacyInfo.xcprivacy가 있고(1C8F.1을 밝힌다), 위젯 Resources 단계에 들어 있다(R3-1).
// - 위젯 대상의 표시 이름(INFOPLIST_KEY_CFBundleDisplayName)이 만다라트(R3-5).
const { widgetStrings, DISPLAY_NAME } = require('../../plugins/withWidgetStrings');

const TARGET = 'ExpoWidgetsTarget';

/** pbxproj에서 'UUID /* 주석 *\/ = { … };' 덩어리 하나 — 짝 맞는 중괄호까지 */
function objectBody(pbx, uuid) {
  const start = pbx.search(new RegExp(`\\n\\s*${uuid}\\s*(/\\*[^*]*\\*/)?\\s*=\\s*\\{`));
  if (start < 0) return null;
  let i = pbx.indexOf('{', start);
  let depth = 0;
  for (let j = i; j < pbx.length; j++) {
    if (pbx[j] === '{') depth++;
    else if (pbx[j] === '}' && --depth === 0) return pbx.slice(i, j + 1);
  }
  return null;
}

module.exports = (ctx, assert) => {
  const expected = widgetStrings();
  for (const l of ['ko', 'ja', 'en']) {
    const rel = `${TARGET}/${l}.lproj/Localizable.strings`;
    assert.ok(ctx.exists(rel), `${rel} 있음`);
    assert.equal(ctx.read(rel), expected[l], `${rel} 내용`);
    assert.match(ctx.read(rel), /^"오늘" = ".+";\n"오늘 할 일과 남은 수를 보여 줘요\." = ".+";\n$/, `${rel} 열쇠`);
  }

  const pbx = ctx.pbxproj;
  // 위젯 대상의 빌드 단계 목록에서 Resources 단계
  const targetUuid = (pbx.match(new RegExp(`\\n\\s*([0-9A-F]{24}) /\\* ${TARGET} \\*/ = \\{\\s*isa = PBXNativeTarget;`)) || [])[1];
  assert.ok(targetUuid, 'ExpoWidgetsTarget 대상');
  const target = objectBody(pbx, targetUuid);
  const phaseUuids = [...(target.match(/buildPhases = \(([^)]*)\)/) || ['', ''])[1].matchAll(/([0-9A-F]{24})/g)].map((m) => m[1]);
  const resources = phaseUuids.map((u) => objectBody(pbx, u)).find((b) => b && /isa = PBXResourcesBuildPhase;/.test(b));
  assert.ok(resources, 'ExpoWidgetsTarget의 PBXResourcesBuildPhase');

  // Resources 단계의 빌드 파일 → Localizable.strings 변형 묶음 → ko · ja · en 파일
  const buildFiles = [...resources.matchAll(/([0-9A-F]{24}) \/\* Localizable\.strings in Resources \*\//g)].map((m) => m[1]);
  assert.equal(buildFiles.length, 1, 'Resources 안의 Localizable.strings 한 번');
  const variantUuid = (pbx.match(new RegExp(`${buildFiles[0]} /\\* Localizable\\.strings in Resources \\*/ = \\{isa = PBXBuildFile; fileRef = ([0-9A-F]{24})`)) || [])[1];
  assert.ok(variantUuid, 'Localizable.strings 빌드 파일');
  const variant = objectBody(pbx, variantUuid);
  assert.match(variant, /isa = PBXVariantGroup;/, 'Localizable.strings는 변형 묶음');
  for (const l of ['ko', 'ja', 'en']) {
    const ref = (variant.match(new RegExp(`([0-9A-F]{24}) /\\* ${l} \\*/`)) || [])[1];
    assert.ok(ref, `변형 묶음의 ${l}`);
    assert.match(pbx, new RegExp(`${ref} /\\* ${l} \\*/ = \\{isa = PBXFileReference;[^}]*path = "${l}\\.lproj/Localizable\\.strings";`), `${l} 파일 경로`);
  }
  // 변형 묶음은 위젯 파일 묶음(ExpoWidgetsTarget) 안에
  const groupUuid = (pbx.match(new RegExp(`\\n\\s*([0-9A-F]{24}) /\\* ${TARGET} \\*/ = \\{\\s*isa = PBXGroup;`)) || [])[1];
  assert.ok(groupUuid && objectBody(pbx, groupUuid).includes(variantUuid), '변형 묶음이 ExpoWidgetsTarget 묶음 안에');

  const regions = (pbx.match(/knownRegions = \(([^)]*)\)/) || ['', ''])[1];
  for (const l of ['ko', 'ja', 'en']) assert.match(regions, new RegExp(`\\b${l}\\b`), `knownRegions ${l}`);

  // 확장 Info.plist와 기기 종류
  assert.ok(ctx.exists(`${TARGET}/Info.plist`), '위젯 확장 Info.plist');
  const ext = ctx.plist.parse(ctx.read(`${TARGET}/Info.plist`));
  assert.equal(ext.NSExtension && ext.NSExtension.NSExtensionPointIdentifier, 'com.apple.widgetkit-extension', 'NSExtensionPointIdentifier');
  const confList = (target.match(/buildConfigurationList = ([0-9A-F]{24})/) || [])[1];
  const configs = [...(objectBody(pbx, confList).match(/buildConfigurations = \(([^)]*)\)/) || ['', ''])[1].matchAll(/([0-9A-F]{24})/g)].map((m) => m[1]);
  assert.ok(configs.length >= 2, '위젯 대상 빌드 설정(Debug · Release)');
  for (const c of configs) assert.match(objectBody(pbx, c), /TARGETED_DEVICE_FAMILY = "1,2";/, `TARGETED_DEVICE_FAMILY ${c}`);
  for (const c of configs) {
    const name = (objectBody(pbx, c).match(/INFOPLIST_KEY_CFBundleDisplayName = ("?)([^";\n]*)\1;/) || [])[2];
    assert.equal(name, DISPLAY_NAME, `INFOPLIST_KEY_CFBundleDisplayName ${c}`);
  }

  // 개인정보 매니페스트 — 파일이 있고, 읽히고, App Group UserDefaults(1C8F.1)를 밝히고, 위젯 Resources 단계에 한 번
  const privacyRel = `${TARGET}/PrivacyInfo.xcprivacy`;
  assert.ok(ctx.exists(privacyRel), `${privacyRel} 있음`);
  const pm = ctx.plist.parse(ctx.read(privacyRel));
  assert.equal(pm.NSPrivacyTracking, false, '위젯 NSPrivacyTracking false');
  const ud = (pm.NSPrivacyAccessedAPITypes || []).find((t) => t.NSPrivacyAccessedAPIType === 'NSPrivacyAccessedAPICategoryUserDefaults');
  assert.ok(ud && ud.NSPrivacyAccessedAPITypeReasons.includes('1C8F.1'), '위젯 매니페스트 UserDefaults 1C8F.1');
  const privacyBuild = [...resources.matchAll(/([0-9A-F]{24}) \/\* PrivacyInfo\.xcprivacy in Resources \*\//g)].map((m) => m[1]);
  assert.equal(privacyBuild.length, 1, 'Resources 안의 PrivacyInfo.xcprivacy 한 번');
  const privacyRef = (pbx.match(new RegExp(`${privacyBuild[0]} /\\* PrivacyInfo\\.xcprivacy in Resources \\*/ = \\{isa = PBXBuildFile; fileRef = ([0-9A-F]{24})`)) || [])[1];
  assert.ok(privacyRef, 'PrivacyInfo.xcprivacy 빌드 파일');
  assert.match(pbx, new RegExp(`${privacyRef} /\\* PrivacyInfo\\.xcprivacy \\*/ = \\{isa = PBXFileReference;[^}]*path = PrivacyInfo\\.xcprivacy;`), 'PrivacyInfo.xcprivacy 파일 참조');
  assert.ok(objectBody(pbx, groupUuid).includes(privacyRef), 'PrivacyInfo.xcprivacy가 ExpoWidgetsTarget 묶음 안에');
};
