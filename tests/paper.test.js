// 종이 무늬(V4-C) — 무늬의 선 · 프로 잠금(proValue) · PaperDots 지키기 · 저장값 왕복 · 글씨 대비 · 설정 줄.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  PAPER_CHOICES, PATTERN_STROKE, drawnPattern, isProPattern, patternLines, patternSetting, storedPattern,
} = require('../src/lib/paper');
const { proValue } = require('../src/lib/pro');
const { migrate, blankDoc, PAPER_OPTS } = require('../src/data/defaults');
const { makeBackup, parseBackup } = require('../src/lib/backup');
const { MOODS, contrastEdition } = require('../src/theme/moods');
const { contrast } = require('../src/theme/palette');
const { RHYTHM } = require('../src/theme/type');

const ROOT = path.join(__dirname, '..');
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ── 무늬의 선 ─────────────────────────────────────────────

test('patternLines: 모눈은 가로·세로, 줄은 가로만, 점·무지는 선이 없다', () => {
  const g = RHYTHM.dot;
  // 한 칸(gap × gap) — PaperDots의 Pattern 한 장
  assert.deepEqual(patternLines('grid', g, g, g), [
    { x1: 0, y1: g / 2, x2: g, y2: g / 2 },
    { x1: g / 2, y1: 0, x2: g / 2, y2: g },
  ]);
  assert.deepEqual(patternLines('lines', g, g, g), [{ x1: 0, y1: g / 2, x2: g, y2: g / 2 }]);
  assert.deepEqual(patternLines('blank', g, g, g), []);
  assert.deepEqual(patternLines('dots', g, g, g), []);
});

test('patternLines: 넓은 종이에서도 gap마다 하나, 점이 서는 자리(gap/2 + k·gap)를 지난다', () => {
  const lines = patternLines('lines', 390, 100, 18);
  assert.equal(lines.length, 6); // 9, 27, 45, 63, 81, 99
  lines.forEach((l, k) => {
    assert.equal(l.y1, 9 + 18 * k);
    assert.equal(l.y1, l.y2);
    assert.equal(l.x1, 0);
    assert.equal(l.x2, 390);
  });
  const grid = patternLines('grid', 100, 40, 20);
  const h = grid.filter((l) => l.y1 === l.y2);
  const v = grid.filter((l) => l.x1 === l.x2);
  assert.deepEqual(h.map((l) => l.y1), [10, 30]);
  assert.deepEqual(v.map((l) => l.x1), [10, 30, 50, 70, 90]);
  for (const l of v) assert.deepEqual([l.y1, l.y2], [0, 40]);
});

test('patternLines: 크기나 간격이 0 · 음수 · NaN이면 빈 목록(끝없이 돌지 않는다)', () => {
  for (const [w, h, gap] of [[100, 100, 0], [100, 100, -4], [0, 100, 18], [100, 0, 18], [100, 100, NaN]]) {
    assert.deepEqual(patternLines('grid', w, h, gap), []);
  }
  assert.ok(PATTERN_STROKE > 0 && PATTERN_STROKE < 1, '머리카락 선');
});

// ── 프로 잠금 ─────────────────────────────────────────────

test('drawnPattern: 점은 늘 무료, 프로 무늬는 프로가 있을 때만 — 없으면 점으로 그린다', () => {
  assert.equal(drawnPattern(undefined, false), 'dots');
  assert.equal(drawnPattern(undefined, true), 'dots');
  for (const p of PAPER_OPTS) {
    assert.equal(drawnPattern(p, true), p);
    assert.equal(drawnPattern(p, false), 'dots', `${p}: 프로 없이`);
  }
  // 모르는 값(옛 앱 · 망가진 저장값)은 점
  assert.equal(drawnPattern('wavy', true), 'dots');
  assert.equal(drawnPattern(null, true), 'dots');
});

test('proValue: 저장값은 그대로 두고 그릴 값만 바꾼다', () => {
  const settings = Object.freeze({ paper: 'grid' });
  assert.equal(proValue(settings.paper, 'dots', isProPattern, false), 'dots');
  assert.equal(proValue(settings.paper, 'dots', isProPattern, true), 'grid');
  assert.equal(proValue('dots', 'dots', isProPattern, false), 'dots');
  assert.equal(settings.paper, 'grid');
  assert.equal(isProPattern('dots'), false);
  for (const p of PAPER_OPTS) assert.equal(isProPattern(p), true, p);
});

test('설정 차례와 저장값: 점이 맨 위, 점은 저장하지 않는다', () => {
  assert.deepEqual([...PAPER_CHOICES], ['dots', 'grid', 'lines', 'blank']);
  assert.equal(patternSetting('dots'), undefined);
  for (const p of PAPER_OPTS) assert.equal(patternSetting(p), p);
  for (const p of PAPER_CHOICES) assert.equal(storedPattern(patternSetting(p)), p);
});

// ── 저장값 왕복 ───────────────────────────────────────────

test('settings.paper: migrate · 백업 왕복, 모르는 값은 버리고 점은 남기지 않는다', () => {
  for (const p of PAPER_OPTS) {
    const d = migrate({ ...blankDoc(), settings: { ...blankDoc().settings, paper: p } });
    assert.equal(d.settings.paper, p);
    assert.deepEqual(migrate(d), d, '멱등');
    const back = parseBackup(makeBackup(d));
    assert.equal(back.ok, true);
    assert.equal(back.doc.settings.paper, p);
  }
  for (const bad of ['dots', 'wavy', 3, null]) {
    assert.equal('paper' in migrate({ settings: { paper: bad } }).settings, false, String(bad));
  }
  // 점으로 돌아가면(patternSetting('dots') → undefined) 저장된 글에서 사라진다
  const d = migrate({ ...blankDoc(), settings: { ...blankDoc().settings, paper: patternSetting('dots') } });
  assert.equal('paper' in d.settings, false);
  assert.equal(JSON.parse(makeBackup(d)).doc.settings.paper, undefined);
});

// ── PaperDots ─────────────────────────────────────────────

test('PaperDots: release.test.js의 지키기 그대로 — 대비 증가에서 진해지는 같은 색', () => {
  const dots = src('src/components/PaperDots.tsx');
  assert.match(dots, /useIncreaseContrast\(\)/);
  assert.match(dots, /more \? 0\.2 : 0\.11/);
  assert.match(dots, /more \? 0\.15 : 0\.08/);
  // 점은 그대로(반지름 0.9, gap/2) — 무료 기본값의 모양이 바뀌지 않는다
  assert.match(dots, /<Circle cx=\{gap \/ 2\} cy=\{gap \/ 2\} r=\{0\.9\} fill=\{color\} \/>/);
  // 모눈 · 줄은 점과 같은 색조(stroke={color}), 알파만 낮다 — 목록 괘선보다 옅게(R-6 D-4)
  assert.match(dots, /more \? 0\.12 : 0\.065/);
  assert.match(dots, /more \? 0\.1 : 0\.05/);
  assert.match(dots, /const a = pattern === 'dots'/);
  assert.match(dots, /stroke=\{color\} strokeWidth=\{PATTERN_STROKE\}/);
  assert.match(dots, /pointerEvents="none"/);
  assert.match(dots, /importantForAccessibility="no-hide-descendants"/);
});

test('PaperDots: 얇은 껍데기가 무늬만 읽고, 안의 종이는 memo — 무늬가 바뀔 때만 다시 그린다', () => {
  const dots = src('src/components/PaperDots.tsx');
  assert.match(dots, /export function PaperDots\(props: Props\)/);
  assert.match(dots, /useDoc\(\)\.doc\.settings\.paper/);
  assert.match(dots, /const \{ owned \} = usePro\(\)/);
  assert.match(dots, /pattern=\{drawnPattern\(stored, owned\)\}/);
  assert.match(dots, /const PaperSheet = memo\(function PaperSheet/);
  assert.doesNotMatch(dots, /useMandarat\(\)/);
  // 무지는 SVG를 아예 만들지 않는다
  assert.match(dots, /if \(pattern === 'blank'\) return null;/);
});

// ── 글씨 대비(모든 무드 · 다크 · 대비 증가) ─────────────────

/** rgba(r,g,b,a)를 바탕 hex 위에 겹친 색 */
function over(rgba, bg) {
  const [r, g, b, a] = rgba.match(/[\d.]+/g).map(Number);
  const base = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
  const c = [r, g, b].map((x, i) => Math.round(x * a + base[i] * (1 - a)));
  return `#${c.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * 글씨가 얹히는 종이 — 머리카락 선은 gap마다 하나라서 눈에는 바탕이 아주 조금 어두워진 것으로 읽힌다.
 * 선이 덮는 넓이(줄: 굵기/gap, 모눈: 가로+세로)만큼 선 색을 섞은 바탕을 '읽히는 종이'로 본다.
 */
function seenPaper(rgba, bg, kind, gap = RHYTHM.dot) {
  const f = PATTERN_STROKE / gap;
  const cover = kind === 'grid' ? 2 * f - f * f : f;
  const [r, g, b, a] = rgba.match(/[\d.]+/g).map(Number);
  return over(`rgba(${r},${g},${b},${a * cover})`, bg);
}

test('무늬 위에서도 글씨 대비가 4.5:1 이상(모든 무드 · 다크 · 대비 증가), 선 자체는 조용하다', () => {
  // PaperDots의 알파 — 점과 모눈 · 줄이 다르다(R-6 D-4)
  const ink = (dark, more, kind = 'dots') => {
    const a = kind === 'dots' ? (dark ? (more ? 0.15 : 0.08) : (more ? 0.2 : 0.11)) : (dark ? (more ? 0.1 : 0.05) : (more ? 0.12 : 0.065));
    return dark ? `rgba(255,255,255,${a})` : `rgba(60,45,20,${a})`;
  };
  for (const [name, P] of Object.entries(MOODS)) {
    for (const more of [false, true]) {
      const pal = more ? contrastEdition(P) : P;
      for (const kind of ['grid', 'lines']) {
        const paper = seenPaper(ink(P.dark, more, kind), P.bg, kind);
        for (const k of ['ink', 'sub', 'goldInk']) {
          const plain = contrast(pal[k], P.bg);
          const c = contrast(pal[k], paper);
          const at = `${name}${more ? ' 대비 증가' : ''} ${kind} ${k}`;
          if (plain >= 4.5) assert.ok(c >= 4.5, `${at}: ${c.toFixed(2)}`);
          assert.ok(c / plain > 0.97, `${at}: 대비가 3% 넘게 준다 ${plain.toFixed(2)} → ${c.toFixed(2)}`);
        }
      }
      // 선 한 가닥은 바탕과 거의 같은 색 — 점보다 옅고(밝은 종이 0.065, 다크 0.05), 목록 괘선(M.line)보다도 옅다
      const line = over(ink(P.dark, more, 'lines'), P.bg);
      if (!more) assert.ok(contrast(line, P.bg) < 1.15, `${name}: 선이 너무 진하다 ${contrast(line, P.bg).toFixed(2)}`);
      assert.ok(contrast(line, P.bg) < contrast(over(ink(P.dark, more), P.bg), P.bg), `${name}: 선이 점보다 옅다`);
      if (!more && /^rgba/.test(P.line)) assert.ok(contrast(line, P.bg) < contrast(over(P.line, P.bg), P.bg), `${name}: 무늬 선이 목록 괘선보다 옅다`);
    }
  }
});

// ── 설정 줄 ───────────────────────────────────────────────

test('PaperRows: 종이 무늬 머리 · 네 줄 · 잠긴 줄은 프로 시트로 · 남겨 둔 무늬의 한 줄', () => {
  const rows = src('src/screens/settings/PaperRows.tsx');
  assert.match(rows, /export function PaperRows\(\{ M \}: \{ M: M \}\)/);
  assert.match(rows, /<SubHead M=\{M\} label=\{m\.paper\.head\} \/>/);
  assert.match(rows, /PAPER_CHOICES\.map/);
  assert.match(rows, /useLocked\('paper'\)/);
  assert.match(rows, /proLocked && isProPattern\(p\)/, '점은 잠그지 않는다');
  assert.match(rows, /if \(locked\) \{ tap\(\); openPro\('paper'\); return; \}/, '잠긴 줄은 저장값을 바꾸지 않고 시트만 연다');
  assert.match(rows, /setSetting\('paper', patternSetting\(p\)\)/);
  assert.match(rows, /testID=\{TID\.setPaper\(p\)\}/);
  assert.match(rows, /accessibilityRole="radio"/);
  assert.match(rows, /accessibilityState=\{\{ checked: on, selected: on \}\}/);
  assert.match(rows, /aria-checked=\{on\}/, '웹 읽기 도구도 고른 줄을 안다');
  assert.match(rows, /const kept = on && locked;/);
  assert.match(rows, /m\.paper\.keptNote/);
  assert.doesNotMatch(rows, /useMandarat\(\)/);
  // 디자인 지키기 — 둥근 카드 · 그림자 · 그라데이션 · 알약
  assert.doesNotMatch(rows, /shadow|LinearGradient|borderRadius: (1[4-9]|[2-9]\d)/);
  assert.doesNotMatch(rows, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, '이모지');
});

test('paper 이름공간: ko · ja · en이 같은 키, 글씨에 값·느낌표가 없다', () => {
  const ko = require('../src/i18n/ko/paper').default;
  const ja = require('../src/i18n/ja/paper').default;
  const en = require('../src/i18n/en/paper').default;
  assert.deepEqual(Object.keys(ja), Object.keys(ko));
  assert.deepEqual(Object.keys(en), Object.keys(ko));
  assert.equal(ko.head, '종이 무늬');
  assert.deepEqual([ko.dots, ko.grid, ko.lines, ko.blank], ['점 (기본)', '모눈', '줄', '무지']);
  assert.equal(ko.keptNote, '프로를 열면 이 무늬로 그려져요');
  for (const p of PAPER_CHOICES) for (const cat of [ko, ja, en]) assert.equal(typeof cat[p], 'string');
  assert.equal(ko.sayLocked({ name: ko.grid }), '종이 무늬 모눈, 프로');
});
