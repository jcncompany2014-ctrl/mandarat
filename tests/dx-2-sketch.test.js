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
  // 81칸 표는 디자인 A(S2)에서 색 지도(ColourMap)가 되어 '달성' 글 · 금색 테두리가 없다(달성은 wash 칠)
  assert.match(b, /legibleMark\(M\.gold, headBg\(color, M\), M, 4\.5\)/);
});

test('D-16: 보드 칸의 오늘 · 이번 주 표시는 가장자리에 따로, 글 자리는 위아래 같게', () => {
  const b = src('src/components/ChartBoard.tsx');
  assert.match(b, /paddingVertical: PAD \+ edgeRow\(show\)/);
  assert.match(b, /2 \* edgeRow\(show\)/);
  assert.match(b, /position: 'absolute', top: PAD, left: PAD, right: PAD, height: TODAY_ROW - 3/);
  assert.match(b, /position: 'absolute', left: 0, right: 0, bottom: PAD, alignItems: 'center'/);
});
// D-8 · D-15(81칸 범례 · 9pt 내민 표)은 디자인 A(S2)에서 범례와 함께 지웠다 — 지도 아래 한 줄은 tests/a-s2.test.js
