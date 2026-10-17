// V3-F iCloud — 로컬 모듈(modules/icloud-sync)이 iOS에 자동으로 붙고, 본 앱 권한에 iCloud 컨테이너가 있다.
// 컨테이너는 Info.plist에 NSUbiquitousContainers로 드러내지 않는다 — 파일 앱에 폴더가 보이지 않게(숨은 Data 자리).
// 복제본 파일의 시각은 NSMetadataItem 속성으로만 읽는다 — ubiquity 컨테이너의 파일 시각(URLResourceKey 날짜 · attributesOfItem)은
// 개인정보 매니페스트의 어떤 이유(C617.1 포함)로도 밝힐 수 없다(R3-2). Swift 소스에 그런 호출이 들어오면 멈춘다.
const fs = require('fs');
const path = require('path');

/** ubiquity URL에 쓰면 매니페스트 이유가 없는 파일 시각 API */
const TIMESTAMP_API = /contentModificationDateKey|creationDateKey|attributesOfItem|modificationDate/;

module.exports = (ctx, assert) => {
  const swift = fs.readFileSync(path.join(ctx.root, 'modules', 'icloud-sync', 'ios', 'ICloudSyncModule.swift'), 'utf8');
  // 주석은 빼고 본다 — 하지 말라는 설명에 이름이 들어갈 수 있다
  const hit = swift.split('\n').findIndex((l) => TIMESTAMP_API.test(l.replace(/\/\/.*$/, '')));
  assert.equal(hit, -1, `ICloudSyncModule.swift:${hit + 1} 파일 시각 API — NSMetadataItem 속성으로 읽어 주세요`);

  const mod = ctx.autolinking.modules.find((m) => m.packageName === 'icloud-sync');
  assert.ok(mod, 'autolinking icloud-sync');
  assert.deepEqual(mod.modules.map((m) => m.class), ['ICloudSyncModule'], 'icloud-sync 모듈 클래스');
  assert.deepEqual(mod.pods.map((p) => p.podName), ['ICloudSync'], 'icloud-sync pod');
  assert.match(mod.pods[0].podspecDir.split('\\').join('/'), /\/modules\/icloud-sync\/ios$/, 'icloud-sync podspec 자리');

  const e = ctx.entitlements;
  const container = 'iCloud.com.jcncompany.mandarat';
  assert.deepEqual(e['com.apple.developer.icloud-container-identifiers'], [container], 'icloud-container-identifiers');
  assert.deepEqual(e['com.apple.developer.ubiquity-container-identifiers'], [container], 'ubiquity-container-identifiers');
  assert.deepEqual(e['com.apple.developer.icloud-services'], ['CloudDocuments'], 'icloud-services');
  assert.equal(ctx.infoPlist.NSUbiquitousContainers, undefined, 'NSUbiquitousContainers가 없다(폴더를 숨긴다)');
};
