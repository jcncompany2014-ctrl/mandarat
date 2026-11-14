// 만다라트 표의 규칙(src/theme/chart.ts) — 칸 자리 · 글자 맞추기. 가운데 칸의 색은 토큰(core · onCore).
// 옛 보드(ChartBoard)가 쓰던 칸 색 · 괘선 · 표시 색(headBg · ruleColor · legibleMark …)은 웨이브 4(R2)가 함께 지웠다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  CHART_POS, CELL_POS, CENTER_SLOT, SLOT_INDEX, CLOCKWISE, chartCell, estimateLines,
} = require('../src/theme/chart');
const { PALETTE, contrastPalette } = require('../src/theme/moods');
const { contrast } = require('../src/theme/palette');
const { LIGHT, DARK } = require('../src/theme/tokens');

/** 앱 팔레트 — 밝게 · 어둡게, 각각 대비 증가 */
const apps = [
  ['밝게', PALETTE.light], ['어둡게', PALETTE.dark],
  ['밝게 +IC', contrastPalette(PALETTE.light)], ['어둡게 +IC', contrastPalette(PALETTE.dark)],
];

test('자리: 영역·실천 8개가 가운데를 빼고 왼쪽 위부터 읽는 순서로 놓인다', () => {
  assert.deepEqual([...CHART_POS], [0, 1, 2, 3, 5, 6, 7, 8]);
  assert.deepEqual([...CELL_POS], [...CHART_POS]);
  assert.equal(CENTER_SLOT, 4);
  assert.ok(!CHART_POS.includes(CENTER_SLOT));
  // SLOT_INDEX는 CHART_POS를 거꾸로 본 표
  CHART_POS.forEach((slot, i) => assert.equal(SLOT_INDEX[slot], i));
  assert.equal(SLOT_INDEX[CENTER_SLOT], null);
});

test('시계 방향: 8개를 한 번씩, 이웃한 자리끼리 이어서 한 바퀴 돈다', () => {
  assert.deepEqual([...CLOCKWISE].sort(), [0, 1, 2, 3, 4, 5, 6, 7]);
  const rc = (i) => { const s = CHART_POS[i]; return [Math.floor(s / 3), s % 3]; };
  for (let k = 0; k < 8; k++) {
    const [r1, c1] = rc(CLOCKWISE[k]);
    const [r2, c2] = rc(CLOCKWISE[(k + 1) % 8]);
    assert.equal(Math.abs(r1 - r2) + Math.abs(c1 - c2), 1, `${CLOCKWISE[k]} → ${CLOCKWISE[(k + 1) % 8]}`);
  }
  // 왼쪽 위에서 시작해 오른쪽으로
  assert.equal(CLOCKWISE[0], 0);
  assert.equal(CLOCKWISE[1], 1);
});

test('chartCell: 81칸 = 핵심 목표 1 · 영역 이름표 16(영역마다 2) · 실천 64(모두 다른 칸)', () => {
  const kinds = { core: 0, head: 0, action: 0 };
  const heads = new Map();
  const actions = new Set();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const x = chartCell(r, c);
      kinds[x.kind]++;
      if (x.kind === 'head') heads.set(x.ti, (heads.get(x.ti) ?? 0) + 1);
      if (x.kind === 'action') actions.add(`${x.ti}-${x.ai}`);
    }
  }
  assert.deepEqual(kinds, { core: 1, head: 16, action: 64 });
  assert.equal(actions.size, 64);
  for (let ti = 0; ti < 8; ti++) assert.equal(heads.get(ti), 2, `영역 ${ti}`);
  assert.deepEqual(chartCell(4, 4), { kind: 'core', block: 4, slot: 4 });
  // 가운데 블록의 오른쪽 칸 = 영역 4의 이름표, 영역 4 블록(오른쪽)의 가운데도 영역 4
  assert.deepEqual(chartCell(4, 5), { kind: 'head', block: 4, slot: 5, ti: 4 });
  assert.deepEqual(chartCell(4, 7), { kind: 'head', block: 5, slot: 4, ti: 4 });
  // 왼쪽 위 블록(영역 0)의 오른쪽 아래 칸 = 실천 7
  assert.deepEqual(chartCell(2, 2), { kind: 'action', block: 0, slot: 8, ti: 0, ai: 7 });
  assert.equal(chartCell(9, 0), null);
  assert.equal(chartCell(-1, 3), null);
  assert.equal(chartCell(1.5, 3), null);
});

test('가운데 칸: 토큰 core · onCore(어둡게도 뒤집지 않는다) — 글자는 4.5:1 이상, 종이 위에서 또렷하다', () => {
  for (const [name, M] of apps) {
    assert.ok(contrast(M.onCore, M.core) >= 4.5, `${name}: ${contrast(M.onCore, M.core).toFixed(2)}`);
    assert.ok(contrast(M.core, M.paper) >= 1.9, `${name}: ${contrast(M.core, M.paper).toFixed(2)}`);
  }
  assert.equal(LIGHT.core, '#221F1B');
  assert.equal(DARK.core, '#4A4E55');
});

test('estimateLines: 어절 단위로 줄을 바꾸고, 긴 어절만 글자 단위로 끊는다', () => {
  assert.equal(estimateLines('', 100, 12), 0);
  assert.equal(estimateLines('   ', 100, 12), 0);
  assert.equal(estimateLines('건강', 100, 12), 1);
  // 12pt 한글 한 글자 = 12 — 폭 50에 '건강한 몸'(36 + 공백 + 12)은 한 줄 넘는다
  assert.equal(estimateLines('건강한 몸', 50, 12), 2);
  assert.equal(estimateLines('건강한 몸', 60, 12), 1);
  // 공백 없는 긴 낱말은 폭만큼 끊긴다(10글자 × 12 = 120 → 폭 50이면 3줄)
  assert.equal(estimateLines('가나다라마바사아자차', 50, 12), 3);
  // 줄바꿈 문자는 지킨다
  assert.equal(estimateLines('하나\n둘', 100, 12), 2);
});

test('표 파일에는 하드코딩한 먹색(#23211C · rgba(43,38,32,…))이 없다 — 색은 chart.ts에서', () => {
  const files = ['src/theme/chart.ts', 'src/components/GridMark.tsx'];
  for (const f of files) {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.ok(!/#23211C/i.test(src), `${f}: #23211C`);
    assert.ok(!/rgba\(\s*43\s*,\s*38\s*,\s*32/.test(src), `${f}: rgba(43,38,32,…)`);
  }
});
