// F-2 — R-6 A-2 · A-3a · A-5~A-8 · D-5~D-7 · D-9, R-5 #2를 고정한다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { msg } = require('../src/i18n');
const { statEm, statValueSize } = require('../src/screens/year/statFit');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('R-5 #2: 네 숫자의 값은 375pt 폭 한 칸 안에 한 줄로 들어간다(ko · ja · en)', () => {
  // 375 - 여백 40 = 335, 네 칸 → 칸 안쪽 335/4 - 17
  const inner = 335 / 4 - 17;
  for (const l of ['ko', 'ja', 'en']) {
    const f = msg(l).fmt;
    const values = [f.days({ n: 365 }), f.days({ n: 120 }), '64/64', f.duration({ mins: 125 })];
    const size = statValueSize(values, inner);
    assert.ok(size >= 12 && size <= 20, `${l}: ${size}`);
    for (const v of values) assert.ok(statEm(v) * size <= inner, `${l}: ${v} @ ${size}`);
  }
  // 짧은 값은 20pt 그대로
  assert.equal(statValueSize(['12/64'], inner), 20);
  // 아무리 길어도 12pt 아래로는 줄이지 않는다
  assert.equal(statValueSize(['123時間45分'.repeat(3)], inner), 12);
});

test('R-5 #2: 넓은 글자(가나·한자·한글)는 1em, 숫자는 그보다 좁게 잡는다', () => {
  assert.equal(statEm('時間'), 2);
  assert.equal(statEm('시간'), 2);
  assert.ok(statEm('2') < 1);
  assert.ok(statEm('2 hr 5 min') > statEm('2時間5分') - 1);
});

test('A-3a · D-7: 장부 — 기록한 날 테두리 1pt, 진하기 40/60/75/90, 칸은 16pt까지', () => {
  const s = src('src/components/YearLedger.tsx');
  assert.match(s, /export const HEAT_FILL = \[0, 40, 60, 75, 90\] as const;/);
  assert.match(s, /borderWidth: 1, borderColor: inkEdge/);
  assert.match(s, /Math\.max\(6, Math\.min\(16, Math\.floor\(\(width - LEDGER_LABEL_W\) \/ 31\)\)\)/);
});

test('A-2: 펼침 — 왼쪽 쪽 → 오른쪽 쪽 순서(experimental_accessibilityOrder · id)', () => {
  const s = src('src/navigation/Root.tsx');
  assert.match(s, /const SPREAD_A11Y = \{ experimental_accessibilityOrder: \[SPREAD_LEFT_ID, SPREAD_RIGHT_ID\] \} as ViewProps;/);
  assert.match(s, /\{\.\.\.SPREAD_A11Y\}>/);
  const left = s.indexOf('id={SPREAD_LEFT_ID}');
  const right = s.indexOf('id={SPREAD_RIGHT_ID}');
  assert.ok(left > 0 && right > left);
  assert.ok(s.indexOf('testID={TID.spreadLeft}') > left);
  // RN 0.85의 View가 이 이름으로 받는다
  assert.match(src('node_modules/react-native/Libraries/Components/View/ViewPropTypes.js'), /experimental_accessibilityOrder\?: \?Array<string>/);
  assert.match(src('docs/v2/device-tests.md'), /swipe right from the Home title reaches every Home row before any 81-cell cell/);
});

test('A-5: 맞추는 중의 "지금 맞추기"도 버튼으로 읽힌다', () => {
  const s = src('src/screens/settings/SyncSection.tsx');
  assert.match(s, /onPress=\{busy \? undefined : onNow\}[\s\S]{0,120}accessibilityRole="button"/);
});

test('A-6: 앱 안으로 가는 글자 링크는 button 역할', () => {
  for (const f of ['src/screens/year/YearReview.tsx', 'src/screens/year/YearSheet.tsx']) {
    assert.doesNotMatch(src(f), /accessibilityRole="link"/, f);
  }
});

test('A-7: 잠긴 인쇄 줄은 프로 안내가 열린다고 알려 준다', () => {
  const s = src('src/overlays/PrintSheet.tsx');
  assert.equal((s.match(/accessibilityHint=\{locked \? m\.print\.lockedHint : undefined\}/g) ?? []).length, 2);
  assert.equal(msg('ko').print.lockedHint, '누르면 프로 안내가 열려요');
  assert.equal(msg('ja').print.lockedHint, 'タップするとプロの案内が開きます');
  assert.equal(msg('en').print.lockedHint, 'Opens the Pro page');
});

test('A-8: 한 해 닫기 — 둘째 쪽부터 "‹ 이전"(44pt, onBack)', () => {
  const s = src('src/overlays/YearClose.tsx');
  const at = s.indexOf('{index > 0 && (');
  assert.ok(at > 0);
  const btn = s.slice(at, s.indexOf('</Pressable>', at));
  assert.match(btn, /onBack\(\)/);
  assert.match(btn, /accessibilityLabel=\{m\.common\.back\}/);
  assert.match(btn, /minHeight: 44, minWidth: 44/);
  assert.equal(msg('ko').common.back, '이전');
  assert.equal(msg('ja').common.back, '前へ');
  assert.equal(msg('en').common.back, 'Back');
});

test('D-5: 종이 무늬 견본 잉크는 종이 위 3:1', () => {
  assert.match(src('src/screens/settings/PaperRows.tsx'), /const ink = legibleMark\(M\.faint, M\.bg, M\);/);
});

test('D-6: "프로" 글자는 한 가지 모양(13 · 600 · sub)', () => {
  for (const f of ['src/screens/year/YearReview.tsx', 'src/screens/year/YearSheet.tsx']) {
    assert.match(src(f), /\{ fontSize: 13, fontWeight: '600', color: M\.sub \}\}>\{m\.common\.proMark\}/, f);
  }
  assert.match(src('src/screens/year/YearShelf.tsx'), /fontWeight: locked \? '600' : '700', color: M\.sub/);
});

test('D-9: 돌아보기의 닳은 자리 범례는 제목 줄과 같은 머리말', () => {
  assert.match(src('src/components/StatsCharts.tsx'), /\{head \?\? m\.stats\.legendLast4\}/);
  assert.match(src('src/screens/year/YearReview.tsx'), /<WearLegend M=\{M\} head=\{m\.year\.wearRight\} \/>/);
});

test('R2-2: 언어 아래 덧말(iPhone 언어를 따라요)은 iOS에서만', () => {
  assert.match(src('src/screens/settings/LanguageSection.tsx'), /\{Platform\.OS === 'ios' && \(\n\s+<Text[^>]*>\{m\.lang\.footnote\}<\/Text>/);
});
