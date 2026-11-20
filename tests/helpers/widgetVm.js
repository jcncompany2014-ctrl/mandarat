// 위젯 모습 시험대(테스트 파일이 아니다) — src/widgets/TodayWidget.ios.tsx를 babel-preset-expo로 바꿔 'widget' 함수가 된
// 글자를 꺼내고, expo-widgets의 위젯 런타임(node_modules/expo-widgets/bundle)과 같은 전역만 둔 vm에서 돌린다.
// vm에는 모듈 이름(require · _swiftUi · _modifiers …)이 없으니 함수가 바깥 이름을 쓰면 ReferenceError로 드러난다.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const babel = require('@babel/core');

const ROOT = path.join(__dirname, '..', '..');
const LAYOUT_FILE = path.join(ROOT, 'src/widgets/TodayWidget.ios.tsx');

/**
 * 위젯 쪽에 전역으로 있는 SwiftUI 뷰 — 이 모습들이 쓰기로 한 것만. 모두 expo-widgets의 WidgetsDynamicView가 그리는 type이다
 * (node_modules/expo-widgets/ios/Widgets/DynamicView.swift — 거기 없는 type은 출시 빌드에서 빈 자리가 된다).
 */
const VIEWS = [
  'Text', 'VStack', 'HStack', 'ZStack', 'Rectangle', 'RoundedRectangle', 'Circle', 'Image', 'Gauge', 'Button',
  'AccessoryWidgetBackground', 'Spacer', 'Divider',
];
/** @expo/ui 뷰 이름 → 네이티브 뷰 이름(WidgetsDynamicView가 읽는 type) */
const NATIVE = {
  Text: 'TextView', VStack: 'VStackView', HStack: 'HStackView', ZStack: 'ZStackView', Rectangle: 'RectangleView',
  RoundedRectangle: 'RoundedRectangleView', Circle: 'CircleView', Image: 'ImageView', Gauge: 'GaugeView',
  Button: 'Button', AccessoryWidgetBackground: 'AccessoryWidgetBackgroundView', Spacer: 'SpacerView', Divider: 'DividerView',
};

/** @expo/ui/swift-ui/modifiers가 내보내는 수정자 이름 — d.ts에서 읽는다(지어낸 이름은 vm에 없다) */
function modifierNames() {
  const dir = path.join(ROOT, 'node_modules/@expo/ui/build/swift-ui/modifiers');
  const names = new Set();
  const walk = (d) => {
    for (const e of fs.readdirSync(d)) {
      const p = path.join(d, e);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (e.endsWith('.d.ts')) {
        for (const m of fs.readFileSync(p, 'utf8').matchAll(/export declare (?:const|function) (\w+)/g)) names.add(m[1]);
      }
    }
  };
  walk(dir);
  return names;
}

/** 바꾼 모듈 코드 — iOS 번들과 같은 설정(Metro 호출자, 플랫폼 ios) */
function transformLayoutModule() {
  const src = fs.readFileSync(LAYOUT_FILE, 'utf8');
  return babel.transformSync(src, {
    filename: LAYOUT_FILE,
    cwd: ROOT,
    babelrc: false,
    configFile: false,
    presets: ['babel-preset-expo'],
    caller: { name: 'metro', bundler: 'metro', platform: 'ios', isDev: false },
  }).code;
}

/** 바꾼 모듈을 가짜 require로 돌려 TodayLayout(이제 글자)을 꺼낸다 */
function extractLayout(code = transformLayoutModule()) {
  const module = { exports: {} };
  const fakeRequire = () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => null) });
  vm.runInNewContext(code, { module, exports: module.exports, require: fakeRequire, console });
  return module.exports.TodayLayout;
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
/** 그 칸이 보이기 시작한 때(env.date) — 따로 주지 않으면 칸의 날(props.day) 09:30, 날이 없으면 2026-10-14 09:30 */
function entryDate(props) {
  const m = props && typeof props.day === 'string' ? DAY.exec(props.day) : null;
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 9, 30) : new Date(2026, 9, 14, 9, 30);
}

/**
 * 위젯 런타임과 같은 전역을 둔 vm — render(props, env, now) · press(props, env, target, now).
 * now: 위젯 쪽의 지금(Date 또는 ms). 모습은 지금을 new Date() · Date.now()로 읽는다(env.date는 지금이 아니라 그 칸의 시각이다) —
 * 주지 않으면 그 칸의 시각(env.date): 칸이 제때 보이는 중. 앱을 오래 열지 않은 날은 now를 뒤로 준다.
 */
function widgetRuntime(layout) {
  const mods = modifierNames();
  const g = { console: { log() {}, warn() {}, error() {} } };
  const view = (name) => (props) => {
    const p = { ...(props || {}) };
    if (name === 'Button') {
      p.onButtonPress = p.onPress;
      delete p.onPress;
    }
    if (name === 'Text') {
      // @expo/ui Text: 글자만 있는 자식은 text 하나로 합친다(없으면 그리지 않는다)
      const kids = p.children === undefined || p.children === null ? [] : Array.isArray(p.children) ? p.children : [p.children];
      if (kids.length === 0) return null;
      if (kids.every((c) => typeof c === 'string' || typeof c === 'number')) {
        p.text = kids.map(String).join('');
        delete p.children;
      }
    }
    return { type: NATIVE[name], props: p };
  };
  for (const v of VIEWS) g[v] = view(v);
  for (const m of mods) g[m] = (...args) => ({ $type: m, args });
  const jsx = (type, config, maybeKey) => {
    let key = maybeKey === undefined ? null : String(maybeKey);
    const props = {};
    for (const k in config) {
      if (k === 'key') key = String(config.key);
      else props[k] = config[k];
    }
    if (typeof type === 'function') return type(props);
    return { type, key, props };
  };
  Object.assign(g, { _jsx: jsx, _jsxs: jsx, jsx, jsxs: jsx, jsxDEV: jsx, _jsxDEV: jsx, Fragment: 'react.fragment', _Fragment: 'react.fragment' });
  const ctx = vm.createContext(g);
  // vm 안의 시계만 정해 둔다 — 인자 없는 new Date()와 Date.now()가 정해 둔 때를 준다(인자가 있으면 그대로)
  const setClock = vm.runInContext(`(function () {
    var Real = Date;
    var at = null;
    Date = class extends Real {
      constructor(...a) { if (a.length === 0 && at !== null) super(at); else super(...a); }
      static now() { return at === null ? Real.now() : at; }
    };
    return function (ms) { at = ms; };
  })()`, ctx);
  const fn = vm.runInContext(`(${layout})`, ctx);
  const env = (e, props) => ({ date: entryDate(props), widgetFamily: 'systemSmall', colorScheme: 'light', widgetRenderingMode: 'fullColor', ...(e || {}) });
  const render = (props, e, now) => {
    const ev = env(e, props);
    setClock(now === undefined ? ev.date.getTime() : Number(now));
    return fn(props, ev);
  };
  /** __expoWidgetHandlePress와 같다 — 지금(now) 다시 그린 나무에서 target이 같은 Button의 onButtonPress를 부른다 */
  const press = (props, e, target, now) => {
    const find = (node) => {
      if (Array.isArray(node)) {
        for (const c of node) {
          const r = find(c);
          if (r) return r;
        }
        return undefined;
      }
      if (!node || typeof node !== 'object' || !node.props) return undefined;
      if (node.props.onButtonPress && node.props.target === target) return node.props.onButtonPress();
      return find(node.props.children);
    };
    return find(render(props, e, now));
  };
  return { render, press, modifierNames: mods };
}

/** 트리를 훑으며 마디마다 cb(node, parentChildren) */
function walk(node, cb) {
  if (Array.isArray(node)) {
    node.forEach((c) => walk(c, cb));
    return;
  }
  if (!node || typeof node !== 'object') return;
  cb(node);
  if (node.props && 'children' in node.props) walk(node.props.children, cb);
}

module.exports = { LAYOUT_FILE, VIEWS, NATIVE, modifierNames, transformLayoutModule, extractLayout, widgetRuntime, walk };
