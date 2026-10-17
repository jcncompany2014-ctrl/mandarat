// 기기 테스트(Maestro) 흐름과 EAS 워크플로의 모양 — 시뮬레이터 없이 여기서 볼 수 있는 것만.
// - YAML이 읽힌다(아래의 작은 YAML 읽개: 이 저장소의 흐름이 쓰는 꼴만 안다 — 들여쓰기 블록, '- ' 목록, [..]·{..} 한 줄, 따옴표).
// - 명령은 Maestro가 문서로 밝힌 것만 쓰고, 고르개(selector)의 키도 알려진 것만 쓴다.
// - id:는 모두 src/lib/testIds.ts(TID)에 있는 이름이다(함수 id는 앞부분이 같으면 된다 — "today-row-.*").
// - appId는 app.json의 번들 id, 워크플로는 eas.json에 있는 e2e 프로필을 쓴다.
// 실제로 도는지는 시뮬레이터에서만 안다 — docs/v2/device-tests.md의 기기 확인 목록.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { TID } = require('../src/lib/testIds');

const ROOT = path.join(__dirname, '..');
const MAESTRO = path.join(ROOT, '.maestro');
const WORKFLOW = path.join(ROOT, '.eas', 'workflows', 'e2e-ios.yml');
const read = (p) => fs.readFileSync(p, 'utf8');
const app = JSON.parse(read(path.join(ROOT, 'app.json'))).expo;
const eas = JSON.parse(read(path.join(ROOT, 'eas.json')));

// ── 작은 YAML 읽개 ────────────────────────────────────────────────────────────

/** 따옴표 밖의 ' #'부터 끝까지가 주석 */
function stripComment(s) {
  let q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '#' && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i);
  }
  return s;
}

/** 쉼표로 나누기 — 따옴표와 괄호 안의 쉼표는 건너뛴다 */
function splitFlow(s) {
  const out = [];
  let q = null, depth = 0, cur = '';
  for (const c of s) {
    if (q) { cur += c; if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') depth--;
    if (c === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (q || depth !== 0) throw new Error(`닫히지 않은 따옴표·괄호: ${s}`);
  if (cur.trim()) out.push(cur);
  return out.map((x) => x.trim());
}

const KEY_RE = /^("[^"]*"|'[^']*'|[^\s'"\-[{][^:]*?|-[^\s:][^:]*?):(?:\s+(.*))?$/;

function unquote(k) {
  return /^(["']).*\1$/.test(k) ? k.slice(1, -1) : k;
}

function scalar(raw) {
  const s = raw.trim();
  if (s.startsWith('"')) {
    if (!/^"(?:[^"\\]|\\.)*"$/.test(s)) throw new Error(`따옴표가 어긋남: ${s}`);
    return JSON.parse(s);
  }
  if (s.startsWith("'")) {
    if (!/^'(?:[^']|'')*'$/.test(s)) throw new Error(`따옴표가 어긋남: ${s}`);
    return s.slice(1, -1).replace(/''/g, "'");
  }
  if (s.startsWith('[')) {
    if (!s.endsWith(']')) throw new Error(`[ ]가 어긋남: ${s}`);
    return splitFlow(s.slice(1, -1)).map(scalar);
  }
  if (s.startsWith('{')) {
    if (!s.endsWith('}')) throw new Error(`{ }가 어긋남: ${s}`);
    const o = {};
    for (const part of splitFlow(s.slice(1, -1))) {
      const m = part.match(KEY_RE);
      if (!m) throw new Error(`{ } 안의 키를 못 읽음: ${part}`);
      o[unquote(m[1])] = scalar(m[2] ?? '');
    }
    return o;
  }
  if (s === '' || s === '~' || s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (/^[&*!|>%@`]/.test(s)) throw new Error(`이 읽개가 모르는 YAML: ${s}`);
  return s;
}

/** 한 문서(--- 사이)를 읽는다 */
function parseDoc(lines) {
  let i = 0;
  const peek = () => lines[i];

  function block(indent) {
    const l = peek();
    if (!l) return null;
    return l.text === '-' || l.text.startsWith('- ') ? seq(indent) : map(indent);
  }

  function seq(indent) {
    const out = [];
    while (peek() && peek().indent === indent && (peek().text === '-' || peek().text.startsWith('- '))) {
      const l = peek();
      const rest = l.text === '-' ? '' : l.text.slice(2).trim();
      if (!rest) {
        i++;
        if (!peek() || peek().indent <= indent) { out.push(null); continue; }
        out.push(block(peek().indent));
      } else if (KEY_RE.test(rest) && !rest.startsWith('[') && !rest.startsWith('{')) {
        // "- key: value" — 그 자리에서 시작하는 맵
        lines[i] = { indent: indent + 2, text: rest, n: l.n };
        out.push(map(indent + 2));
      } else {
        i++;
        out.push(scalar(rest));
      }
    }
    return out;
  }

  function map(indent) {
    const out = {};
    while (peek() && peek().indent === indent && !(peek().text === '-' || peek().text.startsWith('- '))) {
      const l = peek();
      const m = l.text.match(KEY_RE);
      if (!m) throw new Error(`${l.n}행: 키를 못 읽음 — ${l.text}`);
      const key = unquote(m[1]);
      if (Object.prototype.hasOwnProperty.call(out, key)) throw new Error(`${l.n}행: 키가 두 번 — ${key}`);
      i++;
      if (m[2] != null && m[2].trim() !== '') {
        out[key] = scalar(m[2]);
      } else if (peek() && peek().indent > indent) {
        out[key] = block(peek().indent);
      } else if (peek() && peek().indent === indent && (peek().text === '-' || peek().text.startsWith('- '))) {
        out[key] = seq(indent);
      } else {
        out[key] = null;
      }
    }
    return out;
  }

  const value = block(lines.length ? lines[0].indent : 0);
  if (i < lines.length) throw new Error(`${lines[i].n}행: 들여쓰기가 어긋남 — ${lines[i].text}`);
  return value;
}

/** 여러 문서(---)를 읽는다 */
function parseYaml(src) {
  const docs = [[]];
  src.split('\n').forEach((raw, idx) => {
    if (/\t/.test(raw.match(/^\s*/)[0])) throw new Error(`${idx + 1}행: 탭 들여쓰기`);
    if (/^---\s*$/.test(raw)) { docs.push([]); return; }
    const text = stripComment(raw).replace(/\s+$/, '');
    if (!text.trim()) return;
    docs[docs.length - 1].push({ indent: text.match(/^ */)[0].length, text: text.trim(), n: idx + 1 });
  });
  return docs.filter((d, k) => k === 0 ? d.length > 0 : true).map(parseDoc);
}

test('YAML 읽개 — 이 저장소가 쓰는 꼴', () => {
  assert.deepEqual(parseYaml('a: 1\nb:\n  - x\n  - y: "q" # c\n    z: [1, \'2\']\nc: { d: true }\n'), [
    { a: 1, b: ['x', { y: 'q', z: [1, '2'] }], c: { d: true } },
  ]);
  assert.deepEqual(parseYaml('appId: x\n---\n- launchApp\n- tapOn:\n    id: "a"\n'), [{ appId: 'x' }, ['launchApp', { tapOn: { id: 'a' } }]]);
  assert.throws(() => parseYaml('a: 1\na: 2\n'), /두 번/);
  assert.throws(() => parseYaml('a:\n    b: 1\n  c: 2\n'), /어긋남/);
  assert.throws(() => parseYaml('a: "x\n'), /따옴표/);
});

// ── 파일 ──────────────────────────────────────────────────────────────────────

function yamlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'out' ? [] : yamlFiles(p);
    return /\.ya?ml$/.test(e.name) ? [p] : [];
  });
}

const rel = (p) => path.relative(ROOT, p);
const all = yamlFiles(MAESTRO);
const isConfig = (p) => path.basename(p) === 'config.yaml';
const flowFiles = all.filter((p) => !isConfig(p));
const topFlows = (dir) => flowFiles.filter((p) => path.dirname(p) === path.join(MAESTRO, dir)).sort();
const parsed = new Map(all.map((p) => [p, parseYaml(read(p))]));

test('흐름 파일이 있다 — 폰·아이패드·공용 조각', () => {
  assert.deepEqual(topFlows('phone').map((p) => path.basename(p)), [
    '01-onboarding.yaml', '02-today-check.yaml', '03-cell-edit.yaml', '04-focus.yaml', '05-language.yaml',
    '06-reminders.yaml', '07-pro-sheet.yaml', '08-year-close.yaml', '09-deeplink.yaml', '10-print-sheet.yaml',
    '11-full-grid.yaml', '12-backup.yaml',
  ]);
  assert.deepEqual(topFlows('ipad').map((p) => path.basename(p)), ['01-spread.yaml', '02-sheet-width.yaml']);
  for (const p of flowFiles) assert.ok(/^(phone|ipad|common)$/.test(path.basename(path.dirname(p))), rel(p));
});

test('config.yaml — 흐름 폴더를 가리킨다', () => {
  const top = parsed.get(path.join(MAESTRO, 'config.yaml'))[0];
  assert.deepEqual(top.flows, ['phone/*', 'ipad/*']);
  for (const d of ['phone', 'ipad']) {
    const c = parsed.get(path.join(MAESTRO, d, 'config.yaml'))[0];
    assert.deepEqual(c.flows, ['*']);
    assert.equal(c.executionOrder.continueOnFailure, true);
  }
});

// ── Maestro 명령 ──────────────────────────────────────────────────────────────

// Maestro 문서(Commands)에 있는 명령. 값 없이 쓸 수 있는 것은 BARE에도 있다.
const COMMANDS = new Set([
  'launchApp', 'stopApp', 'killApp', 'clearState', 'clearKeychain',
  'tapOn', 'doubleTapOn', 'longPressOn', 'inputText', 'inputRandomText', 'inputRandomNumber', 'inputRandomEmail',
  'inputRandomPersonName', 'eraseText', 'copyTextFrom', 'pasteText', 'setClipboard',
  'assertVisible', 'assertNotVisible', 'assertTrue', 'assertWithAI', 'assertNoDefectsWithAI', 'extractTextWithAI',
  'scroll', 'scrollUntilVisible', 'swipe', 'back', 'hideKeyboard', 'pressKey', 'openLink',
  'runFlow', 'runScript', 'evalScript', 'extendedWaitUntil', 'waitForAnimationToEnd',
  'takeScreenshot', 'startRecording', 'stopRecording', 'repeat', 'retry',
  'setLocation', 'travel', 'addMedia', 'setAirplaneMode', 'toggleAirplaneMode', 'setOrientation', 'setPermissions',
]);
const BARE = new Set([
  'launchApp', 'stopApp', 'killApp', 'clearState', 'clearKeychain', 'back', 'hideKeyboard', 'scroll',
  'pasteText', 'waitForAnimationToEnd', 'inputRandomText', 'inputRandomNumber', 'inputRandomEmail',
  'inputRandomPersonName', 'assertNoDefectsWithAI', 'toggleAirplaneMode',
]);
const SELECTOR_KEYS = new Set([
  'id', 'text', 'index', 'checked', 'selected', 'enabled', 'focused', 'optional', 'label', 'point',
  'below', 'above', 'leftOf', 'rightOf', 'childOf', 'containsChild', 'containsDescendants', 'width', 'height',
  'tolerance', 'retryTapIfNoChange', 'waitToSettleTimeoutMs', 'repeat', 'delay', 'css',
]);
const HEADER_KEYS = new Set(['appId', 'name', 'tags', 'env', 'onFlowStart', 'onFlowComplete', 'jsEngine']);
const ORIENTATIONS = new Set(['PORTRAIT', 'LANDSCAPE_LEFT', 'LANDSCAPE_RIGHT', 'UPSIDE_DOWN']);
const DIRECTIONS = new Set(['UP', 'DOWN', 'LEFT', 'RIGHT']);

/** 흐름의 명령을 모두(runFlow·repeat·retry 안까지) 차례로 돈다 */
function walk(commands, file, visit) {
  assert.ok(Array.isArray(commands), `${rel(file)}: 명령 목록이 배열이 아니다`);
  for (const c of commands) {
    if (typeof c === 'string') {
      assert.ok(BARE.has(c), `${rel(file)}: 값 없이 못 쓰는 명령 ${c}`);
      visit(c, null);
      continue;
    }
    assert.ok(c && typeof c === 'object' && !Array.isArray(c), `${rel(file)}: 명령 꼴이 아니다 ${JSON.stringify(c)}`);
    const keys = Object.keys(c);
    assert.equal(keys.length, 1, `${rel(file)}: 명령 하나에 키 하나 ${JSON.stringify(keys)}`);
    const [name] = keys;
    assert.ok(COMMANDS.has(name), `${rel(file)}: Maestro에 없는 명령 ${name}`);
    const v = c[name];
    visit(name, v);
    if ((name === 'runFlow' || name === 'repeat' || name === 'retry') && v && typeof v === 'object' && v.commands) {
      walk(v.commands, file, visit);
    }
  }
}

function checkSelector(sel, where) {
  assert.ok(sel && typeof sel === 'object', `${where}: 고르개가 없다`);
  for (const k of Object.keys(sel)) assert.ok(SELECTOR_KEYS.has(k), `${where}: 모르는 고르개 키 ${k}`);
  assert.ok(sel.id != null || sel.text != null || sel.point != null, `${where}: id·text·point 중 하나는 있어야 한다`);
}

/** 명령마다 받는 값의 꼴 */
function checkCommand(name, v, where) {
  switch (name) {
    case 'tapOn': case 'doubleTapOn': case 'longPressOn': case 'assertVisible': case 'assertNotVisible': case 'copyTextFrom':
      if (typeof v === 'string') return;
      checkSelector(v, `${where} ${name}`);
      return;
    case 'extendedWaitUntil':
      assert.ok(v.visible || v.notVisible, `${where}: extendedWaitUntil에 visible/notVisible`);
      for (const k of Object.keys(v)) assert.ok(['visible', 'notVisible', 'timeout', 'optional', 'label'].includes(k), `${where}: ${k}`);
      checkSelector(v.visible || v.notVisible, `${where} extendedWaitUntil`);
      assert.equal(typeof v.timeout, 'number', `${where}: extendedWaitUntil timeout(ms)`);
      return;
    case 'scrollUntilVisible':
      checkSelector(v.element, `${where} scrollUntilVisible`);
      for (const k of Object.keys(v)) assert.ok(['element', 'direction', 'timeout', 'speed', 'visibilityPercentage', 'centerElement', 'optional', 'label'].includes(k), `${where}: ${k}`);
      if (v.direction) assert.ok(DIRECTIONS.has(v.direction), `${where}: direction ${v.direction}`);
      return;
    case 'swipe':
      assert.ok(v.direction || (v.start && v.end), `${where}: swipe에 direction 또는 start/end`);
      if (v.direction) assert.ok(DIRECTIONS.has(v.direction), `${where}: direction ${v.direction}`);
      if (v.from) checkSelector(v.from, `${where} swipe.from`);
      return;
    case 'runFlow': {
      const file = typeof v === 'string' ? v : v.file;
      if (typeof v === 'object') {
        for (const k of Object.keys(v)) assert.ok(['file', 'when', 'commands', 'env', 'label', 'optional'].includes(k), `${where}: runFlow ${k}`);
        assert.ok(v.file || v.commands, `${where}: runFlow에 file 또는 commands`);
        if (v.when) {
          for (const k of Object.keys(v.when)) assert.ok(['visible', 'notVisible', 'true', 'platform'].includes(k), `${where}: when ${k}`);
          if (v.when.visible) checkSelector(v.when.visible, `${where} when.visible`);
          if (v.when.notVisible) checkSelector(v.when.notVisible, `${where} when.notVisible`);
        }
      }
      return file;
    }
    case 'repeat':
      assert.ok(Array.isArray(v.commands), `${where}: repeat에 commands`);
      assert.ok(v.times != null || v.while, `${where}: repeat에 times 또는 while`);
      if (v.while?.visible) checkSelector(v.while.visible, `${where} repeat.while`);
      if (v.while?.notVisible) checkSelector(v.while.notVisible, `${where} repeat.while`);
      return;
    case 'waitForAnimationToEnd':
      if (v) assert.equal(typeof v.timeout, 'number', `${where}: waitForAnimationToEnd timeout`);
      return;
    case 'eraseText':
      assert.equal(typeof v, 'number', `${where}: eraseText 글자 수`);
      return;
    case 'inputText': case 'openLink': case 'takeScreenshot':
      assert.ok(typeof v === 'string' || (v && typeof v === 'object'), `${where}: ${name} 값`);
      return;
    case 'setOrientation':
      assert.ok(ORIENTATIONS.has(v), `${where}: setOrientation ${v}`);
      return;
    case 'launchApp':
      if (v) for (const k of Object.keys(v)) assert.ok(['appId', 'clearState', 'clearKeychain', 'stopApp', 'permissions', 'arguments', 'label', 'optional'].includes(k), `${where}: launchApp ${k}`);
      return;
    default:
  }
}

test('흐름: 머리(appId = 번들 id) + 명령 목록, 명령과 고르개 키는 Maestro 것', () => {
  assert.equal(app.ios.bundleIdentifier, 'com.jcncompany.mandarat');
  for (const f of flowFiles) {
    const docs = parsed.get(f);
    assert.equal(docs.length, 2, `${rel(f)}: 머리와 명령, 두 문서`);
    const [head, commands] = docs;
    assert.equal(head.appId, app.ios.bundleIdentifier, rel(f));
    for (const k of Object.keys(head)) assert.ok(HEADER_KEYS.has(k), `${rel(f)}: 머리 키 ${k}`);
    assert.ok(commands.length > 0, rel(f));
    walk(commands, f, (name, v) => {
      const sub = checkCommand(name, v, rel(f));
      if (sub) assert.ok(fs.existsSync(path.resolve(path.dirname(f), sub)), `${rel(f)}: runFlow 파일이 없다 ${sub}`);
    });
  }
});

test('폰·아이패드 흐름은 앱을 지우고 한국어로 띄우며 시작한다', () => {
  for (const f of [...topFlows('phone'), ...topFlows('ipad')]) {
    const [head, commands] = parsed.get(f);
    assert.ok(Array.isArray(head.tags) && head.tags.includes(path.basename(path.dirname(f))), `${rel(f)}: tags`);
    assert.deepEqual(commands[0], {
      launchApp: { clearState: true, arguments: { '-AppleLanguages': '(ko)', '-AppleLocale': 'ko_KR' } },
    }, rel(f));
    assert.deepEqual(commands[1], { runFlow: '../common/onboard.yaml' }, `${rel(f)}: 시작하기를 먼저 끝낸다`);
  }
  // 공용 조각은 앱을 다시 띄우지 않는다(부른 흐름의 상태를 이어 쓴다)
  for (const f of topFlows('common')) {
    walk(parsed.get(f)[1], f, (name) => assert.notEqual(name, 'launchApp', rel(f)));
  }
});

// ── testID ───────────────────────────────────────────────────────────────────

// 레지스트리 밖의 id — 공용 Sheet 손잡이(common.tsx). V5-B가 TID로 옮겨도 이름은 그대로다.
const EXTRA_IDS = new Set(['sheet-handle']);

const STATIC_IDS = new Set(Object.values(TID).filter((v) => typeof v === 'string'));
const ID_PREFIXES = Object.values(TID).filter((v) => typeof v === 'function').map((f) => {
  const sample = f(...Array.from({ length: f.length }, (_, k) => `\u0000${k}`));
  return sample.slice(0, sample.indexOf('\u0000'));
});

/** 흐름의 id 하나(정규식 · |로 여럿)가 레지스트리 이름인가 */
function idProblems(id) {
  return id.split('|').filter((part) => {
    if (STATIC_IDS.has(part) || EXTRA_IDS.has(part)) return false;
    // 함수 id: 앞부분이 레지스트리와 같고 나머지는 글자·숫자·-·.* 만
    return !ID_PREFIXES.some((pre) => pre && part.startsWith(pre) && /^([A-Za-z0-9-]|\.\*)+$/.test(part.slice(pre.length)));
  });
}

function idsOf(file) {
  const ids = [];
  const grab = (o) => {
    if (Array.isArray(o)) { o.forEach(grab); return; }
    if (!o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      if (k === 'id' && typeof v === 'string') ids.push(v);
      else grab(v);
    }
  };
  grab(parsed.get(file)[1]);
  return ids;
}

test('흐름의 id:는 모두 TID 레지스트리에 있다', () => {
  assert.ok(ID_PREFIXES.includes('today-row-') && ID_PREFIXES.includes('grid-cell-'), '함수 id의 앞부분을 읽었다');
  const used = new Set();
  for (const f of flowFiles) {
    for (const id of idsOf(f)) {
      used.add(id);
      assert.deepEqual(idProblems(id), [], `${rel(f)}: 레지스트리에 없는 id ${id}`);
    }
  }
  assert.ok(used.size >= 30, `흐름이 id로 찾는다 (${used.size})`);
  // 함수 id에 넣은 값도 앱의 실제 값이다
  const TABS = ['dashboard', 'grid', 'today', 'stats'];
  for (const id of used) {
    const tab = id.match(/^tab-(.+)$/);
    if (tab && id !== TID.tabAdd) assert.ok(TABS.includes(tab[1]), id);
    const lang = id.match(/^set-lang-(.+)$/);
    if (lang) assert.ok(['system', 'ko', 'ja', 'en'].includes(lang[1]), id);
    const notify = id.match(/^set-notify-(.+)$/);
    if (notify && id !== TID.setNotifyDevice) assert.ok(/^(morning|evening|review)(-time)?$/.test(notify[1]), id);
    const cell = id.match(/^grid-cell-(\d)-(\d)$/);
    if (cell) assert.ok(+cell[1] <= 7 && +cell[2] <= 7, id);
  }
});

test('id 검사는 틀린 이름을 잡는다', () => {
  assert.deepEqual(idProblems('today-row-.*'), []);
  assert.deepEqual(idProblems('year-close-start|tab-grid'), []);
  assert.deepEqual(idProblems('today-rows'), ['today-rows']);
  assert.deepEqual(idProblems('pro-buyy'), ['pro-buyy']);
});

test('샌드박스에서도 안전하다 — 결제·복원·AirPrint·초기화를 누르지 않는다', () => {
  const NEVER_TAP = [TID.proBuy, TID.proRestore, TID.printGo, TID.printPdf, TID.setRestore];
  for (const f of flowFiles) {
    walk(parsed.get(f)[1], f, (name, v) => {
      if (!['tapOn', 'doubleTapOn', 'longPressOn'].includes(name) || !v || typeof v !== 'object') return;
      if (v.id) for (const n of NEVER_TAP) assert.ok(!new RegExp(`^(${v.id})$`).test(n), `${rel(f)}: ${n}을 누른다`);
      if (v.text) assert.doesNotMatch(v.text, /구매|구입|Buy|Purchase|복원|Restore|지우기|Delete/, `${rel(f)}: ${v.text}`);
    });
  }
  const pro = JSON.stringify(parsed.get(path.join(MAESTRO, 'phone', '07-pro-sheet.yaml'))[1]);
  assert.match(pro, /"assertVisible":\{"id":"pro-buy"\}/);
});

// ── EAS 워크플로 ─────────────────────────────────────────────────────────────

// @expo/build-tools 25.1.1 dist/steps/functions에서 확인한 함수와 입력
const EAS_STEPS = {
  'eas/checkout': [],
  'eas/download_build': ['build_id', 'application_archive_url', 'extensions'],
  'eas/start_ios_simulator': ['device_identifier', 'count', 'enable_accessibility_settings'],
  'eas/install_maestro': ['maestro_version', 'backend'],
  'eas/install_build': ['artifact_path'],
  'eas/maestro_tests': ['flow_path', 'retries', 'retry_failed_only', 'shards', 'include_tags', 'exclude_tags', 'output_format', 'platform', 'android_connection_mode', 'backend'],
};

test('워크플로: build(e2e) → iPhone(maestro 작업) · iPad(직접 적은 단계)', () => {
  const docs = parseYaml(read(WORKFLOW));
  assert.equal(docs.length, 1);
  const wf = docs[0];
  assert.equal(typeof wf.name, 'string');
  const { build, iphone, ipad } = wf.jobs;
  assert.deepEqual(Object.keys(wf.jobs), ['build', 'iphone', 'ipad']);

  assert.equal(build.type, 'build');
  assert.deepEqual(build.params, { platform: 'ios', profile: 'e2e' });
  const e2e = eas.build[build.params.profile];
  assert.ok(e2e, 'eas.json에 e2e 프로필이 있다');
  assert.equal(e2e.ios.simulator, true, '시뮬레이터 빌드');
  assert.equal(e2e.env.EXPO_PUBLIC_E2E, '1', 'useReducedMotion이 읽는 값');

  assert.equal(iphone.type, 'maestro');
  assert.deepEqual(iphone.needs, ['build']);
  assert.equal(iphone.params.build_id, '${{ needs.build.outputs.build_id }}');
  assert.deepEqual(iphone.params.flow_path, ['.maestro/phone']);

  assert.deepEqual(ipad.needs, ['build']);
  assert.equal(ipad.type, undefined, '직접 적은 단계 작업');
  assert.match(ipad.runs_on, /^macos-/);
  const uses = ipad.steps.map((s) => s.uses);
  assert.deepEqual(uses, ['eas/checkout', 'eas/download_build', 'eas/start_ios_simulator', 'eas/install_maestro', 'eas/install_build', 'eas/maestro_tests']);
  const ids = new Set(ipad.steps.map((s) => s.id).filter(Boolean));
  for (const s of ipad.steps) {
    assert.ok(EAS_STEPS[s.uses], `알려진 단계 ${s.uses}`);
    for (const k of Object.keys(s.with ?? {})) assert.ok(EAS_STEPS[s.uses].includes(k), `${s.uses}: 입력 ${k}`);
    for (const k of Object.keys(s)) assert.ok(['uses', 'with', 'id', 'name', 'if', 'env'].includes(k), `${s.uses}: ${k}`);
    for (const v of Object.values(s.with ?? {})) {
      for (const m of String(v).matchAll(/\$\{\{\s*steps\.([a-z_]+)\.outputs\.([a-z_]+)\s*\}\}/g)) assert.ok(ids.has(m[1]), `단계 id ${m[1]}`);
    }
  }
  const by = Object.fromEntries(ipad.steps.map((s) => [s.uses, s.with ?? {}]));
  assert.equal(by['eas/download_build'].build_id, '${{ needs.build.outputs.build_id }}');
  assert.deepEqual(by['eas/download_build'].extensions, ['app']);
  assert.equal(by['eas/start_ios_simulator'].device_identifier, 'iPad Pro 13-inch (M4)');
  assert.equal(by['eas/install_build'].artifact_path, '${{ steps.download.outputs.artifact_path }}');
  assert.deepEqual(by['eas/maestro_tests'].flow_path, ['.maestro/ipad']);
  assert.equal(by['eas/maestro_tests'].platform, 'ios');

  for (const p of [...iphone.params.flow_path, ...by['eas/maestro_tests'].flow_path]) {
    assert.ok(fs.statSync(path.join(ROOT, p)).isDirectory(), p);
  }
});

test('Maestro 결과 폴더는 커밋하지 않는다', () => {
  assert.match(read(path.join(ROOT, '.gitignore')), /^\/\.maestro\/out$/m);
});
