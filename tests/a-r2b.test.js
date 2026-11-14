// R2b · 정리(디자인 A, docs/design/build-plan.md §3 웨이브 4 R2, §6 S2 · O4 메모)
// - 만다라트 탭: 지도 ↔ 크게 본 블록(그리고 이웃 영역)으로 바뀌면 쪽의 스크롤이 맨 위로 간다
// - Maestro: 지도는 칸을 누를 수 없다 — grid-cell-*을 누르기 전에 그 칸이 든 grid-block-*을 먼저 누른다
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('쪽 스크롤: screen.ts가 PageScroll · usePageScrollTop을 주고, Root가 두 쪽 모두에 같은 함수를 넣는다', () => {
  const screen = src('src/lib/screen.ts');
  assert.match(screen, /export const PageScroll = createContext<\(\(\) => void\) \| null>\(null\);/);
  assert.match(screen, /export function usePageScrollTop\(\): \(\) => void \{\s*return useContext\(PageScroll\) \?\? noScroll;/);

  const root = src('src/navigation/Root.tsx');
  const main = root.slice(root.indexOf('const RootView = memo('), root.indexOf('const CompanionPage = memo('));
  assert.match(main, /const scrollTop = useCallback\(\(\) => \{ scrollRef\.current\?\.scrollTo\(\{ y: 0, animated: false \}\); \}, \[\]\);/);
  assert.match(main, /<PageScroll\.Provider value=\{scrollTop\}>\s*<PinnedHeaderSlot\.Provider value=\{setPinned\}>\{screen\}<\/PinnedHeaderSlot\.Provider>\s*<\/PageScroll\.Provider>/);

  const comp = root.slice(root.indexOf('const CompanionPage = memo('), root.indexOf('const TAB_ORDER'));
  assert.match(comp, /<Animated\.ScrollView\s+ref=\{scrollRef\}/);
  assert.match(comp, /const scrollTop = useCallback\(\(\) => \{ scrollRef\.current\?\.scrollTo\(\{ y: 0, animated: false \}\); \}, \[\]\);/);
  assert.match(comp, /<PageScroll\.Provider value=\{scrollTop\}>\s*<PinnedHeaderSlot\.Provider value=\{null\}>\{body\}<\/PinnedHeaderSlot\.Provider>\s*<\/PageScroll\.Provider>/);
});

test('만다라트 탭: 크게 보기 · 접기 · 다른 블록으로 넘기기는 모두 쪽을 맨 위로', () => {
  const s = src('src/screens/GridScreen.tsx');
  assert.match(s, /const scrollTop = usePageScrollTop\(\);/);
  for (const head of ['const open = (f: GridFocus) => {', 'const close = () => {', 'const switchTo = (f: GridFocus, from: 1 | -1 | 0 = 0) => {']) {
    const at = s.indexOf(head);
    assert.ok(at >= 0, head);
    const body = s.slice(at, s.indexOf('\n  };', at));
    assert.match(body, /\n    tap\(\);\n    scrollTop\(\);\n    gridMemory\.focus = /, head);
  }
  // 영역 화면의 뒤로는 만다라트 탭에서도 같은 testID(흐름 11이 지도로 돌아갈 때 누른다)
  assert.match(s, /<AreaPage[\s\S]*?backTestID=\{TID\.detailBack\}[\s\S]*?\/>/);
});

/** 흐름 파일의 명령을 줄 단위로(들여쓰기 무시) — tapOn 다음 줄의 id를 순서대로 */
function tapIds(file) {
  const lines = src(file).split('\n').map((l) => l.trim());
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^- tapOn:$/.test(lines[i])) continue;
    const m = (lines[i + 1] ?? '').match(/^id: "([^"]+)"$/);
    if (m) out.push(m[1]);
  }
  return out;
}

test('Maestro: grid-cell-ti-ai를 누르기 전에 같은 영역의 grid-block-ti를 누른다(지도는 블록만 누를 수 있다)', () => {
  const dirs = ['.maestro/phone', '.maestro/ipad', '.maestro/common'];
  let cells = 0;
  for (const d of dirs) {
    for (const f of fs.readdirSync(path.join(ROOT, d)).filter((n) => n.endsWith('.yaml'))) {
      const ids = tapIds(`${d}/${f}`);
      ids.forEach((id, i) => {
        const cell = id.match(/^grid-cell-(\d)-(\d)$/);
        if (!cell) return;
        cells++;
        assert.ok(ids.slice(0, i).includes(`grid-block-${cell[1]}`), `${d}/${f}: ${id} 앞에 grid-block-${cell[1]}`);
      });
    }
  }
  assert.ok(cells >= 1, '칸을 누르는 흐름이 있다(03)');
});

test('Maestro: 한 해(stats-year)로 가는 흐름은 먼저 올해 범위(stats-scope-year)를 누른다', () => {
  for (const d of ['.maestro/phone', '.maestro/ipad', '.maestro/common']) {
    for (const f of fs.readdirSync(path.join(ROOT, d)).filter((n) => n.endsWith('.yaml'))) {
      const s = src(`${d}/${f}`);
      const at = s.indexOf('id: "stats-year"');
      if (at < 0) continue;
      const scope = s.indexOf('id: "stats-scope-year"');
      assert.ok(scope >= 0 && scope < at, `${d}/${f}`);
    }
  }
});

test('Maestro 11: 지도 → 블록 크게(영역 화면) → 뒤로 지도', () => {
  const s = src('.maestro/phone/11-full-grid.yaml');
  const order = ['id: "grid-block-0"', 'id: "grid-block-7"', 'id: "grid-block-3"', 'id: "grid-cell-3-3"', 'id: "detail-back"', 'takeScreenshot: "phone-grid"'];
  let at = -1;
  for (const x of order) {
    const next = s.indexOf(x, at + 1);
    assert.ok(next > at, x);
    at = next;
  }
});

test('지운 것이 돌아오지 않는다 — 옛 보드 · 옛 부품 · 옛 무드 표 · 옛 팔레트 이름', () => {
  for (const f of ['ChartBoard', 'SegmentedControl', 'WeekStrip', 'ProgressBar', 'AnimatedNumber', 'Pressy']) {
    assert.equal(fs.existsSync(path.join(ROOT, 'src/components', `${f}.tsx`)), false, f);
  }
  assert.equal(fs.existsSync(path.join(ROOT, 'src/lib/useSettle.ts')), false);
  const moods = require('../src/theme/moods');
  for (const k of ['MOODS', 'withAccent', 'accentInk', 'areaInk', 'contrastEdition', 'tint', 'fade']) assert.equal(moods[k], undefined, k);
  const palette = require('../src/theme/palette');
  for (const k of ['ACCENTS', 'SEMANTIC', 'MOOD_COLORS', 'INK', 'readableOn']) assert.equal(palette[k], undefined, k);
  // GOLD는 남는다 — 저장값 settings.accent의 기본값(옛 앱 · 다른 기기가 읽는다)
  assert.equal(palette.GOLD, '#B0883C');
  const type = require('../src/theme/type');
  for (const k of ['TYPE', 'RHYTHM']) assert.equal(type[k], undefined, k);
  const { PALETTE } = moods;
  for (const k of ['bg', 'surface', 'card', 'sub', 'faint', 'line', 'tabBg', 'gold', 'goldInk', 'center', 'accent']) {
    assert.equal(k in PALETTE.light, false, k);
  }
  const { msg, LANGS } = require('../src/i18n');
  for (const l of LANGS) {
    const m = msg(l);
    for (const k of ['paperIvory', 'accentGold', 'shapeRound']) assert.equal(k in m.core, false, `${l} core.${k}`);
    for (const k of ['subAccent', 'subShape', 'subPaper']) assert.equal(k in m.settings, false, `${l} settings.${k}`);
  }
});
