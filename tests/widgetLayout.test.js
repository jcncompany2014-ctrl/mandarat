// '오늘' 위젯 모습(src/widgets/TodayWidget.ios.tsx) — babel이 글자로 바꾼 함수를 위젯 런타임과 같은 vm에서 그려 본다.
// 위젯 쪽에는 앱의 모듈이 하나도 없으므로, 바깥 이름을 쓰거나 배열 안에 배열을 두면 기기에서 빈 위젯이 된다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { blankDoc } = require('../src/data/defaults');
const { widgetTimeline } = require('../src/lib/widgetSnapshot');
const { LAYOUT_FILE, VIEWS, transformLayoutModule, extractLayout, widgetRuntime, walk } = require('./helpers/widgetVm');

const FAMILIES = ['systemSmall', 'systemMedium', 'systemLarge', 'accessoryInline', 'accessoryCircular', 'accessoryRectangular'];
const LOCK = new Set(['accessoryInline', 'accessoryCircular', 'accessoryRectangular']);
const NOW = new Date(2026, 9, 14, 9, 30);

const code = transformLayoutModule();
const layout = extractLayout(code);
const rt = widgetRuntime(layout);

function doc(extra = {}) {
  const d = blankDoc();
  const a = d.themes[0].actions;
  a[0] = { text: '마감 일', note: '', done: false, kind: 'once', due: '2026-10-15' };
  a[1] = { text: '물 마시기', note: '', done: false, kind: 'habit', days: [0, 1, 2, 3, 4, 5, 6], since: '2026-10-01' };
  a[2] = { text: '산책', note: '', done: true, kind: 'once' };
  d.themes[1].actions[0] = { text: '책 읽기', note: '', done: true, kind: 'once' };
  return {
    ...d, onboarded: true, centerGoal: '단단한 한 해', todayDate: '2026-10-14', todayKeys: ['0-2'],
    todayExtra: [{ id: 'e1', ti: 1, text: '전화', done: false }], ...extra,
  };
}
const real = () => widgetTimeline(doc(), NOW, { pat: 'dots', lang: 'ko' })[0].props;
/** 예전 앱이 쓴 스냅숏(새 앱을 처음 열기 전 잠깐) — cells · names · a · r · 새 팔레트 · 새 문구가 없다 */
function oldSnapshot() {
  const { cells, names, ...rest } = real();
  const oldPal = (dark) => (dark
    ? { paper: '#0E0D14', ink: '#F1EFEA', sub: '#9C9AAA', line: '#FFFFFF1C', accent: '#CBA352' }
    : { paper: '#FBF9F4', ink: '#2B2620', sub: '#6F6657', line: '#6E55281F', accent: '#8B6D34' });
  const { listHead, nextHead, leftUnit, focus, ...lines } = rest.lines;
  return {
    ...rest, lines, pal: { light: oldPal(false), dark: oldPal(true) },
    items: rest.items.map(({ a, r, ...i }) => ({ ...i, c: '#6B8F71' })), areas: [1, 1, 0, 0, 0, 0, 0, 0], colors: Array(8).fill('#6B8F71'),
  };
}

test('바꾼 결과 — TodayLayout은 글자이고, 모듈 이름이나 babel 도움 함수를 부르지 않는다', () => {
  assert.equal(typeof layout, 'string');
  assert.match(layout, /^function\s*\(/);
  for (const bad of ['require(', '_swiftUi', '_modifiers', '_jsxRuntime', '_interopRequire', '_objectSpread', '_toConsumableArray', '_defineProperty', 'exports.', 'React.']) {
    assert.equal(layout.includes(bad), false, bad);
  }
  assert.doesNotMatch(layout, /^function\s*\([^)]*\)\s*\{\s*['"]widget['"]/, '지시어는 빠진다');
});

test('import는 위젯 런타임에 전역으로 있는 이름만', () => {
  const src = fs.readFileSync(LAYOUT_FILE, 'utf8');
  const named = (from) => {
    const m = src.match(new RegExp(`import \\{([^}]*)\\} from '${from.replace(/[/@]/g, '\\$&')}'`));
    return m ? m[1].split(',').map((s) => s.trim()).filter(Boolean) : [];
  };
  for (const v of named('@expo/ui/swift-ui')) assert.ok(VIEWS.includes(v), `뷰 ${v}`);
  for (const m of named('@expo/ui/swift-ui/modifiers')) assert.ok(rt.modifierNames.has(m), `수정자 ${m}`);
  // 나머지 import는 타입뿐
  for (const m of src.matchAll(/^import (?!type )(.*) from '([^']+)'/gm)) assert.match(m[2], /^@expo\/ui\/swift-ui/, m[0]);
});

/** 한 번 그린 트리의 약속 */
function check(node, family, label) {
  assert.ok(node && typeof node === 'object', `${label}: 그린 것이 있다`);
  const mods = (node.props.modifiers || []).map((m) => m.$type);
  assert.ok(mods.includes('containerBackground'), `${label}: containerBackground`);
  assert.ok(mods.includes('widgetURL'), `${label}: widgetURL`);
  const bg = node.props.modifiers.find((m) => m.$type === 'containerBackground');
  assert.deepEqual(bg.args.slice(1), ['widget']);
  assert.match(bg.args[0], /^#[0-9A-F]{6}([0-9A-F]{2})?$/i);
  const targets = [];
  walk(node, (n) => {
    assert.equal(typeof n.type, 'string', `${label}: 뷰 이름`);
    const kids = n.props.children;
    if (Array.isArray(kids)) for (const k of kids) assert.equal(Array.isArray(k), false, `${label}: ${n.type} 안에 배열 안의 배열`);
    if (n.type === 'Button') targets.push(n.props.target);
    for (const m of n.props.modifiers || []) {
      for (const a of m.args) if (typeof a === 'string' && /rgba?\(/.test(a)) assert.fail(`${label}: rgba 색`);
    }
  });
  assert.equal(new Set(targets).size, targets.length, `${label}: target이 겹친다`);
  for (const t of targets) assert.equal(typeof t, 'string', `${label}: target`);
  // 잠금 화면에서는 네모(다음 할 일)의 체크 상자 하나만 버튼이다
  if (family === 'accessoryRectangular') assert.ok(targets.length <= 1, `${label}: 네모의 버튼은 하나까지`);
  else if (LOCK.has(family)) assert.equal(targets.length, 0, `${label}: 한 줄 · 동그라미에는 버튼이 없다`);
  return targets;
}

test('여섯 크기 × 빈 props · 실제 props · 예전 스냅숏 × 밝게·어둡게 × 전체 색·틴트·잠금 화면 — 모두 그려진다', () => {
  const propsSets = {
    empty: {}, real: real(), old: oldSnapshot(),
    allDone: widgetTimeline(doc({ todayKeys: [], todayExtra: [] }), new Date(2026, 9, 20, 9), { pat: 'grid', lang: 'en' })[0].props,
  };
  for (const family of FAMILIES) {
    for (const [name, props] of Object.entries(propsSets)) {
      for (const colorScheme of ['light', 'dark']) {
        for (const widgetRenderingMode of ['fullColor', 'accented', 'vibrant']) {
          const label = `${family}/${name}/${colorScheme}/${widgetRenderingMode}`;
          check(rt.render(props, { widgetFamily: family, colorScheme, widgetRenderingMode }), family, label);
        }
      }
    }
  }
  // env 없이도(위젯 갤러리 미리보기)
  check(rt.render({}, undefined), 'systemSmall', 'no-env');
});

test('종이 무늬 — 모눈·줄은 괘선을 긋고, 점·민무늬는 긋지 않는다', () => {
  const count = (pat) => {
    // 괘선 층은 clipped()로 자른 ZStack — 그 안의 Rectangle 수
    let n = 0;
    walk(rt.render({ ...real(), pat }, { widgetFamily: 'systemMedium' }), (node) => {
      if (!(node.props.modifiers || []).some((m) => m.$type === 'clipped')) return;
      walk(node.props.children, (r) => { if (r.type === 'RectangleView') n++; });
    });
    return n;
  };
  assert.equal(count('dots'), 0);
  assert.equal(count('blank'), 0);
  assert.equal(count('lines'), 30);
  assert.equal(count('grid'), 60);
});

test('중간(세 줄)·크게(여섯 줄)는 줄마다 체크 버튼(check:<k>), 잠금 네모는 다음 할 일 하나, 작게·동그라미·한 줄은 버튼 없이', () => {
  const p = real();
  assert.ok(p.items.length >= 4, '줄이 셋보다 많은 날');
  const t = (family) => check(rt.render(p, { widgetFamily: family }), family, family);
  assert.deepEqual(t('systemSmall'), []);
  assert.deepEqual(t('systemMedium'), p.items.slice(0, 3).map((i) => `check:${i.k}`));
  assert.deepEqual(t('systemLarge'), p.items.slice(0, 6).map((i) => `check:${i.k}`));
  assert.deepEqual(t('accessoryRectangular'), [`check:${p.items.find((i) => !i.d).k}`]);
  assert.deepEqual(t('accessoryCircular'), []);
  assert.deepEqual(t('accessoryInline'), []);
  // 다 했거나 빈 날의 네모는 버튼 없이 문구만
  assert.deepEqual(check(rt.render({ ...p, done: p.total, items: p.items.map((i) => ({ ...i, d: true })) }, { widgetFamily: 'accessoryRectangular' }), 'accessoryRectangular', 'rect/allDone'), []);
});

test('check:0-1을 누르면 done + 1, 그 줄이 했어요로, ops에 하나가 붙는다', () => {
  const p = real();
  const before = p.items.find((i) => i.k === '0-1');
  assert.ok(before && !before.d, '물 마시기는 아직 안 했다');
  const t0 = Date.now();
  const out = rt.press(p, { widgetFamily: 'systemMedium' }, 'check:0-1');
  assert.ok(out, '눌린 버튼이 있다');
  assert.deepEqual(Object.keys(out).sort(), ['done', 'items', 'ops']);
  assert.equal(out.done, p.done + 1);
  assert.equal(out.items.find((i) => i.k === '0-1').d, true);
  assert.equal(out.items.length, p.items.length);
  assert.equal(out.ops.length, 1);
  const op = out.ops[0];
  assert.deepEqual({ ...op, at: 0 }, { kind: 'check', k: '0-1', on: true, day: '2026-10-14', at: 0, t: '물 마시기', src: 'widget' });
  assert.ok(op.at >= t0 && op.at <= Date.now());
  // expo-widgets AppIntent처럼 원래 props에 합치면 다시 그릴 수 있고, 다시 누르면 되돌린다
  const merged = { ...p, ...out };
  const again = rt.press(merged, { widgetFamily: 'systemMedium' }, 'check:0-1');
  assert.equal(again.done, p.done);
  assert.equal(again.ops.length, 2);
  assert.equal(again.ops[1].on, false);
  // 원래 props는 건드리지 않는다
  assert.equal(p.items.find((i) => i.k === '0-1').d, false);
  assert.equal(p.ops.length, 0);
});

test('ops는 마지막 300개까지만(R-1 F5 — 50개는 습관 5개면 열흘에 넘쳤다)', () => {
  const p = real();
  assert.match(fs.readFileSync(LAYOUT_FILE, 'utf8'), /const OPS_MAX = 300;[\s\S]*\.slice\(-OPS_MAX\)/);
  // 299개 + 1 = 300 — 아직 하나도 버리지 않는다
  const under = Array.from({ length: 299 }, (_, i) => ({ kind: 'check', k: '0-0', on: i % 2 === 0, day: '2026-10-14', at: i, t: 'x', src: 'widget' }));
  const kept = rt.press({ ...p, ops: under }, { widgetFamily: 'systemLarge' }, 'check:0-1');
  assert.equal(kept.ops.length, 300);
  assert.equal(kept.ops[0].at, 0);
  const ops = Array.from({ length: 300 }, (_, i) => ({ kind: 'check', k: '0-0', on: i % 2 === 0, day: '2026-10-14', at: i, t: 'x', src: 'widget' }));
  const out = rt.press({ ...p, ops }, { widgetFamily: 'systemLarge' }, 'check:0-1');
  assert.equal(out.ops.length, 300);
  assert.equal(out.ops[0].at, 1);
  assert.equal(out.ops[299].k, '0-1');
});

test('글은 props의 틀에서만 — 남은 수 · 다 했어요 · 비었어요', () => {
  const texts = (props, family) => {
    const out = [];
    walk(rt.render(props, { widgetFamily: family }), (n) => { if (n.type === 'TextView' && n.props.text) out.push(n.props.text); });
    return out;
  };
  const p = real();
  const left = p.total - p.done;
  assert.ok(texts(p, 'accessoryInline').includes(`오늘 ${left}개 남았어요`));
  // 중간: '● 오늘 할 일' … 남은 수 굵게 + '개 남음'(틀 '{n}개 남음'을 나눠 그린다)
  const medium = texts(p, 'systemMedium');
  for (const w of ['오늘 할 일', String(left), '개 남음']) assert.ok(medium.includes(w), `medium: ${w}`);
  assert.ok(texts(p, 'systemSmall').includes('오늘'));
  assert.ok(texts(p, 'systemSmall').includes(`${p.done}/${p.total}`));
  assert.ok(texts(p, 'systemLarge').includes('단단한 한 해'));
  assert.ok(texts(p, 'systemLarge').includes(`${p.done}/${p.total}`));
  assert.ok(texts(p, 'systemLarge').includes(p.date));
  const done = { ...p, done: p.total };
  assert.ok(texts(done, 'accessoryInline').includes('오늘 할 일을 다 했어요'));
  assert.ok(texts(done, 'systemMedium').includes('오늘 할 일을 다 했어요'));
  const empty = { ...p, done: 0, total: 0, items: [], more: 0 };
  assert.ok(texts(empty, 'accessoryInline').includes('오늘 담은 일이 없어요'));
  assert.ok(texts(empty, 'systemMedium').includes('오늘 담은 일이 없어요'));
  // 잠금 네모: '● 다음 할 일' + 할 일 글
  const rect = texts(p, 'accessoryRectangular');
  assert.ok(rect.includes('다음 할 일'));
  assert.ok(rect.includes(p.items.find((i) => !i.d).t));
  // 잠금 동그라미: '오늘' · 한 수 · '/모두'
  const circ = texts(p, 'accessoryCircular');
  for (const w of ['오늘', String(p.done), `/${p.total}`]) assert.ok(circ.includes(w), `circular: ${w}`);
  // ja · en은 틀의 앞뒤가 다르다('あと{n}件' · '{n} left')
  const ja = texts(widgetTimeline(doc(), NOW, { pat: 'dots', lang: 'ja' })[0].props, 'systemMedium');
  for (const w of ['今日やること', 'あと', String(left), '件']) assert.ok(ja.includes(w), `ja: ${w}`);
  const en = texts(widgetTimeline(doc(), NOW, { pat: 'dots', lang: 'en' })[0].props, 'systemMedium');
  for (const w of ["Today's list", String(left), ' left']) assert.ok(en.includes(w), `en: ${w}`);
  // 빈 props는 글이 없을 뿐 깨지지 않는다
  for (const f of FAMILIES) for (const t of texts({}, f)) assert.doesNotMatch(t, /undefined|NaN|\{[nt]\}/);
});

test('JSX에 글자를 직접 쓰지 않는다(모든 글은 props.lines에서)', () => {
  const src = fs.readFileSync(LAYOUT_FILE, 'utf8');
  assert.doesNotMatch(src, />[^<>{}\n]*\p{L}[^<>{}\n]*</u);
  assert.ok(code.length > 0);
});

test('시험대 자체 — 바깥 이름을 쓰는 함수는 vm에서 ReferenceError', () => {
  assert.throws(() => widgetRuntime('function (p) { return outside(p); }').render({}), /outside is not defined/);
  assert.throws(() => widgetRuntime('function (p) { return _swiftUi.Text(p); }').render({}), /_swiftUi is not defined/);
});

/** 수정자 하나의 인자(없으면 null) */
const modArgs = (n, type) => { const m = (n.props.modifiers || []).find((x) => x.$type === type); return m ? m.args : null; };

test('줄의 읽어 주기 — 한 일은 checked, 아직 안 한 일은 unchecked(R-7 A-4)', () => {
  const p = real();
  const labels = [];
  walk(rt.render(p, { widgetFamily: 'systemLarge' }), (n) => { if (n.type === 'Button') labels.push(modArgs(n, 'accessibilityLabel')[0]); });
  const shown = p.items.slice(0, 8);
  assert.deepEqual(labels, shown.map((i) => (i.d ? `${i.t} — 했어요` : `${i.t}, 아직 안 했어요`)));
  assert.ok(shown.some((i) => i.d) && shown.some((i) => !i.d), '두 모습 다 본다');
  // 옛 스냅숏(unchecked 없음)은 글만 읽는다
  const old = { ...p, lines: { ...p.lines, unchecked: undefined } };
  walk(rt.render(old, { widgetFamily: 'systemMedium' }), (n) => {
    if (n.type === 'Button') assert.doesNotMatch(modArgs(n, 'accessibilityLabel')[0], /^$|undefined|\{t\}/);
  });
});

test('한 수의 읽어 주기는 빗금 없이 말로(R-7 A-4) — 작게 · 크게 · 동그라미는 한 수, 중간은 남은 수', () => {
  const p = real();
  const want = `오늘 ${p.total}개 중 ${p.done}개 했어요`;
  const wantLeft = `오늘 ${p.total - p.done}개 남았어요`;
  const STACKS = new Set(['VStackView', 'HStackView', 'ZStackView']);
  for (const [family, w] of [['systemSmall', want], ['systemLarge', want], ['accessoryCircular', want], ['systemMedium', wantLeft]]) {
    const said = [];
    walk(rt.render(p, { widgetFamily: family }), (n) => { const a = modArgs(n, 'accessibilityLabel'); if (a && STACKS.has(n.type)) said.push(a[0]); });
    assert.ok(said.includes(w), `${family}: ${said.join(' | ')}`);
    for (const s of said) assert.doesNotMatch(s, /\d\/\d/, `${family}: ${s}`);
    // 그 머리는 하나로 읽힌다(글 조각 '1/10'을 따로 읽지 않는다)
    let combined = false;
    walk(rt.render(p, { widgetFamily: family }), (n) => {
      if (modArgs(n, 'accessibilityLabel')?.[0] === w && JSON.stringify(modArgs(n, 'accessibilityElement')) === '["ignore"]') combined = true;
    });
    assert.ok(combined, `${family}: accessibilityElement('ignore')`);
  }
  const en = widgetTimeline(doc(), NOW, { pat: 'dots', lang: 'en' })[0].props;
  const said = [];
  walk(rt.render(en, { widgetFamily: 'systemSmall' }), (n) => { const a = modArgs(n, 'accessibilityLabel'); if (a) said.push(a[0]); });
  assert.ok(said.includes(`${en.done} of ${en.total} done today`), said.join(' | '));
});

test('한 일 줄의 글은 ink2 그대로 — 불투명도를 더 걸지 않는다(R-7 A-3b)', () => {
  const p = real();
  for (const scheme of ['light', 'dark']) {
    const P = p.pal[scheme];
    let seen = 0;
    walk(rt.render(p, { widgetFamily: 'systemLarge', colorScheme: scheme }), (n) => {
      if (n.type !== 'TextView' || !p.items.some((i) => i.t === n.props.text)) return;
      const it = p.items.find((i) => i.t === n.props.text);
      assert.equal(modArgs(n, 'foregroundStyle')[0], it.d ? P.ink2 : P.ink, it.t);
      assert.equal(modArgs(n, 'opacity'), null, `${it.t}: 글에 opacity 없음`);
      seen++;
    });
    assert.ok(seen >= 2);
  }
});

test('종이 무늬 선은 목록 괘선보다 옅다 — opacity 0.55(R-6 D-4)', () => {
  let n = 0;
  walk(rt.render({ ...real(), pat: 'grid' }, { widgetFamily: 'systemLarge' }), (node) => {
    if (!(node.props.modifiers || []).some((m) => m.$type === 'clipped')) return;
    walk(node.props.children, (r) => { if (r.type === 'RectangleView') { assert.equal(JSON.stringify(modArgs(r, 'opacity')), '[0.55]'); n++; } });
  });
  assert.equal(n, 60);
});
