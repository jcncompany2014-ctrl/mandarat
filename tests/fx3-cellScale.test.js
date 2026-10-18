// 81칸 칸 글의 크기(R-6 D-8) — 넓은 표(아이패드 펼침면)는 칸 폭만큼 글을 키우고, 휴대폰은 그대로.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('./register');
const { RULE } = require('../src/theme/chart');
const { longestWord } = require('../src/lib/text');
const { PRETENDARD_GLYPHS } = require('../src/lib/labelFit');

const grid = fs.readFileSync(path.join(__dirname, '../src/screens/FullGrid.tsx'), 'utf8');
/** FullGrid의 셈 그대로 — 표 폭 → 칸 글 폭 → 배율 */
const textWOf = (tableW) => (tableW - RULE.frame * 2) / 9 - 4 - RULE.block;
const scale = (textW) => Math.min(1.35, Math.max(1, textW / 52));

test('소스 — 배율 k는 칸 글 폭/52, 1~1.35. 글 크기 · 줄 높이 · 줄이는 폭에 같이 곱한다', () => {
  assert.match(grid, /const k = Math\.min\(1\.35, Math\.max\(1, textW \/ 52\)\);/);
  assert.match(grid, /const base = \(head \|\| core \? 9\.5 : 9\) \* k;/);
  assert.match(grid, /while \(fs > base - 2 \* k && longestWord\(text, fs, PRETENDARD_GLYPHS\) > textW\) fs -= 0\.5;/);
  assert.match(grid, /fontSize: fs, lineHeight: 10\.5 \* k,/);
});

test('휴대폰(320~440pt 폭)은 k = 1 — 지금 모습 그대로', () => {
  for (const w of [320, 375, 390, 393, 402, 414, 428, 430, 440]) {
    const tw = textWOf(w - 22);
    assert.ok(tw < 52, `${w}: 글 폭 ${tw.toFixed(1)}`);
    assert.equal(scale(tw), 1, `${w}`);
  }
});

test('펼침면(615pt 표)은 글이 커지고, 아주 넓어도 1.35배까지', () => {
  const tw = textWOf(615);
  const k = scale(tw);
  assert.ok(k > 1.15 && k <= 1.35, `615pt 표: k = ${k.toFixed(3)}`);
  assert.equal(scale(textWOf(1000)), 1.35);
  // 커진 글자에서도 줄이기가 그대로 — '포트폴리오'는 칸 폭 안으로 들어간다
  let fsz = 9 * k;
  while (fsz > 9 * k - 2 * k && longestWord('포트폴리오', fsz, PRETENDARD_GLYPHS) > tw) fsz -= 0.5;
  assert.ok(longestWord('포트폴리오', fsz, PRETENDARD_GLYPHS) <= tw, `${fsz}pt`);
});
