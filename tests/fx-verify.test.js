// FX-VERIFY — 다섯 갈래 고침(FX-A..E) 뒤 검증에서 확인된 항목을 지킨다(docs/mp/final/FX-VERIFY.md).
// 순수 모듈은 값으로, 화면(.tsx)은 RN 없이 불러올 수 없어 소스의 모양으로 본다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { MOODS, contrastEdition, toHex } = require('../src/theme/moods');
const { contrast } = require('../src/theme/palette');
const { rolloverToday } = require('../src/lib/routine');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
/** 소스에서 start 글부터 end 글 앞까지 */
const slice = (s, start, end) => {
  const i = s.indexOf(start);
  assert.ok(i >= 0, `missing: ${start}`);
  const j = end ? s.indexOf(end, i + start.length) : -1;
  return s.slice(i, j > i ? j : undefined);
};

// ── 저장소 ───────────────────────────────────────────────────────────────────

test('NEW-4(code): 내려갈 때 저장은 마이크로태스크로 — setTimeout(0)은 웹에서 떠날 때 버려진다', () => {
  const s = src('src/store/MandaratContext.tsx');
  const effect = slice(s, '// 내려갈 때 바로 쓴다(300ms', "// 날짜가 바뀌면 '오늘' 목록 정리");
  assert.match(effect, /state === 'background' \|\| state === 'inactive'\) \{\s*queueMicrotask\(\(\) => \{/);
  assert.match(effect, /void persist\(latest\.current\);/);
  assert.doesNotMatch(effect, /setTimeout\(\(\)/);
  assert.doesNotMatch(effect, /\bflush\b/);
});

test('NEW-4(code): 같은 동기 알림 안의 다른 듣는 곳이 넣은 변경도 마이크로태스크 저장에 들어간다', async () => {
  // RN · RN-web의 AppState는 듣는 곳을 한 번의 동기 흐름에서 모두 부른다 — 그 모양을 그대로 흉내 낸다
  const listeners = [];
  const emit = (state) => listeners.forEach((fn) => fn(state));
  let latest = { v: 0 };
  const written = [];
  listeners.push((st) => { if (st === 'background') queueMicrotask(() => written.push(latest.v)); }); // 저장소(먼저 구독)
  listeners.push((st) => { if (st === 'background') latest = { v: 1 }; }); // 오늘의 한 줄 글(나중 구독, 동기 commit)
  emit('background');
  assert.deepEqual(written, [], '알림 도중에는 아직 쓰지 않는다');
  await Promise.resolve();
  assert.deepEqual(written, [1], '알림이 끝난 바로 뒤, 나중 듣는 곳의 변경까지');
});

test('NEW-5(code): 화면을 켜 둔 채 날짜가 바뀌면 1분 안에 오늘을 다시 맞춘다(바뀌지 않았으면 아무것도 안 한다)', () => {
  const s = src('src/store/MandaratContext.tsx');
  const effect = slice(s, '// 시계 눈금 — 다음 자정', 'const update = useCallback');
  assert.match(effect, /const guard = setInterval\(\(\) => \{\s*const k = dateKey\(\);\s*if \(k === latest\.current\.todayDate\) return;/);
  assert.match(effect, /commit\(rolloverToday\(latest\.current, k\)\);\s*setClock\(\(c\) => c \+ 1\);\s*arm\(\);\s*\}, 60_000\);/);
  assert.match(effect, /clearInterval\(guard\);/);
  // 시계를 되돌려도 rolloverToday가 todayDate를 오늘로 맞춰 다음 눈금에서 다시 돌지 않는다
  const doc = { themes: [], todayKeys: [], todayExtra: [], todayDate: '2026-10-15' };
  const back = rolloverToday(doc, '2026-10-14');
  assert.equal(back.todayDate, '2026-10-14');
  assert.equal(rolloverToday(back, '2026-10-14'), back, '같은 날이면 같은 문서');
  const fwd = rolloverToday({ ...doc, todayDate: '2026-10-13', todayExtra: [{ id: 'a', ti: 0, text: 'x', done: true }] }, '2026-10-14');
  assert.equal(fwd.todayDate, '2026-10-14');
  assert.deepEqual(fwd.todayExtra, [], '앞으로 넘어가면 끝낸 할 일 정리');
});

test('HANDOFF-B1: 준비됐는지만 읽는 useReady — 문지기(Gate)는 문서가 바뀌어도 다시 그려지지 않는다', () => {
  const s = src('src/store/MandaratContext.tsx');
  assert.match(s, /const ReadyCtx = createContext\(false\);/);
  assert.match(s, /<ReadyCtx\.Provider value=\{ready\}>/);
  assert.match(s, /export function useReady\(\): boolean \{\s*return useContext\(ReadyCtx\);/);
  const app = src('App.tsx');
  const gate = slice(app, 'function Gate()', 'const Shell = memo');
  assert.match(gate, /const ready = useReady\(\);/);
  assert.doesNotMatch(gate, /useDoc\(/);
  assert.doesNotMatch(app, /\buseDoc\b/);
});

// ── 화면 읽기 ─────────────────────────────────────────────────────────────────

test('NEW-2 · NEW-5(ui): 칸·영역 자리는 어디서나 고유어 서수 — 81칸 줌 머리 · 실천 시트 머리', () => {
  const grid = src('src/screens/FullGrid.tsx');
  assert.match(grid, /m\.chart\.areaOrdinalSay\(\{ n: focus \+ 1 \}\)/);
  assert.equal(require('../src/i18n').msg('ko').chart.areaOrdinalSay({ n: 3 }), '8개 영역 중 세 번째');
  const sheet = src('src/overlays/ActionSheet.tsx');
  assert.match(sheet, /m\.sheet\.headA11y\(\{ area, ordinal: m\.fmt\.ordinalCell\(\{ n: ai \+ 1 \}\) \}\)/);
  assert.equal(require('../src/i18n/ko/sheet').default.headA11y({ area: '건강', ordinal: require('../src/i18n/ko/fmt').default.ordinalCell({ n: 3 }) }), '건강 영역, 세 번째 칸, 영역 보기');
  // 앱 소스의 읽는 말에 '3번째'·'${n + 1}번째' 꼴이 남지 않는다(주석 제외)
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk(path.join(ROOT, 'src')).filter((x) => /\.tsx?$/.test(x))) {
    const code = fs.readFileSync(f, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    assert.doesNotMatch(code, /(\d|\})번째/, path.relative(ROOT, f));
  }
});

test('NEW-3(a11y): 연속 기록 줄은 체크 · 몸통 두 번만 멈추고, 이번 주 칸은 몸통 이름에 든다', () => {
  const s = src('src/screens/TodayModes.tsx');
  const line = slice(s, 'const StreakLine = memo(', '// ── 보드');
  assert.match(line, /const week = summary \?\? weekStripSummary\(states, today >= 0 \? today : weekdayIndex\(new Date\(\)\)\);/);
  // 정한 것은 소리 말(planSay — en '3x a week'를 '3 times a week'로)
  assert.match(line, /const bodyLabel = \[text, area, planSay, week, run\.a11y, done \? m\.today\.doneToday : ''\]/);
  assert.equal(require('../src/i18n/ko/today').default.doneToday, '오늘 했어요');
  // 이번 주 요일 칸(디자인 A: kit DayBoxes, 누를 수 없음)은 화면 읽기에서 숨기고 몸통 이름이 말한다
  assert.match(line, /<View style=\{\{ marginLeft: daysInset \}\} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">\s*<DayBoxes /);
  assert.doesNotMatch(line, /<DayBoxes [^>]*onPressDay/);
});

// NEW-2(ui) '연속 기록 칸은 모든 줄 · 머리글이 같은 폭(runW)'은 디자인 A(S3)에서 지웠다 — 기록은 제목 줄 위의 오른쪽 글(kit RowRight)이고,
// 이번 주는 줄 아래 요일 칸(DayBoxes)이라 맞출 머리글 열이 없다. 훅 순서는 tests/a-s3.test.js가 본다

// NEW-4(a11y) '반복 안 함 칩'은 O1에서 지웠다 — 칩을 쓰던 곳(편집 창)은 늘 hideClear였고, 디자인 A의 반복 요일(DayPicker)에는
// 해제가 없다(습관은 요일이 하나는 있어야 한다). 빠른 고르기의 읽는 말은 tests/a-o1.test.js가 본다

test('A-1(1): 오늘 할 일 고르기 줄은 소리 말(say)을 읽는다', () => {
  const s = src('src/overlays/PickToday.tsx');
  assert.match(s, /\[r\.text, r\.focus \? m\.today\.weekFocus : '', r\.say\]/);
  assert.doesNotMatch(s, /r\.focus \? m\.today\.weekFocus : '', r\.hint\]/);
  assert.equal(require('../src/i18n/ko/today').default.weekFocus, '이번 주 중점');
});

test('HANDOFF-A9 · NEW-1: 통계는 날짜를 또박또박 읽는다(속도 · 고른 날 · 회고 · 머리 오른쪽)', () => {
  const s = src('src/screens/Stats.tsx');
  assert.match(s, /const paceSay = c\.reached \? '' : pace\.eta \? m\.stats\.pace\(\{ date: fmtDateSpeech\(pace\.eta, now, l\) \}\) : paceText;/);
  assert.match(s, /\[area, a\.text\.trim\(\), said, `\$\{c\.pct\}%`, right, paceSay\]\.filter\(Boolean\)/);
  assert.doesNotMatch(s, /right, paceText\]/);
  assert.match(s, /pickedText=\{picked \? pickedSpeech\(doc, picked, l\) : m\.stats\.noPick\}/);
  assert.match(s, /accessibilityLabel=\{`\$\{e\.say\}\$\{m\.core\.listSep\}\$\{e\.text\}`\}/);
  assert.match(s, /rightLabel=\{map\.since \? m\.stats\.since\(\{ date: fmtDateLong\(map\.since, l\) \}\) : undefined\}/);
  const ko = require('../src/i18n/ko/stats').default;
  assert.equal(ko.pace({ date: '10월 20일 화요일' }), '이 속도면 10월 20일 화요일');
  assert.equal(ko.noPick, '고른 날 없음');
  assert.equal(ko.since({ date: '10월 3일 토요일' }), '10월 3일 토요일부터');
  const head = slice(s, 'const SectionHead = memo(', '// ── 큰 숫자 둘');
  assert.match(head, /NUM\]\} accessibilityLabel=\{rightLabel \?\? right\}>\{right\}<\/Text>/);
  assert.match(s, /accessibilityLabel=\{ledgerLabel\(r, l\)\}/);
});

// ── 누르기 · 표시 ─────────────────────────────────────────────────────────────

test('NEW-3(ui): 시작하기의 끝낸 단계 · 아직 먼 단계는 누르는 것이 아니다(눌림 색 · 웹 Tab 멈춤 없음, disabled 없음)', () => {
  const s = src('src/screens/Dashboard.tsx');
  // 디자인 A(S1): 글 줄은 onPress 없는 kit Row(읽기만 하는 View 한 덩어리, role text), 누르는 단계만 kit LinkRow(role button)
  const guide = slice(s, 'g.steps.map((st, i) => {', '\n      })}');
  const still = guide.slice(guide.indexOf('if (!pressable) {'), guide.indexOf('return (\n          <LinkRow'));
  assert.match(still, /<Row\s+key=\{st\.key\}/);
  assert.match(still, /accessibilityRole="text"\s+accessibilityLabel=\{a11yLabel\}/);
  assert.doesNotMatch(still, /onPress/);
  assert.match(guide, /<LinkRow\s+key=\{st\.key\}[\s\S]*?onPress=\{\(\) => run\(st\.key\)\}[\s\S]*?accessibilityLabel=\{a11yLabel\}/);
  assert.match(src('src/components/kit/LinkRow.tsx'), /accessibilityRole="button"/);
  assert.match(src('src/components/kit/Row.tsx'), /if \(!onPress\) \{\s*return \(\s*<View/);
  assert.doesNotMatch(guide, /onPress=\{pressable \?/);
  assert.doesNotMatch(guide, /\bdisabled=/);
});

test('NEW-4(ui): + 점선 네모(홈 · 오늘 · 빈 양식)는 빈 체크 칸과 같은 테두리 — 대비 증가에서 더 진하게', () => {
  // 홈(디자인 A, S1)의 고르기 줄은 점선 네모 없이 체크 칸 자리의 + 글리프(목업 today.html '.more': never a dashed box)
  assert.doesNotMatch(src('src/screens/Dashboard.tsx'), /borderStyle: 'dashed'/);
  // 오늘(디자인 A, S3)도 같다 — '실천에서 더 고르기'는 체크 칸 자리의 + 글리프 줄(점선 네모 없음)
  assert.doesNotMatch(src('src/screens/Today.tsx'), /borderStyle: 'dashed'|checkBorder\(/);
  // 빈 양식(EmptyState, 디자인 A): 빈 체크 칸과 같은 가장자리 토큰 printEdge — usePalette가 대비 증가에서 ink2로 진하게 한다
  const empty = src('src/components/EmptyState.tsx');
  assert.match(empty, /borderWidth: 1\.5, borderStyle: 'dashed', borderColor: M\.printEdge/);
  assert.doesNotMatch(empty, /checkBorder\(/);
  // 테두리는 토큰(패키지 K) — 평소 printEdge(종이 위 3:1 이상), 대비 증가에서는 ink2(4.5:1 이상)
  const check = src('src/components/Check.tsx');
  assert.match(check, /return \{ color: more \? T\.ink2 : T\.printEdge, width: 1\.5 \};/);
  const { LIGHT, DARK } = require('../src/theme/tokens');
  for (const T of [LIGHT, DARK]) {
    assert.ok(contrast(T.printEdge, T.paper) >= 3, `printEdge ${contrast(T.printEdge, T.paper).toFixed(2)}`);
    assert.ok(contrast(T.ink2, T.paper) >= 4.5, `ink2 ${contrast(T.ink2, T.paper).toFixed(2)}`);
  }
});

// ── 지운 것 ──────────────────────────────────────────────────────────────────

test('HANDOFF-A2: 앱이 쓰지 않던 rowFacts는 없다(오늘 줄은 TodayRow의 rowInfo memo)', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'src/lib/rowFacts.ts')), false);
  assert.match(src('src/components/TodayRow.tsx'), /function rowInfo\(/);
});
