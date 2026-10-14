// DX-4 디자인 수정 — 통계·설정·백업 불러오기·탭바 (docs/mp/final/design-review.md D-14 · D-15 · D-20 · D-24 · D-31 · D-32)
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { MOODS, alpha, fade, mix, toHex } = require('../src/theme/moods');
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

test('D-14: 탭바의 지금 탭 표시는 윗 괘선 위가 아니라 탭바 안(top: 3)', () => {
  const s = src('src/navigation/Root.tsx');
  assert.match(s, /position: 'absolute' as const, top: 3, left: 0, width: IND_W, height: 2/);
  assert.doesNotMatch(s, /top: -1, left: 0, width: IND_W/);
});

test('D-15: 설정 제목은 뒤로 가기 아래 줄(20pt 왼쪽 끝), 최근 10주 칸은 오른쪽 끝까지', () => {
  assert.match(src('src/screens/Settings.tsx'), /<Header M=\{M\} kr="설정" onBack=\{back\} focusTitle stacked \/>/);
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

test('D-20: 달성한 칸이 없으면 닳은 자리 표에 0%를 찍지 않는다(화면 읽기 이름은 그대로)', () => {
  const charts = src('src/components/StatsCharts.tsx');
  assert.match(charts, /const blank = totalDone\(doc\) === 0;/);
  assert.equal((charts.match(/\{!blank && \(/g) ?? []).length, 2, '영역 이름표 % · 가운데 %');
  assert.match(charts, /accessibilityLabel=\{`\$\{name\} \$\{p\.pct\}%/);
  const stats = src('src/screens/Stats.tsx');
  assert.match(stats, /caption=\{hasData \? streakCaption\(streak, todayHas\) : ''\}/);
});

test('D-24: 닳은 자리 범례 견본의 밝기가 실제 칸(영역 색) 범위에 든다 — 다크의 5+가 흰 가운데 칸처럼 보이지 않는다', () => {
  const WEAR_FILL = [25, 45, 65, 85];
  for (const [name, M] of Object.entries(MOODS)) {
    const swatch = M.dark ? toHex(mix(M.sub, M.bg, 0.3)) : toHex(M.sub);
    WEAR_FILL.forEach((f) => {
      const legend = lumOver(alpha(swatch, f / 100), M.bg);
      const cells = PILLAR_COLORS.map((c) => lumOver(fade(c, f), M.bg));
      const lo = Math.min(...cells);
      const hi = Math.max(...cells);
      // 견본은 칸 범위에서 10% 안쪽(사람 눈에 같은 단계로 보이게)
      assert.ok(legend >= lo * 0.9 && legend <= hi * 1.1, `${name} ${f}%: 견본 ${legend.toFixed(3)} / 칸 ${lo.toFixed(3)}~${hi.toFixed(3)}`);
    });
  }
  const charts = src('src/components/StatsCharts.tsx');
  assert.doesNotMatch(charts, /alpha\(M\.ink, WEAR_FILL/);
  // 쌓기 칸의 진행 막대는 칸 안쪽에 띄운다(바닥 괘선 위 100% 막대가 아래 칸 테두리처럼 읽히지 않게)
  assert.match(charts, /position: 'absolute', left: 3, right: 3, bottom: 3, height: 2, backgroundColor: headTrack\(th\.color\)/);
});

test('D-31: 설정 › 기록 — 백업 묶음(+저장 위치 안내)과 새로 시작 묶음을 떼어 둔다', () => {
  const s = src('src/screens/Settings.tsx');
  const at = (needle) => {
    const i = s.indexOf(needle);
    assert.ok(i >= 0, needle);
    return i;
  };
  const order = [
    '<Section M={M} label="기록" />', '<SubHead M={M} label="백업" first />', 'title="백업 내보내기"', 'title="백업 불러오기"',
    'last title="저장본"', '{STORAGE_NOTE}', '<SubHead M={M} label="새로 시작" />', 'first title="템플릿으로 새로 쓰기"',
    'title="예시로 채우기"', 'last danger title="전체 초기화"', '<Section M={M} label="정보" />',
  ].map(at);
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test('D-32: 백업 불러오기 — 파일에서 읽으면 붙여 넣기 칸 대신 한 줄, 머리는 다른 시트와 같은 17/800', () => {
  const s = src('src/overlays/BackupImport.tsx');
  assert.match(s, /\{fromFile \? \(\s*<FileRow M=\{M\} name=\{fromFile\.name\} onPaste=\{toPaste\} \/>/);
  assert.match(s, /takeFile\(await picked\.result\.text\(\), picked\.result\.name\)/);
  assert.match(s, /<SheetHead M=\{M\} title="백업 불러오기" body="지금 기록이 백업 내용으로 바뀌어요\. 바꾼 직후에는 되돌릴 수 있어요\." \/>/);
  assert.doesNotMatch(s, /fontSize: 20, lineHeight: 26/);
  // 붙여 넣기로 돌아가면 읽은 글을 비운다
  assert.match(s, /const toPaste = useCallback\(\(\) => \{[\s\S]{0,120}setFromFile\(null\);\s*setText\(''\);\s*setSettled\(''\);/);
  // 같은 머리를 템플릿 고르기·설정 시트가 함께 쓴다
  const sheet = src('src/components/TemplateSheet.tsx');
  assert.match(sheet, /export function SheetHead\(/);
  assert.match(sheet, /<SheetHead M=\{M\} title="템플릿 고르기"/);
  assert.match(src('src/screens/Settings.tsx'), /import \{ SheetHead, TemplateSheet \} from '\.\.\/components\/TemplateSheet';/);
});
