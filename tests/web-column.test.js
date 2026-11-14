// 첫 화면 표 가운데 정렬 · 웹 넓은 화면에서 폰 한 장 폭 틀
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('웹: 폭에 맞춰 크기를 정하는 화면은 묶인 폭(lib/screen)을 쓴다', () => {
  const files = [
    'src/components/kit/Row.tsx', 'src/components/ChartBoard.tsx', 'src/overlays/CellEditor.tsx', 'src/overlays/FocusTimer.tsx',
    'src/overlays/ShareChart.tsx', 'src/screens/TodayModes.tsx', 'src/screens/Dashboard.tsx',
    'src/screens/FullGrid.tsx', 'src/screens/Stats.tsx', 'src/screens/Onboarding.tsx',
  ];
  for (const f of files) {
    const s = src(f);
    assert.match(s, /import \{ useWindowDimensions \} from '(\.\.\/)+lib\/screen';/, f);
    assert.doesNotMatch(s, /import \{[^}]*\buseWindowDimensions\b[^}]*\} from 'react-native'/, f);
  }
  const screen = src('src/lib/screen.ts');
  assert.match(screen, /export const WEB_MAX_W = 480;/);
  assert.match(screen, /WEB && d\.width > WEB_MAX_W \? \{ \.\.\.d, width: WEB_MAX_W \} : d/);
});

test('웹: 앱 틀 · 시트 · 전체 화면 창이 같은 폭 안에 선다', () => {
  // 단 바깥은 책상(tokens desk: 밝게 tile · 어둡게 한 톤 깊게)
  assert.match(src('App.tsx'), /<PaperColumn bg=\{desk\(P\)\} edge=\{P\.line\}>\s*<Root \/>/);
  assert.match(src('src/components/common.tsx'), /panel,\s*shadow\(8/);
  for (const f of ['src/overlays/FocusTimer.tsx', 'src/overlays/WeekRitual.tsx', 'src/overlays/Celebration.tsx']) {
    const s = src(f);
    assert.match(s, /<PaperColumn bg=\{M\.(center|bg|paper)\}/, f);
    assert.ok(s.indexOf('</PaperColumn>') < s.indexOf('</Modal>'), f);
  }
  // 폰(네이티브)에서는 아무것도 감싸지 않는다 — 웹·아이패드는 늘 감싼다
  assert.match(src('src/components/WebColumn.tsx'), /if \(!wrapped\.current\) return <>\{children\}<\/>;/);
  assert.match(src('src/components/WebColumn.tsx'), /export const WebColumn = PaperColumn;/);
});
