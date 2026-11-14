// 디자인 A · 꾸러미 T(wave 1a) — 토큰 · 글자 역할 · 화면 모드 · 종이 무늬 기본값(docs/design/build-plan.md §2.1–2.4 · 2.6).
// 값은 계획서의 표 그대로(목업 tokens.css와 같다). 대비는 계획서의 줄마다 하나씩 잰다(계획서처럼 소수 둘째 자리로 반올림해 견준다).
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { LIGHT, DARK, GEO, moreContrast, desk } = require('../src/theme/tokens');
const { ROLE, NUM } = require('../src/theme/type');
const { PRETENDARD } = require('../src/theme/fonts');
const { PALETTE, paletteOf, contrastPalette } = require('../src/theme/moods');
const { contrast } = require('../src/theme/palette');
const { DEFAULT_LOOK, LOOKS, isDark, lookFromMood, parseLook } = require('../src/lib/look');
const { STORE_KEYS } = require('../src/lib/contracts');
const { DEFAULT_PATTERN, PAPER_CHOICES, drawnPattern, patternSetting, storedPattern } = require('../src/lib/paper');
const { MOOD_OPTS, PAPER_OPTS, blankDoc, migrate } = require('../src/data/defaults');
const { makeBackup, parseBackup } = require('../src/lib/backup');
const { project, assemble } = require('../src/lib/syncProject');

const ROOT = path.join(__dirname, '..');
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const r2 = (n) => Math.round(n * 100) / 100;
const range = (xs) => [r2(Math.min(...xs)), r2(Math.max(...xs))];

// ── §2.1 값 ─────────────────────────────────────────────────────────────────

test('LIGHT: 계획서 §2.1의 값 그대로', () => {
  assert.deepEqual({ ...LIGHT }, {
    dark: false,
    paper: '#FFFFFF', paperVeil: 'rgba(255,255,255,0.94)',
    ink: '#191B1F', ink2: '#5F6670', ink3: '#9AA0A8',
    printStrong: '#4B5059', print: '#6B727C', printEdge: '#868D96', printMid: '#D5D9DE', printRule: '#EEF0F2', ghost: '#D5D9DE', tile: '#F3F4F6',
    signal: '#C4372F',
    dye: ['#447753', '#5068AB', '#916329', '#A35468', '#2E7773', '#7C5FA5', '#38719B', '#A65633'],
    wash: ['#AFCFB6', '#B0C2EE', '#DFC09F', '#ECB7C1', '#A4CDCA', '#CDBCEA', '#A7C9E5', '#EDB7A1'],
    washL1: ['#9BBAA2', '#9BADD8', '#CBAD8C', '#D8A4AE', '#8FB7B4', '#B8A7D4', '#92B4CF', '#D8A38D'],
    tint: ['#E4EBE5', '#E5E9F4', '#F0E8E0', '#F3E6E8', '#E2EBEA', '#ECE8F3', '#E2EAF1', '#F4E7E1'],
    dyeText: ['#427250', '#4E65A5', '#8B5F29', '#9B5164', '#2D726F', '#765B9D', '#366C94', '#9F5332'],
    onDye: '#FFFFFF', core: '#221F1B', onCore: '#FFFFFF', tick: '#191B1F',
    btn: '#191B1F', onBtn: '#FFFFFF', add: '#191B1F', onAdd: '#FFFFFF', capsule: '#FFFFFF',
    float: '0 0 0 0.5px rgba(25,27,31,0.06), 0 1px 2px rgba(25,27,31,0.06), 0 8px 24px rgba(25,27,31,0.10)',
    scrim: 'rgba(25,27,31,0.32)',
  });
});

test('DARK: 계획서 §2.1의 값 그대로', () => {
  assert.deepEqual({ ...DARK }, {
    dark: true,
    paper: '#121316', paperVeil: 'rgba(18,19,22,0.92)',
    ink: '#ECEDEF', ink2: '#A3A8B0', ink3: '#6B7078',
    printStrong: '#C6CAD0', print: '#9AA0A8', printEdge: '#6E747C', printMid: '#33363C', printRule: '#24262B', ghost: '#33363C', tile: '#1D1F23',
    signal: '#E2543F',
    dye: ['#40704D', '#4D64A3', '#885D26', '#9A4F62', '#2C706D', '#75599A', '#356A92', '#9C5231'],
    wash: ['#253426', '#282D3F', '#3F2E19', '#46292E', '#1E3430', '#362B3E', '#22323D', '#44291C'],
    washL1: ['#2E4732', '#354061', '#553C1D', '#5F343E', '#234744', '#4B3A5C', '#284358', '#603623'],
    tint: ['#181F1D', '#1A1D27', '#211D1A', '#231B20', '#171F21', '#1E1C26', '#181E25', '#231C1B'],
    dyeText: ['#6A8F74', '#7285B6', '#A28156', '#B07685', '#5D918F', '#937EB0', '#618BAA', '#B37A60'],
    onDye: '#F4F5F6', core: '#4A4E55', onCore: '#F4F5F6', tick: '#ECEDEF',
    btn: '#ECEDEF', onBtn: '#121316', add: '#ECEDEF', onAdd: '#121316', capsule: '#1D1F23',
    float: '0 0 0 0.5px rgba(236,230,216,0.10), 0 8px 24px rgba(0,0,0,0.5)',
    scrim: 'rgba(0,0,0,0.55)',
  });
});

test('두 벌은 같은 이름, 영역 색 줄은 8개씩 #RRGGBB', () => {
  assert.deepEqual(Object.keys(DARK), Object.keys(LIGHT));
  for (const t of [LIGHT, DARK]) {
    for (const k of ['dye', 'wash', 'washL1', 'tint', 'dyeText']) {
      assert.equal(t[k].length, 8, k);
      for (const c of t[k]) assert.match(c, /^#[0-9A-F]{6}$/, `${k} ${c}`);
    }
  }
});

test('GEO: 계획서 §2.1의 자리 수치 그대로', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(GEO)), {
    gutter: 24, row: 54, header: 72, sectionGap: 30,
    rCheck: 6, rTag: 2, rField: 12, rSegCell: 9, rChip: 10, rTool: 29, rSheet: 28, rBlock: 10,
    bar: { h: 58, side: 16, bottom: 18, gap: 10, addW: 66, veil: 40 },
    sheet: { inset: 8, pad: 24 },
    dye: 8, rule: 1, ruleHeavy: 1.5,
  });
});

test('tokens.ts · type.ts · lib/look.ts는 react-native를 들이지 않는다(Node에서 require)', () => {
  for (const f of ['src/theme/tokens.ts', 'src/theme/type.ts', 'src/lib/look.ts']) {
    const code = src(f).split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    assert.doesNotMatch(code, /^import (?!type )[^;]*from 'react-native'/m, f);
    assert.doesNotMatch(code, /require\('react-native'\)/, f);
  }
});

// ── §2.1 대비(계획서의 줄마다) ──────────────────────────────────────────────

test('밝게: print/paper 4.86 · ink2/tile 5.27 · printEdge/paper 3.35 · signal/paper 5.34', () => {
  assert.equal(r2(contrast(LIGHT.print, LIGHT.paper)), 4.86);
  assert.equal(r2(contrast(LIGHT.ink2, LIGHT.tile)), 5.27);
  assert.equal(r2(contrast(LIGHT.printEdge, LIGHT.paper)), 3.35);
  assert.equal(r2(contrast(LIGHT.signal, LIGHT.paper)), 5.34);
});

test('밝게: onDye/dye 5.20–5.37 · ink/wash 9.69–10.20 · dyeText/tint ≥ 4.6 · dyeText/paper ≥ 5.58', () => {
  assert.deepEqual(range(LIGHT.dye.map((d) => contrast(LIGHT.onDye, d))), [5.2, 5.37]);
  assert.deepEqual(range(LIGHT.wash.map((w) => contrast(LIGHT.ink, w))), [9.69, 10.2]);
  LIGHT.dyeText.forEach((c, i) => assert.ok(contrast(c, LIGHT.tint[i]) >= 4.6 - 0.005, `dyeText ${i} on tint: ${contrast(c, LIGHT.tint[i]).toFixed(3)}`));
  LIGHT.dyeText.forEach((c, i) => assert.ok(r2(contrast(c, LIGHT.paper)) >= 5.58, `dyeText ${i} on paper: ${contrast(c, LIGHT.paper).toFixed(3)}`));
});

test('어둡게: print/paper 7.05 · signal/paper 4.93 · printEdge/paper 3.94', () => {
  assert.equal(r2(contrast(DARK.print, DARK.paper)), 7.05);
  assert.equal(r2(contrast(DARK.signal, DARK.paper)), 4.93);
  assert.equal(r2(contrast(DARK.printEdge, DARK.paper)), 3.94);
});

test('어둡게: onDye/dye 5.24–5.30 · ink/wash ≥ 11.09 · dyeText/tint ≥ 4.6 · dyeText/paper ≥ 5.08', () => {
  assert.deepEqual(range(DARK.dye.map((d) => contrast(DARK.onDye, d))), [5.24, 5.3]);
  DARK.wash.forEach((w, i) => assert.ok(r2(contrast(DARK.ink, w)) >= 11.09, `ink on wash ${i}: ${contrast(DARK.ink, w).toFixed(3)}`));
  DARK.dyeText.forEach((c, i) => assert.ok(contrast(c, DARK.tint[i]) >= 4.6 - 0.005, `dyeText ${i} on tint: ${contrast(c, DARK.tint[i]).toFixed(3)}`));
  DARK.dyeText.forEach((c, i) => assert.ok(r2(contrast(c, DARK.paper)) >= 5.08, `dyeText ${i} on paper: ${contrast(c, DARK.paper).toFixed(3)}`));
});

test('어둡게: 영역 색을 표시로 쓰면 종이 위 3.2:1 — 표시만(글씨로는 dyeText)', () => {
  for (const d of DARK.dye) {
    const c = contrast(d, DARK.paper);
    assert.ok(c >= 3.2 - 0.005 && c < 4.5, `${d}: ${c.toFixed(2)}`);
  }
});

test('글씨 · 단추 · 가운데 칸: 두 벌 모두 AA 이상', () => {
  for (const t of [LIGHT, DARK]) {
    const at = t.dark ? 'dark' : 'light';
    for (const k of ['ink', 'ink2', 'print', 'printStrong']) assert.ok(contrast(t[k], t.paper) >= 4.5, `${at} ${k}`);
    assert.ok(contrast(t.ink, t.tile) >= 4.5, `${at} ink/tile`);
    assert.ok(contrast(t.ink, t.capsule) >= 4.5, `${at} ink/capsule`);
    assert.ok(contrast(t.onBtn, t.btn) >= 4.5, `${at} onBtn/btn`);
    assert.ok(contrast(t.onAdd, t.add) >= 4.5, `${at} onAdd/add`);
    assert.ok(contrast(t.onCore, t.core) >= 4.5, `${at} onCore/core`);
    assert.ok(contrast(t.printEdge, t.paper) >= 3, `${at} 컨트롤 가장자리(3:1)`);
  }
});

// ── moreContrast(iOS 대비 증가) ──────────────────────────────────────────────

test('moreContrast: 네 가지만 한 단계 진하게, 원래 토큰은 그대로(새 객체)', () => {
  for (const t of [LIGHT, DARK]) {
    const before = JSON.stringify(t);
    const E = moreContrast(t);
    assert.notEqual(E, t);
    assert.equal(JSON.stringify(t), before, '원래 토큰을 바꾸지 않는다');
    assert.equal(E.printRule, t.printMid);
    assert.equal(E.printEdge, t.ink2);
    assert.equal(E.print, t.printStrong);
    assert.equal(E.ink3, t.ink2);
    const changed = Object.keys(t).filter((k) => JSON.stringify(E[k]) !== JSON.stringify(t[k])).sort();
    assert.deepEqual(changed, ['ink3', 'print', 'printEdge', 'printRule']);
  }
});

test('대비 증가 판은 팔레트마다 한 번만 만든다 — 같은 팔레트에는 늘 같은 객체(usePalette의 WeakMap)', () => {
  const s = src('src/theme/usePalette.ts');
  assert.match(s, /const darker = new WeakMap<M, M>\(\);/);
  assert.match(s, /E = contrastPalette\(P\);\s*darker\.set\(P, E\);/);
  // 앱 팔레트 두 벌은 모듈이 한 번 만든 객체 — 다시 읽어도 같은 객체
  assert.equal(require('../src/theme/moods').PALETTE.light, PALETTE.light);
  assert.equal(require('../src/theme/moods').PALETTE.dark, PALETTE.dark);
  assert.notEqual(contrastPalette(PALETTE.light), PALETTE.light);
});

// ── §2.3 앱 팔레트(M) = 토큰 ────────────────────────────────────────────────

test('paletteOf: 앱 팔레트는 토큰 그대로 — 옛 이름(bg · sub · line · gold …)은 웨이브 4가 지웠다', () => {
  for (const t of [LIGHT, DARK]) {
    const M = paletteOf(t);
    for (const k of Object.keys(t)) assert.deepEqual(M[k], t[k], k);
    assert.deepEqual(Object.keys(M).sort(), Object.keys(t).sort());
    for (const k of ['bg', 'surface', 'card', 'sub', 'faint', 'line', 'tabBg', 'gold', 'goldInk', 'center', 'accent']) assert.equal(k in M, false, k);
  }
  assert.deepEqual({ ...PALETTE.light }, { ...paletteOf(LIGHT) });
  assert.deepEqual({ ...PALETTE.dark }, { ...paletteOf(DARK) });
});

test('대비 증가 판: 진해진 토큰(괘선 · 흐린 글씨), 나머지는 그대로', () => {
  for (const P of [PALETTE.light, PALETTE.dark]) {
    const E = contrastPalette(P);
    assert.equal(E.printRule, P.printMid);
    assert.equal(E.ink3, P.ink2);
    assert.equal(E.paper, P.paper);
    assert.equal(E.signal, P.signal);
  }
});

test('desk: 넓은 창의 단 바깥 — 밝게 tile, 어둡게 #0B0C0E', () => {
  assert.equal(desk(LIGHT), LIGHT.tile);
  assert.equal(desk(DARK), '#0B0C0E');
});

// ── §2.2 글자 역할 ───────────────────────────────────────────────────────────

test('ROLE: 표의 서체 파일 · 크기 · 줄 · 자간(늘 적는다) · 숫자 폭, fontWeight는 두지 않는다', () => {
  const table = {
    folio: [500, 13, 18, 0, true], label: [500, 13, 18, 0, true], section: [600, 14, 18, 0],
    title: [700, 26, 36, -0.52], headline: [700, 30, 40, -0.75], figure: [700, 26, 34, -0.52, true],
    figureField: [700, 22, 30, -0.44], figureHeader: [700, 22, 30, -0.44], unit: [500, 13, 18, 0],
    rowTitle: [500, 16, 23, 0], rowMeta: [400, 13, 18, 0, true], rowRight: [500, 13, 18, 0, true], meta: [500, 12, 18, 0, true],
    body: [500, 14, 24, 0], note: [500, 12, 18, 0], noteSheet: [400, 13, 18, 0], prompt: [600, 20, 30, -0.4],
    link: [700, 13, 18, 0], tab: [500, 11, 12, 0], tabOn: [700, 11, 12, 0], button: [700, 16, 24, 0], buttonSmall: [700, 13, 18, 0],
    quiet: [700, 13, 18, 0], quietFoot: [700, 14, 18, 0], fieldText: [600, 19, 26, -0.38], fieldPlaceholder: [400, 19, 26, -0.38],
    fieldTextSmall: [500, 17, 24, 0], segment: [500, 14, 18, 0], segmentOn: [600, 14, 18, 0],
    weekN: [600, 12, 14, 0, true], weekDay: [500, 13, 16, 0], weekDayToday: [700, 13, 16, 0],
    mapHead: [700, 10, 12, -0.4], mapCore: [700, 11, 13, -0.22],
    blockAction: [500, 16, 24, -0.16], blockHead: [700, 18, 24, -0.18], blockCore: [700, 20, 28, -0.4],
    clock: [700, 52, 60, -1.56, true], closeFigure: [700, 48, 56, -1.44, true], ledger: [500, 14, 18, 0], ledgerFigure: [500, 13, 18, 0, true],
    // 웨이브 4(R2)가 부품 상자 · 화면에서 옮겨 온 글자(예전 KIT_TYPE · STATS_TYPE · 첫 화면)
    word: [500, 14, 18, 0], wordOn: [700, 14, 18, 0], wordNum: [400, 12, 18, 0, true], scope: [500, 15, 18, 0], scopeOn: [700, 15, 18, 0],
    choice: [400, 16, 23, 0], choiceOn: [600, 16, 23, 0], chip: [500, 14, 18, 0, true], area: [500, 14, 18, -0.14], areaOn: [700, 14, 18, -0.14],
    swatchWord: [700, 14, 20, -0.28], swatch: [500, 14, 18, 0], swatchOn: [700, 14, 18, 0], memo: [500, 14, 20, 0], memoPlaceholder: [400, 14, 20, 0],
    fieldSmallPlaceholder: [400, 17, 24, 0], kindName: [600, 15, 18, 0], kindFigure: [700, 16, 20, -0.16, true], sub: [400, 15, 24, 0], example: [400, 13, 20, 0],
  };
  assert.deepEqual(Object.keys(ROLE).sort(), Object.keys(table).sort());
  for (const [name, [face, size, line, track, tab]] of Object.entries(table)) {
    const r = ROLE[name];
    assert.equal(r.fontFamily, PRETENDARD[face], `${name} face`);
    assert.equal(r.fontSize, size, `${name} size`);
    assert.equal(r.lineHeight, line, `${name} line`);
    assert.equal(r.letterSpacing, track, `${name} tracking`);
    assert.equal('fontWeight' in r, false, `${name}: 서체 파일을 직접 고른다(faceFor를 거치지 않게)`);
    if (tab) assert.deepEqual(r.fontVariant, NUM.fontVariant, `${name} tabular`);
    else assert.equal('fontVariant' in r, false, `${name} not tabular`);
  }
  assert.equal(ROLE.unit.marginLeft, 2, '숫자 뒤 단위는 2pt 띄운다');
});

test('NUM은 그대로, 옛 TYPE · RHYTHM은 웨이브 4가 지웠다', () => {
  assert.deepEqual(NUM, { fontVariant: ['tabular-nums'] });
  const type = require('../src/theme/type');
  assert.equal(type.TYPE, undefined);
  assert.equal(type.RHYTHM, undefined);
});

// ── §2.4 화면 모드 ───────────────────────────────────────────────────────────

test('화면 모드 키: 기기마다(mandarat:look:v1), 기본은 auto', () => {
  assert.equal(STORE_KEYS.look, 'mandarat:look:v1');
  assert.equal(DEFAULT_LOOK, 'auto');
  assert.deepEqual([...LOOKS], ['auto', 'light', 'dark']);
});

test('lookFromMood: 다크 → dark, 고른 밝은 종이(크림 · 화이트 · 파스텔) → light, 기본(연꽃) · 그 밖 → auto', () => {
  const table = { 다크: 'dark', 크림: 'light', 화이트: 'light', 파스텔: 'light', 연꽃: 'auto' };
  assert.deepEqual(Object.keys(table).sort(), [...MOOD_OPTS].sort(), '무드 다섯 가지 모두');
  for (const [mood, look] of Object.entries(table)) assert.equal(lookFromMood(mood), look, mood);
  for (const junk of [undefined, null, '', 'dark', 'Dark', 3, {}]) assert.equal(lookFromMood(junk), 'auto', String(junk));
});

test('parseLook: 세 값만, 그 밖(없음 · 깨짐)은 null', () => {
  for (const l of LOOKS) assert.equal(parseLook(l), l);
  for (const junk of [null, undefined, '', 'Auto', 'system', '다크', 1, '{"look":"dark"}']) assert.equal(parseLook(junk), null, String(junk));
});

test('isDark: dark는 늘, light는 결코, auto는 시스템을 따른다', () => {
  for (const scheme of ['light', 'dark', 'unspecified', null, undefined]) {
    assert.equal(isDark('dark', scheme), true);
    assert.equal(isDark('light', scheme), false);
    assert.equal(isDark('auto', scheme), scheme === 'dark');
  }
});

test('LookProvider: 저장된 모드를 먼저, 없으면 문서를 다 읽은 뒤 예전 무드에서 한 번 정해 적는다', () => {
  const s = src('src/theme/look.tsx');
  assert.match(s, /AsyncStorage\.getItem\(STORE_KEYS\.look\)/);
  assert.match(s, /AsyncStorage\.setItem\(STORE_KEYS\.look, look\)/);
  assert.match(s, /const look = lookFromMood\(mood\);\s*await writeLook\(look\);/);
  assert.match(s, /if \(!ready \|\| !live\) return;\s*return readLook\(getDoc\(\)\.settings\.mood\)\.then\(settle\);/);
  // 시스템 쪽: auto는 덮어쓰기를 푼다(웹 제외) · 루트 뷰 바탕 · 상태 막대
  assert.match(s, /Appearance\.setColorScheme\(look === 'auto' \? 'unspecified' : look\)/);
  assert.match(s, /SystemUI\.setBackgroundColorAsync\(paper\)/);
  assert.match(s, /<StatusBar style=\{dark \? 'light' : 'dark'\} \/>/);
  // 뒤로 가는 동안의 반대 모드 알림은 150ms 기다린다(§4.2)
  assert.match(s, /const SCHEME_SETTLE_MS = 150;/);
  assert.match(s, /AppState\.currentState === 'active'/);
  // 문서 · 백업 · 동기화에는 들어가지 않는다 — 문서 저장소는 화면 모드를 모른다
  for (const f of ['src/store/MandaratContext.tsx', 'src/lib/backup.ts', 'src/lib/syncProject.ts', 'src/lib/syncLocal.ts', 'src/data/defaults.ts']) {
    assert.doesNotMatch(src(f), /STORE_KEYS\.look|mandarat:look/, f);
  }
  // 다른 곳이 시스템 모드를 덮어쓰지 않는다(auto가 시스템을 따르려면)
  assert.doesNotMatch(src('src/navigation/Root.tsx'), /Appearance\.setColorScheme/);
});

test('예전 무드 · 포인트 컬러 · 칸 모서리는 문서에 그대로 남는다(옛 앱 · 다른 기기를 위해) — 그리는 데만 쓰지 않는다', () => {
  const d = migrate({ ...blankDoc(), settings: { ...blankDoc().settings, mood: '다크', accent: '#5068AB', cellShape: '각진' } });
  assert.equal(d.settings.mood, '다크');
  assert.equal(d.settings.accent, '#5068AB');
  assert.equal(d.settings.cellShape, '각진');
  const back = assemble(project(d), blankDoc());
  assert.equal(back.settings.mood, '다크');
  assert.equal(back.settings.accent, '#5068AB');
  assert.equal(back.settings.cellShape, '각진');
  assert.doesNotMatch(src('src/store/MandaratContext.tsx'), /withAccent|MOODS\[/);
});

// ── §2.6 종이 무늬 기본값 ─────────────────────────────────────────────────────

test('종이 무늬: 기본은 무지, 네 가지(무지 · 점 · 모눈 · 줄)를 고를 수 있다', () => {
  assert.equal(DEFAULT_PATTERN, 'blank');
  assert.deepEqual([...PAPER_CHOICES], ['blank', 'dots', 'grid', 'lines']);
  assert.deepEqual([...PAPER_OPTS].sort(), ['blank', 'dots', 'grid', 'lines']);
  assert.equal(storedPattern(blankDoc().settings.paper), 'blank');
  assert.equal(drawnPattern(undefined, true), 'blank');
  assert.equal(drawnPattern(undefined, false), 'blank');
});

test('종이 무늬: 고른 값은 migrate · 백업 · 동기화를 지나도 그대로(점 · 무지도 적는다)', () => {
  for (const p of PAPER_CHOICES) {
    const d = migrate({ ...blankDoc(), settings: { ...blankDoc().settings, paper: patternSetting(p) } });
    assert.equal(d.settings.paper, p, `${p} migrate`);
    const back = parseBackup(makeBackup(d));
    assert.equal(back.ok, true);
    assert.equal(back.doc.settings.paper, p, `${p} backup`);
    assert.equal(assemble(project(d), blankDoc()).settings.paper, p, `${p} sync`);
    assert.equal(storedPattern(d.settings.paper), p);
  }
});
