// 아이콘 — 앱 안으로 옮긴 선 아이콘(LineIcons)과 영역 아이콘(AreaIcons), 그리고 둘을 고르는 Icon.
// react-native-svg 대신 가짜 요소를 만들어 그린 결과(요소 나무)를 확인한다. 화면은 띄우지 않는다.
// 1) src 어디에서도 lucide 패키지를 import하지 않는다(번들 크기)
// 2) 옮긴 24개는 원본 lucide 모양과 좌표가 같다(패키지가 남아 있는 동안만 비교)
// 3) 모든 획은 같은 펜 선 — 기본 1.9, 둥근 끝·둥근 이음, 채움 없음
// 4) 저장된 아이콘 키는 모두 그대로 그려지고, 'lotus'·'heart'는 꽃·잎이 아닌 숨·맥박으로 그린다
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { ICON_NAMES } = require('../src/types');

const ROOT = path.join(__dirname, '..');
const COMP = path.join(ROOT, 'src', 'components');
const LUCIDE = path.join(ROOT, 'node_modules', 'lucide-react-native', 'dist', 'esm', 'icons');

// ── 가짜 React · react-native-svg ──────────────────────────────────────────
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
const SVG_TAGS = ['Svg', 'Path', 'Circle', 'Rect', 'Line', 'G', 'Ellipse', 'Polyline', 'Polygon'];
const svgStub = { __esModule: true, default: 'Svg' };
for (const t of SVG_TAGS.slice(1)) svgStub[t] = t;

/** .tsx 하나를 CommonJS로 바꿔 stubs만 require할 수 있게 실행한다 */
function load(file, stubs) {
  const source = fs.readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
  });
  const mod = { exports: {} };
  const req = (id) => {
    if (Object.prototype.hasOwnProperty.call(stubs, id)) return stubs[id];
    throw new Error(`${path.basename(file)}: 예상하지 못한 require('${id}')`);
  };
  new Function('require', 'module', 'exports', outputText)(req, mod, mod.exports);
  return mod.exports;
}

/** 함수 컴포넌트를 펼쳐 문자열 태그만 남은 나무로 만든다 */
function render(el) {
  if (el == null || el === false) return null;
  if (Array.isArray(el)) return el.map(render).filter(Boolean);
  if (typeof el.type === 'function') return render(el.type(el.props));
  const { children, ...props } = el.props;
  const kids = children === undefined ? [] : [].concat(children).flat(Infinity).map(render).filter(Boolean);
  return { type: el.type, props, children: kids };
}

const reactStub = { __esModule: true, default: React, ...React };
const Line = load(path.join(COMP, 'LineIcons.tsx'), { react: reactStub, 'react-native-svg': svgStub, 'react-native': {} });
const Area = load(path.join(COMP, 'AreaIcons.tsx'), { react: reactStub, 'react-native-svg': svgStub, 'react-native': {}, './LineIcons': Line });
const IconMod = load(path.join(COMP, 'Icon.tsx'), {
  react: reactStub,
  'react-native': {},
  './LineIcons': Line,
  './AreaIcons': Area,
});

/** 옮긴 이름 → lucide 파일 이름 */
const VENDORED = {
  Grid3x3: 'grid-3x3', House: 'house', Check: 'check', CircleCheck: 'circle-check',
  ChartColumnBig: 'chart-column-big', Plus: 'plus', Minus: 'minus', ChevronRight: 'chevron-right',
  ChevronLeft: 'chevron-left', Flame: 'flame', Sparkles: 'sparkles', Target: 'target', Pencil: 'pencil',
  Ellipsis: 'ellipsis', Calendar: 'calendar', Bell: 'bell', SlidersHorizontal: 'sliders-horizontal',
  X: 'x', RotateCcw: 'rotate-ccw', Trash2: 'trash-2', Share2: 'share-2', Repeat: 'repeat',
  Download: 'download', ArchiveRestore: 'archive-restore',
};
const GEOMETRY = ['d', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'rx', 'x1', 'y1', 'x2', 'y2'];
const geometry = (props) => {
  const o = {};
  for (const k of GEOMETRY) if (props[k] !== undefined) o[k] = k === 'd' ? props[k] : Number(props[k]);
  return o;
};
const shapes = (tree) => tree.children.map((c) => ({ tag: c.type.toLowerCase(), ...geometry(c.props) }));

test('src 어디에서도 lucide 패키지를 불러오지 않는다', () => {
  const hits = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(tsx?|jsx?)$/.test(e.name) && fs.readFileSync(p, 'utf8').includes('lucide-react-native')) hits.push(path.relative(ROOT, p));
    }
  };
  walk(path.join(ROOT, 'src'));
  assert.deepEqual(hits, []);
});

test('옮긴 선 아이콘은 정확히 24개이고 라이선스 고지를 지닌다', () => {
  const exported = Object.keys(Line).filter((k) => typeof Line[k] === 'function').sort();
  assert.deepEqual(exported, Object.keys(VENDORED).sort());
  const src = fs.readFileSync(path.join(COMP, 'LineIcons.tsx'), 'utf8');
  assert.match(src, /ISC License/);
  assert.match(src, /Copyright \(c\) \d{4} Lucide Icons and Contributors/);
  assert.match(src, /Permission to use, copy, modify, and\/or distribute this software/);
  assert.match(src, /Copyright \(c\) 2013-present Cole Bemis/);
});

test('옮긴 선 아이콘의 좌표는 원본 lucide와 같다', { skip: !fs.existsSync(LUCIDE) && 'lucide 패키지가 없음(이미 지움)' }, () => {
  for (const [name, file] of Object.entries(VENDORED)) {
    const src = fs.readFileSync(path.join(LUCIDE, `${file}.mjs`), 'utf8');
    const m = src.match(/createLucideIcon\(\s*"[^"]+",\s*(\[[\s\S]*?\])\s*\);/);
    assert.ok(m, `${file}.mjs의 iconNode를 찾지 못함`);
    const node = new Function(`return ${m[1]}`)();
    const want = node.map(([tag, attrs]) => {
      const { key, ...rest } = attrs;
      return { tag, ...geometry(rest) };
    });
    const got = shapes(render(React.createElement(Line[name], {})));
    assert.deepEqual(got, want, name);
  }
});

test('모든 획은 같은 펜 선 — 기본 1.9 · 둥근 끝과 이음 · 채움 없음 · 24 격자', () => {
  const all = [
    ...Object.keys(VENDORED).map((n) => [n, Line[n]]),
    ...['IcPulse', 'IcCase', 'IcBook', 'IcPeople', 'IcCoin', 'IcBrush', 'IcBreath', 'IcMountain'].map((n) => [n, Area[n]]),
  ];
  for (const [name, C] of all) {
    assert.equal(typeof C, 'function', `${name} 없음`);
    const tree = render(React.createElement(C, { size: 22, color: '#333' }));
    assert.equal(tree.type, 'Svg', name);
    assert.equal(tree.props.viewBox, '0 0 24 24', name);
    assert.equal(tree.props.width, 22, name);
    assert.ok(tree.children.length > 0, name);
    for (const s of tree.children) {
      assert.equal(s.props.stroke, '#333', `${name} 색`);
      assert.equal(s.props.strokeWidth, 1.9, `${name} 굵기`);
      assert.equal(s.props.strokeLinecap, 'round', `${name} 끝`);
      assert.equal(s.props.strokeLinejoin, 'round', `${name} 이음`);
      assert.equal(s.props.fill, 'none', `${name} 채움`);
    }
    // 굵기·스타일은 그대로 전달된다
    const thick = render(React.createElement(C, { size: 22, color: '#333', strokeWidth: 2.6, style: { marginTop: 2 } }));
    assert.ok(thick.children.every((s) => s.props.strokeWidth === 2.6), `${name} 굵기 전달`);
    assert.deepEqual(thick.props.style, { marginTop: 2 }, `${name} 스타일 전달`);
  }
});

test('마음챙김(lotus)은 꽃잎·원 없는 물결 세 줄, 건강(heart)은 박동 한 번의 맥박', () => {
  assert.equal(Area.IcLotus, undefined);
  assert.equal(Area.IcSprout, undefined);
  const breath = render(React.createElement(Area.IcBreath, {}));
  assert.equal(breath.children.length, 3);
  for (const s of breath.children) {
    assert.equal(s.type, 'Path');
    assert.doesNotMatch(s.props.d, /[Zz]/, '닫힌 모양(꽃잎) 없음');
  }
  const pulse = render(React.createElement(Area.IcPulse, {}));
  assert.equal(pulse.children.length, 1);
  assert.equal(pulse.children[0].type, 'Path');
  assert.doesNotMatch(pulse.children[0].props.d, /[Zz]/);
});

test('Icon — 저장된 키는 모두 그려지고, 모르는 이름은 과녁으로, 기본은 채우지 않는다', () => {
  const { Icon } = IconMod;
  assert.equal(Icon.memoized, true, 'React.memo로 감싼다');
  const target = shapes(render(React.createElement(Line.Target, {})));
  for (const name of ICON_NAMES) {
    const tree = render(React.createElement(Icon, { name, color: '#333' }));
    assert.equal(tree.type, 'Svg', name);
    assert.equal(tree.props.width, 22, `${name} 기본 크기`);
    assert.ok(tree.children.every((s) => s.props.fill === 'none'), `${name}은 채우지 않는다`);
    assert.ok(tree.children.every((s) => s.props.strokeWidth === 1.9), `${name} 기본 굵기`);
    if (name !== 'target') assert.notDeepEqual(shapes(tree), target, `${name}이 과녁으로 빠지지 않는다`);
  }
  for (const bad of ['constructor', '__proto__', 'toString', 'nope']) {
    assert.deepEqual(shapes(render(React.createElement(Icon, { name: bad }))), target, bad);
  }
  assert.deepEqual(shapes(render(React.createElement(Icon, { name: 'lotus' }))), shapes(render(React.createElement(Area.IcBreath, {}))));
  assert.deepEqual(shapes(render(React.createElement(Icon, { name: 'heart' }))), shapes(render(React.createElement(Area.IcPulse, {}))));
  // 채움은 부르는 쪽이 원할 때만
  const filled = render(React.createElement(Icon, { name: 'check', color: '#333', fill: true, sw: 2.4 }));
  assert.ok(filled.children.every((s) => s.props.fill === '#333' && s.props.strokeWidth === 2.4));
});
