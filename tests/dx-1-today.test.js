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

test('D-1: 다 한 날 오늘 — 고르기 줄은 빼고, 했어요가 3개보다 많으면 머리를 눌러 접고 펼친다', () => {
  const s = src('src/screens/Today.tsx');
  const list = slice(s, 'function TodayList(', '/** 다 한 날');
  // 훅은 빈 목록에서 일찍 돌아가기 전에
  const early = list.indexOf('if (total === 0) return');
  assert.ok(list.indexOf('const [doneOpen, setDoneOpen] = useState(false);') > 0 && list.indexOf('const [doneOpen') < early);
  assert.ok(list.indexOf('if (!complete) setDoneOpen(false);') < early);
  assert.match(list, /const showPick = canPick && area == null && !complete;/);
  assert.match(list, /const canFold = complete && finished\.length > FOLD_MIN;/);
  assert.match(s, /const FOLD_MIN = 3;/);
  assert.match(list, /\.\.\.\(fold \? \[\] : finished\.map\(/);
  // 마감 두 줄은 목록 뒤 그대로
  assert.match(list, /<DayClose M=\{M\} complete=\{complete\} total=\{total\} \/>/);

  const head = slice(s, 'const DoneHead = memo(', '/**\n * 목록의 한 줄');
  assert.match(head, /accessibilityRole="button"/);
  assert.match(head, /accessibilityState=\{\{ expanded: !fold \}\}/);
  assert.match(head, /accessibilityLabel=\{m\.today\.doneHeadLabel\(\{ n: count \}\)\}/);
  assert.match(head, /minHeight: 44/);
  assert.match(head, /fold \? m\.today\.expand : m\.today\.collapse/);
  const koToday = require('../src/i18n/ko/today').default;
  assert.equal(koToday.doneHeadLabel({ n: 4 }), '했어요 4개');
  assert.deepEqual([koToday.expand, koToday.collapse], ['펼치기', '접기']);
  // 접지 않을 때는 머리말 그대로
  assert.match(head, /accessibilityRole="header"/);
});

test('D-1: 요일 글자는 남은 습관 위, 또는 펼친 했어요 머리 아래에만', () => {
  const s = src('src/screens/Today.tsx');
  assert.doesNotMatch(s, /hasHabit/);
  assert.match(s, /const pendingHabit = pending\.some\(\(r\) => r\.it\?\.kind === 'habit'\);/);
  assert.match(s, /const doneHabit = finished\.some\(\(r\) => r\.it\?\.kind === 'habit'\);/);
  assert.match(s, /\{pendingHabit && \(\s*<View style=\{\{ flexDirection: 'row', justifyContent: 'flex-end', paddingBottom: 5 \}\}>/);
  assert.match(s, /!pendingHabit && doneHabit && !fold[\s\S]{0,80}key="done-caption"/);
  // 머리 다음, 줄 앞
  assert.ok(s.indexOf('key="done-head"') < s.indexOf('key="done-caption"'));
  assert.ok(s.indexOf('key="done-caption"') < s.indexOf("finished.map((r, i) => renderRow(r, 'done'"));
});

test('D-1: 홈 — 다 한 날엔 점선 고르기 줄이 마감 두 줄 위에 없고, 마감 아래 조용한 더 고르기', () => {
  const s = src('src/screens/Dashboard.tsx');
  assert.match(s, /if \(!complete && \(canPick \|\| todayTotal === 0\)\) \{/);
  const after = slice(s, '<LedgerClose M={M}', '</View>\n    </>');
  assert.match(after, /\{complete && canPick && \(/);
  assert.match(after, /accessibilityLabel=\{m\.home\.pickMore\}/);
  assert.match(after, /\{m\.home\.pickMoreLink\}/);
  assert.match(after, /minHeight: 44/);
});

test('D-1: 마감 두 줄이 첫 화면 안에 — 접힌 묶음이면 SE(667pt)에서도 높이가 남는다', () => {
  // 머리 ≈ 상태 막대 + 날짜 머리(≈110) · 글자 탭 30+6 · 숫자 40+8+10(집계)+8+18(오늘 다 했어요)+8 · 색인 32+6+4 · 했어요 머리 44 · 마감 14+4+8+22
  const top = 110 + 36 + 100 + 42;
  const ruleY = top + 44 + 14;
  assert.ok(ruleY < 667 - 83, `${ruleY}`); // 탭 막대 위
});

test('D-18: 오늘 첫 줄 위의 정해지지 않은 틈만 줄인다', () => {
  const s = src('src/screens/Today.tsx');
  assert.match(s, /<View style=\{\{ paddingHorizontal: 20, paddingBottom: 6 \}\}>\s*<PureTextTabs/);
  assert.match(slice(s, 'const Counter = memo(', '// ── 빈 목록'), /return \(\s*<View style=\{\{ marginBottom: 8 \}\}>/);
  assert.match(s, /<View style=\{\{ marginBottom: 4 \}\}>\s*<PureIndexTabs/);
  // 정해진 크기는 그대로 — 34/40 숫자, 10pt 집계 네모
  assert.match(s, /fontSize: 34, lineHeight: 40/);
  assert.match(s, /const TALLY_BOX = 10;/);
});

test('D-11: 보드 — 마감 지난 것부터, 할 일 묶음에 목록과 같은 붉은 여백 줄, 했어요 체크는 흐리게', () => {
  const s = src('src/screens/TodayModes.tsx');
  const kanban = slice(s, 'export function TodayKanban(', '/** 카드 한 장');
  assert.match(kanban, /const list = useMemo\(\(\) => orderedTodayItems\(doc, new Date\(\)\)/);
  assert.doesNotMatch(kanban, /todayItems\(doc/);
  assert.match(kanban, /overdue=\{!!c\.item && stage === 0 && isOverdue\(doc, c\.item, now\)\}/);
  const card = slice(s, 'const KanbanCard = memo(', '}, sameProps);');
  assert.match(card, /\{overdue && \(\s*<View pointerEvents="none" style=\{\{ position: 'absolute', left: -10, top: 12, bottom: 12, width: 2, backgroundColor: alertInk\(M\) \}\} \/>/);
  assert.match(card, /<Check on color=\{color\} dark=\{M\.dark\} size=\{20\} seed=\{cardKey\} muted \/>/);
  // 목록과 같은 값
  assert.match(src('src/screens/Today.tsx'), /left: -10, top: 12, bottom: 12, width: 2, backgroundColor: alertInk\(M\)/);
  // 진행 중 줄도 같은 여백 자리 · 같은 굵기, 표·통계와 같은 표시색(최종 점검 NEW-2 · NEW-1)
  assert.match(card, /stage === 1 && \([\s\S]*?left: -10, top: 12, bottom: 12, width: 2, backgroundColor: legibleMark\(M\.gold, M\.bg, M\)/);
  assert.doesNotMatch(card, /left: -12|width: 3, borderRadius/);
  assert.match(kanban, /\{ label: m\.today\.colDoing, stage: 1, mark: legibleMark\(M\.gold, M\.bg, M\) \}/);
  assert.equal(require('../src/i18n/ko/today').default.colDoing, '진행 중');
});

test('D-11: 연속 기록 정보 줄 — 가운뎃점을 따로 써서 목록 · 보드와 같은 간격', () => {
  const s = src('src/screens/TodayModes.tsx');
  const line = slice(s, 'const StreakLine = memo(', '// ── 보드');
  assert.doesNotMatch(line, /`\$\{area\} · \$\{plan\}`/);
  // 가운뎃점은 core.dot을 다듬어 쓴다 — ja는 '・' (F-1 · R-5 #6)
  assert.match(line, /\{!!plan && \(\s*<>\s*<Text style=\{\{ fontSize: 13, fontWeight: '500', color: M\.sub \}\}>\{m\.core\.dot\.trim\(\)\}<\/Text>/);
  // 영역 이름은 줄지 않고(폭 상한) 반복 일정이 먼저 줄어든다 (F-1 · R-5 #1)
  assert.match(line, /<Text style=\{\{ flexShrink: 0, maxWidth: 78, [^}]*\}\} numberOfLines=\{1\}>\{area\}<\/Text>/);
});

test('D-25: 연속 기록 큰 숫자 — 통계와 같은 46/52 숫자, 20pt 회색 단위', () => {
  const s = src('src/screens/TodayModes.tsx');
  const hero = slice(s, '{/* 지금 연속', 'm.today.streakBest(');
  assert.match(hero, /fontSize: 46, lineHeight: 52/);
  assert.match(hero, /maxFontSizeMultiplier=\{1\.35\}/);
  assert.match(hero, /\{ fontSize: 46, fontWeight: '800', letterSpacing: -1\.5, color: M\.ink \}/);
  assert.match(hero, /\{ fontSize: 20, fontWeight: '700', color: M\.sub, letterSpacing: 0 \}/);
  assert.doesNotMatch(hero, /fontSize: 44/);
  const stats = src('src/screens/Stats.tsx');
  assert.match(stats, /fontSize: 46, lineHeight: 52, fontWeight: '800', color: M\.ink, letterSpacing: -1\.5/);
  assert.match(stats, /fontSize: 20, fontWeight: '700', color: M\.sub, letterSpacing: 0/);
});

test('D-17: 홈의 괘선 목록은 한 글 줄(38pt) · 한 구분선(TODAY_ROW_INSET)', () => {
  const s = src('src/screens/Dashboard.tsx');
  assert.doesNotMatch(s, /<RowDivider M=\{M\} inset=\{0\} \/>/);
  const area = slice(s, 'const AreaRow = memo(', '/**\n * 오늘 할 일');
  assert.match(area, /paddingHorizontal: 0/);
  assert.match(area, /<View style=\{\{ width: 26, alignItems: 'center' \}\}>/);
  assert.match(area, /inset=\{TODAY_ROW_INSET\}/);
  const prio = slice(s, '{/* 이번 주 중점', '{/* 오늘 할 일 —');
  assert.match(prio, /paddingHorizontal: 0/);
  assert.match(prio, /<View style=\{\{ width: 26, alignItems: 'center' \}\}>/);
  assert.match(prio, /inset=\{TODAY_ROW_INSET\}/);
});

test('D-23: 직접 적은 줄의 ×는 81pt 칸을 잡지 않는다(누르는 범위는 그대로)', () => {
  const s = src('src/components/TodayRow.tsx');
  assert.match(s, /const RIGHT_W = 81;/);
  assert.match(s, /const REMOVE_W = 32;/);
  assert.match(s, /width: right\?\.kind === 'remove' \? REMOVE_W : RIGHT_W/);
  assert.match(s, /onPress=\{press\.remove\}\s*hitSlop=\{12\}/);
});
