// 디자인 A · 꾸러미 N2(wave 2) — 앱 아이콘 · 런치 스크린 · 웹 아이콘(docs/design/build-plan.md §3 N2, §4.1).
// 그림은 승인된 시안 docs/design/mockups/a/icon.png(icon-mark.js AI.app): 흰 바탕 가운데 먹 코어와 여덟 영역 색의 둥근 타일.
// PNG는 tools/icons/render.js가 토큰 값으로 그린다. 여기서는 그려진 픽셀을 AI.app 자리(시안 코드를 그대로 돌린 것)와 토큰 색에 견준다.
// 크기 · 색 형식(RGB / RGBA)은 app-icon.test.js, 런치 스크린 설정은 releaseConfig.test.js가 본다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');
const { LIGHT, DARK } = require('../src/theme/tokens');

const ROOT = path.join(__dirname, '..');
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** 8비트 RGB · RGBA PNG → { w, h, colorType, px(x, y) → [r, g, b, a] } */
function png(rel) {
  const buf = fs.readFileSync(path.join(ROOT, rel));
  let p = 8, w = 0, h = 0, colorType = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); colorType = d[9]; assert.equal(d[8], 8, rel); assert.equal(d[12], 0, rel); }
    if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const bpp = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) for (let k = 0; k < 4; k++) out[(y * w + x) * 4 + k] = k < 3 || bpp === 4 ? cur[x * bpp + k] : 255;
    prev = cur;
  }
  return { w, h, colorType, data: out, px: (x, y) => [...out.subarray((y * w + x) * 4, (y * w + x) * 4 + 4)] };
}

const rgba = (hex, a = 255) => [...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)), a];
const near = (got, want, tol, msg) => assert.ok(got.every((v, i) => Math.abs(v - want[i]) <= tol), `${msg}: ${got} ≠ ${want}`);

/** 시안 icon-mark.js의 AI.app을 그대로 돌려 아홉 칸 자리를 얻는다 — { x, y, w, rx, fill: 'core' | 0~7 } */
function aiApp(size) {
  const ctx = { window: {} };
  vm.runInNewContext(src('docs/design/mockups/a/icon-mark.js'), ctx);
  const host = { style: {}, innerHTML: '' };
  ctx.window.AI.app(host, { size });
  const rects = [...host.innerHTML.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="[\d.]+" rx="([\d.]+)" style="fill:var\(--(core|dye-(\d))\)"\/>/g)]
    .map((m) => ({ x: +m[1], y: +m[2], w: +m[3], rx: +m[4], fill: m[5] === 'core' ? 'core' : Number(m[6]) - 1 }));
  assert.equal(rects.length, 9, 'AI.app은 아홉 칸');
  return rects;
}

/** ground가 아닌 점의 테두리 상자 */
function bbox(img, isGround) {
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    if (isGround(img.px(x, y))) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

/** 그림이 AI.app(크기 S, k배)과 같은 자리에 같은 색으로 그려졌는가 — 칸 가운데는 그 색, 칸 사이 틈과 여백은 바탕 */
function sameAsApp(rel, { size, scale = 1, ground, color }) {
  const img = png(rel);
  const rects = aiApp(size).map((r) => ({ ...r, x: r.x * scale, y: r.y * scale, w: r.w * scale }));
  const isGround = (p) => (ground === null ? p[3] === 0 : p.slice(0, 3).every((v, i) => v === ground[i]));
  for (const r of rects) {
    near(img.px(Math.floor(r.x + r.w / 2), Math.floor(r.y + r.w / 2)), color(r.fill), 1, `${rel} 칸 ${r.fill}`);
  }
  const gap = rects[1].x - (rects[0].x + rects[0].w);
  if (gap >= 4) {
    const mid = Math.floor(rects[0].x + rects[0].w + gap / 2), cy = Math.floor(rects[0].y + rects[0].w / 2);
    assert.ok(isGround(img.px(mid, cy)) && isGround(img.px(cy, mid)), `${rel}: 칸 사이 틈은 바탕`);
  }
  const b = bbox(img, isGround);
  const lo = rects[0].x, hi = rects[8].x + rects[8].w;
  for (const [got, want] of [[b.x0, lo], [b.y0, lo], [b.x1 + 1, hi], [b.y1 + 1, hi]]) assert.ok(Math.abs(got - want) <= 1, `${rel}: 마크 테두리 ${got} ≠ ${want.toFixed(1)}`);
  return img;
}

const paint = (t) => (fill) => rgba(fill === 'core' ? t.core : t.dye[fill]);

test('N2 앱 아이콘(밝게): 흰 종이 위 AI.app — 여백 0.2, LIGHT 영역 색 여덟과 코어', () => {
  const img = sameAsApp('assets/icon.png', { size: 1024, ground: rgba(LIGHT.paper), color: paint(LIGHT) });
  near(img.px(0, 0), rgba(LIGHT.paper), 0, '모서리는 흰 종이(iOS가 모서리를 깎는다)');
});

test('N2 앱 아이콘은 승인된 시안 icon.png와 같은 그림이다(다른 점은 칸 가장자리 안티에일리어싱뿐)', () => {
  const a = png('assets/icon.png'), b = png('docs/design/mockups/a/icon.png');
  assert.deepEqual([a.w, a.h], [b.w, b.h]);
  let edge = 0;
  for (let y = 1; y < a.h - 1; y++) for (let x = 1; x < a.w - 1; x++) {
    const i = (y * a.w + x) * 4;
    if ([0, 1, 2].every((k) => Math.abs(a.data[i + k] - b.data[i + k]) <= 8)) continue;
    // 시안에서 이웃 점이 모두 같은 색인 자리(칸 안 · 바탕)는 꼭 같아야 한다
    let flat = true;
    for (let dy = -1; dy <= 1 && flat; dy++) for (let dx = -1; dx <= 1 && flat; dx++) {
      const j = ((y + dy) * a.w + x + dx) * 4;
      if ([0, 1, 2].some((k) => b.data[j + k] !== b.data[i + k])) flat = false;
    }
    assert.ok(!flat, `(${x}, ${y})는 칸 안이나 바탕인데 시안과 색이 다르다`);
    edge++;
  }
  assert.ok(edge < a.w * a.h * 0.002, `가장자리 차이 ${edge}점`);
});

test('N2 어두운 아이콘: 바탕은 비우고(iOS가 어두운 바탕을 깐다) DARK 영역 색 · 코어, 같은 자리', () => {
  const img = sameAsApp('assets/icon-dark.png', { size: 1024, ground: null, color: paint(DARK) });
  assert.equal(img.colorType, 6);
  assert.equal(img.px(0, 0)[3], 0);
  assert.equal(img.px(512, 150)[3], 0, '여백은 투명');
});

test('N2 틴트 아이콘: 검은 바탕, 영역은 한 가지 회색 #9A9A9A, 코어는 흰색 — 회색만으로 읽힌다', () => {
  const img = sameAsApp('assets/icon-tinted.png', { size: 1024, ground: [0, 0, 0], color: (f) => rgba(f === 'core' ? '#FFFFFF' : '#9A9A9A') });
  for (let i = 0; i < img.data.length; i += 4) assert.ok(img.data[i] === img.data[i + 1] && img.data[i + 1] === img.data[i + 2], '모든 점이 회색');
  // 코어가 가장 밝고(시스템 틴트가 가장 짙게 물든다), 영역 칸도 검은 바탕과 또렷이 갈린다
  assert.ok(0x9a / 255 > 0.5 && 0x9a / 255 < 0.75);
});

test('N2 웹 아이콘(apple-touch 180 · 192 · 512)과 파비콘: 같은 그림, 파비콘은 탭 크기(32pt, 여백 0.17)를 2배로', () => {
  for (const [rel, size] of [['public/apple-touch-icon.png', 180], ['public/icon-192.png', 192], ['public/icon-512.png', 512]]) {
    sameAsApp(rel, { size, ground: rgba(LIGHT.paper), color: paint(LIGHT) });
  }
  sameAsApp('assets/favicon.png', { size: 32, scale: 2, ground: rgba(LIGHT.paper), color: paint(LIGHT) });
});

test('N2 마스커블 웹 아이콘: 흰 바탕, 3×3은 여백 0.28 — 안전 원(지름 0.8) 안에 다 들어간다', () => {
  const img = png('public/icon-maskable-512.png');
  const white = rgba(LIGHT.paper);
  const b = bbox(img, (p) => p.slice(0, 3).every((v, i) => v === white[i]));
  assert.ok(Math.abs(b.x0 - 512 * 0.28) <= 1 && Math.abs(b.x1 + 1 - 512 * 0.72) <= 1, `여백 ${b.x0}`);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    if (Math.hypot(x + 0.5 - 256, y + 0.5 - 256) <= 512 * 0.4) continue;
    near(img.px(x, y), white, 0, `(${x}, ${y}) 안전 원 밖은 흰 바탕`);
  }
  near(img.px(256, 256), rgba(LIGHT.core), 1, '가운데는 코어');
});

test('N2 런치 스크린: 밝게 · 어둡게 두 장 모두 투명 바탕에 같은 자리의 마음(틈 0.06, 모서리 0.22)', () => {
  const light = png('assets/splash-icon.png'), dark = png('assets/splash-icon-dark.png');
  const lb = bbox(light, (p) => p[3] === 0), db = bbox(dark, (p) => p[3] === 0);
  assert.deepEqual(db, lb, '두 장의 마음은 같은 자리');
  assert.equal(lb.x1 - lb.x0, lb.y1 - lb.y0, '정사각형');
  assert.ok(Math.abs((lb.x0 + lb.x1 + 1) / 2 - 512) <= 1 && Math.abs((lb.y0 + lb.y1 + 1) / 2 - 512) <= 1, '한가운데');
  const s = lb.x1 + 1 - lb.x0, gap = s * 0.06, t = (s - 2 * gap) / 3;
  for (const [img, tok, rel] of [[light, LIGHT, 'splash-icon'], [dark, DARK, 'splash-icon-dark']]) {
    assert.equal(img.px(0, 0)[3], 0, `${rel}: 바탕은 투명(app.json의 종이색이 비친다)`);
    for (let i = 0; i < 9; i++) {
      const cx = Math.floor(lb.x0 + (i % 3) * (t + gap) + t / 2), cy = Math.floor(lb.y0 + Math.floor(i / 3) * (t + gap) + t / 2);
      near(img.px(cx, cy), rgba(i === 4 ? tok.core : tok.dye[i < 4 ? i : i - 1]), 1, `${rel} 칸 ${i}`);
    }
    assert.equal(img.px(Math.floor(lb.x0 + t + gap / 2), 512)[3], 0, `${rel}: 칸 사이 틈은 투명`);
  }
});

test('N2 안드로이드 적응형 아이콘: 흰 바탕 한 장, 앞 그림은 보이는 72dp 안에 iOS와 같은 비율, 단색은 알파로만', () => {
  const bg = png('assets/android-icon-background.png');
  const white = rgba(LIGHT.paper);
  for (let i = 0; i < bg.data.length; i += 4) assert.ok(bg.data[i] === white[0] && bg.data[i + 1] === white[1] && bg.data[i + 2] === white[2], '바탕은 흰 종이 한 색');
  const fg = png('assets/android-icon-foreground.png'), mono = png('assets/android-icon-monochrome.png');
  const safe = (1024 * 66) / 108 / 2; // 안전 원(66dp)
  const visible = (1024 * 72) / 108;
  for (const [img, rel] of [[fg, 'foreground'], [mono, 'monochrome']]) {
    const b = bbox(img, (p) => p[3] === 0);
    assert.ok(Math.abs(b.x1 + 1 - b.x0 - visible * 0.6) <= 2, `${rel}: 3×3은 보이는 폭의 60% (${b.x1 + 1 - b.x0})`);
    for (let y = 0; y < 1024; y += 2) for (let x = 0; x < 1024; x += 2) {
      if (img.px(x, y)[3] > 0) assert.ok(Math.hypot(x + 0.5 - 512, y + 0.5 - 512) <= safe, `${rel}: (${x}, ${y})가 안전 원 밖`);
    }
  }
  near(fg.px(512, 512), rgba(LIGHT.core), 1, '앞 그림 가운데는 코어');
  near(fg.px(0, 0), [0, 0, 0, 0], 0, '앞 그림 바탕은 투명');
  // 단색: 시스템이 알파만 보고 물들인다 — 코어는 꽉 차게, 영역 칸은 틴트 아이콘의 회색만큼(0x9A)
  assert.equal(mono.px(512, 512)[3], 255);
  const step = ((visible * 0.6) - 2 * visible * 0.025) / 3 + visible * 0.025;
  assert.ok(Math.abs(mono.px(Math.round(512 - step), 512)[3] - 0x9a) <= 1, '영역 칸 알파 0x9A');
  for (let i = 0; i < mono.data.length; i += 4) if (mono.data[i + 3] > 0) assert.ok(mono.data[i] >= 250 && mono.data[i + 1] >= 250 && mono.data[i + 2] >= 250, '단색은 흰색 한 가지');
});

test('N2 render.js는 설정이 가리키는 그림을 모두 그리고, 토큰 · G의 마크 수치를 쓴다', () => {
  const r = src('tools/icons/render.js');
  const drawn = new Set([...r.matchAll(/file: '([^']+)'/g)].map((m) => m[1]));
  const e = JSON.parse(src('app.json')).expo;
  const splash = e.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen')[1];
  const wanted = [
    e.icon, e.ios.icon.light, e.ios.icon.dark, e.ios.icon.tinted, e.web.favicon,
    e.android.adaptiveIcon.foregroundImage, e.android.adaptiveIcon.backgroundImage, e.android.adaptiveIcon.monochromeImage,
    splash.image, splash.dark.image,
    ...JSON.parse(src('public/manifest.webmanifest')).icons.map((i) => `public${i.src}`), 'public/apple-touch-icon.png',
  ].map((f) => f.replace(/^\.\//, ''));
  for (const f of wanted) assert.ok(drawn.has(f), `${f}를 render.js가 그리지 않는다`);
  assert.match(r, /require\(path\.join\(ROOT, 'src', 'theme', 'tokens'\)\)/);
  assert.match(r, /markTiles/);
  assert.doesNotMatch(r, /playwright install/, '브라우저를 새로 받지 않는다');
});
