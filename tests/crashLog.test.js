// 이 기기에만 남는 오류 기록(src/lib/crashLog.ts) — 마지막 20건의 고리, 사용자가 적은 글을 남기지 않는 거르기, 길이 막음,
// 저장 자리, 전역 손잡이. 문의 메일에 붙이는 글은 tests/supportMail.test.js, 경계 · 부르는 자리 · 통신 없음은 tests/crashBoundaries.test.js.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const L = require('../src/lib/crashLog');
const { crash } = require('../src/lib/crash');
const APP_VERSION = require('../app.json').expo.version;

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
/** 주석을 뺀 소스 */
const code = (f) => src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** 사용자가 적었을 법한 글 — 기록 어디에도 남으면 안 된다 */
const USER = ['매일 아침 30분 달리기', '감사 일기', '毎朝30分走る', '읽은 책: 사피엔스'];
const HANGUL_KANA = /[ᄀ-ᇿ぀-ヿ㄰-㆏一-鿿가-힯]/;

function fresh(store = null) {
  L.resetLogForTest();
  if (store) L.attachLogStore(store);
}
/** 메모리에 든 저장 자리 */
function memStore(initial = null) {
  const s = { text: initial, reads: 0, writes: 0 };
  return { s, store: { read: () => { s.reads += 1; return s.text; }, write: (t) => { s.writes += 1; s.text = t; } } };
}
function err(name, message, stack) {
  const e = new Error(message);
  e.name = name;
  if (stack !== undefined) e.stack = stack;
  return e;
}

// ── 거르기 ───────────────────────────────────────────────────────────────────

test('scrubMessage: 넣은 값을 되받아 적는 오류(JSON 읽기 등)는 고정된 앞머리만 남긴다', () => {
  // V8 · Hermes · JavaScriptCore가 실제로 적는 꼴
  assert.equal(L.scrubMessage('SyntaxError', `Unexpected token '매', "매일 아침 30분 달리기" is not valid JSON`), 'Unexpected token');
  assert.equal(L.scrubMessage('SyntaxError', 'JSON Parse error: Unexpected token: 매'), 'JSON Parse error');
  assert.equal(L.scrubMessage('SyntaxError', 'JSON Parse error: Unterminated string'), 'JSON Parse error');
  assert.equal(L.scrubMessage('SyntaxError', '"감사 일기" is not valid JSON'), '');
  assert.equal(L.scrubMessage('TypeError', "Cannot create property 'done' on string '감사 일기'"), 'Cannot create property');
  assert.equal(L.scrubMessage('TypeError', "Cannot use 'in' operator to search for 'text' in run every day"), 'Cannot use');
  assert.equal(L.scrubMessage('SyntaxError', 'Invalid regular expression: /(run/: Unterminated group'), 'Invalid regular expression');
  // 이름이 SyntaxError면 낱말이 걸리지 않아도 앞머리만
  assert.equal(L.scrubMessage('SyntaxError', 'bad input: run every day'), 'bad input');
  for (const m of [`Unexpected token 'r', "run every day" is not valid JSON`, 'JSON Parse error: Unexpected identifier "run"']) {
    assert.ok(L.scrubMessage('SyntaxError', m).length <= L.LOG_CAP.echo);
    assert.doesNotMatch(L.scrubMessage('SyntaxError', m), /run/);
  }
});

test('scrubMessage: 따옴표 안은 식별자 꼴일 때만 · 주소는 ? 앞까지만 · 영문 밖의 글자는 모두 뺀다 · 한 줄 · 길이 막음', () => {
  // 코드에서 온 속성 이름은 남는다(원인을 찾는 데 쓴다)
  assert.equal(L.scrubMessage('TypeError', "Cannot read property 'actions' of undefined"), "Cannot read property 'actions' of undefined");
  assert.equal(L.scrubMessage('TypeError', "Cannot read properties of undefined (reading 'themes')"), "Cannot read properties of undefined (reading 'themes')");
  // 식별자 꼴이 아니면(빈칸 · 한글 · 긴 글) 따옴표 안을 비운다
  assert.equal(L.scrubMessage('Error', 'Cell "run every day" not found'), 'Cell "*" not found');
  assert.equal(L.scrubMessage('Error', "No cell '매일 아침 30분 달리기'"), "No cell '*'");
  assert.equal(L.scrubMessage('Error', `key \`${'a'.repeat(40)}\` is long`), 'key `*` is long');
  // 따옴표 밖의 한글 · 가나 · 한자 · 그림 글자도 남지 않는다
  assert.equal(L.scrubMessage('Error', '감사 일기 is not a function'), '* is not a function');
  assert.equal(L.scrubMessage('Error', 'bad value 毎朝30分走る 🙂 here'), 'bad value *30* here');
  // 주소의 ? 뒤(React 축약 오류의 args · mailto 본문)
  assert.equal(
    L.scrubMessage('Error', 'Minified React error #31; visit https://react.dev/errors/31?args[]=object%20with%20keys%20%7Btext%7D for the full message'),
    'Minified React error #31; visit https://react.dev/errors/31 for the full message',
  );
  assert.equal(L.scrubMessage('Error', 'Unable to open URL: mailto:a@b.co?subject=hi&body=run%20every%20day'), 'Unable to open URL: mailto:a@b.co');
  // 첫 줄만, 그리고 길이 막음
  assert.equal(L.scrubMessage('Error', 'first line\nrun every day'), 'first line');
  assert.equal(L.scrubMessage('Error', 'x'.repeat(1000)).length, L.LOG_CAP.msg);
  // 글이 아니면 빈 글
  for (const junk of [undefined, null, 5, { toString: () => '감사 일기' }]) assert.equal(L.scrubMessage('Error', junk), '');
});

test('scrubName: 식별자 꼴의 짧은 이름만, 그 밖은 Error', () => {
  for (const n of ['TypeError', 'RangeError', 'CodedError', 'my.Error', '$x']) assert.equal(L.scrubName(n), n);
  for (const n of ['감사 일기', 'has space', '', 'x'.repeat(41), 5, null, undefined]) assert.equal(L.scrubName(n), 'Error');
});

test('scrubStack: 자리(frame)만 다시 짠다 — 함수 이름 · 파일 이름 · 줄:칸. 메시지 줄 · 폴더 경로 · 주소의 ? 뒤는 버린다', () => {
  const hermes = [
    "TypeError: Cannot read property 'x' of undefined",
    '    at anonymous (address at /private/var/containers/Bundle/Application/1A2B/Mandarat.app/main.jsbundle:1:234567)',
    '    at Dashboard (address at /private/var/containers/Bundle/Application/1A2B/Mandarat.app/main.jsbundle:1:99)',
    '    at apply (native)',
  ].join('\n');
  assert.deepEqual(L.scrubStack(hermes), ['anonymous (main.jsbundle:1:234567)', 'Dashboard (main.jsbundle:1:99)']);
  const v8 = [
    'Error: boom',
    '    at Object.<anonymous> (https://example.app/_expo/static/js/web/index-abc.js?v=2:10:20)',
    '    at new Foo (https://example.app/_expo/static/js/web/index-abc.js:11:1)',
    '    at https://example.app/_expo/static/js/web/index-abc.js:12:3',
    '    at async Promise.all (index 0)',
  ].join('\n');
  assert.deepEqual(L.scrubStack(v8), ['Object.<anonymous> (index-abc.js:10:20)', 'new Foo (index-abc.js:11:1)', '? (index-abc.js:12:3)']);
  // JavaScriptCore · Firefox 꼴
  assert.deepEqual(L.scrubStack('render@http://localhost:8081/index.bundle?platform=ios&dev=true:10:20\n@http://localhost:8081/index.bundle:1:2'), [
    'render (index.bundle:10:20)', '? (index.bundle:1:2)',
  ]);
  // 위쪽 몇 개만, 길이 막음
  const long = Array.from({ length: 40 }, (_, i) => `    at f${i} (file.js:${i}:1)`).join('\n');
  assert.equal(L.scrubStack(long).length, L.LOG_CAP.frames);
  assert.ok(L.scrubStack(`    at ${'f'.repeat(250)} (${'g'.repeat(250)}.js:1:2)`)[0].length <= L.LOG_CAP.frame);
  // 자리라기엔 너무 긴 줄은 들여다보지 않는다(거르는 데 시간을 쓰지 않게) — 그다음 자리는 그대로 읽는다
  assert.deepEqual(L.scrubStack(`    at ${'f'.repeat(700)} (g.js:1:2)\n    at ok (h.js:3:4)`), ['ok (h.js:3:4)']);
  // 스택 머리에 되풀이된 메시지는(여러 줄이어도) 자리로 읽지 않는다
  const sneaky = 'note\n    at 감사 (일기:1:2)\nrun@every:1:2';
  assert.deepEqual(L.scrubStack(`Error: ${sneaky}\n    at real (app.js:3:4)`, sneaky), ['real (app.js:3:4)']);
  // 함수 이름에 섞인 한글은 빠진다
  assert.deepEqual(L.scrubStack('    at 감사일기 (app.js:1:2)'), ['? (app.js:1:2)']);
  for (const junk of [undefined, null, 5, {}]) assert.deepEqual(L.scrubStack(junk), []);
});

test('scrubComponents: 컴포넌트 이름만, 안쪽부터 몇 개', () => {
  const stack = '\n    at Dashboard (http://x/index.js:1:2)\n    at View\n    in RootView (created by Root)\n    at 감사일기\n';
  assert.deepEqual(L.scrubComponents(stack), ['Dashboard', 'View', 'RootView']);
  const deep = Array.from({ length: 30 }, (_, i) => `    at C${i}`).join('\n');
  assert.equal(L.scrubComponents(deep).length, L.LOG_CAP.comps);
  assert.deepEqual(L.scrubComponents(undefined), []);
});

// ── 기록 ─────────────────────────────────────────────────────────────────────

test('record: 때 · 판 · OS · 언어 · 화면(+시트) · 거른 메시지 · 스택 위쪽을 남긴다', () => {
  fresh();
  L.setLogOs('ios 18.1');
  crash.tag('lang', 'ko');
  crash.tag('screen', 'today');
  crash.tag('overlay', 'quick');
  crash.tag('layout', 'spread');
  crash.tag('pro', 'n');
  const before = Date.now();
  crash.report(err('TypeError', "Cannot read property 'actions' of undefined", "TypeError: x\n    at Dashboard (main.jsbundle:1:2)"), { where: 'widgetSync' });
  const [e] = L.logEntries();
  assert.ok(e.at >= before && e.at <= Date.now());
  assert.equal(e.v, APP_VERSION);
  assert.equal(e.os, 'ios 18.1');
  assert.equal(e.lang, 'ko');
  assert.equal(e.screen, 'today+quick');
  assert.equal(e.tags, 'layout=spread pro=n');
  assert.equal(e.kind, 'report');
  assert.equal(e.where, 'widgetSync');
  assert.equal(e.name, 'TypeError');
  assert.equal(e.msg, "Cannot read property 'actions' of undefined");
  assert.deepEqual(e.stack, ['Dashboard (main.jsbundle:1:2)']);
  // 시트가 닫히면 화면만
  crash.tag('overlay', '');
  crash.report(err('Error', 'second'));
  assert.equal(L.logEntries()[1].screen, 'today');
  // 경계가 넘긴 컴포넌트 스택이 있으면 그리기 오류
  crash.report(err('Error', 'third'), { componentStack: '\n    at Stats\n    at View' });
  const third = L.logEntries()[2];
  assert.equal(third.kind, 'render');
  assert.deepEqual(third.comp, ['Stats', 'View']);
});

test('record: 사용자가 적은 글은 어디에도 남지 않는다 — 메시지 · 이름 · 스택 · 태그 · 부스러기 · Error가 아닌 값', () => {
  const { s, store } = memStore();
  fresh(store);
  for (const text of USER) {
    crash.tag('screen', text);
    crash.crumb('link', text);
    crash.crumb(text, 'x');
    crash.report(err(text, `Cell "${text}" broke: ${text}`, `${text}: ${text}\n    at ${text} (/Users/${text}/app.js:1:2)`), { where: text, componentStack: `\n    at ${text}` });
    try { JSON.parse(`{"goal": "${text}`); } catch (e) { crash.report(e); }
    try { JSON.parse(text); } catch (e) { crash.report(e); }
    // Error가 아닌 값(문자열 · 객체로 던지거나 거절한 것)은 종류만
    L.record(text, { kind: 'promise' });
    L.record({ goal: text }, { kind: 'promise' });
    L.record([text], { kind: 'fatal' });
  }
  const dump = `${JSON.stringify(L.logEntries())}\n${L.logText()}\n${s.text}`;
  for (const text of USER) assert.equal(dump.includes(text), false, text);
  assert.doesNotMatch(dump, HANGUL_KANA);
  for (const word of ['달리기', '사피엔스', '走る']) assert.equal(dump.includes(word), false, word);
  const kinds = L.logEntries().filter((e) => e.name === 'NonError').map((e) => e.msg);
  assert.deepEqual([...new Set(kinds)].sort(), ['object', 'string']);
  L.record(null);
  L.record(undefined);
  assert.deepEqual(L.logEntries().slice(-2).map((e) => [e.name, e.msg]), [['NonError', 'null'], ['NonError', 'undefined']]);
});

test('고리: 마지막 20건만 — 넘치면 오래된 것부터 버린다. 길이는 늘 막는다', () => {
  const { s, store } = memStore();
  fresh(store);
  for (let i = 0; i < 55; i++) {
    L.record(err('Error', `e${i} ${'m'.repeat(600)}`, Array.from({ length: 50 }, (_, j) => `    at ${'f'.repeat(200)}${j} (${'p'.repeat(200)}/file${i}.js:${j}:1)`).join('\n')), {
      where: 'w'.repeat(200), componentStack: Array.from({ length: 50 }, (_, j) => `    at ${'C'.repeat(200)}${j}`).join('\n'),
    });
  }
  const all = L.logEntries();
  assert.equal(L.LOG_MAX, 20);
  assert.equal(all.length, L.LOG_MAX);
  assert.match(all[0].msg, /^e35 /);
  assert.match(all[19].msg, /^e54 /);
  for (const e of all) {
    assert.ok(e.msg.length <= L.LOG_CAP.msg);
    assert.ok(e.stack.length <= L.LOG_CAP.frames && e.stack.every((f) => f.length <= L.LOG_CAP.frame));
    assert.ok(e.comp.length <= L.LOG_CAP.comps && e.comp.every((c) => c.length <= L.LOG_CAP.comp));
    assert.ok(e.where.length <= L.LOG_CAP.where);
  }
  // 저장된 글도 같은 20건 — 기록 하나는 2KB를 넘지 않는다
  const saved = JSON.parse(s.text);
  assert.equal(saved.v, 1);
  assert.equal(saved.entries.length, L.LOG_MAX);
  assert.ok(s.text.length < L.LOG_MAX * 2048, `${s.text.length}`);
});

test('부스러기: 마지막 10개만 메모리에 두고 다음 기록에 붙인다', () => {
  fresh();
  for (let i = 0; i < 25; i++) crash.crumb('sync', `phase${i}`);
  crash.crumb('pro', 'x'.repeat(200));
  crash.report(err('Error', 'boom'));
  const [e] = L.logEntries();
  assert.equal(L.CRUMB_MAX, 10);
  assert.equal(e.crumbs.length, L.CRUMB_MAX);
  assert.equal(e.crumbs[0], 'sync:phase16');
  assert.equal(e.crumbs[8], 'sync:phase24');
  assert.ok(e.crumbs[9].startsWith('pro:xxx') && e.crumbs[9].length <= L.LOG_CAP.crumb);
  // 다음 기록에도 이어서 붙는다(지우지 않는다)
  crash.crumb('link', 'today');
  crash.report(err('Error', 'again'));
  assert.equal(L.logEntries()[1].crumbs.at(-1), 'link:today');
});

test('같은 오류가 잇달아 나면 세기만 한다 — 고리를 한 가지로 채우지 않고, 쓰기도 가끔만', () => {
  const { s, store } = memStore();
  fresh(store);
  const again = () => L.record(err('Error', 'loop', '    at tick (app.js:1:2)'), { kind: 'error' });
  for (let i = 0; i < 50; i++) again();
  const all = L.logEntries();
  assert.equal(all.length, 1);
  assert.equal(all[0].n, 50);
  // 처음 세 번과 20 · 40번째만 쓴다
  assert.equal(s.writes, 5);
  // 다른 오류가 끼면 새 줄
  L.record(err('Error', 'other'));
  again();
  assert.deepEqual(L.logEntries().map((e) => [e.msg, e.n]), [['loop', 50], ['other', undefined], ['loop', undefined]]);
  assert.match(L.logText(), / x50$/m);
});

// ── 저장 자리 ─────────────────────────────────────────────────────────────────

test('저장: 붙일 때는 읽지 않고(앱을 여는 길), 처음 쓰거나 읽을 때 한 번 읽어 앞에 잇는다', () => {
  fresh();
  L.record(err('Error', 'old-1'));
  L.record(err('Error', 'old-2'));
  const savedText = JSON.stringify({ v: 1, entries: L.logEntries() });
  const { s, store } = memStore(savedText);
  fresh(store);
  assert.equal(s.reads, 0, '붙이기만 해서는 읽지 않는다');
  L.record(err('Error', 'new-1'));
  assert.equal(s.reads, 1);
  assert.deepEqual(L.logEntries().map((e) => e.msg), ['old-1', 'old-2', 'new-1']);
  assert.deepEqual(JSON.parse(s.text).entries.map((e) => e.msg), ['old-1', 'old-2', 'new-1']);
  L.logText();
  L.record(err('Error', 'new-2'));
  assert.equal(s.reads, 1, '한 번만 읽는다');
  // 읽기만 해도(설정 › 문의하기) 저장된 기록이 보인다
  const again = memStore(s.text);
  fresh(again.store);
  assert.match(L.logText(), /new-2[\s\S]*old-1/);
  assert.equal(again.s.writes, 0);
});

test('저장: 읽거나 쓰다 던져도 기록기는 던지지 않는다 — 메모리의 기록은 남는다', () => {
  fresh({ read: () => { throw new Error('disk'); }, write: () => { throw new Error('full'); } });
  assert.doesNotThrow(() => {
    L.record(err('Error', 'kept'));
    crash.report(err('Error', 'kept too'), { where: 'x' });
    L.logText();
  });
  assert.deepEqual(L.logEntries().map((e) => e.msg), ['kept', 'kept too']);
  // 이상한 값을 넘겨도 던지지 않는다
  fresh();
  const hostile = { get message() { throw new Error('getter'); } };
  assert.doesNotThrow(() => {
    L.record(hostile);
    crash.report(Object.create(null));
    crash.crumb(undefined, null);
    crash.tag(undefined, undefined);
    crash.report(err('Error', 'ok'), { where: 5, componentStack: {} });
  });
});

test('parseLog: 깨진 글 · 다른 모양은 버리고, 저장된 것도 길이를 다시 자르며 영문 밖의 글자를 뺀다', () => {
  assert.deepEqual(L.parseLog(null), []);
  assert.deepEqual(L.parseLog('{not json'), []);
  assert.deepEqual(L.parseLog('[]'), []);
  assert.deepEqual(L.parseLog('{"entries":5}'), []);
  const raw = JSON.stringify({
    v: 1,
    entries: [
      null, 5, { at: 'x' }, { at: 1, kind: 'nope', name: 'E', msg: 'm', stack: [] },
      { at: 2, kind: 'fatal', name: '감사 일기', msg: `감사 일기 ${'y'.repeat(500)}`, stack: ['ok (a.js:1:2)', 5, '감사 (b.js:1:2)'], comp: 'x', crumbs: ['a:b', {}], lang: 'ko', n: 3.7, where: 'w'.repeat(99) },
    ],
  });
  const [e, ...rest] = L.parseLog(raw);
  assert.equal(rest.length, 0);
  assert.equal(e.name, 'Error');
  assert.ok(e.msg.length <= L.LOG_CAP.msg && !HANGUL_KANA.test(e.msg));
  assert.deepEqual(e.stack, ['ok (a.js:1:2)', '* (b.js:1:2)']);
  assert.equal(e.comp, undefined);
  assert.deepEqual(e.crumbs, ['a:b']);
  assert.equal(e.n, 3);
  assert.equal(e.where.length, L.LOG_CAP.where);
  // 20건이 넘는 파일은 마지막 20건만
  const many = JSON.stringify({ entries: Array.from({ length: 30 }, (_, i) => ({ at: i, kind: 'error', name: 'E', msg: `m${i}`, stack: [] })) });
  assert.deepEqual(L.parseLog(many).map((x) => x.msg), Array.from({ length: 20 }, (_, i) => `m${i + 10}`));
});

test('logText: 새것부터, 한 건은 머리 줄 · 오류 · 스택 · 컴포넌트 · 부스러기. 비어 있으면 빈 글', () => {
  fresh();
  assert.equal(L.logText(), '');
  L.setLogOs('ios 18.1');
  crash.tag('lang', 'ja');
  crash.tag('screen', 'grid');
  crash.crumb('link', 'grid');
  L.record(err('TypeError', 'first', '    at a (x.js:1:2)'), { kind: 'fatal' });
  crash.report(err('RangeError', 'second', '    at b (y.js:3:4)'), { where: 'screen:grid', componentStack: '\n    at GridScreen\n    at View' });
  const text = L.logText();
  const [newest, oldest] = text.split('\n\n');
  assert.match(newest, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} v\d+\.\d+\.\d+ ios 18\.1 ja render screen:grid @grid\nRangeError: second\n  b \(y\.js:3:4\)\n  in GridScreen < View\n  crumbs link:grid$/);
  assert.match(oldest, /^\S+ \S+ v\S+ ios 18\.1 ja fatal @grid\nTypeError: first\n  a \(x\.js:1:2\)\n  crumbs link:grid$/);
  // 글은 영문 · 숫자 · 기호뿐 — 메일 주소에 실어도 길어지지 않는다
  assert.match(text, /^[\x20-\x7E\n]+$/);
});

// ── 전역 손잡이 ───────────────────────────────────────────────────────────────

test('installCrashHandlers: RN 손잡이를 감싼다 — 기록한 뒤 앞서 걸린 손잡이를 같은 인자로 부른다(빨간 화면 · 종료는 그대로)', () => {
  fresh();
  const calls = [];
  // 앞선 손잡이가 불릴 때는 이미 기록이 남아 있어야 한다(출시 판은 그 손잡이가 앱을 닫는다)
  let loggedBeforePrev = -1;
  let handler = (e, fatal) => {
    loggedBeforePrev = L.logEntries().length;
    calls.push(['prev', e, fatal]);
  };
  const g = { ErrorUtils: { getGlobalHandler: () => handler, setGlobalHandler: (h) => { handler = h; } } };
  L.installCrashHandlers(g, true);
  const boom = err('TypeError', 'fatal one', '    at press (app.js:1:2)');
  handler(boom, true);
  assert.equal(loggedBeforePrev, 1);
  assert.deepEqual(calls, [['prev', boom, true]]);
  handler(err('Error', 'soft'), false);
  assert.deepEqual(L.logEntries().map((e) => [e.kind, e.msg]), [['fatal', 'fatal one'], ['error', 'soft']]);
  assert.equal(calls.length, 2);
  assert.equal(calls[1][2], false);
  // 앞선 손잡이가 던지면 그대로 던진다(RN의 기본 동작을 바꾸지 않는다) — 기록은 이미 남았다
  let h2 = () => { throw new Error('native abort'); };
  L.installCrashHandlers({ ErrorUtils: { getGlobalHandler: () => h2, setGlobalHandler: (h) => { h2 = h; } } }, true);
  assert.throws(() => h2(err('Error', 'third'), true), /native abort/);
  assert.equal(L.logEntries().at(-1).msg, 'third');
});

test('installCrashHandlers: Hermes 거절 추적은 출시 판에서만 켠다 — allRejections · onUnhandled · onHandled, 기록만 한다', () => {
  fresh();
  const enabled = [];
  const g = { HermesInternal: { enablePromiseRejectionTracker: (o) => enabled.push(o) } };
  L.installCrashHandlers(g, true);
  assert.equal(enabled.length, 0, '개발 판은 RN이 이미 켠 추적(경고)을 건드리지 않는다');
  L.installCrashHandlers(g, false);
  assert.equal(enabled.length, 1);
  assert.deepEqual(Object.keys(enabled[0]).sort(), ['allRejections', 'onHandled', 'onUnhandled']);
  assert.equal(enabled[0].allRejections, true);
  enabled[0].onUnhandled(0, err('Error', 'rejected', '    at load (app.js:5:6)'));
  enabled[0].onUnhandled(1, '감사 일기');
  assert.doesNotThrow(() => enabled[0].onHandled(0));
  assert.deepEqual(L.logEntries().map((e) => [e.kind, e.name, e.msg]), [['promise', 'Error', 'rejected'], ['promise', 'NonError', 'string']]);
  // 이 이름들은 RN이 개발 판에서 넘기는 것과 같다(설치된 react-native 소스)
  const rn = src('node_modules/react-native/Libraries/promiseRejectionTrackingOptions.js');
  for (const k of ['allRejections: true', 'onUnhandled: (id, rejection) =>', 'onHandled: id =>']) assert.ok(rn.includes(k), k);
  const poly = src('node_modules/react-native/Libraries/Core/polyfillPromise.js');
  assert.match(poly, /if \(__DEV__\) \{[\s\S]*global\.HermesInternal\?\.enablePromiseRejectionTracker\?\.\(/, 'RN은 개발 판에서만 켠다');
  // 없는 전역 · 던지는 전역에서도 던지지 않는다
  assert.doesNotThrow(() => L.installCrashHandlers({}, false));
  assert.doesNotThrow(() => L.installCrashHandlers({ HermesInternal: { enablePromiseRejectionTracker: () => { throw new Error('x'); } }, ErrorUtils: { getGlobalHandler: () => { throw new Error('y'); }, setGlobalHandler: () => {} } }, false));
});

test('installCrashHandlers: 웹은 window의 error · unhandledrejection을 기록만 한다(문서가 있을 때만)', () => {
  fresh();
  const listeners = {};
  const add = (type, cb) => { listeners[type] = cb; };
  L.installCrashHandlers({ addEventListener: add }, false);
  assert.deepEqual(Object.keys(listeners), [], '문서가 없으면(기기) 듣지 않는다');
  L.installCrashHandlers({ document: {}, addEventListener: add }, false);
  assert.deepEqual(Object.keys(listeners).sort(), ['error', 'unhandledrejection']);
  listeners.error({ error: err('Error', 'web error') });
  listeners.unhandledrejection({ reason: err('Error', 'web rejection') });
  listeners.error({});
  assert.deepEqual(L.logEntries().map((e) => [e.kind, e.msg]), [['error', 'web error'], ['promise', 'web rejection'], ['error', 'undefined']]);
});

test('index.ts: 손잡이를 App보다 먼저 건다 — crashBoot를 App 앞에서 불러오고, crashBoot는 저장 자리를 붙인 뒤 손잡이를 건다', () => {
  const entry = code('index.ts');
  const imports = [...entry.matchAll(/^import .*?['"]([^'"]+)['"];$/gm)].map((m) => m[1]);
  // expo(런타임 준비)는 예전처럼 맨 처음, 그다음 손잡이, 그다음 앱
  assert.deepEqual(imports, ['expo', './src/lib/crashBoot', './App']);
  assert.match(entry, /^import '\.\/src\/lib\/crashBoot';$/m, '값 없이 불러온다(불러오는 순서가 지켜진다)');
  assert.ok(entry.indexOf("import './src/lib/crashBoot'") < entry.indexOf("import App from './App'"));
  assert.ok(entry.indexOf("import App from './App'") < entry.indexOf('registerRootComponent(App)'));

  const boot = code('src/lib/crashBoot.ts');
  // 기기: 문서 폴더의 파일 하나에 곧바로 쓴다(File.write) · 웹: localStorage
  assert.match(boot, /new File\(Paths\.document, CRASH_LOG_FILE\)/);
  assert.match(boot, /file\.exists \? file\.textSync\(\) : null/);
  assert.match(boot, /if \(!file\.exists\) file\.create\(\);\s*file\.write\(text\);/);
  assert.match(boot, /localStorage\?\.setItem\(CRASH_LOG_KEY, text\)/);
  assert.match(boot, /attachLogStore\(Platform\.OS === 'web' \? webStore : fileStore\);/);
  assert.match(boot, /setLogOs\(`\$\{Platform\.OS\} \$\{String\(Platform\.Version \?\? ''\)\}`\);/);
  assert.ok(boot.indexOf('attachLogStore(') < boot.lastIndexOf('installCrashHandlers();'));
  assert.match(boot, /\}\s*installCrashHandlers\(\);\s*$/, '저장 자리를 붙이다 던져도 손잡이는 건다');
  // 설치된 expo-file-system에 이 이름들이 있다
  const fsTypes = src('node_modules/expo-file-system/build/internal/NativeFileSystem.types.d.ts');
  for (const k of ['textSync(): string;', 'write(content: string | Uint8Array, options?: FileWriteOptions): void;', 'exists: boolean;']) assert.ok(fsTypes.includes(k), k);
  assert.match(src('node_modules/expo-file-system/build/Paths.d.ts'), /static get document\(\): Directory;/);
});
