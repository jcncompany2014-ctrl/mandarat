// V4-B — 보관함(YearShelf) · 지난 표 한 장(YearSheet) · ChartPoster scale · ChartBoard asOf/readOnly.
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
const BOARD = 'src/components/ChartBoard.tsx';
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

test('ChartPoster: scale 1은 공유 이미지의 원래 값 그대로, 다른 배율은 모든 치수가 똑같이 늘어난다', () => {
  const { posterMetrics } = loadPure(POSTER, ['../lib/poster']);
  const k = posterMetrics(1);
  assert.equal(k.width, 360);
  assert.equal(k.height, 450);
  assert.equal(k.margin, 20);
  assert.equal(k.table, 320);
  assert.equal(k.cell, 320 / 9);
  assert.deepEqual([k.ruleFrame, k.ruleBlock, k.ruleCell], [1.5, 1, 0.5]);
  assert.deepEqual([k.fs, k.fsHead, k.lh, k.pad], [7.5, 8, 9, 2.5]);
  assert.equal(k.textW, 320 / 9 - 5);
  assert.deepEqual([k.headH, k.headGap, k.fsTop, k.lhTop, k.fsGoal, k.lhGoal, k.underline], [70, 8, 12, 15, 22, 25, 0.75]);
  assert.deepEqual([k.fsMark, k.lhMark, k.bar, k.finishLine, k.radiusMax], [7, 8.5, 2, 1.5, 2]);
  assert.deepEqual([k.footGap, k.fsFoot, k.lhFoot], [7, 10, 13]);
  assert.deepEqual(posterMetrics(), k);
  for (const s of [0.5, 1.25, 2]) {
    const q = posterMetrics(s);
    for (const key of Object.keys(k)) assert.ok(Math.abs(q[key] - k[key] * s) < 1e-9, `${key} × ${s}`);
  }
  // transform scale을 쓰지 않는다 — 치수로 키운다
  const s = src(POSTER);
  assert.doesNotMatch(s, /transform: \[/);
  assert.match(s, /scale = 1 \}, ref\)/);
  assert.match(s, /scale === 1 \? BASE : posterMetrics\(scale\)/);
  assert.doesNotMatch(s, /\b(MARGIN|TABLE|CELL|RULE_FRAME|HEAD_H|TEXT_W)\b/);
});

test('ChartBoard: readOnly는 누르기를 떼고 글로 읽힌다, asOf는 그날로 그리고 오늘 표시를 숨긴다', () => {
  const { boardMode } = loadPure(BOARD);
  const clock = new Date(2026, 9, 14);
  const fn = () => {};
  const live = boardMode({ onCell: fn, onCellLong: fn, onHead: fn }, clock);
  assert.deepEqual(live, { now: clock, live: true, canPress: true, canLong: true, canHead: true, role: 'button' });
  const ro = boardMode({ readOnly: true, onCell: fn, onCellLong: fn, onHead: fn, onHeadLong: fn }, clock);
  assert.equal(ro.canPress, false);
  assert.equal(ro.canLong, false);
  assert.equal(ro.canHead, false);
  assert.equal(ro.role, 'text');
  const to = new Date(2025, 11, 31);
  const past = boardMode({ asOf: to }, clock);
  assert.equal(past.now, to);
  assert.equal(past.live, false);

  const s = src(BOARD);
  // 오늘 할 일은 asOf면 늘 빈 묶음, 이번 주 · 마감은 mode.now로
  assert.match(s, /!mode\.live \? NO_TODAY : todaySet \?\?/);
  assert.match(s, /const now = mode\.now;/);
  assert.match(s, /routineWeek\(doc, ti, ai, now\)/);
  // 읽기만 하는 칸은 Pressable이 아닌 View(text), 이름표는 onPress를 떼고 text
  assert.match(s, /if \(readOnly\) \{\n\s+return \(\n\s+<View\n\s+accessible\n\s+accessibilityRole="text"/);
  assert.match(s, /onPress=\{readOnly \? undefined : onPress\}/);
  assert.match(s, /accessibilityRole=\{readOnly \? 'text' : 'button'\}/);
  assert.match(s, /if \(readOnly\) return <View style=\{\{ flex: 1 \}\}/);
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
  assert.match(s, /<MiniChart themes=\{a\.themes\} cellShape=\{cellShape\} size=\{MINI\} \/>/);
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

test('YearSheet: 쪽 폭의 표 그림(scale = 폭 / POSTER_W, 날짜는 닫은 날) · 영역 장부 · 읽기만 하는 보드 · 두 링크', () => {
  const s = src(SHEET);
  const { sheetScale } = loadPure(SHEET, ['../../lib/poster']);
  assert.equal(sheetScale(360), 1);
  assert.equal(sheetScale(350), 350 / 360);
  assert.equal(sheetScale(2000), 2); // 720pt까지
  assert.match(s, /<ChartPoster doc=\{poster\} now=\{closed\} gold=\{M\.accent\} scale=\{scale\} \/>/);
  assert.match(s, /const closed = useMemo\(\(\) => dayOf\(a\.to\), \[a\.to\]\);/);
  assert.match(s, /<ChartBoard M=\{M\} doc=\{view\} ti=\{ti\} asOf=\{closed\} readOnly \/>/);
  assert.match(s, /accessibilityState=\{\{ expanded: open \}\}/);
  assert.match(s, /onOpen\(\{ kind: 'review', id: a\.id \}\)/);
  assert.match(s, /<View testID=\{TID\.yearPrint\}>\s*<SheetLink M=\{M\} text=\{m\.year\.printLink\} onPress=\{\(\) => openPrint\(\{ archiveId: a\.id \}\)\} \/>/);
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
  for (const f of [POSTER, BOARD, SHELF, SHEET]) {
    const s = src(f);
    for (const r of s.matchAll(/borderRadius: (\d+)/g)) assert.ok(Number(r[1]) < 14, `${f}: borderRadius ${r[1]}`);
    assert.doesNotMatch(s, /shadow\(|LinearGradient|rgba\(0,0,0,0\.04\)/, f);
    assert.doesNotMatch(s, /\p{Extended_Pictographic}/u, f);
    assert.doesNotMatch(s, /stamp|도장/i, f);
  }
});
