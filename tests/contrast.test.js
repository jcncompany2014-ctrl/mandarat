// 대비 회귀 테스트 — 무드·포인트 컬러가 바뀌어도 글씨는 AA(4.5:1), 글씨 아닌 표시는 3:1을 지킨다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { MOODS, areaInk, accentInk, withAccent, toHex, mix } = require('../src/theme/moods');
const { PILLAR_COLORS, ACCENTS, GOLD, SEMANTIC, contrast } = require('../src/theme/palette');

const moods = Object.entries(MOODS);
const fmt = (n) => n.toFixed(2);

/** 반투명 색(r,g,b,a)을 바탕 위에 겹쳐 그린 실제 색 */
function over(rgba, bg) {
  const [r, g, b, a] = rgba.match(/[\d.]+/g).map(Number);
  const base = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
  return toHex(`rgb(${[r, g, b].map((c, i) => Math.round(c * a + base[i] * (1 - a))).join(', ')})`);
}

/** HSV 색조(도) — 글씨용으로 진하게·밝게 옮겨도 같은 색으로 보이는지 */
function hue(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b);
  const d = mx - Math.min(r, g, b);
  if (!d) return 0;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const hueGap = (a, b) => { const d = Math.abs(hue(a) - hue(b)); return Math.min(d, 360 - d); };

/** 글씨가 놓이는 바탕 — 종이·면(시트)·카드·탭바 */
const grounds = (M) => [['bg', M.bg], ['surface', M.surface], ['card', M.card], ['tabBg', M.tabBg]];

test('무드마다 먹·보조·금색 글씨(ink·sub·goldInk)는 바탕·면·탭바 위 AA(4.5)', () => {
  for (const [name, M] of moods) {
    for (const key of ['ink', 'sub', 'goldInk']) {
      for (const [g, bg] of grounds(M)) {
        const c = contrast(M[key], bg);
        assert.ok(c >= 4.5, `${name} ${key} ${M[key]} on ${g} ${bg}: ${fmt(c)}`);
      }
    }
  }
});

test('goldInk: 무드마다 정해 둔 값(기본 골드의 글씨 색)', () => {
  assert.deepEqual(
    Object.fromEntries(moods.map(([name, M]) => [name, M.goldInk])),
    { 연꽃: '#8B6D34', 크림: '#826631', 화이트: '#826632', 파스텔: '#81653D', 다크: '#CBA352' },
  );
});

test('areaInk: 8영역 색을 글씨로 — 5무드 × 8영역 모두 바탕·면 위 AA, 색조는 그대로', () => {
  for (const [name, M] of moods) {
    for (const color of PILLAR_COLORS) {
      const ink = areaInk(color, M);
      assert.match(ink, /^#[0-9A-F]{6}$/);
      for (const [g, bg] of grounds(M)) {
        const c = contrast(ink, bg);
        assert.ok(c >= 4.5, `${name} areaInk(${color}) ${ink} on ${g}: ${fmt(c)}`);
      }
    }
  }
  // 정의 그대로: 밝은 무드는 먹색 쪽 22%, 다크는 흰색 쪽 35%
  assert.equal(areaInk('#478058', MOODS['연꽃']), toHex(mix('#478058', MOODS['연꽃'].ink, 0.22)));
  assert.equal(areaInk('#478058', MOODS['다크']), toHex(mix('#478058', '#FFFFFF', 0.35)));
});

test('의미 색 글씨: 밝은 무드는 SEMANTIC.doneInk, 어느 무드든 areaInk(done·danger)가 AA', () => {
  for (const [name, M] of moods) {
    for (const color of [SEMANTIC.done, SEMANTIC.danger]) {
      const ink = areaInk(color, M);
      for (const [g, bg] of grounds(M)) assert.ok(contrast(ink, bg) >= 4.5, `${name} areaInk(${color}) on ${g}: ${fmt(contrast(ink, bg))}`);
    }
    if (M.dark) continue;
    for (const [g, bg] of grounds(M)) {
      const c = contrast(SEMANTIC.doneInk, bg);
      assert.ok(c >= 4.5, `${name} doneInk on ${g}: ${fmt(c)}`);
    }
  }
});

test('체크 상자 테두리(글씨 아닌 표시): 밝게 먹 55%, 다크 흰색 40% — 겹쳐 그린 색이 바탕·면 위 3:1 이상', () => {
  for (const [name, M] of moods) {
    const border = M.dark ? 'rgba(255,255,255,0.40)' : 'rgba(43,38,32,0.55)';
    for (const [g, bg] of grounds(M)) {
      const c = contrast(over(border, bg), bg);
      assert.ok(c >= 3, `${name} checkbox border on ${g}: ${fmt(c)}`);
    }
  }
});

test('8영역 색 칸 위 흰 글씨는 AA', () => {
  for (const color of PILLAR_COLORS) {
    const c = contrast('#FFFFFF', color);
    assert.ok(c >= 4.5, `white on ${color}: ${fmt(c)}`);
  }
});

test('스낵바 되돌리기 글씨 #E2C27F — 스낵바 바탕(M.center, 다크 #26242F) 위 AA', () => {
  for (const [name, M] of moods) {
    const bg = M.dark ? '#26242F' : M.center;
    const c = contrast('#E2C27F', bg);
    assert.ok(c >= 4.5, `${name} snackbar action on ${bg}: ${fmt(c)}`);
  }
});

// ── 포인트 컬러를 글씨로(주인 결정: 포인트 컬러 선택은 그대로, 글씨는 지금 고른 색에서) ──────────
test('accentInk: 5가지 포인트 컬러 × 5무드 모두 바탕·면·카드·탭바 위 AA, 같은 색조', () => {
  for (const [name, P] of moods) {
    for (const { color, name: accentName } of ACCENTS) {
      const ink = accentInk({ ...P, accent: color });
      assert.match(ink, /^#[0-9A-F]{6}$/);
      for (const [g, bg] of grounds(P)) {
        const c = contrast(ink, bg);
        assert.ok(c >= 4.5, `${name} ${accentName} ${ink} on ${g}: ${fmt(c)}`);
      }
      // 기본 골드는 손으로 맞춘 값이라 조금 더 넉넉하게
      const limit = color === GOLD ? 5 : 1;
      assert.ok(hueGap(ink, color) <= limit, `${name} ${accentName}: hue ${fmt(hue(color))} → ${fmt(hue(ink))}`);
      // 밝은 무드에서는 더 진하게, 다크에서는 더 밝게만 옮긴다
      if (P.dark) assert.ok(contrast(ink, '#000000') >= contrast(color, '#000000') - 1e-9, `${name} ${accentName} brighter`);
      else assert.ok(contrast(ink, '#FFFFFF') >= contrast(color, '#FFFFFF') - 1e-9, `${name} ${accentName} darker`);
    }
  }
});

test('accentInk: 기본 골드는 무드 표의 goldInk, 이미 넉넉한 색은 그대로, hex가 아니면 goldInk', () => {
  for (const [, P] of moods) {
    assert.equal(accentInk({ ...P, accent: GOLD }), P.goldInk);
    assert.equal(accentInk({ ...P, accent: GOLD.toLowerCase() }), P.goldInk);
    assert.equal(accentInk({ ...P, accent: 'blue' }), P.goldInk);
  }
  // 쪽빛은 연꽃 종이 위에서 이미 5.1:1 — 옮기지 않는다
  assert.equal(accentInk({ ...MOODS['연꽃'], accent: '#5068AB' }), '#5068AB');
  // 연지는 연꽃 종이 위 4.3:1 — 필요한 만큼만 진하게
  const ink = accentInk({ ...MOODS['연꽃'], accent: '#B35A72' });
  assert.notEqual(ink, '#B35A72');
  assert.ok(contrast(ink, MOODS['연꽃'].bg) < 5, `${ink}: 필요 이상으로 진해지지 않는다`);
  // 같은 입력은 같은 결과(캐시)
  assert.equal(accentInk({ ...MOODS['다크'], accent: '#7E60A8' }), accentInk({ ...MOODS['다크'], accent: '#7e60a8' }));
});

test('withAccent: goldInk를 지금 포인트 컬러의 글씨 색으로 맞추고, 무드 표는 건드리지 않는다', () => {
  for (const [name, P] of moods) {
    const before = { ...P };
    const gold = withAccent(P, GOLD);
    assert.equal(gold.accent, GOLD);
    assert.equal(gold.goldInk, P.goldInk, `${name}: 골드는 무드 표의 값 그대로`);
    for (const { color } of ACCENTS) {
      const M = withAccent(P, color);
      assert.equal(M.accent, color);
      assert.equal(M.goldInk, accentInk({ ...P, accent: color }));
      assert.equal(M.bg, P.bg);
      // 이미 맞춘 팔레트에 다시 적용해도 같다
      assert.equal(withAccent(M, color).goldInk, M.goldInk);
    }
    assert.deepEqual(P, before, `${name}: MOODS가 바뀌면 안 된다`);
  }
});

test('toHex: mix·tint 결과와 짧은·소문자 hex를 #RRGGBB로', () => {
  assert.equal(toHex('rgb(176, 136, 60)'), GOLD);
  assert.equal(toHex('#b0883c'), GOLD);
  assert.equal(toHex('#abc'), '#AABBCC');
  assert.equal(toHex('rgba(43, 38, 32, 0.55)'), '#2B2620');
  assert.equal(toHex(mix('#000000', '#FFFFFF', 0.5)), '#808080');
});
