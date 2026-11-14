// 디자인 A · C(chrome) — 머리 · 떠 있는 탭 막대와 담기 · 떠 있는 시트 · 단추 · 토스트 · 글리프(docs/design/build-plan.md §3 C).
// 화면은 띄우지 않는다: 수치는 토큰(GEO)과 소스에서, 글리프는 가짜 react-native-svg로 그린 나무에서 본다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { GEO, LIGHT, DARK } = require('../src/theme/tokens');
const { ICON_NAMES } = require('../src/types');

const ROOT = path.join(__dirname, '..');
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const slice = (s, from, to) => {
  const a = s.indexOf(from);
  assert.ok(a >= 0, from);
  const b = to ? s.indexOf(to, a + from.length) : s.length;
  assert.ok(b > a, to);
  return s.slice(a, b);
};

// ── 가짜 React · react-native-svg(tests/icons.test.js와 같은 방법) ──────────────
const React = {
  createElement(type, props, ...children) {
    return { type, props: { ...(props || {}), children: children.length <= 1 ? children[0] : children } };
  },
  memo(fn) {
    const m = (props) => fn(props);
    m.memoized = true;
    return m;
  },
  Fragment: 'Fragment',
};
const svgStub = { __esModule: true, default: 'Svg' };
for (const t of ['Path', 'Circle', 'Rect', 'Line', 'G']) svgStub[t] = t;
function load(file, stubs) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React },
  });
  const mod = { exports: {} };
  const req = (id) => {
    if (Object.prototype.hasOwnProperty.call(stubs, id)) return stubs[id];
    throw new Error(`${path.basename(file)}: require('${id}')`);
  };
  new Function('require', 'module', 'exports', outputText)(req, mod, mod.exports);
  return mod.exports;
}
function render(el) {
  if (el == null || el === false) return null;
  if (Array.isArray(el)) return el.map(render).filter(Boolean);
  if (typeof el.type === 'function') return render(el.type(el.props));
  const { children, ...props } = el.props;
  const kids = children === undefined ? [] : [].concat(children).flat(Infinity).map(render).filter(Boolean);
  return { type: el.type, props, children: kids };
}
const reactStub = { __esModule: true, default: React, ...React };
const COMP = path.join(ROOT, 'src', 'components');
const Line = load(path.join(COMP, 'LineIcons.tsx'), { react: reactStub, 'react-native-svg': svgStub, 'react-native': {} });
const Area = load(path.join(COMP, 'AreaIcons.tsx'), { react: reactStub, 'react-native-svg': svgStub, 'react-native': {}, './LineIcons': Line });
const IconMod = load(path.join(COMP, 'Icon.tsx'), { react: reactStub, 'react-native': {}, './LineIcons': Line, './AreaIcons': Area });
const draw = (props) => render(React.createElement(IconMod.Icon, props));
const parts = (tree) => tree.children.map((c) => ({ type: c.type, ...c.props }));

// ── 탭 막대 ──────────────────────────────────────────────────────────────────

test('탭 막대 자리: 높이 58 · 바닥 max(18, 안전 영역 − 4) · 스크롤 아래 여백 = 막대 + 바닥 + 24', () => {
  assert.deepEqual({ ...GEO.bar }, { h: 58, side: 16, bottom: 18, gap: 10, addW: 66, veil: 40 });
  const ui = src('src/navigation/ui.tsx');
  assert.match(ui, /export const TAB_BAR_H = GEO\.bar\.h;/);
  assert.match(ui, /return Math\.max\(GEO\.bar\.bottom, insetBottom - 4\);/);
  assert.match(ui, /return tabBarBottom\(insetBottom\) \+ TAB_BAR_H;/);
  assert.match(ui, /return tabBarTop\(insetBottom\) \+ GEO\.gutter;/);
  // 같은 식: 홈 버튼 기기(0) · 홈 표시줄 기기(34)
  const bottom = (ib) => Math.max(18, ib - 4);
  assert.equal(bottom(0) + 58 + 24, 100);
  assert.equal(bottom(34) + 58 + 24, 112);
  const root = src('src/navigation/Root.tsx');
  assert.match(root, /const clearance = tabClearance\(insets\.bottom\);/);
  assert.match(root, /const bottomPad = showTabs \? clearance : GEO\.gutter \+ insets\.bottom;/);
  assert.doesNotMatch(root, /TAB_CLEARANCE|SLOTS|ADD_SLOT|IND_W/, '다섯 칸 막대 · 지금 탭 표시 막대는 없다');
});

test('탭 막대 모양: 좌우 16 · 종이 알약(capsule, 모서리 29, 안쪽 6, 떠 있는 그림자) + 따로 선 담기(66, add · onAdd) · 넓은 창 560', () => {
  const root = src('src/navigation/Root.tsx');
  const bar = slice(root, 'const TabBar = React.memo(', 'const BarVeil = memo(');
  assert.match(bar, /const \{ side, gap, addW, veil \} = GEO\.bar;/);
  assert.match(bar, /left: side, right: side, bottom, height: TAB_BAR_H/);
  assert.match(bar, /maxWidth: SPREAD_TABS_W/);
  assert.match(bar, /borderRadius: GEO\.rTool, backgroundColor: M\.capsule, boxShadow: M\.float/);
  assert.match(bar, /paddingHorizontal: 6/);
  assert.match(bar, /accessibilityRole=\{BAR_ROLE\}/);
  assert.match(bar, /<AddButton onPress=\{onAdd\} width=\{addW\} \/>/);
  const add = slice(root, 'function AddButton(', null);
  assert.match(add, /testID=\{TID\.tabAdd\}/);
  assert.match(add, /borderRadius: GEO\.rTool, backgroundColor: M\.add, boxShadow: M\.float/);
  assert.match(add, /<Icon name="plus" size=\{24\} color=\{M\.onAdd\} \/>/);
  assert.match(add, /\.\.\.ROLE\.tabOn, color: M\.onAdd/);
  assert.equal(GEO.rTool, 29);
  // 네 곳: 홈 · 만다라트 · 오늘 · 통계 — 고른 탭은 칠한 글리프 + tabOn, 나머지는 인쇄 색
  assert.match(root, /\{ id: 'dashboard', icon: 'home', msgKey: 'tabHome' \},\n  \{ id: 'grid', icon: 'grid', msgKey: 'tabGrid' \},\n  \{ id: 'today', icon: 'checkCircle', msgKey: 'tabToday' \},\n  \{ id: 'stats', icon: 'chart', msgKey: 'tabStats' \},/);
  const item = slice(root, 'const TabItem = memo(', 'function AddButton(');
  assert.match(item, /testID=\{TID\.tab\(id\)\}/);
  assert.match(item, /accessibilityRole=\{TAB_ROLE\}/);
  assert.match(item, /accessibilityState=\{\{ selected: on \}\}/);
  assert.match(item, /const color = on \? M\.ink : M\.print;/);
  assert.match(item, /const type = on \? ROLE\.tabOn : ROLE\.tab;/);
  assert.match(item, /<Icon name=\{icon\} size=\{24\} color=\{color\} active=\{on\} ground=\{M\.capsule\} \/>/);
  // 탭 이름은 한 줄, 넘치면 0.8배까지 줄인다(일본어 マンダラート, 375)
  assert.match(item, /numberOfLines=\{1\}\s*adjustsFontSizeToFit\s*minimumFontScale=\{0\.8\}/);
  assert.match(root, /return w <= room \? 1 : Math\.max\(0\.8, room \/ w\);/);
});

test('탭 막대 뒤의 막: 종이 색 그라데이션(투명 → 막대 윗변에서 종이), 막대 위 40부터, 누름은 지나간다', () => {
  const root = src('src/navigation/Root.tsx');
  const veil = slice(root, 'const BarVeil = memo(', 'const TabItem = memo(');
  assert.match(veil, /<LinearGradient id=\{id\} x1="0" y1="0" x2="0" y2="1">/);
  assert.match(veil, /<Stop offset="0" stopColor=\{M\.paper\} stopOpacity=\{0\} \/>/);
  assert.match(veil, /<Stop offset=\{String\(solid\)\} stopColor=\{M\.paper\} stopOpacity=\{1\} \/>/);
  assert.match(veil, /pointerEvents="none"/);
  // 390×844(막대 바닥 18): 막 높이 18 + 58 + 40 = 116, 윗변까지 40 → 34.5%
  assert.equal(Number((40 / (18 + 58 + 40)).toFixed(3)), 0.345);
  assert.match(root, /height: bottom \+ TAB_BAR_H \+ veil/);
});

test('탭: 다시 누르면 맨 위로 · 바꾸면 고르기 촉감 · 담기는 빠른 담기 · 화면 모드는 LookProvider 몫', () => {
  const root = src('src/navigation/Root.tsx');
  const onTab = slice(root, 'const onTab = useCallback', 'const onAdd = useCallback');
  assert.match(onTab, /if \(id === cur\.screen\) \{[\s\S]*scrollRef\.current\?\.scrollTo\(\{ y: 0, animated: !reducedMotion\(\) \}\);/);
  assert.match(onTab, /select\(\);\s*cur\.go\(id\);/);
  assert.match(slice(root, 'const onAdd = useCallback', 'if (!onboarded)'), /tap\(\);\s*uiRef\.current\.openQuick\(\);/);
  assert.doesNotMatch(root, /Appearance\.setColorScheme/);
  // 설정에는 막대가 없다
  assert.match(root, /const showTabs = ui\.screen !== 'settings';/);
});

test('종이 무늬: 한 칸 24, 가로 줄은 위 안전 영역에서 시작해 머리(72) 아래에 맞는다', () => {
  const root = src('src/navigation/Root.tsx');
  assert.match(root, /const DOT = PAPER_MODULE;/);
  assert.equal((root.match(/<PaperDotsPure M=\{M\} gap=\{DOT\} offsetY=\{(insets\.top|topInset)\} \/>/g) || []).length, 2);
  assert.equal(GEO.header % GEO.gutter, 0);
});

// ── 머리 ─────────────────────────────────────────────────────────────────────

test('머리: 72(위 12 · 위 줄 18 · 제목 36), 여백 24, 아래 선 없음 · 제목 2줄 / 헤드라인 3줄 · 동작 44 손끝(오른쪽 −10, 위 26/28)', () => {
  assert.equal(GEO.header, 72);
  assert.equal(12 + 18 + 36 + 6, GEO.header);
  const c = src('src/components/common.tsx');
  const body = slice(c, 'function HeaderBody(', 'export function IconBtn(');
  assert.match(body, /marginHorizontal: GEO\.gutter, minHeight: GEO\.header, paddingTop: 12/);
  assert.match(body, /<View style=\{\{ height: 18, justifyContent: 'center' \}\}>/);
  assert.match(body, /\.\.\.\(headline \? ROLE\.headline : ROLE\.title\), color: M\.ink/);
  assert.match(body, /numberOfLines=\{headline \? 3 : 2\}/);
  assert.match(body, /\{noOrphan\(words\)\}/);
  assert.match(body, /const top = headline \? 28 : 26;/);
  assert.match(body, /position: 'absolute', right: -10, top \}/);
  // 숫자는 제목 줄 위(머리 위에서 30): 위 줄과 같은 덩어리 안이면 18 아래, 뒤로 가기 줄이 밖에 있으면 그 덩어리의 맨 위
  assert.match(body, /\.\.\.ROLE\.figureHeader, color: M\.ink, position: 'absolute', top: onBack \? 0 : 18, right: hasAction \? 44 : 0/);
  assert.match(body, /\.\.\.ROLE\.folio, color: M\.print/);
  assert.doesNotMatch(body, /borderBottom|borderTop/);
  // 뒤로 가기: 위 줄에 ‹ 16 + 이름(link 13/18 700), 이름이 없으면 온 곳(탭)의 이름
  const back = slice(c, 'function BackLink(', 'type HeaderProps');
  assert.match(back, /<Icon name="chevL" size=\{16\} color=\{M\.ink\} \/>/);
  assert.match(back, /\.\.\.ROLE\.link, color: M\.ink/);
  assert.match(back, /const text = label \?\? \(key \? m\.core\[key\] : m\.common\.back\);/);
  assert.match(back, /hitSlop=\{\{ top: 13, bottom: 13, left: 10, right: 10 \}\}/);
});

test('머리: 새 속성(eyebrow · back · title · written · headline · figure · action · pinned)과 예전 속성(kr · sub · right · stacked)을 다 받는다', () => {
  const c = src('src/components/common.tsx');
  const props = slice(c, 'type HeaderProps = {', '/**\n * 화면 머리(A.header)');
  for (const k of ['backTestID', 'kr', 'title', 'eyebrow', 'sub', 'back', 'onBack', 'written', 'headline', 'figure', 'action', 'right', 'pinned', 'stacked', 'focusTitle']) {
    assert.match(props, new RegExp(`\\b${k}\\?: `), k);
  }
  assert.match(c, /export interface HeaderAction \{\s*glyph: GlyphName;\s*onPress: \(\) => void;\s*label: string;\s*testID\?: string;\s*\}/);
  // pinned: Root의 자리로 올라가 스크롤 밖 위에, 자리가 없으면 제자리에
  assert.match(c, /export const PinnedHeaderSlot = createContext/);
  const root = src('src/navigation/Root.tsx');
  assert.match(root, /<PinnedHeaderSlot\.Provider value=\{setPinned\}>\{screen\}<\/PinnedHeaderSlot\.Provider>/);
  assert.match(root, /<PinnedHeaderSlot\.Provider value=\{null\}>\{body\}<\/PinnedHeaderSlot\.Provider>/);
  assert.match(root, /paddingTop: insets\.top \+ pinH,/);
  assert.match(slice(root, 'const PinnedHeaderHost = memo(', '/** 탭 글자 크기'), /paddingTop: topInset, backgroundColor: M\.paper/);
});

// ── 시트 ─────────────────────────────────────────────────────────────────────

test('시트: 가장자리에서 8(좌 · 우 · 아래) · 네 모서리 28 · 종이 + 떠 있는 그림자 · 넓은 창 560 · 막은 scrim', () => {
  assert.deepEqual({ ...GEO.sheet }, { inset: 8, pad: 24 });
  assert.equal(GEO.rSheet, 28);
  const c = src('src/components/common.tsx');
  assert.match(c, /return Math\.min\(PANEL_MAX_W, layoutWidth - 2 \* GEO\.sheet\.inset\);/);
  const width = (w) => Math.min(560, w - 16);
  assert.deepEqual([375, 390, 640, 1032].map(width), [359, 374, 560, 560]);
  const sheet = slice(c, 'export function Sheet(', 'export function SheetHeader(');
  assert.match(sheet, /\{ width: sheetW, alignSelf: 'center', marginBottom: GEO\.sheet\.inset \}/);
  assert.match(sheet, /borderRadius: GEO\.rSheet,/);
  assert.match(sheet, /backgroundColor: sheetBg\(M\),/);
  assert.match(sheet, /shadow\(8, '#000', 0, M\)/);
  assert.match(sheet, /\{ backgroundColor: M\.scrim, opacity: backdrop \}/);
  assert.match(sheet, /paddingBottom: kb > 0 \? 16 : Math\.max\(GEO\.sheet\.pad, insets\.bottom\),/);
  // 손잡이 줄은 늘 있다(Maestro가 끌어 닫는다), 막대 36×4 printMid는 끌어 닫는 시트에만
  assert.match(sheet, /testID=\{TID\.sheetHandle\}/);
  assert.match(sheet, /\{grabber && header == null && <View style=\{\{ width: 36, height: 4, borderRadius: 2, backgroundColor: M\.printMid \}\} \/>\}/);
  assert.match(sheet, /const grabber = !ownClose;/);
  assert.match(sheet, /const topPad = header != null \? 6 : GEO\.sheet\.pad;/);
  // 지키는 일: guard · 키보드 · 대기열 · 초점 돌려주기 · 끌어 닫기
  for (const re of [/guardRef\.current\(dismiss\)/, /Keyboard\.dismiss\(\)/, /register\(\)/, /sendAccessibilityEvent\(ref\.current, 'focus'\)/, /g\.dy > 110 \|\| g\.vy > 1\.1/]) {
    assert.match(sheet, re);
  }
  assert.match(c, /export function sheetBg\(M: M\): string \{\s*return M\.paper;/);
  // 시트 머리 줄: 48, 앞 자리 · 인쇄된 두 줄 · 닫기(44, 동그라미 없음)
  const head = slice(c, 'export function SheetHeader(', 'export function CloseBtn(');
  assert.match(head, /height: 48, flexDirection: 'row', alignItems: 'center', gap: 12/);
  assert.match(head, /fontFamily: PRETENDARD\[600\], lineHeight: 17, color: M\.ink/);
  assert.match(head, /lineHeight: 17, color: M\.print/);
  const close = slice(c, 'export function CloseBtn(', '// ── 단추');
  assert.match(close, /width: 44, height: 44/);
  assert.doesNotMatch(close, /borderRadius|backgroundColor/);
});

// ── 단추 · 글자 동작 ───────────────────────────────────────────────────────────

test('단추: primary 52 · 모서리 26 · btn/onBtn, secondary 1.25 printEdge, tint tile, small 36 — 신호색은 쓰지 않는다', () => {
  const c = src('src/components/common.tsx');
  const base = slice(c, 'function ButtonBase(', 'export function Button(');
  assert.match(base, /const h = height \?\? \(small \? 36 : 52\);/);
  assert.match(base, /minHeight: h, borderRadius: h \/ 2, paddingHorizontal: small \? 16 : 24/);
  assert.match(base, /borderWidth: colors\.edge \? 1\.25 : 0/);
  assert.match(base, /\.\.\.\(small \? ROLE\.buttonSmall : ROLE\.button\)/);
  const btn = slice(c, 'export function Button(', 'export type PrimaryTone');
  assert.match(btn, /\{ bg: 'transparent', fg: M\.ink, edge: M\.printEdge \}/);
  assert.match(btn, /\{ bg: M\.tile, fg: M\.ink \}/);
  assert.match(btn, /\{ bg: M\.btn, fg: M\.onBtn \}/);
  // PrimaryButton은 Button으로(예전 tone 이름 그대로)
  assert.match(c, /variant=\{tone === 'quiet' \? 'secondary' : 'primary'\}/);
  const quiet = slice(c, 'export function QuietAction(', 'export function PaperChip(');
  assert.match(quiet, /minHeight: 44/);
  assert.match(quiet, /\.\.\.\(foot \? ROLE\.quietFoot : ROLE\.quiet\)/);
  // 틀은 신호색 · 옛 금색 · 손으로 쓴 색을 쓰지 않는다
  for (const f of ['src/components/common.tsx', 'src/navigation/Root.tsx', 'src/overlays/Snackbar.tsx', 'src/components/EmptyState.tsx', 'src/components/TemplateSheet.tsx']) {
    const s = src(f);
    assert.doesNotMatch(s, /M\.(signal|gold|accent|goldInk)\b/, f);
    assert.doesNotMatch(s.replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, ''), /#[0-9A-Fa-f]{6}\b|rgba?\(/, f);
  }
});

test('줄 · 글자 탭: 머리카락 선은 printRule, 묶음 위아래 선 없음 · 거르기 줄은 44 높이, 고른 낱말 아래 1pt 먹 밑줄(바닥 9 위)', () => {
  const c = src('src/components/common.tsx');
  assert.match(c, /height: StyleSheet\.hairlineWidth, backgroundColor: M\.printRule/);
  assert.match(slice(c, 'export function groupEdge(', 'export function pressedRow('), /return \{\};/);
  const row = slice(c, 'export function LineRow(', 'export function RuledNotice(');
  assert.match(row, /minHeight: GEO\.row/);
  assert.match(row, /\.\.\.ROLE\.rowTitle, color: M\.ink/);
  assert.match(row, /<Icon name="chevR" size=\{16\} color=\{M\.ink\} \/>/);
  const word = slice(c, 'function FilterWord(', 'export function TextTabs');
  assert.match(word, /height: FILTER_H/);
  assert.match(word, /bottom: 9, height: 1, backgroundColor: M\.ink/);
  assert.match(c, /const FILTER_H = 44;/);
  assert.match(slice(c, 'export function IndexTabs(', '// ── 줄·알림'), /gap: 18/);
  assert.match(slice(c, 'export function TextTabs', 'export interface IndexTabItem'), /columnGap: 24/);
});

// ── 토스트 ────────────────────────────────────────────────────────────────────

test('토스트: 종이 알약(capsule · 모서리 29 · 떠 있는 그림자), 13/18 먹 글씨 · 되돌리기는 조용한 글, 탭 막대 위 10', () => {
  const s = src('src/overlays/Snackbar.tsx');
  assert.match(s, /borderRadius: GEO\.rTool, backgroundColor: M\.capsule/);
  assert.match(s, /shadow\(12, '#000', 0, M\)/);
  assert.match(s, /\.\.\.ROLE\.label, flex: 1, color: M\.ink/);
  assert.match(s, /\.\.\.ROLE\.quiet, color: M\.ink/);
  assert.match(s, /bottom: overTabs \? tabBarTop\(insets\.bottom\) \+ 10 : tabBarBottom\(insets\.bottom\)/);
  assert.match(s, /testID=\{TID\.toastAction\}/);
  assert.doesNotMatch(s, /actionInkFor|#26242F|#E2C27F/);
});

// ── 글리프 ────────────────────────────────────────────────────────────────────

const REDRAWN = {
  home: 'home', grid: 'chart', checkCircle: 'today', chart: 'stats', plus: 'plus', minus: 'minus', settings: 'settings',
  share: 'share', pencil: 'edit', dots: 'more', chevR: 'chevron', chevL: 'back', close: 'close', bell: 'bell',
};

test('글리프: 저장 이름은 그대로(ICON_NAMES), 탭 · 머리 · 시트의 이름은 디자인 A로 다시 그린다', () => {
  // 저장된 이름 목록은 바뀌지 않는다(저장본 · 백업 검증의 단일 출처)
  assert.deepEqual([...ICON_NAMES], [
    'heart', 'briefcase', 'book', 'people', 'coin', 'palette', 'lotus', 'compass',
    'grid', 'home', 'check', 'checkCircle', 'chart', 'plus', 'chevR', 'chevL',
    'flame', 'sparkle', 'target', 'pencil', 'dots', 'calendar', 'bell', 'settings',
    'close', 'reset', 'trash', 'share', 'repeat', 'download', 'restore', 'minus',
  ]);
  for (const [name, glyph] of Object.entries(REDRAWN)) {
    assert.ok(ICON_NAMES.includes(name), name);
    assert.deepEqual(parts(draw({ name, color: '#111' })), parts(render(React.createElement(Line.Glyph, { name: glyph, size: 22, color: '#111' }))), name);
  }
  // 화면 글리프는 저장 이름 밖에
  assert.deepEqual([...IconMod.UI_GLYPHS], ['down', 'pause', 'export', 'import', 'copies', 'focus']);
  for (const n of IconMod.UI_GLYPHS) {
    assert.ok(!ICON_NAMES.includes(n), n);
    assert.ok(Line.GLYPHS[n], n);
    assert.equal(draw({ name: n, color: '#111' }).type, 'Svg', n);
  }
});

test('글리프 획: 24 격자 · 1.5 · 둥근 끝과 이음 · 색 하나(＋는 2, 고른 오늘 탭의 틱만 바탕 색)', () => {
  for (const name of Object.keys(Line.GLYPHS)) {
    const tree = render(React.createElement(Line.Glyph, { name, color: '#111', ground: '#FFF' }));
    assert.equal(tree.props.viewBox, '0 0 24 24', name);
    assert.equal(tree.props.width, 24, `${name} 기본 24`);
    for (const p of tree.children) {
      if (p.props.stroke === 'none') {
        assert.equal(p.props.fill, '#111', `${name} 칠은 color`);
        continue;
      }
      assert.ok([1, 1.25, 1.5, 1.75, 2].includes(p.props.strokeWidth), `${name} 획 ${p.props.strokeWidth}`);
      assert.equal(p.props.strokeLinecap, 'round', name);
      assert.equal(p.props.strokeLinejoin, 'round', name);
      assert.ok(p.props.stroke === '#111' || (name === 'todayOn' && p.props.stroke === '#FFF'), `${name} 획 색`);
    }
  }
  const strokes = (name) => render(React.createElement(Line.Glyph, { name, color: '#111' })).children.map((p) => p.props.strokeWidth);
  assert.deepEqual(strokes('plus'), [2]);
  assert.deepEqual(strokes('chevron'), [1.5]);
  // 고른 모양은 다른 그림 — 칠한 면이 있다
  for (const [plain, on] of [['home', 'homeOn'], ['chart', 'chartOn'], ['today', 'todayOn'], ['stats', 'statsOn']]) {
    const a = parts(render(React.createElement(Line.Glyph, { name: plain, color: '#111' })));
    const b = parts(render(React.createElement(Line.Glyph, { name: on, color: '#111' })));
    assert.notDeepEqual(a, b, on);
    assert.ok(b.some((p) => p.fill === '#111'), `${on}에 칠한 면`);
  }
  // Icon active → 고른 모양, 탭 넷이 아닌 이름에는 아무 일도 없다
  assert.deepEqual(parts(draw({ name: 'grid', color: '#111', active: true })), parts(render(React.createElement(Line.Glyph, { name: 'chartOn', size: 22, color: '#111' }))));
  assert.deepEqual(parts(draw({ name: 'close', color: '#111', active: true })), parts(draw({ name: 'close', color: '#111' })));
  // 고른 오늘 탭의 틱은 바탕 색으로 긋는다
  const today = draw({ name: 'checkCircle', color: '#111', active: true, ground: '#ABCDEF' });
  assert.ok(today.children.some((p) => p.props.stroke === '#ABCDEF'));
  // 미닫이(설정): 바탕 색 없이도 손잡이 네모가 선을 끊는다 — 칠한 면 없음
  assert.ok(render(React.createElement(Line.Glyph, { name: 'settings', color: '#111' })).children.every((p) => p.props.fill === 'none'));
});

test('토큰 쪽: 탭 막대 · 시트 · 토스트가 쓰는 색은 밝게 · 어둡게 모두 있다', () => {
  for (const T of [LIGHT, DARK]) {
    for (const k of ['capsule', 'add', 'onAdd', 'float', 'scrim', 'paper', 'print', 'printMid', 'printRule', 'printEdge', 'tile', 'btn', 'onBtn', 'ink', 'ink2']) {
      assert.equal(typeof T[k], 'string', `${T.dark ? 'dark' : 'light'} ${k}`);
    }
  }
});

// ── 오류 화면 · 빈 상태 ───────────────────────────────────────────────────────

test('오류 화면은 토큰 두 벌에서 시스템 밝기로 고른다(옛 미색 · 금색 없음) · 빈 상태는 printEdge 점선 칸과 인쇄 색 글', () => {
  const e = src('src/components/ErrorBoundary.tsx');
  assert.match(e, /return Appearance\.getColorScheme\(\) === 'dark' \? DARK : LIGHT;/);
  assert.match(e, /backgroundColor: T\.paper/);
  assert.match(e, /backgroundColor: T\.btn/);
  assert.doesNotMatch(e, /#FBF9F4|#B0883C|#2B2620/);
  const empty = src('src/components/EmptyState.tsx');
  assert.match(empty, /borderRadius: GEO\.rCheck, borderWidth: 1\.5, borderStyle: 'dashed', borderColor: M\.printEdge/);
  assert.match(empty, /\.\.\.ROLE\.rowTitle, flex: 1, color: M\.print/);
  assert.match(empty, /<RowDivider M=\{M\} inset=\{text\} \/>/);
});
