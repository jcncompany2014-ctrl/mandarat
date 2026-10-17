// i18n 검사 도우미(테스트 파일이 아니다) — 언어별 글 규칙과 소스의 한글 글자 세기.
// tests/copy.test.js · tests/i18n-catalog.test.js · tests/i18n-hardcoded.test.js가 함께 쓴다.
require('./register');
const ts = require('typescript');
const { BANNED_COPY, BANNED_COPY_RE, BANNED_JA, BANNED_EN } = require('../src/i18n/glossary');
const { MGMT_LABEL, MOOD_LABEL, SHAPE_LABEL } = require('../src/lib/copy');

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;
const KANA_KANJI = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/;
const HALF_KATAKANA = /[｡-ﾟ]/;
const EMOJI = /\p{Extended_Pictographic}/u;
/** 저장값(Mood · Mgmt · CellShape) — 화면 글이 아니라 세지 않는다 */
const STORED = new Set([...Object.keys(MGMT_LABEL), ...Object.keys(MOOD_LABEL), ...Object.keys(SHAPE_LABEL)]);

const hit = (list, text) => list.filter((w) => (typeof w === 'string' ? text.includes(w) : w.test(text))).map(String);

/** 글 한 줄이 그 언어의 규칙에 걸리는 곳 — ko 금지어는 copy.test.js의 소스 검사가 따로 본다(조사 규칙 포함) */
function textProblems(lang, text, { dataOnly = false } = {}) {
  const out = [];
  if (EMOJI.test(text)) out.push('emoji');
  if (lang === 'ko') {
    if (!dataOnly) out.push(...hit(BANNED_COPY, text), ...hit(BANNED_COPY_RE, text));
  } else if (lang === 'ja') {
    if (HANGUL.test(text)) out.push('hangul');
    if (HALF_KATAKANA.test(text)) out.push('half-width katakana');
    if (!dataOnly) {
      out.push(...hit(BANNED_JA, text));
      if (text.includes('である')) out.push('である');
      if (/だ。/.test(text)) out.push('だ。');
    }
  } else if (lang === 'en') {
    if (HANGUL.test(text)) out.push('hangul');
    if (KANA_KANJI.test(text)) out.push('kana/kanji');
    if (!dataOnly) out.push(...hit(BANNED_EN, text));
  }
  return out;
}

/** en 소스의 `${n} days`처럼 plural() 없이 붙인 셈 낱말 */
const PLURAL_WORD = /^\s+(squares|times|days|items|minutes|hours|weeks)\b/;

function sourceFile(name, src) {
  return ts.createSourceFile(name, src, ts.ScriptTarget.Latest, true, name.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

/** import 경로 · require · import() · console.* · 타입 자리 — 글이 아니다 */
function notText(node) {
  const p = node.parent;
  if (!p) return false;
  if ((ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) && p.moduleSpecifier === node) return true;
  if (ts.isExternalModuleReference(p)) return true;
  if (ts.isCallExpression(p) && p.arguments[0] === node
    && ((ts.isIdentifier(p.expression) && p.expression.text === 'require') || p.expression.kind === ts.SyntaxKind.ImportKeyword)) return true;
  if (ts.isLiteralTypeNode(p)) return true;
  // console.*(…) 안 어디든
  for (let q = p; q; q = q.parent) {
    if (ts.isCallExpression(q) && ts.isPropertyAccessExpression(q.expression) && ts.isIdentifier(q.expression.expression) && q.expression.expression.text === 'console') return true;
    if (ts.isStatement(q)) break;
  }
  return false;
}

/** 소스의 글 조각 — { node, text, kind: 'string' | 'template' | 'jsx' } (주석·정규식은 들어오지 않는다) */
function literals(name, src) {
  const sf = sourceFile(name, src);
  const out = [];
  const visit = (node) => {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !notText(node)) out.push({ node, text: node.text, kind: 'string' });
    else if (ts.isTemplateExpression(node) && !notText(node)) {
      out.push({ node, text: [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join('\u0000'), kind: 'template' });
    } else if (ts.isJsxText(node) && !node.containsOnlyTriviaWhiteSpaces) out.push({ node, text: node.text.trim(), kind: 'jsx' });
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { sf, out };
}

/** 한글이 든 글 조각 수 — 저장값은 빼고 */
function hangulCount(name, src) {
  return literals(name, src).out.filter((l) => HANGUL.test(l.text) && !STORED.has(l.text)).length;
}

/** 화면 글이 될 자리 — JSX 속성 · 객체 속성 이름과 부르는 함수 */
const TEXT_PROPS = new Set(['accessibilityLabel', 'accessibilityHint', 'placeholder', 'title', 'label', 'sub', 'body']);
const TEXT_CALLS = new Set(['showToast', 'announce', 'Alert.alert']);

/** 한글이 없어도 걸리는 것 — 글자가 든 JSX 글, 화면 글 자리에 넣은 글자 */
function literalProblems(name, src) {
  const { sf, out } = literals(name, src);
  const probs = [];
  const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  for (const l of out) {
    if (!/\p{L}/u.test(l.text) || STORED.has(l.text) || /^#[0-9a-f]{3,8}$/i.test(l.text)) continue;
    if (HANGUL.test(l.text)) probs.push(`${line(l.node)}: 한글 '${l.text.slice(0, 30)}'`);
    else if (l.kind === 'jsx') probs.push(`${line(l.node)}: JSX 글 '${l.text.slice(0, 30)}'`);
    else {
      const p = l.node.parent;
      const attr = ts.isJsxAttribute(p) ? p : ts.isJsxExpression(p) && ts.isJsxAttribute(p.parent) ? p.parent : null;
      if (attr && TEXT_PROPS.has(attr.name.getText(sf))) probs.push(`${line(l.node)}: ${attr.name.getText(sf)}="${l.text.slice(0, 30)}"`);
      else if (ts.isPropertyAssignment(p) && p.initializer === l.node && TEXT_PROPS.has(p.name.getText(sf))) probs.push(`${line(l.node)}: ${p.name.getText(sf)}: '${l.text.slice(0, 30)}'`);
      else if (ts.isCallExpression(p) && TEXT_CALLS.has(p.expression.getText(sf))) probs.push(`${line(l.node)}: ${p.expression.getText(sf)}('${l.text.slice(0, 30)}')`);
    }
  }
  return probs;
}

/** 바구니 파일의 글 조각을 그 언어 규칙으로 — [줄: 걸린 것] */
function catalogSourceProblems(lang, name, src) {
  const { sf, out } = literals(name, src);
  const dataOnly = name.endsWith('.data.ts');
  const probs = [];
  for (const l of out) {
    const line = sf.getLineAndCharacterOfPosition(l.node.getStart(sf)).line + 1;
    // ko 금지어·조사는 copy.test.js의 소스 검사가 본다
    for (const p of textProblems(lang, l.text.replace(/\u0000/g, ' '), { dataOnly: dataOnly || lang === 'ko' })) probs.push(`${line}: ${p} — ${l.text.slice(0, 40)}`);
    if (lang === 'en' && !dataOnly && l.kind === 'template') {
      for (const span of l.node.templateSpans) {
        if (PLURAL_WORD.test(span.literal.text)) probs.push(`${line}: \`\${…}${span.literal.text.split(/\s+/).slice(0, 2).join(' ')}\` without plural()`);
      }
    }
  }
  return probs;
}

module.exports = { HANGUL, STORED, textProblems, hangulCount, literalProblems, catalogSourceProblems, literals };
