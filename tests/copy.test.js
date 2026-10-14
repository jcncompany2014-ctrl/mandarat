// 화면 글 검사(copy lint) — src의 문자열·템플릿·JSX 글에서 쓰지 않기로 한 말(BANNED_COPY)과
// `${이름}을`처럼 끝소리를 모른 채 붙인 조사를 찾아 파일별로 보여 준다(조사는 lib/text.ts의 josa()로 붙인다).
// 주석·import 경로·타입 자리 문자열은 보지 않는다(TypeScript 구문 트리로 글자만 골라낸다).
//
// 지금은 할 일(todo)로 돌린다 — 남은 목록을 출력하되 실패로 치지 않는다. W4-B가 test(...)로 바꿔 강제한다.
// 목록을 파일로 남기려면: COPY_LINT_OUT=<경로> node --test tests/copy.test.js
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { BANNED_COPY, MGMT_LABEL, MOOD_LABEL, SHAPE_LABEL } = require('../src/lib/copy');

const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['src/lib/copy.ts', 'src/types.ts']);
/** 저장값(Mood · Mgmt · CellShape) — 화면에는 copy.ts의 이름으로 보이고, 이 글자 그대로는 저장·비교에만 쓰인다 */
const STORED = new Set([...Object.keys(MGMT_LABEL), ...Object.keys(MOOD_LABEL), ...Object.keys(SHAPE_LABEL)]);
/** `}` 바로 뒤에 붙은 조사(뒤가 끝·띄어쓰기·문장부호일 때만 — '${n}가지'·'${n}이에요'는 조사가 아니다) */
const JOSA_AFTER_EXPR = /^(을|를|이|가|은|는|와|과|으로|로)(?=$|[\s.,!?·:;)\]…'"’”~])/;

/** 검사할 파일: src 아래 모든 .tsx + src/lib의 .ts */
function sourceFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.tsx') || (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts') && dir === path.join(ROOT, 'src', 'lib'))) out.push(p);
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
    if (STORED.has(text)) return;
    for (const w of BANNED_COPY) if (text.includes(w)) add(node, `'${w}'`, text);
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

test.todo('화면 글에 금지어와 끝소리를 모르는 조사가 없다', () => {
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
