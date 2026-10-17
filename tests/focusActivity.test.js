// 집중 타이머 Live Activity(V2-B) — 값(src/lib/focusActivity.ts), 모습(src/widgets/FocusActivity.ios.tsx),
// 띄우고 끝내는 자리(src/overlays/FocusTimer.tsx)와 25분 알림.
// 모습은 tests/helpers/widgetVm.js의 위젯 런타임 vm에서 그린다 — 바깥 이름을 쓰면 ReferenceError로 드러난다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const babel = require('@babel/core');
const { focusProps, focusLines, focusStartOf, FOCUS_URL, FOCUS_DONE_LINGER_MS } = require('../src/lib/focusActivity');
const { plistSafe } = require('../src/lib/widgetSnapshot');
const { FOCUS_TOTAL, fmtClock } = require('../src/lib/focusClock');
const { msg } = require('../src/i18n');
const { VIEWS, widgetRuntime, walk } = require('./helpers/widgetVm');

const ROOT = path.join(__dirname, '..');
const LAYOUT_FILE = path.join(ROOT, 'src/widgets/FocusActivity.ios.tsx');
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const END = new Date(2026, 9, 14, 9, 55).getTime();
const base = {
  text: '  보고서  초안\n쓰기 ', area: '일', color: '#6B8F71', mood: '연꽃', accent: '#B0883C', lang: 'ko',
  startAt: focusStartOf(END), endAt: END,
};

// ── 값 ──────────────────────────────────────────────────────────────────────

test('focusProps — plist에 그대로 들어간다(null · undefined · Date 없음, 색은 hex, ms 숫자)', () => {
  for (const mood of ['연꽃', '크림', '화이트', '파스텔', '다크']) {
    for (const lang of ['ko', 'ja', 'en']) {
      const p = focusProps({ ...base, mood, lang });
      assert.equal(plistSafe(p), p);
      assert.deepEqual(JSON.parse(JSON.stringify(p)), p);
      for (const pal of [p.pal.light, p.pal.dark]) {
        for (const c of Object.values(pal)) assert.match(c, /^#[0-9A-F]{6}([0-9A-F]{2})?$/, `${mood} ${c}`);
      }
      assert.match(p.c, /^#[0-9A-F]{6}$/);
      assert.deepEqual(p.lines, focusLines(lang));
    }
  }
  const p = focusProps(base);
  assert.equal(p.v, 1);
  assert.equal(p.t, '보고서 초안 쓰기', '한 줄로');
  assert.equal(p.area, '일');
  assert.equal(p.start, END - FOCUS_TOTAL * 1000);
  assert.equal(p.end, END);
  assert.equal(p.paused, -1, '도는 중');
  assert.equal(p.done, false);
  assert.equal(p.url, 'mandarat://focus');
  assert.equal(FOCUS_URL, 'mandarat://focus');
  assert.equal(FOCUS_DONE_LINGER_MS, 5 * 60 * 1000);
  // 다크 무드면 밝은 판은 미색(연꽃), 어두운 판은 다크
  const d = focusProps({ ...base, mood: '다크' });
  assert.equal(d.pal.light.paper, '#FBF9F4');
  assert.equal(d.pal.dark.paper, '#0E0D14');
  // 비어 있거나 이상한 값도 plist에 들어간다
  const odd = focusProps({ text: '', area: '', color: '', mood: '없음', startAt: NaN, endAt: NaN, pausedLeft: NaN });
  assert.equal(plistSafe(odd), odd);
  assert.equal(odd.paused, -1);
  assert.ok(odd.start <= odd.end);
});

test('focusProps — 멈춤과 끝', () => {
  const paused = focusProps({ ...base, pausedLeft: 754_321.4 });
  assert.equal(paused.paused, 754_321);
  assert.equal(paused.done, false);
  const zero = focusProps({ ...base, pausedLeft: 0 });
  assert.equal(zero.paused, 0, '0ms 남은 멈춤도 멈춤');
  const done = focusProps({ ...base, pausedLeft: 1000, done: true });
  assert.equal(done.done, true);
  assert.equal(done.paused, -1, '끝나면 멈춤이 아니다');
  assert.equal(focusProps({ ...base, startAt: END + 5 }).start, END, '시작은 끝보다 늦지 않다');
  // 문구는 세 언어 모두 채워져 있고, 틀({n} 등)이 없다
  for (const lang of ['ko', 'ja', 'en']) {
    const l = msg(lang).live;
    for (const k of ['left', 'paused', 'done', 'focus', 'doneTitle']) {
      assert.equal(typeof l[k], 'string', `${lang}.${k}`);
      assert.ok(l[k].length > 0 && !/[{}]/.test(l[k]), `${lang}.${k}`);
    }
  }
});

// ── 모습 ────────────────────────────────────────────────────────────────────

function transform() {
  return babel.transformSync(fs.readFileSync(LAYOUT_FILE, 'utf8'), {
    filename: LAYOUT_FILE, cwd: ROOT, babelrc: false, configFile: false,
    presets: ['babel-preset-expo'],
    caller: { name: 'metro', bundler: 'metro', platform: 'ios', isDev: false },
  }).code;
}
function extract(code) {
  const module = { exports: {} };
  const fakeRequire = () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => null) });
  vm.runInNewContext(code, { module, exports: module.exports, require: fakeRequire, console });
  return module.exports.FocusLayout;
}

const layout = extract(transform());
/**
 * widgetVm의 런타임에 Live Activity가 더 쓰는 두 가지를 얹는다(위젯 쪽에는 @expo/ui의 모든 뷰가 전역으로 있다):
 * ProgressView, 그리고 @expo/ui Text의 타이머 모드(timerInterval이 있으면 자식 없이 ms로 넘긴다).
 */
const LIVE_VIEWS = VIEWS.concat(['ProgressView']);
const rt = widgetRuntime(`(function () {
  var baseText = globalThis.Text;
  var ms = function (r) { return r ? { lower: r.lower.getTime(), upper: r.upper.getTime() } : undefined; };
  var Text = function (props) {
    if (props && props.timerInterval) {
      var q = Object.assign({}, props, { timerInterval: ms(props.timerInterval) });
      return { type: 'TextView', props: q };
    }
    return baseText(props);
  };
  var ProgressView = function (props) {
    return { type: 'ProgressView', props: Object.assign({}, props, { timerInterval: ms(props.timerInterval) }) };
  };
  return ${layout};
})()`);

const REGIONS = ['banner', 'compactLeading', 'compactTrailing', 'minimal', 'expandedLeading', 'expandedTrailing', 'expandedBottom'];

function texts(node) {
  const out = [];
  walk(node, (n) => {
    if (n.type === 'TextView' && typeof n.props.text === 'string') out.push(n.props.text);
  });
  return out;
}
function find(node, pred) {
  let hit = null;
  walk(node, (n) => {
    if (!hit && pred(n)) hit = n;
  });
  return hit;
}
function check(out, label) {
  assert.ok(out && typeof out === 'object', label);
  for (const r of REGIONS) assert.ok(out[r] && typeof out[r] === 'object', `${label}: ${r}`);
  const mods = (out.banner.props.modifiers || []).map((m) => m.$type);
  assert.ok(mods.includes('activityBackgroundTint'), `${label}: activityBackgroundTint`);
  assert.ok(mods.includes('widgetURL'), `${label}: widgetURL`);
  const tintMod = out.banner.props.modifiers.find((m) => m.$type === 'activityBackgroundTint');
  assert.match(tintMod.args[0], /^#[0-9A-F]{6}([0-9A-F]{2})?$/i);
  for (const r of REGIONS) {
    walk(out[r], (n) => {
      assert.equal(typeof n.type, 'string', `${label}: ${r} 뷰 이름`);
      const kids = n.props.children;
      if (Array.isArray(kids)) for (const k of kids) assert.equal(Array.isArray(k), false, `${label}: ${r} 배열 안의 배열`);
      for (const m of n.props.modifiers || []) {
        for (const a of m.args) if (typeof a === 'string' && /rgba?\(/.test(a)) assert.fail(`${label}: rgba 색`);
      }
      assert.notEqual(n.type, 'Button', `${label}: 버튼이 없다`);
    });
  }
}

test('바꾼 결과 — FocusLayout은 글자이고 모듈 이름이나 babel 도움 함수를 부르지 않는다', () => {
  assert.equal(typeof layout, 'string');
  assert.match(layout, /^function\s*\(/);
  for (const bad of ['require(', '_swiftUi', '_modifiers', '_jsxRuntime', '_interopRequire', '_objectSpread', '_defineProperty', 'exports.', 'React.']) {
    assert.equal(layout.includes(bad), false, bad);
  }
});

test('import는 위젯 런타임에 전역으로 있는 이름만', () => {
  const s = fs.readFileSync(LAYOUT_FILE, 'utf8');
  const named = (from) => {
    const m = s.match(new RegExp(`import \\{([^}]*)\\} from '${from.replace(/[/@]/g, '\\$&')}'`));
    return m ? m[1].split(',').map((x) => x.trim()).filter(Boolean) : [];
  };
  assert.ok(named('@expo/ui/swift-ui').length > 0);
  for (const v of named('@expo/ui/swift-ui')) assert.ok(LIVE_VIEWS.includes(v), `뷰 ${v}`);
  for (const m of named('@expo/ui/swift-ui/modifiers')) assert.ok(rt.modifierNames.has(m), `수정자 ${m}`);
  for (const m of s.matchAll(/^import (?!type )(.*) from '([^']+)'/gm)) assert.match(m[2], /^@expo\/ui\/swift-ui/, m[0]);
});

test('{} props · 도는 중 · 멈춤 · 끝 × 밝게·어둡게 — 모든 자리가 그려진다', () => {
  const sets = {
    empty: {},
    run: focusProps(base),
    paused: focusProps({ ...base, pausedLeft: 12 * 60 * 1000 + 5_000 }),
    done: focusProps({ ...base, done: true }),
    en: focusProps({ ...base, lang: 'en', text: '' }),
  };
  for (const [name, p] of Object.entries(sets)) {
    for (const colorScheme of ['light', 'dark']) check(rt.render(p, { colorScheme }), `${name}/${colorScheme}`);
  }
  // 어두우면 어두운 판의 종이
  const dark = rt.render(sets.run, { colorScheme: 'dark' });
  assert.equal(dark.banner.props.modifiers.find((m) => m.$type === 'activityBackgroundTint').args[0], sets.run.pal.dark.paper);
  const light = rt.render(sets.run, { colorScheme: 'light' });
  assert.equal(light.banner.props.modifiers.find((m) => m.$type === 'activityBackgroundTint').args[0], sets.run.pal.light.paper);
  assert.equal(light.banner.props.modifiers.find((m) => m.$type === 'widgetURL').args[0], 'mandarat://focus');
});

test('도는 중 — 타이머 글이 시작~끝으로 스스로 줄고, 진행 막대도 같은 구간', () => {
  const p = focusProps(base);
  const out = rt.render(p, { colorScheme: 'light' });
  for (const r of ['banner', 'compactTrailing', 'minimal', 'expandedTrailing']) {
    const timer = find(out[r], (n) => n.type === 'TextView' && n.props.timerInterval);
    assert.ok(timer, r);
    assert.deepEqual({ ...timer.props.timerInterval }, { lower: p.start, upper: p.end }, r);
    assert.equal(timer.props.countsDown, true, r);
    assert.ok(timer.props.modifiers.some((m) => m.$type === 'monospacedDigit'), `${r}: 고른 숫자 폭`);
  }
  const bar = find(out.banner, (n) => n.type === 'ProgressView');
  assert.deepEqual({ ...bar.props.timerInterval }, { lower: p.start, upper: p.end });
  assert.ok(find(out.expandedBottom, (n) => n.type === 'ProgressView'));
  const t = texts(out.banner);
  assert.ok(t.includes('보고서 초안 쓰기'));
  assert.ok(t.includes(p.lines.focus));
  // 영역 색은 네모 한 칸
  const sq = find(out.compactLeading, (n) => n.type === 'RectangleView');
  assert.ok(sq.props.modifiers.some((m) => m.$type === 'foregroundStyle' && m.args[0] === p.c));
  // 글이 없으면 영역 이름으로
  assert.ok(texts(rt.render(focusProps({ ...base, text: '' }), {}).banner).includes('일'));
});

test('멈춤 — 남은 시간을 굳힌 글과 lines.paused, 끝 — lines.done', () => {
  const left = 12 * 60 * 1000 + 5_000;
  const p = focusProps({ ...base, pausedLeft: left });
  const out = rt.render(p, {});
  for (const r of ['banner', 'compactTrailing', 'minimal', 'expandedTrailing']) {
    assert.equal(find(out[r], (n) => n.props.timerInterval), null, `${r}: 타이머가 멈춘다`);
    assert.ok(texts(out[r]).includes(fmtClock(left / 1000)), r);
  }
  assert.ok(texts(out.banner).includes(p.lines.paused));
  assert.ok(texts(out.expandedTrailing).includes(p.lines.paused));
  const bar = find(out.banner, (n) => n.type === 'ProgressView');
  assert.ok(Math.abs(bar.props.value - (1 - left / (FOCUS_TOTAL * 1000))) < 1e-9);

  const d = focusProps({ ...base, done: true, lang: 'ja' });
  const o = rt.render(d, {});
  assert.equal(find(o.banner, (n) => n.props.timerInterval), null);
  assert.ok(texts(o.banner).includes(d.lines.done));
  assert.ok(texts(o.banner).includes('25:00'));
  assert.equal(find(o.banner, (n) => n.type === 'ProgressView').props.value, 1);
});

// ── 띄우는 자리(FocusTimer) ─────────────────────────────────────────────────

test('FocusTimer — Live Activity는 세션마다 한 번 띄우고 한 번 끝낸다', () => {
  const s = src('src/overlays/FocusTimer.tsx');
  assert.equal(s.match(/focusLive\.start\(/g).length, 1, 'start 한 곳');
  assert.match(s, /if \(st === 'idle'\) \{\s*if \(run\) liveRef\.current = focusLive\.start\(props\) \? 'live' : 'none';/);
  // 끝: 25분을 채우면 '마쳤어요'를 5분 남기고, 닫기·언마운트는 바로 — 둘 다 떠 있을 때만, 끝낸 뒤엔 다시 부르지 않는다
  assert.match(s, /if \(st === 'none' \|\| st === 'ended'\) return;/);
  assert.match(s, /if \(st === 'live'\) focusLive\.end\(props, FOCUS_DONE_LINGER_MS\);\s*liveRef\.current = 'ended';/);
  assert.match(s, /if \(liveRef\.current === 'live'\) \{\s*focusLive\.end\(\);/);
  assert.equal(s.match(/focusLive\.end\(/g).length, 2);
  // 멈춤·계속은 update
  assert.match(s, /focusLive\.update\(props\);\s*\}, \[run, finished\]\);/);
  assert.match(s, /pausedLeft: run \|\| finished \? null : remainingMsRef\.current/);
  // 앱을 다시 열면 남은 것을 치운다
  assert.match(s, /if \(!openRef\.current\) focusLive\.endAll\(\);/);
  // 웹에서도 같은 이름 — 플랫폼 파일을 직접 부르지 않는다
  assert.match(s, /import \{ focusLive \} from '\.\.\/widgets\/focusLive';/);
  assert.match(s, /import \{ notifier \} from '\.\.\/lib\/notifier';/);
});

test('FocusTimer — 25분 알림: 도는 채로 떠나면 걸고, 돌아오기·멈춤·끝·닫기면 거둔다', () => {
  const s = src('src/overlays/FocusTimer.tsx');
  const start = s.indexOf("useEffect(() => {\n    if (!run || finished) return;\n    endAtRef.current");
  assert.ok(start > 0, '도는 동안의 효과');
  const body = s.slice(start, s.indexOf('}, [run, finished]);', start));
  assert.match(body, /if \(s === 'active'\) \{\s*notifier\.focusEnd\(null\)/);
  assert.match(body, /else if \(s === 'background'\) \{\s*notifier\.focusEnd\(endAtRef\.current, msgRef\.current\.live\.doneTitle, textRef\.current\)/);
  // 정리(멈춤·끝·닫기·언마운트)에서 거둔다
  assert.match(body, /return \(\) => \{[\s\S]*notifier\.focusEnd\(null\)/);
  assert.equal(s.match(/notifier\.focusEnd\(/g).length, 3);
  // 묻지 않는다
  assert.doesNotMatch(s, /notifier\.request\(/);
  // 지켜 온 것: 화면 켜 두기 · 한 번만 기록 · 벽시계
  assert.match(s, /keepAwake\(true\)/);
  assert.match(s, /if \(recordedRef\.current\) return;/);
  assert.match(s, /endAtRef\.current = Date\.now\(\) \+ remainingMsRef\.current;/);
});

test('focusLive — 기본 파일은 아무것도 하지 않고, iOS 파일은 던지지 않게 감싼다', () => {
  const { focusLive } = require('../src/widgets/focusLive');
  const p = focusProps(base);
  assert.equal(focusLive.start(p), false);
  focusLive.update(p);
  focusLive.end(p, 1000);
  focusLive.endAll();
  const ios = src('src/widgets/focusLive.ios.ts');
  assert.match(ios, /import \{ FocusLayout \} from '\.\/FocusActivity\.ios';/);
  assert.match(ios, /createLiveActivity<FocusActivityProps>\(LIVE_KIND, FocusLayout\)/);
  assert.match(ios, /current = f\.start\(props, props\.url\);\s*return true;\s*\} catch \{\s*current = null;\s*return false;/);
  assert.match(ios, /\{ after: new Date\(Date\.now\(\) \+ Math\.min\(dismissAfterMs, MAX_LINGER_MS\)\) \}/);
  assert.match(ios, /MAX_LINGER_MS = 4 \* 60 \* 60 \* 1000/);
  assert.match(ios, /all = f\.getInstances\(\);/);
  assert.match(ios, /p\.catch\(\(\) => \{\}\)/);
  assert.doesNotMatch(src('src/widgets/focusLive.ts'), /expo-widgets/);
});
