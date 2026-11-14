#!/usr/bin/env node
// 디자인 점검용 화면 찍기 — 웹 스모크(scripts/web-smoke.js)가 찍지 않는 것을 더 찍는다:
// 긴 화면(내용이 잘리지 않게 키 큰 창), 다크, 크게 본 블록, 실천 시트, 집중 타이머, 다른 무드, 작은 폰(375 × 667).
// 쓰는 법: node tools/design-shots/capture.js [--out <dir>] [--no-export]
// 스모크와 같은 문서(scripts/smoke/demoDoc.js) · 같은 시계(2026-10-14 09:30 서울)를 써서, 고치기 전과 뒤를 나란히 볼 수 있다.
const { execFileSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CLOCK = '2026-10-14T09:30:00+09:00';
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };

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
  const argv = process.argv.slice(2);
  const out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : '/tmp/design-shots';
  const dist = path.join(ROOT, 'dist');
  if (!argv.includes('--no-export')) {
    execFileSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', dist], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' } });
  }
  require('../../tests/register');
  const { TID } = require('../../src/lib/testIds');
  const { demoDoc } = require('../../scripts/smoke/demoDoc');
  const { chromium } = require('playwright');
  const { server, port } = await serve(dist);
  const browser = await chromium.launch();
  fs.mkdirSync(out, { recursive: true });
  const sel = (id) => `[data-testid="${id}"]`;
  const problems = [];

  /** 한 가지 꾸밈(무드 · 창 크기)으로 앱을 열고 fn을 돌린다 */
  async function session(name, { mood, width = 390, height = 844, scale = 2 }, fn) {
    const doc = demoDoc();
    if (mood) doc.settings = { ...doc.settings, mood };
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, timezoneId: 'Asia/Seoul', locale: 'ko-KR', reducedMotion: 'reduce' });
    await context.addInitScript(([d]) => {
      try {
        if (!sessionStorage.getItem('__seeded')) {
          localStorage.setItem('mandarat:doc:v1', d);
          localStorage.setItem('mandarat:lang:v1', 'ko');
          sessionStorage.setItem('__seeded', '1');
        }
      } catch {}
    }, [JSON.stringify(doc)]);
    const page = await context.newPage();
    await page.clock.install({ time: new Date(CLOCK) });
    const h = {
      page, TID,
      tid: (id) => page.locator(sel(id)).first(),
      settle: async () => {
        await page.evaluate(() => document.fonts.ready);
        await page.clock.runFor(1500);
        await page.waitForTimeout(150);
      },
      shot: async (n) => {
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: path.join(out, `${name}-${n}.png`) });
      },
      home: async () => {
        await page.goto(`http://127.0.0.1:${port}/?lang=ko`);
        await page.waitForSelector(sel(TID.tab('dashboard')), { timeout: 30000 });
        await h.settle();
      },
      step: async (label, f) => {
        try { await f(); } catch (e) { problems.push(`${name} ${label}: ${String(e.message).split('\n')[0]}`); }
      },
    };
    try {
      await h.home();
      await fn(h);
    } catch (e) {
      problems.push(`${name}: ${String(e.message).split('\n')[0]}`);
    } finally {
      await context.close();
    }
  }

  /** 만다라트 탭 → 표의 왼쪽 위 블록(첫 영역)을 눌러 크게 본다 */
  const openDetail = async (h) => {
    await h.tid(TID.tab('grid')).click();
    await h.settle();
    const box = await h.tid(TID.gridTable).boundingBox();
    await h.page.mouse.click(box.x + box.width / 6, box.y + box.height / 6);
    await h.settle();
  };

  const tabs = async (h) => {
    for (const t of ['dashboard', 'grid', 'today', 'stats']) {
      await h.step(`tab ${t}`, async () => {
        await h.tid(TID.tab(t)).click();
        await h.settle();
        await h.shot(`tab-${t}`);
      });
    }
  };

  // 1. 밝은 기본(미색) — 폰 크기 그대로
  await session('light', {}, async (h) => {
    await tabs(h);
    // 영역 페이지(표의 왼쪽 위 블록을 누른다) → 칸을 눌러 실천 시트 → 집중 타이머
    await h.step('detail', async () => {
      await openDetail(h);
      await h.shot('grid-zoom');
      const cell = h.tid(TID.gridCell(0, 0));
      if (!(await cell.count())) return;
      await cell.click();
      await h.settle();
      await h.shot('action-sheet');
      const focus = h.tid(TID.sheetFocus);
      if (await focus.count()) {
        await focus.click();
        await h.settle();
        await h.shot('focus-timer');
      }
    });
    await h.step('add', async () => {
      await h.home();
      await h.tid(TID.tabAdd).click();
      await h.settle();
      await h.shot('quick-add');
    });
    await h.step('settings', async () => {
      await h.home();
      await h.tid(TID.homeSettings).click();
      await h.settle();
      await h.shot('settings');
    });
  });

  // 2. 밝은 기본 — 키 큰 창(내용 전체)
  await session('light-tall', { height: 2600, scale: 1.5 }, async (h) => {
    await tabs(h);
    await h.step('settings', async () => {
      await h.home();
      await h.tid(TID.homeSettings).click();
      await h.settle();
      await h.shot('settings');
    });
  });

  // 3. 다크
  await session('dark', { mood: '다크' }, async (h) => {
    await tabs(h);
    await h.step('detail', async () => {
      await openDetail(h);
      await h.shot('grid-zoom');
    });
  });
  await session('dark-tall', { mood: '다크', height: 2600, scale: 1.5 }, tabs);

  // 4. 다른 무드(크림 · 화이트 · 파스텔) — 홈과 표만
  for (const mood of ['크림', '화이트', '파스텔']) {
    await session(`mood-${mood}`, { mood }, async (h) => {
      await h.shot('tab-dashboard');
      await h.step('grid', async () => {
        await h.tid(TID.tab('grid')).click();
        await h.settle();
        await h.shot('tab-grid');
      });
    });
  }

  // 5. 작은 폰(iPhone SE)
  await session('se', { width: 375, height: 667 }, tabs);

  await browser.close();
  server.close();
  const files = fs.readdirSync(out).filter((f) => f.endsWith('.png'));
  console.log(`design-shots: ${files.length}장 → ${out}`);
  if (problems.length) console.log(`찍지 못한 것:\n${problems.join('\n')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
