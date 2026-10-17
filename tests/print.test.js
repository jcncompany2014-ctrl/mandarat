// 찍기 플랫폼 지킴(src/lib/print(.web/.native).ts · printFonts(.web/.native).ts) — expo-print는 기기 파일에서만,
// 웹은 숨긴 iframe으로 찍고, Node 기본 파일은 아무것도 하지 않는다. 세 쪽이 같은 이름을 내보낸다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
/** 주석을 뺀 소스 */
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

function srcFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...srcFiles(rel));
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(rel);
  }
  return out;
}

test('expo-print를 부르는 파일은 print.native.ts 하나뿐', () => {
  const users = [...srcFiles('src'), 'App.tsx'].filter((f) => /from 'expo-print'|require\('expo-print'\)/.test(read(f)));
  assert.deepEqual(users, ['src/lib/print.native.ts']);
});

test('웹은 숨긴 iframe(srcdoc)의 print()로 찍고, expo-print를 부르지 않는다', () => {
  const src = code('src/lib/print.web.ts');
  assert.match(src, /createElement\('iframe'\)/);
  assert.match(src, /\.srcdoc = html/);
  assert.match(src, /contentWindow/);
  assert.match(src, /\.print\(\)/);
  assert.match(src, /frame\.remove\(\)/, '찍은 뒤 iframe을 치운다');
  assert.match(src, /<title>\$\{esc\(name/, "PDF 파일 이름 = 제목");
  assert.doesNotMatch(src, /expo-print/);
});

test('기기: printAsync · printToFileAsync(종이 크기) · 취소는 조용히 · 이름 바꿔 공유 · 줄 세우기', () => {
  const src = code('src/lib/print.native.ts');
  assert.match(src, /Print\.printAsync\(\{ html, \.\.\.dims\(size\) \}\)/);
  assert.match(src, /Print\.printToFileAsync\(\{ html, \.\.\.dims\(size\) \}\)/);
  assert.match(src, /PRINT_INCOMPLETE/);
  assert.match(src, /return 'cancelled'/);
  assert.match(src, /new File\(Paths\.cache, name\)/);
  assert.match(src, /Share\.share\(\{ url: uri, title: name \}\)/);
  assert.match(src, /serial\(/);
});

test('Node 기본 파일은 늘 실패를 돌려주고 글꼴 CSS가 없다', async () => {
  const { printer } = require('../src/lib/print');
  const { printFonts } = require('../src/lib/printFonts');
  assert.equal(await printer.printNow('<p>x</p>', { w: 1, h: 1 }), 'failed');
  assert.equal(await printer.exportPdf('<p>x</p>', { w: 1, h: 1 }, 'a.pdf'), 'failed');
  assert.equal(await printFonts.fontCss(), '');
});

test('세 쪽이 같은 이름을 내보내고, 기기 글꼴은 base64로 한 번만 만든다', () => {
  for (const f of ['src/lib/print.ts', 'src/lib/print.web.ts', 'src/lib/print.native.ts']) assert.match(read(f), /export const printer = \{[\s\S]*\} satisfies Printer;/, f);
  for (const f of ['src/lib/printFonts.ts', 'src/lib/printFonts.web.ts', 'src/lib/printFonts.native.ts']) assert.match(read(f), /export const printFonts = \{[\s\S]*\} satisfies PrintFonts;/, f);
  const native = code('src/lib/printFonts.native.ts');
  assert.match(native, /Asset\.fromModule\(mod\)\.downloadAsync\(\)/);
  assert.match(native, /new File\(asset\.localUri\)\.base64\(\)/);
  assert.match(native, /data:font\/otf;base64,/);
  assert.match(native, /if \(!pending\)/, '메모리에 한 번');
  assert.match(code('src/lib/printFonts.web.ts'), /\.uri/);
  // 꼬리표 파일은 같은 이름의 기본 파일을 부르지 않는다(Metro가 자기 자신으로 풀어 버린다)
  for (const f of ['src/lib/print.web.ts', 'src/lib/print.native.ts', 'src/lib/printFonts.web.ts', 'src/lib/printFonts.native.ts']) {
    assert.doesNotMatch(read(f), /from '\.\/print(Fonts)?'/, f);
  }
});
