#!/usr/bin/env node
// 디자인 시안(HTML) → PNG. 시안은 앱 코드가 아니라, 방향을 고르려고 그리는 그림이다(docs/design/mockups/<방향>/<화면>.html).
// 저장소 뿌리를 그대로 띄우므로 시안은 절대 경로로 가져다 쓴다:
//   /tools/design-mockups/data.json   — 지금 앱 화면과 같은 예시 데이터
//   /tools/design-mockups/kit.css     — Pretendard @font-face와 390 × 844 틀
//   /node_modules/pretendard/...      — 서체 파일
// 쓰는 법: node tools/design-mockups/render.js docs/design/mockups/<방향> [--only home,chart] [--scale 2]
// 창 크기는 시안의 <meta name="mock:size" content="390x844">(없으면 390x844). <meta name="mock:dark" content="1">이면 다크로 찍는다.
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.otf': 'font/otf', '.ttf': 'font/ttf',
};

function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = path.join(ROOT, url);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

async function main() {
  const argv = process.argv.slice(2);
  const dir = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--only' && argv[argv.indexOf(a) - 1] !== '--scale');
  if (!dir) {
    console.error('쓰는 법: node tools/design-mockups/render.js <시안 폴더> [--only a,b] [--scale 2]');
    process.exit(2);
  }
  const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1].split(',') : null;
  const scale = argv.includes('--scale') ? Number(argv[argv.indexOf('--scale') + 1]) : 2;
  const abs = path.resolve(ROOT, dir);
  const files = fs.readdirSync(abs).filter((f) => f.endsWith('.html')).filter((f) => !only || only.includes(f.replace(/\.html$/, ''))).sort();
  const { chromium } = require('playwright');
  const { server, port } = await serve();
  const browser = await chromium.launch();
  const problems = [];
  for (const f of files) {
    const html = fs.readFileSync(path.join(abs, f), 'utf8');
    const size = (/<meta name="mock:size" content="(\d+)x(\d+)"/.exec(html) || []).slice(1).map(Number);
    const [width, height] = size.length === 2 ? size : [390, 844];
    const dark = /<meta name="mock:dark" content="1"/.test(html);
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, locale: 'ko-KR', timezoneId: 'Asia/Seoul', colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', (e) => problems.push(`${f}: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`${f}: ${m.text().slice(0, 200)}`); });
    page.on('requestfailed', (r) => problems.push(`${f}: 못 불러옴 ${r.url()}`));
    await page.goto(`http://127.0.0.1:${port}/${path.relative(ROOT, path.join(abs, f)).split(path.sep).map(encodeURIComponent).join('/')}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    // 넘친 글(가로로 창을 벗어난 것)을 적어 둔다 — 시안이 깨진 줄 모르고 넘어가지 않게
    const over = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      return [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > w + 1 && !e.closest('[data-bleed]')).slice(0, 5).map((e) => `${e.tagName.toLowerCase()}.${e.className}`.slice(0, 60));
    });
    if (over.length) problems.push(`${f}: 창 밖으로 넘침 — ${over.join(', ')}`);
    await page.screenshot({ path: path.join(abs, f.replace(/\.html$/, '.png')) });
    await context.close();
    console.log(`✔ ${f} → ${f.replace(/\.html$/, '.png')} (${width}×${height} @${scale}x${dark ? ', dark' : ''})`);
  }
  await browser.close();
  server.close();
  if (problems.length) {
    console.log(`문제 ${problems.length}개:\n${problems.join('\n')}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
