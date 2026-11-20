// 서체 — expo-font 플러그인(app.json의 fonts)이 Pretendard 파일 넷을 본 앱에 싣는다: Info.plist UIAppFonts와 본 앱 대상의 Resources.
// 실린 서체는 PostScript 이름(Pretendard-Regular …)으로 곧바로 쓰여, 앱이 뜰 때 서체 파일을 읽느라 첫 화면을 기다리지 않는다(App.tsx).
// 위젯 대상에는 싣지 않는다(위젯 · Live Activity는 시스템 글꼴).
const FONTS = ['Pretendard-Regular.otf', 'Pretendard-Medium.otf', 'Pretendard-SemiBold.otf', 'Pretendard-Bold.otf'];

module.exports = (ctx, assert) => {
  assert.deepEqual(ctx.infoPlist.UIAppFonts, FONTS, 'UIAppFonts');
  const pbx = ctx.pbxproj;
  const phases = [...pbx.matchAll(/(\w{24}) \/\* Resources \*\/ = \{\s*isa = PBXResourcesBuildPhase;[\s\S]*?files = \(([\s\S]*?)\);/g)];
  const targets = [...pbx.matchAll(/\/\* ([\w ]+) \*\/ = \{\s*isa = PBXNativeTarget;[\s\S]*?buildPhases = \(([\s\S]*?)\);/g)];
  const fontsOf = (target) => {
    const t = targets.find((m) => m[1] === target);
    assert.ok(t, `native target ${target}`);
    const phase = phases.find((p) => t[2].includes(p[1]));
    assert.ok(phase, `${target}: Resources`);
    return [...phase[2].matchAll(/Pretendard-\w+\.otf/g)].map((m) => m[0]);
  };
  assert.deepEqual(fontsOf('Mandarat').sort(), [...FONTS].sort(), '본 앱 대상의 Resources에 서체 넷');
  assert.deepEqual(fontsOf('ExpoWidgetsTarget'), [], '위젯 대상에는 서체를 싣지 않는다');
  for (const f of FONTS) {
    assert.match(pbx, new RegExp(`path = "?\\.\\./node_modules/pretendard/dist/public/static/${f.replace('.', '\\.')}"?;`), `${f}: pretendard 패키지의 파일`);
  }
};

module.exports.FONTS = FONTS;
