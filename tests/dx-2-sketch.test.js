require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { fitBox, longestWord } = require('../src/lib/text');
const { estimateLines } = require('../src/theme/chart');
const { TEMPLATES } = require('../src/data/templates');

const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('D-5: 처음 화면 스케치(180pt) — 템플릿 영역 이름은 어절 가운데서 끊기지 않고 칸 안에 든다', () => {
  const cell = (180 - 2) / 3;
  const inner = cell - 8; // 둘레 칸 안쪽 여백 4
  const names = [...TEMPLATES.flatMap((t) => t.areas.map((a) => a.title)), '사이드 프로젝트', '포트폴리오'];
  for (const n of names) {
    const f = fitBox(n, inner, inner, [11, 10, 9], 3, 14 / 11);
    assert.ok(longestWord(n, f.fs) <= inner, `${n}: ${f.fs}pt 어절 폭 ${longestWord(n, f.fs)} > ${inner}`);
    assert.ok(estimateLines(n, inner, f.fs) <= f.lines, `${n}: 줄 수`);
    assert.ok(f.lh * f.lines <= inner, `${n}: 높이`);
  }
});

test('D-5 · D-6: 스케치는 높이까지 보고 크기를 고르고, 예시는 구분점 없이 겹치지 않는다', () => {
  const sketch = src('src/components/ChartSketch.tsx');
  assert.match(sketch, /fitBox\(goal, inner, inner, CENTER_SIZES, CENTER_LINES[,)]/);
  // 화면 글자(Pretendard) 폭으로 잰다 — SVG 기본값(한글 1em)으로 재면 실제보다 좁게 맞춘다
  assert.match(sketch, /PRETENDARD_GLYPHS\)/);
  assert.match(sketch, /numberOfLines=\{fit\.lines\}/);
  assert.doesNotMatch(sketch, /fitFontSize/);
  const onb = src('src/screens/Onboarding.tsx');
  const ex = onb.match(/const EXAMPLES = \[([^\]]*)\]/)[1];
  const placeholder = onb.match(/placeholder="예\) ([^"]+)"/)[1];
  assert.ok(!ex.includes(placeholder), '입력칸 안내와 같은 예시를 두 번 보이지 않는다');
  assert.doesNotMatch(onb, />\s*·\s*</, '예시 사이 구분점 글자가 없다');
  assert.match(onb, /minHeight: 32/);
});

test('D-13: 8칸 다 달성한 블록은 크게 보기·영역 화면에서도 테두리와 달성', () => {
  const b = src('src/components/ChartBoard.tsx');
  assert.match(b, /const finished = th\.actions\.every\(\(a\) => !!a\?\.text\.trim\(\) && !!a\.done\)/);
  assert.match(b, /finished=\{finished\}/);
  assert.match(b, /\{finished && \(\s*<Text[^>]*>\s*달성/);
  assert.match(b, /borderWidth: 2, borderColor: legibleMark\(M\.gold, M\.bg, M\)/);
  const g = src('src/components/GridMark.tsx');
  assert.match(g, /base\.dot = a\?\.done \? DONE_INK : legibleMark\(M\.gold, base\.bg \?\? M\.bg, M\);/);
  // 81칸 표의 '달성'도 크게 보기와 같은 꼴 — 이름표 바탕(bg = headBg) 위 4.5:1, 포인트 색(최종 점검 NEW-1)
  const grid = src('src/screens/FullGrid.tsx');
  assert.match(grid, /color: legibleMark\(M\.gold, bg, M, 4\.5\), marginTop: 1 \}\} maxFontSizeMultiplier=\{1\}>달성/);
  assert.doesNotMatch(grid, /color: M\.goldInk/);
  assert.match(b, /legibleMark\(M\.gold, headBg\(color, M\), M, 4\.5\)/);
});

test('D-16: 보드 칸의 오늘 · 이번 주 표시는 가장자리에 따로, 글 자리는 위아래 같게', () => {
  const b = src('src/components/ChartBoard.tsx');
  assert.match(b, /paddingVertical: PAD \+ edgeRow\(show\)/);
  assert.match(b, /2 \* edgeRow\(show\)/);
  assert.match(b, /position: 'absolute', top: PAD, left: PAD, right: PAD, height: TODAY_ROW - 3/);
  assert.match(b, /position: 'absolute', left: 0, right: 0, bottom: PAD, alignItems: 'center'/);
});

test('D-8 · D-15: 81칸 범례는 실제 칸 모양, 글은 20pt 쪽 가장자리에', () => {
  const f = src('src/screens/FullGrid.tsx');
  const legend = f.slice(f.indexOf('범례 한 줄'), f.indexOf('블록을 누르면 크게'));
  assert.doesNotMatch(legend, /borderWidth: 1, borderColor: M\.sub/);
  assert.doesNotMatch(legend, /backgroundColor: M\.sub/);
  assert.match(legend, /headBg\(keyColor, M\)/);
  assert.doesNotMatch(f, /paddingHorizontal: 4\b/);
  assert.match(f, /const EDGE = 9;/);
  assert.match(src('src/screens/GridScreen.tsx'), /marginHorizontal: 9/);
  // 81칸과 공유 이미지는 같은 줄바꿈 도우미
  assert.match(f, /cellBreak\(text, textW/);
  assert.match(src('src/components/ChartPoster.tsx'), /cellBreak\(c\.text, TEXT_W, fs\)/);
});
