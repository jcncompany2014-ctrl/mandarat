// 종이 무늬(V4-C, 디자인 A §2.6) — 무늬의 선 · 프로 잠금(proValue) · PaperDots 지키기 · 저장값 왕복 · 글씨 대비 · 설정 줄.
// 기본은 무지, 고른 것은 무지 · 점까지 그대로 적는다. 모눈 · 줄만 프로(1.0은 판매를 꺼서 모두 열림).
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  DEFAULT_PATTERN, DOT_R, PAPER_CHOICES, PAPER_MODULE, PATTERN_STROKE, drawnPattern, isProPattern, patternInk, patternLines,
  patternOrigin, patternSetting, storedPattern,
} = require('../src/lib/paper');
const { proValue } = require('../src/lib/pro');
const { migrate, blankDoc, PAPER_OPTS } = require('../src/data/defaults');
const { makeBackup, parseBackup } = require('../src/lib/backup');
const { PALETTE, contrastPalette } = require('../src/theme/moods');
const { LIGHT, DARK, GEO } = require('../src/theme/tokens');
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

test('drawnPattern: 무지 · 점은 늘 무료, 모눈 · 줄은 프로가 있을 때만 — 없으면 무지(기본)로 그린다', () => {
  assert.equal(DEFAULT_PATTERN, 'blank');
  assert.equal(drawnPattern(undefined, false), 'blank');
  assert.equal(drawnPattern(undefined, true), 'blank');
  for (const p of PAPER_OPTS) {
    assert.equal(drawnPattern(p, true), p);
    assert.equal(drawnPattern(p, false), isProPattern(p) ? 'blank' : p, `${p}: 프로 없이`);
  }
  // 모르는 값(옛 앱 · 망가진 저장값)은 무지
  assert.equal(drawnPattern('wavy', true), 'blank');
  assert.equal(drawnPattern(null, true), 'blank');
});

test('proValue: 저장값은 그대로 두고 그릴 값만 바꾼다', () => {
  const settings = Object.freeze({ paper: 'grid' });
  assert.equal(proValue(settings.paper, 'blank', isProPattern, false), 'blank');
  assert.equal(proValue(settings.paper, 'blank', isProPattern, true), 'grid');
  assert.equal(proValue('dots', 'blank', isProPattern, false), 'dots');
  assert.equal(settings.paper, 'grid');
  assert.deepEqual(PAPER_OPTS.filter(isProPattern), ['grid', 'lines']);
});

test('설정 차례와 저장값: 무지 · 점 · 모눈 · 줄, 고른 것은 무지 · 점까지 그대로 적는다', () => {
  assert.deepEqual([...PAPER_CHOICES], ['blank', 'dots', 'grid', 'lines']);
  for (const p of PAPER_CHOICES) {
    assert.equal(patternSetting(p), p);
    assert.equal(storedPattern(patternSetting(p)), p);
  }
  assert.equal(storedPattern(undefined), 'blank');
});

// ── 저장값 왕복 ───────────────────────────────────────────

test('settings.paper: migrate · 백업 왕복(무지 · 점도), 모르는 값은 버리고 없으면 무지로 읽는다', () => {
  for (const p of PAPER_OPTS) {
    const d = migrate({ ...blankDoc(), settings: { ...blankDoc().settings, paper: p } });
    assert.equal(d.settings.paper, p);
    assert.deepEqual(migrate(d), d, '멱등');
    const back = parseBackup(makeBackup(d));
    assert.equal(back.ok, true);
    assert.equal(back.doc.settings.paper, p);
  }
  for (const bad of ['wavy', 3, null]) {
    assert.equal('paper' in migrate({ settings: { paper: bad } }).settings, false, String(bad));
  }
  // 새 문서에는 필드가 없다 — 무지로 그린다
  assert.equal('paper' in blankDoc().settings, false);
  assert.equal(storedPattern(blankDoc().settings.paper), 'blank');
});

// ── PaperDots ─────────────────────────────────────────────

test('PaperDots: 토큰 색 · 24pt 한 칸 · 대비 증가에서 한 단계 진하게', () => {
  const dots = src('src/components/PaperDots.tsx');
  assert.match(dots, /useIncreaseContrast\(\)/);
  // 기본 판의 토큰에서 고른다(대비 증가 판의 printEdge는 ink2라 점이 너무 진하다)
  assert.match(dots, /const color = patternInk\(pattern, M\.dark \? DARK : LIGHT, more\);/);
  assert.match(dots, /<Circle cx=\{gap \/ 2\} cy=\{gap \/ 2\} r=\{DOT_R\} fill=\{color\} \/>/);
  assert.match(dots, /stroke=\{color\} strokeWidth=\{PATTERN_STROKE\}/);
  assert.match(dots, /gap = PAPER_MODULE, offsetX = 0, offsetY = 0/);
  assert.match(dots, /x=\{patternOrigin\(offsetX, gap\)\} y=\{patternOrigin\(offsetY, gap\)\}/);
  assert.match(dots, /pointerEvents="none"/);
  assert.match(dots, /importantForAccessibility="no-hide-descendants"/);
  assert.doesNotMatch(dots, /rgba\(/, '색은 모두 토큰');
  // 수치(§2.6): 한 칸 24 = 화면 여백, 점 반지름 0.8, 선 0.5pt
  assert.equal(PAPER_MODULE, 24);
  assert.equal(PAPER_MODULE, GEO.gutter);
  assert.equal(DOT_R, 0.8);
  assert.equal(PATTERN_STROKE, 0.5);
});

test('patternInk: 점 printMid · 선 printRule, 대비 증가에서는 점 printEdge · 선 printMid', () => {
  for (const t of [LIGHT, DARK]) {
    assert.equal(patternInk('dots', t, false), t.printMid);
    assert.equal(patternInk('dots', t, true), t.printEdge);
    for (const k of ['grid', 'lines']) {
      assert.equal(patternInk(k, t, false), t.printRule);
      assert.equal(patternInk(k, t, true), t.printMid);
    }
  }
});

test('patternOrigin: 세로 한 줄이 x = at(여백 선)에, 가로 한 줄이 y = at(머리 아래)에 선다', () => {
  const g = PAPER_MODULE;
  for (const at of [0, 24, 47, 59, 100, -10]) {
    const o = patternOrigin(at, g);
    assert.ok(o >= 0 && o < g, `${at}: ${o}`);
    // 무늬 한 장 안의 점 · 선은 gap/2에 선다 → o + gap/2 ≡ at (mod gap)
    assert.equal((((o + g / 2 - at) % g) + g) % g, 0, `${at}`);
  }
  // 기본(0): 세로 줄이 24 · 48 … — 화면 여백(24) 위
  assert.equal((patternOrigin(0, g) + g / 2) % g, 0);
  // 머리 72 = 3칸 — insets.top을 넘기면 가로 줄이 머리 바닥(insets.top + 72)에도 선다
  const top = 47;
  assert.equal((((patternOrigin(top, g) + g / 2 - (top + GEO.header)) % g) + g) % g, 0);
  assert.equal(patternOrigin(10, 0), 0);
  assert.equal(patternOrigin(NaN, 24), 0);
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

// ── 글씨 대비(밝게 · 어둡게 · 대비 증가) ─────────────────

/** 두 hex를 a만큼 섞는다(바탕 위에 선이 덮는 넓이만큼) */
function blend(fg, bg, a) {
  const c = [1, 3, 5].map((i) => Math.round(parseInt(fg.slice(i, i + 2), 16) * a + parseInt(bg.slice(i, i + 2), 16) * (1 - a)));
  return `#${c.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * 글씨가 얹히는 종이 — 머리카락 선은 gap마다 하나라서 눈에는 바탕이 아주 조금 어두워진(밝아진) 것으로 읽힌다.
 * 선이 덮는 넓이(줄: 굵기/gap, 모눈: 가로+세로)만큼 선 색을 섞은 바탕을 '읽히는 종이'로 본다.
 */
function seenPaper(line, bg, kind, gap = PAPER_MODULE) {
  const f = PATTERN_STROKE / gap;
  const cover = kind === 'grid' ? 2 * f - f * f : f;
  return blend(line, bg, cover);
}

test('무늬 위에서도 글씨 대비가 그대로(밝게 · 어둡게 · 대비 증가), 선 자체는 조용하다', () => {
  for (const [name, base] of [['밝게', PALETTE.light], ['어둡게', PALETTE.dark]]) {
    for (const more of [false, true]) {
      const pal = more ? contrastPalette(base) : base;
      const t = base.dark ? DARK : LIGHT;
      for (const kind of ['grid', 'lines']) {
        const paper = seenPaper(patternInk(kind, t, more), base.paper, kind);
        for (const k of ['ink', 'ink2', 'print']) {
          const plain = contrast(pal[k], base.paper);
          const c = contrast(pal[k], paper);
          const at = `${name}${more ? ' 대비 증가' : ''} ${kind} ${k}`;
          if (plain >= 4.5) assert.ok(c >= 4.5, `${at}: ${c.toFixed(2)}`);
          assert.ok(c / plain > 0.98, `${at}: 대비가 2% 넘게 준다 ${plain.toFixed(2)} → ${c.toFixed(2)}`);
        }
      }
      // 선 한 가닥은 바탕과 거의 같은 색(목록 괘선 printRule과 같거나 옅다), 점보다 옅다
      const line = patternInk('lines', t, more);
      const dot = patternInk('dots', t, more);
      if (!more) {
        assert.equal(line, t.printRule, `${name}: 무늬 선은 목록 괘선과 같은 색`);
        assert.ok(contrast(line, base.paper) < 1.3, `${name}: 선이 너무 진하다 ${contrast(line, base.paper).toFixed(2)}`);
      }
      assert.ok(contrast(line, base.paper) < contrast(dot, base.paper), `${name}${more ? ' 대비 증가' : ''}: 선이 점보다 옅다`);
      // 점은 여전히 표시일 뿐 — 글씨(print) 보다 옅다
      assert.ok(contrast(dot, base.paper) < contrast(t.print, base.paper), `${name}: 점이 인쇄 글씨보다 옅다`);
    }
  }
});

// ── 설정 줄 ───────────────────────────────────────────────

test('PaperRows: 종이 무늬 이름 · 견본 넷 · 잠긴 견본은 프로 시트로 · 남겨 둔 무늬의 한 줄', () => {
  const rows = src('src/screens/settings/PaperRows.tsx');
  assert.match(rows, /export function PaperRows\(\{ M \}: \{ M: M \}\)/);
  assert.match(rows, /<SwatchHead M=\{M\} label=\{m\.paper\.head\} \/>/);
  // 견본(build-plan §2.6: 같은 그림) — 부품 상자의 Swatch가 무늬를 그리고 라디오 + 선택됨으로 읽힌다
  assert.match(rows, /<Swatch\s+M=\{M\}\s+kind=\{\{ pattern: p \}\}/);
  assert.match(src('src/components/kit/Swatch.tsx'), /accessibilityRole="radio"\s+accessibilityState=\{\{ checked: on \}\}/);
  assert.match(rows, /PAPER_CHOICES\.map/);
  assert.match(rows, /useLocked\('paper'\)/);
  assert.match(rows, /proLocked && isProPattern\(p\)/, '점은 잠그지 않는다');
  assert.match(rows, /if \(locked\) \{ tap\(\); openPro\('paper'\); return; \}/, '잠긴 줄은 저장값을 바꾸지 않고 시트만 연다');
  assert.match(rows, /setSetting\('paper', patternSetting\(p\)\)/);
  assert.match(rows, /testID=\{TID\.setPaper\(p\)\} aria-checked=\{on\}/, '웹 읽기 도구 · 스모크도 고른 견본을 안다');
  assert.match(rows, /const kept = on && locked;/);
  assert.match(rows, /m\.paper\.keptNote/);
  // 남겨 둔 프로 무늬: 안내 한 줄을 누르면 프로 시트
  assert.match(rows, /\{keptLocked && \([\s\S]{0,200}label=\{m\.paper\.keptNote\}[\s\S]{0,80}openPro\('paper'\)/);
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
  // 기본은 무지(build-plan §2.6) — 견본 이름에는 '기본'을 적지 않는다
  assert.deepEqual([ko.dots, ko.grid, ko.lines, ko.blank], ['점', '모눈', '줄', '무지']);
  for (const cat of [ko, ja, en]) for (const p of PAPER_CHOICES) assert.doesNotMatch(cat[p], /기본|標準|default/i, p);
  assert.equal(ko.keptNote, '프로를 열면 이 무늬로 그려져요');
  for (const p of PAPER_CHOICES) for (const cat of [ko, ja, en]) assert.equal(typeof cat[p], 'string');
  assert.equal(ko.sayLocked({ name: ko.grid }), '종이 무늬 모눈, 프로');
});
