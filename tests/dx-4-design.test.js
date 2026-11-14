// DX-4 디자인 수정 — 통계·설정·백업 불러오기·탭바 (docs/mp/final/design-review.md D-14 · D-15 · D-20 · D-24 · D-31 · D-32)
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { PILLAR_COLORS } = require('../src/theme/palette');

const src = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

/** 반투명 rgba를 바탕 위에 겹친 색의 상대 휘도 */
function lumOver(rgba, bg) {
  const [r, g, b, a] = rgba.match(/[\d.]+/g).map(Number);
  const base = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
  const ch = [r, g, b].map((c, i) => (c * a + base[i] * (1 - a)) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

// D-14(탭바 위 지금 탭 표시 막대)는 디자인 A의 떠 있는 탭 막대(고른 탭은 칠한 글리프)로 바뀌어 지웠다 — tests/a-chrome.test.js가 본다

test('D-15: 설정 제목은 뒤로 가기 아래 줄(머리는 스크롤 밖에 고정, S6), 최근 10주 칸은 오른쪽 끝까지', () => {
  assert.match(src('src/screens/Settings.tsx'), /<Header M=\{M\} title=\{st\.screenTitle\} onBack=\{back\} focusTitle pinned backTestID=\{TID\.setBack\} \/>/);
  const charts = src('src/components/StatsCharts.tsx');
  assert.match(charts, /const labelW = Math\.max\(HEAT_LABEL_W, Math\.floor\(width\) - cell \* map\.cols\.length - HEAT_GAP \* \(map\.cols\.length - 1\)\);/);
  assert.doesNotMatch(charts, /width: HEAT_LABEL_W/);
  // StatsCharts.heatCellSize와 같은 식(라벨 24 · 칸 사이 3 · 10주)
  const heatCellSize = (w) => Math.max(8, Math.floor((w - 24 - 9 * 3) / 10));
  for (const w of [350, 335, 390]) {
    const cell = heatCellSize(w);
    const labelW = Math.max(24, Math.floor(w) - cell * 10 - 27);
    assert.equal(labelW + cell * 10 + 27, w, `${w}pt: 마지막 열이 오른쪽 끝에 닿는다`);
  }
});

test('D-20: 달성한 칸이 없으면 닳은 자리 지도에 0%를 찍지 않는다(화면 읽기 이름은 그대로)', () => {
  // 디자인 A(S4): 이름 칸은 영역 이름만(지도와 같은 글), %는 가운데 칸 하나와 화면 읽기 이름에
  const charts = src('src/components/StatsCharts.tsx');
  assert.match(charts, /const blank = done === 0;/);
  assert.equal((charts.match(/\{!blank && \(/g) ?? []).length, 1, '가운데 %');
  assert.match(charts, /accessibilityLabel=\{`\$\{name\} \$\{p\.pct\}%/);
  const stats = src('src/screens/Stats.tsx');
  assert.match(stats, /note=\{hasData \? streakCaption\(streak, todayHas, l\) : ''\}/);
});

// D-24(닳은 자리 범례 견본의 밝기 · 쌓기 칸 진행 막대 자리)는 디자인 A(S4)의 타일 지도와 회색 타일 범례로 바뀌어 지웠다 — tests/a-s4.test.js가 본다

test('D-31: 설정 — 백업 묶음(iCloud와 백업 + 저장 위치 안내)과 새로 시작 묶음을 떼어 둔다', () => {
  const s = src('src/screens/Settings.tsx');
  const at = (needle) => {
    const i = s.indexOf(needle);
    assert.ok(i >= 0, needle);
    return i;
  };
  const order = [
    '<SetSection M={M} label={st.secCloud} />', '<SyncSection M={M} />', 'title={st.exportTitle}', 'title={st.importTitle}',
    'glyph="copies" glyphTone="print" divider title={st.snapTitle}', '<SetNote M={M} text={storage.note} />', '<SetSection M={M} label={st.subRestart} />', 'first title={st.templateRow}',
    'title={st.sampleRow}', 'last danger title={st.resetRow}', '<SetSection M={M} label={st.secInfo} />',
  ].map(at);
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test('D-32: 백업 불러오기 — 파일에서 읽으면 붙여 넣기 칸 대신 한 줄, 머리는 다른 시트와 같은 17/800', () => {
  const s = src('src/overlays/BackupImport.tsx');
  assert.match(s, /\{fromFile \? \(\s*<FileRow M=\{M\} name=\{fromFile\.name\} onPaste=\{toPaste\} \/>/);
  assert.match(s, /takeFile\(await picked\.result\.text\(\), picked\.result\.name\)/);
  assert.match(s, /<SheetHead M=\{M\} title=\{b\.sheetTitle\} body=\{b\.sheetBody\} \/>/);
  const kb = require('../src/i18n/ko/backup').default;
  assert.equal(kb.sheetTitle, '백업 불러오기');
  assert.equal(kb.sheetBody, '지금 기록이 백업 내용으로 바뀌어요. 바꾼 직후에는 되돌릴 수 있어요.');
  assert.doesNotMatch(s, /fontSize: 20, lineHeight: 26/);
  // 붙여 넣기로 돌아가면 읽은 글을 비운다
  assert.match(s, /const toPaste = useCallback\(\(\) => \{[\s\S]{0,120}setFromFile\(null\);\s*setText\(''\);\s*setSettled\(''\);/);
  // 같은 머리를 템플릿 고르기·설정 시트가 함께 쓴다
  const sheet = src('src/components/TemplateSheet.tsx');
  assert.match(sheet, /export function SheetHead\(/);
  assert.match(sheet, /<SheetHead M=\{M\} title=\{ed\.templateTitle\} body=\{ed\.templateBody\} \/>/);
  assert.equal(require('../src/i18n/ko/editor').default.templateTitle, '템플릿 고르기');
  assert.match(src('src/screens/Settings.tsx'), /import \{ SheetHead, TemplateSheet \} from '\.\.\/components\/TemplateSheet';/);
});
