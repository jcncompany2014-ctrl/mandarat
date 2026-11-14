// 마지막 통합 — 디자인 수정 패키지 사이에 넘겨받은 일(DX-2 · DX-4 handoff)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('./register');
const { longestWord, fitBox } = require('../src/lib/text');
const { PRETENDARD_GLYPHS } = require('../src/lib/labelFit');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('81칸 표: 칸보다 긴 어절은 가운데서 끊기지 않게 글자를 줄인다(Pretendard 폭)', () => {
  // 390pt 화면의 칸 글자 폭 ≈ 35pt — '포트폴리오'(다섯 글자)는 9.5pt에서 넘치고 8pt에서 들어간다
  const textW = 35;
  assert.ok(longestWord('포트폴리오', 9.5, PRETENDARD_GLYPHS) > textW);
  let f = 9.5;
  while (f > 7.5 && longestWord('포트폴리오', f, PRETENDARD_GLYPHS) > textW) f -= 0.5;
  assert.ok(longestWord('포트폴리오', f, PRETENDARD_GLYPHS) <= textW, `${f}pt`);
  // 81칸 표(FullGrid)의 칸 글 맞추기는 디자인 A(S2)에서 색 지도의 이름표 맞추기(components/chart geometry mapLabel,
  // tests/a-chart.test.js)로 옮겼다 — 지도에는 실천 글이 없다
  assert.doesNotMatch(src('src/screens/FullGrid.tsx'), /cellBreak\(|longestWord\(/);
});

test('온보딩 미리보기: 영역 이름 칸도 Pretendard 폭으로 맞춘다', () => {
  // 처음 화면의 3×3 미리보기(Onboarding.tsx tileLabel) — 크기 고르기(fitBox)와 어절 폭(longestWord) 둘 다 Pretendard 폭
  const onb = src('src/screens/Onboarding.tsx');
  assert.equal((onb.match(/PRETENDARD_GLYPHS, l\)/g) ?? []).length, 2);
  // 같은 상자에서 Pretendard 폭은 SVG 기본값보다 큰 글자를 허락한다(한글 0.864em < 1em)
  const svg = fitBox('포트폴리오', 46, 46, [11, 10, 9], 3, 14 / 11);
  const pre = fitBox('포트폴리오', 46, 46, [11, 10, 9], 3, 14 / 11, PRETENDARD_GLYPHS);
  assert.ok(pre.fs >= svg.fs);
});

test('웹 백업 불러오기: 고른 파일 이름도 보여 준다', () => {
  assert.match(src('src/lib/webFile.ts'), /resolve\(\{ text, name: f\.name \}\)/);
  assert.match(src('src/overlays/BackupImport.tsx'), /takeFile\(t\.text, t\.name\)/);
});
