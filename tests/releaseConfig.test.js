// 출시 설정 회귀 테스트 — 아이클라우드 백업, 한국어 번들, 런치 스크린, 서체 파일, 의존성.
// 기기에서만 드러나는 설정이라 한 번 틀어지면 리뷰에서 놓치기 쉽다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const app = JSON.parse(read('app.json')).expo;
const plist = app.ios.infoPlist;
const PAPER = '#FBF9F4';

test('app.json: SDK 56 스키마에 없는 키는 지우고, 링크용 scheme은 남긴다', () => {
  assert.equal('newArchEnabled' in app, false);
  assert.equal('splash' in app, false, '런치 스크린은 expo-splash-screen 플러그인이 맡는다');
  assert.equal(app.scheme, 'mandarat');
  assert.equal(app.backgroundColor, PAPER);
});

test('iOS: 아이클라우드 백업에 기록이 들어가고, 번들은 한국어다', () => {
  // undefined면 AsyncStorage 기본값(백업 제외)이 되어 복원한 아이폰이 빈 앱으로 열린다
  assert.equal(plist.RCTAsyncStorageExcludeFromBackup, false);
  assert.equal(plist.CFBundleDevelopmentRegion, 'ko');
  assert.deepEqual(plist.CFBundleLocalizations, ['ko']);
  assert.equal(plist.UIStatusBarStyle, 'UIStatusBarStyleDarkContent');
  assert.equal(plist.CFBundleDisplayName, '만다라트');
  assert.equal(plist.ITSAppUsesNonExemptEncryption, false);
});

test('사진 저장 권한 문구는 한국어로, Info.plist와 ko.lproj가 같다', () => {
  const text = plist.NSPhotoLibraryAddUsageDescription;
  assert.ok(typeof text === 'string' && /[가-힣]/.test(text), '사진 앱 저장 권한 문구가 없으면 이미지 저장에서 앱이 종료된다');
  assert.equal(app.locales.ko, './locales/ko.json');
  const ko = JSON.parse(read('locales/ko.json'));
  assert.deepEqual(Object.keys(ko), ['ios'], 'iOS 키는 ios 아래에 둔다(getResolvedLocalesAsync)');
  assert.equal(ko.ios.CFBundleDisplayName, plist.CFBundleDisplayName);
  assert.equal(ko.ios.NSPhotoLibraryAddUsageDescription, text);
});

/** PNG에서 불투명 픽셀이 차지하는 가로 폭(px)과 전체 폭 — RGBA 8비트만 다룬다 */
function opaqueWidth(file) {
  const buf = fs.readFileSync(file);
  let p = 8, w = 0, h = 0, colorType = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9]; }
    if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  assert.equal(colorType, 6, 'splash-icon.png는 RGBA여야 바탕이 비친다');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * 4;
  let prev = Buffer.alloc(stride), x0 = w, x1 = -1;
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= 4 ? cur[i - 4] : 0, b = prev[i], c = i >= 4 ? prev[i - 4] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) if (cur[x * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
    prev = cur;
  }
  return { tile: x1 - x0 + 1, width: w };
}

test('런치 스크린: 미색 바탕에 JS 스플래시와 같은 84pt 타일', () => {
  const entry = app.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen');
  assert.ok(entry, 'expo-splash-screen 플러그인 설정이 있어야 한다');
  const opts = entry[1];
  assert.equal(opts.backgroundColor, PAPER);
  assert.equal(opts.resizeMode, 'contain');
  assert.equal('dark' in opts, false, '바탕은 시스템이 아니라 앱 안의 종이가 정한다');
  const { tile, width } = opaqueWidth(path.join(ROOT, opts.image));
  const splashSrc = read('src/components/Splash.tsx');
  const jsTile = Number(/width: (\d+), height: \1, borderRadius/.exec(splashSrc)?.[1]);
  assert.ok(Math.abs((opts.imageWidth * tile) / width - jsTile) < 0.75, `런치 타일 ${((opts.imageWidth * tile) / width).toFixed(2)}pt ≠ JS ${jsTile}pt`);
  assert.match(splashSrc, new RegExp(`PAPER = '${PAPER}'`));
});

test('서체: faceFor가 고르는 굵기 파일은 모두 싣고, 안 쓰는 ExtraBold는 싣지 않는다', () => {
  const { faceFor } = require('../src/theme/fonts');
  const appSrc = read('App.tsx');
  const loaded = new Set([...appSrc.matchAll(/'(Pretendard-[A-Za-z]+)': require\('pretendard\/dist\/public\/static\/\1\.otf'\)/g)].map((m) => m[1]));
  assert.ok(loaded.size >= 1);
  const used = new Set([undefined, 'normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'].map((w) => faceFor(w)));
  for (const face of used) assert.ok(loaded.has(face), `${face}를 App.tsx에서 불러오지 않는다`);
  assert.equal(loaded.has('Pretendard-ExtraBold'), false);
  // 서체를 못 불러와도 스플래시에 갇히지 않는다
  assert.match(appSrc, /if \(!fontsLoaded && !fontError\) return <Splash \/>/);
});

test('의존성: 안 쓰는 네이티브·서체 패키지는 빼고, 출시에 필요한 모듈은 직접 의존한다', () => {
  const deps = JSON.parse(read('package.json')).dependencies;
  for (const gone of ['@expo-google-fonts/gowun-batang', '@expo-google-fonts/space-grotesk', 'expo-linear-gradient']) {
    assert.equal(gone in deps, false, `${gone}는 지웠다`);
  }
  for (const need of ['expo-splash-screen', 'expo-system-ui', 'expo-keep-awake', 'expo-file-system', 'react-native-view-shot']) {
    assert.ok(need in deps, `${need}가 필요하다`);
  }
  assert.match(deps.expo, /^~56\.0\.(2[3-9]|[3-9]\d)$/);
});
