// 웹의 쓰는 칸 — 포커스는 상자가 아니라 칸 아래 골드 줄, 여러 줄 칸은 한 줄에서 시작해 쓴 만큼 자란다(웹 미리보기 · 홈 화면 앱)
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('포커스 표시: 상자 테두리(outline) 대신 칸 아래 2px 골드 줄 — 좌우 여백 0인 칸에서 글이 테두리에 붙지 않게', () => {
  const css = src('src/lib/webStyle.ts');
  assert.match(css, /input:focus, textarea:focus \{ outline: none !important; box-shadow: inset 0 -2px 0 rgba\(176,136,60,0\.75\) !important; \}/);
  assert.doesNotMatch(css, /outline: 2px solid/);
  // 괘선 종이 위 메모는 밑줄을 더하지 않는다(맨 아래 괘선과 두 줄로 보인다)
  assert.match(css, /textarea\[data-ruled\]:focus \{ box-shadow: none !important; \}/);
  assert.match(src('src/overlays/ActionSheet.tsx'), /Platform\.OS === 'web' \? \(\{ dataSet: \{ ruled: '1' \} \} as object\) : null/);
});

test('여러 줄 칸(웹): 한 줄(rows 1)에서 시작해 글만큼 자라고 줄어든다 — 높이를 정한 칸은 그대로', () => {
  const s = src('src/components/AppText.tsx');
  assert.match(s, /const grow = Platform\.OS === 'web' && !!rest\.multiline && \(rest as \{ rows\?: number \}\)\.rows == null && rest\.numberOfLines == null\s*&& StyleSheet\.flatten\(style\)\?\.height == null;/);
  assert.match(s, /\.\.\.\(grow \? \(\{ rows: 1, onChangeText: onGrowChange \} as Partial<TextInputProps>\) : null\)/);
  assert.match(s, /useLayoutEffect\(\(\) => \{\s*if \(grow\) fitTextarea\(el\(\)\);\s*\}, \[grow, rest\.value\]\);/);

  const { fitTextarea } = require('../src/lib/webInput');
  // 테두리(아래 1px)까지 더한 높이 — 먼저 auto로 줄였다가 쓴 만큼으로
  const seen = [];
  const el = { style: { set height(v) { seen.push(v); this._h = v; }, get height() { return this._h; } }, scrollHeight: 50, offsetHeight: 69, clientHeight: 68 };
  fitTextarea(el);
  assert.deepEqual(seen, ['auto', '51px']);
  fitTextarea(null); // 아직 붙지 않은 칸은 건너뛴다
});
