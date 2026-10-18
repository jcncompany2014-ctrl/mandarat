// DX-VERIFY — 디자인 수정(DX-1~4) 뒤 다시 본 화면에서 나온 것들을 지킨다.
// - 홈: 시작하기 줄도 다른 홈 목록처럼 체크 26 + 12 = 38pt 자리(D-17), 하루 마감 글은 20pt · 370pt 가장자리에(NEW-3).
// - 포인트 컬러 표시: 보드 '진행 중' · 홈 마감 밑줄 · 81칸 '달성'도 표와 통계처럼 M.gold(NEW-1).
// - 보드: 진행 중 줄은 마감 지남 줄과 같은 여백 자리 · 굵기(NEW-2).
// - 할 일 시트: '마감 없음' 줄은 아래 묶음의 윗줄을 제 아랫줄로(D-10).
// - 백업 불러오기: 파일 줄 사이 겹줄 없음, '최근 기록' 경고는 표 위에.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { MOODS, withAccent, contrastEdition, toHex } = require('../src/theme/moods');
const { ACCENTS, GOLD, PILLAR_COLORS, contrast } = require('../src/theme/palette');
const { legibleMark, headBg } = require('../src/theme/chart');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const slice = (s, from, to) => {
  const i = s.indexOf(from);
  assert.ok(i >= 0, from);
  const j = s.indexOf(to, i + from.length);
  return s.slice(i, j < 0 ? undefined : j);
};

test('D-17: 홈 시작하기 — 체크 · 숫자 칸 26pt, 줄 사이 선은 다른 홈 목록과 같은 38pt에서', () => {
  const guide = slice(src('src/screens/Dashboard.tsx'), 'function StartGuide(', '\n}\n');
  assert.match(guide, /\{!first && <RowDivider M=\{M\} inset=\{TODAY_ROW_INSET\} \/>\}/);
  assert.doesNotMatch(guide, /TODAY_ROW_INSET - 2/);
  assert.doesNotMatch(guide, /size=\{24\}/);
  assert.match(guide, /width: 26, height: 26, borderRadius: 7/);
  // 오늘 할 일 줄과 같은 값 — 체크 26 + 사이 12
  const row = src('src/components/TodayRow.tsx');
  assert.match(row, /const CHECK = 26;/);
  assert.match(row, /export const TODAY_ROW_INSET = CHECK \+ GAP;/);
  assert.match(src('src/components/Check.tsx'), /size = 26/);
});

test('NEW-3: 홈 하루 마감 — 날짜 글 · 더 고르기 · 10 / 10이 같은 가장자리(오늘 화면 마감과 같다)', () => {
  const close = slice(src('src/screens/Dashboard.tsx'), 'function LedgerClose(', '\n}\n');
  assert.match(close, /\{ flexDirection: 'row', alignItems: 'baseline', paddingTop: 10 \}/);
  assert.doesNotMatch(close, /paddingHorizontal/);
});

test('NEW-1: 포인트 컬러 표시는 한 색 — 보드 진행 중 · 홈 마감 밑줄 · 81칸 달성도 M.gold', () => {
  const modes = src('src/screens/TodayModes.tsx');
  assert.doesNotMatch(modes, /legibleMark\(M\.accent/);
  assert.equal((modes.match(/legibleMark\(M\.gold, M\.bg, M\)/g) ?? []).length, 2, '진행 중 머리 표시 · 여백 줄');
  const dash = src('src/screens/Dashboard.tsx');
  assert.match(dash, /dayComplete && <View style=\{\{ height: 3, backgroundColor: legibleMark\(M\.gold, M\.bg, M\)/);
  // 시작하기 끝낸 체크는 같은 목록의 '정하기' 단추(M.accent 바탕)와 맞춘다 — 그대로 둔다
  assert.match(dash, /<Check on color=\{legibleMark\(M\.accent, M\.bg, M\)\} dark=\{M\.dark\} seed=\{st\.key\} \/>/);
  const grid = src('src/screens/FullGrid.tsx');
  assert.doesNotMatch(grid, /M\.goldInk/);
  assert.match(grid, /legibleMark\(M\.gold, bg, M, 4\.5\)/);
  // 파스텔 + 골드: 포인트 컬러(M.accent)와 표의 표시색(M.gold)이 다르다 — 그래서 한쪽으로 모은다
  const P = withAccent(MOODS['파스텔'], GOLD);
  assert.notEqual(legibleMark(P.accent, P.bg, P), legibleMark(P.gold, P.bg, P));
});

test("NEW-1: 81칸 '달성'(8pt) — 모든 무드 × 포인트 컬러 × 영역 색의 이름표 위에서 4.5:1 이상", () => {
  let n = 0;
  for (const [name, mood] of Object.entries(MOODS)) {
    for (const accent of ACCENTS) {
      for (const [ic, M] of [['', withAccent(mood, accent.color)], [' +IC', contrastEdition(withAccent(mood, accent.color))]]) {
        for (const c of PILLAR_COLORS) {
          const bg = toHex(headBg(c, M));
          const label = legibleMark(M.gold, bg, M, 4.5);
          const r = contrast(toHex(label), bg);
          assert.ok(r >= 4.5, `${name}${ic} ${accent.name} ${c}: ${r.toFixed(2)}`);
          n++;
        }
      }
    }
  }
  assert.ok(n >= 400, `${n}`);
});

test('NEW-2: 보드 진행 중 줄 — 마감 지남 줄과 같은 여백 자리(−10pt) · 같은 굵기(2pt) · 모서리 없음', () => {
  const card = slice(src('src/screens/TodayModes.tsx'), 'const KanbanCard = memo(', '}, sameProps);');
  const doing = card.match(/stage === 1 && \(\s*<View[\s\S]*?\/>/)[0];
  const late = card.match(/overdue && \(\s*<View[\s\S]*?\/>/)[0];
  const geo = (s) => s.match(/left: (-?\d+), top: (\d+), bottom: (\d+), width: (\d+)/).slice(1).join(',');
  assert.equal(geo(doing), geo(late));
  assert.equal(geo(doing), '-10,12,12,2');
  assert.doesNotMatch(doing, /borderRadius/);
});

test("D-10: 할 일 시트 — '마감 없음' 줄은 묶음 앞 간격만큼 당겨 묶음의 윗줄을 아랫줄로 쓴다", () => {
  const s = src('src/overlays/ActionSheet.tsx');
  assert.match(s, /const ROWS_GAP = 22;/);
  assert.match(s, /<View style=\{\{ marginTop: -1, marginBottom: -ROWS_GAP \}\}>\s*<LineRow M=\{M\} title=\{m\.sheet\.noDue\}/);
  const rows = slice(s, 'function SheetRows(', '\n}\n');
  assert.match(rows, /<View style=\{\{ marginTop: ROWS_GAP \}\}>/);
  assert.doesNotMatch(rows, /marginTop: 22/);
  // 'once'면 아래 묶음(오늘 할 일에 담기 · 25분 집중하기)이 늘 있다 — 빌릴 윗줄이 없는 경우가 없다
  assert.match(rows, /const daily = kind !== 'mind';/);
});

test('백업 불러오기: 파일을 읽은 뒤 파일 고르기 줄과 파일 줄 사이에 빈 띠 · 겹친 줄이 없다', () => {
  const s = src('src/overlays/BackupImport.tsx');
  assert.match(s, /<LineRow\s+M=\{M\}\s+first\s+last=\{!fromFile\}/);
  const row = slice(s, 'function FileRow(', '\n}\n');
  // 바깥 줄 스타일 — 위 간격 없이 바로 붙고, 제 윗줄 · 아랫줄을 긋는다
  assert.match(row, /style=\{\{\s*minHeight: 52, paddingVertical: 8, paddingHorizontal: 2, gap: 12,\s*borderTopWidth: 1, borderBottomWidth: 1/);
  assert.doesNotMatch(row, /marginTop: 16/);
});

test("백업 불러오기: '지금 기록이 더 최근' 경고는 표 위 — 작은 화면에서도 아래로 밀려 가려지지 않는다", () => {
  const ledger = slice(src('src/overlays/BackupImport.tsx'), 'function Ledger(', '\n}\n');
  const warn = ledger.indexOf('{b.newerNow}');
  const table = ledger.indexOf('<View style={{ marginTop: 10, borderTopWidth: 1');
  assert.ok(warn > 0 && table > 0);
  assert.ok(warn < table, '경고가 표보다 먼저');
  assert.equal((ledger.match(/\{b\.newerNow\}/g) ?? []).length, 1);
  assert.match(ledger, /color: alertInk\(M\), marginTop: 6 \}\}>\{b\.newerNow\}/);
  assert.equal(require('../src/i18n/ko/backup').default.newerNow, '지금 기록이 백업보다 최근이에요 · 바꾸면 최근 기록이 사라져요');
});
