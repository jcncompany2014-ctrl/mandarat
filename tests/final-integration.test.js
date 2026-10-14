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
  const grid = src('src/screens/FullGrid.tsx');
  assert.match(grid, /longestWord\(text, fs, PRETENDARD_GLYPHS\) > textW\) fs -= 0\.5/);
  assert.match(grid, /cellBreak\(text, textW, fs, PRETENDARD_GLYPHS\)/);
});

test('온보딩 스케치: 영역 이름 칸도 Pretendard 폭으로 맞춘다', () => {
  const sketch = src('src/components/ChartSketch.tsx');
  assert.equal((sketch.match(/PRETENDARD_GLYPHS\)/g) ?? []).length, 2);
  // 같은 상자에서 Pretendard 폭은 SVG 기본값보다 큰 글자를 허락한다(한글 0.864em < 1em)
  const svg = fitBox('포트폴리오', 46, 46, [11, 10, 9], 3, 14 / 11);
  const pre = fitBox('포트폴리오', 46, 46, [11, 10, 9], 3, 14 / 11, PRETENDARD_GLYPHS);
  assert.ok(pre.fs >= svg.fs);
});

test('웹 백업 불러오기: 고른 파일 이름도 보여 준다', () => {
  assert.match(src('src/lib/webFile.ts'), /resolve\(\{ text, name: f\.name \}\)/);
  assert.match(src('src/overlays/BackupImport.tsx'), /takeFile\(t\.text, t\.name\)/);
});
