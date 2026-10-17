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
  assert.match(grid, /`8개 영역 중 \$\{ORDINAL\[focus\] \?\? `\$\{focus \+ 1\}`\} 번째`/);
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
  assert.match(line, /const bodyLabel = \[text, area, plan, week, run\.a11y, done \? m\.today\.doneToday : ''\]/);
  assert.equal(require('../src/i18n/ko/today').default.doneToday, '오늘 했어요');
  assert.match(line, /<View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">\s*<WeekStrip /);
});

test('NEW-2(ui): 연속 기록 칸은 모든 줄 · 머리글이 같은 폭(가장 긴 기록 글에 맞춤) — 이번 주 칸이 요일 머리글 아래 그대로', () => {
  const s = src('src/screens/TodayModes.tsx');
  assert.doesNotMatch(s, /minWidth: RUN_W/);
  assert.match(s, /const runW = useMemo\(\s*\(\) => Math\.ceil\(Math\.max\(RUN_W, \.\.\.rows\.map\(\(r\) => textWidth\(streakCell\(r\.streak\)\.text, RUN_FS \* Math\.min\(fontScale, RUN_SCALE_MAX\)\) \+ 2\)\)\)/);
  assert.equal((s.match(/\{ width: runW, flexShrink: 0, textAlign: 'right'/g) ?? []).length, 2, '머리글 · 줄');
  assert.match(s, /runW=\{runW\}/);
  // 폭은 가장 긴 글을 덮는다 — 1.3배에서 '136일'(17pt)이 잘리지 않는다
  const { textWidth } = require('../src/lib/labelFit');
  const w = Math.ceil(Math.max(40, ...['3일', '136일'].map((t) => textWidth(t, 17 * 1.3) + 2)));
  assert.ok(w >= textWidth('136일', 17 * 1.3), `${w}`);
  // runW를 세는 훅은 빈 목록에서 일찍 돌아가기 전에 있다(훅 순서)
  const body = slice(s, 'export function TodayStreak(', 'if (rows.length === 0) {');
  assert.match(body, /const runW = useMemo/);
});

test('NEW-4(a11y): 반복 안 함 칩은 보이는 글 그대로 읽는다', () => {
  const s = src('src/components/DayPicker.tsx');
  assert.match(s, /<PaperChip M=\{M\} label=\{m\.core\.noRepeat\} onPress=\{\(\) => pick\(\[\]\)\} \/>/);
  assert.equal(require('../src/i18n').msg('ko').core.noRepeat, '반복 안 함');
  assert.doesNotMatch(s, /반복 해제/);
});

test('A-1(1): 오늘 할 일 고르기 줄은 소리 말(say)을 읽는다', () => {
  const s = src('src/overlays/PickToday.tsx');
  assert.match(s, /\[r\.text, r\.focus \? m\.today\.weekFocus : '', r\.say\]/);
  assert.doesNotMatch(s, /r\.focus \? m\.today\.weekFocus : '', r\.hint\]/);
  assert.equal(require('../src/i18n/ko/today').default.weekFocus, '이번 주 중점');
});

test('HANDOFF-A9 · NEW-1: 통계는 날짜를 또박또박 읽는다(속도 · 고른 날 · 회고 · 머리 오른쪽)', () => {
  const s = src('src/screens/Stats.tsx');
  assert.match(s, /const paceSay = c\.reached \? '' : pace\.eta \? `이 속도면 \$\{fmtDateSpeech\(pace\.eta, now\)\}` : paceText;/);
  assert.match(s, /\$\{paceSay \? `, \$\{paceSay\}` : ''\}/);
  assert.doesNotMatch(s, /\$\{paceText \? `, \$\{paceText\}` : ''\}/);
  assert.match(s, /pickedText=\{picked \? pickedSpeech\(doc, picked\) : '고른 날 없음'\}/);
  assert.match(s, /accessibilityLabel=\{`\$\{e\.say\}, \$\{e\.text\}`\}/);
  assert.match(s, /rightLabel=\{map\.since \? `\$\{fmtDateLong\(map\.since\)\}부터` : undefined\}/);
  const head = slice(s, 'const SectionHead = memo(', '// ── 큰 숫자 둘');
  assert.match(head, /NUM\]\} accessibilityLabel=\{rightLabel \?\? right\}>\{right\}<\/Text>/);
  assert.match(s, /accessibilityLabel=\{ledgerLabel\(r\)\}/);
});

// ── 누르기 · 표시 ─────────────────────────────────────────────────────────────

test('NEW-3(ui): 시작하기의 끝낸 단계 · 아직 먼 단계는 누르는 것이 아니다(눌림 색 · 웹 Tab 멈춤 없음, disabled 없음)', () => {
  const s = src('src/screens/Dashboard.tsx');
  const guide = slice(s, 'g.steps.map((st, i) => {', '        })}');
  assert.match(guide, /if \(!pressable\) \{\s*return \(\s*<View key=\{st\.key\} accessible accessibilityRole="text" accessibilityLabel=\{a11yLabel\} style=\{rowStyle\}>/);
  assert.match(guide, /<Pressable\s+key=\{st\.key\}\s+onPress=\{\(\) => run\(st\.key\)\}\s+accessibilityRole="button"/);
  assert.doesNotMatch(guide, /onPress=\{pressable \?/);
  assert.doesNotMatch(guide, /\bdisabled=/);
});

test('NEW-4(ui): + 점선 네모(홈 · 오늘 · 빈 양식)는 빈 체크 칸과 같은 테두리 — 대비 증가에서 더 진하게', () => {
  for (const f of ['src/screens/Dashboard.tsx', 'src/screens/Today.tsx', 'src/components/EmptyState.tsx']) {
    const s = src(f);
    assert.match(s, /const edge = checkEdge\(M\.dark, useIncreaseContrast\(\)\);/, f);
    assert.match(s, /borderWidth: edge\.width > 1\.6 \? 2 : 1\.4, borderStyle: 'dashed', borderColor: edge\.color/, f);
    assert.doesNotMatch(s, /checkBorder\(/, f);
  }
  // 대비 증가의 진한 테두리(Check.tsx STRONG_BORDER)는 대비 증가 팔레트 종이 위 4.5:1 이상
  const check = src('src/components/Check.tsx');
  const m = /STRONG_BORDER = \{ light: '([^']+)', dark: '([^']+)' \}/.exec(check);
  assert.ok(m);
  const over = (rgba, bg) => {
    const [r, g, b, a] = rgba.match(/[\d.]+/g).map(Number);
    const base = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
    return toHex(`rgb(${[r, g, b].map((c, i) => Math.round(c * a + base[i] * (1 - a))).join(', ')})`);
  };
  for (const [name, mood] of Object.entries(MOODS)) {
    const M = contrastEdition(mood);
    const k = contrast(over(M.dark ? m[2] : m[1], M.bg), M.bg);
    assert.ok(k >= 4.5, `${name}: ${k.toFixed(2)}`);
  }
});

// ── 지운 것 ──────────────────────────────────────────────────────────────────

test('HANDOFF-A2: 앱이 쓰지 않던 rowFacts는 없다(오늘 줄은 TodayRow의 rowInfo memo)', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'src/lib/rowFacts.ts')), false);
  assert.match(src('src/components/TodayRow.tsx'), /function rowInfo\(/);
});
