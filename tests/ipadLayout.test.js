// 아이패드 배치(V4-D) — 창 크기 → 폰 / 한 단 / 펼침, 쪽 폭(PageSize), 시트 폭, Modal 네 방향
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/**
 * src/lib/screen.ts를 react · react-native를 바꿔 끼워 읽는다.
 * os: Platform.OS, win: useWindowDimensions() 값, page: useContext(PageSize) 값, search: location.search
 */
function loadScreen({ os = 'ios', search, win = { width: 390, height: 844, scale: 3, fontScale: 1 } } = {}) {
  const file = path.join(ROOT, 'src/lib/screen.ts');
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const env = { win, page: null };
  const react = { createContext: (v) => ({ v }), useContext: () => env.page, useMemo: (f) => f() };
  const rn = { Platform: { OS: os }, useWindowDimensions: () => env.win };
  const load = Module._load;
  const hadLocation = 'location' in globalThis;
  const prevLocation = globalThis.location;
  if (search !== undefined) globalThis.location = { search };
  Module._load = function (req, parent, ...rest) {
    if (req === 'react') return react;
    if (req === 'react-native') return rn;
    return load.call(this, req, parent, ...rest);
  };
  try {
    const m = new Module(file, module);
    m.filename = file;
    m.paths = Module._nodeModulePaths(path.dirname(file));
    m._compile(outputText, file);
    return { ...m.exports, env };
  } finally {
    Module._load = load;
    if (search !== undefined) {
      if (hadLocation) globalThis.location = prevLocation;
      else delete globalThis.location;
    }
  }
}

const native = loadScreen();

test('배치 표: 폰 · 한 단 · 펼침 (아이폰 · 아이패드 미니 · 11 · 13, 세로와 가로)', () => {
  const at = (w, h) => native.layoutFor(w, h, { web: false });
  assert.deepEqual(at(390, 844), { kind: 'phone', width: 390 });
  assert.deepEqual(at(744, 1133), { kind: 'column', width: 640 });
  assert.deepEqual(at(834, 1194), { kind: 'column', width: 640 });
  assert.deepEqual(at(1032, 1376), { kind: 'spread', width: 640 });
  assert.deepEqual(at(1194, 834), { kind: 'spread', width: 640 });
  assert.deepEqual(at(1376, 1032), { kind: 'spread', width: 640 });
  // 경계: 600 미만은 폰, 960 미만이거나 높이 600 미만이면 한 단(폭 640을 넘지 않는다)
  assert.deepEqual(at(599, 1000), { kind: 'phone', width: 599 });
  assert.deepEqual(at(600, 1000), { kind: 'column', width: 600 });
  assert.deepEqual(at(959, 1000), { kind: 'column', width: 640 });
  assert.deepEqual(at(960, 599), { kind: 'column', width: 640 });
  assert.deepEqual(at(960, 600), { kind: 'spread', width: 640 });
});

test('분할 화면 · 슬라이드 오버 · 스테이지 매니저: 창 크기만 보고 고른다', () => {
  const at = (w, h) => native.layoutFor(w, h, { web: false }).kind;
  assert.equal(at(320, 1024), 'phone'); // 슬라이드 오버 · 1/3
  assert.equal(at(507, 768), 'phone'); // 가로 1/2(작은 아이패드)
  assert.equal(at(678, 1024), 'column'); // 가로 1/2(13인치)
  assert.equal(at(1000, 500), 'column'); // 스테이지 매니저로 낮게 줄인 창
});

test('웹: ?layout=device가 아니면 폭과 상관없이 폰 한 장 폭(480)', () => {
  for (const w of [1024, 1366, 834]) assert.deepEqual(native.layoutFor(w, 1024, { web: true }), { kind: 'phone', width: 480 });
  assert.deepEqual(native.layoutFor(390, 844, { web: true }), { kind: 'phone', width: 390 });
  assert.deepEqual(native.layoutFor(834, 1194, { web: true, device: true }), { kind: 'column', width: 640 });
  // ?layout=device는 location.search에서 한 번 읽는다
  const dev = loadScreen({ os: 'web', search: '?lang=ko&layout=device' });
  assert.deepEqual(dev.layoutFor(1366, 1024), { kind: 'spread', width: 640 });
  const plain = loadScreen({ os: 'web', search: '?lang=ko&layout=devicex' });
  assert.deepEqual(plain.layoutFor(1366, 1024), { kind: 'phone', width: 480 });
  assert.deepEqual(loadScreen({ os: 'web', search: '' }).layoutFor(1366, 1024), { kind: 'phone', width: 480 });
});

test('폰은 그대로: 창 폭 · 시트 판 · 웹 480 묶음', () => {
  // 네이티브 폰 — 쪽 밖에서는 창 그대로, 시트 판은 창 폭 그대로(null)
  const phone = loadScreen({ win: { width: 390, height: 844, scale: 3, fontScale: 1 } });
  assert.equal(phone.useWindowDimensions().width, 390);
  assert.equal(phone.usePanelStyle(), null);
  const big = loadScreen({ win: { width: 440, height: 956, scale: 3, fontScale: 1 } });
  assert.equal(big.usePanelStyle(), null);
  // 웹 — 넓은 창에서도 480, 시트 판도 480
  const web = loadScreen({ os: 'web', search: '', win: { width: 1280, height: 900, scale: 1, fontScale: 1 } });
  assert.equal(web.useWindowDimensions().width, 480);
  assert.deepEqual(web.usePanelStyle(), { width: '100%', maxWidth: 480, alignSelf: 'center' });
  const narrowWeb = loadScreen({ os: 'web', search: '', win: { width: 375, height: 700, scale: 1, fontScale: 1 } });
  assert.equal(narrowWeb.useWindowDimensions().width, 375);
  assert.deepEqual(narrowWeb.usePanelStyle(), { width: '100%', maxWidth: 375, alignSelf: 'center' });
});

test('아이패드: 쪽 안에서 useWindowDimensions는 쪽 폭, 시트 판은 560에서 멈춘다', () => {
  const pad = loadScreen({ win: { width: 834, height: 1194, scale: 2, fontScale: 1 } });
  assert.equal(pad.useWindowDimensions().width, 834);
  pad.env.page = { width: 640 };
  const d = pad.useWindowDimensions();
  assert.equal(d.width, 640);
  assert.equal(d.height, 1194);
  assert.deepEqual(pad.usePanelStyle(), { width: '100%', maxWidth: 560, alignSelf: 'center' });
  // 한 단이 가장 좁은 창(600대)에서도 판은 560
  const slim = loadScreen({ win: { width: 620, height: 1000, scale: 2, fontScale: 1 } });
  assert.deepEqual(slim.usePanelStyle(), { width: '100%', maxWidth: 560, alignSelf: 'center' });
  // 1/3 분할(폰 폭)에서는 시트도 창 폭 그대로
  assert.equal(loadScreen({ win: { width: 375, height: 1024, scale: 2, fontScale: 1 } }).usePanelStyle(), null);
});

test('Modal은 네 방향 모두', () => {
  assert.deepEqual(native.MODAL_ORIENTATIONS, ['portrait', 'portrait-upside-down', 'landscape-left', 'landscape-right']);
});

/** <Modal …> 여는 태그 — 중괄호 안의 `=>`는 닫는 꺾쇠가 아니다 */
function modalTags(s) {
  const tags = [];
  const re = /<Modal\b/g;
  let m;
  while ((m = re.exec(s))) {
    let depth = 0;
    let i = m.index + 6;
    for (; i < s.length; i++) {
      const c = s[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) break;
    }
    tags.push(s.slice(m.index, i + 1));
  }
  return tags;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

test('src의 모든 <Modal이 supportedOrientations={MODAL_ORIENTATIONS}를 넘긴다', () => {
  let n = 0;
  for (const f of [...walk(path.join(ROOT, 'src')), path.join(ROOT, 'App.tsx')]) {
    for (const tag of modalTags(fs.readFileSync(f, 'utf8'))) {
      n++;
      assert.match(tag, /supportedOrientations=\{MODAL_ORIENTATIONS\}/, `${path.relative(ROOT, f)}: ${tag.slice(0, 80)}`);
    }
  }
  assert.ok(n >= 5, `Modal ${n}개`);
});

test('app.json: 아이패드를 지원하고 전체 화면을 강요하지 않는다', () => {
  const app = JSON.parse(src('app.json')).expo;
  assert.equal(app.ios.supportsTablet, true);
  assert.notEqual(app.ios.requireFullScreen, true);
});

test('틀: 앱 · 네 오버레이는 PaperColumn, 시트는 usePanelStyle과 쪽 폭', () => {
  assert.match(src('App.tsx'), /<PaperColumn bg=/);
  for (const f of ['FocusTimer', 'WeekRitual', 'Celebration', 'YearClose']) {
    const s = src(`src/overlays/${f}.tsx`);
    assert.match(s, /import \{ PaperColumn \} from '\.\.\/components\/WebColumn';/, f);
    assert.ok(s.indexOf('<Modal') < s.indexOf('<PaperColumn') && s.indexOf('</PaperColumn>') < s.indexOf('</Modal>'), f);
  }
  const common = src('src/components/common.tsx');
  assert.match(common, /const panel = usePanelStyle\(\);/);
  assert.match(common, /<PageSize\.Provider value=\{page\}>/);
  const col = src('src/components/WebColumn.tsx');
  assert.match(col, /<PageSize\.Provider value=\{page\}>/);
  // 아이패드는 처음부터 늘 감싼다 — 분할 화면 크기를 바꿔도 화면이 다시 마운트되지 않게
  assert.match(col, /const ALWAYS_WRAP = Platform\.OS === 'web' \|\| \(Platform\.OS === 'ios' && \(Platform as \{ isPad\?: boolean \}\)\.isPad === true\);/);
});
