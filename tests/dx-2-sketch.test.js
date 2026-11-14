require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('D-6: 처음 화면 예시는 입력칸 안내와 겹치지 않는다(미리보기 칸 글 맞추기는 tests/a-s5)', () => {
  const onb = src('src/screens/Onboarding.tsx');
  assert.match(onb, /const examples = \[o\.ex1, o\.ex2, o\.ex3\]/);
  assert.match(onb, /placeholder=\{o\.goalPlaceholder\}/);
  for (const l of ['ko', 'ja', 'en']) {
    const o = require('../src/i18n').msg(l).onboarding;
    const placeholder = o.goalPlaceholder.replace(o.exampleMark, '').trim();
    assert.ok(![o.ex1, o.ex2, o.ex3].some((e) => e.includes(placeholder) || placeholder.includes(e)), `${l}: 입력칸 안내와 같은 예시를 두 번 보이지 않는다`);
  }
});

test('D-13: 8칸 다 달성한 블록은 크게 보기·영역 화면에서도 테두리와 달성', () => {
  const b = src('src/components/ChartBoard.tsx');
  assert.match(b, /const finished = th\.actions\.every\(\(a\) => !!a\?\.text\.trim\(\) && !!a\.done\)/);
  assert.match(b, /finished=\{finished\}/);
  assert.match(b, /\{finished && \(\s*<Text[^>]*>\s*\{m\.chart\.done\}/);
  assert.equal(require('../src/i18n').msg('ko').chart.done, '달성');
  assert.match(b, /borderWidth: 2, borderColor: legibleMark\(M\.gold, M\.bg, M\)/);
  // 81칸 표의 '달성'도 크게 보기와 같은 꼴 — 이름표 바탕(bg = headBg) 위 4.5:1, 포인트 색(최종 점검 NEW-1)
  const grid = src('src/screens/FullGrid.tsx');
  assert.match(grid, /color: legibleMark\(M\.gold, bg, M, 4\.5\), marginTop: 1 \}\} maxFontSizeMultiplier=\{1\}>\{m\.chart\.done\}/);
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
  assert.match(src('src/components/ChartPoster.tsx'), /cellBreak\(c\.text, k\.textW, fs\)/);
});
