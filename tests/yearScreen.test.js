// V3-D — 한 해 화면(Year · YearReview · 보관함/지난 표 자리)과 통계의 한 해 구역.
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

const YEAR = 'src/screens/Year.tsx';
const REVIEW = 'src/screens/year/YearReview.tsx';
const SHELF = 'src/screens/year/YearShelf.tsx';
const SHEET = 'src/screens/year/YearSheet.tsx';
const STATS = 'src/screens/Stats.tsx';

/** .tsx 하나를 들여오되 그 파일이 부르는 모듈은 모두 빈 것으로 — 순수 도우미만 돌린다 */
function loadPure(rel) {
  const file = path.join(ROOT, rel);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  });
  const stub = new Proxy(function () {}, { get: (_, k) => (k === '__esModule' ? true : k === 'memo' ? (f) => f : stub), apply: () => stub });
  const load = Module._load;
  Module._load = function () { return stub; };
  try {
    const m = new Module(file, module);
    m.filename = file;
    m._compile(outputText, file);
    return m.exports;
  } finally {
    Module._load = load;
  }
}

test('Year: memo · 나눈 컨텍스트만 · 머리는 설정과 같은 Header', () => {
  const s = src(YEAR);
  assert.match(s, /export const Year = memo\(function Year\(\)/);
  assert.match(s, /useUIState\(\)/);
  assert.match(s, /useUIActions\(\)/);
  assert.match(s, /useDoc\(\)/);
  assert.doesNotMatch(s, /useMandarat\(|useUI\(\)/);
  assert.match(s, /<Header M=\{M\} kr=\{viewTitle\(m, yearView\)\} onBack=\{back\} focusTitle stacked \/>/);
  assert.match(s, /testID=\{TID\.yearPage\}/);
  // 세 쪽을 yearView로 고른다
  assert.match(s, /yearView\.kind === 'shelf'/);
  assert.match(s, /yearView\.kind === 'sheet'/);
  assert.match(s, /yearView\.id === null/);
});

test('Year: 안쪽 줄이 있을 때만 뒤로 가기 가드를 걸고, 떠나면 걷는다', () => {
  const s = src(YEAR);
  assert.match(s, /setBackGuard\(depth > 0 \? \(\) => popInner\(\) : null\);/);
  assert.match(s, /useEffect\(\(\) => \(\) => setBackGuard\(null\), \[setBackGuard\]\);/);
  // 되짚기는 ref의 줄을 바로 읽는다(상태 갱신 함수 안에서 읽지 않는다) — 가드가 같은 틱에 true/false를 돌려준다
  const pop = s.slice(s.indexOf('const popInner = useCallback('), s.indexOf('}, [setYearView]);', s.indexOf('const popInner')));
  assert.match(pop, /const s = stackRef\.current;/);
  assert.match(pop, /if \(!prev\) return false;/);
  assert.match(pop, /setYearView\(prev\);\n\s+return true;/);
  // 바깥에서 openYear로 바뀐 쪽이면 줄을 비운다
  assert.match(s, /stackRef\.current = \[\];/);
});

test('Year: 지난 표의 돌아보기는 archiveAccess(owned).review로 잠그고, 없는 지난 표는 보관함', () => {
  const s = src(YEAR);
  assert.match(s, /const access = archiveAccess\(owned\);/);
  assert.match(s, /locked=\{!access\.review\}/);
  assert.match(s, /<YearReview M=\{M\} doc=\{doc\} archive=\{null\} locked=\{false\} \/>/);
  assert.match(s, /: <YearShelf M=\{M\} onOpen=\{open\} \/>;/);
});

test('YearReview: 네 숫자 · 한 해 달력 · 채워진 모습 · 닳은 자리 · 돌아본 주 · 회고 · 한 줄 · 인쇄용 PDF 순서', () => {
  const s = src(REVIEW);
  assert.match(s, /export const YearReview = memo\(function YearReview/);
  const order = [
    'yearLabel(from, to)',
    '<DoubleRule M={M} />',
    '<Numbers ',
    'title={m.year.calendarTitle}',
    '<YearLedger M={M} rows={rows} />',
    'title={m.year.framesTitle}',
    'title={m.year.wearTitle}',
    '<ActivityChart ',
    '<WearLegend M={M} />',
    'title={m.year.weeksTitle}',
    'title={m.year.notesTitle}',
    'm.year.noteLabel',
    'testID={TID.yearPrint}',
  ];
  let at = -1;
  for (const k of order) {
    const i = s.indexOf(k, at + 1);
    assert.ok(i > at, `${k}가 순서대로 있어야 해요`);
    at = i;
  }
  assert.match(s, /fillFrames\(view, from, to, FRAMES\)/);
  assert.match(s, /yearCalendar\(view\.dayLog, from, to\)/);
  assert.match(s, /archiveAsDoc\(archive, doc\.settings\)/);
  assert.match(s, /focus: \(doc\.focusMinutes \?\? 0\) - \(doc\.focusStart \?\? 0\)/);
  assert.match(s, /openPrint\(archive \? \{ archiveId: archive\.id \} : undefined\)/);
  // 닳은 자리는 읽기만(누르면 다른 화면으로 가지 않는 인쇄된 쪽)
  assert.match(s, /<ActivityChart M=\{M\} doc=\{view\} activity=\{wear\} width=\{contentW\} \/>/);
});

test('YearReview: 큰 글자(1.35)에서 네 숫자는 2×2, 숫자는 두 줄까지 · 글자 크기 상한', () => {
  const s = src(REVIEW);
  assert.match(s, /const STACK_SCALE = 1\.35;/);
  assert.match(s, /const stacked = fontScale >= STACK_SCALE \|\| contentW < ROW_MIN_W;/);
  assert.match(s, /const lines = stacked \? \[cells\.slice\(0, 2\), cells\.slice\(2\)\] : \[cells\];/);
  const nums = s.slice(s.indexOf('function Numbers('), s.indexOf('// ── 표가 채워진 모습'));
  assert.equal((nums.match(/maxFontSizeMultiplier=\{STACK_SCALE\}/g) ?? []).length, 2);
  assert.match(nums, /numberOfLines=\{2\}\n\s+adjustsFontSizeToFit/);
  assert.match(nums, /accessibilityLabel=\{`\$\{c\.label\}, \$\{c\.speech \?\? c\.value\}`\}/);
});

test('YearReview: 잠긴 지난 표는 보관함 줄 · 프로 표시 · openPro(\'archive\')만(누를 때만)', () => {
  const s = src(REVIEW);
  assert.match(s, /if \(archive && locked\) return <LockedLine M=\{M\} archive=\{archive\} \/>;/);
  const locked = s.slice(s.indexOf('function LockedLine('));
  assert.match(locked, /m\.common\.proMark/);
  assert.match(locked, /onPress=\{\(\) => \{ tap\(\); openPro\('archive'\); \}\}/);
  assert.doesNotMatch(locked, /YearLedger|ActivityChart|MiniChart/);
  assert.equal((s.match(/openPro\(/g) ?? []).length, 1);
});

test('wearActivity: 기간 내내 한 날 수를 4주 평균으로 — 한 번이라도 한 칸은 1 이상, 4주 이하는 그대로', () => {
  const { wearActivity } = loadPure(REVIEW);
  assert.deepEqual(wearActivity([[0, 1, 28, 364]], 364), [[0, 1, 2, 28]]);
  assert.deepEqual(wearActivity([[0, 3, 7]], 20), [[0, 3, 7]]);
  assert.deepEqual(wearActivity([[0, 5]], 28), [[0, 5]]);
});

test('보관함 · 지난 표 자리(V4-B가 채운다)는 m.year.loading 한 줄 — onOpen을 받는다', () => {
  for (const rel of [SHELF, SHEET]) {
    const s = src(rel);
    assert.match(s, /memo\(function Year(Shelf|Sheet)\(/);
    assert.match(s, /onOpen: \(v: YearView\) => void/);
    assert.match(s, /m\.year\.loading/);
  }
  for (const l of ['ko', 'ja', 'en']) assert.ok(msg(l).year.loading.length > 0);
});

test('통계: 맨 끝 구역 \'한 해\' — 한 해 돌아보기(TID.statsYear) · 보관함 n장', () => {
  const s = src(STATS);
  const reflections = s.indexOf('<Reflections M={M} doc={doc} now={now} />');
  const head = s.indexOf('<SectionHead M={M} title={m.year.settingsHead} />');
  const section = s.indexOf('<YearSection ');
  assert.ok(reflections > 0 && head > reflections && section > head, '회고 다음에 한 해');
  assert.match(s, /onOpen=\{\(v\) => \{ tap\(\); openYear\(v\); \}\}/);
  const body = s.slice(s.indexOf('function YearSection('));
  const review = body.indexOf("onOpen({ kind: 'review', id: null })");
  const shelf = body.indexOf("onOpen({ kind: 'shelf' })");
  assert.ok(review > 0 && shelf > review, '돌아보기 다음 보관함');
  assert.ok(body.indexOf('testID={TID.statsYear}') < review);
  assert.match(body, /m\.year\.statsShelf\(\{ n: doc\.archives\?\.length \?\? 0 \}\)/);
  // 통계는 무료 화면 — 프로를 읽지 않는다
  assert.doesNotMatch(s, /usePro|useLocked|isLocked|openPro/);
});

test('통계의 한 해 줄 글 — 세 언어', () => {
  assert.equal(msg('ko').year.statsShelf({ n: 2 }), '보관함 2장');
  assert.equal(msg('ja').year.statsShelf({ n: 2 }), '保管庫 2枚');
  assert.equal(msg('en').year.statsShelf({ n: 1 }), 'Archive · 1 chart');
  assert.equal(msg('en').year.frameSpeech({ label: 'Mar 31', n: 1 }), 'By Mar 31, 1 of 64 squares achieved');
});

test('디자인: 둥근 카드 · 그림자 · 그라데이션 · 이모지 없음', () => {
  for (const rel of [YEAR, REVIEW, SHELF, SHEET]) {
    const s = src(rel);
    for (const [, r] of s.matchAll(/borderRadius: (\d+)/g)) assert.ok(Number(r) < 14, `${rel} borderRadius ${r}`);
    assert.doesNotMatch(s, /shadow\(|LinearGradient|rgba\(0,0,0,0\.04\)/);
    assert.doesNotMatch(s, /\p{Extended_Pictographic}/u);
  }
});
