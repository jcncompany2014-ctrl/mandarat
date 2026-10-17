// V2-D 인쇄 시트 — 무료 인쇄는 잠기지 않는다(printLock) · 저장값 읽기는 너그럽다 · 시트는 Sheet와 LineRow로 · 잠긴 선택은 openPro로
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

// AsyncStorage는 Node에서 읽을 수 없다 — 메모리 저장소로 바꿔 끼운다
const mem = new Map();
const fakeStorage = {
  getItem: async (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: async (k, v) => { mem.set(k, v); },
};
const origLoad = Module._load;
Module._load = function load(request, ...rest) {
  if (request === '@react-native-async-storage/async-storage') return { __esModule: true, default: fakeStorage };
  return origLoad.call(this, request, ...rest);
};

const P = require('../src/lib/printPrefs');
const { PRINT_PAPERS, STORE_KEYS } = require('../src/lib/contracts');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('printLock: A4 · 레터의 표 한 장은 빈 표든 채운 표든 늘 무료', () => {
  for (const paper of ['A4', 'Letter']) {
    for (const blank of [true, false]) {
      assert.equal(P.printLock({ paper, layout: 'chart', blank }), null, `${paper} ${blank}`);
      assert.equal(P.printLock({ paper, layout: 'chart', blank }, {}), null);
      assert.equal(P.printLock({ paper, layout: 'chart', blank }, null), null);
    }
  }
});

test('printLock: A3 · A5 · B5와 표지 + 영역별 8쪽만 printSize, 지난 표만 archive', () => {
  for (const paper of ['A3', 'A5', 'B5']) {
    for (const blank of [true, false]) assert.equal(P.printLock({ paper, layout: 'chart', blank }), 'printSize');
  }
  for (const paper of PRINT_PAPERS) assert.equal(P.printLock({ paper, layout: 'areas', blank: false }), 'printSize');
  for (const paper of PRINT_PAPERS) {
    assert.equal(P.printLock({ paper, layout: 'chart', blank: false }, { archiveId: 'y20260101' }), 'archive');
  }
});

test('resolvePrintOptions: 프로가 없으면 저장된 프로 선택을 무료 모양으로 그린다(저장값은 그대로)', () => {
  const stored = { paper: 'A3', layout: 'areas', blank: true };
  for (const owned of [true, false]) {
    // 무료 선택은 owned와 상관없이 그대로
    assert.deepEqual(P.resolvePrintOptions({ paper: 'A4', layout: 'chart', blank: false }, 'Letter', owned), { paper: 'A4', layout: 'chart', blank: false });
    assert.deepEqual(P.resolvePrintOptions({ paper: 'Letter', blank: true }, 'A4', owned), { paper: 'Letter', layout: 'chart', blank: true });
  }
  assert.deepEqual(P.resolvePrintOptions(stored, 'A4', false), { paper: 'A4', layout: 'chart', blank: true });
  assert.deepEqual(P.resolvePrintOptions(stored, 'Letter', false), { paper: 'Letter', layout: 'chart', blank: true });
  assert.deepEqual(P.resolvePrintOptions(stored, 'A4', true), stored);
  assert.deepEqual(stored, { paper: 'A3', layout: 'areas', blank: true });
  // 아무것도 고르지 않았으면 지역의 기본 종이 · 표 한 장 · 채운 표
  assert.deepEqual(P.resolvePrintOptions({}, 'Letter', false), { paper: 'Letter', layout: 'chart', blank: false });
});

test('defaultPaper: 미국 · 캐나다는 레터, 그 밖은 A4', () => {
  assert.equal(P.defaultPaper('US'), 'Letter');
  assert.equal(P.defaultPaper('ca'), 'Letter');
  for (const r of ['KR', 'JP', 'GB', '', null, undefined]) assert.equal(P.defaultPaper(r), 'A4');
});

test('printPages: 표 한 장 1쪽 · 표지 + 영역별 8쪽 9쪽', () => {
  assert.equal(P.printPages('chart'), 1);
  assert.equal(P.printPages('areas'), 9);
});

test('parsePrintPrefs는 너그럽다 — 깨진 값 · 모르는 값은 버리고 읽은 것만', () => {
  for (const bad of [null, undefined, '', '{', 'null', '[]', '42', '"A4"', 7, [], true]) assert.deepEqual(P.parsePrintPrefs(bad), {});
  assert.deepEqual(P.parsePrintPrefs('{"paper":"A5","layout":"areas","blank":true}'), { paper: 'A5', layout: 'areas', blank: true });
  assert.deepEqual(P.parsePrintPrefs('{"paper":"a4","layout":"poster","blank":"yes","x":1}'), {});
  assert.deepEqual(P.parsePrintPrefs({ paper: 'Letter', blank: false, extra: 1 }), { paper: 'Letter', blank: false });
  assert.deepEqual(P.parsePrintPrefs(P.serializePrintPrefs({ paper: 'B5', layout: 'chart', blank: false })), { paper: 'B5', layout: 'chart', blank: false });
});

test('저장소: mandarat:print:v1에 쓰고 다시 읽는다 · 깨진 값은 {}', async () => {
  assert.equal(STORE_KEYS.print, 'mandarat:print:v1');
  mem.set(STORE_KEYS.print, '{not json');
  assert.deepEqual(await P.readPrintPrefs(), {});
  await P.writePrintPrefs({ paper: 'A3', layout: 'areas', blank: true, junk: 1 });
  assert.equal(mem.get(STORE_KEYS.print), '{"paper":"A3","layout":"areas","blank":true}');
  assert.deepEqual(P.peekPrintPrefs(), { paper: 'A3', layout: 'areas', blank: true });
  assert.deepEqual(await P.readPrintPrefs(), { paper: 'A3', layout: 'areas', blank: true });
});

// ── 시트 ─────────────────────────────────────────────────

test('PrintSheet: Sheet · SheetHead · LineRow로 짓고, 알약·배지·둥근 카드가 없다', () => {
  const s = src('src/overlays/PrintSheet.tsx');
  assert.match(s, /<Sheet\b/);
  assert.match(s, /<SheetHead\b/);
  assert.match(s, /<LineRow\b/);
  assert.match(s, /<Check\b/);
  assert.doesNotMatch(s, /\bPill\b|AreaTag|PaperChip|SegmentedControl|LinearGradient|shadow\(/);
  for (const r of s.matchAll(/borderRadius:\s*(\d+)/g)) assert.ok(Number(r[1]) < 14, `borderRadius ${r[1]}`);
  assert.doesNotMatch(s, /\p{Extended_Pictographic}/u);
  // 나눠 읽는 훅만
  assert.doesNotMatch(s, /\buseMandarat\(\)|\buseUI\(\)/);
});

test('PrintSheet: 잠긴 종이 · 구성은 openPro(printSize)로, 지난 표는 archiveAccess가 없으면 openPro(archive)로', () => {
  const s = src('src/overlays/PrintSheet.tsx');
  assert.match(s, /isProPaper\(p\) && isLocked\('printSize', owned\)\) return toPro\('printSize'\)/);
  assert.match(s, /l === 'areas' && isLocked\('printSize', owned\)\) return toPro\('printSize'\)/);
  assert.match(s, /const toPro = \(f: ProFeature\) => \{\s*dismiss\(true\);\s*openPro\(f\);/);
  assert.match(s, /!archiveAccess\(owned\)\.print/);
  assert.match(s, /closePrint\(\);\s*openPro\('archive'\);/);
  assert.match(s, /archiveAsDoc\(archive, doc\.settings\)/);
  // A4 · 레터는 잠그는 길이 없다 — 잠금은 isProPaper(=FREE_PAPERS 밖)에만 걸린다
  assert.match(src('src/lib/printPrefs.ts'), /return !FREE_PAPERS\.includes\(p\);/);
});

test('PrintSheet: 찍기 — HTML · 글꼴 · 플랫폼 인쇄, 실패만 알리고 취소는 조용히', () => {
  const s = src('src/overlays/PrintSheet.tsx');
  assert.match(s, /await printFonts\.fontCss\(\)/);
  assert.match(s, /printHtml\(source, \{ \.\.\.chosen, now, lang: lang\(\), fontCss, accent: M\.accent \}\)/);
  assert.match(s, /printer\.exportPdf\(html, size, printFileName\(now\)\)/);
  assert.match(s, /printer\.printNow\(html, size\)/);
  assert.match(s, /if \(result === 'failed'\) showToast\(m\.print\.failed\);/);
  assert.match(s, /announce\(m\.print\.busy\)/);
  assert.match(s, /const CAN_EXPORT = Platform\.OS === 'ios';/);
  assert.match(s, /writePrintPrefs\(next\)/);
  assert.match(s, /defaultPaper\(deviceRegion\(\)\)/);
  assert.match(s, /getLocales\(\)\[0\]\?\.regionCode/);
  // 플랫폼 파일을 직접 고르지 않는다
  assert.doesNotMatch(s, /from '\.\.\/lib\/print(Fonts)?\.(web|native)'/);
  assert.doesNotMatch(s, /expo-print/);
});

test('PrintSheet: 모든 조작에 testID', () => {
  const s = src('src/overlays/PrintSheet.tsx');
  for (const id of ['TID.printPaper(p)', 'TID.printLayout(l)', 'TID.printBlank', 'TID.printGo', 'TID.printPdf']) {
    assert.ok(s.includes(`testID={${id}}`), id);
  }
});

test('ShareChart: 찍어 공유하던 코드는 그대로, 아래에 인쇄용 PDF 링크', () => {
  const s = src('src/overlays/ShareChart.tsx');
  assert.match(s, /captureRef\(posterRef, \{ format: 'png', result: 'tmpfile', \.\.\.captureSize\(\) \}\)/);
  assert.match(s, /await Share\.share\(\{ url: uri \}\)/);
  assert.match(s, /releaseCapture\(uri\)/);
  assert.match(s, /<SaveButton M=\{M\} posterRef=\{posterRef\} \/>/);
  assert.match(s, /<PrintLink M=\{M\} \/>/);
  assert.match(s, /testID=\{TID\.sharePrint\}/);
  assert.match(s, /dismiss\(true\);\s*openPrint\(\);/);
  assert.match(s, /m\.print\.shareLink/);
});

test('scripts/smoke/print.js: 인쇄 시트를 웹에서 연다(공유 링크 testID)', () => {
  const s = src('scripts/smoke/print.js');
  assert.match(s, /TID\.sharePrint/);
  assert.match(s, /TID\.printGo/);
  assert.match(s, /h\.shot\('print/);
});
