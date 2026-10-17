// 화면 읽기 언어(R-6 A-1) — 이름표를 직접 단 View · Pressable은 안쪽 글자의 언어가 아니라 자기 언어로 읽힌다.
// 그래서 accessibilityLabel을 단 바탕 요소에는 accessibilityLanguage(또는 a11yLangProp())가 함께 있어야 한다.
// AppText의 Text · TextInput, Pressy, LineRow 같은 앱 부품은 안에서 이미 언어를 붙이므로 보지 않는다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const DIRS = ['src/screens/year', 'src/screens/settings'];
const FILES = [
  'src/screens/settings/PaperRows.tsx',
  'src/screens/settings/LanguageSection.tsx',
  'src/screens/settings/SyncChoiceSheet.tsx',
  'src/screens/settings/SyncSection.tsx',
  'src/overlays/ProSheet.tsx',
  'src/overlays/PrintSheet.tsx',
  'src/overlays/YearClose.tsx',
  'src/components/YearLedger.tsx',
  'src/components/RemindRow.tsx',
  'src/components/common.tsx',
];
/** 언어를 스스로 붙이지 않는 바탕 요소 */
const HOST = new Set(['View', 'Pressable', 'Animated.View', 'ScrollView']);

function sources() {
  const out = [...FILES];
  for (const d of DIRS) {
    for (const f of fs.readdirSync(path.join(ROOT, d))) if (f.endsWith('.tsx')) out.push(`${d}/${f}`);
  }
  return out;
}

/** 이름표는 있는데 언어가 없는 바탕 요소 — "파일:줄 <태그>" */
function missing(rel) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const bad = [];
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sf);
      const props = node.attributes.properties;
      const named = (n) => props.some((p) => ts.isJsxAttribute(p) && p.name.getText(sf) === n);
      const spread = props.some((p) => ts.isJsxSpreadAttribute(p) && /a11yLangProp\(\)/.test(p.expression.getText(sf)));
      if (HOST.has(tag) && named('accessibilityLabel') && !named('accessibilityLanguage') && !spread) {
        bad.push(`${rel}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1} <${tag}>`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return bad;
}

test('A-1: 이름표를 단 View · Pressable은 화면 읽기 언어도 단다', () => {
  const bad = sources().flatMap(missing);
  assert.deepEqual(bad, []);
});

test('A-1: 검사가 실제로 무언가를 본다(빈 목록으로 통과하지 않게)', () => {
  const seen = sources().map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')).join('\n');
  assert.ok((seen.match(/a11yLangProp\(\)/g) ?? []).length >= 20);
});

test('A-1: a11yLangProp은 a11yLang(lang())을 accessibilityLanguage로 내놓는다', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/components/AppText.tsx'), 'utf8');
  assert.match(src, /export const a11yLangProp = \(\) => \(\{ accessibilityLanguage: a11yLang\(lang\(\)\) \}\);/);
});

test('A-1: 언어 고르기의 "시스템" 줄도 앱 언어로 읽힌다', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/screens/settings/LanguageSection.tsx'), 'utf8');
  assert.match(src, /p !== 'system' \? p : a11yLang\(\)/);
});
