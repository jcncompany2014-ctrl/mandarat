// 새 화면 글은 처음부터 바구니(src/i18n)로 — docs/v2/plan.md §2.6.
// - 보류 목록(tests/i18n-pending/<X>.json)에 없는 파일: 한글 글자 0, 글자가 든 JSX 글 0,
//   화면 글 자리(accessibilityLabel · accessibilityHint · placeholder · title · label · sub · body, showToast · announce · Alert.alert)에 넣은 글자 0.
// - 보류 목록의 파일: 한글 글자 조각 수가 목록의 수보다 늘지 않는다(추출 꾸러미가 0으로 만들고 목록을 지운다).
// 주석 · 정규식 · console.* · 저장값(Mood · Mgmt · CellShape)은 세지 않는다.
// 빠지는 파일: src/i18n/ko/**, src/i18n/names.ts, src/i18n/glossary.ts.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { hangulCount, literalProblems } = require('./i18nLint');

const ROOT = path.join(__dirname, '..');
const PENDING_DIR = path.join(__dirname, 'i18n-pending');
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

function pending() {
  const map = new Map();
  if (!fs.existsSync(PENDING_DIR)) return map;
  for (const f of fs.readdirSync(PENDING_DIR).filter((n) => n.endsWith('.json')).sort()) {
    const list = JSON.parse(fs.readFileSync(path.join(PENDING_DIR, f), 'utf8'));
    for (const [file, count] of Object.entries(list)) {
      assert.equal(map.has(file), false, `${file}이 보류 목록 둘에 있다`);
      map.set(file, { count, owner: f.replace(/\.json$/, '') });
    }
  }
  return map;
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

test('보류 목록에 없는 파일에는 하드코딩한 화면 글이 없다', () => {
  const p = pending();
  const found = [];
  for (const f of srcFiles()) {
    if (p.has(f)) continue;
    const probs = literalProblems(f, fs.readFileSync(path.join(ROOT, f), 'utf8'));
    for (const x of probs) found.push(`${f}:${x}`);
  }
  assert.deepEqual(found, [], '새 글은 src/i18n/{ko,ja,en}/<이름공간>.ts에 넣고 useMsg()/msg()로 읽는다');
});

test('보류 목록의 파일은 한글 글자 조각이 늘지 않는다', () => {
  const p = pending();
  const grew = [];
  for (const [file, { count, owner }] of p) {
    const abs = path.join(ROOT, file);
    if (!fs.existsSync(abs)) continue;
    const now = hangulCount(file, fs.readFileSync(abs, 'utf8'));
    if (now > count) grew.push(`${file}: ${count} → ${now} (${owner})`);
  }
  assert.deepEqual(grew, []);
});
