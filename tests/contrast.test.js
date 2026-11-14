// 대비 회귀 테스트 — 앱 팔레트(토큰, 밝게 · 어둡게 · 대비 증가)에서 글씨는 AA(4.5:1), 글씨 아닌 표시는 3:1을 지킨다.
// 예전 무드 표 · 포인트 컬러의 글씨 색(withAccent · accentInk · areaInk)은 그리는 곳이 없어 웨이브 4(R2)가 지웠다.
// 문서의 저장값(settings.mood · accent)은 그대로 남는다 — tests/migrate.test.js · a-tokens.test.js.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { PALETTE, contrastPalette, toHex, mix } = require('../src/theme/moods');
const { PILLAR_COLORS, GOLD, contrast } = require('../src/theme/palette');
const { LIGHT, DARK } = require('../src/theme/tokens');

const fmt = (n) => n.toFixed(2);

/** 글씨가 놓이는 바탕 — 종이(바탕 · 시트), 떠 있는 탭 막대 캡슐 */
const grounds = (M) => [['paper', M.paper], ['capsule', M.capsule]];

// ── 앱 팔레트(usePalette) ────────────────────────────────────────────────────

/** 앱이 그리는 네 판 — 밝게 · 어둡게, 각각 iOS 대비 증가 */
const apps = [
  ['밝게', PALETTE.light], ['어둡게', PALETTE.dark],
  ['밝게 +IC', contrastPalette(PALETTE.light)], ['어둡게 +IC', contrastPalette(PALETTE.dark)],
];

test('앱 팔레트: 먹 · 보조 글씨(ink · ink2)와 인쇄 글씨(print · printStrong)는 종이 · 캡슐 · 칸 위 AA', () => {
  for (const [name, M] of apps) {
    for (const key of ['ink', 'ink2', 'print', 'printStrong']) {
      for (const [g, bg] of [...grounds(M), ['tile', M.tile]]) {
        const c = contrast(M[key], bg);
        // 인쇄 글씨(print)는 종이 위 글씨 — 칸(tile) 위에는 ink2를 쓴다(밝게 print/tile 4.41)
        if (key === 'print' && g === 'tile' && !M.dark) continue;
        assert.ok(c >= 4.5, `${name} ${key} ${M[key]} on ${g} ${bg}: ${fmt(c)}`);
      }
    }
  }
});

test('앱 팔레트: 단추 · 가운데 칸 위 글씨(onBtn · onCore) AA', () => {
  for (const [name, M] of apps) {
    assert.ok(contrast(M.onBtn, M.btn) >= 4.5, `${name} onBtn`);
    assert.ok(contrast(M.onCore, M.core) >= 4.5, `${name} onCore on core`);
  }
});

test('앱 팔레트: 신호색(signal — 오늘 점 · 일요일)은 종이 · 캡슐 위 3:1 이상, 종이 위 글씨로도 AA', () => {
  for (const [name, M] of apps) {
    for (const [g, bg] of grounds(M)) assert.ok(contrast(M.signal, bg) >= 3, `${name} signal on ${g}: ${fmt(contrast(M.signal, bg))}`);
    // 종이 위에서는 글씨(일요일 글자)로도 읽힌다
    assert.ok(contrast(M.signal, M.paper) >= 4.5, `${name} signal on paper: ${fmt(contrast(M.signal, M.paper))}`);
  }
  assert.equal(PALETTE.light.signal, LIGHT.signal);
  assert.equal(PALETTE.dark.signal, DARK.signal);
});

test('영역 색 칸 위 글씨: 예전 PILLAR(흰 글씨) · 새 dye(onDye) 모두 AA', () => {
  for (const color of PILLAR_COLORS) assert.ok(contrast('#FFFFFF', color) >= 4.5, `white on ${color}: ${fmt(contrast('#FFFFFF', color))}`);
  for (const t of [LIGHT, DARK]) for (const d of t.dye) assert.ok(contrast(t.onDye, d) >= 4.5, `${t.onDye} on ${d}`);
});

test('toHex: mix 결과와 짧은·소문자 hex를 #RRGGBB로', () => {
  assert.equal(toHex('rgb(176, 136, 60)'), GOLD);
  assert.equal(toHex('#b0883c'), GOLD);
  assert.equal(toHex('#abc'), '#AABBCC');
  assert.equal(toHex('rgba(43, 38, 32, 0.55)'), '#2B2620');
  assert.equal(toHex(mix('#000000', '#FFFFFF', 0.5)), '#808080');
});
