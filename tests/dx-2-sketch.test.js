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

// D-13 · D-16(보드 칸의 달성 테두리 · 오늘 표시)은 ChartBoard를 지우며(R2) 함께 지웠다 — 크게 본 블록은 tests/a-chart.test.js · a-s2.test.js
// D-8 · D-15(81칸 범례 · 9pt 내민 표)은 디자인 A(S2)에서 범례와 함께 지웠다 — 지도 아래 한 줄은 tests/a-s2.test.js
