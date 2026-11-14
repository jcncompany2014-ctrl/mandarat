// DX-VERIFY — 디자인 수정(DX-1~4) 뒤 다시 본 화면에서 나온 것들을 지킨다.
// - 홈: 시작하기 줄도 다른 홈 목록처럼 38pt 자리(D-17, 디자인 A에서는 kit 줄).
// - 포인트 컬러 표시: 보드 '진행 중' · 홈 마감 밑줄 · 81칸 '달성'도 표와 통계처럼 M.gold(NEW-1).
// - 보드: 진행 중 줄은 마감 지남 줄과 같은 여백 자리 · 굵기(NEW-2).
// - 할 일 시트: '마감 없음' 줄은 아래 묶음의 윗줄을 제 아랫줄로(D-10).
// - 백업 불러오기: 파일 줄 사이 겹줄 없음, '최근 기록' 경고는 표 위에.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const slice = (s, from, to) => {
  const i = s.indexOf(from);
  assert.ok(i >= 0, from);
  const j = s.indexOf(to, i + from.length);
  return s.slice(i, j < 0 ? undefined : j);
};

test('D-17: 홈 시작하기 — kit 줄(체크 칸 24 + 사이 14), 줄 사이 선은 다른 홈 목록과 같은 38pt에서', () => {
  // 디자인 A(S1): 단계는 kit Row · LinkRow — 줄 사이 선은 kit가 상자 칸 자리(ROW.inset 38)부터 긋는다
  const guide = slice(src('src/screens/Dashboard.tsx'), 'function StartGuide(', '\n}\n');
  assert.equal((guide.match(/divider=\{i > 0\}/g) ?? []).length, 2, '글 줄 · 누르는 줄');
  assert.match(guide, /<CheckBox M=\{M\} state=\{st\.done \? 'done' : isNext \? 'open' : 'later'\} \/>/);
  assert.doesNotMatch(guide, /RowDivider|TODAY_ROW_INSET - 2/);
  // 오늘 할 일 줄의 사이 선 — kit 줄과 같은 값(체크 24 + 사이 14 = 38, 패키지 K)
  const row = src('src/components/TodayRow.tsx');
  assert.match(row, /export const TODAY_ROW_INSET = ROW\.inset;/);
  assert.match(src('src/components/kit/metrics.ts'), /inset: 24 \+ 14,/);
  assert.match(src('src/components/Check.tsx'), /size = 24/);
});

// NEW-3(홈 하루 마감 두 줄 · '10 / 10'의 가장자리)은 디자인 A(S1)에서 두 줄과 함께 지웠다 — 마감은 인쇄된 한 줄(tests/a-s1.test.js)

test('NEW-1: 포인트 컬러 표시는 한 색 — 보드 진행 중 · 홈 마감 밑줄 · 81칸 달성도 M.gold', () => {
  // 보드의 진행 중 머리 표시 · 여백 줄은 디자인 A(S3)에서 없어졌다 — 보드는 표시색을 쓰지 않는다(묶음은 구역 머리, 줄은 kit 뼈대)
  assert.doesNotMatch(src('src/screens/TodayModes.tsx'), /legibleMark\(|M\.gold|M\.accent/);
  // 홈의 마감 밑줄 · 시작하기 색 체크는 디자인 A(S1)에서 없어졌다 — 홈은 표시색을 쓰지 않는다(체크는 kit CheckBox)
  assert.doesNotMatch(src('src/screens/Dashboard.tsx'), /legibleMark\(/);
  // 81칸 표의 '달성' 글 · 오늘 표시는 디자인 A(S2)에서 색 지도(ColourMap)가 되며 없어졌다 — 지도는 표시색을 쓰지 않는다
  for (const f of ['src/screens/FullGrid.tsx', 'src/screens/GridScreen.tsx', 'src/screens/area/AreaPage.tsx']) {
    assert.doesNotMatch(src(f), /M\.goldInk|M\.gold\b|legibleMark\(/, f);
  }
});

// NEW-1의 81칸 '달성'(8pt) 대비는 옛 무드 표 · 포인트 컬러 · 보드(ChartBoard)와 함께 웨이브 4(R2)가 지웠다 — 색은 토큰(tests/a-tokens)

// NEW-2(보드 진행 중 · 마감 지남 여백 줄의 자리와 굵기)는 디자인 A(S3)에서 두 여백 줄과 함께 지웠다 — tests/a-s3.test.js

// D-10(할 일 시트 '마감 없음' 줄의 괘선 겹치기)은 디자인 A에서 줄 묶음이 머리카락 선 목록이 되며 지웠다 — tests/a-o2.test.js가 줄 차례를 본다

test('백업 불러오기: 파일을 읽은 뒤 파일 고르기 줄과 파일 줄 사이에 빈 띠 · 겹친 줄이 없다', () => {
  const s = src('src/overlays/BackupImport.tsx');
  // 파일 고르기 줄(LinkRow) 바로 밑에 파일 줄 — 사이 여백 없이, 줄 사이 머리카락 선 하나(x 38부터)
  assert.match(s, /<LinkRow\s+M=\{M\}\s+glyph="import"/);
  const row = slice(s, 'function FileRow(', '\n}\n');
  assert.match(row, /<View style=\{\{ minHeight: ROW\.h, flexDirection: 'row', alignItems: 'center', gap: ROW\.gap \}\}>\s*<RowRule M=\{M\} \/>/);
  assert.doesNotMatch(row, /marginTop|borderTopWidth|borderBottomWidth/);
});

test("백업 불러오기: '지금 기록이 더 최근' 경고는 표 위 — 작은 화면에서도 아래로 밀려 가려지지 않는다", () => {
  const ledger = slice(src('src/overlays/BackupImport.tsx'), 'function Ledger(', '\n}\n');
  const warn = ledger.indexOf('{b.newerNow}');
  const table = ledger.indexOf('{rows.map((r) =>');
  assert.ok(warn > 0 && table > 0);
  assert.ok(warn < table, '경고가 표보다 먼저');
  assert.equal((ledger.match(/\{b\.newerNow\}/g) ?? []).length, 1);
  // 경고는 알림 한 장(옅은 면 · 먹 글씨) — 손으로 정한 경고색 없이
  assert.match(ledger, /\{newer && \(\s*<View style=\{\{ marginTop: 12 \}\}>\s*<RuledNotice M=\{M\} title=\{b\.newerNow\} \/>/);
  assert.equal(require('../src/i18n/ko/backup').default.newerNow, '지금 기록이 백업보다 최근이에요 · 바꾸면 최근 기록이 사라져요');
});
