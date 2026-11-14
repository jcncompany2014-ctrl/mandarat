// S5 · 처음 화면(docs/design/build-plan.md §1 onboarding · 목업 docs/design/mockups/a/onboarding.png).
// 질문 하나 · 목표 칸 하나 · 가운데 블록의 작고 차분한 미리보기(옅은 영역 색 + 영역 색 글자, 가운데 먹 위의 목표) · 주 단추 하나 · 템플릿 글 링크.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fitBox, longestWord } = require('../src/lib/text');
const { PRETENDARD_GLYPHS } = require('../src/lib/labelFit');
const { MAP_LABEL, keepWords, mapLabel } = require('../src/components/chart/geometry');
const { seedTitles } = require('../src/data/defaults');
const { templates } = require('../src/data/templates');
const { GEO } = require('../src/theme/tokens');
const { msg } = require('../src/i18n');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const onb = src('src/screens/Onboarding.tsx');
const num = (re) => {
  const m = onb.match(re);
  assert.ok(m, `Onboarding.tsx: ${re}`);
  return m.slice(1).map(Number);
};

test('S5: ChartSketch는 없어졌고, 처음 화면은 부품 상자(Field · TextLink) · 단추 · 마크로 그린다', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'src/components/ChartSketch.tsx')), false);
  assert.doesNotMatch(onb, /ChartSketch/);
  assert.match(onb, /import \{ Field, Row, TextLink \} from '\.\.\/components\/kit';/);
  assert.match(onb, /import \{ Button, RuledNotice, useKeyboardHeight \} from '\.\.\/components\/common';/);
  assert.match(onb, /<Mark size=\{BRAND\.mark\} \/>/);
  assert.match(onb, /<Field\s+M=\{M\}\s+testID=\{TID\.onbGoal\}/);
  // 주 단추 하나 — 늘 primary(비어 있으면 '목표는 나중에' 글), 템플릿은 글 링크
  assert.match(onb, /<Button\s+testID=\{typed \|\| picked \? TID\.onbStart : TID\.onbNext\}/);
  assert.doesNotMatch(onb, /variant="secondary"|tone="quiet"|tone: 'quiet'/);
  assert.match(onb, /<TextLink\s+M=\{M\}\s+testID=\{TID\.onbTemplate\(picked \? picked\.id : 'pick'\)\}/);
  // 색은 토큰 이름으로만
  assert.doesNotMatch(onb, /#[0-9A-Fa-f]{3,8}\b/);
  assert.doesNotMatch(onb, /\bTYPE\.|M\.sub\b|M\.line\b|M\.bg\b/);
});

test('S5: 미리보기 — 진한 영역 색 칸 없이 옅은 색(tint) + 영역 색 글자(dyeText), 가운데는 core 위 onCore, 누를 수 없다', () => {
  const body = onb.slice(onb.indexOf('const GoalPreview = memo('), onb.indexOf('function TileText('));
  assert.match(body, /backgroundColor: M\.tint\[ti\]/);
  assert.match(body, /color=\{M\.dyeText\[ti\]\}/);
  assert.match(body, /backgroundColor: M\.core/);
  assert.match(body, /M\.onCore/);
  assert.doesNotMatch(onb, /M\.dye\[/, '짜친 진한 블록 없음 — 진한 영역 색은 표의 16칸에만');
  assert.doesNotMatch(body, /Pressable|onPress/, '미리보기 칸은 누를 수 없다');
  assert.match(body, /accessible accessibilityRole="image" accessibilityLabel=\{label\}/);
  // 자리: 영역 번호 → 3×3 자리는 표와 같이(CHART_POS), 64 낱칸 · 사이 6 · 모서리 12
  assert.match(body, /const ti = CHART_POS\.indexOf\(slot\)/);
  const [tile, short, gap] = num(/const PREVIEW = \{ tile: (\d+), tileShort: (\d+), gap: (\d+), radius: GEO\.rField, pad: \d+, note: \d+ \}/);
  assert.deepEqual([tile, gap, GEO.rField], [64, 6, 12]);
  assert.ok(short < tile);
  // 화면 가운데
  assert.match(onb, /<View style=\{\{ marginTop: R\.preview, alignItems: 'center' \}\}>\s*<GoalPreview/);
});

test('S5: 모든 TID · 템플릿 길 · iCloud 가져오기가 그대로', () => {
  for (const id of ['onbGoal', 'onbSample', 'onbStart', 'onbNext', 'onbICloud']) assert.match(onb, new RegExp(`TID\\.${id}\\b`), id);
  // 예시 첫 낱말만 onbSample — 누르면 목표 칸만 채운다
  assert.match(onb, /testID=\{i === 0 \? TID\.onbSample : undefined\}\s*onPress=\{\(\) => \{ tap\(\); setGoal\(s\); \}\}/);
  // 시작: 템플릿을 골랐으면 그 표로, 아니면 적은 목표로
  assert.match(onb, /if \(picked\) applyTemplate\(typed \|\| picked\.centerGoal, templateThemes\(picked\)\);\s*else completeOnboarding\(goal\);/);
  assert.match(onb, /<TemplateSheet M=\{M\} onClose=\{\(\) => setSheet\(false\)\} onPick=\{pickTemplate\} returnFocusRef=\{templateBtn\} \/>/);
  assert.match(onb, /picked \? o\.templateAreas\(\{ name: picked\.name \}\) : o\.defaultCaption/);
  assert.match(onb, /onPress=\{unpick\}/);
  // iCloud: iOS에서만 살펴보고, 질문 위 한 줄
  assert.ok(onb.indexOf('testID={TID.onbICloud}') < onb.indexOf('{o.heading}'), 'iCloud 줄은 질문 위');
  assert.match(onb, /accessibilityState=\{\{ busy: importing === 'busy' \}\}/);
});

/** Onboarding.tsx tileLabel과 같은 맞추기 — 수는 소스에서 읽는다 */
function tileLabel(text, kind, tile, l, spec, pad, lineRatio) {
  const t = text.trim();
  const inner = tile - 2 * pad;
  const kept = keepWords(t);
  const f = fitBox(kept, inner, inner, spec.sizes, spec.lines, lineRatio, PRETENDARD_GLYPHS, l);
  if (longestWord(kept, f.fs, PRETENDARD_GLYPHS, l) <= inner) return { text: kept, ...f, inner, split: false };
  const k = spec.sizes[0] / MAP_LABEL[kind].sizes[0];
  const fit = mapLabel(t, kind, inner / k + 2 * MAP_LABEL.pad, inner / k, l);
  return { text: fit.text, fs: fit.fs * k, lh: Math.round(fit.lh * k), lines: fit.lines, inner, split: true, cut: fit.cut };
}

test('S5: 미리보기 칸 글 — 기본 영역(ko · ja · en)과 모든 템플릿 영역이 64 · 56 칸에 어절을 끊지 않고 든다', () => {
  const [pad] = num(/const PREVIEW = \{ tile: \d+, tileShort: \d+, gap: \d+, radius: GEO\.rField, pad: (\d+), note: \d+ \}/);
  assert.match(onb, /head: \{ sizes: \[13, 12, 11, 10\], lines: 3, weight: 600 \}/);
  assert.match(onb, /core: \{ sizes: \[13, 12, 11, 10, 9\], lines: 4, weight: 700 \}/);
  assert.match(onb, /lineRatio: 17 \/ 13,/);
  const spec = { sizes: [13, 12, 11, 10], lines: 3 };
  const lineRatio = 17 / 13;
  for (const l of ['ko', 'ja', 'en']) {
    const names = [...seedTitles(l), ...templates(l).flatMap((tp) => tp.areas.map((a) => a.title))];
    for (const tile of [64, 56]) {
      for (const n of names) {
        const lab = tileLabel(n, 'head', tile, l, spec, pad, lineRatio);
        const at = `${l} ${tile}pt '${n}'`;
        assert.ok(lab.lines <= 3 && lab.lh * lab.lines <= tile, `${at}: ${lab.lines}줄 × ${lab.lh}`);
        assert.ok(lab.fs >= 10, `${at}: ${lab.fs}pt`);
        if (!lab.split) assert.ok(longestWord(lab.text, lab.fs, PRETENDARD_GLYPHS, l) <= lab.inner, `${at}: 어절이 칸보다 넓다`);
        else assert.equal(lab.cut, false, `${at}: 말줄임`);
      }
    }
  }
  // 목업 그대로 — 64칸에서 '자기계발' · '마음챙김'은 한 줄 13pt, 긴 영문 낱말은 자연스러운 자리에서 붙임표로
  for (const n of ['자기계발', '마음챙김', '건강']) {
    const lab = tileLabel(n, 'head', 64, 'ko', spec, pad, lineRatio);
    assert.deepEqual([lab.text, lab.fs, lab.split], [n, 13, false], n);
  }
  const rel = tileLabel('Relationships', 'head', 64, 'en', spec, pad, lineRatio);
  assert.equal(rel.split, true);
  assert.match(rel.text, /^Relation-\nships$/);
  // 목표: 한 음절 낱말은 옆에 붙는다('단단한 / 한 해'), 긴 목표는 4줄까지
  const core = { sizes: [13, 12, 11, 10, 9], lines: 4 };
  const goal = tileLabel('단단한 한 해', 'core', 64, 'ko', core, pad, lineRatio);
  assert.equal(goal.text, '단단한 한 해');
  assert.equal(goal.fs, 13);
  for (const l of ['ko', 'ja', 'en']) {
    const o = msg(l).onboarding;
    for (const g of [o.ex1, o.ex2, o.ex3, o.goalLabel, o.goalPlaceholder.replace(o.exampleMark, '').trim()]) {
      const lab = tileLabel(g, 'core', 64, l, core, pad, lineRatio);
      assert.ok(lab.lines <= 4 && lab.lh * lab.lines <= 64, `${l} '${g}'`);
    }
  }
});

test('S5: 375 × 667 — 키보드가 목표 칸과 주 단추를 가리지 않는다', () => {
  // 단추 막대는 스크롤 밖(KeyboardAvoidingView 안, 키보드 위), 키보드가 올라와 칸이 가려지면 칸이 보이게 스크롤
  assert.match(onb, /<KeyboardAvoidingView\s+behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/);
  assert.ok(onb.indexOf('</ScrollView>') < onb.indexOf('<Button'), '단추는 스크롤 밖');
  assert.ok(onb.indexOf('<Button') < onb.indexOf('</KeyboardAvoidingView>'), '단추는 키보드 위로 밀린다');
  assert.match(onb, /const need = y \+ h \+ KEYBOARD_ROOM - viewH;\s*if \(need > scrollTop\.current\) scroller\.current\?\.scrollTo\(\{ y: Math\.min\(need, y\)/);
  assert.match(onb, /\}, \[focused, viewH\]\);/);
  assert.match(onb, /onLayout=\{\(e\) => setViewH\(e\.nativeEvent\.layout\.height\)\}/);
  assert.match(onb, /paddingBottom: keyboard > 0 \? BAR\.onKeyboard : Math\.max\(short \? BAR\.bottomShort : BAR\.bottom, insets\.bottom\)/);

  const [top, , question, sub, field, preview] = num(/short: \{ top: (\d+), offer: (\d+), question: (\d+), sub: (\d+), field: (\d+), preview: (\d+) \}/);
  const [barTop, barGap, , bottomShort, onKeyboard] = num(/const BAR = \{ top: (\d+), gap: (\d+), bottom: (\d+), bottomShort: (\d+), onKeyboard: (\d+) \}/);
  const [labelGap, exGap] = num(/const FIELD_BLOCK = \{ label: (\d+), examples: (\d+), hit: \d+, markGap: \d+ \}/);
  const [room] = num(/const KEYBOARD_ROOM = (\d+);/);
  const [, tileShort, gap] = num(/const PREVIEW = \{ tile: (\d+), tileShort: (\d+), gap: (\d+)/);
  assert.match(onb, /const SHORT_H = 700;/);
  const button = 52;
  const link = 18; // TextLink 18 높이(위아래 13씩 더 눌린다)
  const fieldBlock = 18 + labelGap + 56 + exGap + 20; // 이름표 13/18 · 칸 56 · 예시 줄 13/20
  const H = 667;
  const insetTop = 20;
  // 키보드(한국어 두벌식 + 추천 줄 약 260, 일본어 후보 줄까지 넉넉히 300)
  for (const kb of [260, 300]) {
    const viewport = H - insetTop - kb;
    const bar = barTop + button + barGap + link + onKeyboard;
    const scrollWin = viewport - bar;
    assert.ok(bar < viewport, `키보드 ${kb}: 단추 막대가 보인다`);
    assert.ok(fieldBlock + room <= scrollWin, `키보드 ${kb}: 목표 칸 묶음(${fieldBlock}) 전체가 스크롤 창(${scrollWin})에 든다`);
  }
  // 키보드가 없을 때 한국어 첫 화면은 스크롤 없이 한 화면(질문 2줄 · 설명 1줄 · 알림 1줄)
  const content = top + 24 + question + 72 + sub + 24 + field + fieldBlock + preview + (tileShort * 3 + gap * 2) + 12 + 18 + 8;
  const bar = barTop + button + barGap + link + bottomShort;
  assert.ok(content + bar <= H - insetTop, `${content} + ${bar} > ${H - insetTop}`);
});

test('S5: 새 말(브랜드 · 설명 · 알림)은 세 언어 모두, 한국어는 목업 그대로', () => {
  const ko = msg('ko').onboarding;
  assert.equal(ko.brand, '만다라트');
  assert.equal(ko.heading, '올해 꼭 이루고 싶은\n목표 하나를 적어 주세요');
  assert.equal(ko.headingNote, '목표를 가운데에 두고, 여덟 가지를 둘러 적어요.');
  assert.equal(ko.goalLabel, '핵심 목표');
  assert.equal(ko.defaultCaption, '여덟 영역은 기본으로 채워 둬요. 나중에 바꿀 수 있어요.');
  assert.equal(ko.fromTemplate, '템플릿으로 시작하기');
  assert.equal(ko.start, '시작하기');
  for (const l of ['ja', 'en']) {
    const o = msg(l).onboarding;
    for (const k of ['brand', 'headingNote', 'defaultCaption']) assert.ok(o[k] && o[k] !== ko[k], `${l}.${k}`);
  }
  assert.equal(msg('ja').onboarding.brand, 'マンダラート');
  assert.equal(msg('en').onboarding.brand, 'Mandalart');
  // 화면에서는 이름공간의 말로만
  assert.match(onb, /\{o\.brand\}/);
  assert.match(onb, /\{o\.headingNote\}/);
  assert.match(onb, /\{t\.core\.dot\}/);
});
