// FX-D — 오늘 · 통계 화면과 그 부품에 남은 말과 표시 색을 지킨다.
// - 화면 글(문자열·템플릿·JSX 글, 주석 제외)에 '완료'·'탭해'·'이뤘'·'이룬'·'셉니다'·'칸을 (다) 채웠'·'직접 추가'가 없다.
// - 화면 읽기 라벨에 KindLine.long('6/12권'·'D-3')을 쓰지 않는다(소리로 읽을 말은 .speech).
// - 통계 · 홈은 예전 표시색(M.gold · M.accent · legibleMark)을 쓰지 않는다(디자인 A — 토큰 타일).
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'src/screens/Today.tsx', 'src/screens/TodayModes.tsx', 'src/screens/Stats.tsx',
  'src/components/TodayRow.tsx', 'src/components/KindBits.tsx',
  'src/components/StatsCharts.tsx', 'src/components/MoodRow.tsx', 'src/components/LineIcons.tsx',
];
const STEMS = ['완료', '탭해', '이뤘', '이룬', '셉니다', '직접 추가'];
const RULES = [/칸을\s*(다\s*)?채웠/];

/** 파일 하나의 화면 글(주석·import 경로 제외) */
function copyOf(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const sf = ts.createSourceFile(rel, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out = [];
  const visit = (node) => {
    const p = node.parent;
    const isImport = p && (ts.isImportDeclaration(p) || ts.isExportDeclaration(p));
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !isImport) out.push(node.text);
    else if (ts.isTemplateExpression(node)) {
      out.push(node.head.text);
      for (const span of node.templateSpans) out.push(span.literal.text);
    } else if (ts.isJsxText(node)) out.push(node.text);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { src, strings: out };
}

test('오늘 · 통계 화면 글에 쓰지 않기로 한 말이 없다', () => {
  const hits = [];
  for (const rel of FILES) {
    for (const s of copyOf(rel).strings) {
      for (const w of STEMS) if (s.includes(w)) hits.push(`${rel}: '${w}' in "${s.trim()}"`);
      for (const r of RULES) if (r.test(s)) hits.push(`${rel}: ${r} in "${s.trim()}"`);
    }
  }
  assert.deepEqual(hits, []);
});

test('화면 읽기 라벨은 KindLine.long 대신 .speech를 쓴다', () => {
  const hits = [];
  for (const rel of ['src/screens/TodayModes.tsx', 'src/screens/Stats.tsx', 'src/components/TodayRow.tsx']) {
    copyOf(rel).src.split('\n').forEach((l, i) => {
      if (/\.long\b/.test(l) && !l.trim().startsWith('//') && !l.trim().startsWith('*')) hits.push(`${rel}:${i + 1}`);
    });
  }
  assert.deepEqual(hits, []);
});

test('통계 · 홈은 예전 표시색을 쓰지 않는다(옛 이름 M.gold · M.accent와 legibleMark는 웨이브 4가 지웠다)', () => {
  // 통계의 막대 · 달력은 디자인 A(S4)에서 토큰 타일(막대는 영역 washL1, 달력은 tile → printMid → … → ink)로 바뀌어
  // 표시색(M.gold)을 쓰지 않는다 — tests/a-s4.test.js
  const charts = fs.readFileSync(path.join(ROOT, 'src/components/StatsCharts.tsx'), 'utf8');
  assert.doesNotMatch(charts, /legibleMark\(|M\.gold|M\.accent/);
  // 홈 날짜 숫자 아래 '하루 마감' 줄은 디자인 A(S1)에서 큰 날짜 머리와 함께 없어졌다 — 홈은 표시색을 쓰지 않는다
  const dash = fs.readFileSync(path.join(ROOT, 'src/screens/Dashboard.tsx'), 'utf8');
  assert.doesNotMatch(dash, /legibleMark\(|M\.gold|M\.accent/);
});
