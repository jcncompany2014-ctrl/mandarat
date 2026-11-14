// A-S3 — 디자인 A의 오늘 · 하루 마감(docs/design/build-plan.md §1 today.png · dayclose.png, 패키지 S3).
// 순수 계산(lib/todayList)은 값으로, 화면(.tsx)은 RN 없이 불러올 수 없어 소스의 모양으로 본다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { msg } = require('../src/i18n');
const L = require('../src/lib/todayList');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const slice = (s, start, end) => {
  const i = s.indexOf(start);
  assert.ok(i >= 0, `missing: ${start}`);
  const j = end ? s.indexOf(end, i + start.length) : -1;
  return s.slice(i, j > i ? j : undefined);
};
/** 주석을 뺀 코드 */
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const WED = new Date(2026, 9, 14, 21, 40); // 수요일 오후 9:40 — 이번 주는 10/12(월) ~ 10/18(일)

// ── 순수 계산 ────────────────────────────────────────────────────────────────

test('자리 — 목업 today.html · dayclose.html의 값', () => {
  const S = L.TODAY_SPACE;
  assert.equal(S.filterTop, 6); // .filters margin-top
  assert.equal(S.moreTop, 6); // .more margin-top
  assert.deepEqual([S.heroTop, S.promptTop, S.noteTop], [30, 4, 2]); // .close · .t-prompt · .t-note
  assert.equal(S.foldTop, 36); // .sec
  assert.deepEqual([S.foldAreaGap, S.foldDyeGap], [10, 4]); // .fold span + span · .a-dye
  assert.deepEqual([S.module, S.labelGap, S.fieldGap, S.line], [28, 8, 20, 52]); // .module · label + seg · .gap · .a-line
  assert.deepEqual([S.week, S.weekHead], [32, 6]); // .week · .week .a-section
  assert.equal(L.CLOSE_WAIT, 650);
});

test('하루 마감은 SE(375×667)에서 탭 막대 위에 접은 줄까지 들어온다', () => {
  const S = L.TODAY_SPACE;
  // 상태 막대 20 · 머리 72 · 큰 숫자 56 · 문장 30 · 글 18 · 구역 머리 18 + 6 · 접은 줄 54
  const bottom = 20 + 72 + S.heroTop + 56 + S.promptTop + 30 + S.noteTop + 18 + S.foldTop + 18 + 6 + 54;
  assert.ok(bottom < 667 - (58 + 18), `${bottom}`); // 떠 있는 탭 막대(58, 아래 18) 위
});

test('중점 줄이 먼저 — 나머지는 목록 순서, 끝낸 줄도 제자리', () => {
  const items = [
    { key: '0-1', done: true }, { key: '1-0', done: false }, { key: '0-3', done: false }, { key: '2-2', done: true },
  ];
  assert.deepEqual(L.focusFirst(items, ['0-3', '2-2']).map((x) => x.key), ['0-3', '2-2', '0-1', '1-0']);
  assert.deepEqual(L.focusFirst(items, []).map((x) => x.key), ['0-1', '1-0', '0-3', '2-2']);
  // 목록에 없는 중점 칸은 아무 일도 하지 않는다
  assert.deepEqual(L.focusFirst(items, ['7-7']).map((x) => x.key), ['0-1', '1-0', '0-3', '2-2']);
  assert.notEqual(L.focusFirst(items, []), items, '새 배열');
});

test('접은 줄 — 앞 두 줄 + 외 n개(ko · ja · en)', () => {
  const ten = ['이력서 갱신', '주 3회 운동', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  assert.equal(L.foldTitle(ten, 'ko'), '이력서 갱신, 주 3회 운동 외 8개');
  assert.equal(L.foldTitle(['산책'], 'ko'), '산책');
  assert.equal(L.foldTitle(['산책', '물'], 'ko'), '산책, 물');
  assert.equal(L.foldTitle(['Walk', 'Read', 'Call'], 'en'), 'Walk, Read + 1 more');
  assert.equal(L.foldTitle(['散歩', '読書', 'a', 'b'], 'ja'), '散歩、読書 ほか2つ');
});

test('마감 글 — 우리말 수, 마감 시각은 알 때만', () => {
  assert.equal(L.closeNote(10, WED, 'ko'), '열 가지를 모두 했어요 · 오후 9:40 마감');
  assert.equal(L.closeNote(10, null, 'ko'), '열 가지를 모두 했어요');
  assert.equal(L.closeNote(1, null, 'ko'), '한 가지를 했어요');
  assert.equal(L.closeNote(3, null, 'ko'), '세 가지를 모두 했어요');
  assert.equal(L.closeNote(12, null, 'ko'), '12가지를 모두 했어요');
  assert.equal(L.closeNote(10, WED, 'en'), 'All 10 done · closed at 9:40 PM');
  assert.equal(L.closeNote(1, null, 'en'), 'The one thing is done');
  assert.equal(L.closeNote(3, WED, 'ja'), '3つ、全部できました・21:40 締め');
  assert.equal(msg('ko').today.closeTitle, '오늘은 여기까지예요.');
  assert.equal(msg('ko').today.listTitle, '오늘 할 일');
  assert.equal(msg('ko').today.viewsLabel, '보기 방식');
});

test('이번 주 막대 — 월~일, 아직 오지 않은 날은 null, 홈과 같은 셈(그날 기록 수)', () => {
  const dayLog = { '2026-10-12': ['0-0', '0-1', '1-0'], '2026-10-13': ['0-0', '2-0', '3-0'], '2026-10-14': Array(10).fill('x'), '2026-10-16': ['9-9'] };
  const counts = L.weekBarCounts(dayLog, WED);
  assert.deepEqual(counts, [3, 3, 10, null, null, null, null]);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(L.weekDow), [1, 2, 3, 4, 5, 6, 0]);
  assert.equal(L.weekBarsLabel(counts, 2, 'ko'), '이번 주 16번, 월요일 3번, 화요일 3번, 수요일 10번, 오늘');
  assert.equal(L.weekBarsLabel(counts, 2, 'en'), 'This week 16 times, Monday 3 times, Tuesday 3 times, Wednesday 10 times, today');
  // 일요일엔 일곱 날 모두
  assert.equal(L.weekBarCounts({}, new Date(2026, 9, 18)).filter((n) => n == null).length, 0);
});

// ── 화면 ─────────────────────────────────────────────────────────────────────

test('머리 — 날짜 · 오늘 · 1/10 · ···(TID.todayModes, 보기 방식 시트). 하루 마감이면 숫자는 머리에서 빠진다', () => {
  const s = src('src/screens/Today.tsx');
  assert.match(s, /export const Today = memo\(function Today\(/);
  assert.match(s, /\{ glyph: 'dots', onPress: openViews, label: m\.today\.viewsLabel, testID: TID\.todayModes \}/);
  assert.match(s, /<PureHeader M=\{M\} eyebrow=\{m\.fmt\.dateLong\(\{ d: now \}\)\} title=\{m\.today\.screenTitle\} figure=\{figure\} figureLabel=\{figureLabel\} action=\{action\} \/>/);
  // 숫자는 소리로 '오늘 할 일 10개 중 1개 했어요'('1/10'은 날짜로 읽힌다)
  assert.match(s, /const figureLabel = figure \? \(done >= total \? m\.home\.todayAll\(\{ total \}\) : m\.home\.todayOf\(\{ total, done \}\)\) : undefined;/);
  assert.match(s, /const figure = total > 0 && !\(listView && close\.shown\) \? `\$\{done\}\/\$\{total\}` : undefined;/);
  // 예전 글자 탭 · 집계 숫자 · 집계 네모는 없다
  assert.doesNotMatch(s, /TextTabs|IndexTabs|const Counter|TALLY_BOX|ProgressBar/);
  // 보기 방식 — 고르기 줄(라디오) 셋, 고르면 시트가 내려간다
  const views = slice(s, 'function ViewChoices(', '// ── 모든 보기 아래');
  assert.match(views, /<View accessibilityRole="radiogroup">/);
  assert.match(views, /\{MODES\.map\(\(v, i\) => \(\s*<ChoiceRow/);
  assert.match(views, /onPress=\{\(\) => \{ onPick\(v\); dismiss\(true\); \}\}/);
  assert.match(s, /const MODES: readonly Mgmt\[\] = \['일일 체크', '습관 스트릭', '칸반'\];/);
});

test('목록 — 거르기 줄 하나(kit FilterLine), 중점 먼저 · 끝낸 줄은 제자리, 더 고르기는 체크 칸 자리의 + 줄', () => {
  const s = src('src/screens/Today.tsx');
  const list = slice(s, 'function TodayList(', '/** 하루 마감의 머리');
  assert.match(list, /focusFirst\(list, focus\)/);
  assert.match(list, /rightPrint=\{r\.focus \? m\.today\.weekFocusMark : undefined\}/);
  // '했어요' 묶음으로 내려 보내지 않는다
  assert.doesNotMatch(s, /useSettle|finished|DoneHead|sunk/);
  assert.match(list, /\{tabs\.length > 1 \? \(\s*<PureFilter/);
  assert.match(list, /a11yLabel: m\.core\.labelCount\(\{ label, n: t\.count \}\)/);
  assert.match(list, /bleed=\{GEO\.gutter\}/);
  const more = slice(list, '{showPick && (', '/>\n      )}');
  assert.match(more, /lead=\{<Icon name="plus" size=\{18\} color=\{M\.ink\} \/>\}/);
  assert.match(more, /accessibilityRole="button"\s+accessibilityLabel=\{m\.today\.pickMore\}/);
  assert.match(more, /onPress=\{\(\) => \{ tap\(\); openPick\(\); \}\}/);
  // 줄은 TodayRow(kit 줄 뼈대 · 체크 · 되돌리기 · testID는 TodayRow가 맡는다)
  assert.match(list, /<TodayRow\s+key=\{r\.key\}/);
});

test('하루 마감 — 큰 숫자 48/56 · 한 문장 · 글, 접은 한 줄(끝낸 칸 + 영역 표시), 두 줄 괘선은 없다', () => {
  const s = src('src/screens/Today.tsx');
  const hero = slice(s, 'const CloseHero = memo(', '/** 접은 목록의');
  assert.match(hero, /ROLE\.closeFigure/);
  assert.match(hero, /ROLE\.prompt, \{ color: M\.ink, marginTop: S\.promptTop \}/);
  assert.match(hero, /ROLE\.note, \{ color: M\.print, marginTop: S\.noteTop \}/);
  assert.match(hero, /accessible accessibilityLabel=\{`\$\{m\.today\.closeTitle\} \$\{speech\}`\}/);
  const fold = slice(s, 'const FoldRow = memo(', '// ── 빈 목록');
  assert.match(fold, /<CheckBox M=\{M\} state="done" \/>/);
  assert.match(fold, /<DyeMark M=\{M\} area=\{a\.ti\} style=\{\{ marginRight: S\.foldDyeGap \}\} \/>/);
  assert.match(fold, /accessibilityLabel=\{m\.today\.foldLabel\(/);
  assert.doesNotMatch(code(s), /height: 1, backgroundColor: M\.ink|scaleX/);
  // 마감 시각 — 이 화면에서 마감 신호를 받았고(CloseWatch) 문서가 마감한 날로 적었을 때만
  const watch = slice(s, 'function CloseWatch(', '/**\n * 하루 마감 — 다 한 날');
  assert.match(watch, /const \{ dayCloseTick, closedDay \} = useUIState\(\);/);
  assert.match(watch, /if \(closedDay !== day\) return;\s*closeMemo = \{ day, at: new Date\(\) \};/);
  assert.match(s, /at: closedInDoc && closeMemo\?\.day === day \? closeMemo\.at : null/);
  assert.match(s, /useDayClose\(complete, day, !!doc\.closedDays\?\.includes\(day\)\)/);
  // 방금 다 했으면 체크 획이 그어진 뒤 접는다 · 동작 줄이기면 바로 · 스크린리더면 펼친 채로
  const hook = slice(s, 'function useDayClose(', '// ── 목록');
  assert.match(hook, /setTimeout\(\(\) => \{ animateLayout\(\); fold\(\); \}, CLOSE_WAIT\)/);
  assert.match(hook, /if \(reducedMotion\(\)\) \{ fold\(\); return; \}/);
  assert.match(hook, /if \(screenReader\(\)\) setOpen\(true\);/);
  // Today 본문은 화면 상태를 읽지 않는다(시트가 열릴 때마다 다시 그리지 않게) — CloseWatch만
  const body = slice(s, 'export const Today = memo(', '// ── 하루 마감');
  assert.doesNotMatch(body, /useUIState\(/);
});

test('모든 보기 아래 — 오늘 기분(Segment 낱칸) · 한 줄(Field 52) · 이번 주(WeekBars)', () => {
  const s = src('src/screens/Today.tsx');
  const block = slice(s, 'const DayBlock = memo(', '/** 저장을 미루는 시간');
  assert.match(block, /<Section M=\{M\} tone="label" label=\{m\.today\.moodTitle\}/);
  assert.match(block, /<Section M=\{M\} tone="label" label=\{m\.today\.lineTitle\}/);
  assert.match(block, /<WeekBars days=\{days\} accessibilityLabel=\{weekBarsLabel\(counts, todayIndex\)\} \/>/);
  assert.match(block, /meta=\{m\.fmt\.times\(\{ n: total \}\)\}/);
  const mood = src('src/components/MoodRow.tsx');
  assert.match(mood, /MOOD_WORDS\.map/);
  assert.match(mood, /variant="tiles"/);
  assert.match(mood, /role="radio"/);
  assert.doesNotMatch(mood, /Svg|ellipse/);
  const line = slice(s, 'const Reflection = memo(', undefined);
  assert.match(line, /<Field\s+M=\{M\}\s+variant="small"/);
  assert.match(line, /style=\{\{ minHeight: S\.line \}\}/);
  assert.match(line, /maxLength=\{120\}/);
  // 저장 규칙은 그대로 — 400ms 쉬면 · 칸을 떠나면 · 앱이 뒤로 가면
  assert.match(s, /const IDLE_MS = 400;/);
  assert.match(line, /onBlur=\{\(\) => \{ focused\.current = false; commit\(\); \}\}/);
  assert.match(line, /AppState\.addEventListener\('change', \(s\) => \{ if \(s !== 'active'\) commit\(\); \}\)/);
});

test('연속 기록 · 보드 — 카드 없이 목록과 같은 줄(kit), 요일 칸은 DayBoxes, 훅은 빈 목록 전에', () => {
  const s = src('src/screens/TodayModes.tsx');
  for (const name of ['MindWeek', 'TodayStreak', 'TodayKanban']) assert.match(s, new RegExp(`export function ${name}\\(\\{ M \\}: \\{ M: M \\}\\)`));
  const streak = slice(s, 'export function TodayStreak(', 'if (rows.length === 0) {');
  assert.match(streak, /const \{ fontScale \} = useWindowDimensions\(\);/);
  const line = slice(s, 'const StreakLine = memo(', '// ── 보드');
  // 체크 칸은 kit CheckBox(체크 상자 · 44pt) — 이름 · 힌트는 그대로
  assert.match(line, /<CheckBox\s+M=\{M\}\s+state=\{done \? 'done' : 'open'\}\s+area=\{ti\}\s+onPress=\{onToggle\}\s+accessibilityLabel=\{checkLabel\}\s+accessibilityHint=\{checkHintText\(done, 'habit'\)\}/);
  assert.match(line, /accessibilityActions=\{\[\{ name: 'activate', label: m\.today\.openAction \}, \{ name: 'toggle', label: done \? m\.today\.undoDone : m\.today\.markDone \}\]\}/);
  assert.match(line, /<RowRight M=\{M\} text=\{run\.text\} tone=\{run\.text === '—' \? 'print' : 'ink'\} \/>/);
  const card = slice(s, 'const KanbanCard = memo(', '}, sameProps);');
  assert.match(card, /onPress=\{onAdvance\}\s+onLongPress=\{onOpen\}\s+delayLongPress=\{350\}\s+accessibilityRole="button"/);
  assert.match(card, /accessibilityHint=\{hint\}/);
  assert.match(card, /\{ name: 'focus', label: m\.today\.focus25 \}/);
  assert.match(card, /<CheckBox M=\{M\} state=\{done \? 'done' : 'open'\} area=\{ti\} \/>/);
  // 구역 머리는 화면 읽기 한 마디('진행 중 2개')
  assert.match(s, /accessibilityRole="header"\s+accessibilityLabel=\{columnHead\(label, colCards\.length\)\}/);
  // 마음가짐 점수는 1~5 낱칸(RatingBoxes fill — Segment 낱칸과 같은 칠)
  assert.match(s, /<RatingBoxes M=\{M\} value=\{score\} label=\{m\.today\.mindRateLabel\(\{ text \}\)\} onRate=\{rate\} fill \/>/);
});

test('색은 토큰만 — 오늘 화면 · 보기 · 기분 줄에 손으로 쓴 색 · 신호색 · 예전 표시색이 없다', () => {
  for (const f of ['src/screens/Today.tsx', 'src/screens/TodayModes.tsx', 'src/components/MoodRow.tsx']) {
    const c = code(src(f));
    assert.doesNotMatch(c, /#[0-9A-Fa-f]{3,8}\b|rgba?\(/, f);
    assert.doesNotMatch(c, /M\.(signal|gold|accent|sub|line|bg)\b|alertInk|legibleMark/, f);
  }
});
