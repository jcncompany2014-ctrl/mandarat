// V2-A — 알림 화면(설정 › 알림 · 편집 창의 습관 알림 · 시각 고르기). 화면은 소스로, 시각 계산은 그대로 돌려 본다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const NOTIFY = 'src/screens/settings/NotifySection.tsx';
const EDITOR = 'src/overlays/CellEditor.tsx';
const REMIND = 'src/components/RemindRow.tsx';

/** 주석을 뺀 소스(주석 속 낱말에 걸리지 않게) */
const code = (f) => src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

function srcFiles() {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) out.push(path.relative(ROOT, p).split(path.sep).join('/'));
    }
  };
  walk(path.join(ROOT, 'src'));
  return out;
}

/** RemindRow.tsx의 순수 시각 함수만 떼어 Node에서 돌린다(React Native를 불러오지 않게) */
function timeFns() {
  const s = src(REMIND);
  const body = s.slice(s.indexOf('export const REMIND_STEP'), s.indexOf('export function RemindRow'));
  const js = ts.transpileModule(body, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', js)(mod, mod.exports);
  return mod.exports;
}

test('설정 › 알림은 바구니 글(m.notify · m.common · m.fmt)만 쓴다 — 한글 글자 없음', () => {
  const s = code(NOTIFY);
  assert.doesNotMatch(s, /[가-힣]/);
  const used = new Set([...s.matchAll(/\bt\.([a-z]+)\./g)].map((m) => m[1]));
  assert.deepEqual([...used].sort(), ['common', 'fmt', 'notify']);
  for (const k of ['sectionTitle', 'morning', 'morningSub', 'evening', 'eveningSub', 'reviewTitle', 'reviewSub', 'habitNote', 'deviceAlso', 'denied', 'undetermined', 'allow']) {
    assert.ok(s.includes(`t.notify.${k}`), k);
  }
  // 웹 · 알림 없는 기기는 안내 한 줄
  assert.match(s, /if \(!notifier\.supported\)[\s\S]{0,200}<RuledNotice M=\{M\} title=\{t\.common\.iosOnly\} \/>/);
  // 편집 창 · 시각 줄도 한글 글자를 늘리지 않는다
  assert.doesNotMatch(code(REMIND), /[가-힣]/);
  const ed = code(EDITOR);
  const rows = ed.slice(ed.indexOf('function RemindRows('), ed.indexOf('function ChoiceRow('));
  assert.doesNotMatch(rows, /[가-힣]/);
});

test('처음 켤 때는 아침 08:00 · 저녁 21:00, 돌아보기는 일요일 REVIEW_HOUR', () => {
  const s = code(NOTIFY);
  assert.match(s, /DEFAULT_TIME: Record<TimedKind, string> = \{ morning: '08:00', evening: '21:00' \}/);
  assert.match(s, /t\.fmt\.dowLong\(\{ i: 0 \}\), time: t\.fmt\.time\(\{ h: REVIEW_HOUR, m: 0 \}\)/);
  // 켠 줄 아래에만 시각 고르기
  assert.match(s, /\{on && k !== 'review' && timeLabel && \(/);
  assert.match(s, /<RemindRow M=\{M\} value=\{rem\[k\] as string\}/);
});

test('거절되면 켜지 않고 설정 열기(Linking.openSettings)를 보인다', () => {
  for (const f of [NOTIFY, EDITOR]) {
    const s = code(f);
    assert.match(s, /Linking\.openSettings\(\)/, f);
    assert.match(s, /t\.notify\.denied/, f);
  }
  const s = code(NOTIFY);
  // 허락을 받았을 때만 저장한다
  assert.match(s, /void allowFromPress\(\)\.then\(\(ok\) => \{\s*if \(!ok\) return;\s*save\(/);
  assert.match(s, /if \(s === 'granted'\) \{\s*setRefused\(false\);\s*await writeNotifyDevice\(true\);\s*return true;/);
  assert.match(s, /action=\{\{ label: t\.common\.openSettings, onPress: \(\) => \{ void Linking\.openSettings\(\); \} \}\}/);
});

test('requestPermissionsAsync는 notifier.native.ts에만 있다', () => {
  for (const f of srcFiles()) {
    if (f === 'src/lib/notifier.native.ts') continue;
    assert.doesNotMatch(src(f), /requestPermissionsAsync/, f);
  }
});

test('notifier.request(는 설정 › 알림과 편집 창의 누름 처리에만 있다(저절로 묻지 않는다)', () => {
  const where = srcFiles().filter((f) => /notifier\.request\(/.test(code(f))).sort();
  assert.deepEqual(where, [EDITOR, NOTIFY]);
  const handlers = { [NOTIFY]: 'allowFromPress', [EDITOR]: 'onPickTime' };
  for (const f of where) {
    const s = code(f);
    const name = handlers[f];
    const at = s.indexOf('notifier.request(');
    assert.equal(s.indexOf('notifier.request(', at + 1), -1, `${f}: 한 곳에서만 묻는다`);
    const decl = s.lastIndexOf(`const ${name} = async`, at);
    assert.ok(decl >= 0, `${f}: ${name} 안에서 묻는다`);
    // 묻는 함수는 효과(useEffect) 안에 있지 않다
    const effect = s.lastIndexOf('useEffect(', at);
    assert.ok(effect < decl || s.slice(effect, at).includes('}, ['), `${f}: useEffect 안에서 묻지 않는다`);
    // 그리고 누름에서만 불린다
    const calls = [...s.matchAll(new RegExp(`\\b${name}\\(`, 'g'))].map((m) => m.index).filter((i) => i !== decl + 6);
    assert.ok(calls.length > 0, `${f}: ${name}을 부르는 곳`);
  }
  const n = code(NOTIFY);
  assert.match(n, /onPress=\{\(\) => onToggle\(k\)\}/);
  assert.match(n, /onPress=\{onDevice\}/);
  assert.match(n, /onPress: onAllow/);
  for (const fn of ['onToggle', 'onDevice', 'onAllow']) {
    const body = n.slice(n.indexOf(`const ${fn} = `), n.indexOf(`const ${fn} = `) + 500);
    assert.match(body, /allowFromPress\(\)/, fn);
  }
  assert.match(code(EDITOR), /onPress=\{\(\) => \{ void onPickTime\(\); \}\}/);
  // 상태는 읽기만 하는 효과
  assert.match(n, /useEffect\(\(\) => \{\s*let live = true;\s*notifier\.status\(\)/);
});

test('편집 창: 습관 줄에 알림(없음 / 시각 정하기 — 괘선 고르기)과 RemindRow', () => {
  const s = code(EDITOR);
  const habit = s.slice(s.indexOf('function HabitRows('), s.indexOf('function RemindRows('));
  assert.match(habit, /<RemindRows M=\{M\} cfg=\{cfg\} setCfg=\{setCfg\} onReveal=\{onReveal\} \/>/);
  const rows = s.slice(s.indexOf('function RemindRows('), s.indexOf('function ChoiceRow('));
  assert.match(rows, /<RemindRow M=\{M\} value=\{cfg\.remindAt\}/);
  assert.match(rows, /testID=\{TID\.editorRemind\}/);
  assert.match(rows, /accessibilityRole="radiogroup"/);
  assert.match(rows, /t\.notify\.editorNone/);
  assert.match(rows, /t\.notify\.editorPick/);
  // 칩이 아니라 괘선 줄
  assert.doesNotMatch(rows, /PaperChip|SegmentedControl/);
  assert.match(s.slice(s.indexOf('function ChoiceRow(')), /accessibilityRole="radio"/);
  // 습관 유형에서만 그린다
  assert.match(s, /\{cfg\.kind === 'habit' && <HabitRows /);
});

test('remindAt은 편집 창의 설정(cfg)을 거쳐 setActionConfig로 저장된다', () => {
  const s = code(EDITOR);
  const rows = s.slice(s.indexOf('function RemindRows('), s.indexOf('function ChoiceRow('));
  assert.match(rows, /setCfg\(\(c\) => \(\{ \.\.\.c, remindAt: last\.current \}\)\)/);
  assert.match(rows, /setCfg\(\(c\) => \(\{ \.\.\.c, remindAt: v \}\)\)/);
  assert.match(rows, /setCfg\(\(c\) => \(\{ \.\.\.c, remindAt: undefined \}\)\)/);
  assert.match(s, /setActionConfig\(editor\.ti, editor\.ai, cfg\);/);
  // 저장 경로가 remindAt을 지키고(습관), 없애면 지운다
  const { applyConfig, configOf, sameConfig } = require('../src/lib/kinds');
  const a = { text: '물 마시기', done: false, kind: 'habit', days: [1, 3] };
  const on = applyConfig(a, { ...configOf(a), remindAt: '07:30' });
  assert.equal(on.remindAt, '07:30');
  const off = applyConfig(on, { ...configOf(on), remindAt: undefined });
  assert.ok(!('remindAt' in off));
  // 시각만 바꿔도 '고친 것'으로 본다(닫을 때 묻는다)
  assert.equal(sameConfig({ ...configOf(a), remindAt: '07:30' }, configOf(a)), false);
});

test('RemindRow: 10분씩, 자정을 넘으면 돌아간다 · 조절 가능한 한 줄', () => {
  const { stepTime, timeToMin, minToTime, REMIND_STEP } = timeFns();
  assert.equal(REMIND_STEP, 10);
  assert.equal(stepTime('08:00', 1), '08:10');
  assert.equal(stepTime('08:00', -1), '07:50');
  assert.equal(stepTime('23:50', 1), '00:00');
  assert.equal(stepTime('00:00', -1), '23:50');
  assert.equal(stepTime('21:05', 1), '21:15');
  assert.equal(timeToMin('nope'), 0);
  assert.equal(minToTime(-10), '23:50');
  const s = code(REMIND);
  assert.match(s, /accessibilityRole="adjustable"/);
  assert.match(s, /accessibilityActions=\{\[\{ name: 'increment' \}, \{ name: 'decrement' \}\]\}/);
  assert.match(s, /t\.fmt\.time\(\{ h: Math\.floor\(n \/ 60\), m: n % 60 \}\)/);
  assert.match(s, /accessibilityValue=\{\{ text: shown \}\}/);
  assert.match(s, /width: 44, height: 44/);
});

test('testID: 설정 줄 · 이 기기 줄 · 편집 창 시각', () => {
  const n = code(NOTIFY);
  assert.match(n, /testID=\{TID\.setNotify\(k\)\}/);
  assert.match(n, /testID=\{TID\.setNotifyDevice\}/);
  assert.match(code(EDITOR), /TID\.editorRemind/);
});

test('종이 수첩 규칙 — 맡은 파일에 둥근 카드 · 그림자 · 그라데이션 · 이모지가 없다', () => {
  for (const f of [NOTIFY, REMIND]) {
    const s = code(f);
    for (const m of s.matchAll(/borderRadius:\s*(\d+)/g)) assert.ok(Number(m[1]) < 14, `${f}: borderRadius ${m[1]}`);
    assert.doesNotMatch(s, /shadow\(|LinearGradient|rgba\(0,0,0,0\.04\)/, f);
    assert.doesNotMatch(s, /\p{Extended_Pictographic}/u, f);
  }
  for (const l of ['ko', 'ja', 'en']) assert.doesNotMatch(src(`src/i18n/${l}/notify.ts`), /\p{Extended_Pictographic}/u, l);
});
