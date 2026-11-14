#!/usr/bin/env node
// 앱 아이콘 · 런치 스크린 · 웹 아이콘 PNG를 토큰 값으로 그린다(docs/design/build-plan.md §3 N2).
// 그림은 승인된 시안 docs/design/mockups/a/icon.png(icon-mark.js AI.app): 흰 바탕 가운데 먹 코어와 여덟 영역 색을
// 둥근 타일로. 런치 스크린은 L0 마음(A.mark 'heart'). 자리 수치는 G의 src/components/chart/geometry.ts(markTiles)를,
// 색은 src/theme/tokens.ts(LIGHT · DARK)를 그대로 쓴다 — 값이 바뀌면 이 파일을 다시 돌리면 된다.
//
// 쓰는 법: node tools/icons/render.js [--out <폴더>]   (기본: 저장소 뿌리에 assets/ · public/ 그대로 쓴다)
// 전역에 깔린 Playwright(Chromium)로 SVG를 찍는다(브라우저를 새로 받지 않는다). 알파가 없어야 하는 파일
// (아이콘 · 틴트 · 웹 아이콘 · 안드로이드 바탕)은 tools/store-shots/png.js로 RGB(색 형식 2)로 다시 쓰고,
// 비쳐야 하는 파일(어두운 아이콘 · 스플래시 · 안드로이드 앞 · 단색)은 RGBA(색 형식 6)로 둔다.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
require(path.join(ROOT, 'tests', 'register'));
const { LIGHT, DARK } = require(path.join(ROOT, 'src', 'theme', 'tokens'));
const { markTiles } = require(path.join(ROOT, 'src', 'components', 'chart', 'geometry'));
const { readHeader, decode, toRGB } = require(path.join(ROOT, 'tools', 'store-shots', 'png'));

/** 틴트 아이콘(iOS 18 Tinted): 영역 색은 한 가지 가운데 회색, 핵심 목표는 흰색 — 시스템이 밝기로 물들인다 */
const TINT_GREY = '#9A9A9A';
/** 안드로이드 적응형 아이콘: 108dp 바탕 중 보이는 것은 가운데 72dp — 마크를 iOS 아이콘과 같은 비율로 그 안에 */
const ADAPTIVE_VISIBLE = 72 / 108;
/** 마스커블 웹 아이콘의 여백(크기의 비율) — 안전 원(지름 0.8) 안에 3×3이 다 들어간다 */
const MASKABLE_PAD = 0.28;
/** 런치 스크린: JS 스플래시(Splash.tsx)가 그리는 마음의 크기(pt)를 읽는다. 못 읽으면 예전과 같은 84pt */
const SPLASH_MARK_FALLBACK = 84;

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

/** 마크 칸(pt)을 k배 키워 offset에 둔다 — px 단위 { x, y, w, h, radius, ti }. 수가 하나라도 이상하면 멈춘다(빈 PNG를 쓰지 않게) */
function place(variant, sizePt, k = 1, offset = 0) {
  const tiles = markTiles(variant, sizePt).tiles.map((t) => ({
    x: offset + t.x * k, y: offset + t.y * k, w: (t.w ?? t.size) * k, h: (t.h ?? t.size) * k, radius: t.radius * k, ti: t.ti,
  }));
  const bad = tiles.find((t) => ![t.x, t.y, t.w, t.h, t.radius].every((v) => Number.isFinite(v) && v >= 0) || t.w <= 0 || !(t.ti >= -1 && t.ti <= 7));
  if (tiles.length !== 9 || bad) throw new Error(`markTiles('${variant}', ${sizePt})가 아홉 칸을 돌려주지 않아요: ${JSON.stringify(bad || tiles.length)}`);
  return tiles;
}

/** 정사각형 S 한가운데에 한 변 box짜리 앱 아이콘(app)을 그린 자리 — 바탕은 S 전체를 칠한다 */
const appIn = (S, box) => place('app', box, 1, (S - box) / 2);

/** 칸 색: ti -1은 코어, 0~7은 영역 색 */
const paint = (t) => (tile) => (tile.ti < 0 ? { fill: t.core } : { fill: t.dye[tile.ti] });

function splashMarkPt() {
  try {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'components', 'Splash.tsx'), 'utf8');
    const m = /const MARK = (\d+(?:\.\d+)?);/.exec(src);
    if (m) return { pt: Number(m[1]), from: 'Splash.tsx MARK' };
  } catch {}
  return { pt: SPLASH_MARK_FALLBACK, from: '기본값(Splash.tsx에서 MARK를 못 찾음)' };
}

function splashImageWidth() {
  const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).expo;
  const entry = app.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen');
  if (!entry || !entry[1].imageWidth) throw new Error('app.json에 expo-splash-screen imageWidth가 없어요');
  return entry[1].imageWidth;
}

/** 그릴 파일 전부 — { file, size, rgb(알파 없이), ground(바탕색 또는 null = 투명), tiles, color(tile) } */
function plan() {
  const W = 1024;
  const splash = splashMarkPt();
  const imageWidth = splashImageWidth();
  // 런치 이미지는 imageWidth pt로 줄어 놓인다 — 마음이 JS 스플래시와 같은 pt가 되게 1024 안에 그린다
  const k = W / imageWidth;
  const heart = place('heart', splash.pt, k, (W - splash.pt * k) / 2);
  const app = place('app', W);
  const adaptive = appIn(W, W * ADAPTIVE_VISIBLE);
  const web = (S) => ({ size: S, rgb: true, ground: LIGHT.paper, tiles: place('app', S), color: paint(LIGHT) });
  return {
    splash: { ...splash, imageWidth },
    files: [
      { file: 'assets/icon.png', size: W, rgb: true, ground: LIGHT.paper, tiles: app, color: paint(LIGHT) },
      // 어두운 아이콘: 바탕은 비우고(iOS가 어두운 바탕을 깐다) 어두운 영역 색 · 코어
      { file: 'assets/icon-dark.png', size: W, rgb: false, ground: null, tiles: app, color: paint(DARK) },
      { file: 'assets/icon-tinted.png', size: W, rgb: true, ground: '#000000', tiles: app, color: (t) => ({ fill: t.ti < 0 ? '#FFFFFF' : TINT_GREY }) },
      { file: 'assets/splash-icon.png', size: W, rgb: false, ground: null, tiles: heart, color: paint(LIGHT) },
      { file: 'assets/splash-icon-dark.png', size: W, rgb: false, ground: null, tiles: heart, color: paint(DARK) },
      // 파비콘은 탭에 16~32px로 보인다 — 32pt 아이콘(작은 크기 여백 0.17)을 2배로
      { file: 'assets/favicon.png', size: 64, rgb: true, ground: LIGHT.paper, tiles: place('app', 32, 2), color: paint(LIGHT) },
      { file: 'assets/android-icon-foreground.png', size: W, rgb: false, ground: null, tiles: adaptive, color: paint(LIGHT) },
      { file: 'assets/android-icon-background.png', size: W, rgb: true, ground: LIGHT.paper, tiles: [], color: paint(LIGHT) },
      // 단색(Android 13 테마 아이콘): 시스템은 알파만 본다 — 틴트 아이콘처럼 영역은 0x9A, 코어는 꽉 차게
      { file: 'assets/android-icon-monochrome.png', size: W, rgb: false, ground: null, tiles: adaptive, color: (t) => ({ fill: '#FFFFFF', opacity: t.ti < 0 ? 1 : hex(TINT_GREY)[0] / 255 }) },
      { file: 'public/apple-touch-icon.png', ...web(180) },
      { file: 'public/icon-192.png', ...web(192) },
      { file: 'public/icon-512.png', ...web(512) },
      // 마스커블: 같은 그림을 줄여 여백 0.28 — 3×3이 0.6 → 0.44가 되게 상자째 줄인다(틈 · 모서리도 같은 비율)
      { file: 'public/icon-maskable-512.png', size: 512, rgb: true, ground: LIGHT.paper, tiles: appIn(512, (512 * (1 - 2 * MASKABLE_PAD)) / (1 - 2 * 0.2)), color: paint(LIGHT) },
    ],
  };
}

const n = (v) => Number(v.toFixed(3));

function svg({ size, ground, tiles, color }) {
  let out = ground ? `<rect width="${size}" height="${size}" fill="${ground}"/>` : '';
  for (const t of tiles) {
    const c = color(t);
    out += `<rect x="${n(t.x)}" y="${n(t.y)}" width="${n(t.w)}" height="${n(t.h)}" rx="${n(t.radius)}" fill="${c.fill}"${c.opacity !== undefined && c.opacity < 1 ? ` fill-opacity="${n(c.opacity)}"` : ''}/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block">${out}</svg>`;
}

async function main() {
  const argv = process.argv.slice(2);
  const out = argv.includes('--out') ? path.resolve(argv[argv.indexOf('--out') + 1]) : ROOT;
  const { splash, files } = plan();
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  console.log(`스플래시 마음 ${splash.pt}pt (${splash.from}) · imageWidth ${splash.imageWidth}`);
  for (const f of files) {
    await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;background:transparent}</style></head><body>${svg(f)}</body></html>`);
    let buf = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: f.size, height: f.size } });
    if (f.rgb) buf = toRGB(buf, hex(f.ground));
    const h = readHeader(buf);
    const want = f.rgb ? 2 : 6;
    if (h.width !== f.size || h.height !== f.size || h.colorType !== want) {
      throw new Error(`${f.file}: ${h.width}×${h.height} 색 형식 ${h.colorType} — ${f.size}×${f.size} 색 형식 ${want}이어야 해요`);
    }
    // 한가운데 점은 코어 색이어야 한다 — 칸이 안 그려진 빈 그림을 쓰지 않게(투명은 자홍 위에 얹어 본다)
    const core = f.tiles.find((t) => t.ti < 0);
    if (core) {
      const { rgb } = decode(buf, [255, 0, 255]);
      const o = (Math.floor(f.size / 2) * f.size + Math.floor(f.size / 2)) * 3;
      const got = [rgb[o], rgb[o + 1], rgb[o + 2]];
      const c = f.color(core);
      const a = c.opacity ?? 1;
      const wantRgb = hex(c.fill).map((v, i) => Math.round(v * a + [255, 0, 255][i] * (1 - a)));
      if (got.some((v, i) => Math.abs(v - wantRgb[i]) > 2)) throw new Error(`${f.file}: 가운데가 ${got} — 코어 ${wantRgb}여야 해요`);
    }
    const dest = path.join(out, f.file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    console.log(`✔ ${f.file}  ${f.size}×${f.size} ${f.rgb ? 'RGB' : 'RGBA'}  ${(buf.length / 1024).toFixed(1)}KB`);
  }
  await browser.close();
}

module.exports = { plan, svg, TINT_GREY, ADAPTIVE_VISIBLE, MASKABLE_PAD };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
