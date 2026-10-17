// Wave 0 기본 검사 — 언어 · 링크 · 아이패드 · Live Activity · App Group · iCloud · 알림 권한 · 위젯 대상 · inline modules · Sentry.
module.exports = (ctx, assert) => {
  const p = ctx.infoPlist;
  // Info.plist
  assert.deepEqual(p.CFBundleLocalizations, ['ko', 'ja', 'en'], 'CFBundleLocalizations');
  const schemes = (p.CFBundleURLTypes ?? []).flatMap((t) => t.CFBundleURLSchemes ?? []);
  assert.ok(schemes.includes('mandarat'), `CFBundleURLSchemes: ${schemes}`);
  assert.equal((p['UISupportedInterfaceOrientations~ipad'] ?? []).length, 4, 'UISupportedInterfaceOrientations~ipad');
  assert.equal(p.UIRequiresFullScreen, false, 'UIRequiresFullScreen');
  assert.equal(p.NSSupportsLiveActivities, true, 'NSSupportsLiveActivities');
  assert.equal(p.ExpoWidgetsAppGroupIdentifier, 'group.com.jcncompany.mandarat', 'ExpoWidgetsAppGroupIdentifier');

  // 본 앱 권한
  const e = ctx.entitlements;
  assert.deepEqual(e['com.apple.security.application-groups'], ['group.com.jcncompany.mandarat'], 'App Group');
  assert.deepEqual(e['com.apple.developer.icloud-container-identifiers'], ['iCloud.com.jcncompany.mandarat'], 'icloud-container-identifiers');
  assert.deepEqual(e['com.apple.developer.ubiquity-container-identifiers'], ['iCloud.com.jcncompany.mandarat'], 'ubiquity-container-identifiers');
  assert.deepEqual(e['com.apple.developer.icloud-services'], ['CloudDocuments'], 'icloud-services');
  assert.ok('aps-environment' in e, 'aps-environment');

  // Xcode 프로젝트
  const pbx = ctx.pbxproj;
  assert.match(pbx, /\/\* ExpoWidgetsTarget \*\/ = \{\s*isa = PBXNativeTarget;/, 'native target ExpoWidgetsTarget');
  const families = [...pbx.matchAll(/TARGETED_DEVICE_FAMILY = "?([^";]+)"?;/g)].map((m) => m[1]);
  assert.ok(families.length >= 4, `TARGETED_DEVICE_FAMILY ${families.length}곳(본 앱 · 위젯 × Debug · Release)`);
  assert.ok(families.every((f) => f === '1,2'), `TARGETED_DEVICE_FAMILY: ${families}`);
  // 주석(/* native/ios */)이 붙는 자리는 버전마다 다르다 — 아이디 = { isa = …; … path = ../native/ios; } 꼴로 찾는다
  const group = /(\w+)(?: \/\* [^*]+ \*\/)? = \{\s*isa = PBXFileSystemSynchronizedRootGroup;[^]*?path = \.\.\/native\/ios;/.exec(pbx);
  assert.ok(group, 'PBXFileSystemSynchronizedRootGroup native/ios');
  const main = /\/\* Mandarat \*\/ = \{\s*isa = PBXNativeTarget;[\s\S]*?\n\t\t\};/.exec(pbx);
  assert.ok(main, 'native target Mandarat');
  assert.match(main[0], new RegExp(`fileSystemSynchronizedGroups = \\(\\s*${group[1]} `), 'native/ios는 Mandarat 대상에');
  assert.match(pbx, /name = "Upload Debug Symbols to Sentry";/, 'Sentry dSYM 업로드 단계');
  assert.ok(ctx.exists('Mandarat/Supporting/ja.lproj/InfoPlist.strings'), 'ja.lproj/InfoPlist.strings');
  assert.ok(ctx.exists('Mandarat/Supporting/en.lproj/InfoPlist.strings'), 'en.lproj/InfoPlist.strings');

  // 위젯 대상
  assert.ok(Object.keys(ctx.widgetFiles).some((f) => f.endsWith('.entitlements')), 'ExpoWidgetsTarget entitlements');
  const we = ctx.plist.parse(ctx.read('ExpoWidgetsTarget/ExpoWidgetsTarget.entitlements'));
  assert.deepEqual(we['com.apple.security.application-groups'], ['group.com.jcncompany.mandarat'], '위젯 App Group');

  // expo config · Podfile
  const ext = ctx.expoConfig.extra?.eas?.build?.experimental?.ios?.appExtensions ?? [];
  assert.equal(ext[0]?.bundleIdentifier, 'com.jcncompany.mandarat.widgets', 'appExtensions[0].bundleIdentifier');
  const pp = ctx.podfileProperties;
  assert.equal(pp['expo.inlineModules.watchedDirectories'], JSON.stringify(['native/ios']), 'expo.inlineModules.watchedDirectories');
  assert.ok('expo.inlineModules.xcodeProjectTargets' in pp, 'expo.inlineModules.xcodeProjectTargets');
  assert.doesNotMatch(ctx.podfile, /^\s*source\s+['"]/m, 'Podfile에 따로 더한 source 줄이 없다');

  // 자동 연결 — 위젯 · 알림 · 인쇄 · 언어가 iOS에 붙는다
  const mods = ctx.autolinking.modules.map((m) => m.packageName);
  for (const m of ['expo-widgets', '@expo/ui', 'expo-notifications', 'expo-print', 'expo-localization']) assert.ok(mods.includes(m), `autolinking ${m}`);
};
