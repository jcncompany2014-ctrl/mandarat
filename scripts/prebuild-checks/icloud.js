// V3-F iCloud — 로컬 모듈(modules/icloud-sync)이 iOS에 자동으로 붙고, 본 앱 권한에 iCloud 컨테이너가 있다.
// 컨테이너는 Info.plist에 NSUbiquitousContainers로 드러내지 않는다 — 파일 앱에 폴더가 보이지 않게(숨은 Data 자리).
module.exports = (ctx, assert) => {
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
