// 문서에 적는 색(영역 색 · 포인트 컬러의 저장값)과 대비 계산(src/theme/palette.ts). 영역 슬롯 색은 디자인 A의 밝은 염료(LIGHT.dye, build-plan §2.5).
// 포인트 컬러는 이제 그리지 않는다 — 저장값과 그 이행만 남는다(build-plan §2.4).
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { PILLAR_COLORS, GOLD, contrast, migrateAccent, migrateAreaColor } = require('../src/theme/palette');
const { LIGHT } = require('../src/theme/tokens');
const { blankDoc, migrate } = require('../src/data/defaults');

/** 예전 앱이 고르게 하던 포인트 컬러 다섯 가지 — 문서에 저장되어 있을 수 있는 값 */
const STORED_ACCENTS = [GOLD, '#B35A72', '#478058', '#5068AB', '#7E60A8'];

test('contrast는 WCAG 대비율을 계산한다', () => {
  assert.equal(contrast('#FFFFFF', '#000000').toFixed(1), '21.0');
  assert.equal(contrast('#777777', '#777777'), 1);
  assert.equal(contrast('#000000', '#FFFFFF'), contrast('#FFFFFF', '#000000'));
});

test('8영역 슬롯 색 = 디자인 A의 밝은 염료(LIGHT.dye) — 새 문서 · 템플릿이 이 값을 적는다', () => {
  assert.deepEqual([...PILLAR_COLORS], [...LIGHT.dye]);
  assert.deepEqual(blankDoc().themes.map((t) => t.color), [...LIGHT.dye]);
  // 이미 적힌 예전 연꽃 값은 옮기지 않는다(이행 표를 늘리지 않는다 — 동기화가 출렁이지 않게)
  for (const old of ['#478058', '#9C6A2A', '#B35A72', '#2F7D79', '#7E60A8', '#3A77A5', '#AE5A35']) {
    assert.equal(migrateAreaColor(old), old);
    const d = migrate({ ...blankDoc(), themes: blankDoc().themes.map((t, i) => (i === 0 ? { ...t, color: old } : t)) });
    assert.equal(d.themes[0].color, old, `${old}: 저장된 값 그대로`);
  }
});

test('8영역 색은 흰 글씨와 AA(4.5) 이상 — 칸 위 흰 글씨가 늘 읽힌다', () => {
  for (const c of PILLAR_COLORS) assert.ok(contrast('#FFFFFF', c) >= 4.5, `${c}: ${contrast('#FFFFFF', c).toFixed(2)}`);
});

test('포인트 컬러의 저장값: 기본은 골드(새 문서) — 앱은 그리지 않는다', () => {
  assert.equal(GOLD, '#B0883C');
  assert.equal(blankDoc().settings.accent, GOLD);
});

test('migrateAccent: 예전 원색만 대응 색으로 옮기고, 고른 포인트 컬러는 그대로 둔다', () => {
  assert.equal(migrateAccent('#F4793B'), GOLD);
  assert.equal(migrateAccent('#f4793b'), GOLD);
  assert.equal(migrateAccent('#4f6bed'), '#5068AB');
  assert.equal(migrateAccent('#2FA968'), '#478058');
  assert.equal(migrateAccent('#8b5cf6'), '#7E60A8');
  for (const color of STORED_ACCENTS) assert.equal(migrateAccent(color), color);
  assert.equal(migrateAccent('#123456'), '#123456');
});
