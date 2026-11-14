// S2 · 만다라트 탭과 영역 화면(디자인 A, docs/design/build-plan.md §1 chart · first · block, §3 S2)
// - lib/areaWeek: 이 영역의 습관 칸(블록 순서) × 이번 주 일곱 날 → done · open · later · none, 그리고 n/m
// - 화면: 색 지도(ColourMap L2) · 처음 화면 · 영역 화면(AreaPage)이 지키는 TID · 동작 · 말
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { areaWeek, areaWeekKey, habitCells, weekBox } = require('../src/lib/areaWeek');
const { routineWeekCount } = require('../src/lib/routine');
const { msg } = require('../src/i18n');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// 2026-10-14 수요일 — 이번 주 10/12(월)~10/18(일), 오늘은 자리 2
const WED = new Date(2026, 9, 14, 9);
const EVERY = [0, 1, 2, 3, 4, 5, 6];

function doc() {
  const themes = ['건강', '커리어', '', '', '', '', '', ''].map((title) => ({
    title, color: '#447753', icon: 'heart',
    actions: Array.from({ length: 8 }, () => ({ text: '', note: '', done: false })),
  }));
  const a = themes[0].actions;
  // 목업 block.html의 이번 주: 주 3회 '··T····' · 하루 물 'vvVoooo' · 11시 취침 'xxTo··o'
  a[0] = { text: '주 3회 운동', note: '', done: false, kind: 'habit', perWeek: 3, since: '2026-10-01' };
  a[1] = { text: '하루 물 2L', note: '', done: true, kind: 'habit', days: EVERY, since: '2026-10-01' };
  a[2] = { text: '11시 취침', note: '', done: false, kind: 'habit', days: [0, 1, 2, 3, 4], since: '2026-10-01' };
  a[3] = { text: '정기 건강검진', note: '', done: true, kind: 'once' };
  a[5] = { text: '스트레칭 10분', note: '', done: false, kind: 'habit', days: EVERY, since: '2026-10-13' };
  a[6] = { text: '월요일 산책', note: '', done: false, kind: 'habit', days: [1], since: '2026-10-01' };
  a[7] = { text: '책 12권', note: '', done: false, kind: 'count', goal: 12, unit: '권', count: 7 };
  return {
    centerGoal: '단단한 한 해',
    themes,
    dayLog: {
      '2026-10-12': ['0-1'],
      '2026-10-13': ['0-1', '0-6'],
      '2026-10-14': ['0-1'],
    },
    todayKeys: [],
  };
}

test('weekBox: 한 날 done · 오늘과 놓친 날 open · 정해 둔 앞날 later · 쉬는 날 none', () => {
  assert.equal(weekBox('done'), 'done');
  assert.equal(weekBox('today'), 'open');
  assert.equal(weekBox('missed'), 'open');
  assert.equal(weekBox('planned'), 'later');
  assert.equal(weekBox('off'), 'none');
});

test('habitCells: 글 있는 습관 칸만, 블록 안 자리 순서', () => {
  assert.deepEqual(habitCells(doc(), 0), [0, 1, 2, 5, 6]);
  assert.deepEqual(habitCells(doc(), 1), []);
  assert.deepEqual(habitCells(doc(), 9), []);
});

test('areaWeek: 목업 block.png의 이번 주 — 줄 · 칸 · 횟수', () => {
  const w = areaWeek(doc(), 0, WED);
  assert.deepEqual(w.dates, ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
  assert.equal(w.todayIndex, 2);
  assert.deepEqual(w.rows.map((r) => r.ai), [0, 1, 2, 5, 6]);
  const [weekly, water, sleep, stretch, walk] = w.rows;
  // 주 3회: 정한 요일이 없어 오늘 칸 하나(목업 '··T····'), 0/3
  assert.deepEqual(weekly.days, ['none', 'none', 'open', 'none', 'none', 'none', 'none']);
  assert.deepEqual([weekly.done, weekly.planned], [0, 3]);
  assert.deepEqual(weekly.canPress, [false, false, true, false, false, false, false]);
  // 매일: 월 · 화 · 수 했고 앞날은 아직(목업 'vvVoooo'), 3/7 — 칸 달성(done)과는 따로
  assert.deepEqual(water.days, ['done', 'done', 'done', 'later', 'later', 'later', 'later']);
  assert.deepEqual([water.done, water.planned], [3, 7]);
  assert.deepEqual(water.canPress, [true, true, true, false, false, false, false]);
  // 일~목: 월 · 화 놓침, 수 오늘, 목 · 일 앞날, 금 · 토 쉬는 날(목업 'xxTo··o'), 0/5
  assert.deepEqual(sleep.days, ['open', 'open', 'open', 'later', 'none', 'none', 'later']);
  assert.deepEqual([sleep.done, sleep.planned], [0, 5]);
  // 화요일에 정한 습관 — 그 전 날은 칸이 없고 누를 수도 없다
  assert.deepEqual(stretch.days, ['none', 'open', 'open', 'later', 'later', 'later', 'later']);
  assert.deepEqual(stretch.canPress, [false, true, true, false, false, false, false]);
  // 쉬는 날에 한 것도 '했어요' 칸으로 보이고 지울 수 있다(비율에는 넣지 않는다)
  assert.deepEqual(walk.days, ['open', 'done', 'none', 'none', 'none', 'none', 'none']);
  assert.deepEqual(walk.canPress, [true, true, false, false, false, false, false]);
  assert.deepEqual([walk.done, walk.planned], [0, 1]);
});

test('areaWeek: 횟수는 칸 아래 · 실천 시트와 같은 셈(routineWeekCount)', () => {
  const d = doc();
  for (const r of areaWeek(d, 0, WED).rows) {
    const n = routineWeekCount(d, 0, r.ai, WED);
    assert.deepEqual([r.done, r.planned], [n.done, n.planned], r.text);
  }
});

test('areaWeekKey: 하루를 체크하면 바뀌고, 같은 문서면 같다', () => {
  const d = doc();
  const k = areaWeekKey(areaWeek(d, 0, WED));
  assert.equal(areaWeekKey(areaWeek(doc(), 0, WED)), k);
  d.dayLog['2026-10-14'] = ['0-1', '0-0'];
  assert.notEqual(areaWeekKey(areaWeek(d, 0, WED)), k);
});

test('만다라트 탭: 지도는 색 지도 L2(TID.gridTable 안), 블록 단추는 TID.gridBlock, 공유는 TID.gridShare', () => {
  const f = src('src/screens/FullGrid.tsx');
  assert.match(f, /<View testID=\{TID\.gridTable\}/);
  assert.match(f, /<ColourMap[\s\S]*?level="L2"[\s\S]*?onPressBlock=\{onOpen\}/);
  assert.match(f, /blockTestID = \(b: number \| 'c'\) => TID\.gridBlock\(b\)/);
  assert.match(f, /accessibilityHint=\{m\.chart\.mapBlockHint\}/);
  const g = src('src/screens/GridScreen.tsx');
  assert.match(g, /testID: TID\.gridShare/);
  // 쓴 칸이 8칸 전이면 처음 화면 — 머리 동작은 목표 고치기, 권하는 글은 그 칸에 바로, 직접 쓰기는 차례로 쓰기
  assert.match(g, /const start = written < GUIDE_FILL_TARGET;/);
  assert.match(g, /\{ glyph: 'pencil', onPress: editGoal, label: m\.chart\.editGoal \}/);
  assert.match(g, /setActionText\(ti, ai, text\)/);
  assert.match(g, /openEditor\(\{ kind: 'action', ti, ai, seq: true \}\)/);
  assert.match(g, /suggestActions\(area\)/);
  // 크게 본 블록은 기억에 남는다 · 옆으로 밀기 · 안드로이드 뒤로 가기 · 두 손가락 Z로 지도에
  assert.match(g, /gridMemory\.focus = f;/);
  assert.match(g, /swipeStep\(g\.dx, g\.vx\)/);
  assert.match(g, /BackHandler\.addEventListener\('hardwareBackPress'/);
  assert.match(g, /onAccessibilityEscape=\{closeZoom\}/);
});

test('영역 화면(AreaPage): 칸은 TID.gridCell, 누르면 시트 · 길게 누르면 편집, 습관 표는 toggleHabitOn', () => {
  const p = src('src/screens/area/AreaPage.tsx');
  assert.match(p, /c\.kind === 'action' \? TID\.gridCell\(c\.ti, c\.ai\) : undefined/);
  assert.match(p, /openAction\(ti, ai\);\s*else openEditor\(\{ kind: 'action', ti, ai \}\);/);
  assert.match(p, /const onCellLong = useCallback\(\(ai: number\) => openEditor\(\{ kind: 'action', ti, ai \}\)/);
  assert.match(p, /toggleHabitOn\(ti, ai, date\)/);
  assert.match(p, /<HabitWeek M=\{M\} ti=\{ti\} week=\{week\} onToggle=\{onHabit\} \/>/);
  // ··· 시트: 영역 이름 고치기(테마 편집 창) — 시트가 내려간 뒤에 연다
  assert.match(p, /afterOverlays\(fn\);\s*dismiss\(true\);/);
  assert.match(p, /openEditor\(\{ kind: 'theme', ti \}\)/);
  const h = src('src/screens/area/HabitWeek.tsx');
  assert.match(h, /accessibilityRole="checkbox"/);
  assert.match(h, /accessibilityState=\{\{ checked: done \}\}/);
  assert.match(h, /size=\{HABIT_WEEK\.box\}/);
  assert.match(h, /col: 30, fig: 40, head: 26, row: 40, todayRadius: 8, box: 14/);
});

test('말: 세 언어에 같은 새 낱말, 한국어 조사는 끝소리대로', () => {
  const keys = ['formName', 'writtenFolio', 'of64', 'writtenOf64Say', 'mapNote', 'mapBlockHint', 'startFrom', 'startPrompt', 'startNote',
    'startWrite', 'suggestSay', 'habitWeek', 'habitTimes', 'otherActions', 'areaMore'];
  for (const l of ['ko', 'ja', 'en']) for (const k of keys) assert.ok(msg(l).chart[k] != null, `${l}.${k}`);
  const ko = msg('ko').chart;
  assert.equal(ko.startPrompt({ area: '건강' }), '건강을 위해 무엇을 해 볼까요?');
  assert.equal(ko.startPrompt({ area: '커리어' }), '커리어를 위해 무엇을 해 볼까요?');
  assert.equal(ko.startFrom({ area: '건강', n: 1 }), '건강 · 1번 칸부터');
  assert.equal(ko.of64({ n: 24 }), '24/64칸');
  assert.equal(ko.formName({ y: 2026 }), '2026 만다라트');
  assert.equal(ko.mapNote, '영역을 누르면 실천 여덟 칸이 보여요');
  assert.equal(msg('ja').chart.startFrom({ area: '健康', n: 1 }), '健康・1マス目から');
});
