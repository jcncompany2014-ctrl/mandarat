// V4-B — 보관함(YearShelf) · 지난 표 한 장(YearSheet) · ChartPoster scale. (ChartBoard asOf/readOnly는 R2가 보드와 함께 지웠다)
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const { msg } = require('../src/i18n');

const POSTER = 'src/components/ChartPoster.tsx';
const SHELF = 'src/screens/year/YearShelf.tsx';
const SHEET = 'src/screens/year/YearSheet.tsx';

/** .tsx 하나를 들여오되 그 파일이 부르는 모듈은 빈 것으로 — pass에 든 모듈만 진짜로 */
function loadPure(rel, pass = []) {
  const file = path.join(ROOT, rel);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  });
  const stub = new Proxy(function () {}, { get: (_, k) => (k === '__esModule' ? true : k === 'memo' ? (f) => f : stub), apply: () => stub });
  const load = Module._load;
  const real = Object.fromEntries(pass.map((p) => [p, require(path.resolve(path.dirname(file), p))]));
  Module._load = function (req) { return real[req] ?? stub; };
  try {
    const m = new Module(file, module);
    m.filename = file;
    m._compile(outputText, file);
    return m.exports;
  } finally {
    Module._load = load;
  }
}

test('ChartPoster: scale 1은 공유 이미지(540×675) 그대로, 다른 배율은 모든 치수가 똑같이 늘어난다', () => {
  const { posterMetrics } = require('../src/lib/poster');
  const k = posterMetrics(1);
  assert.equal(k.width, 540);
  assert.equal(k.height, 675);
  assert.equal(k.map, 540 - 2 * k.pad);
  assert.deepEqual(posterMetrics(), k);
  for (const s of [0.5, 1.25, 2]) {
    const q = posterMetrics(s);
    for (const key of Object.keys(k)) assert.ok(Math.abs(q[key] - k[key] * s) < 1e-9, `${key} × ${s}`);
  }
  // transform scale을 쓰지 않는다 — 치수로 키운다
  const s = src(POSTER);
  assert.doesNotMatch(s, /transform: \[/);
  assert.match(s, /scale = 1 \}, ref\)/);
  assert.match(s, /posterMetrics\(scale\)/);
});

test('YearShelf: 늘 보이고(무료), 열 수 있으면 지난 표 한 장 · 아니면 openPro(\'archive\') — 누를 때만', () => {
  const s = src(SHELF);
  assert.match(s, /export const YearShelf = memo\(function YearShelf\(/);
  assert.match(s, /const open = archiveAccess\(owned\)\.open;/);
  assert.match(s, /open \? onOpen\(\{ kind: 'sheet', id \}\) : openPro\('archive'\)/);
  assert.equal((s.match(/openPro\(/g) ?? []).length, 1);
  assert.doesNotMatch(s, /useEffect/);
  assert.match(s, /onPress=\{\(\) => \{ tap\(\); onPick\(a\.id\); \}\}/);
  assert.match(s, /testID=\{TID\.yearShelfRow\(a\.id\)\}/);
  // 디자인 A(S4): 줄 왼쪽은 작은 색 지도(L1, 56pt) — 줄이 많아도 첫 화면 다음 프레임에
  assert.match(s, /<ColourMap themes=\{a\.themes\} level="L1" width=\{MINI\} defer \/>/);
  assert.match(s, /const MINI = 56;/);
  assert.match(s, /m\.year\.shelfLine\(\{ n: posterDone\(a\), days: recordDays\(a\) \}\)/);
  assert.match(s, /useDoc\(\)/);
  assert.doesNotMatch(s, /useMandarat\(|useUI\(\)/);
});

test('YearShelf: 순서 · 기록한 날 수', () => {
  const { shelfOrder, recordDays } = loadPure(SHELF);
  const a = (id, from, to) => ({ id, from, to });
  assert.deepEqual(shelfOrder([a('y1', '2024-01-01', '2024-12-31'), a('y3', '2026-01-01', '2026-03-01'), a('y2', '2025-01-01', '2025-12-31')]).map((x) => x.id), ['y3', 'y2', 'y1']);
  assert.equal(recordDays({ dayLog: { '2025-01-01': ['0-1'], '2025-01-02': [], '2025-01-03': ['1-1', '2-2'] } }), 2);
});

test('YearSheet: 색 지도(L2, 본문 폭 · 520까지) · 영역 장부 · 읽기만 하는 블록 · 두 링크(디자인 A S4)', () => {
  const s = src(SHEET);
  // 화면에 그리는 표는 ColourMap · BlockGrid(공유 이미지 · 인쇄의 ChartPoster는 O5)
  assert.doesNotMatch(s, /components\/Chart(Poster|Board)'/);
  assert.match(s, /const mapW = Math\.min\(contentW, MAP_MAX\);/);
  assert.match(s, /<ColourMap themes=\{a\.themes\} goal=\{a\.centerGoal\} level="L2" width=\{mapW\} \/>/);
  assert.match(s, /accessibilityLabel=\{m\.year\.sheetSpeech\(\{ label, goal: a\.centerGoal\.trim\(\), n: done \}\)\}/);
  // 펼친 영역 — 누를 것 없는 블록(읽기만, 오늘 표시 없음)
  assert.match(s, /<BlockGrid themes=\{a\.themes\} goal=\{a\.centerGoal\} block=\{ti\} width=\{Math\.min\(contentW, BOARD_MAX\)\} \/>/);
  assert.match(s, /accessibilityState=\{\{ expanded: open \}\}/);
  assert.match(s, /onOpen\(\{ kind: 'review', id: a\.id \}\)/);
  assert.match(s, /<View testID=\{TID\.yearPrint\}>\s*<InLink M=\{M\} label=\{m\.year\.printLink\} onPress=\{\(\) => openPrint\(\{ archiveId: a\.id \}\)\} \/>/);
  // 잠금 · 없는 지난 표
  assert.match(s, /if \(!a\) return <YearShelf M=\{M\} onOpen=\{onOpen\} \/>;/);
  assert.match(s, /if \(!archiveAccess\(owned\)\.open\) return <LockedSheet/);
  assert.equal((s.match(/openPro\(/g) ?? []).length, 1);
  assert.match(s, /onPress=\{\(\) => openPro\('archive'\)\}/);
  assert.doesNotMatch(s, /useEffect/);
});

test('세 언어 — V4-B 글', () => {
  for (const l of ['ko', 'ja', 'en']) {
    const y = msg(l).year;
    for (const k of ['shelfNone', 'shelfNoneSub', 'shelfLockedHint', 'areasTitle', 'areaOpenHint', 'areaCloseHint', 'sheetReview', 'sheetLocked']) {
      assert.ok(typeof y[k] === 'string' && y[k].length > 0, `${l}.${k}`);
    }
    assert.match(y.shelfLine({ n: 24, days: 120 }), /24/);
    assert.match(y.shelfLine({ n: 24, days: 120 }), /120/);
    assert.match(y.areaLine({ n: 3, of: 8 }), /3/);
    assert.match(y.sheetSpeech({ label: 'L', goal: '', n: 5 }), /5/);
  }
  assert.equal(msg('ko').year.shelfLine({ n: 24, days: 120 }), '64칸 중 24칸 달성 · 120일 기록');
  assert.equal(msg('en').year.shelfLine({ n: 1, days: 1 }), '1 of 64 squares achieved · 1 day recorded');
});

test('디자인: 둥근 카드 · 그림자 · 그라데이션 · 이모지 · 도장이 없다', () => {
  for (const f of [POSTER, SHELF, SHEET]) {
    const s = src(f);
    for (const r of s.matchAll(/borderRadius: (\d+)/g)) assert.ok(Number(r[1]) < 14, `${f}: borderRadius ${r[1]}`);
    assert.doesNotMatch(s, /shadow\(|LinearGradient|rgba\(0,0,0,0\.04\)/, f);
    assert.doesNotMatch(s, /\p{Extended_Pictographic}/u, f);
    assert.doesNotMatch(s, /stamp|도장/i, f);
  }
});
