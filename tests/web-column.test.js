// 첫 화면 표 가운데 정렬 · 웹 넓은 화면에서 폰 한 장 폭 틀
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('온보딩: 3×3 표는 화면 가운데에, 폭에 맞춰 크게(작은 화면 228 · 그 밖 300)', () => {
  const onb = src('src/screens/Onboarding.tsx');
  assert.match(onb, /const sketchSize = Math\.round\(Math\.min\(winW - GUTTER \* 2, winH < 700 \? 228 : 300\)\)/);
  assert.match(onb, /<View style=\{\{ marginTop: 24, alignItems: 'center' \}\}>\s*<ChartSketch M=\{M\} size=\{sketchSize\}/);
  assert.doesNotMatch(onb, /alignItems: 'flex-start' \}\}>\s*<ChartSketch/);
  // 큰 표에서는 영역 이름도 한 단계 크게
  assert.match(src('src/components/ChartSketch.tsx'), /size >= 240 \? AREA_SIZES_LARGE : AREA_SIZES/);
});

test('웹: 폭에 맞춰 크기를 정하는 화면은 묶인 폭(lib/screen)을 쓴다', () => {
  const files = [
    'src/components/TodayRow.tsx', 'src/components/ChartBoard.tsx', 'src/overlays/CellEditor.tsx', 'src/overlays/FocusTimer.tsx',
    'src/overlays/ActionSheet.tsx', 'src/overlays/ShareChart.tsx', 'src/screens/TodayModes.tsx', 'src/screens/Dashboard.tsx',
    'src/screens/FullGrid.tsx', 'src/screens/Stats.tsx', 'src/screens/Onboarding.tsx',
  ];
  for (const f of files) {
    const s = src(f);
    assert.match(s, /import \{ useWindowDimensions \} from '\.\.\/lib\/screen';/, f);
    assert.doesNotMatch(s, /import \{[^}]*\buseWindowDimensions\b[^}]*\} from 'react-native'/, f);
  }
  const screen = src('src/lib/screen.ts');
  assert.match(screen, /export const WEB_MAX_W = 480;/);
  assert.match(screen, /WEB && d\.width > WEB_MAX_W \? \{ \.\.\.d, width: WEB_MAX_W \} : d/);
});

test('웹: 앱 틀 · 시트 · 전체 화면 창이 같은 폭 안에 선다', () => {
  assert.match(src('App.tsx'), /<WebColumn bg=\{mix\(P\.bg, P\.ink, 0\.05\)\} edge=\{P\.line\}>\s*<Root \/>/);
  assert.match(src('src/components/common.tsx'), /WEB_PANEL,\s*shadow\(8/);
  for (const f of ['src/overlays/FocusTimer.tsx', 'src/overlays/WeekRitual.tsx', 'src/overlays/Celebration.tsx']) {
    const s = src(f);
    assert.match(s, /<WebColumn bg=\{M\.(center|bg)\}/, f);
    assert.ok(s.indexOf('</WebColumn>') < s.indexOf('</Modal>'), f);
  }
  // 네이티브에서는 아무것도 감싸지 않는다
  assert.match(src('src/components/WebColumn.tsx'), /if \(Platform\.OS !== 'web'\) return <>\{children\}<\/>;/);
});
