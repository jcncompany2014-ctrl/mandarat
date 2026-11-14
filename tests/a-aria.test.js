// 웹에서는 accessibilityState.checked가 aria-checked로 나가지 않는다(RN-web).
// 체크 상태를 가진 모든 칸은 aria-checked도 함께 달아야 화면 읽기와 웹 점검이 상태를 안다.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(e.name)) out.push(p);
  }
  return out;
}

test('checked 상태를 가진 칸은 모두 aria-checked도 단다', () => {
  const missing = [];
  for (const f of walk(path.join(__dirname, '..', 'src'))) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((l, i) => {
      if (!/accessibilityState=\{[^\n]*checked/.test(l)) return;
      const near = lines.slice(Math.max(0, i - 4), i + 5).join('\n');
      if (!/aria-checked=/.test(near)) missing.push(`${path.relative(path.join(__dirname, '..'), f)}:${i + 1}`);
    });
  }
  assert.deepEqual(missing, []);
});

test('Header: 덩어리가 머리(header)일 때 제목은 머리를 겹쳐 달지 않는다(웹에서 h1 안의 h1)', () => {
  const s = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'common.tsx'), 'utf8');
  assert.match(s, /accessibilityRole=\{grouped \? 'header' : undefined\}/);
  assert.match(s, /ref=\{titleRef\}[\s\S]{0,200}accessibilityRole=\{grouped \? undefined : 'header'\}/);
});
