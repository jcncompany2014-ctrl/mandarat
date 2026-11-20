// '더 보기'는 한 해 치를 한꺼번에 올리지 않는다 — 처음 몇 줄, 누를 때마다 30줄씩(YearReview 회고 · Stats 돌아본 주).
// 단추의 읽는 말은 아직 펼치지 않은 수. 보관함의 '더 보기'(24장씩)는 tests/yearSheet.test.js가 본다.
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

const REVIEW = 'src/screens/year/YearReview.tsx';
const STATS = 'src/screens/Stats.tsx';

/** .tsx 하나를 들여오되 그 파일이 부르는 모듈은 모두 빈 것으로 — 순수 도우미만 돌린다(tests/yearScreen.test.js와 같다) */
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

test('회고: 처음 12줄, 더 보기마다 30줄씩 — 한 해 치(325줄)를 한꺼번에 올리지 않는다', () => {
  const { noteGroups, NOTE_ROWS, NOTE_PAGE } = loadPure(REVIEW);
  assert.equal(NOTE_ROWS, 12);
  assert.equal(NOTE_PAGE, 30);
  // 열세 달 · 달마다 25줄 = 325줄
  const groups = Array.from({ length: 13 }, (_, i) => ({
    month: `2026-${String(i + 1).padStart(2, '0')}`,
    items: Array.from({ length: 25 }, (_, d) => ({ date: `${i}-${d}`, text: 'x' })),
  }));
  const total = 325;
  const count = (g) => g.reduce((s, x) => s + x.items.length, 0);
  let limit = NOTE_ROWS;
  let presses = 0;
  let before = 0;
  for (;;) {
    const shown = noteGroups(groups, limit);
    const n = count(shown);
    assert.equal(n, Math.min(limit, total));
    assert.ok(n - before <= Math.max(NOTE_ROWS, NOTE_PAGE), `한 번에 ${n - before}줄`);
    // 오래된 것부터 차례대로 — 달 묶음은 그대로, 줄이 없는 달은 없다
    assert.deepEqual(shown.flatMap((g) => g.items), groups.flatMap((g) => g.items).slice(0, n));
    assert.ok(shown.every((g) => g.items.length > 0));
    const rest = Math.max(0, total - limit);
    if (rest === 0) break;
    // 단추의 읽는 말은 남은 수
    assert.equal(msg('ko').year.notesMore({ n: rest }), `회고 ${rest}개 더 보기`);
    before = n;
    limit += NOTE_PAGE;
    presses++;
  }
  assert.equal(presses, 11, '12 + 30 × 11 ≥ 325');
  assert.deepEqual(noteGroups(groups, 0), []);
  assert.deepEqual(noteGroups([], 12), []);
  assert.equal(count(noteGroups(groups, 26)), 26);
  assert.deepEqual(noteGroups(groups, 26).map((g) => g.items.length), [25, 1]);

  const s = src(REVIEW);
  assert.match(s, /const \[limit, setLimit\] = useState\(NOTE_ROWS\);/);
  assert.match(s, /const shown = noteGroups\(groups, limit\);/);
  assert.match(s, /const rest = Math\.max\(0, total - limit\);/);
  assert.match(s, /\{rest > 0 && \(\s*<Pressable\s+onPress=\{\(\) => \{ tap\(\); setLimit\(\(n\) => n \+ NOTE_PAGE\); \}\}\s+accessibilityRole="button"\s+accessibilityLabel=\{m\.year\.notesMore\(\{ n: rest \}\)\}/);
  assert.doesNotMatch(s, /setAll\(/);
});

test('돌아본 주: 처음 8줄, 더 보기마다 30줄씩 — 이미 센 주는 다시 세지 않는다', () => {
  const s = src(STATS);
  assert.match(s, /const REVIEW_ROWS = 8;/);
  assert.match(s, /const REVIEW_PAGE = 30;/);
  const list = s.slice(s.indexOf('function ReviewList('), s.indexOf('function MoreRow('));
  assert.match(list, /const \[limit, setLimit\] = useState\(REVIEW_ROWS\);/);
  assert.match(list, /const shown = weeks\.slice\(0, limit\);/);
  assert.match(list, /const rest = weeks\.length - shown\.length;/);
  assert.match(list, /\{rest > 0 && <MoreRow M=\{M\} onPress=\{\(\) => \{ tap\(\); setLimit\(\(n\) => n \+ REVIEW_PAGE\); \}\} label=\{m\.stats\.moreWeeks\(\{ n: rest \}\)\} \/>\}/);
  assert.doesNotMatch(list, /setAll\(/);
  // 줄마다 weekReview를 다시 세지 않는다 — 문서 · 언어가 같으면 센 값을 다시 쓴다
  assert.match(list, /const seen = useMemo\(\(\) => new Map<string, ReturnType<typeof reviewRow>>\(\), \[doc, l\]\);/);
  assert.match(list, /let r = seen\.get\(w\);\s*if \(!r\) seen\.set\(w, \(r = reviewRow\(doc, w, l\)\)\);/);
  assert.equal((list.match(/reviewRow\(doc, w, l\)/g) ?? []).length, 1);
  // 104주: 8 → 38 → 68 → 98 → 104, 남은 수는 96 → 66 → 36 → 6
  const steps = [];
  for (let limit = 8; limit < 104; limit += 30) steps.push(104 - limit);
  assert.deepEqual(steps, [96, 66, 36, 6]);
  for (const l of ['ko', 'ja', 'en']) {
    for (const n of steps) assert.ok(msg(l).stats.moreWeeks({ n }).includes(String(n)), `${l} ${n}`);
  }
});
