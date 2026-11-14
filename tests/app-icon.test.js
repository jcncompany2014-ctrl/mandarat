// 앱 아이콘 — 흰 바탕 가운데 먹 코어와 여덟 영역 색의 둥근 타일(tools/icons/render.js가 그린다, 그림은 tests/a-n2)과 웹 '홈 화면에 추가' 설정
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f));

/** PNG 머리(IHDR)에서 폭·높이·색 형식(2 = RGB, 6 = RGBA) */
function ihdr(file) {
  const b = read(file);
  assert.equal(b.toString('ascii', 12, 16), 'IHDR', file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] };
}

test('불투명 아이콘은 알파 없이(RGB), 비쳐야 하는 것은 RGBA — 크기도 맞게', () => {
  const opaque = {
    'assets/icon.png': 1024, 'assets/icon-tinted.png': 1024, 'assets/android-icon-background.png': 1024,
    'assets/favicon.png': 64, 'public/apple-touch-icon.png': 180, 'public/icon-192.png': 192,
    'public/icon-512.png': 512, 'public/icon-maskable-512.png': 512,
  };
  for (const [f, size] of Object.entries(opaque)) {
    const h = ihdr(f);
    assert.deepEqual([h.w, h.h, h.colorType], [size, size, 2], f);
  }
  for (const f of ['assets/icon-dark.png', 'assets/android-icon-foreground.png', 'assets/android-icon-monochrome.png', 'assets/splash-icon.png', 'assets/splash-icon-dark.png']) {
    const h = ihdr(f);
    assert.deepEqual([h.w, h.h, h.colorType], [1024, 1024, 6], f);
  }
});

test('웹 홈 화면 아이콘 · 이름 · 매니페스트', () => {
  const html = read('public/index.html').toString();
  assert.match(html, /<html lang="ko">/);
  assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png" \/>/);
  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest" \/>/);
  assert.match(html, /<meta name="apple-mobile-web-app-title" content="만다라트" \/>/);
  assert.match(html, /<title>%WEB_TITLE%<\/title>/, 'Expo가 제목을 채울 자리는 남긴다');
  assert.match(html, /<div id="root"><\/div>/);
  const man = JSON.parse(read('public/manifest.webmanifest').toString());
  assert.equal(man.name, '만다라트');
  assert.equal(man.display, 'standalone');
  for (const icon of man.icons) assert.ok(fs.existsSync(path.join(ROOT, 'public', icon.src)), icon.src);
  assert.ok(man.icons.some((i) => i.purpose === 'maskable'));
});

test('app.json: 웹 이름 · 종이색(흰 종이 LIGHT.paper), 안드로이드 적응형 아이콘 바탕도 종이색 — 매니페스트 · index.html도', () => {
  require('./register');
  const { LIGHT, DARK } = require('../src/theme/tokens');
  const e = JSON.parse(read('app.json').toString()).expo;
  assert.equal(e.web.name, '만다라트');
  assert.equal(LIGHT.paper, '#FFFFFF');
  assert.equal(e.web.themeColor, LIGHT.paper);
  assert.equal(e.web.backgroundColor, LIGHT.paper);
  assert.equal(e.android.adaptiveIcon.backgroundColor, LIGHT.paper);
  const man = JSON.parse(read('public/manifest.webmanifest').toString());
  assert.equal(man.background_color, LIGHT.paper);
  assert.equal(man.theme_color, LIGHT.paper);
  // 앱이 뜨기 전의 웹 바탕 — 밝게는 흰 종이, 시스템이 어두우면 어두운 종이
  const html = read('public/index.html').toString();
  assert.match(html, /background-color: #ffffff;/i);
  assert.match(html, new RegExp(`@media \\(prefers-color-scheme: dark\\)[\\s\\S]*background-color: ${DARK.paper};`, 'i'));
  assert.doesNotMatch(html, /#fbf9f4/i, '예전 미색이 남지 않는다');
});

test('JS 스플래시는 L0 마음(Mark heart)을 토큰 색으로 — 예전 먹 · 금색 표는 없다', () => {
  const s = read('src/components/Splash.tsx').toString();
  assert.match(s, /import \{ Mark \} from '\.\/chart\/Mark';/);
  assert.match(s, /<Mark variant="heart" size=\{MARK\} tokens=\{T\} \/>/);
  // 색은 토큰에서만 — 시스템 모드로 LIGHT · DARK를 고른다(build-plan §4.2)
  assert.doesNotMatch(s, /#[0-9A-Fa-f]{6}/);
  assert.doesNotMatch(s, /SPLASH_INK|SPLASH_GOLD/);
});
