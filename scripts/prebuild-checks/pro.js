// V1-E 프로 — StoreKit 로컬 모듈(modules/pro-store)이 iOS에 자동으로 붙고, 따로 더한 pod 저장소 · 권한이 없다.
module.exports = (ctx, assert) => {
  const mod = ctx.autolinking.modules.find((m) => m.packageName === 'pro-store');
  assert.ok(mod, 'autolinking pro-store');
  assert.deepEqual(mod.modules.map((m) => m.class), ['ProStoreModule'], 'pro-store 모듈 클래스');
  assert.deepEqual(mod.pods.map((p) => p.podName), ['ProStore'], 'pro-store pod');
  assert.match(mod.pods[0].podspecDir.split('\\').join('/'), /\/modules\/pro-store\/ios$/, 'pro-store podspec 자리');

  // Podfile에 따로 더한 source 줄이 없다(로컬 pod는 자동 연결로 온다)
  assert.doesNotMatch(ctx.podfile, /^\s*source\s+['"]/m, 'Podfile source 줄');

  // 앱 안 결제는 권한(entitlement)이 필요 없다 — 본 앱 권한은 Wave 0 그대로
  const keys = Object.keys(ctx.entitlements).sort();
  assert.deepEqual(keys, [
    'aps-environment',
    'com.apple.developer.icloud-container-identifiers',
    'com.apple.developer.icloud-services',
    'com.apple.developer.ubiquity-container-identifiers',
    'com.apple.security.application-groups',
  ], `본 앱 권한: ${keys}`);
};
