#!/usr/bin/env node
// 웹 스모크 — 웹으로 내보낸 앱을 띄워 ko · ja · en마다 네 탭과 설정, scripts/smoke/*.js 장면을 돌려 보고 화면을 찍는다.
// 페이지 오류(pageerror)나 console.error가 하나라도 나오면 실패한다.
//
// 쓰는 법: npm run web-smoke -- [--no-export] [--dev] [--langs ko,ja,en] [--width 390] [--compare <dir>] [--out <dir>]
// - --no-export: 이미 내보낸 dist/(또는 --dev면 dist-dev/)를 쓴다.
// - --dev: 개발 번들(expo export --dev) — window.__ui 손잡이가 있다. 손잡이가 필요한 장면(needsDev)은 이때만 돈다.
// - --compare <dir>: 찍은 화면을 그 폴더의 같은 이름 파일과 바이트로 비교해 다른 것을 적는다(다르면 실패).
// 결정성: 시간대 Asia/Seoul · 움직임 줄이기 · 시계를 2026-10-14 09:30(서울)에 고정 · 서체를 다 불러온 뒤 찍는다.
const { execFileSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SMOKE = path.join(__dirname, 'smoke');
const CLOCK = '2026-10-14T09:30:00+09:00';
/** 알려진 React Native Web 경고 — 실패로 보지 않는다 */
const KNOWN = [
  /props\.pointerEvents is deprecated/,
  /"shadow\*" style props are deprecated/,
  /Animated: `useNativeDriver` is not supported/,
  /accessibilityLargeContentTitle|accessibilityShowsLargeContentViewer/,
  // 개발 번들(--dev)에서만: 고쳐 쓰기(HMR) 소켓, React DOM이 RN 전용 속성(collapsable · transform-origin)에 내는 경고
  /WebSocket connection to '.*\/(hot|message)' failed/,
  /non-boolean attribute[\s\S]*collapsable/,
  /Invalid DOM property[\s\S]*transform-origin/,
];

function args(argv) {
  const o = { export: true, dev: false, langs: ['ko', 'ja', 'en'], width: 390, compare: null, out: '/tmp/web-smoke' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-export') o.export = false;
    else if (a === '--dev') o.dev = true;
    else if (a === '--langs') o.langs = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--width') o.width = Number(argv[++i]);
    else if (a === '--compare') o.compare = argv[++i];
    else if (a === '--out') o.out = argv[++i];
    else throw new Error(`모르는 옵션: ${a}`);
  }
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
      console.error('Playwright가 없어요. 설치: npm i -g playwright@1.56.1 && npx playwright install chromium');
      process.exit(2);
    }
  }
}

const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.otf': 'font/otf', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

/** dist를 띄운다 — 없는 경로는 index.html(SPA) */
function serve(dir) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.join(dir, url);
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dir, 'index.html');
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

async function main() {
  const opt = args(process.argv.slice(2));
  const dist = path.join(ROOT, opt.dev ? 'dist-dev' : 'dist');
  if (opt.export) {
    const cmd = ['expo', 'export', '--platform', 'web', '--output-dir', dist, ...(opt.dev ? ['--dev'] : [])];
    console.log(`› npx ${cmd.join(' ')}`);
    execFileSync('npx', cmd, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' } });
  }
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    console.error(`${dist}/index.html이 없어요 — --no-export 없이 다시 실행해 주세요`);
    process.exit(2);
  }

  require('../tests/register');
  const { TID } = require('../src/lib/testIds');
  const { demoDoc } = require('./smoke/demoDoc');
  const doc = JSON.stringify(demoDoc());
  const scenes = fs.readdirSync(SMOKE).filter((f) => f.endsWith('.js') && f !== 'demoDoc.js').sort()
    .map((f) => ({ name: f.replace(/\.js$/, ''), run: require(path.join(SMOKE, f)) }));

  const { chromium } = loadPlaywright();
  const { server, port } = await serve(dist);
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? {} : {});
  fs.mkdirSync(opt.out, { recursive: true });
  const problems = [];
  const shots = [];
  try {
    for (const lang of opt.langs) {
      const context = await browser.newContext({
        viewport: { width: opt.width, height: 844 }, deviceScaleFactor: 1, timezoneId: 'Asia/Seoul', locale: 'ko-KR', reducedMotion: 'reduce',
      });
      await context.addInitScript(([d, l]) => {
        try {
          if (!sessionStorage.getItem('__smoke_seeded')) {
            localStorage.setItem('mandarat:doc:v1', d);
            localStorage.setItem('mandarat:lang:v1', l);
            sessionStorage.setItem('__smoke_seeded', '1');
          }
        } catch {}
      }, [doc, lang]);
      const page = await context.newPage();
      await page.clock.install({ time: new Date(CLOCK) });
      page.on('pageerror', (e) => problems.push(`[${lang}] pageerror: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() !== 'error') return;
        const t = m.text();
        if (KNOWN.some((re) => re.test(t))) return;
        problems.push(`[${lang}] console.error: ${t.slice(0, 300)}`);
      });
      const sel = (id) => `[data-testid="${id}"]`;
      const h = {
        lang, width: opt.width, TID, page,
        url: `http://127.0.0.1:${port}/?lang=${lang}`,
        tid: (id) => page.locator(sel(id)).first(),
        tap: async (id) => page.locator(sel(id)).first().click(),
        settle: async () => {
          await page.evaluate(() => document.fonts.ready);
          await page.clock.runFor(1500);
          await page.waitForTimeout(150);
        },
        shot: async (name) => {
          await page.evaluate(() => document.fonts.ready);
          const file = path.join(opt.out, `${lang}-${name}.png`);
          await page.screenshot({ path: file });
          shots.push(file);
        },
      };
      await page.goto(h.url);
      await page.waitForSelector(sel(TID.tab('dashboard')), { timeout: 30000 });
      await h.settle();
      await h.shot('home');
      for (const s of scenes) {
        if (s.run.needsDev && !opt.dev) {
          console.log(`  (건너뜀) ${s.name}: window.__ui가 필요해요 — --dev로 실행`);
          continue;
        }
        try {
          await s.run(page, h);
          console.log(`✔ [${lang}] ${s.name}`);
        } catch (e) {
          problems.push(`[${lang}] scene ${s.name}: ${e.message.split('\n')[0]}`);
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (opt.compare) {
    const diff = [];
    for (const f of shots) {
      const other = path.join(opt.compare, path.basename(f));
      if (!fs.existsSync(other)) diff.push(`${path.basename(f)} (기준에 없음)`);
      else if (!fs.readFileSync(f).equals(fs.readFileSync(other))) diff.push(path.basename(f));
    }
    if (diff.length > 0) problems.push(`다른 화면 ${diff.length}장:\n  ${diff.join('\n  ')}`);
    else console.log(`비교: ${shots.length}장 모두 같아요`);
  }

  console.log(`화면 ${shots.length}장 → ${opt.out}`);
  if (problems.length > 0) {
    console.error(`web-smoke 실패:\n${problems.join('\n')}`);
    process.exit(1);
  }
  console.log('web-smoke: 모두 통과');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
