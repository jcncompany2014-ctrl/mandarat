// FX-D — 오늘 · 통계 화면과 그 부품에 남은 말과 표시 색을 지킨다.
// - 화면 글(문자열·템플릿·JSX 글, 주석 제외)에 '완료'·'탭해'·'이뤘'·'이룬'·'셉니다'·'칸을 (다) 채웠'·'직접 추가'가 없다.
// - 화면 읽기 라벨에 KindLine.long('6/12권'·'D-3')을 쓰지 않는다(소리로 읽을 말은 .speech).
// - 통계 막대·달력 테두리·보드 '진행 중' 표시는 모든 무드 × 포인트 컬러에서 3:1 이상.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { MOODS, contrastEdition, withAccent } = require('../src/theme/moods');
const { ACCENTS, contrast } = require('../src/theme/palette');
const { legibleMark } = require('../src/theme/chart');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'src/screens/Today.tsx', 'src/screens/TodayModes.tsx', 'src/screens/Stats.tsx',
  'src/components/TodayRow.tsx', 'src/components/WeekStrip.tsx', 'src/components/KindBits.tsx',
  'src/components/StatsCharts.tsx', 'src/components/MoodRow.tsx', 'src/components/SegmentedControl.tsx',
  'src/components/AnimatedNumber.tsx', 'src/components/LineIcons.tsx',
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

test('포인트 컬러 표시(막대 · 달력 테두리 · 진행 중 표시)는 모든 무드에서 3:1 이상', () => {
  // 통계 막대·달력 칸은 카드 없이 종이(bg) 위에 바로 그린다 — 그 바탕으로 재고, 그 바탕에서 잰다 (FX-VERIFY K-2 · K-3).
  // 대비 증가(contrastEdition)를 켠 팔레트도 같이 본다
  for (const [name, mood] of Object.entries(MOODS)) {
    for (const accent of ACCENTS) {
      for (const [ic, M] of [['', withAccent(mood, accent.color)], [' +IC', contrastEdition(withAccent(mood, accent.color))]]) {
        // 막대·달력은 표의 표시색(M.gold — 포인트 컬러를 따르고, 골드면 무드마다 제 금색)으로 그린다
        for (const base of [M.accent, M.gold]) {
          const mark = legibleMark(base, M.bg, M);
          const c = contrast(mark, M.bg);
          assert.ok(c >= 3, `${name}${ic} ${base} on bg: ${c.toFixed(2)}`);
        }
      }
    }
  }
  // 재는 바탕과 놓이는 바탕이 같아야 한다 — 면(card)으로 재고 종이 위에 그리면 골드가 2.8:1
  const charts = fs.readFileSync(path.join(ROOT, 'src/components/StatsCharts.tsx'), 'utf8');
  assert.doesNotMatch(charts, /legibleMark\(M\.(accent|gold),\s*M\.card/);
  assert.equal((charts.match(/legibleMark\(M\.gold,\s*M\.bg, M\)/g) ?? []).length, 2, '막대 · 달력 테두리 — 표와 같은 표시색');
  // 홈 날짜 숫자 아래 '하루 마감' 줄도 종이 위 3:1 (FX-VERIFY K-1)
  const dash = fs.readFileSync(path.join(ROOT, 'src/screens/Dashboard.tsx'), 'utf8');
  assert.doesNotMatch(dash, /backgroundColor: M\.accent, marginTop: 1/);
  // 표·통계와 같은 표시색(M.gold) — 파스텔·다크에서 골드를 고르면 M.accent와 달라진다(최종 점검 NEW-1)
  assert.match(dash, /dayComplete && <View style=\{\{ height: 3, backgroundColor: legibleMark\(M\.gold, M\.bg, M\)/);
});
