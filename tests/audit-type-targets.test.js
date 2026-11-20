// 손으로 써 본 점검(오디트)에서 나온 것 — 더 큰 텍스트 · 손끝 자리 · 잘린 글 · 작은 화면 고침.
// 1 더 큰 텍스트: 오늘 줄 제목 · 크게 본 블록 · 시트 머리 · 화면 머리 위 줄 / 2 이번 주 습관 표(두 줄 · 40 × 44)
// 3 처음 표의 권하는 글(줄 셋) / 4 처음 화면(커서 · 늘 '시작하기') / 5 지난 마감('2일 지남', 신호색)
// 6 화면 읽기(뒤로 가기 · '영역 3 / 8') / 7 웹(포커스 줄의 색 · 체크 칸 누르는 자리)
// 화면은 띄우지 않는다: 셈은 순수 모듈로, 그리는 파일은 소스로 본다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const G = require('../src/components/chart/geometry');
const { fitBox } = require('../src/lib/text');
const { PRETENDARD_GLYPHS } = require('../src/lib/labelFit');
const { estimateLines } = require('../src/theme/chart');
const { exampleGroup, suggestActions } = require('../src/lib/suggest');
const { seedTitles } = require('../src/data/defaults');
const { checkGeometry } = require('../src/lib/marks');
const { GEO, LIGHT, DARK } = require('../src/theme/tokens');
const { msg, LANGS } = require('../src/i18n');

const ROOT = path.join(__dirname, '..');
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const slice = (s, from, to) => {
  const a = s.indexOf(from);
  assert.ok(a >= 0, from);
  const b = to ? s.indexOf(to, a + from.length) : s.length;
  assert.ok(b > a, to);
  return s.slice(a, b);
};
/** 주석을 뺀 소스 */
const code = (rel) => src(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// ── 1. 더 큰 텍스트 ────────────────────────────────────────────────────────────

test('오늘 줄: 글자를 1.35배부터 키우면 제목이 세 줄까지 접힌다(한 줄에 묶으면 2배에서 여덟 자쯤)', () => {
  const row = src('src/components/TodayRow.tsx');
  assert.match(row, /const TITLE_WRAP_SCALE = 1\.35;/);
  assert.match(row, /const TITLE_WRAP_LINES = 3;/);
  assert.match(row, /const fontScale = useWindowDimensions\(\)\.fontScale \|\| 1;/);
  assert.match(row, /<RowTitle M=\{M\} text=\{text\} done=\{done\} lines=\{fontScale >= TITLE_WRAP_SCALE \? TITLE_WRAP_LINES : 1\} \/>/);
  // 쪽 폭을 아는 앱의 훅으로(react-native의 것이 아니라)
  assert.match(row, /import \{ useWindowDimensions \} from '\.\.\/lib\/screen';/);
});

test('줄 제목: 글 폭은 끝낸 줄만 잰다 — 안 끝낸 줄은 재지 않아 줄마다 한 번 더 그리지 않는다', () => {
  const row = code('src/components/kit/Row.tsx');
  assert.match(row, /onTextLayout=\{done \? \(e\) => \{[\s\S]{0,420}setMeasured\(next\);\s*\} : undefined\}/);
  // 여러 줄로 접힌 제목(글자를 키운 오늘 줄)은 줄마다 긋는다 — 보이는 줄까지만
  assert.match(row, /const got = lines > 0 \? e\.nativeEvent\.lines\.slice\(0, lines\) : e\.nativeEvent\.lines;/);
  assert.match(row, /\{done && strikes\.map\(\(ln, i\) => \(/);
  assert.match(row, /top: top \+ \(ln\?\.y \?\? 0\), height: ROW\.strike, backgroundColor: M\.ink2, transformOrigin: 'left'/);
  // 못 잰 동안(웹 · 첫 프레임)은 첫 줄에 글 상자 폭으로 긋는다
  assert.match(row, /const strikes: \(StrikeLine \| null\)\[\] = measured \?\? \[null\];/);
  assert.match(row, /ln \? strikeBox\(ln\.w\) : \{ left: -1, right: -1 \}/);
});

test('크게 본 블록: 글자 크기 후보에 배율을 곱한다 — 1.3배까지, 작은 칸에서는 줄 높이가 드는 크기만', () => {
  const sizes = [16, 15, 14, 13, 12];
  const ratio = 24 / 16;
  assert.equal(G.BLOCK_TEXT_SCALE, 1.3);
  // 1배 · 알 수 없는 값은 그대로
  for (const k of [1, NaN, 0, -1, undefined]) assert.deepEqual(G.scaledSizes(sizes, k, ratio, 90), sizes, String(k));
  // 1.3배: 키운 후보 + 본디 후보, 큰 것부터
  assert.deepEqual(G.scaledSizes(sizes, 1.3, ratio, 90), [20.8, 19.5, 18.2, 16.9, 16, 15.6, 15, 14, 13, 12]);
  // 그보다 큰 배율(2배 · 3배)도 1.3배까지만
  assert.deepEqual(G.scaledSizes(sizes, 2, ratio, 90), G.scaledSizes(sizes, 1.3, ratio, 90));
  assert.deepEqual(G.scaledSizes(sizes, 3.1, ratio, 90), G.scaledSizes(sizes, 1.3, ratio, 90));
  // 작게 쓰는 설정은 그대로 작아진다(예전에도 작아졌다)
  const small = G.scaledSizes(sizes, 0.85, ratio, 90);
  assert.equal(small.length, sizes.length);
  small.forEach((fs, i) => assert.ok(Math.abs(fs - sizes[i] * 0.85) <= 0.05 + 1e-9, `${fs} ≈ ${sizes[i]} × 0.85`));
  // 한 줄이 칸 높이(24)에 들지 않는 키운 크기는 뺀다 — 1배의 16/24는 남는다
  assert.deepEqual(G.scaledSizes(sizes, 1.3, ratio, 24), [16, 15.6, 15, 14, 13, 12]);
  for (const fs of G.scaledSizes(sizes, 1.3, ratio, 30)) assert.ok(fs <= 16 || Math.round(fs * ratio) <= 30, String(fs));
  // 늘 큰 것부터, 겹치는 크기 없이
  for (const k of [1.1, 1.15, 1.2, 1.3]) {
    const s = G.scaledSizes(sizes, k, ratio, 60);
    assert.deepEqual(s, [...new Set(s)].sort((a, b) => b - a), String(k));
    for (const base of sizes) assert.ok(s.includes(base), `${k}: ${base}`);
  }
});

test('크게 본 블록: 크게 봐도 1배 때보다 작아지지 않고, 1배에서 다 보이던 글은 잘리지 않는다', () => {
  const kinds = [
    { sizes: [16, 15, 14, 13, 12], ratio: 24 / 16 },
    { sizes: [18, 16, 15, 14, 13], ratio: 24 / 18 },
    { sizes: [20, 18, 16, 15, 14], ratio: 28 / 20 },
  ];
  const texts = {
    ko: ['건강', '주 3회 달리기', '달리기 전 스트레칭 10분 하고 나가기', '하프 마라톤 대회 나가기', '10km 55분 안에 달리기 연습'],
    en: ['Health', 'Work out 3x a week', 'Stretch for ten minutes before every single run'],
    ja: ['健康', 'ストレッチを10分する', '毎朝30分のジョギングを続ける'],
  };
  let grew = 0;
  for (const W of [327, 342, 480]) {
    const g = G.blockGeometry(W, 3);
    const w = g.cells[0] - 2 * G.BLOCK.pad;
    // 칸 높이에서 위아래 여백(10 · 표시 24 · 아래 한 줄 27)을 뺀 자리
    for (const pad of [G.BLOCK.pad, 24, 27]) {
      for (const spec of kinds) {
        const room = Math.max(spec.sizes[0] * spec.ratio, g.cells[0] - 2 * pad);
        for (const [l, list] of Object.entries(texts)) {
          for (const t of list) {
            const base = fitBox(t, w, room, spec.sizes, 4, spec.ratio, PRETENDARD_GLYPHS, l);
            const big = fitBox(t, w, room, G.scaledSizes(spec.sizes, 1.3, spec.ratio, room), 4, spec.ratio, PRETENDARD_GLYPHS, l);
            const at = `${W} ${pad} ${l} '${t}'`;
            assert.ok(big.fs >= base.fs, `${at}: ${big.fs} < ${base.fs}`);
            assert.ok(big.lh * big.lines <= room + 1e-6 || big.fs === base.fs, `${at}: 높이 ${big.lh} × ${big.lines} > ${room}`);
            const cut = (f) => estimateLines(t, w, f.fs, PRETENDARD_GLYPHS, l) > f.lines;
            if (!cut(base)) assert.equal(cut(big), false, `${at}: 크게 보니 잘린다`);
            if (big.fs > base.fs) grew++;
          }
        }
      }
    }
  }
  assert.ok(grew > 50, `짧은 글은 실제로 커진다(${grew})`);
  // 그리는 쪽: 배율을 곱한 후보로 같은 법(fitBox)으로 맞추고, 그린 뒤에 또 키우지 않는다
  const block = src('src/components/chart/BlockGrid.tsx');
  assert.match(block, /const fontScale = useWindowDimensions\(\)\.fontScale \|\| 1;/);
  assert.match(block, /const room = Math\.max\(spec\.sizes\[0\] \* spec\.ratio, h - 2 \* pad\);/);
  assert.match(block, /fitBox\(text, w - 2 \* BLOCK\.pad, room, scaledSizes\(spec\.sizes, fontScale, spec\.ratio, room\), MAX_LINES, spec\.ratio, PRETENDARD_GLYPHS, l\)/);
  assert.match(block, /allowFontScaling=\{false\}/);
});

test('시트 머리 · 화면 머리 위 줄: 높이는 가장 낮은 값(48 · 18) — 글자를 키우면 줄이 함께 늘어난다', () => {
  const c = src('src/components/common.tsx');
  const head = slice(c, 'export function SheetHeader(', 'export function CloseBtn(');
  assert.match(head, /<View style=\{\{ minHeight: 48, flexDirection: 'row'/);
  assert.doesNotMatch(head, /\{ height: 48\b/);
  // 두 줄(13/17) 모두 1.6배까지 — 1.5배면 두 줄이 51로 48을 넘는다
  assert.match(c, /const SHEET_HEAD_SCALE = 1\.6;/);
  assert.equal((head.match(/numberOfLines=\{1\} maxFontSizeMultiplier=\{SHEET_HEAD_SCALE\}/g) || []).length, 2);
  assert.ok(2 * 17 * 1.5 > 48);
  const body = slice(c, 'function HeaderBody(', 'export function IconBtn(');
  assert.equal((body.match(/minHeight: 18, justifyContent: 'center'/g) || []).length, 2);
  assert.doesNotMatch(body, /\{ height: 18\b/);
  // 위 줄 글(뒤로 가기 · 인쇄된 한 줄)은 1.4배까지 — 18 × 1.4 = 25.2
  assert.match(body, /\.\.\.ROLE\.folio, color: M\.print \}\} numberOfLines=\{1\} maxFontSizeMultiplier=\{1\.4\}/);
});

// ── 2. 이번 주 습관 표 ─────────────────────────────────────────────────────────

test('이번 주 습관: 이름은 제 줄에 본문 폭 그대로, 그 아래 요일 칸 일곱(폭 40 이상 · 높이 44)과 횟수', () => {
  const h = src('src/screens/area/HabitWeek.tsx');
  const [, col, colMax, fig, row] = /col: (\d+), colMax: (\d+), fig: (\d+), head: \d+, row: (\d+),/.exec(h).map(Number);
  assert.ok(col >= 40 && colMax >= col, `요일 칸 폭 ${col}~${colMax}`);
  assert.equal(row, 44);
  // 본문 폭(화면 − 좌우 24)에서 횟수 칸을 뺀 자리를 일곱이 나눠 가진다 — 375 · 390 · 430 화면 모두 40 이상
  for (const win of [375, 390, 393, 430]) {
    const each = Math.min(colMax, (win - 2 * GEO.gutter - fig) / 7);
    assert.ok(each >= 40, `${win}: ${each.toFixed(1)}`);
  }
  assert.match(h, /flexGrow: 1, flexShrink: 1, flexBasis: HABIT_WEEK\.col, maxWidth: HABIT_WEEK\.colMax/);
  assert.match(h, /const col = \[DAY_COL, \{ height: HABIT_WEEK\.row \}\];/);
  const rowSrc = slice(h, 'const WeekRow = memo(', 'export const HabitWeek = memo(');
  // 이름 줄: 한 줄, 폭을 묶지 않는다(예전에는 요일 칸 옆 84pt 칸이었다) — 요일 줄보다 먼저
  assert.match(rowSrc, /<Text style=\{\[ROLE\.ledger, \{ color: M\.ink \}\]\} numberOfLines=\{1\}>\{row\.text\}<\/Text>/);
  assert.ok(rowSrc.indexOf('{row.text}</Text>') < rowSrc.indexOf('{DAYS.map('), '이름이 요일 칸 위에');
  assert.doesNotMatch(rowSrc, /flex: 1, minWidth: 0, paddingRight/);
  // 요일 칸은 그대로 체크 상자(웹은 aria-checked) — 요일과 상태를 읽는다
  assert.match(rowSrc, /accessibilityRole="checkbox"\s+accessibilityState=\{\{ checked: done \}\}\s+aria-checked=\{done\}/);
  assert.match(rowSrc, /accessibilityLabel=\{`\$\{row\.text\}\$\{sep\}\$\{weekDayLabel\(i, row\.states\[i\], i === todayIndex\)\}`\}/);
  // 줄 이름은 글 + 이번 주 몇 회 중 몇 회
  assert.match(rowSrc, /accessibilityLabel=\{`\$\{row\.text\}\$\{sep\}\$\{m\.kinds\.weekSpeech\(\{ done: row\.done, total: row\.planned \}\)\}`\}/);
  assert.match(rowSrc, /\{`\$\{row\.done\}\/\$\{row\.planned\}`\}/);
});

test('이번 주 습관: 요일 글자 줄은 맨 위에 한 번, 오늘 칸은 글자와 줄마다 옅은 면 · 줄을 누르면 실천 시트', () => {
  const h = src('src/screens/area/HabitWeek.tsx');
  const table = slice(h, 'export const HabitWeek = memo(');
  assert.equal((table.match(/\{dayLetter\(i\)\}/g) || []).length, 1);
  assert.match(table, /\{i === today && <TodayTint M=\{M\} inset=\{0\} \/>\}/);
  assert.match(table, /i === today \? M\.ink : i === SUNDAY_INDEX \? M\.signal : M\.print/);
  assert.match(table, /accessibilityElementsHidden\s+importantForAccessibility="no-hide-descendants"/);
  const rowSrc = slice(h, 'const WeekRow = memo(', 'export const HabitWeek = memo(');
  assert.match(rowSrc, /const tint = i === todayIndex \? <TodayTint M=\{M\} inset=\{HABIT_WEEK\.todayInset\} \/> : null;/);
  assert.match(h, /borderRadius: HABIT_WEEK\.todayRadius, backgroundColor: M\.tile/);
  // 줄 = 단추(바깥은 누르기만, 읽기는 이름이 — 오늘 줄과 같은 짜임)
  assert.match(rowSrc, /<Pressable\s+onPress=\{open\}\s+accessible=\{false\}/);
  assert.match(rowSrc, /accessibilityRole=\{open \? 'button' : undefined\}/);
  assert.match(rowSrc, /accessibilityActions=\{open \? \[\{ name: 'activate' \}\] : undefined\}/);
  assert.match(table, /a\.onOpen === b\.onOpen/);
  assert.match(src('src/screens/area/AreaPage.tsx'), /onToggle=\{onHabit\} onOpen=\{onCell\}/);
});

// ── 3. 처음 표의 권하는 글 ──────────────────────────────────────────────────────

test('처음 표: 권하는 글은 한 줄에 하나씩(kit Row, 칸 편집 창의 줄과 같은 부품) — 옆으로 나눈 낱칸 · 줄여 그리기는 없다', () => {
  const g = src('src/screens/GridScreen.tsx');
  const first = slice(g, 'const FirstRun = memo(', '// ── 가운데 블록 크게');
  assert.match(first, /<Row\s+key=\{t\}\s+M=\{M\}\s+bare\s+title=\{t\}\s+divider=\{i > 0\}/);
  assert.match(first, /onPress=\{\(\) => onPick\(t\)\}/);
  assert.match(first, /accessibilityLabel=\{m\.chart\.suggestSay\(\{ text: t, n: ai \+ 1 \}\)\}/);
  assert.doesNotMatch(g, /SuggestTile|adjustsFontSizeToFit|pickGap|pickH/);
  assert.doesNotMatch(first, /flexDirection: 'row', gap: INVITE/);
  // 칸 편집 창의 '이런 실천은 어때요'도 같은 줄
  assert.match(src('src/overlays/CellEditor.tsx'), /<Row key=\{s\} M=\{M\} bare title=\{s\} divider=\{i > 0\}/);
});

test('처음 표: 이름을 바꿔 맞는 예시가 없는 영역에는 범용 예시를 권하지 않는다 — 기본 영역은 세 언어 모두 그대로 권한다', () => {
  const g = src('src/screens/GridScreen.tsx');
  assert.match(g, /if \(!exampleGroup\(area\)\) return \[\];\s*const have = new Set\(taken\.split\('\\n'\)\.filter\(Boolean\)\);\s*return suggestActions\(area\)/);
  for (const l of LANGS) {
    for (const t of seedTitles(l)) {
      assert.ok(exampleGroup(t), `${l} '${t}'`);
      assert.ok(suggestActions(t, l).length >= 3, `${l} '${t}'`);
    }
  }
  // 주인이 바꾼 이름 — 맞는 무리가 없으면 범용 예시가 나오던 자리
  for (const t of ['달리기', '기록', '우리 집', '영역 3', 'Restaurants to try']) {
    assert.equal(exampleGroup(t), null, t);
    assert.deepEqual(suggestActions(t, 'ko'), ['매일 10분 투자하기', '주 3회 실천하기', '10분만 해 보기'], t);
  }
});

// ── 4. 처음 화면 ───────────────────────────────────────────────────────────────

test("처음 화면: 목표 칸에 커서, 주 단추는 늘 '시작하기'(비어 있으면 꺼진 모습), '목표는 나중에'는 글 링크", () => {
  const onb = src('src/screens/Onboarding.tsx');
  // 커서 — 화면 읽기를 쓰면 질문부터 듣도록 옮기지 않는다
  assert.match(onb, /const \[autoFocus\] = useState\(\(\) => !screenReader\(\)\);/);
  assert.match(onb, /autoFocus=\{autoFocus\}/);
  // 주 단추의 글은 '시작하기' 또는 '이 표로 시작하기'뿐
  const cta = slice(onb, 'const ready = ', '// 키보드가 올라와');
  assert.match(cta, /const ready = !!typed \|\| !!picked;/);
  assert.match(cta, /\? \{ label: o\.startTemplate, hint: o\.startTemplateHint\(\{ name: picked\.name \}\) \}\s*: \{ label: o\.start, hint: o\.startHint \};/);
  assert.doesNotMatch(cta, /o\.later/);
  assert.match(onb, /<Button\s+testID=\{TID\.onbStart\}\s+M=\{M\}\s+label=\{cta\.label\}\s+accessibilityHint=\{cta\.hint\}\s+disabled=\{!ready\}\s+onPress=\{start\}/);
  // 꺼진 단추는 옅은 면 + 인쇄 색 글씨(common Button)
  assert.match(src('src/components/common.tsx'), /const colors: ButtonColors = disabled\s*\? \{ bg: M\.tile, fg: M\.print \}/);
  // '목표는 나중에 쓸게요' — 비어 있을 때만, 템플릿 링크 옆의 글 링크(예전 TID 그대로: 흐름 · 스모크가 누른다)
  assert.match(onb, /\{!ready && \(\s*<TextLink M=\{M\} testID=\{TID\.onbNext\} label=\{o\.later\} hint=\{o\.laterHint\} onPress=\{start\} icon=\{null\} role="button" \/>\s*\)\}/);
  assert.ok(onb.indexOf("testID={TID.onbTemplate(picked ? picked.id : 'pick')}") < onb.indexOf('testID={TID.onbNext}'), '템플릿 링크 다음에');
  for (const l of LANGS) {
    const o = msg(l).onboarding;
    for (const k of ['start', 'startHint', 'later', 'laterHint', 'startTemplate', 'fromTemplate', 'otherTemplate']) assert.ok(o[k], `${l}.${k}`);
  }
  assert.equal(msg('ko').onboarding.start, '시작하기');
  // 기기 흐름: 적은 뒤에는 onb-next가 없고 onb-start로 시작한다
  const flow = src('.maestro/common/onboard.yaml');
  assert.match(flow, /id: "onb-next"\s+optional: true/);
  assert.match(flow, /- tapOn:\s+id: "onb-start"/);
});

// ── 5. 지난 마감 ───────────────────────────────────────────────────────────────

test("지난 마감: 좁은 자리에 말로 — '2일 지남' · '2日超過' · '2d overdue'(남은 마감은 예전 그대로 'D-2')", () => {
  assert.equal(msg('ko').fmt.dueOver({ days: -2 }), '2일 지남');
  assert.equal(msg('ja').fmt.dueOver({ days: -2 }), '2日超過');
  assert.equal(msg('en').fmt.dueOver({ days: -2 }), '2d overdue');
  for (const l of LANGS) {
    const f = msg(l).fmt;
    for (let n = 1; n <= 400; n += 7) assert.ok(f.dueOver({ days: -n }).includes(String(n)), `${l} ${n}`);
    assert.equal(f.dueOver({ days: -3.4 }), f.dueOver({ days: -3 }), l);
    // 남은 마감 · 오늘은 짧은 꼴 그대로
    assert.notEqual(f.dueShort({ days: 2 }), f.dueOver({ days: -2 }), l);
  }
  assert.equal(msg('ko').fmt.dueShort({ days: 2 }), 'D-2');
  // 실천 시트의 긴 말과 같은 낱말
  assert.ok(msg('ko').fmt.dueLong({ days: -2 }).endsWith(msg('ko').fmt.dueOver({ days: -2 })));
});

test('지난 마감: 오늘 줄(홈 · 오늘)의 오른쪽 글이 신호색 — 남은 마감은 먹 그대로', () => {
  const row = src('src/components/TodayRow.tsx');
  assert.match(row, /const over = dueDays < 0;\s*right = \{ kind: 'due', text: over \? msg\(\)\.fmt\.dueOver\(\{ days: dueDays \}\) : fmtDue\(dueDays, 'short'\), over \};/);
  assert.match(row, /const rightTone = rightText\?\.kind === 'print' \? 'print' : rightText\?\.kind === 'due' && rightText\.over \? 'signal' : 'ink';/);
  assert.match(row, /<RowRight M=\{M\} text=\{rightText\.text\} tone=\{rightTone\} alone=\{!meta\} \/>/);
  const kit = src('src/components/kit/Row.tsx');
  assert.match(kit, /export type RowRightTone = 'ink' \| 'print' \| 'signal';/);
  assert.match(kit, /const color = tone === 'print' \? M\.print : tone === 'signal' \? M\.signal : M\.ink;/);
  // 신호색은 종이 위 글씨로도 읽힌다(밝게 5.34 · 어둡게 4.93 — a-tokens가 값을 본다)
  assert.notEqual(LIGHT.signal, LIGHT.ink);
  assert.notEqual(DARK.signal, DARK.ink);
});

// ── 6. 화면 읽기 ───────────────────────────────────────────────────────────────

test("뒤로 가기: 하는 일을 먼저, 그다음 돌아갈 곳('뒤로 가기, 홈') — 도움말로 미루지 않는다", () => {
  const back = slice(src('src/components/common.tsx'), 'function BackLink(', 'type HeaderProps');
  assert.match(back, /const say = text && text !== m\.common\.back \? `\$\{m\.core\.back\}\$\{m\.core\.listSep\}\$\{text\}` : m\.core\.back;/);
  assert.match(back, /accessibilityLabel=\{say\}/);
  assert.doesNotMatch(back, /accessibilityHint/);
  const say = (l, dest) => `${msg(l).core.back}${msg(l).core.listSep}${dest}`;
  assert.equal(say('ko', msg('ko').core.tabHome), '뒤로 가기, 홈');
  assert.equal(say('en', msg('en').core.tabHome), 'Back, Home');
  assert.ok(say('ja', msg('ja').core.tabHome).startsWith('戻る、'));
  // 보이는 글이 든 이름 — 음성 제어로 '홈'을 불러도 맞는다
  for (const l of LANGS) assert.ok(say(l, msg(l).core.tabHome).includes(msg(l).core.tabHome), l);
});

test("영역 화면: '영역 3 / 8'은 말로 읽는다('8개 영역 중 세 번째') — 머리 위 줄 · ··· 시트의 둘째 줄", () => {
  const p = src('src/screens/area/AreaPage.tsx');
  // 보이는 글은 그대로
  assert.equal((p.match(/m\.chart\.areaOf\(\{ n: ti \+ 1 \}\)/g) || []).length, 2);
  // 머리: 위 줄이 보일 때(뒤로 가기가 없는 펼침 오른쪽 쪽) 한 덩어리로 — 이름 · 서수 · 달성
  assert.match(p, /accessibilityLabel=\{onBack \? undefined : `\$\{m\.chart\.pageSay\(\{ name: title, n: ti \+ 1 \}\)\}\$\{m\.chart\.sep\}\$\{m\.chart\.areaDoneSay\(\{ done: p\.done, days: 0 \}\)\}`\}/);
  // ··· 시트 머리: 두 줄을 말로
  const more = slice(p, 'function AreaMore(', 'function AreaMoreRows(');
  assert.match(more, /sub=\{m\.chart\.areaOf\(\{ n: ti \+ 1 \}\)\}[\s\S]{0,160}accessibilityLabel=\{m\.chart\.pageSay\(\{ name: areaTitle\(doc, ti\), n: ti \+ 1 \}\)\}/);
  assert.equal(msg('ko').chart.pageSay({ name: '건강', n: 3 }), '건강, 8개 영역 중 세 번째');
  for (const l of LANGS) {
    const said = msg(l).chart.pageSay({ name: 'X', n: 3 });
    assert.doesNotMatch(said, /\//, `${l}: ${said}`);
    assert.match(msg(l).chart.areaOf({ n: 3 }), /3.*8/, l);
  }
  // 넘기기 줄의 '1 / 8'은 예전부터 서수로 읽는다
  assert.match(p, /accessibilityLabel=\{m\.chart\.areaOrdinalSay\(\{ n: ti \+ 1 \}\)\}/);
});

// ── 7. 웹 ─────────────────────────────────────────────────────────────────────

test('웹: 쓰는 칸의 포커스 줄은 칸의 글자 색(먹) — 없앤 골드를 손으로 적지 않는다', () => {
  const css = code('src/lib/webStyle.ts');
  assert.match(css, /box-shadow: inset 0 -2px 0 currentColor !important;/);
  assert.doesNotMatch(css, /176,\s*136,\s*60|rgba?\(/);
  // 쓰는 칸의 글은 먹(ink 토큰) — currentColor가 곧 먹
  assert.match(src('src/components/kit/Field.tsx'), /\{ flex: 1, minWidth: 0, color: M\.ink,/);
});

test('웹: 체크 칸의 누르는 자리 44 — hitSlop이 없어 안쪽 여백으로 넓히고 같은 만큼 바깥 여백을 뺀다(그린 자리는 그대로)', () => {
  const box = src('src/components/kit/CheckBox.tsx');
  assert.match(box, /const WEB = Platform\.OS === 'web';/);
  assert.match(box, /style=\{WEB \? \{ padding: g\.hit, margin: -g\.hit \} : undefined\}/);
  // 기기는 예전 그대로 hitSlop, 웹의 체크 상태는 aria-checked
  assert.match(box, /hitSlop=\{g\.hit\}/);
  assert.match(box, /aria-checked=\{isChecked\(state\)\}/);
  for (const size of [24, 20, 14]) {
    const g = checkGeometry(size);
    assert.equal(size + 2 * g.hit, 44, `${size}: 누르는 자리`);
    assert.equal(size + 2 * g.hit - 2 * g.hit, size, `${size}: 자리를 차지하는 크기는 그대로`);
  }
});
