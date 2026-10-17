// V3-B 단축어 · Siri — native/ios의 Swift와 .strings가 위젯 약속(src/lib/contracts.ts)과 어긋나지 않는지.
// Swift는 여기서 컴파일할 수 없으니 글자로 읽어 지킨다: 열쇠 · 부르는 말 · 지난날 막기 · 문서를 직접 쓰지 않기.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../src/lib/contracts');
const { planOps } = require('../src/lib/widgetOps');
const { BANNED_COPY, BANNED_JA, BANNED_EN } = require('../src/i18n/glossary');
const koWidget = require('../src/i18n/ko/widget').default;

const DIR = path.join(__dirname, '..', 'native', 'ios');
const read = (rel) => fs.readFileSync(path.join(DIR, rel), 'utf8');
const LANGS = ['ko', 'ja', 'en'];
const intents = read('AppIntents.swift');
const store = read('TodayStore.swift');
const swift = intents + '\n' + store;

/** .strings → [열쇠, 값]. 주석 · 빈 줄 밖의 줄은 모두 "열쇠" = "값"; 이어야 한다 */
function parseStrings(text) {
  const body = text.replace(/\/\*[^]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const pairs = [];
  for (const line of body.split('\n')) {
    if (!line.trim()) continue;
    const m = /^"((?:[^"\\]|\\.)*)" = "((?:[^"\\]|\\.)*)";$/.exec(line);
    assert.ok(m, `.strings 줄: ${line}`);
    pairs.push([m[1], m[2]]);
  }
  return pairs;
}
const strings = (l, name) => parseStrings(read(`${l}.lproj/${name}.strings`));

/** 이름 붙은 struct 몸통 — 다음 최상위 선언 전까지 */
function body(name) {
  const start = intents.indexOf(`struct ${name}:`);
  assert.ok(start >= 0, name);
  const next = intents.slice(start + 1).search(/\n(@available|struct |enum |\/\/\/)/);
  return intents.slice(start, next < 0 ? undefined : start + 1 + next);
}

test('Swift는 contracts의 App Group · 타임라인 키 · 위젯 이름을 글자 그대로 쓴다', () => {
  assert.match(store, new RegExp(`static let appGroup = "${C.APP_GROUP.replace(/\./g, '\\.')}"`));
  assert.match(store, new RegExp(`static let timelineKey = "${C.WIDGET_TIMELINE_KEY}"`));
  assert.match(store, new RegExp(`static let widgetKind = "${C.WIDGET_KIND}"`));
  assert.match(store, /UserDefaults\(suiteName: appGroup\)/);
  assert.match(store, /reloadTimelines\(ofKind: widgetKind\)/);
  // ops는 위젯 버튼과 같이 마지막 50개
  assert.match(store, /static let maxOps = 50/);
  assert.match(store, /ops\.suffix\(maxOps\)/);
});

test('op 모양은 contracts WidgetOp 그대로, src는 siri — WidgetSync(planOps)가 받아들인다', () => {
  const op = /static func op\([^\n]*\) -> \[String: Any\] \{\s*\[([^\]]+)\]/.exec(store);
  assert.ok(op, 'TodayStore.op');
  const keys = [...op[1].matchAll(/"(\w+)":/g)].map((m) => m[1]).sort();
  assert.deepEqual(keys, ['at', 'day', 'k', 'kind', 'on', 'src', 't']);
  assert.match(op[1], /"src": "siri"/);
  assert.match(op[1], /"at": Int\(at\.timeIntervalSince1970 \* 1000\)/);
  const kinds = [...intents.matchAll(/TodayStore\.op\(kind: "(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(kinds)].sort(), ['check', 'focus', 'open']);

  // Swift가 쓰는 꼴의 op를 앱 쪽 planOps에 넣어 본다
  const today = new Date(2026, 9, 14, 9, 30);
  const day = '2026-10-14';
  const doc = {
    themes: Array.from({ length: 8 }, () => ({ actions: Array.from({ length: 8 }, () => ({ text: '', done: false, kind: 'once' })) })),
    dayLog: {}, todayExtra: undefined,
  };
  doc.themes[0].actions[0] = { text: '물 마시기', done: false, kind: 'once' };
  const at = today.getTime();
  const cmds = planOps([
    { kind: 'check', k: '0-0', on: true, day, at, t: '물 마시기', src: 'siri' },
    { kind: 'focus', k: '0-0', on: true, day, at: at + 1, t: '물 마시기', src: 'siri' },
    { kind: 'open', k: 'today', on: true, day, at: at + 2, t: '', src: 'siri' },
  ], doc, today);
  assert.deepEqual(cmds.map((c) => c.kind), ['checkToday', 'focus', 'open']);
});

test('지난 타임라인 막기 — props.day가 오늘(앱 ymd와 같은 꼴)일 때만 칸을 쓴다', () => {
  const current = store.slice(store.indexOf('static func current('), store.indexOf('static func op('));
  const guardAt = current.indexOf('day == localDay(now)');
  assert.ok(guardAt > 0, 'props.day를 오늘과 견준다');
  assert.ok(guardAt < current.indexOf('return .ok('), '견준 뒤에야 .ok');
  assert.match(current, /ts <= nowMs/, 'timestamp ≤ now인 마지막 칸');
  assert.match(store, /String\(format: "%04d-%02d-%02d"/, "ymd()와 같은 'YYYY-MM-DD'");
  // 쓰기 전에 다시 읽고 같은 날 칸인지 본다
  const append = store.slice(store.indexOf('static func appendOp('));
  assert.match(append, /guard let defaults, var entries = timeline\(\)/);
  assert.match(append, /\(props\["day"\] as\? String\) == snapshot\.day/);
  // 인텐트는 TodayStore.current()로만 읽는다 — 저장소를 직접 열지 않는다
  for (const name of ['ShowTodayIntent', 'TodayLeftIntent', 'CheckNextIntent', 'StartFocusIntent']) {
    const b = body(name);
    assert.match(b, /case \.ok\(let s\) = TodayStore\.current\(\)/, name);
    assert.doesNotMatch(b, /UserDefaults|timelineKey/, name);
  }
  // 앱을 열지 않는 둘은 타임라인이 없거나 지났으면 "open_app_first"
  for (const name of ['TodayLeftIntent', 'CheckNextIntent']) {
    assert.match(body(name), /guard case \.ok\(let s\) = TodayStore\.current\(\) else \{ return \.result\(dialog: SiriReply\.openAppFirst\) \}/, name);
  }
});

test('네 인텐트 — 앱 열기, 집중은 할 일 칸(ti-ai)만', () => {
  const opens = { ShowTodayIntent: true, TodayLeftIntent: false, CheckNextIntent: false, StartFocusIntent: true };
  for (const [name, open] of Object.entries(opens)) {
    assert.match(body(name), new RegExp(`static let openAppWhenRun: Bool = ${open}`), name);
    assert.match(body(name), /: AppIntent \{/, name);
  }
  assert.match(body('CheckNextIntent'), /TodayStore\.reload\(\)/, '체크하면 위젯을 바로');
  assert.match(body('CheckNextIntent'), /kind: "check", k: k, on: true/);
  assert.match(body('StartFocusIntent'), /s\.firstUndoneAction/);
  assert.match(store, /\^\\d-\\d\$/, "할 일 칸 열쇠 '^\\d-\\d$'");
  // 공개 인텐트는 단축어 앱에 보인다
  assert.doesNotMatch(swift, /isDiscoverable/);
});

test('문서 파일이나 AsyncStorage를 직접 쓰지 않는다', () => {
  for (const bad of [/mandarat:doc/, /mandarat:snap/, /FileManager/, /\.write\(to:/, /AsyncStorage/i, /RCTAsyncLocalStorage/, /Sync\/v1/]) {
    assert.doesNotMatch(swift, bad, String(bad));
  }
  // 쓰는 곳은 TodayStore.appendOp의 defaults.set 하나
  assert.equal((swift.match(/\.set\(/g) || []).length, 1);
  assert.match(store, /defaults\.set\(entries, forKey: timelineKey\)/);
});

test('props.lines 열쇠는 위젯 문구(widget 이름공간)에 있다', () => {
  const used = [...new Set([...swift.matchAll(/\.line\("(\w+)"/g)].map((m) => m[1]))].sort();
  assert.deepEqual(used, ['allDone', 'checked', 'empty', 'left', 'next']);
  for (const k of used) assert.equal(typeof koWidget[k], 'string', k);
  assert.match(store, /"\{n\}"/);
  assert.match(store, /"\{t\}"/);
});

test('AppShortcuts — 넷, 부르는 말마다 앱 이름, 시스템 그림', () => {
  const provider = intents.slice(intents.indexOf('struct MandaratShortcuts: AppShortcutsProvider'));
  const shortcuts = [...provider.matchAll(/AppShortcut\(\s*intent: (\w+)\(\),\s*phrases: \[([^\]]+)\],\s*shortTitle: "([\w.]+)",\s*systemImageName: "([\w.]+)"/g)];
  assert.equal(shortcuts.length, 4);
  assert.deepEqual(shortcuts.map((m) => m[1]), ['ShowTodayIntent', 'CheckNextIntent', 'TodayLeftIntent', 'StartFocusIntent']);
  assert.deepEqual(shortcuts.map((m) => m[4]), ['checklist', 'checkmark.square', 'list.bullet', 'timer']);
  const phrases = shortcuts.flatMap((m) => [...m[2].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((p) => p[1]));
  assert.equal(phrases.length, 8);
  for (const p of phrases) assert.ok(p.includes('\\(.applicationName)'), p);

  // AppShortcuts.strings 열쇠 = Swift 문장(\(.applicationName) → ${applicationName}), 값에도 늘 ${applicationName}
  const keys = phrases.map((p) => p.replace('\\(.applicationName)', '${applicationName}')).sort();
  for (const l of LANGS) {
    const pairs = strings(l, 'AppShortcuts');
    assert.deepEqual(pairs.map((p) => p[0]).sort(), keys, `${l} 열쇠`);
    for (const [, v] of pairs) {
      assert.equal(v.split('${applicationName}').length, 2, `${l}: ${v}`);
      assert.ok(v.replace('${applicationName}', '').trim(), `${l}: ${v}`);
    }
    assert.equal(new Set(pairs.map((p) => p[1])).size, pairs.length, `${l} 부르는 말이 겹치지 않는다`);
  }
});

test('Localizable.strings — 세 언어 열쇠가 같고, Swift가 쓰는 열쇠와 같다', () => {
  const used = [...new Set([...swift.matchAll(/"((?:intent|shortcut|dialog)\.[\w.]+)"/g)].map((m) => m[1]))].sort();
  assert.equal(used.length, 4 * 2 + 4 + 2);
  for (const l of LANGS) {
    const pairs = strings(l, 'Localizable');
    const keys = pairs.map((p) => p[0]);
    assert.equal(new Set(keys).size, keys.length, `${l} 열쇠가 겹치지 않는다`);
    assert.deepEqual([...keys].sort(), used, `${l} 열쇠`);
    for (const [k, v] of pairs) assert.ok(v.trim(), `${l} ${k}`);
  }
});

test('문구는 낱말장의 금지어를 쓰지 않는다', () => {
  const banned = { ko: BANNED_COPY, ja: BANNED_JA, en: BANNED_EN };
  for (const l of LANGS) {
    const values = [...strings(l, 'Localizable'), ...strings(l, 'AppShortcuts')].map((p) => p[1].replace('${applicationName}', ''));
    for (const v of values) {
      for (const b of banned[l]) {
        if (typeof b === 'string') assert.ok(!v.includes(b), `${l}: '${b}' in ${v}`);
        else assert.doesNotMatch(v, b, `${l}: ${v}`);
      }
    }
  }
  // ko 값은 한글, ja 값은 가나 · 한자가 들어간다(번역이 빠지지 않았다)
  for (const [, v] of strings('ko', 'Localizable')) assert.match(v, /[가-힣]/, v);
  for (const [, v] of strings('ja', 'Localizable')) assert.match(v, /[぀-ヿ一-鿿]/, v);
  for (const [, v] of strings('en', 'Localizable')) assert.doesNotMatch(v, /[가-힣぀-ヿ]/, v);
});
