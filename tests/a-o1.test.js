// O1 · 칸 편집(docs/design/build-plan.md §1 editor · 목업 docs/design/mockups/a/editor.png · parts-sheets.js|css).
// 떠 있는 시트 한 장: 머리(위치 표 · ■ 영역 · 실천 3/8 · 닫기), 입력 칸이 먼저(글자 수), 유형 분절 선택기 + 한 줄 안내,
// 그 유형에 필요한 무리만(반복 · 알림 / 마감 / 숫자 칸). 고르기는 세 가지뿐(분절 선택기 · 요일 칸 · 고르기 줄),
// 색은 그 영역의 색(표시 · 위치 표)뿐, 먹 주 단추 하나.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { msg } = require('../src/i18n');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
/** 주석을 뺀 소스 */
const code = (f) => src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const ED = 'src/overlays/CellEditor.tsx';
const ed = code(ED);
const fn = (name, next) => ed.slice(ed.indexOf(`function ${name}(`), next ? ed.indexOf(`function ${next}(`) : undefined);

test('O1: 새 시트(pad + 머리 줄) — 머리는 위치 표 · 영역 표시 · 두 줄 · 닫기(editorClose), 소리는 한 덩어리', () => {
  assert.match(ed, /<Sheet\s+M=\{M\}\s+pad\s+ownClose\s+header=\{<EditorHead M=\{M\} editor=\{editor\} doc=\{doc\} speech=\{m\.speech\} \/>\}/);
  const head = fn('EditorHead', 'Group');
  // 머리는 common의 SheetHeader(48 · 위치 표 · 두 줄 17 · 닫기 −10) — 두 줄은 한 덩어리의 머리(header)로 speech를 읽는다
  assert.match(head, /<SheetHeader\s+M=\{M\}\s+leading=\{<Locator themes=\{doc\.themes\} block=\{ti \?\? 'core'\} at=\{editor\.kind === 'action' \? editor\.ai : 'head'\} \/>\}/);
  // 영역 표시는 영역 번호로 — 색은 SheetHeader가 그 영역의 dye에서 고른다
  assert.match(head, /area=\{ti \?\? undefined\}/);
  assert.match(head, /accessibilityLabel=\{speech\}/);
  assert.match(head, /ed\.actionN\(\{ n: editor\.ai \+ 1 \}\)/);
  assert.match(head, /closeTestID=\{TID\.editorClose\}/);
  const c = code('src/components/common.tsx');
  assert.match(c, /accessibilityRole=\{accessibilityLabel \? 'header' : undefined\}\s+accessibilityLabel=\{accessibilityLabel\}/);
  assert.match(c, /<CloseBtn M=\{M\} onPress=\{onClose \?\? \(\(\) => dismiss\(\)\)\} testID=\{closeTestID \?\? TID\.sheetClose\} \/>/);
});

test('O1: 입력 칸이 먼저 — 부품 상자 Field(editorText, 글자 수 n/max), 아래 안내 한 줄(실천: 점검 · 목표/영역: 81칸 어림)', () => {
  assert.match(ed, /<Field\s+ref=\{inputRef\}\s+M=\{M\}\s+testID=\{TID\.editorText\}/);
  assert.match(ed, /count=\{`\$\{text\.length\}\/\$\{m\.max\}`\}/);
  assert.match(ed, /accessibilityHint=\{ed\.charCount\(\{ n: text\.length, max: m\.max \}\)\}/);
  assert.match(ed, /\{action \? <GuideChips M=\{M\} text=\{text\} \/> : preview \? <Note M=\{M\} text=\{preview\} live \/> : null\}/);
  // 입력 칸이 유형보다 위
  assert.ok(ed.indexOf('testID={TID.editorText}') < ed.indexOf('<KindRows'), '입력 칸 → 유형');
  // 점검은 인쇄된 한 줄(시트 안내 400 13/18 print) — 네모 칸 · 체크 획을 더 그리지 않는다
  const g = code('src/components/GuideChips.tsx');
  assert.match(g, /if \(guideScore\(g\) >= 3\) return null;/);
  assert.match(g, /ROLE\.noteSheet, \{ color: M\.print, marginTop: NOTE_GAP \}/);
  assert.match(g, /ed\.coachNote\(\{ noWhat: !g\.what, noHow: !g\.howMuch, noWhen: !g\.when \}\)/);
  assert.doesNotMatch(g, /Svg|TICK_PATH|borderWidth/);
});

test('O1: 고르기는 세 가지뿐 — 분절 선택기(유형 · 반복 · 마감), 요일 칸(DayBoxes), 고르기 줄(알림). 칩 · 밑줄 탭 · 옛 체크는 없다', () => {
  assert.doesNotMatch(ed, /PaperChip|SegmentedControl|<Check\b|variant="underline"/);
  assert.equal((ed.match(/<Segment\b/g) ?? []).length, 3, '유형 · 반복 · 마감');
  assert.match(fn('KindRows', 'HabitRows'), /<Segment\s+M=\{M\}\s+role="radio"\s+value=\{cfg\.kind\}/);
  assert.match(fn('KindRows', 'HabitRows'), /testID: TID\.editorKind\(k\)/);
  assert.match(fn('HabitRows', 'RemindRows'), /options=\{\[\{ value: 'days', label: ed\.byDays \}, \{ value: 'week', label: ed\.byCount \}\]\}/);
  assert.match(fn('HabitRows', 'RemindRows'), /<DayPicker M=\{M\} days=\{days\} keepOne /);
  assert.match(fn('RemindRows', 'StepBtn'), /<ChoiceRow M=\{M\} title=\{t\.notify\.editorNone\}/);
  assert.match(fn('DueRows'), /<Segment\s+M=\{M\}\s+role="radio"\s+value=\{due \?\? ''\}/);
  // 요일 칸: 고른 요일 = chosen(먹 테두리 + 안쪽 먹 획), 영역 색을 쓰지 않는다 · 체크 상자로 읽힌다
  const dp = code('src/components/DayPicker.tsx');
  assert.match(dp, /WEEK_ORDER\.map\(\(d\) => \(set\.has\(d\) \? 'chosen' : 'open'\)\)/);
  assert.match(dp, /role="checkbox"/);
  assert.match(dp, /dayLabel=\{\(i\) => m\.core\.repeatDow\(\{ i: WEEK_ORDER\[i\] \}\)\}/);
  assert.doesNotMatch(dp, /area=|color|readableOn|PaperChip/);
  // 빠른 고르기(매일 · 평일 · 주말)는 무리 이름 줄 오른쪽의 조용한 글 — '매일 반복'으로 읽는다
  assert.match(dp, /accessibilityLabel=\{m\.core\.repeatLabel\(\{ label \}\)\}/);
  assert.match(fn('HabitRows', 'RemindRows'), /right=\{<DayPresets M=\{M\} onPick=/);
  assert.deepEqual(require('../src/i18n').msg('ko').fmt.daysLabel({ dows: [1, 2, 3, 4, 5] }), '평일');
});

test('O1: 색은 그 영역의 색(표시 · 위치 표)뿐 — theme.color · 경고 색 · 맞춤 색을 읽지 않는다, 모두 토큰 이름', () => {
  assert.doesNotMatch(ed, /\.color\b(?!:)|alertInk|readableOn|M\.accent|M\.sub\b|M\.line\b|M\.bg\b/);
  assert.doesNotMatch(ed, /#[0-9A-Fa-f]{3,8}\b|rgba?\(/);
  assert.doesNotMatch(ed, /M\.dye\[|M\.tint\[|M\.wash/);
  // 막힌 숫자 칸은 색이 아니라 먹 테(1.5)와 먹 600 안내로
  assert.match(fn('NumField', 'CountRows'), /borderWidth: INVALID_RING, borderColor: issue \? M\.ink : 'transparent'/);
  assert.match(fn('CountRows', 'DueRows'), /<Note M=\{M\} text=\{note\} live strong=\{!!issue\} \/>/);
});

test('O1: 바닥 — 조용한 글(칸 비우기 · 저장) + 먹 주 단추 하나(editorSave)', () => {
  const foot = ed.slice(ed.indexOf('const footer = ('), ed.indexOf('return (\n    <Sheet'));
  assert.equal((foot.match(/<Button\b/g) ?? []).length, 1);
  assert.doesNotMatch(foot, /variant=|tone=/);
  assert.match(foot, /testID=\{TID\.editorSave\}/);
  assert.match(foot, /gap: SP\.foot/);
  assert.match(ed, /const SP = \{ field: 6, group: 24, label: 8, note: 8, under: 12, pair: 16, pairGap: 12, end: 12, foot: 24 \} as const;/);
});

test('O1: 처음엔 입력 칸 + 유형만 — 반복 · 알림은 습관일 때, 마감은 한 번일 때, 숫자 칸은 쌓기일 때 펼친다', () => {
  const kr = fn('KindRows', 'HabitRows');
  assert.match(kr, /\{cfg\.kind === 'habit' && <HabitRows M=\{M\} cfg=\{cfg\} setCfg=\{setCfg\} onReveal=\{onReveal\} \/>\}/);
  assert.match(kr, /\{cfg\.kind === 'count' && <CountRows /);
  assert.match(kr, /\{cfg\.kind === 'once' && <DueRows /);
  // 핵심 목표 · 영역 이름은 입력 칸만(유형 무리는 실천 칸에서만)
  assert.match(ed, /\{action && \(\s*<KindRows/);
  // 유형 아래 한 줄 — 고른 유형(습관은 요일마다/횟수로)이 '오늘'에 어떻게 담기는지
  assert.match(kr, /<Note M=\{M\} text=\{`\$\{auto \? ed\.autoPicked : ''\}\$\{note\}`\} \/>/);
  assert.match(kr, /normalizeDays\(cfg\.days\)\.length === 0 \? ed\.noteHabitWeek : ed\.noteHabitDays/);
});

test('O1: 알림 고르기 줄 — 고른 줄의 정보는 시각 · 언제(오후 10:30 · 정한 요일마다)', () => {
  const r = fn('RemindRows', 'StepBtn');
  assert.match(r, /const pickMeta = on \? `\$\{t\.fmt\.time\(\{ h: Math\.floor\(at \/ 60\), m: at % 60 \}\)\}\$\{t\.core\.dot\}\$\{when\}` : undefined;/);
  const ko = msg('ko');
  assert.equal(`${ko.fmt.time({ h: 22, m: 30 })}${ko.core.dot}${ko.editor.remindDays}`, '오후 10:30 · 정한 요일마다');
});

test('O1: 마감 빠른 고르기 — 네 칸에 짧은 이름이 375 폭에 들어가고(웹은 줄이지 못한다), 읽는 말은 긴 이름', () => {
  require('./register');
  const I = require('../src/i18n');
  const { textWidth, PRETENDARD_GLYPHS } = require('../src/lib/labelFit');
  const { segmentCells } = require('../src/components/kit/metrics');
  const { GEO } = require('../src/theme/tokens');
  const room = segmentCells(375 - 2 * GEO.sheet.inset - 2 * GEO.sheet.pad, 4).cell - 12;
  for (const l of I.LANGS) {
    const e = I.msg(l).editor;
    for (const t of [e.dueWeek, e.dueMonth, e.due3Months, e.dueYear]) {
      assert.ok(textWidth(t, 14, PRETENDARD_GLYPHS, l) <= room, `${l} '${t}' > ${room}`);
    }
  }
  const d = fn('DueRows');
  assert.match(d, /label: short\[p\.label\] \?\? p\.label,/);
  assert.match(d, /a11yLabel: ed\.dueChipA11y\(\{ label: p\.label, date: fmtDateSpeech\(p\.date, now\) \}\)/);
});

test('O1: 핵심 목표 · 영역 이름 예시는 세 언어 모두 짧다(지도 가운데 칸 3줄 · 머리 칸)', () => {
  assert.equal(msg('ko').editor.centerPlaceholder, '예) 첫 마라톤 완주하기');
  assert.equal(msg('ja').editor.centerPlaceholder, '例）初マラソン完走');
  assert.equal(msg('en').editor.centerPlaceholder, 'e.g. Finish a marathon');
});
