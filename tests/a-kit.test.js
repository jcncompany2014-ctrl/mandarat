// 패키지 K(부품 상자) — docs/design/build-plan.md 웨이브 1b.
// 체크 칸의 펜 획 · 네 모습 · 치수, 줄의 사이 선(38) · 먹선 자리, 요일 칸 상태, 분절 칸 폭, 견본 쪽 색,
// 그리고 부품의 화면 읽기 역할(체크 상자 · 라디오)과 색이 모두 토큰에서 오는지를 본다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const {
  PEN_TICK, PEN_TICK_DASH, PEN_TICK_REACH, CHOSEN_TICK, CHOICE_TICK, checkGeometry, isChecked, dayBoxStates, dayLetter, SUNDAY_INDEX,
} = require('../src/lib/marks');
const {
  ROW, rowInset, strikeTop, strikeBox, segmentCells, SEG, FIELD, DAYS, AREA, FILTER, SWATCH, DYE, lookPages,
} = require('../src/components/kit/metrics');
const { LIGHT, DARK, GEO } = require('../src/theme/tokens');
const { msg, LANGS } = require('../src/i18n');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const KIT = 'src/components/kit';
const kitFiles = () => fs.readdirSync(path.join(ROOT, KIT)).filter((f) => /\.tsx?$/.test(f)).map((f) => `${KIT}/${f}`);

// ── 펜 획 ──────────────────────────────────────────────────────────────────

/** 'M x y C …' 경로(삼차 곡선만) → 점들 · 길이 · 테두리 상자 */
function bezier(d) {
  const nums = d.match(/-?\d*\.?\d+/g).map(Number);
  let [x0, y0] = nums;
  let len = 0;
  const box = { minX: x0, maxX: x0, minY: y0, maxY: y0 };
  for (let i = 2; i + 5 < nums.length + 1; i += 6) {
    const [x1, y1, x2, y2, x3, y3] = nums.slice(i, i + 6);
    let px = x0;
    let py = y0;
    for (let k = 1; k <= 400; k++) {
      const t = k / 400;
      const u = 1 - t;
      const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
      const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
      len += Math.hypot(x - px, y - py);
      px = x;
      py = y;
      box.minX = Math.min(box.minX, x);
      box.maxX = Math.max(box.maxX, x);
      box.minY = Math.min(box.minY, y);
      box.maxY = Math.max(box.maxY, y);
    }
    x0 = x3;
    y0 = y3;
  }
  return { len, ...box };
}

/** 목업의 경로 글('M5.600 12.400C8 …')을 숫자 목록으로 */
const numbers = (d) => d.match(/-?\d*\.?\d+/g).map(Number);

test('펜 획 · 고른 칸 획 · 고르기 줄 획은 목업의 경로 그대로', () => {
  const shared = src('docs/design/mockups/a/shared.js');
  const done = /A\.check = function[\s\S]*?<path d="([^"]+)"/.exec(shared)[1];
  assert.deepEqual(numbers(PEN_TICK), numbers(done));
  const sheets = src('docs/design/mockups/a/parts-sheets.js');
  const chosen = /S\.chosenBox = function[\s\S]*?<path d="([^"]+)"/.exec(sheets)[1];
  assert.deepEqual(numbers(CHOSEN_TICK), numbers(chosen));
  const choice = /const penTick = [\s\S]*?<path d="([^"]+)"/.exec(sheets)[1];
  assert.deepEqual(numbers(CHOICE_TICK), numbers(choice));
});

test('펜 획: 대시 하나가 획 전체(둥근 끝 포함)를 덮고, 상자 밖으로 뻗는 만큼 Svg가 크다', () => {
  const t = bezier(PEN_TICK);
  assert.ok(t.len > 30 && t.len + 2 <= PEN_TICK_DASH, `길이 ${t.len.toFixed(2)} + 2 ≤ ${PEN_TICK_DASH}`);
  // 오른쪽 위 모서리 밖으로 — 그래서 상자보다 큰 Svg(굵기 2의 절반까지)
  assert.ok(t.maxX > 24 && t.minY < 0, '획은 상자 밖으로 뻗는다');
  assert.ok(t.maxX + 1 - 24 <= PEN_TICK_REACH, `오른쪽 ${(t.maxX + 1 - 24).toFixed(2)} ≤ ${PEN_TICK_REACH}`);
  assert.ok(-(t.minY - 1) <= PEN_TICK_REACH, `위 ${(-(t.minY - 1)).toFixed(2)} ≤ ${PEN_TICK_REACH}`);
  // 고른 칸의 획은 상자 안(테두리 1.5 안쪽)에 머문다
  const c = bezier(CHOSEN_TICK);
  assert.ok(c.minX - 1 >= 1.5 && c.maxX + 1 <= 22.5 && c.minY - 1 >= 1.5 && c.maxY + 1 <= 22.5, JSON.stringify(c));
  // CheckBox는 획을 상자보다 큰 Svg에 따로 그린다(iOS는 Svg를 제 틀에서 자른다)
  const box = src(`${KIT}/CheckBox.tsx`);
  assert.match(box, /width=\{size \+ g\.reach\}/);
  assert.match(box, /viewBox=\{`0 \$\{-reach\} \$\{24 \+ reach\} \$\{24 \+ reach\}`\}/);
  assert.match(box, /top: -g\.reach/);
});

test('체크 칸 치수: 24 상자의 비례(모서리 6 · 테두리 1.5 · 획 2), 누르는 자리 44', () => {
  assert.deepEqual(checkGeometry(24), { radius: 6, edge: 1.5, tick: 2, reach: PEN_TICK_REACH, hit: 10 });
  const g20 = checkGeometry(20);
  assert.equal(g20.radius, 5);
  assert.equal(g20.hit, 12);
  const g14 = checkGeometry(14);
  assert.equal(g14.radius, 3.5);
  assert.equal(g14.edge, 0.875);
  assert.equal(g14.hit, 15);
  for (const s of [24, 20, 14]) assert.equal(s + 2 * checkGeometry(s).hit, 44);
  assert.equal(GEO.rCheck, 6);
});

test('체크 칸 네 모습: 선택됨은 했어요 · 고름만, 각 모습의 색은 토큰', () => {
  assert.deepEqual(['open', 'done', 'chosen', 'later'].map(isChecked), [false, true, true, false]);
  const box = src(`${KIT}/CheckBox.tsx`);
  // 빈 칸: printEdge 테두리 · 나중: tile 칠 · 했어요: wash/dye(영역이 없으면 tile/printEdge) + tick 획 · 고름: 먹 획
  assert.match(box, /later \? \{ backgroundColor: M\.tile \} : \{ borderWidth: g\.edge, borderColor: M\.printEdge \}/);
  assert.match(box, /area != null \? M\.wash\[area\] : undefined\) \?\? M\.tile/);
  assert.match(box, /area != null \? M\.dye\[area\] : undefined\) \?\? M\.printEdge/);
  assert.match(box, /stroke=\{M\.tick\}/);
  assert.match(box, /<Path d=\{CHOSEN_TICK\} fill="none" stroke=\{M\.ink\} strokeWidth=\{2\}/);
});

// ── 줄 ──────────────────────────────────────────────────────────────────────

test('줄: 54 높이, 상자 칸 24 + 사이 14 — 줄 사이 선은 x 38부터(상자 칸이 없으면 0)', () => {
  assert.equal(ROW.h, 54);
  assert.equal(ROW.inset, ROW.box + ROW.gap);
  assert.equal(ROW.inset, 38);
  assert.equal(rowInset(true), 38);
  assert.equal(rowInset(false), 0);
  // 오늘 줄 · 고르기 줄도 같은 값
  assert.match(src('src/components/TodayRow.tsx'), /export const TODAY_ROW_INSET = ROW\.inset;/);
  const row = src(`${KIT}/Row.tsx`);
  assert.match(row, /height: StyleSheet\.hairlineWidth, backgroundColor: M\.printRule/);
  assert.match(row, /<RowRule M=\{M\} inset=\{rowInset\(!bare\)\} \/>/);
});

test('끝낸 줄의 먹선: 제목 줄 위 12(한글 가운데) · 1pt · 잰 글 폭보다 양쪽 1씩 — textDecorationLine이 아니다', () => {
  assert.equal(strikeTop(1), 12);
  assert.equal(strikeTop(1.5), 18);
  assert.equal(strikeTop(2), 24);
  assert.equal(strikeTop(3), 24, '글자 확대는 2배까지(AppText)');
  assert.equal(strikeTop(NaN), 12);
  assert.deepEqual(strikeBox(100), { left: -1, width: 102 });
  assert.equal(ROW.strike, 1);
  const row = src(`${KIT}/Row.tsx`);
  assert.doesNotMatch(row.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''), /textDecorationLine/);
  assert.match(row, /onTextLayout=/);
  assert.match(row, /backgroundColor: M\.ink2, transformOrigin: 'left'/);
  assert.match(row, /color: done \? M\.ink2 : M\.ink/);
});

test('요일 칸: routineWeek 상태 → 했어요 · 빈 칸 · 나중 · 없음', () => {
  assert.deepEqual(
    dayBoxStates(['done', 'missed', 'today', 'planned', 'off', 'off', 'planned']),
    ['done', 'open', 'open', 'later', 'none', 'none', 'later'],
  );
  // 누를 수 있는 날(지난날 · 오늘)은 쉬는 날이어도 빈 칸 — 주 N회 습관은 아무 날에나 남긴다
  assert.deepEqual(
    dayBoxStates(['off', 'off', 'off', 'off', 'off', 'off', 'off'], (i) => i <= 2),
    ['open', 'open', 'open', 'none', 'none', 'none', 'none'],
  );
  assert.equal(SUNDAY_INDEX, 6);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map((i) => dayLetter(i, 'ko')), ['월', '화', '수', '목', '금', '토', '일']);
  assert.equal(dayLetter(0, 'en'), 'M');
  assert.equal(dayLetter(6, 'ja'), '日');
  assert.equal(DAYS.box + DAYS.gap + 16 + DAYS.top + DAYS.dot + 5, DAYS.h, '글자 16 + 사이 6 + 상자 24 + 점 자리');
  const days = src(`${KIT}/DayBoxes.tsx`);
  assert.match(days, /i === SUNDAY_INDEX \? M\.signal : M\.print/);
  assert.match(days, /backgroundColor: M\.signal/);
});

test('분절 칸: 받침 폭을 칸과 사이로 남김없이 나눈다', () => {
  assert.equal(SEG.h, 40);
  assert.equal(SEG.radius, 12);
  assert.equal(SEG.cellRadius, 9);
  for (const w of [279, 327, 342]) {
    for (const n of [2, 3, 4, 5]) {
      const { cell, x } = segmentCells(w, n);
      assert.ok(Math.abs(x(n - 1) + cell + SEG.pad - w) < 1e-9, `${w} / ${n}`);
      assert.ok(Math.abs(x(1) - x(0) - cell - SEG.gap) < 1e-9);
    }
  }
});

test('자리 수치는 계획(패키지 K) 그대로', () => {
  assert.deepEqual([FIELD.h, FIELD.hSmall, FIELD.hMemo, FIELD.padX, FIELD.radius], [56, 54, 84, 16, 12]);
  assert.deepEqual([AREA.cols, AREA.gap, AREA.h, AREA.radius], [4, 6, 44, 12]);
  assert.deepEqual([FILTER.h, FILTER.gap, FILTER.gapScope, FILTER.underline, FILTER.underlineBottom], [44, 18, 24, 1, 9]);
  assert.deepEqual([DYE.size, DYE.radius, DYE.gap], [8, 2, 6]);
  assert.deepEqual([SWATCH.framePad, SWATCH.frameRadius, SWATCH.wellPad, SWATCH.wellRadius, SWATCH.pageH, SWATCH.pageRadius, SWATCH.ring], [3, 15, 8, 12, 46, 7, 1.5]);
  assert.equal(SWATCH.short, 0.55);
  // 글자 모양은 모두 ROLE(theme/type.ts, a-tokens가 표를 본다) — 부품 상자가 따로 지은 글자 모양(예전 KIT_TYPE)은 없다
  assert.equal(require('../src/components/kit/metrics').KIT_TYPE, undefined);
  for (const rel of kitFiles()) assert.doesNotMatch(src(rel), /KIT_TYPE|fontSize:\s*\d|PRETENDARD\[/, rel);
});

test('견본 쪽: 어느 모드에서 보든 밝게는 흰 쪽, 어둡게는 먹 쪽, 자동은 두 쪽', () => {
  assert.deepEqual(lookPages('light'), [{ page: LIGHT.paper, word: LIGHT.ink, line: LIGHT.printMid }]);
  assert.deepEqual(lookPages('dark'), [{ page: LIGHT.ink, word: LIGHT.paper, line: LIGHT.ink2 }]);
  assert.deepEqual(lookPages('auto').map((p) => p.page), [LIGHT.paper, LIGHT.ink]);
  for (const l of LANGS) assert.ok(msg(l).common.swatchWord.length > 0, l);
  assert.equal(msg('ko').common.swatchWord, '가');
});

// ── 화면 읽기 ──────────────────────────────────────────────────────────────

test('화면 읽기 역할: 체크 칸 · 켜고 끄는 줄은 체크 상자(선택됨), 고르기 줄 · 견본 · 영역은 라디오', () => {
  const box = src(`${KIT}/CheckBox.tsx`);
  assert.match(box, /accessibilityRole="checkbox"/);
  assert.match(box, /accessibilityState=\{\{ checked: isChecked\(state\), disabled: !!disabled \}\}/);
  assert.match(box, /hitSlop=\{g\.hit\}/);
  const toggle = src(`${KIT}/ToggleRow.tsx`);
  assert.match(toggle, /accessibilityRole="checkbox"\s+accessibilityState=\{\{ checked: on, disabled \}\}/);
  assert.match(toggle, /state=\{on \? 'chosen' : 'open'\}/);
  const choice = src(`${KIT}/ChoiceRow.tsx`);
  assert.match(choice, /accessibilityRole="radio"\s+accessibilityState=\{\{ checked: on, selected: on \}\}/);
  assert.match(choice, /\bbare\b/);
  for (const f of ['Swatch.tsx', 'AreaPicker.tsx']) {
    assert.match(src(`${KIT}/${f}`), /accessibilityRole="radio"\s+accessibilityState=\{\{ checked: on \}\}/, f);
  }
  assert.match(src(`${KIT}/AreaPicker.tsx`), /accessibilityRole="radiogroup"/);
  const days = src(`${KIT}/DayBoxes.tsx`);
  assert.match(days, /accessibilityState=\{role === 'checkbox' \? \{ checked \} : undefined\}/);
  // 오늘 줄의 체크 칸은 그대로 체크 상자 — 이름 · 힌트 · 지우기 동작 · TID를 넘긴다
  const today = src('src/components/TodayRow.tsx');
  assert.match(today, /testID=\{TID\.todayCheck\(seed\)\}\s+accessibilityLabel=\{checkLabel\}\s+accessibilityHint=\{hint\}/);
  assert.match(today, /testID=\{TID\.todayRow\(seed\)\}/);
});

test('이름표를 단 View · Pressable은 화면 읽기 언어도 단다(a11y-lang A-1과 같은 규칙)', () => {
  const HOST = new Set(['View', 'Pressable', 'Animated.View', 'ScrollView']);
  const bad = [];
  for (const rel of [...kitFiles(), 'src/components/TodayRow.tsx', 'src/components/KindBits.tsx']) {
    const text = src(rel);
    const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(sf);
        const props = node.attributes.properties;
        const named = (n) => props.some((p) => ts.isJsxAttribute(p) && p.name.getText(sf) === n);
        const spread = props.some((p) => ts.isJsxSpreadAttribute(p) && /a11yLangProp\(\)/.test(p.expression.getText(sf)));
        if (HOST.has(tag) && named('accessibilityLabel') && !named('accessibilityLanguage') && !spread) {
          bad.push(`${rel}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1} <${tag}>`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  assert.deepEqual(bad, []);
});

// ── 색은 토큰에서 ────────────────────────────────────────────────────────────

test('부품 상자에는 손으로 적은 색이 없다(모두 팔레트의 토큰 이름)', () => {
  const hits = [];
  for (const rel of [...kitFiles(), 'src/components/Check.tsx']) {
    const code = src(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const m of code.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g)) hits.push(`${rel}: ${m[0]}`);
  }
  assert.deepEqual(hits, []);
});

test('예전 이름은 그대로 — Check · KindBits는 kit을 감싼다(SegmentedControl · WeekStrip은 쓰는 곳이 없어 R2가 지웠다)', () => {
  const check = src('src/components/Check.tsx');
  assert.match(check, /export const Check = memo\(function Check\(/);
  assert.match(check, /export function checkEdge\(dark: boolean, more: boolean\)/);
  assert.match(check, /<CheckBox M=\{M\} state=\{state\}/);
  const kind = src('src/components/KindBits.tsx');
  for (const name of ['metaText', 'CountBar', 'RatingBoxes']) assert.match(kind, new RegExp(`export function ${name}\\(`), name);
  for (const name of ['alertInk', 'KindMeta']) assert.doesNotMatch(kind, new RegExp(`export function ${name}\\(`), `${name}: 쓰는 곳이 없어 R2가 지웠다`);
  assert.match(kind, /backgroundColor: M\.tile, overflow: 'hidden'/, '쌓기 막대 받침은 tile');
  // 오늘 줄은 작은 주간 칸을 그리지 않는다 — 습관의 이번 주는 정보 줄('이번 주 0/3회')이 말한다
  const row = src('src/components/TodayRow.tsx');
  assert.doesNotMatch(row, /WeekStrip/);
  assert.match(row, /metaText\(metaLine\)/);
  // 어두운 토큰의 tile 위 점수 · 칸도 같은 이름을 쓴다
  assert.equal(typeof DARK.tile, 'string');
});
