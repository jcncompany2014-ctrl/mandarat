// 앱을 여는 길 — 서체는 빌드에 싣고(expo-font 플러그인), 화면 모드는 문서 · 언어처럼 모듈을 불러올 때부터 읽는다.
// 기기에서만 드러나는 설정이라 이름 하나가 어긋나면 조용히 느려지거나(실행 중 불러오기) 시스템 서체로 그려진다 — 파일에서 읽어 맞춰 본다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const app = JSON.parse(read('app.json')).expo;
const { PRETENDARD, faceFor } = require('../src/theme/fonts');

/** OpenType name 표에서 nameID 하나(윈도우 · 유니코드 판)를 읽는다 */
function otfName(file, wanted) {
  const b = fs.readFileSync(file);
  const numTables = b.readUInt16BE(4);
  let off = -1;
  for (let i = 0; i < numTables; i++) {
    const p = 12 + i * 16;
    if (b.toString('ascii', p, p + 4) === 'name') off = b.readUInt32BE(p + 8);
  }
  assert.ok(off > 0, `${file}: name 표`);
  const count = b.readUInt16BE(off + 2);
  const strings = off + b.readUInt16BE(off + 4);
  for (let i = 0; i < count; i++) {
    const r = off + 6 + i * 12;
    const platform = b.readUInt16BE(r);
    if (b.readUInt16BE(r + 6) !== wanted || (platform !== 3 && platform !== 0)) continue;
    const raw = b.subarray(strings + b.readUInt16BE(r + 10), strings + b.readUInt16BE(r + 10) + b.readUInt16BE(r + 8));
    let s = '';
    for (let j = 0; j + 1 < raw.length; j += 2) s += String.fromCharCode(raw.readUInt16BE(j));
    return s;
  }
  return null;
}

const fontEntry = app.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-font');
/** App.tsx가 불러오는 서체 — { 이름: 패키지 안 경로 } */
function requiredFonts() {
  const out = {};
  for (const m of read('App.tsx').matchAll(/'(Pretendard-[A-Za-z]+)': require\('(pretendard\/dist\/public\/static\/[A-Za-z-]+\.otf)'\)/g)) out[m[1]] = m[2];
  return out;
}

test('서체: expo-font 플러그인이 앱이 쓰는 Pretendard 파일 넷을 빌드에 싣는다 — App.tsx가 불러오는 바로 그 파일', () => {
  assert.ok(fontEntry, 'expo-font 플러그인 설정(fonts)이 있어야 한다');
  assert.deepEqual(Object.keys(fontEntry[1]), ['fonts']);
  const fonts = fontEntry[1].fonts;
  const required = requiredFonts();
  assert.deepEqual(Object.keys(required).sort(), Object.values(PRETENDARD).sort(), 'App.tsx는 쓰는 굵기 넷을 모두 불러온다');
  // 플러그인의 경로는 프로젝트 뿌리에서(문서: relative to the project root) — 같은 패키지 파일
  assert.deepEqual([...fonts].sort(), Object.values(required).map((p) => `./node_modules/${p}`).sort());
  for (const f of fonts) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
  // 쓰지 않는 굵기(ExtraBold 등)는 싣지 않는다
  assert.equal(fonts.length, 4);
  assert.equal(fonts.some((f) => /ExtraBold|Black|Light|Thin/.test(f)), false);
});

test('서체: 실은 파일의 PostScript 이름이 앱이 쓰는 fontFamily와 글자 하나까지 같다(iOS는 이 이름으로 찾는다)', () => {
  const used = new Set([undefined, 'normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'].flatMap((w) => [faceFor(w), faceFor(w, true)]));
  const embedded = new Set();
  for (const f of fontEntry[1].fonts) {
    const file = path.join(ROOT, f);
    const ps = otfName(file, 6);
    // 파일 이름(확장자 빼고)도 같다 — 안드로이드는 파일 이름이 fontFamily가 된다
    assert.equal(ps, path.basename(f, '.otf'), f);
    // 한 집안(Pretendard)으로 묶인다 — iOS의 UIFont.fontNames(forFamilyName:)가 넷을 함께 돌려준다
    assert.equal(otfName(file, 16) ?? otfName(file, 1), 'Pretendard', f);
    embedded.add(ps);
  }
  assert.deepEqual([...embedded].sort(), Object.values(PRETENDARD).sort());
  for (const face of used) assert.ok(embedded.has(face), `${face}: 빌드에 싣지 않은 굵기를 쓴다`);
  // 역할(ROLE)은 이 이름을 fontFamily로 그대로 쓴다
  assert.match(read('src/theme/type.ts'), /const out: TextStyle = \{ fontFamily: PRETENDARD\[face\], fontSize, lineHeight, letterSpacing \};/);
});

test('서체: 실행 중 불러오기(useFonts)는 그대로 둔다 — 웹은 늘 이 길, 기기에서는 이름이 어긋났을 때의 길', () => {
  const s = read('App.tsx');
  assert.match(s, /const \[fontsLoaded, fontError\] = useFonts\(FONT_FILES\);/);
  assert.match(s, /if \(!fontsLoaded && !fontError\) return <Splash \/>/);
  // 설치된 expo-font: 실린 서체는 처음부터 '불러옴'으로 답하고 다시 불러오지 않는다
  const hooks = read('node_modules/expo-font/build/FontHooks.js');
  assert.match(hooks, /const \[loaded, setLoaded\] = useState\(\s*(?:\/\/[^\n]*\n\s*)*isMapLoaded\(map\)\);/);
  const font = read('node_modules/expo-font/build/Font.js');
  assert.match(font, /return isLoadedNative\(fontFamily\);/);
  assert.match(font, /if \(isLoaded\(fontFamily\)\) \{\s*return;\s*\}/);
  assert.match(read('node_modules/expo-font/build/memory.js'), /const loadedNativeFonts = ExpoFontLoader\.getLoadedFonts\(\);/);
  // iOS: Info.plist UIAppFonts의 파일에서 서체 이름을 읽는다 · 플러그인은 그 목록에 파일 이름을 적는다
  assert.match(read('node_modules/expo-font/ios/FontUtils.swift'), /Bundle\.main\.object\(forInfoDictionaryKey: "UIAppFonts"\)/);
  const plugin = read('node_modules/expo-font/plugin/build/withFontsIos.js');
  assert.match(plugin, /config\.modResults\.UIAppFonts = Array\.from\(new Set\(allFonts\)\);/);
  assert.match(read('node_modules/expo-font/plugin/build/withFonts.js'), /const iosFonts = \[\.\.\.\(props\.fonts \?\? \[\]\), \.\.\.\(props\.ios\?\.fonts \?\? \[\]\)\];/);
});

test('프리빌드 검사(scripts/prebuild-checks/fonts.js): UIAppFonts와 본 앱 대상의 Resources를 본다', () => {
  const check = require('../scripts/prebuild-checks/fonts');
  assert.equal(typeof check, 'function');
  assert.deepEqual([...check.FONTS].sort(), fontEntry[1].fonts.map((f) => path.basename(f)).sort());
  // 검사기 자체 — 맞는 프로젝트는 지나가고, 서체가 빠지거나 위젯 대상에 실리면 걸린다
  const ref = (f) => `\t\tAAAA000000000000000000${check.FONTS.indexOf(f)}A /* ${f} */ = {isa = PBXFileReference; name = "${f}"; path = "../node_modules/pretendard/dist/public/static/${f}"; sourceTree = "<group>"; };`;
  const pbx = (appFonts, widgetFonts) => [
    ...check.FONTS.map(ref),
    '\t\t13B07F861A680F5B00A75B9A /* Mandarat */ = {\n\t\t\tisa = PBXNativeTarget;\n\t\t\tbuildPhases = (\n\t\t\t\t13B07F8E1A680F5B00A75B9A /* Resources */,\n\t\t\t);\n\t\t};',
    '\t\t941A3A9D36314871B3DD9D00 /* ExpoWidgetsTarget */ = {\n\t\t\tisa = PBXNativeTarget;\n\t\t\tbuildPhases = (\n\t\t\t\t941A3A9D36314871B3DD9DCC /* Resources */,\n\t\t\t);\n\t\t};',
    `\t\t13B07F8E1A680F5B00A75B9A /* Resources */ = {\n\t\t\tisa = PBXResourcesBuildPhase;\n\t\t\tfiles = (\n${appFonts.map((f) => `\t\t\t\tBBBB /* ${f} in Resources */,`).join('\n')}\n\t\t\t);\n\t\t};`,
    `\t\t941A3A9D36314871B3DD9DCC /* Resources */ = {\n\t\t\tisa = PBXResourcesBuildPhase;\n\t\t\tfiles = (\n${widgetFonts.map((f) => `\t\t\t\tCCCC /* ${f} in Resources */,`).join('\n')}\n\t\t\t);\n\t\t};`,
  ].join('\n');
  const ctx = (uiAppFonts, appFonts = check.FONTS, widgetFonts = []) => ({ infoPlist: { UIAppFonts: uiAppFonts }, pbxproj: pbx(appFonts, widgetFonts) });
  assert.doesNotThrow(() => check(ctx(check.FONTS), assert));
  assert.throws(() => check(ctx(check.FONTS.slice(0, 3)), assert), /UIAppFonts/);
  assert.throws(() => check(ctx(undefined), assert), /UIAppFonts/);
  assert.throws(() => check(ctx(check.FONTS, check.FONTS.slice(1)), assert), /본 앱 대상/);
  assert.throws(() => check(ctx(check.FONTS, check.FONTS, [check.FONTS[0]]), assert), /위젯 대상/);
});

test('화면 모드: 저장된 고르기를 모듈을 불러올 때부터 읽는다 — 문서(bootRead) · 언어(prefetchLangPref)와 같은 꼴', () => {
  const s = read('src/theme/look.tsx');
  const at = s.search(/^void readStoredLook\(\);$/m);
  assert.ok(at > 0, '모듈 범위에서 읽기 시작한다');
  assert.ok(at > s.indexOf('export function readStoredLook()') && at < s.indexOf('export function LookProvider('), '공급자 밖(모듈을 불러올 때)');
  // 한 번만 읽고 같은 약속을 돌려준다 — LookProvider는 그것을 기다린다(다시 읽지 않는다)
  assert.match(s, /storedRead \?\?= AsyncStorage\.getItem\(STORE_KEYS\.look\)\.then\(parseLook, \(\) => null\);/);
  assert.match(s, /readStoredLook\(\)\.then\(\(saved\) => \{\s*if \(saved\) return settle\(saved\);/);
  assert.equal((s.match(/AsyncStorage\.getItem\(/g) || []).length, 1);
  // 같은 꼴의 두 읽기
  assert.match(read('src/store/MandaratContext.tsx'), /^let bootRead: Promise<StoredRead> \| null = readStored\(\);$/m);
  assert.match(read('App.tsx'), /^void prefetchLangPref\(\);$/m);
  // App은 look 모듈을 불러온다(서체 · 언어 · 문서를 읽는 동안 같이 돈다)
  assert.match(read('App.tsx'), /import \{ LookProvider, usePaletteValue \} from '\.\/src\/theme\/look';/);
});
