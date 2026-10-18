// 위젯·Siri 체크 들이기(src/lib/widgetOps.ts)와 손잡이(src/hosts/WidgetSync.tsx)의 읽고 나서 쓰기.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { blankDoc } = require('../src/data/defaults');
const { planOps, opId } = require('../src/lib/widgetOps');
const { toggleDayLog } = require('../src/lib/routine');
const { addCount, toggleCountToday } = require('../src/lib/kinds');

// 2026-10-14 수요일
const NOW = new Date(2026, 9, 14, 9, 30);
const TK = '2026-10-14';

function doc() {
  const d = blankDoc();
  const a = d.themes[0].actions;
  a[0] = { text: '보고서 내기', note: '', done: false, kind: 'once' };
  a[1] = { text: '걷기', note: '', done: false, kind: 'habit', days: [0, 1, 2, 3, 4, 5, 6], since: '2026-10-10' };
  a[2] = { text: '물 마시기', note: '', done: false, kind: 'count', target: 8 };
  a[3] = { text: '차분하게', note: '', done: false, kind: 'mind' };
  return {
    ...d, onboarded: true, todayDate: TK, todayKeys: ['0-0', '0-2'],
    todayExtra: [{ id: 'e1', ti: 3, text: '전화', done: false }, { id: 'e2', ti: 3, text: '장보기', done: true }],
  };
}
let at = 1000;
const op = (k, on, o = {}) => ({ kind: 'check', k, on, day: TK, at: at++, t: 'x', src: 'widget', ...o });

test('같은 칸을 여러 번 누르면 마지막 것만 — 같은 (k, at)은 한 번', () => {
  const d = doc();
  const a = op('0-0', true, { at: 10 });
  // 켬 → 끔 → 켬: 마지막이 켬
  assert.deepEqual(planOps([a, a, op('0-0', false, { at: 11 }), op('0-0', true, { at: 12 })], d, NOW), [{ kind: 'checkToday', ti: 0, ai: 0 }]);
  // 켬 → 끔: 지금과 같아 아무것도
  assert.deepEqual(planOps([op('0-0', true, { at: 20 }), op('0-0', false, { at: 21 })], d, NOW), []);
  // 시각이 뒤섞여 들어와도 at 순으로
  assert.deepEqual(planOps([op('0-0', false, { at: 31 }), op('0-0', true, { at: 30 })], d, NOW), []);
});

test('지금 모습과 같은 op는 아무것도 내지 않는다', () => {
  const d = doc();
  assert.deepEqual(planOps([op('0-0', false), op('x:e2', true), op('x:e1', false), op('0-1', false), op('0-2', false)], d, NOW), []);
});

test('한 번 · 쌓기 · 오늘의 습관은 checkToday, 직접 추가한 할 일은 toggleExtra', () => {
  const d = doc();
  assert.deepEqual(planOps([op('0-2', true), op('0-1', true), op('x:e1', true), op('0-0', true)], d, NOW), [
    { kind: 'checkToday', ti: 0, ai: 2 },
    { kind: 'checkToday', ti: 0, ai: 1 },
    { kind: 'toggleExtra', id: 'e1' },
    { kind: 'checkToday', ti: 0, ai: 0 },
  ]);
  // 쌓기를 오늘 했으면 끔이 checkToday(오늘 것 되돌리기)
  const counted = toggleCountToday(d, 0, 2, TK);
  assert.deepEqual(planOps([op('0-2', false)], counted, NOW), [{ kind: 'checkToday', ti: 0, ai: 2 }]);
  assert.deepEqual(planOps([op('0-2', true)], counted, NOW), []);
  // 마음가짐은 체크하지 않는다
  assert.deepEqual(planOps([op('0-3', true)], d, NOW), []);
});

test('지난 날의 습관은 toggleHabitOn — 습관을 정한 날 전 · 앞날은 버린다', () => {
  const d = doc();
  assert.deepEqual(planOps([op('0-1', true, { day: '2026-10-12' })], d, NOW), [{ kind: 'toggleHabitOn', ti: 0, ai: 1, day: '2026-10-12' }]);
  // 이미 그날 했으면
  const logged = { ...d, dayLog: toggleDayLog(d.dayLog, '0-1', '2026-10-12') };
  assert.deepEqual(planOps([op('0-1', true, { day: '2026-10-12' })], logged, NOW), []);
  assert.deepEqual(planOps([op('0-1', false, { day: '2026-10-12' })], logged, NOW), [{ kind: 'toggleHabitOn', ti: 0, ai: 1, day: '2026-10-12' }]);
  // since(10-10) 전, 앞날, 날짜가 아닌 것
  assert.deepEqual(planOps([op('0-1', true, { day: '2026-10-09' }), op('0-1', true, { day: '2026-10-15' }), op('0-1', true, { day: 'yesterday' })], d, NOW), []);
  // 같은 습관의 오늘과 지난 날은 따로
  assert.deepEqual(planOps([op('0-1', true, { day: '2026-10-13' }), op('0-1', true)], d, NOW), [
    { kind: 'toggleHabitOn', ti: 0, ai: 1, day: '2026-10-13' },
    { kind: 'checkToday', ti: 0, ai: 1 },
  ]);
});

// R-1 F3: 앱을 다음 날 열어도 위젯이 한 것으로 그려 보인 체크를 버리지 않는다(예전에는 버렸다 — 그 규칙을 바꾼 것)
test('지난 날(7일 안)의 한 번은 달성 — 날에 묶이지 않고, 칸마다 가장 늦은 것만', () => {
  const d = doc();
  assert.deepEqual(planOps([op('0-0', true, { day: '2026-10-13' })], d, NOW), [{ kind: 'checkToday', ti: 0, ai: 0 }]);
  assert.deepEqual(planOps([op('0-0', true, { day: '2026-10-07' })], d, NOW), [{ kind: 'checkToday', ti: 0, ai: 0 }]);
  // 7일 밖 · 이미 달성 · 끔인데 안 한 것
  assert.deepEqual(planOps([op('0-0', true, { day: '2026-10-06' })], d, NOW), []);
  const done = { ...d, themes: d.themes.map((t, i) => (i === 0 ? { ...t, actions: t.actions.map((a, j) => (j === 0 ? { ...a, done: true } : a)) } : t)) };
  assert.deepEqual(planOps([op('0-0', true, { day: '2026-10-13' })], done, NOW), []);
  assert.deepEqual(planOps([op('0-0', false, { day: '2026-10-13' })], d, NOW), []);
  assert.deepEqual(planOps([op('0-0', false, { day: '2026-10-13' })], done, NOW), [{ kind: 'checkToday', ti: 0, ai: 0 }]);
  // 어제 켜고 오늘 껐으면 끈 것(지금과 같다), 어제 켜고 오늘 또 켰으면 한 번만
  assert.deepEqual(planOps([op('0-0', true, { day: '2026-10-13', at: 1 }), op('0-0', false, { at: 2 })], d, NOW), []);
  assert.deepEqual(planOps([op('0-0', true, { day: '2026-10-13', at: 1 }), op('0-0', true, { at: 2 })], d, NOW), [{ kind: 'checkToday', ti: 0, ai: 0 }]);
  // 마음가짐은 지난 날에도 체크하지 않는다
  assert.deepEqual(planOps([op('0-3', true, { day: '2026-10-13' })], d, NOW), []);
});

test('지난 날(7일 안)의 직접 추가한 할 일은 아직 오늘 목록에 있을 때만 toggleExtra', () => {
  const d = doc();
  assert.deepEqual(planOps([op('x:e1', true, { day: '2026-10-13' })], d, NOW), [{ kind: 'toggleExtra', id: 'e1' }]);
  assert.deepEqual(planOps([op('x:e1', true, { day: '2026-10-07' })], d, NOW), [{ kind: 'toggleExtra', id: 'e1' }]);
  // 7일 밖 · 날을 넘기며 빠진 것(끝낸 할 일) · 지금과 같은 것
  assert.deepEqual(planOps([op('x:e1', true, { day: '2026-10-06' })], d, NOW), []);
  assert.deepEqual(planOps([op('x:gone', true, { day: '2026-10-13' })], d, NOW), []);
  assert.deepEqual(planOps([op('x:e1', false, { day: '2026-10-13' })], d, NOW), []);
  // 어제 켜고 오늘 껐으면 끈 것
  assert.deepEqual(planOps([op('x:e1', true, { day: '2026-10-13', at: 1 }), op('x:e1', false, { at: 2 })], d, NOW), []);
});

test('지난 날(7일 안)의 쌓기는 그날 기록에 한 번(step) — 켬만, 그날 아직 더한 게 없을 때', () => {
  const d = doc();
  assert.deepEqual(planOps([op('0-2', true, { day: '2026-10-13' })], d, NOW), [{ kind: 'addCountOn', ti: 0, ai: 2, delta: 1, day: '2026-10-13' }]);
  const stepped = { ...d, themes: d.themes.map((t, i) => (i === 0 ? { ...t, actions: t.actions.map((a, j) => (j === 2 ? { ...a, step: 0.5 } : a)) } : t)) };
  assert.deepEqual(planOps([op('0-2', true, { day: '2026-10-07' })], stepped, NOW), [{ kind: 'addCountOn', ti: 0, ai: 2, delta: 0.5, day: '2026-10-07' }]);
  // 7일 밖 · 끔 · 그날 이미 더한 것
  assert.deepEqual(planOps([op('0-2', true, { day: '2026-10-06' })], d, NOW), []);
  assert.deepEqual(planOps([op('0-2', false, { day: '2026-10-13' })], d, NOW), []);
  const counted = addCount(d, 0, 2, 1, '2026-10-13');
  assert.deepEqual(planOps([op('0-2', true, { day: '2026-10-13' })], counted, NOW), []);
  // 오늘 더한 것과는 따로 센다
  assert.deepEqual(planOps([op('0-2', true, { day: '2026-10-13' })], toggleCountToday(d, 0, 2, TK), NOW), [{ kind: 'addCountOn', ti: 0, ai: 2, delta: 1, day: '2026-10-13' }]);
});

test('집중은 글이 있는 칸에만, 열기는 오늘로 — 가장 늦은 하나만', () => {
  const d = doc();
  const f = (k, o = {}) => op(k, true, { kind: 'focus', src: 'siri', ...o });
  assert.deepEqual(planOps([f('0-0')], d, NOW), [{ kind: 'focus', ti: 0, ai: 0 }]);
  // 빈 칸 · 없는 칸 · 직접 추가한 할 일
  assert.deepEqual(planOps([f('5-5')], d, NOW), []);
  assert.deepEqual(planOps([f('9-9')], d, NOW), []);
  assert.deepEqual(planOps([f('x:e1')], d, NOW), []);
  // 두 번 → 늦은 것
  assert.deepEqual(planOps([f('0-0', { at: 1 }), f('0-1', { at: 2 })], d, NOW), [{ kind: 'focus', ti: 0, ai: 1 }]);
  // 어제 것은 버린다
  assert.deepEqual(planOps([f('0-0', { day: '2026-10-13' })], d, NOW), []);
  const o = op('today', true, { kind: 'open' });
  assert.deepEqual(planOps([o], d, NOW), [{ kind: 'open', url: 'mandarat://today' }]);
  // 이미 돌린 것(seen)은 다시 돌리지 않는다
  assert.deepEqual(planOps([o, f('0-0', { at: 5 })], d, NOW, new Set([opId(o), `0-0@5`])), []);
});

test('모르는 열쇠 · 모양이 틀린 op는 버린다', () => {
  const d = doc();
  assert.deepEqual(planOps([
    op('x:none', true), op('0-9', true), op('banana', true), op('5-5', true),
    null, 42, { kind: 'check', k: '0-0' }, { ...op('0-0', true), at: 'soon' }, { ...op('0-0', true), kind: 'delete' },
    { ...op('0-0', true), on: 'yes' }, { ...op('0-0', true), at: NaN },
  ], d, NOW), []);
});

test('Siri와 위젯 op는 시각(at) 순으로 섞인다', () => {
  const d = doc();
  const ops = [
    op('0-0', true, { src: 'siri', at: 300 }),
    op('x:e1', true, { src: 'widget', at: 100 }),
    op('0-2', true, { src: 'siri', at: 200 }),
    op('0-0', false, { src: 'widget', at: 250 }), // 시리(300)가 더 늦다 → 켬
    op('x:e1', false, { src: 'siri', at: 400 }), // 끔이 마지막 → 지금(안 함)과 같다
  ];
  assert.deepEqual(planOps(ops, d, NOW), [
    { kind: 'checkToday', ti: 0, ai: 2 },
    { kind: 'checkToday', ti: 0, ai: 0 },
  ]);
});

test('읽고 나서 쓰기는 몇 번이어도 같다 — 명령을 돌린 문서에 같은 ops를 다시 대면 아무것도', () => {
  // 손잡이가 하는 일을 순수하게: 명령을 문서에 돌린다
  const apply = (d, cmd) => {
    if (cmd.kind === 'toggleExtra') return { ...d, todayExtra: d.todayExtra.map((x) => (x.id === cmd.id ? { ...x, done: !x.done } : x)) };
    if (cmd.kind === 'toggleHabitOn') return { ...d, dayLog: toggleDayLog(d.dayLog, `${cmd.ti}-${cmd.ai}`, cmd.day) };
    if (cmd.kind === 'addCountOn') return addCount(d, cmd.ti, cmd.ai, cmd.delta, cmd.day);
    const a = d.themes[cmd.ti].actions[cmd.ai];
    if (a.kind === 'habit') return { ...d, dayLog: toggleDayLog(d.dayLog, `${cmd.ti}-${cmd.ai}`, TK) };
    if (a.kind === 'count') return toggleCountToday(d, cmd.ti, cmd.ai, TK);
    return { ...d, themes: d.themes.map((t, i) => (i === cmd.ti ? { ...t, actions: t.actions.map((x, j) => (j === cmd.ai ? { ...x, done: !x.done } : x)) } : t)) };
  };
  const ops = [op('0-0', true), op('0-1', true), op('0-2', true), op('x:e1', true), op('0-1', true, { day: '2026-10-12' })];
  let d = doc();
  const first = planOps(ops, d, NOW);
  assert.equal(first.length, 5);
  for (const c of first) d = apply(d, c);
  assert.deepEqual(planOps(ops, d, NOW), []);
  // 같은 ops가 두 벌(쓰기가 실패해 다시 읽음)이어도
  assert.deepEqual(planOps([...ops, ...ops], d, NOW), []);
  // 지난 날(어제)의 한 번 · 쌓기 · 직접 추가한 할 일도 — 다음 날 열어 두 번 읽어도 한 번만
  const y = { day: '2026-10-13' };
  const stale = [op('0-0', true, y), op('0-2', true, y), op('x:e1', true, y)];
  let s = doc();
  const once = planOps(stale, s, NOW);
  assert.deepEqual(once.map((c) => c.kind), ['checkToday', 'addCountOn', 'toggleExtra']);
  for (const c of once) s = apply(s, c);
  assert.equal(s.themes[0].actions[2].log['2026-10-13'], 1);
  assert.deepEqual(planOps(stale, s, NOW), []);
  assert.deepEqual(planOps([...stale, ...stale], s, NOW), []);
});

test('WidgetSync — writeTimeline( 앞에는 늘 같은 사슬의 readOps(', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/hosts/WidgetSync.tsx'), 'utf8');
  const code = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const writes = [...code.matchAll(/widgetBridge\.writeTimeline\(/g)];
  assert.ok(writes.length >= 1, 'writeTimeline을 부른다');
  for (const w of writes) {
    // 그 쓰기를 품은 사슬 고리(.then(async () => { … }))
    const link = code.lastIndexOf('.then(', w.index);
    assert.ok(link >= 0, 'writeTimeline은 사슬 고리 안에서');
    const body = code.slice(link, w.index);
    assert.match(body, /await widgetBridge\.readOps\(\)/, 'writeTimeline 앞에 같은 고리의 readOps');
    assert.ok(/chain\.current\s*=\s*chain\.current\s*$/.test(code.slice(0, link).trimEnd()), '고리는 chain.current에 이어 붙인다');
  }
  // 사슬 밖에서 쓰지 않는다 · 온보딩 전에는 쓰지 않는다
  assert.equal((code.match(/writeTimeline/g) || []).length, writes.length);
  assert.match(code, /if \(!live\.current\.ready \|\| !live\.current\.onboarded\) return;/);
  // 읽지 못한 차례(null)에는 쓰지 않는다 — 쓰면 남은 ops를 지운다(R-1 F5)
  const skip = code.search(/const ops = await widgetBridge\.readOps\(\);\s*if \(ops === null\) return;/);
  assert.ok(skip >= 0 && skip < writes[0].index, 'readOps가 null이면 writeTimeline 전에 돌아간다');
  assert.match(code, /cmd\.kind === 'addCountOn'\) actions\.addCountOn\(cmd\.ti, cmd\.ai, cmd\.delta, cmd\.day\)/);
  assert.match(code, /crash\.crumb\('widget', `ops \$\{ops\.length\}`\)/);
  // 무늬는 프로일 때만
  assert.match(code, /proValue<WidgetPattern>\(doc\.settings\.paper \?\? 'dots', 'dots', \(p\) => p !== 'dots', owned\)/);
});

test('위젯 다리 — readOps는 읽지 못하면 빈 배열이 아니라 null(R-1 F5)', () => {
  const ios = fs.readFileSync(path.join(__dirname, '../src/widgets/bridge.ios.ts'), 'utf8');
  const read = ios.slice(ios.indexOf('readOps:'));
  assert.match(read, /catch \(e\) \{[\s\S]*?return null;\s*\}/);
  assert.doesNotMatch(read, /return \[\];/);
  const stub = fs.readFileSync(path.join(__dirname, '../src/widgets/bridge.ts'), 'utf8');
  assert.match(stub, /readOps\(\): Promise<WidgetOp\[\] \| null>;/);
});

test('저장소: addCountOn은 그날(오늘까지) 기록으로 더하고, 액션 목록에 있다', () => {
  const s = fs.readFileSync(path.join(__dirname, '../src/store/MandaratContext.tsx'), 'utf8');
  assert.match(s, /addCountOn: \(ti: number, ai: number, delta: number, day: string\) => void;/);
  assert.match(s, /const addCountOn = useCallback\([\s\S]*?update\(\(d\) => \(day <= dateKey\(\) \? addCountTo\(d, ti, ai, delta, day\) : d\)\)/);
  assert.equal((s.match(/checkToday, addCount, addCountOn, rateMind/g) || []).length, 2);
});

test('앞날 · 날짜가 아닌 op는 더 늦어도 오늘의 한 번 · 직접 추가한 할 일 체크를 가리지 않는다(시계를 되돌린 기기)', () => {
  const d = doc();
  const today = [op('0-0', true, { at: 50 }), op('x:e1', true, { at: 51 })];
  const future = [op('0-0', false, { at: 90, day: '2026-10-16' }), op('x:e1', false, { at: 91, day: '2026-10-15' }), op('0-0', false, { at: 92, day: 'bad' })];
  assert.deepEqual(planOps([...today, ...future], d, NOW), [{ kind: 'checkToday', ti: 0, ai: 0 }, { kind: 'toggleExtra', id: 'e1' }]);
});
