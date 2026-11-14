// DX-1 — 디자인 리뷰 D-1 · D-11 · D-17 · D-18 · D-23 · D-25(docs/mp/final/DX-1.md).
// 화면(.tsx)은 RN 없이 불러올 수 없어 소스의 모양으로 본다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const slice = (s, start, end) => {
  const i = s.indexOf(start);
  assert.ok(i >= 0, `missing: ${start}`);
  const j = end ? s.indexOf(end, i + start.length) : -1;
  return s.slice(i, j > i ? j : undefined);
};

test('D-1: 다 한 날 오늘 — 고르기 줄은 빼고, 목록은 한 줄로 접혀 머리 오른쪽 글로 펼치고 접는다(디자인 A, S3)', () => {
  const s = src('src/screens/Today.tsx');
  const list = slice(s, 'function TodayList(', '/** 하루 마감의 머리');
  // 훅은 빈 목록에서 일찍 돌아가기 전에
  const early = list.indexOf('if (total === 0) return');
  assert.ok(early > 0 && list.indexOf('const [picked, setPicked] = useState<number | null>(null);') < early);
  assert.match(list, /const showPick = canPick && area == null && !complete;/);
  // 다 한 날(하루 마감)엔 목록 대신 접은 한 줄 — 펼치면 모든 줄
  assert.match(list, /if \(close\.shown\) \{\s*const fold = !close\.open;/);
  assert.match(list, /\{fold \? <FoldRow [\s\S]*?\/> : <View>\{all\.map\(renderLine\)\}<\/View>\}/);
  // 하나라도 풀면 바로 목록으로, 펼침도 풀린다(예전 doneOpen과 같다)
  const hook = slice(s, 'function useDayClose(', '// ── 목록');
  assert.match(hook, /if \(!complete\) \{[\s\S]*?if \(shown\) setShown\(false\);\s*if \(open\) setOpen\(false\);/);

  const toggle = slice(s, 'function FoldToggle(', '/** 접은 목록 한 줄');
  assert.match(toggle, /accessibilityRole="button"/);
  assert.match(toggle, /accessibilityState=\{\{ expanded: open \}\}/);
  assert.match(toggle, /accessibilityLabel=\{`\$\{word\}\$\{m\.today\.listSep\}\$\{m\.today\.doneHeadLabel\(\{ n: count \}\)\}`\}/);
  // 18 높이 글에 위아래 13씩(44)
  assert.match(toggle, /hitSlop=\{\{ top: 13, bottom: 13, left: 8, right: 8 \}\}/);
  assert.match(toggle, /const word = open \? m\.today\.collapse : m\.today\.expand;/);
  const koToday = require('../src/i18n/ko/today').default;
  assert.equal(koToday.doneHeadLabel({ n: 4 }), '했어요 4개');
  assert.deepEqual([koToday.expand, koToday.collapse], ['펼치기', '접기']);
});

// D-1 '요일 글자는 남은 습관 위'는 디자인 A(S3)에서 지웠다 — 끝낸 줄이 제자리에 남고(했어요 묶음 없음), 줄의 작은 주 칸도 kit가 지웠다

test('D-1: 홈 — 다 한 날엔 고르기 줄이 마감 위에 없고, 마감 아래 조용한 더 고르기', () => {
  // 디자인 A(S1): 고르기 줄은 오늘 할 일이 하나도 없을 때만(체크 칸 자리의 + 글리프), 다 한 날엔 마감 한 줄 아래 누르는 글
  const s = src('src/screens/Dashboard.tsx');
  assert.match(s, /if \(!complete && todayTotal === 0\) \{/);
  const after = s.slice(s.indexOf('{complete && ('), s.indexOf('\n}\n', s.indexOf('{complete && (')));
  assert.match(after, /accessibilityLabel=\{m\.home\.closeLabel\(\{ day, n: todayTotal \}\)\}/);
  assert.match(after, /\{complete && canPick && \(/);
  assert.match(after, /<TextLink M=\{M\} label=\{m\.home\.pickMore\} onPress=\{\(\) => \{ tap\(\); openPick\(\); \}\} \/>/);
  assert.match(after, /minHeight: 44/);
});

// D-1 '마감 두 줄이 첫 화면 안에'(예전 장부 두 줄의 높이 셈)와 D-18(목록 위 틈 · 34/40 숫자 · 10pt 집계 네모)은
// 디자인 A(S3)에서 머리의 1/10 · 하루 마감 큰 숫자로 바뀌며 지웠다 — 새 높이 셈은 tests/a-s3.test.js

test('D-11: 보드 — 목록과 같은 순서(마감 지난 것부터)', () => {
  // 붉은 여백 줄 · 진행 중 표시색 · 흐린 체크(모양)는 디자인 A(S3)에서 지웠다 — 마감 지남은 정보 줄의 말('마감 3일 지남')로
  const s = src('src/screens/TodayModes.tsx');
  const kanban = slice(s, 'export function TodayKanban(', '/**\n * 보드의 한 줄');
  assert.match(kanban, /const list = useMemo\(\(\) => orderedTodayItems\(doc, new Date\(\)\)/);
  assert.doesNotMatch(kanban, /todayItems\(doc/);
  assert.match(kanban, /\{ label: m\.today\.colDoing, stage: 1 \}/);
  assert.equal(require('../src/i18n/ko/today').default.colDoing, '진행 중');
});

test('D-11: 연속 기록 정보 줄 — 영역과 반복 일정을 core.dot으로 잇는다(ja는 ・)', () => {
  const s = src('src/screens/TodayModes.tsx');
  const line = slice(s, 'const StreakLine = memo(', '// ── 보드');
  assert.doesNotMatch(line, /`\$\{area\} · \$\{plan\}`/);
  // 가운뎃점은 core.dot — ja는 '・' (F-1 · R-5 #6). 줄은 kit RowMeta(영역 표시 + 한 줄)
  assert.match(line, /<RowMeta M=\{M\} area=\{ti\} text=\{plan \? `\$\{area\}\$\{m\.core\.dot\}\$\{plan\}` : area\} \/>/);
});

// D-25의 연속 기록 큰 숫자(46/52)는 디자인 A(S3)에서 figure(26/34) + 단위로 바뀌며 지웠다 — tests/a-s3.test.js. 통계 쪽은 그대로 둔다
// D-25의 통계 큰 숫자(46/52)도 디자인 A(S4)에서 히어로 칸(figureField 22/30 + 단위)으로 바뀌며 지웠다 — tests/a-s4.test.js

// D-17(홈 괘선 목록의 26pt 자리 · 구분선 inset)은 디자인 A(S1)에서 kit 줄(Row · TodayRow, 줄 사이 선 38)로 바뀌며 지웠다 — tests/a-s1.test.js

test('D-23: 직접 적은 줄의 ×는 누르는 범위가 넉넉하다(28pt + hitSlop 12)', () => {
  // 오른쪽 81pt 칸은 디자인 A(패키지 K)에서 없어졌다 — ×는 줄 가운데의 글리프 하나
  const s = src('src/components/TodayRow.tsx');
  assert.match(s, /const REMOVE_BTN = 28;/);
  assert.match(s, /onPress=\{press\.remove\}\s*hitSlop=\{12\}/);
});
