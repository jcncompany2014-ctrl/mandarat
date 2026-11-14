// 패키지 O2(실천 시트) — docs/design/build-plan.md 웨이브 3, 목업 docs/design/mockups/a/sheet.png.
// 이번 주 일곱 칸(주 N회의 앞날도 later) · 남은 날 · '어제도 했어요'는 지난주의 어제만, 새 말(세 언어),
// 그리고 시트가 디자인 A 부품(머리 · 체크 줄 · 요일 칸 · 여는 줄 · 메모 칸)으로 그려지고 예전 동작(TID · 기록 · 소리)을 지키는지 본다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { sheetWeek, weekNote, yesterdayButton, yesterdayOffer, canBackfill } = require('../src/lib/actionSheet');
const { routineWeek, routineWeekCount } = require('../src/lib/routine');
const { msg, LANGS } = require('../src/i18n');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SHEET = 'src/overlays/ActionSheet.tsx';

const WED = new Date(2026, 9, 14); // 수요일 — 이번 주는 10/12(월) ~ 10/18(일)
const MON = new Date(2026, 9, 12);

function doc(a, dayLog = {}) {
  const themes = Array.from({ length: 8 }, (_, i) => ({
    title: `영역${i}`, color: '#478058', icon: 'heart',
    actions: Array.from({ length: 8 }, () => ({ text: '', note: '', done: false })),
  }));
  themes[0].actions[0] = { note: '', done: false, ...a };
  return { centerGoal: '', themes, todayKeys: [], todayExtra: [], dayLog };
}

/** 시트가 하는 대로 — routineWeek · 지난날 누르기 · 주 N회 여부로 일곱 칸 */
function week(d, today, todayIndex) {
  const a = d.themes[0].actions[0];
  return sheetWeek(routineWeek(d, 0, 0, today), todayIndex, (a.perWeek ?? 0) > 0, (i) => canBackfill(a, today, i));
}

test('이번 주 일곱 칸 — 주 N회: 지난날 · 오늘은 빈 칸, 앞날은 later(sheet.png: 월 · 화 · 수 열림, 목~일 later), 남은 날 5일', () => {
  const d = doc({ text: '주 3회 운동', kind: 'habit', perWeek: 3 });
  const w = week(d, WED, 2);
  assert.deepEqual(w.boxes, ['open', 'open', 'open', 'later', 'later', 'later', 'later']);
  assert.deepEqual(w.said, ['off', 'off', 'today', 'planned', 'planned', 'planned', 'planned']);
  assert.equal(w.left, 5);
  const c = routineWeekCount(d, 0, 0, WED);
  assert.equal(weekNote(c.done, c.planned, w.left), '남은 날 5일');
  assert.equal(msg('ko').sheet.weekFigure({ count: c.done, total: c.planned }), '0/3');
});

test('이번 주 일곱 칸 — 주 N회를 채운 주도 오늘은 열리고, 한 마디는 다 했다고', () => {
  const d = doc({ text: '산책', kind: 'habit', perWeek: 2 }, { '2026-10-12': ['0-0'], '2026-10-13': ['0-0'] });
  const w = week(d, WED, 2);
  assert.deepEqual(w.boxes, ['done', 'done', 'open', 'later', 'later', 'later', 'later']);
  const c = routineWeekCount(d, 0, 0, WED);
  assert.equal(weekNote(c.done, c.planned, w.left), '이번 주 몫을 다 했어요');
  // 오늘 한 날은 남은 날에서 빠진다
  const done = week(doc({ text: '산책', kind: 'habit', perWeek: 3 }, { '2026-10-14': ['0-0'] }), WED, 2);
  assert.equal(done.boxes[2], 'done');
  assert.equal(done.left, 4);
});

test('이번 주 일곱 칸 — 요일 습관은 kit 그대로(놓친 날 · 지난 쉬는 날은 눌러 남기는 빈 칸, 앞으로 쉬는 날은 칸 없음)', () => {
  const d = doc({ text: '산책', kind: 'habit', days: [1, 3, 5] });
  const w = week(d, WED, 2);
  assert.deepEqual(w.boxes, ['open', 'open', 'open', 'none', 'later', 'none', 'none']);
  assert.equal(w.left, 2);
  // 습관을 정하기 전의 지난날은 칸이 없고 누르지 못한다
  const since = week(doc({ text: '산책', kind: 'habit', perWeek: 3, since: '2026-10-13' }), WED, 2);
  assert.deepEqual(since.boxes.slice(0, 3), ['none', 'open', 'open']);
  // 오늘이 없는 주
  assert.equal(sheetWeek(routineWeek(d, 0, 0, WED), -1, false).left, 0);
});

test("'어제도 했어요'는 이번 주 칸에 없는 어제(월요일의 어제)만 — 이번 주의 어제는 요일 칸이 맡는다", () => {
  const daily = { text: '산책', kind: 'habit', days: [0, 1, 2, 3, 4, 5, 6] };
  assert.equal(yesterdayOffer(doc(daily), 0, 0, WED), '2026-10-13');
  assert.equal(yesterdayButton(doc(daily), 0, 0, WED), null);
  assert.equal(canBackfill(doc(daily).themes[0].actions[0], WED, 1), true, '화요일 칸을 눌러 남긴다');
  assert.equal(yesterdayButton(doc(daily), 0, 0, MON), '2026-10-11');
  assert.equal(yesterdayButton(doc(daily, { '2026-10-11': ['0-0'] }), 0, 0, MON), null);
  assert.equal(yesterdayButton(doc({ text: '서류', kind: 'once' }), 0, 0, MON), null);
});

test('새 말 — 세 언어에 있고, 한국어는 목업 그대로', () => {
  const ko = msg('ko').sheet;
  assert.equal(ko.headSub({ n: 1 }), '실천 1/8');
  assert.equal(ko.autoMeta, '오늘 할 일에 저절로 담겨요');
  assert.equal(ko.doneToday, '오늘 했어요');
  assert.equal(ko.thisWeek, '이번 주');
  assert.equal(`${ko.weekFigure({ count: 0, total: 3 })}${ko.weekUnit}`, '0/3회');
  assert.equal(ko.daysLeft({ n: 5 }), '남은 날 5일');
  assert.equal(ko.achieve, '이 칸 달성하기');
  assert.equal(ko.achieveHabitHint, '몸에 뱄다면 눌러 주세요');
  assert.equal(ko.focusRow, '25분 집중하기');
  assert.equal(ko.editRow, '칸 편집하기');
  assert.equal(ko.memo, '메모');
  assert.equal(ko.memoPlaceholder, '어떻게 했는지 한 줄 남겨 두세요');
  const keys = ['headSub', 'autoMeta', 'weekFigure', 'weekUnit', 'daysLeft', 'weekMet', 'countSoFar', 'countFigure', 'due', 'setDueRow', 'mindRecent', 'editRow', 'memoPlaceholder'];
  for (const l of LANGS) {
    const s = msg(l).sheet;
    for (const k of keys) assert.ok(k in s, `${l}.sheet.${k}`);
    // 쓰지 않게 된 말은 지웠다
    for (const k of ['edit', 'weekCount', 'focusStart', 'focusRowA11y', 'setDue', 'todayAuto', 'todayAutoA11y']) assert.ok(!(k in s), `${l}.sheet.${k}`);
    assert.ok(s.daysLeft({ n: 0 }).length > 0 && s.daysLeft({ n: 1 }) !== s.daysLeft({ n: 2 }), l);
    assert.equal(weekNote(1, 3, 2, l), s.daysLeft({ n: 2 }));
    assert.equal(weekNote(3, 3, 2, l), s.weekMet);
  }
  assert.equal(msg('en').sheet.daysLeft({ n: 1 }), '1 day left');
  assert.equal(msg('ja').sheet.daysLeft({ n: 5 }), '残り5日');
});

test('시트는 디자인 A 부품으로 — 떠 있는 시트(pad · 머리), 위치 표, 체크 줄, 요일 칸, 여는 줄, 메모 칸', () => {
  const s = src(SHEET);
  assert.match(s, /<Sheet\s+M=\{M\}\s+onClose=\{closeSheet\}\s+ownClose\s+pad\s+header=\{<SheetHead /);
  assert.match(s, /import \{ CheckBox, DayBoxes, DyeMark, Field, LinkRow, Row, Section \} from '\.\.\/components\/kit';/);
  assert.match(s, /<Locator themes=\{doc\.themes\} block=\{ti\} at=\{ai\} \/>/);
  assert.match(s, /<Field\s+M=\{M\}\s+variant="memo"/);
  assert.match(s, /<LinkRow key="focus" M=\{M\} glyph="focus" title=\{m\.sheet\.focusRow\}/);
  assert.match(s, /<LinkRow key="edit" M=\{M\} glyph="pencil" title=\{m\.sheet\.editRow\}/);
  assert.match(s, /<CountBar M=\{M\} pct=\{c\.pct\} area=\{ti\} \/>/);
  assert.match(s, /<RatingBoxes M=\{M\} value=\{score\}[^\n]*fill \/>/);
  // 제목은 주인의 말(title 26/36), 정한 것은 meta, 숫자는 figureField + unit
  assert.match(s, /style=\{\[ROLE\.title, \{ color: M\.ink \}\]\} lineBreakStrategyIOS="hangul-word">\{noOrphan\(text\)\}/);
  assert.match(s, /ROLE\.figureField, NUM/);
  assert.match(s, /ROLE\.unit, \{ color: M\.ink2 \}/);
  // 목업 간격(parts-sheets.css · sheet.html)
  assert.match(s, /const HEAD = \{ h: 48, gap: 12, closeBleed: -10 \} as const;/);
  assert.match(s, /const SP = \{ title: 10, meta: 2, first: 18, group: 24, groupHead: 8, sayH: 30, say: 8 \} as const;/);
  // 예전 그림(괘선 줄 · 영역 색 · 손으로 그린 위치 표 · 예전 글자)은 없다 — 색은 모두 토큰
  for (const re of [/LineRow/, /\bth\.color\b/, /\btint\(/, /sheetBg/, /\bTYPE\b/, /fontSize:/, /fontWeight:/, /#[0-9A-Fa-f]{3,8}\b/, /WeekStrip/, /alertInk/]) {
    assert.doesNotMatch(s, re, String(re));
  }
});

test('예전 동작을 지킨다 — TID, 체크 · 지난날 · 어제 · 쌓기 · 마음가짐 · 담기 · 달성 · 메모 · 소리', () => {
  const s = src(SHEET);
  assert.equal((s.match(/testID=\{TID\.sheetCheck\}/g) ?? []).length, 3, '습관 · 한 번 체크 줄, 쌓기 더하기');
  for (const t of ['sheetFocus', 'sheetEdit', 'sheetClose']) assert.equal((s.match(new RegExp(`testID=\\{TID\\.${t}\\}`, 'g')) ?? []).length, 1, t);
  assert.match(s, /toggleRoutineToday\(ti, ai\)/);
  assert.match(s, /toggleHabitOn\(ti, ai, day\)/);
  assert.match(s, /canBackfill\(a, new Date\(\), i\)/);
  assert.match(s, /onPressDay=\{onPressDay\}/);
  assert.match(s, /onPress=\{\(\) => flip\(yesterday, false\)\}/);
  assert.match(s, /addCount\(ti, ai, d\)/);
  assert.match(s, /announce\(countNowSpeech\(fmtNum\(c\.goal\), fmtNum\(next\), c\.unit\)\)/);
  assert.match(s, /rateMind\(ti, ai, s\)/);
  assert.match(s, /setActionConfig\(ti, ai, \{ \.\.\.before, due: postponedDue\(new Date\(\), which\) \}\)/);
  assert.match(s, /toggleDone\(ti, ai\)/);
  // 오늘 할 일에 담기 — 저절로 담기지 않는 날마다 하는 칸(마음가짐 빼고)만 고름 칸 줄, 저절로 담긴 칸은 정한 것 한 줄이 왜 담겼는지 알려 준다
  assert.match(s, /const daily = kind !== 'mind';/);
  assert.match(s, /if \(daily && !auto\) \{/);
  assert.match(s, /state=\{onToday \? 'chosen' : 'open'\}/);
  assert.match(s, /const explainAuto = \(\) => showToast\(whyAuto\(doc, ti, ai, now\) \|\| m\.sheet\.todayAlready\);/);
  assert.match(s, /\$\{subtitle\}\$\{m\.core\.dot\}\$\{m\.sheet\.autoMeta\}/);
  // 메모 — 쓰다 멈추면 600ms 뒤, 떠날 때, 닫힐 때 · 바뀐 때만
  assert.match(s, /const MEMO_IDLE = 600;/);
  assert.match(s, /useEffect\(\(\) => commit, \[commit\]\);/);
  assert.match(s, /if \(noteChanged\(draftRef\.current, savedRef\.current\)\) writeRef\.current\(ti, ai, draftRef\.current\);/);
  assert.match(s, /onBlur=\{commit\}/);
  // 소리 — '0/3'은 날짜로 읽히므로 소리 말로, 제목은 정한 것까지
  assert.match(s, /accessibilityLabel=\{\[weekCountSpeech\(week\.done, week\.planned\), note\]\.join\(m\.core\.listSep\)\}/);
  assert.match(s, /accessibilityLabel=\{m\.sheet\.countA11y\(\{ said, pct: c\.pct \}\)\}/);
  assert.match(s, /dueSpeech\(due\.days\)/);
  assert.match(s, /summary=\{weekStripSummary\(wk\.said, todayIndex\)\}/);
});

test('줄 묶음의 차례 — 체크 줄 먼저, 여는 줄(꺾쇠) 나중: 마감 정하기 · 담기 · 달성 · 집중 · 편집', () => {
  const s = src(SHEET);
  const rows = s.slice(s.indexOf('function SheetRows('), s.indexOf('// ── 메모'));
  const at = (k) => rows.indexOf(`key="${k}"`);
  const order = ['due', 'today', 'done', 'focus', 'edit'].map(at);
  assert.ok(order.every((x) => x > 0), order.join());
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  // 줄 사이 머리카락 선은 첫 줄 위에 긋지 않는다
  assert.match(rows, /rows\.map\(\(r, i\) => r\(i > 0\)\)/);
});
