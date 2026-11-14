// A-S1 — 홈(디자인 A, docs/design/build-plan.md §1 Home · 패키지 S1, 목업 docs/design/mockups/a/home.png · home-dark.png).
// - lib/home: 머리 위 줄, 히어로 지도 칸 크기, 오늘 할 일에 놓을 줄(중점 먼저 · 다섯 줄까지), 자리 수치.
// - 화면: 머리(헤드라인 핵심 목표 + 설정) · 히어로(숫자 칸 셋 + L1 지도) · 누르는 줄(마무리 · 돌아보기 · 시작하기)
//   · 오늘 할 일 · 이번 주 막대 · 8개 영역 두 단. 큰 날짜 머리 · 正 · 두 줄 괘선은 없다.
// - testID · 화면 읽기 이름 · 누르면 하는 일은 예전 홈 그대로.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { msg } = require('../src/i18n');
const H = require('../src/lib/home');
const { demoDoc, DEMO_DAY } = require('../scripts/smoke/demoDoc');
const { orderedTodayItems } = require('../src/lib/routine');
const { weekPriority } = require('../src/lib/ritual');
const { l1Width } = require('../src/components/chart/geometry');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const dash = () => src('src/screens/Dashboard.tsx');
const WED = new Date(2026, 9, 14, 9);
const r = (key, done = false) => ({ key, done });

// ── lib/home ────────────────────────────────────────────────────────────────

test('HOME — 목업 home.html의 자리 수치(히어로 18 · 24 · 32, 지도 칸 20/18, 장부 28 · 38, 다섯 줄 · 중점 셋)', () => {
  assert.deepEqual(
    { ...H.HOME },
    {
      heroTop: 18, heroGap: 24, heroBelow: 32, heroPadY: 2, fieldGap: 2,
      mapCell: 20, mapCellNarrow: 18, narrowMeasure: 330,
      ledgerGap: 28, ledgerRow: 38, rows: 5, focus: 3, stackScale: 1.35,
    },
  );
  // 390pt 폰의 본문 342 → 칸 20(지도 186), 375pt 폰의 327 → 18(지도 168, §4.5)
  assert.equal(H.heroMapCell(342), 20);
  assert.equal(H.heroMapCell(330), 20);
  assert.equal(H.heroMapCell(329), 18);
  assert.equal(H.heroMapCell(327), 18);
  assert.equal(l1Width(20), 186);
  assert.equal(l1Width(18), 168);
  // 숫자 칸 폭이 남는다(지도 + 사이 24를 빼고 130pt 이상)
  for (const measure of [342, 327]) assert.ok(measure - l1Width(H.heroMapCell(measure)) - H.HOME.heroGap >= 130, `${measure}`);
});

test('homeEyebrow — 날짜(fmt.dateLong) · ISO 주, 언어마다', () => {
  assert.equal(H.homeEyebrow(WED, 'ko'), '10월 14일 수요일 · 42주');
  assert.equal(H.homeEyebrow(WED, 'ja'), '10月14日 水曜日・第42週');
  assert.equal(H.homeEyebrow(WED, 'en'), 'Wednesday, October 14 · Week 42');
  // 해가 바뀌는 주 — ISO 주(2027-01-01 금요일은 2026년 53주)
  assert.equal(H.homeEyebrow(new Date(2027, 0, 1), 'ko'), '1월 1일 금요일 · 53주');
});

test('homeList — 데모 문서는 목업 그대로: 중점 둘(하나는 체크 칸 없이) · 남은 일 둘 · 오늘 한 일 하나', () => {
  const doc = demoDoc();
  const rows = orderedTodayItems(doc, DEMO_DAY).map((i) => r(i.key, i.done));
  const out = H.homeList(rows, weekPriority(doc, DEMO_DAY));
  const text = (k) => { const [ti, ai] = k.split('-').map(Number); return doc.themes[ti].actions[ai].text; };
  assert.deepEqual(out.pinned.map((p) => [text(p.key), p.row ? 'box' : 'no box']), [['11시 취침', 'box'], ['친구 모임', 'no box']]);
  assert.deepEqual(out.shown.map((x) => [text(x.key), x.done]), [['이력서 갱신', false], ['주 3회 운동', false], ['하루 물 2L', true]]);
});

test('homeList — 다섯 줄까지, 중점은 셋까지 맨 위, 이 화면에서 체크한 줄은 제자리, 오늘 한 일은 끝에 하나', () => {
  const rows = [r('a'), r('b'), r('c', true), r('d'), r('e'), r('f', true), r('g')];
  // 중점 없음: 남은 일 넷 + 한 일 하나
  let out = H.homeList(rows, []);
  assert.deepEqual(out.pinned, []);
  assert.deepEqual(out.shown.map((x) => x.key), ['a', 'b', 'd', 'e', 'c']);
  // 중점 넷을 골라도 셋까지 — 오늘 목록에 없는 칸은 row null
  out = H.homeList(rows, ['d', '9-9', 'a', 'b']);
  assert.deepEqual(out.pinned.map((p) => [p.key, p.row && p.row.key]), [['d', 'd'], ['9-9', null], ['a', 'a']]);
  assert.deepEqual(out.shown.map((x) => x.key), ['b', 'c']);
  // 같은 키가 두 번 와도 한 줄
  assert.equal(H.homeList(rows, ['a', 'a']).pinned.length, 1);
  // 이 화면에서 체크한 줄(kept)은 남은 일 자리에 그대로 — 한 일 하나는 따로
  const checked = rows.map((x) => (x.key === 'b' ? r('b', true) : x));
  out = H.homeList(checked, [], new Set(['b']));
  assert.deepEqual(out.shown.map((x) => x.key), ['a', 'b', 'd', 'e', 'c']);
  // 다 한 날 — 남은 일이 없으면 한 일 하나만
  out = H.homeList([r('a', true), r('b', true)], []);
  assert.deepEqual(out.shown.map((x) => x.key), ['a']);
  // 자리가 하나뿐이면 한 일보다 남은 일
  out = H.homeList(rows, [], new Set(), 1);
  assert.deepEqual(out.shown.map((x) => x.key), ['a']);
  // 빈 목록
  assert.deepEqual(H.homeList([], []), { pinned: [], shown: [] });
});

// ── 말 ──────────────────────────────────────────────────────────────────────

test('홈의 새 말 — 세 언어, 단위는 그 언어의 셈(en 복수)', () => {
  const ko = msg('ko').home;
  const ja = msg('ja').home;
  const en = msg('en').home;
  assert.deepEqual([ko.heroToday, ko.heroDone, ko.heroLeft, ko.unitCells, ko.unitDays({ n: 78 }), ko.seeAll, ko.weekClosed], ['오늘', '달성', '남은 날', '칸', '일', '전체 보기', '마감']);
  assert.deepEqual([ja.heroToday, ja.heroDone, ja.unitCells, ja.unitDays({ n: 78 }), ja.seeAll], ['今日', '達成', 'マス', '日', 'すべて見る']);
  assert.deepEqual([en.heroToday, en.heroDone, en.unitCells, en.seeAll], ['Today', 'Achieved', 'squares', 'See all']);
  assert.equal(en.unitDays({ n: 1 }), 'day');
  assert.equal(en.unitDays({ n: 78 }), 'days');
  // '중점'은 오늘 화면과 같은 말(today.weekFocusMark)
  assert.equal(msg('ko').today.weekFocusMark, '중점');
});

// ── 화면 ────────────────────────────────────────────────────────────────────

test('머리 — 위 줄 날짜 · 주, 제목 = 핵심 목표(헤드라인), 오른쪽 설정. 큰 날짜 · 두 줄 괘선 · 正 없음', () => {
  const s = dash();
  assert.match(s, /<Header\s+M=\{M\}\s+eyebrow=\{eyebrow\}\s+title=\{goal \|\| m\.home\.setGoalText\}\s+written=\{!!goal\}\s+headline\s+accessibilityLabel=\{summary\}\s+action=\{action\}/);
  assert.match(s, /eyebrow=\{homeEyebrow\(now\)\}/);
  // 설정 — 같은 testID · 이름표 · 글리프
  assert.match(s, /\{ glyph: 'settings', onPress: onSettings, label: m\.home\.settings, testID: TID\.homeSettings \}/);
  assert.match(s, /const onSettings = useCallback\(\(\) => go\('settings'\), \[go\]\);/);
  // 화면 읽기: 머리는 예전처럼 한 덩어리(homeSummary — Header의 accessibilityLabel), 핵심 목표가 없으면 제목 자리가 '정하기' 단추(onTitlePress)
  assert.match(s, /onTitlePress=\{goal \? undefined : onSetGoal\}/);
  assert.match(s, /summary=\{homeSummary\(doc, now\)\}/);
  assert.match(s, /titleLabel=\{m\.home\.setGoal\}\s+titleHint=\{m\.home\.setGoalHint\}/);
  // 설정을 머리 밖에 따로 그리던 자리는 없다
  assert.doesNotMatch(s, /ACTION_ROOM|ACTION_TOP|TITLE_TOP|<IconBtn/);
  assert.match(s, /const onSetGoal = useCallback\(\(\) => \{ tap\(\); openEditor\(\{ kind: 'center' \}\); \}, \[openEditor\]\);/);
  // 지운 것
  assert.doesNotMatch(s, /Tally|正|TYPE\.display|marginTop: 3 \}\} \/>|height: 1\.5, backgroundColor/);
  assert.ok(!fs.existsSync(path.join(ROOT, 'src/components/Tally.tsx')), 'Tally.tsx는 지웠다');
});

test('히어로 — 숫자 칸 셋(label · figureField + unit, 소리 말) | L1 지도(칸 20/18, 누르면 영역 · 가운데는 만다라트)', () => {
  const s = dash();
  assert.match(s, /<ColourMap\s+level="L1"\s+cell=\{cell\}\s+themes=\{doc\.themes\}/);
  assert.match(s, /const cell = heroMapCell\(measure\);/);
  assert.match(s, /const measure = width - GEO\.gutter \* 2;/);
  assert.match(s, /onPressBlock=\{onChartBlock\}\s+accessibilityHint=\{m\.home\.chartHint\}/);
  assert.match(s, /const onChartBlock = useCallback\(\(b: number \| 'c'\) => \{ tap\(\); if \(b === 'c'\) go\('grid'\); else go\('detail', b\); \}, \[go\]\);/);
  // 숫자 칸은 지도 높이에 고르게(space-between), 이름 label · 숫자 figureField · 단위 unit
  assert.match(s, /minHeight=\{stacked \? undefined : l1Width\(cell\)\}/);
  assert.match(s, /justifyContent: 'space-between', paddingVertical: HOME\.heroPadY/);
  const field = s.slice(s.indexOf('function HeroField('), s.indexOf('/** 히어로 숫자 칸 셋'));
  assert.match(field, /ROLE\.label, \{ color: M\.print \}/);
  assert.match(field, /ROLE\.figureField, \{ color: M\.ink/);
  assert.match(field, /ROLE\.unit, \{ color: M\.ink2 \}/);
  assert.match(field, /<View accessible accessibilityLabel=\{say\}/);
  // 소리 말 — '1/10'이 날짜로 읽히지 않게 예전 문장으로
  assert.match(s, /todaySay=\{todaySummary\(doc, now\)\}/);
  assert.match(s, /say=\{m\.home\.sumDone\(\{ n: done \}\)\}/);
  assert.match(s, /leftSay=\{headerMeta\(now\)\.left\}/);
});

test('누르는 줄 — 한 해 마무리 · 한 주 돌아보기는 LinkRow(같은 testID), 시작하기는 kit 줄', () => {
  const s = dash();
  assert.match(s, /testID=\{TID\.homeYearPrompt\}/);
  assert.match(s, /onPress=\{\(\) => \{ tap\(\); openRitual\(ritualWeek\); \}\}\s+testID=\{TID\.homeRitual\}/);
  assert.match(s, /title=\{m\.home\.ritualTitle\}\s+meta=\{m\.home\.ritualSub\(\{ range: fmtRange\(ritualWeek\) \}\)\}/);
  // 저장 실패 알림은 그대로(설정으로)
  assert.match(s, /<View accessibilityRole="alert">\s*<RuledNotice/);
  // 시작하기 — 같은 다섯 단계 · 같은 읽는 말, '2/5'는 '5단계 중 2단계'로 읽는다
  const guide = s.slice(s.indexOf('function StartGuide('));
  assert.match(guide, /accessibilityLabel=\{m\.home\.guideProgress\(\{ total: GUIDE_STEP_COUNT, done: doneCount \}\)\}/);
  assert.match(guide, /const GUIDE_CTA|GUIDE_CTA\[st\.key\]/);
  assert.match(guide, /showGridAt\(ti >= 0 \? ti : null\);\s*go\('grid'\);/);
  assert.match(guide, /value=\{cta \?\? undefined\}/);
  // 순서: 히어로 → 마무리 · 돌아보기 → 시작하기 → 오늘 할 일 → 이번 주 → 8개 영역
  const at = (x) => { const i = s.indexOf(x); assert.ok(i >= 0, x); return i; };
  const order = ['<ColourMap', '{yearPrompt && (', '{ritualWeek && (', '<StartGuide M={M}', '<TodaySection M={M}', '<WeekSection cells', '<AreaLedger M={M}'].map(at);
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test('오늘 할 일 — 중점 먼저(중점 · 이번 주), 다섯 줄까지, 전체 보기 ›, 다 한 날 마감 한 줄', () => {
  const s = dash();
  const sec = s.slice(s.indexOf('function TodaySection('), s.indexOf('const FocusRow = memo('));
  assert.match(sec, /const \{ pinned, shown \} = homeList\(rows, focus, kept\);/);
  assert.match(sec, /weekPriority\(doc, new Date\(\)\)/);
  assert.match(sec, /rightPrint=\{focusMark\}/);
  assert.match(sec, /const focusMark = m\.today\.weekFocusMark;/);
  // 체크한 줄은 제자리(kept)
  assert.match(sec, /onCheck=\{\(wasDone\) => \{ if \(!wasDone\) keep\(r\.key\); \}\}/);
  // 실천 줄 몸통은 실천 시트, 직접 적은 줄은 TodayRow가 체크
  assert.match(sec, /onOpen: \(\) => openAction\(it\.ti, it\.ai\)/);
  // 전체 보기 — 오늘 화면, 읽는 말은 예전 머리 단추 그대로
  assert.match(sec, /label: m\.home\.seeAll,\s+onPress: \(\) => \{ tap\(\); go\('today'\); \},\s+accessibilityLabel: todayTotal > 0 \? m\.home\.todayHeadLabel\(\{ total: todayTotal, done: todayDone \}\) : m\.home\.openToday,/);
  // 빈 날의 고르기 줄 — 점선 네모 없이 + 글리프, 고를 실천이 없으면 바로 적기
  assert.match(sec, /lead=\{<Icon name="plus" size=\{18\} color=\{M\.ink\} \/>\}/);
  assert.match(sec, /onPress=\{\(\) => \{ tap\(\); if \(canPick\) openPick\(\); else openQuick\(\); \}\}/);
  assert.doesNotMatch(s, /borderStyle: 'dashed'/);
  // 다 한 날 — 인쇄된 한 줄(두 줄 괘선 없음), 읽는 말은 closeLabel
  assert.match(sec, /<Text style=\{\[ROLE\.note, \{ color: M\.print \}\]\}>\{m\.today\.closeLeft\(\{ day \}\)\}<\/Text>/);
  assert.doesNotMatch(s, /LedgerClose|dayCloseTick/);
  // 오늘 할 일이 아닌 중점 — 체크 칸 없이 '영역 · 이번 주', 오른쪽 인쇄된 '중점', 누르면 실천 시트(예전 이름표 · 도움말)
  const focus = s.slice(s.indexOf('const FocusRow = memo('), s.indexOf('const GUIDE_CTA'));
  assert.match(focus, /meta=\{m\.home\.weekTitle\}\s+right=\{m\.today\.weekFocusMark\}\s+rightTone="print"/);
  assert.match(focus, /onPress=\{\(\) => \{ tap\(\); openAction\(ti, ai\); \}\}/);
  assert.match(focus, /accessibilityLabel=\{`\$\{text\}\$\{m\.core\.listSep\}\$\{area\}`\}\s+accessibilityHint=\{m\.home\.actionHint\}/);
  assert.doesNotMatch(focus, /\blead=/);
});

test('이번 주 — 막대 일곱(WeekBars), 합계 n번, 읽는 말은 날마다(마감한 날 덧붙임)', () => {
  const s = dash();
  assert.match(s, /<Section M=\{M\} label=\{m\.home\.weekTitle\} meta=\{m\.fmt\.times\(\{ n: weekTotal \}\)\}/);
  const wk = s.slice(s.indexOf('const WeekSection = memo('), s.indexOf('/** 8개 영역'));
  assert.match(wk, /n: d\.date > today \? null : d\.count, today: d\.isToday, sunday: d\.dow === 0/);
  assert.match(wk, /\(d\.isToday \? m\.home\.weekDayToday : m\.home\.weekDay\)\(\{ day: m\.fmt\.dowLong\(\{ i: d\.dow \}\), n: d\.count \}\)/);
  assert.match(wk, /m\.home\.weekClosed/);
  assert.match(wk, /<WeekBars days=\{days\} accessibilityLabel=\{say\} \/>/);
  assert.match(s, /closedDays\?\.includes\(d\.date\)/);
});

test('8개 영역 — 두 단(왼쪽 1~4 먼저), 단 사이 28, 줄 38(누르는 자리 44), 표시 · 이름 · n/8, 누르면 영역 화면', () => {
  const s = dash();
  const led = s.slice(s.indexOf('const AreaLedger = memo('), s.indexOf('/** 오늘 할 일 한 줄의 재료'));
  assert.match(led, /const cols = \[themes\.slice\(0, half\), themes\.slice\(half\)\];/);
  assert.match(led, /gap: HOME\.ledgerGap/);
  assert.match(led, /minHeight: HOME\.ledgerRow/);
  assert.match(led, /const slop = \(44 - HOME\.ledgerRow\) \/ 2;/);
  assert.match(led, /<DyeMark M=\{M\} area=\{ti\} \/>/);
  assert.match(led, /ROLE\.ledger, \{ flex: 1, minWidth: 0, color: M\.ink \}/);
  assert.match(led, /ROLE\.ledgerFigure, \{ marginLeft: 8, color: M\.ink2 \}\]\}>\{p\.done\}\/8</);
  assert.match(led, /accessibilityLabel=\{m\.home\.areaRowLabel\(\{ name, line, n: p\.done \}\)\}/);
  assert.match(led, /const AreaRow = memo\(function AreaRow\(/);
  assert.match(s, /const onArea = useCallback\(\(ti: number\) => \{ tap\(\); go\('detail', ti\); \}, \[go\]\);/);
});

test('색 · 크기는 토큰 · ROLE · GEO에서 — 홈에 hex · 예전 TYPE · 표시색이 없다', () => {
  const s = dash();
  assert.doesNotMatch(s, /#[0-9A-Fa-f]{3,8}\b/);
  assert.doesNotMatch(s, /\bTYPE\.|\bNUM\b|legibleMark|M\.(gold|accent|sub|line|bg)\b/);
  assert.match(s, /paddingHorizontal: GEO\.gutter/);
  assert.match(s, /marginTop: HOME\.heroBelow, gap: GEO\.sectionGap/);
});
