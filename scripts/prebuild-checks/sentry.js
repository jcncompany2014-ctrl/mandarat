// V4-F 오류 수집 — @sentry/react-native/expo 플러그인이 만든 것: sentry.properties(조직 · 프로젝트, 토큰 없음),
// 본 앱의 'Upload Debug Symbols to Sentry' 단계, JS 번들 단계가 sentry-xcode.sh로 소스맵을 올린다.
// 토큰(SENTRY_AUTH_TOKEN)은 EAS 비밀 환경 변수로만 — 저장소와 ios/에 적지 않는다.

/** pbxproj에서 이름이 name인 빌드 단계 덩어리 한 개 */
function phase(pbxproj, name) {
  const head = pbxproj.indexOf(`/* ${name} */ = {`);
  if (head < 0) return null;
  const end = pbxproj.indexOf('\n\t\t};', head);
  return pbxproj.slice(head, end < 0 ? undefined : end);
}

module.exports = (ctx, assert) => {
  // sentry.properties — 조직 farmerstail · 프로젝트 mandarat, 토큰은 적지 않는다
  assert.ok(ctx.exists('sentry.properties'), 'ios/sentry.properties');
  const props = ctx.read('sentry.properties');
  assert.match(props, /^defaults\.org=farmerstail$/m, 'defaults.org');
  assert.match(props, /^defaults\.project=mandarat$/m, 'defaults.project');
  assert.doesNotMatch(props, /^\s*auth\.token\s*=/m, 'sentry.properties에 토큰이 없다');
  assert.doesNotMatch(props, /sntrys_|sntryu_/, 'sentry.properties에 토큰 값이 없다');

  // 디버그 기호 올리기 단계 — 본 앱 대상(target)의 buildPhases에 있다
  const upload = phase(ctx.pbxproj, 'Upload Debug Symbols to Sentry');
  assert.ok(upload, "'Upload Debug Symbols to Sentry' 단계");
  assert.match(upload, /sentry-xcode-debug-files\.sh/, '디버그 기호 단계가 sentry-xcode-debug-files.sh를 부른다');
  const refs = ctx.pbxproj.match(/\/\* Upload Debug Symbols to Sentry \*\/,/g) ?? [];
  assert.equal(refs.length, 1, '디버그 기호 단계는 한 대상에만');

  // JS 번들 단계가 sentry-xcode.sh를 거쳐 번들을 만든다(소스맵 올리기)
  const bundle = phase(ctx.pbxproj, 'Bundle React Native code and images');
  assert.ok(bundle, "'Bundle React Native code and images' 단계");
  assert.match(bundle, /sentry-xcode\.sh/, '번들 단계가 sentry-xcode.sh를 부른다');

  // 토큰은 pbxproj에도 없다
  assert.doesNotMatch(ctx.pbxproj, /SENTRY_AUTH_TOKEN\s*=|sntrys_|sntryu_/, 'pbxproj에 토큰이 없다');
};
