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

test('Year: memo · 나눈 컨텍스트만 · 머리는 그 쪽 표의 핵심 목표(디자인 A S4)', () => {
  const s = src(YEAR);
  assert.match(s, /export const Year = memo\(function Year\(\)/);
  assert.match(s, /useUIState\(\)/);
  assert.match(s, /useUIActions\(\)/);
  assert.match(s, /useDoc\(\)/);
  assert.doesNotMatch(s, /useMandarat\(|useUI\(\)/);
  assert.match(s, /<Header M=\{M\} title=\{title\} written=\{!!goal\} onBack=\{back\} focusTitle backTestID=\{TID\.yearBack\} action=\{action\} \/>/);
  // 제목: 지금 표면 지금 핵심 목표, 지난 표면 그 표의 목표 — 비었으면 쪽 이름(viewTitle)
  assert.match(s, /const title = goal \|\| \(missing \? m\.year\.shelf : viewTitle\(m, yearView\)\);/);
  // 오른쪽 글리프: 지금 표의 돌아보기는 표 이미지 공유, 열린 지난 표는 인쇄 · PDF(잠겼으면 없음)
  assert.match(s, /glyph: 'share', onPress: \(\) => \{ tap\(\); openShare\(\); \}, label: m\.chart\.shareSay, testID: TID\.yearShare/);
  assert.match(s, /: archive && unlocked\n\s+\? \{ glyph: 'share', onPress: \(\) => \{ tap\(\); openPrint\(\{ archiveId: archive\.id \}\); \}, label: m\.year\.printLink/);
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

test('YearReview: 인쇄된 한 줄 · 색 지도 · 채워진 모습 · 네 숫자 · 한 해 달력 · 닳은 자리 · 돌아본 주 · 회고 · 한 줄 · 인쇄용 PDF 순서(year.png)', () => {
  const s = src(REVIEW);
  assert.match(s, /export const YearReview = memo\(function YearReview/);
  const order = [
    'yearLabel(from, to)',
    '<ColourMap themes={view.themes} goal={goal} level="L2" width={mapW} />',
    'label={m.year.framesTitle}',
    '<Frames ',
    '<Numbers ',
    'label={m.year.calendarTitle}',
    '<YearLedger M={M} rows={rows} />',
    'label={m.year.wearTitle}',
    '<ActivityChart ',
    '<WearLegend M={M} head={m.year.wearLegend} />',
    'label={m.year.weeksTitle}',
    'label={m.year.notesTitle}',
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
  assert.match(s, /<ActivityChart M=\{M\} doc=\{view\} activity=\{wear\} width=\{mapW\} \/>/);
  // 액자 넷은 L1 지도(첫 화면 다음 프레임에, §4.6), 마지막 날짜는 먹 600
  assert.match(s, /<ColourMap themes=\{f\.themes\} level="L1" cell=\{cell\} defer \/>/);
  assert.match(s, /color: last \? M\.ink : M\.print \}, last \? \{ fontFamily: PRETENDARD\[600\] \} : null/);
});

test('YearReview: 큰 글자(1.35) · 좁은 폭에서 네 숫자는 2×2, 넷은 한 크기 · 한 줄 · 글자 크기 상한', () => {
  const s = src(REVIEW);
  assert.match(s, /const STACK_SCALE = 1\.35;/);
  assert.match(s, /const stacked = fontScale >= STACK_SCALE \|\| contentW < ROW_MIN_W;/);
  assert.match(s, /const lines = stacked \? \[cells\.slice\(0, 2\), cells\.slice\(2\)\] : \[cells\];/);
  const nums = s.slice(s.indexOf('function Numbers('), s.indexOf('// ── 표가 채워진 모습'));
  assert.equal((nums.match(/maxScale=\{STACK_SCALE\}|maxFontSizeMultiplier=\{STACK_SCALE\}/g) ?? []).length, 2);
  assert.match(nums, /const size = figureSize\(cells\.map\(\(c\) => c\.value\), \(width - FIG_GAP \* \(per - 1\)\) \/ per\);/);
  assert.match(nums, /<Figure M=\{M\} text=\{c\.value\} size=\{size\} adjust maxScale=\{STACK_SCALE\} \/>/);
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

test('보관함 · 지난 표(V4-B가 채웠다) — onOpen을 받고 안쪽 쪽은 onOpen으로 연다', () => {
  for (const rel of [SHELF, SHEET]) {
    const s = src(rel);
    assert.match(s, /memo\(function Year(Shelf|Sheet)\(/);
    assert.match(s, /onOpen: \(v: YearView\) => void/);
    assert.doesNotMatch(s, /setYearView/);
  }
  assert.match(src(SHELF), /onOpen\(\{ kind: 'sheet', id \}\)/);
  assert.match(src(SHEET), /onOpen\(\{ kind: 'review', id: a\.id \}\)/);
});

test('통계: 범위 줄 \'올해\'의 첫 구역 — 한 해 돌아보기(TID.statsYear) · 보관함 n장', () => {
  const s = src(STATS);
  const scope = s.indexOf("{scope === 'year' && (");
  const yearScope = s.indexOf('const YearScope = memo(');
  const section = s.indexOf('<YearSection ', yearScope);
  const count = s.indexOf('<CountLedger ', yearScope);
  const reflections = s.indexOf('<Reflections M={M} doc={doc} now={now} />', yearScope);
  assert.ok(scope > 0 && yearScope > 0 && section > yearScope && count > section && reflections > count, '올해: 한 해 → 숫자 목표 → 회고');
  assert.match(s, /onYear=\{\(v\) => \{ tap\(\); openYear\(v\); \}\}/);
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
