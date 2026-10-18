// 화면 글은 모두 바구니(src/i18n)로 — docs/v2/plan.md §2.6, V8-A부터 엄격.
// - src의 모든 파일: 한글 글자 0, 글자가 든 JSX 글 0,
//   화면 글 자리(accessibilityLabel · accessibilityHint · placeholder · title · label · sub · body, showToast · announce · Alert.alert)에 넣은 글자 0.
// - 보류 목록(tests/i18n-pending)은 없다 — 다시 만들지 않는다.
// 주석 · 정규식 · console.* · 저장값(Mood · Mgmt · CellShape)은 세지 않는다.
// 빠지는 파일: src/i18n/ko/**, src/i18n/names.ts, src/i18n/glossary.ts.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { hangulCount, literalProblems } = require('./i18nLint');

const ROOT = path.join(__dirname, '..');
const EXEMPT = (rel) => rel.startsWith('src/i18n/ko/') || rel === 'src/i18n/names.ts' || rel === 'src/i18n/glossary.ts';

function srcFiles() {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(path.relative(ROOT, p).split(path.sep).join('/'));
    }
  };
  walk(path.join(ROOT, 'src'));
  return out.filter((f) => !EXEMPT(f)).sort();
}

test('검사기: 한글 조각 · JSX 글 · 화면 글 자리를 센다(주석 · 정규식 · console · 저장값은 빼고)', () => {
  const src = [
    "// 주석은 세지 않는다 '한글'",
    "const re = /한글/;",
    "console.warn('한글 경고');",
    "const mood = '연꽃';",
    "const a = '보이는 글';",
    'const b = <Text>Hello</Text>;',
    'const c = <View accessibilityLabel="Close" />;',
    "showToast('Saved');",
    "const d = { label: 'Pro', color: '#FFAA00', sub: '#6F6657' };",
    "const e = `${n}개`;",
  ].join('\n');
  assert.equal(hangulCount('probe.tsx', src), 2);
  const probs = literalProblems('probe.tsx', src);
  assert.equal(probs.length, 6, probs.join('\n'));
});

test('보류 목록이 없다', () => {
  assert.equal(fs.existsSync(path.join(__dirname, 'i18n-pending')), false, 'tests/i18n-pending은 V8-A에서 없앴다');
});

test('src 어디에도 하드코딩한 화면 글이 없다(src/i18n/ko · names · glossary 밖에는 한글 0)', () => {
  const found = [];
  for (const f of srcFiles()) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const n = hangulCount(f, s);
    if (n > 0) found.push(`${f}: 한글 조각 ${n}`);
    for (const x of literalProblems(f, s)) found.push(`${f}:${x}`);
  }
  assert.deepEqual(found, [], '화면 글은 src/i18n/{ko,ja,en}/<이름공간>.ts에 넣고 useMsg()/msg()로 읽는다');
});
