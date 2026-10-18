// 화면 글 검사(copy lint) — src의 문자열·템플릿·JSX 글에서 쓰지 않기로 한 말(BANNED_COPY)과
// `${이름}을`처럼 끝소리를 모른 채 붙인 조사를 찾아 파일별로 보여 준다(조사는 lib/text.ts의 josa()로 붙인다).
// 주석·import 경로·타입 자리 문자열은 보지 않는다(TypeScript 구문 트리로 글자만 골라낸다).
//
// 강제한다 — 한 곳이라도 걸리면 실패하고, 걸린 곳의 목록을 파일별로 출력한다.
// 목록을 파일로 남기려면: COPY_LINT_OUT=<경로> node --test tests/copy.test.js
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { BANNED_COPY, BANNED_COPY_RE, MGMT_LABEL, MOOD_LABEL, SHAPE_LABEL } = require('../src/lib/copy');

const ROOT = path.join(__dirname, '..');
// glossary.ts는 금지어 목록 자체('완료' · '2026' …)를, names.ts는 언어 이름을 제 글자로 담는다
const SKIP = new Set(['src/lib/copy.ts', 'src/types.ts', 'src/i18n/glossary.ts', 'src/i18n/names.ts']);
/** 저장값(Mood · Mgmt · CellShape) — 화면에는 copy.ts의 이름으로 보이고, 이 글자 그대로는 저장·비교에만 쓰인다 */
const STORED = new Set([...Object.keys(MGMT_LABEL), ...Object.keys(MOOD_LABEL), ...Object.keys(SHAPE_LABEL)]);
/**
 * 금지어 줄기가 들어 있어도 낱말장대로인 글 — '파일|글' 그대로.
 * - '이루다'는 핵심 목표에만 쓴다: 64칸을 다 달성한 축하의 '핵심 목표를 이뤘어요'.
 * - '완료'를 화면에 보이지 않는 저장·비교 키(보드 칸 키 등)로만 쓰게 되면 여기에 적는다.
 */
const STORED_WORDS = new Set(['src/i18n/ko/sheet.ts|핵심 목표를 이뤘어요']);
/** `}` 바로 뒤에 붙은 조사(뒤가 끝·띄어쓰기·문장부호일 때만 — '${n}가지'·'${n}이에요'는 조사가 아니다) */
const JOSA_AFTER_EXPR = /^(을|를|이|가|은|는|와|과|으로|로)(?=$|[\s.,!?·:;)\]…'"’”~])/;

/** .ts도 검사하는 폴더 — 글을 만드는 lib · 예시와 템플릿 data · 저장소 store */
const TS_DIRS = new Set(['lib', 'data', 'store'].map((d) => path.join(ROOT, 'src', d)));
/** 그 밖에 따로 검사하는 .ts */
const TS_FILES = new Set(['src/screens/gridMemory.ts']);

/** 검사할 파일: src 아래 모든 .tsx + src/lib · src/data · src/store의 .ts + TS_FILES */
function sourceFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      const rel = path.relative(ROOT, p).split(path.sep).join('/');
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.tsx') || (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts') && (TS_DIRS.has(dir) || TS_FILES.has(rel)))) out.push(p);
    }
  };
  walk(path.join(ROOT, 'src'));
  return out.map((p) => path.relative(ROOT, p).split(path.sep).join('/')).filter((r) => !SKIP.has(r)).sort();
}

/** import/export 경로 · require('…') · import('…') · console.*(…) · 타입 자리 문자열 — 화면 글이 아니다 */
function notCopy(node) {
  const p = node.parent;
  if (!p) return false;
  if ((ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) && p.moduleSpecifier === node) return true;
  if (ts.isExternalModuleReference(p)) return true;
  if (ts.isCallExpression(p) && p.arguments[0] === node
    && ((ts.isIdentifier(p.expression) && p.expression.text === 'require') || p.expression.kind === ts.SyntaxKind.ImportKeyword)) return true;
  if (ts.isCallExpression(p) && p.arguments.includes(node) && ts.isPropertyAccessExpression(p.expression)
    && ts.isIdentifier(p.expression.expression) && p.expression.expression.text === 'console') return true;
  if (ts.isLiteralTypeNode(p)) return true;
  return false;
}

function clip(s, n = 48) {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/** 소스 하나의 걸린 글 [{ line, rule, text }] — name은 .tsx/.ts 구분에만 쓴다 */
function lintSource(name, src) {
  const sf = ts.createSourceFile(name, src, ts.ScriptTarget.Latest, true, name.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const hits = [];
  const at = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf));
  const add = (node, rule, text) => {
    const { line, character } = at(node);
    hits.push({ line: line + 1, col: character + 1, rule, text: clip(text) });
  };
  const banned = (text, node) => {
    if (STORED.has(text) || STORED_WORDS.has(`${name}|${text}`)) return;
    for (const w of BANNED_COPY) if (text.includes(w)) add(node, `'${w}'`, text);
    for (const re of BANNED_COPY_RE) if (re.test(text)) add(node, String(re), text);
  };
  const josa = (node, after, shown) => {
    if (JOSA_AFTER_EXPR.test(after)) add(node, 'josa()', shown);
  };

  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!notCopy(node)) banned(node.text, node);
    } else if (ts.isTemplateExpression(node)) {
      banned(node.head.text, node);
      for (const span of node.templateSpans) {
        banned(span.literal.text, span.literal);
        josa(span.literal, span.literal.text, node.getText(sf));
      }
    } else if (ts.isJsxText(node)) {
      if (!node.containsOnlyTriviaWhiteSpaces) banned(node.text.trim(), node);
    }
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      const kids = node.children;
      for (let i = 0; i + 1 < kids.length; i++) {
        const a = kids[i];
        const b = kids[i + 1];
        if (ts.isJsxExpression(a) && a.expression && ts.isJsxText(b)) josa(b, b.text, `${a.getText(sf)}${b.text}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return hits.sort((x, y) => x.line - y.line || x.col - y.col || (x.rule < y.rule ? -1 : x.rule > y.rule ? 1 : 0));
}

function report(byFile) {
  const files = Object.keys(byFile);
  const total = files.reduce((s, f) => s + byFile[f].length, 0);
  const lines = [`copy lint — ${total}곳 · ${files.length}개 파일`];
  for (const f of files) {
    lines.push(f);
    for (const h of byFile[f]) lines.push(`  ${String(h.line).padStart(4)}  ${h.rule.padEnd(10)}  ${h.text}`);
  }
  return { total, text: lines.join('\n') };
}

const lintFile = (rel) => lintSource(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'));

test('검사기: 금지어·조사·저장값·import 경로를 구분한다', () => {
  const src = [
    "import { X } from '../store/MandaratContext';",
    '// 탭하면 주석은 보지 않는다',
    "const a = '탭하면 열려요';",
    "const b = `${name}을 고쳤어요`;",
    "const c = `${n}가지 · ${n}이에요 · ${josa(name, '을/를')} 고쳤어요`;",
    "const d = '연꽃';",
    "type T = '셀 모양';",
    'const e = <Text>{name}로 바꾸기 · 데이터를 지워요</Text>;',
    "console.warn('Mandarat crashed', err);",
  ].join('\n');
  const hits = lintSource('probe.tsx', src);
  assert.deepEqual(hits.map((h) => [h.line, h.rule]), [[3, "'탭하면'"], [4, 'josa()'], [8, "'데이터를'"], [8, 'josa()']]);
  assert.match(hits[1].text, /\$\{name\}을/);
});

test('검사기: 활용형과 새 금지어(탭해 · 완료 · 이뤘 · 이룬 · 셉니다 · 칸을 다 채웠)', () => {
  const src = [
    "const a = '두 번 탭해서 열기';",
    "const b = '완료로 표시';",
    "const c = '8칸을 다 채웠어요';",
    "const d = `${n}칸 모두 이뤘어요`;",
    "const e = '이번 달 이룬 칸';",
    "const f = '오늘부터 셉니다';",
    "const g = '핵심 목표를 이루는 길';",
  ].join('\n');
  const rules = lintSource('probe.ts', src).map((h) => [h.line, h.rule]);
  assert.deepEqual(rules, [[1, "'탭해'"], [2, "'완료'"], [3, String(/칸을\s*(다\s*)?채웠/)], [4, "'이뤘'"], [5, "'이룬'"], [6, "'셉니다'"]]);
});

test('검사 범위: src/data · src/store의 .ts와 gridMemory.ts도 본다', () => {
  const files = sourceFiles();
  assert.ok(files.includes('src/data/templates.ts'));
  assert.ok(files.includes('src/data/defaults.ts'));
  assert.ok(files.includes('src/screens/gridMemory.ts'));
  assert.ok(files.some((f) => f.startsWith('src/store/') && f.endsWith('.ts')));
});

test('화면 글에 금지어와 끝소리를 모르는 조사가 없다', () => {
  const byFile = {};
  for (const f of sourceFiles()) {
    const hits = lintFile(f);
    if (hits.length > 0) byFile[f] = hits;
  }
  const { total, text } = report(byFile);
  console.log(text);
  if (process.env.COPY_LINT_OUT) fs.writeFileSync(process.env.COPY_LINT_OUT, `${text}\n`);
  assert.equal(total, 0, '위 목록의 글을 낱말장(src/lib/copy.ts)대로 고치고, 조사는 josa()로 붙인다');
});

// ── 말 바구니(src/i18n) — 경로로 언어를 골라 그 언어의 규칙으로 ─────────────────────
// ko: 위의 금지어 · 조사 규칙. ja: 한글 없음 · BANNED_JA · 반각 가타카나 없음 · 'である' · '…だ。' 없음.
// en: 한글 · 가나 · 한자 없음 · BANNED_EN · plural() 없이 붙인 `${n} days` 없음. 모든 언어: 이모지 없음.
// *.data.ts(말이 아닌 언어 자료)는 글자 검사만.
const { catalogSourceProblems, textProblems } = require('./i18nLint');

function i18nFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) out.push(path.relative(ROOT, p).split(path.sep).join('/'));
    }
  };
  walk(path.join(ROOT, 'src', 'i18n'));
  return out.filter((r) => !SKIP.has(r)).sort();
}

const langOf = (rel) => /^src\/i18n\/(ko|ja|en)\//.exec(rel)?.[1] ?? 'ko';

test('검사기: 일본어 · 영어 규칙', () => {
  assert.deepEqual(textProblems('ja', 'キャンセル'), []);
  assert.ok(textProblems('ja', 'セルを選ぶ').length > 0);
  assert.ok(textProblems('ja', 'データを消す').includes('データ'));
  assert.ok(textProblems('ja', '完了しました！').length >= 2);
  assert.ok(textProblems('ja', 'ﾏｽ').includes('half-width katakana'));
  assert.ok(textProblems('ja', '目標である').includes('である'));
  assert.ok(textProblems('ja', '今日は休みだ。').includes('だ。'));
  assert.ok(textProblems('ja', '한글').includes('hangul'));
  assert.ok(textProblems('en', 'Tap a cell').length > 0);
  assert.ok(textProblems('en', 'Task completed').length >= 2);
  assert.ok(textProblems('en', 'Great job!').includes('!'));
  assert.ok(textProblems('en', '2026 goals').length > 0);
  assert.ok(textProblems('en', '今日').includes('kana/kanji'));
  assert.ok(textProblems('ko', '좋아요 \u{1F389}').includes('emoji'));
  assert.deepEqual(textProblems('en', 'Cancel · Done'), []);
  const probs = catalogSourceProblems('en', 'probe.ts', "const a = (n) => `${n} days left`; const b = (n) => `${n} ${plural(n, 'day', 'days')} left`;");
  assert.equal(probs.length, 1);
  assert.match(probs[0], /without plural/);
});

test('검사 범위: src/i18n의 세 언어 바구니를 모두 본다', () => {
  const files = i18nFiles();
  for (const l of ['ko', 'ja', 'en']) {
    assert.ok(files.includes(`src/i18n/${l}/common.ts`), l);
    assert.ok(files.includes(`src/i18n/${l}/fmt.ts`), l);
  }
  assert.equal(files.includes('src/i18n/glossary.ts'), false);
  assert.equal(files.includes('src/i18n/names.ts'), false);
});

test('말 바구니의 글이 그 언어의 규칙을 지킨다', () => {
  const byFile = {};
  for (const f of i18nFiles()) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const lang = langOf(f);
    // 한국어는 위의 소스 검사(금지어 · 조사)도 함께
    const hits = lang === 'ko' ? lintSource(f, src).map((h) => `${h.line}: ${h.rule} — ${h.text}`) : [];
    hits.push(...catalogSourceProblems(lang, f, src));
    if (hits.length > 0) byFile[f] = hits;
  }
  assert.deepEqual(byFile, {});
});
