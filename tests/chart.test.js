// 인쇄된 만다라트 표의 규칙(src/theme/chart.ts) — 칸 자리·칸 색·괘선·표시 색·글자 맞추기.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  CHART_POS, CELL_POS, CENTER_SLOT, SLOT_INDEX, CLOCKWISE, chartCell, blockAt, spiralRank,
  DONE_INK, coreBg, coreInk, headBg, headTrack, writtenBg, RULE, ruleColor, frameRadius, legibleMark,
  estimateLines, fitFontSize,
} = require('../src/theme/chart');
const { MOODS, toHex } = require('../src/theme/moods');
const { PILLAR_COLORS, contrast } = require('../src/theme/palette');

const moods = Object.entries(MOODS);

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

test('blockAt: 누른 자리 → 바깥 블록은 영역 번호, 가운데 블록은 c, 위치가 없으면 null', () => {
  assert.equal(blockAt(5, 5, 90), 0);
  assert.equal(blockAt(45, 5, 90), 1);
  assert.equal(blockAt(85, 5, 90), 2);
  assert.equal(blockAt(5, 45, 90), 3);
  assert.equal(blockAt(45, 45, 90), 'c');
  assert.equal(blockAt(85, 45, 90), 4);
  assert.equal(blockAt(5, 85, 90), 5);
  assert.equal(blockAt(45, 85, 90), 6);
  assert.equal(blockAt(90, 90, 90), 7); // 오른쪽 아래 끝도 마지막 블록
  assert.equal(blockAt(15, 30, 30, 60), 'c'); // 가로·세로가 다른 표
  assert.equal(blockAt(15, 50, 30, 60), 6);
  assert.equal(blockAt(undefined, 10, 90), null);
  assert.equal(blockAt(10, undefined, 90), null);
  assert.equal(blockAt(-1, 10, 90), null);
  assert.equal(blockAt(91, 10, 90), null);
  assert.equal(blockAt(10, 10, 0), null);
});

test('spiralRank: 가운데가 0, 바깥 바퀴일수록 뒤, 81칸 모두 다른 순번', () => {
  const ranks = new Set();
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) ranks.add(spiralRank(r, c));
  assert.equal(ranks.size, 81);
  assert.equal(spiralRank(4, 4), 0);
  const ring = (r, c) => Math.max(Math.abs(r - 4), Math.abs(c - 4));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      for (let r2 = 0; r2 < 9; r2++) {
        for (let c2 = 0; c2 < 9; c2++) {
          if (ring(r, c) < ring(r2, c2)) assert.ok(spiralRank(r, c) < spiralRank(r2, c2));
        }
      }
    }
  }
  // 한 바퀴 안에서는 왼쪽 위 모서리 → 오른쪽 → 아래 → 왼쪽 → 위(시계 방향)
  assert.ok(spiralRank(3, 3) < spiralRank(3, 5));
  assert.ok(spiralRank(3, 5) < spiralRank(5, 5));
  assert.ok(spiralRank(5, 5) < spiralRank(5, 3));
  assert.ok(spiralRank(5, 3) < spiralRank(4, 3));
});

test('가운데 칸: 밝은 무드는 무드의 먹색, 다크는 뒤집어 밝게 — 글자는 4.5:1 이상', () => {
  for (const [name, M] of moods) {
    const bg = coreBg(M);
    const ink = coreInk(M);
    assert.equal(bg, M.dark ? M.ink : M.center, name);
    assert.ok(contrast(toHex(ink), toHex(bg)) >= 4.5, `${name}: ${contrast(toHex(ink), toHex(bg)).toFixed(2)}`);
    // 가운데 칸은 종이 위에서 또렷하다
    assert.ok(contrast(toHex(bg), M.bg) >= 3, name);
  }
});

test('칠한 칸(달성) 위 흰 글씨는 8영역 모두 4.5:1 이상', () => {
  for (const c of PILLAR_COLORS) assert.ok(contrast(DONE_INK, c) >= 4.5, c);
});

test('이름표 바탕은 쓰기만 한 칸보다 옅고, 둘 다 달성(영역 색)과 뚜렷이 다르다 — 이름표 위 먹색 글씨 AA', () => {
  for (const [name, M] of moods) {
    for (const c of PILLAR_COLORS) {
      const head = toHex(headBg(c, M));
      const written = toHex(writtenBg(c, M));
      const solid = toHex(c);
      assert.notEqual(head, written);
      assert.ok(contrast(head, solid) >= 2, `${name} ${c}: 이름표 vs 달성`);
      assert.ok(contrast(written, solid) >= 1.8, `${name} ${c}: 쓴 칸 vs 달성`);
      assert.ok(contrast(M.ink, head) >= 4.5, `${name} ${c}: 이름표 위 글씨`);
      if (!M.dark) assert.ok(contrast(head, M.bg) < contrast(written, M.bg), `${name} ${c}: 이름표가 더 옅다`);
    }
  }
});

test('이름표 진행 막대: 바탕은 영역 색 25% — 이름표 위에서 보이고, 채운 부분(영역 색)은 더 또렷하다', () => {
  const over = (rgba, bg) => {
    const [r, g, b, a] = rgba.match(/[\d.]+/g).map(Number);
    const base = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
    return toHex(`rgb(${[r, g, b].map((c, i) => Math.round(c * a + base[i] * (1 - a))).join(', ')})`);
  };
  for (const c of PILLAR_COLORS) assert.equal(headTrack(c), `rgba(${[1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)).join(', ')}, 0.25)`);
  for (const [name, M] of moods) {
    for (const c of PILLAR_COLORS) {
      const head = toHex(headBg(c, M));
      const track = over(headTrack(c), head);
      assert.ok(contrast(track, head) >= 1.2, `${name} ${c}: 막대 바탕 ${contrast(track, head).toFixed(2)}`);
      assert.ok(contrast(c, head) >= 2.4, `${name} ${c}: 채운 막대 ${contrast(c, head).toFixed(2)}`);
      assert.ok(contrast(c, head) > contrast(track, head), `${name} ${c}`);
    }
  }
});

test('괘선: 테두리 > 블록 > 칸 순으로 굵고, 색도 그 순서로 진하다', () => {
  assert.ok(RULE.frame > RULE.block && RULE.block > RULE.cell);
  for (const [name, M] of moods) {
    const a = (s) => Number(s.match(/[\d.]+\)$/)[0].slice(0, -1));
    assert.ok(a(ruleColor(M, 'frame')) > a(ruleColor(M, 'block')), name);
    assert.ok(a(ruleColor(M, 'block')) > a(ruleColor(M, 'cell')), name);
  }
  assert.equal(ruleColor(MOODS['다크'], 'cell'), 'rgba(255,255,255,0.16)');
});

test('frameRadius: 반듯하게면 0, 둥글게면 3(카드처럼 둥글지 않게)', () => {
  assert.equal(frameRadius('각진'), 0);
  assert.equal(frameRadius('둥근'), 3);
  assert.equal(frameRadius(undefined), 3);
});

test('legibleMark: 금색 표시가 종이·쓴 칸 위에서 3:1 이상 — 넉넉하면 그대로 둔다', () => {
  for (const [name, M] of moods) {
    const grounds = [M.bg, ...PILLAR_COLORS.map((c) => writtenBg(c, M))];
    for (const g of grounds) {
      const m = legibleMark(M.gold, g, M);
      assert.ok(contrast(toHex(m), toHex(g)) >= 3, `${name} on ${g}: ${contrast(toHex(m), toHex(g)).toFixed(2)}`);
    }
  }
  // 다크의 금색은 이미 또렷해서 그대로
  const D = MOODS['다크'];
  assert.equal(legibleMark(D.gold, D.bg, D), D.gold);
  // 같은 입력은 같은 답
  const L = MOODS['연꽃'];
  assert.equal(legibleMark(L.gold, '#FFFFFF', L), legibleMark(L.gold, '#FFFFFF', L));
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

test('fitFontSize: 세 줄 안에 드는 가장 큰 크기, 어느 것도 안 되면 가장 작은 크기', () => {
  assert.equal(fitFontSize('첫 마라톤', 45, 3), 14);
  const long = '건강하고 활기찬 몸으로 첫 마라톤 완주하기';
  const fs = fitFontSize(long, 45, 3);
  assert.ok(fs < 14 && fs >= 10);
  assert.ok(estimateLines(long, 45, fs) <= 3 || fs === 10);
  assert.equal(fitFontSize('가'.repeat(80), 45, 3), 10);
  assert.equal(fitFontSize('가나', 45, 3, [20, 16]), 20);
});

test('표 파일에는 하드코딩한 먹색(#23211C · rgba(43,38,32,…))이 없다 — 색은 chart.ts에서', () => {
  const files = ['src/theme/chart.ts', 'src/components/GridMark.tsx', 'src/components/ChartBoard.tsx', 'src/components/ChartSketch.tsx'];
  for (const f of files) {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.ok(!/#23211C/i.test(src), `${f}: #23211C`);
    assert.ok(!/rgba\(\s*43\s*,\s*38\s*,\s*32/.test(src), `${f}: rgba(43,38,32,…)`);
  }
});
