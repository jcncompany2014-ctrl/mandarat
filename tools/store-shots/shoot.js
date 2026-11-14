#!/usr/bin/env node
// 앱스토어 스크린샷 — 웹으로 내보낸 앱을 언어마다 띄워, 기기 크기마다 포스터 여섯 장을 만든다(docs/design/build-plan.md §3 R1).
// 포스터 = 바탕 · 머리말 · 두 줄 제목 · 그림 하나(poster.js). 그림은 앱의 한 쪽을 잘라 낸 것(scenes.js) 또는 예시 문서로 그린 위젯.
// 예시 문서(fixtures/<언어>.js)를 넣고, 시계(2026-10-14 09:30, 기기 시간대)와 움직임 줄이기를 고정해 실행마다 같은 그림이 나온다.
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
/** 일본어 글꼴(리눅스에는 Hiragino가 없다) — 이 도구의 devDependency. 앱의 일본어 글꼴 목록(JA_WEB_STACK)에 있는 'Noto Sans JP' 이름으로 띄운다 */
const JP_DIR = path.join(HERE, 'node_modules', '@fontsource-variable', 'noto-sans-jp');

require(path.join(ROOT, 'tests', 'register'));
const { TID } = require(path.join(ROOT, 'src', 'lib', 'testIds'));
const { LIGHT } = require(path.join(ROOT, 'src', 'theme', 'tokens'));
const { widgetProps } = require(path.join(ROOT, 'src', 'lib', 'widgetSnapshot'));
const { pickDevices } = require('./devices');
const { pickScenes, SCENES } = require('./scenes');
const { layout, composeHtml, GROUNDS } = require('./poster');
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

/** 벽시계 시각 → 그 날짜 · 시각의 Date(이 프로세스의 지역 시간) — 위젯 값을 셈하는 순수 코드는 지역 날짜를 읽는다 */
function wallDate(wall) {
  const [d, t] = wall.split('T');
  const [y, mo, da] = d.split('-').map(Number);
  const [h, mi] = t.split(':').map(Number);
  return new Date(y, mo - 1, da, h, mi);
}

/** Noto Sans JP의 @font-face(유니코드 구역마다 한 파일)를 'Noto Sans JP' 이름, /__jp/files/ 주소로 */
function jpCss() {
  const file = path.join(JP_DIR, 'wght.css');
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8')
    .replace(/font-family:\s*'Noto Sans JP Variable'/g, "font-family: 'Noto Sans JP'")
    .replace(/url\(\.\/files\//g, 'url(/__jp/files/');
}

const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

/** .web을 띄운다 — 없는 경로는 index.html(SPA), /__font/<이름>은 Pretendard, /__jp/는 Noto Sans JP */
function serve(dir) {
  const jp = jpCss();
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url === '/__jp/noto-sans-jp.css') {
      res.writeHead(jp ? 200 : 404, { 'Content-Type': 'text/css' });
      res.end(jp || '');
      return;
    }
    let file;
    if (url.startsWith('/__font/')) file = path.join(FONTS, path.basename(url));
    else if (url.startsWith('/__jp/files/')) file = path.join(JP_DIR, 'files', path.basename(url));
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

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

/**
 * 앱을 띄워 장면을 열고 plan의 창 · 확대로 찍어 crop만큼 잘라 돌려준다 — { png, w, h }(w · h는 포스터에 놓을 크기, pt).
 */
async function capture({ browser, port, lang, device, scene, plan, L, fixture, problems, tag }) {
  const { locale, timezoneId } = LOCALES[lang];
  const doc = JSON.stringify(scene.prepare ? scene.prepare(fixture) : fixture);
  const context = await browser.newContext({
    viewport: { width: plan.view.width, height: plan.view.height },
    deviceScaleFactor: device.scale * plan.zoom, locale, timezoneId, reducedMotion: 'reduce', colorScheme: 'light',
  });
  try {
    await context.addInitScript(([d, l]) => {
      try {
        if (!sessionStorage.getItem('__shots_seeded')) {
          localStorage.clear();
          localStorage.setItem('mandarat:doc:v1', d);
          localStorage.setItem('mandarat:lang:v1', l);
          localStorage.setItem('mandarat:look:v1', 'light');
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
    const sel = (id) => `[data-testid="${id}"]`;
    const settle = async () => {
      await page.evaluate(() => document.fonts.ready);
      await page.clock.runFor(1500);
      await page.waitForTimeout(200);
      await page.evaluate(() => document.fonts.ready);
    };
    const h = {
      lang, device, TID, page,
      wait: async (id) => {
        if (!id) throw new Error('testID가 없어요(src/lib/testIds.ts)');
        try {
          await page.locator(sel(id)).first().waitFor({ state: 'visible', timeout: 15000 });
        } catch {
          throw new Error(`testID '${id}'를 화면에서 찾지 못했어요`);
        }
      },
      tap: async (id) => {
        await h.wait(id);
        await page.locator(sel(id)).first().click();
        await settle();
      },
      settle,
    };
    const q = ['lang=' + lang, device.query].filter(Boolean).join('&');
    await page.goto(`http://127.0.0.1:${port}/?${q}`);
    await page.waitForSelector(sel(TID.tab('dashboard')), { timeout: 30000 });
    // 스크롤 막대는 웹에만 있다 — 기기 화면처럼 숨긴다. 일본어는 앱의 글꼴 목록에 있는 Noto Sans JP를 띄운다(맥에서는 Hiragino가 먼저)
    await page.addStyleTag({ content: '*::-webkit-scrollbar { display: none !important; } * { scrollbar-width: none !important; }' });
    // 일본어 줄바꿈은 낱말(문절) 단위로 — 웹의 기본은 글자 어디서나 끊어 '…はま / だです'처럼 된다(기기의 iOS도 문절을 지킨다)
    if (lang === 'ja') {
      await page.addStyleTag({ url: '/__jp/noto-sans-jp.css' });
      await page.addStyleTag({ content: '* { word-break: auto-phrase !important; }' });
    }
    await settle();
    await scene.run(page, h);
    await settle();
    const rect = await scene.crop(page, h, plan, L);
    const clip = { x: rect.x, y: rect.y, width: rect.width, height: Math.min(rect.height, plan.view.height - rect.y) };
    if (clip.y < 0 || clip.height <= 0) throw new Error(`자를 자리가 창 밖이에요(${JSON.stringify(rect)})`);
    const png = await page.screenshot({ type: 'png', clip });
    return { png, w: clip.width * plan.zoom, h: clip.height * plan.zoom };
  } finally {
    await context.close();
  }
}

/** 포스터를 띄워 찍는다. 제목 줄이 글 여백을 넘으면 글씨를 85%까지 줄이고, 그래도 넘으면 문제로 적는다 */
async function poster({ browser, port, lang, device, html, problems, tag }) {
  const comp = await browser.newContext({ viewport: { width: device.width, height: device.height }, deviceScaleFactor: device.scale, colorScheme: 'light' });
  try {
    const cp = await comp.newPage();
    await cp.goto(`http://127.0.0.1:${port}/__blank`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await cp.setContent(html, { waitUntil: 'load' });
    await cp.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((im) => (im.complete ? null : new Promise((r) => { im.onload = r; im.onerror = r; }))));
    });
    const fit = await cp.evaluate(() => {
      const head = document.querySelector('.head');
      const cap = document.querySelector('.cap');
      const room = head.clientWidth;
      const base = parseFloat(getComputedStyle(head).fontSize);
      const lh = parseFloat(getComputedStyle(head).lineHeight) / base;
      const widest = () => Math.max(...[...head.querySelectorAll('.ln')].map((l) => l.getBoundingClientRect().width));
      let size = base;
      while (widest() > room && size > base * 0.85) {
        size -= 0.5;
        head.style.fontSize = `${size}px`;
        head.style.lineHeight = `${size * lh}px`;
      }
      return { over: widest() > room, capOver: cap.scrollWidth > cap.clientWidth + 1, size, base };
    });
    if (fit.over) problems.push(`${tag} 제목이 여백을 넘어요(${fit.size}px까지 줄였어요)`);
    if (fit.capOver) problems.push(`${tag} 머리말이 한 줄에 들지 않아요`);
    if (fit.size < fit.base) console.log(`  (참고) ${tag} 제목 글씨를 ${fit.base} → ${fit.size}px로 줄였어요`);
    return await cp.screenshot({ type: 'png', clip: { x: 0, y: 0, width: device.width, height: device.height } });
  } finally {
    await comp.close();
  }
}

async function main() {
  const opt = args(process.argv.slice(2));
  const devices = pickDevices(opt.devices);
  const scenes = pickScenes(opt.scenes);

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
  if (opt.locales.includes('ja') && !jpCss()) console.log('  (참고) Noto Sans JP가 없어요 — npm --prefix tools/store-shots ci. 일본어는 시스템 글꼴로 그려요');

  const { chromium } = loadPlaywright();
  const { server, port } = await serve(WEB);
  const browser = await launch(chromium);
  const problems = [];
  const written = [];
  try {
    for (const lang of opt.locales) {
      const fixture = require(`./fixtures/${lang}`).fixture();
      for (const device of devices) {
        const dir = path.join(opt.out, lang, device.id);
        fs.mkdirSync(dir, { recursive: true });
        const L = layout(device);
        for (const scene of scenes) {
          const nn = String(SCENES.indexOf(scene) + 1).padStart(2, '0');
          const tag = `[${lang} ${device.id} ${scene.id}]`;
          try {
            let picture = null;
            let plan = null;
            let widgets = null;
            if (scene.widgets) {
              const doc = scene.prepare ? scene.prepare(fixture) : fixture;
              widgets = widgetProps(doc, wallDate(scene.clock || CLOCK), { pat: 'blank', lang });
            } else {
              plan = scene.plan(L);
              picture = await capture({ browser, port, lang, device, scene, plan, L, fixture, problems, tag });
            }
            const caption = CAPTIONS[lang][scene.id];
            const html = composeHtml({ device, lang, scene, caption, brand: CAPTIONS[lang].brand, plan, picture, widgets });
            const shot = await poster({ browser, port, lang, device, html, problems, tag });
            const file = path.join(dir, `${nn}-${scene.id}.png`);
            fs.writeFileSync(file, toRGB(shot, hex(GROUNDS[scene.ground] || LIGHT.paper)));
            written.push(file);
            console.log(`✔ ${tag} → ${path.relative(ROOT, file)}`);
          } catch (e) {
            problems.push(`${tag} ${e.message.split('\n')[0]}`);
          }
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

module.exports = { zonedEpoch, wallDate, jpCss, LOCALES, CLOCK };
