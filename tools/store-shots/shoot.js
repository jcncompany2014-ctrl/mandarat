#!/usr/bin/env node
// 앱스토어 스크린샷 — 웹으로 내보낸 앱을 기기 크기마다 · 언어마다 띄워 장면 여섯을 찍고, 위에 짧은 설명을 얹는다.
// 예시 문서(fixtures/<언어>.js)를 넣고, 시계(2026-10-14 09:30, 기기 시간대)와 움직임 줄이기를 고정해 실행마다 같은 그림이 나온다.
// 설명 띠: 종이색 바탕에 먹색 글씨, 왼쪽 맞춤(Pretendard, 일본어는 Hiragino). 그라데이션 · 기기 테두리 · 그림자 없음.
// 결과: out/<언어>/<기기>/<nn>-<장면>.png — 알파 없는 RGB PNG(verify.js가 크기와 색 형식을 본다).
//
// 쓰는 법: npm run store-shots -- [--no-export] [--locales ko,ja,en] [--devices all|iphone-6.9,ipad-13] [--scenes all|chart,today] [--out <dir>]
// - --no-export: 이미 내보낸 tools/store-shots/.web을 쓴다.
const { execFileSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const HERE = __dirname;
const ROOT = path.join(HERE, '..', '..');
const WEB = path.join(HERE, '.web');
const FONTS = path.join(ROOT, 'node_modules', 'pretendard', 'dist', 'web', 'static', 'woff2');

require(path.join(ROOT, 'tests', 'register'));
const { TID } = require(path.join(ROOT, 'src', 'lib', 'testIds'));
const { MOODS } = require(path.join(ROOT, 'src', 'theme', 'moods'));
const { pickDevices } = require('./devices');
const { pickScenes } = require('./scenes');
const { toRGB } = require('./png');
const { verifyDir } = require('./verify');
const CAPTIONS = require('./captions.json');

/** 기본 시계 — 웹 스모크와 같은 날(수요일 아침), 기기 시간대의 벽시계 */
const CLOCK = '2026-10-14T09:30:00';
/** 언어마다 브라우저 locale과 시간대 */
const LOCALES = {
  ko: { locale: 'ko-KR', timezoneId: 'Asia/Seoul' },
  ja: { locale: 'ja-JP', timezoneId: 'Asia/Tokyo' },
  en: { locale: 'en-US', timezoneId: 'America/Los_Angeles' },
};
/** 설명 띠의 색 — 앱의 기본 무드('연꽃', 화면 이름 미색) */
const PAPER = MOODS['연꽃'];
/** 알려진 React Native Web 경고 — 실패로 보지 않는다(scripts/web-smoke.js와 같다) */
const KNOWN = [
  /props\.pointerEvents is deprecated/,
  /"shadow\*" style props are deprecated/,
  /Animated: `useNativeDriver` is not supported/,
  /accessibilityLargeContentTitle|accessibilityShowsLargeContentViewer/,
];

function args(argv) {
  const o = { export: true, locales: ['ko', 'ja', 'en'], devices: 'all', scenes: 'all', out: path.join(HERE, 'out') };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-export') o.export = false;
    else if (a === '--locales') o.locales = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--devices') o.devices = argv[++i];
    else if (a === '--scenes') o.scenes = argv[++i];
    else if (a === '--out') o.out = path.resolve(argv[++i]);
    else throw new Error(`모르는 옵션: ${a}`);
  }
  for (const l of o.locales) if (!LOCALES[l]) throw new Error(`모르는 언어: ${l} (ko, ja, en)`);
  return o;
}

function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    try {
      const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
      return require(path.join(root, 'playwright'));
    } catch {
      console.error('Playwright가 없어요. 설치: npm --prefix tools/store-shots ci && npx playwright install chromium');
      process.exit(2);
    }
  }
}

/** 브라우저 — 설치한 Playwright의 Chromium, 없으면 미리 깔린 /opt/pw-browsers/chromium */
async function launch(chromium) {
  try {
    return await chromium.launch();
  } catch (e) {
    const fallback = '/opt/pw-browsers/chromium';
    if (!fs.existsSync(fallback)) throw e;
    return chromium.launch({ executablePath: fallback });
  }
}

/** 벽시계 시각 'YYYY-MM-DDTHH:MM:SS'를 그 시간대의 순간(ms)으로 */
function zonedEpoch(wall, timeZone) {
  const [d, t] = wall.split('T');
  const [y, mo, da] = d.split('-').map(Number);
  const [h, mi, s] = t.split(':').map(Number);
  const asUTC = Date.UTC(y, mo - 1, da, h, mi, s || 0);
  const offset = (ms) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms;
  };
  let ms = asUTC - offset(asUTC);
  ms = asUTC - offset(ms);
  return ms;
}

/**
 * 앱을 찍는 창 — 보통은 기기 크기(높이 − 설명 띠) 그대로. 아이패드에서 장면이 padWidth를 두면 그 폭의 창으로 찍고
 * 배율을 기기 폭/padWidth만큼 올린다: 찍힌 PNG는 기기 크기 그대로이고, 늘인 그림이 아니라 그 배율로 새로 그린 글자다.
 */
function viewOf(device, scene) {
  const appH = device.height - device.band;
  if (!scene.padWidth || device.width < 700 || scene.padWidth >= device.width) return { width: device.width, height: appH, scale: device.scale };
  const zoom = device.width / scene.padWidth;
  return { width: scene.padWidth, height: Math.round(appH / zoom), scale: device.scale * zoom };
}

const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

/** .web을 띄운다 — 없는 경로는 index.html(SPA), /__font/<이름>은 Pretendard 파일 */
function serve(dir) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    let file;
    if (url.startsWith('/__font/')) file = path.join(FONTS, path.basename(url));
    else {
      file = path.join(dir, url);
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dir, 'index.html');
    }
    if (!fs.existsSync(file)) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

/**
 * 설명 띠 + 앱 화면 한 장 — 위 band에 쪽 번호와 설명(왼쪽 맞춤), 그 아래 1px 줄, 그 아래 앱 화면을 그대로.
 * 숫자는 CSS px(= 논리 pt). 폰 기준 크기를 기기 폭에 맞춰 키운다.
 */
function composeHtml({ device, lang, caption, folio, png }) {
  const k = device.width >= 700 ? 1.45 : 1;
  const gutter = Math.round(28 * k);
  const size = Math.round(30 * k);
  const font = lang === 'ja'
    ? `'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'IPAGothic', 'Noto Sans CJK JP', sans-serif`
    : `'Pretendard', sans-serif`;
  const appH = device.height - device.band;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
@font-face { font-family: 'Pretendard'; font-weight: 500; src: url('/__font/Pretendard-Medium.woff2') format('woff2'); }
@font-face { font-family: 'Pretendard'; font-weight: 600; src: url('/__font/Pretendard-SemiBold.woff2') format('woff2'); }
html, body { margin: 0; padding: 0; background: ${PAPER.bg}; }
.page { position: relative; width: ${device.width}px; height: ${device.height}px; overflow: hidden; background: ${PAPER.bg}; }
.band { position: absolute; left: 0; top: 0; width: ${device.width}px; height: ${device.band}px; box-sizing: border-box;
  padding: 0 ${gutter}px ${Math.round(26 * k)}px; display: flex; flex-direction: column; justify-content: flex-end; }
.folio { font: 500 ${Math.round(13 * k)}px/1 'Pretendard', sans-serif; color: ${PAPER.sub}; letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums; margin-bottom: ${Math.round(12 * k)}px; }
.cap { font-family: ${font}; font-weight: 600; font-size: ${size}px; line-height: 1.3; color: ${PAPER.ink};
  letter-spacing: ${lang === 'en' ? '-0.01em' : '-0.02em'}; word-break: keep-all; overflow-wrap: break-word; margin: 0; }
.rule { position: absolute; left: 0; top: ${device.band - 1}px; width: ${device.width}px; height: 1px; background: ${PAPER.ink}; opacity: 0.18; }
.app { position: absolute; left: 0; top: ${device.band}px; width: ${device.width}px; height: ${appH}px; display: block; }
</style></head><body><div class="page">
<div class="band"><div class="folio">${esc(folio)}</div><p class="cap">${esc(caption)}</p></div>
<div class="rule"></div>
<img class="app" alt="" src="data:image/png;base64,${png.toString('base64')}">
</div></body></html>`;
}

async function main() {
  const opt = args(process.argv.slice(2));
  const devices = pickDevices(opt.devices);
  const scenes = pickScenes(opt.scenes);
  const all = pickScenes('all');

  if (opt.export) {
    const cmd = ['expo', 'export', '--platform', 'web', '--output-dir', WEB];
    console.log(`› npx ${cmd.join(' ')}`);
    // 프로 미리보기를 켠 채 내보내지 않는다 — 스토어 그림은 무료로 쓰는 모습 그대로
    const env = { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' };
    delete env.EXPO_PUBLIC_PRO_PREVIEW;
    execFileSync('npx', cmd, { cwd: ROOT, stdio: 'inherit', env });
  }
  if (!fs.existsSync(path.join(WEB, 'index.html'))) {
    console.error(`${WEB}/index.html이 없어요 — --no-export 없이 다시 실행해 주세요`);
    process.exit(2);
  }

  const { chromium } = loadPlaywright();
  const { server, port } = await serve(WEB);
  const browser = await launch(chromium);
  const problems = [];
  const written = [];
  const notes = new Set();
  const sel = (id) => `[data-testid="${id}"]`;
  try {
    for (const lang of opt.locales) {
      const fixture = require(`./fixtures/${lang}`).fixture();
      const { locale, timezoneId } = LOCALES[lang];
      for (const device of devices) {
        const dir = path.join(opt.out, lang, device.id);
        fs.mkdirSync(dir, { recursive: true });
        for (const scene of scenes) {
          const nn = String(all.indexOf(scene) + 1).padStart(2, '0');
          const tag = `[${lang} ${device.id} ${scene.id}]`;
          const doc = JSON.stringify(scene.prepare ? scene.prepare(fixture) : fixture);
          const view = viewOf(device, scene);
          const context = await browser.newContext({
            viewport: { width: view.width, height: view.height },
            deviceScaleFactor: view.scale, locale, timezoneId, reducedMotion: 'reduce',
          });
          await context.addInitScript(([d, l]) => {
            try {
              if (!sessionStorage.getItem('__shots_seeded')) {
                localStorage.clear();
                localStorage.setItem('mandarat:doc:v1', d);
                localStorage.setItem('mandarat:lang:v1', l);
                sessionStorage.setItem('__shots_seeded', '1');
              }
            } catch {}
          }, [doc, lang]);
          const page = await context.newPage();
          page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
          page.on('console', (m) => {
            if (m.type() !== 'error') return;
            const t = m.text();
            if (!KNOWN.some((re) => re.test(t))) problems.push(`${tag} console.error: ${t.slice(0, 300)}`);
          });
          await page.clock.install({ time: zonedEpoch(scene.clock || CLOCK, timezoneId) });
          const settle = async () => {
            await page.evaluate(() => document.fonts.ready);
            await page.clock.runFor(1500);
            await page.waitForTimeout(200);
          };
          const h = {
            lang, device, TID, page,
            tid: (id) => page.locator(sel(id)).first(),
            has: async (id) => !!id && (await page.locator(sel(id)).count()) > 0,
            wait: async (id) => {
              if (!id) throw new Error('testID가 없어요(src/lib/testIds.ts)');
              await page.locator(sel(id)).first().waitFor({ state: 'visible', timeout: 15000 });
            },
            /** V5-B가 붙이는 testID — 있으면 보일 때까지 기다리고, 아직 없으면 한 번 적고 넘어간다 */
            soft: async (id) => {
              try {
                await page.locator(sel(id)).first().waitFor({ state: 'visible', timeout: 4000 });
              } catch {
                if (!notes.has(id)) console.log(`  (참고) testID '${id}'가 아직 화면에 없어요 — 탭만 누르고 찍어요(V5-B)`);
                notes.add(id);
              }
            },
            tap: async (id) => {
              if (!id) throw new Error('testID가 없어요(src/lib/testIds.ts)');
              const loc = page.locator(sel(id)).first();
              try {
                await loc.waitFor({ state: 'visible', timeout: 15000 });
              } catch {
                throw new Error(`testID '${id}'를 화면에서 찾지 못했어요`);
              }
              await loc.click();
              await settle();
            },
            settle,
          };
          try {
            const q = ['lang=' + lang, device.query].filter(Boolean).join('&');
            await page.goto(`http://127.0.0.1:${port}/?${q}`);
            await page.waitForSelector(sel(TID.tab('dashboard')), { timeout: 30000 });
            // 스크롤 막대는 웹에만 있다 — 기기 화면처럼 숨긴다
            await page.addStyleTag({ content: '*::-webkit-scrollbar { display: none !important; } * { scrollbar-width: none !important; }' });
            await settle();
            await scene.run(page, h);
            await settle();
            const app = await page.screenshot({ type: 'png' });

            const comp = await browser.newContext({ viewport: { width: device.width, height: device.height }, deviceScaleFactor: device.scale });
            const cp = await comp.newPage();
            await cp.goto(`http://127.0.0.1:${port}/__blank`, { waitUntil: 'domcontentloaded' }).catch(() => {});
            const caption = CAPTIONS[lang][scene.id];
            await cp.setContent(composeHtml({ device, lang, caption, folio: `${nn} / ${String(all.length).padStart(2, '0')}`, png: app }));
            await cp.evaluate(async () => {
              await document.fonts.ready;
              await Promise.all([...document.images].map((im) => (im.complete ? null : new Promise((r) => { im.onload = r; im.onerror = r; }))));
            });
            // 맞추기 — 일본어는 글자 어디서나 줄이 바뀌어 한 글자만 넘어가기 쉬우니 한 줄에 들게 글씨를 조금(85%까지) 줄인다.
            // 한국어 · 영어는 낱말 단위로 두 줄까지 두고, 그보다 길면 줄인다.
            const fit = await cp.evaluate((ja) => {
              const band = document.querySelector('.band');
              const cap = document.querySelector('.cap');
              const base = parseFloat(getComputedStyle(cap).fontSize);
              const lines = () => Math.round(cap.getBoundingClientRect().height / parseFloat(getComputedStyle(cap).lineHeight));
              if (ja) cap.style.whiteSpace = 'nowrap';
              let size = base;
              const over = () => (ja ? cap.scrollWidth > cap.clientWidth : lines() > 2);
              while (over() && size > base * 0.85) cap.style.fontSize = `${(size -= 0.5)}px`;
              if (ja && over()) cap.style.whiteSpace = 'normal';
              return { lines: lines(), over: band.scrollHeight > band.clientHeight + 1 };
            }, lang === 'ja');
            if (fit.over || fit.lines > 2) problems.push(`${tag} 설명이 띠를 넘쳐요(${fit.lines}줄): ${caption}`);
            const shot = await cp.screenshot({ type: 'png', clip: { x: 0, y: 0, width: device.width, height: device.height } });
            await comp.close();
            const file = path.join(dir, `${nn}-${scene.id}.png`);
            fs.writeFileSync(file, toRGB(shot, hex(PAPER.bg)));
            written.push(file);
            console.log(`✔ ${tag} → ${path.relative(ROOT, file)}`);
          } catch (e) {
            problems.push(`${tag} ${e.message.split('\n')[0]}`);
          }
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  const v = verifyDir(opt.out);
  const mine = v.problems.filter((p) => written.some((f) => p.startsWith(f)));
  problems.push(...mine);
  console.log(`스크린샷 ${written.length}장 → ${path.relative(ROOT, opt.out) || opt.out}`);
  if (problems.length > 0) {
    console.error(`store-shots 실패 (${problems.length}):\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log('store-shots: 모두 통과(verify 포함)');
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { zonedEpoch, composeHtml, viewOf, LOCALES, CLOCK };
