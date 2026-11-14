// DX-3 — 시트·한 주 돌아보기·토스트·집중 타이머의 디자인 고침(D-2·4·9·10·12·15·19·21·22·26·28·29)
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { MOODS, toHex, mix } = require('../src/theme/moods');
const { ACCENTS, GOLD, contrast } = require('../src/theme/palette');
const { TEMPLATES } = require('../src/data/templates');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('D-2: 편집 창은 81칸의 실제 칸으로 어림한다 — 6자 규칙은 없다', () => {
  const s = src('src/overlays/CellEditor.tsx');
  assert.match(s, /chartFitHint\(text, editor\.kind, winW\)/);
  assert.doesNotMatch(s, /6자|CHART_W|fitLabel/);
});

test("D-2: 템플릿 영역 이름 '사이드 프로젝트'를 되돌린다(81칸에 두 줄로 다 보인다)", () => {
  const career = TEMPLATES.find((t) => t.id === 'career');
  assert.ok(career.areas.some((a) => a.title === '사이드 프로젝트'));
  assert.ok(!career.areas.some((a) => a.title === '부업'));
});

// D-4(토스트 되돌리기 글자의 포인트 컬러 대비)는 디자인 A의 토스트(종이 알약 · 먹 글씨)로 바뀌어 지웠다 — tests/a-chrome.test.js가 본다

test('D-9: 마음가짐 점수는 고른 한 칸만 먹으로 — 쌓아 칠하거나 영역 색을 깔지 않는다', () => {
  const s = src('src/components/KindBits.tsx');
  assert.match(s, /const on = n === value;/);
  // 칠은 Segment 낱칸과 같은 한 곳(segmentFace: 고른 칸 먹, 아닌 칸 tile)
  assert.match(s, /const face = segmentFace\(M, on, true\);/);
  assert.match(src('src/components/kit/Segment.tsx'), /backgroundColor: on \? M\.ink : tiles \? M\.tile : 'transparent'/);
  assert.doesNotMatch(s, /n <= value|readableOn/);
  assert.match(s, /accessibilityRole="radio"/);
  assert.match(s, /accessibilityState=\{\{ checked: n === value \}\}/);
  // 고른 칸의 숫자(M.bg on M.ink)는 모든 무드에서 넉넉히 읽힌다
  for (const [name, M] of Object.entries(MOODS)) assert.ok(contrast(M.bg, M.ink) >= 13, name);
});

test("D-10 · D-26 · D-29: 할 일 시트 — '마감 없음' 줄 한 겹 · 위치 표 빈 칸은 시트 바탕 · 힌트가 부제를 되풀이하지 않는다", () => {
  const s = src('src/overlays/ActionSheet.tsx');
  assert.match(s, /<LineRow M=\{M\} title=\{m\.sheet\.noDue\}/);
  assert.equal(require('../src/i18n/ko/sheet').default.noDue, '마감 없음');
  assert.doesNotMatch(s, /LineRow M=\{M\} first last title=/);
  assert.match(s, /bg: sheetBg\(M\), current: false/);
  assert.doesNotMatch(s, /bg: M\.bg/);
  assert.doesNotMatch(s, /한 주에 한 번, 떠오르는/);
  assert.match(s, /m\.sheet\.mindPrompt/);
  assert.equal(require('../src/i18n/ko/sheet').default.mindPrompt, '떠오르는 대로 매겨요');
});

test('D-12 · D-21: 한 주 돌아보기 — 고른 수는 버튼에, 바닥 괘선, 메모는 목록 위, 7×7 영역 표시, 토스트는 닫기 아래', () => {
  const s = src('src/overlays/WeekRitual.tsx');
  assert.match(s, /t\.finishWith\(\{ n: picks\.length \}\)/);
  assert.equal(require('../src/i18n/ko/ritual').default.finishWith({ n: 2 }), '중점 2칸 · 마치기');
  assert.match(s, /borderTopWidth: 1, borderColor: M\.line \}\}>\s*<PrimaryButton/);
  assert.ok(s.indexOf('placeholder={rt.note}') > 0 && s.indexOf('placeholder={rt.note}') < s.indexOf('{groups.map('), '메모가 영역 묶음보다 위');
  assert.equal(require('../src/i18n/ko/ritual').default.note, '한 줄 메모');
  assert.match(s, /width: 7, height: 7, borderRadius: 1\.5/);
  assert.match(s, /<Snackbar placement="top" offset=\{TOP_BAR_H\} \/>/);
  assert.match(src('src/overlays/Snackbar.tsx'), /top: insets\.top \+ 8 \+ offset/);
});

test('D-15 · D-28: 편집 창 — 바닥 첫 글자 버튼을 가장자리에, 빈 칸 안내가 아래 고르기 줄을 되풀이하지 않는다', () => {
  const s = src('src/overlays/CellEditor.tsx');
  assert.match(s, /label=\{ed\.clearCell\}[^\n]*style=\{EDGE\}/);
  assert.match(s, /label=\{ed\.save\}[^\n]*style=\{filledAction \? undefined : EDGE\}/);
  assert.match(s, /placeholder=\{help\.length > 0 \? ed\.helpPlaceholder : m\.placeholder\}/);
  const ed = require('../src/i18n/ko/editor').default;
  assert.deepEqual([ed.clearCell, ed.save, ed.helpPlaceholder], ['칸 비우기', '저장', '직접 적거나 아래에서 골라요']);
});

test("D-19: 오늘 고르기 — 아무것도 없으면 '오늘 0개 · 다 골랐어요' 대신 조용한 닫기", () => {
  const s = src('src/overlays/PickToday.tsx');
  assert.match(s, /if \(total === 0\) return <PrimaryButton M=\{M\} tone="quiet" label=\{m\.common\.close\}/);
  assert.equal(require('../src/i18n/ko/common').default.close, '닫기');
});

// D-22(집중 타이머: 멈추면 숫자가 흐려진다)는 O4가 종이 위 새 그림으로 옮겼다 — tests/a-o4.test.js.
