// 위젯·Siri 체크 들이기(src/lib/widgetOps.ts)와 손잡이(src/hosts/WidgetSync.tsx)의 읽고 나서 쓰기.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { blankDoc } = require('../src/data/defaults');
const { planOps, opId } = require('../src/lib/widgetOps');
const { toggleDayLog } = require('../src/lib/routine');
const { toggleCountToday } = require('../src/lib/kinds');

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

test('지난 날의 한 번 · 쌓기 · 직접 추가한 할 일은 버린다', () => {
  const d = doc();
  const y = { day: '2026-10-13' };
  assert.deepEqual(planOps([op('0-0', true, y), op('0-2', true, y), op('x:e1', true, y)], d, NOW), []);
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
  assert.match(code, /crash\.crumb\('widget', `ops \$\{ops\.length\}`\)/);
  // 무늬는 프로일 때만
  assert.match(code, /proValue<WidgetPattern>\(doc\.settings\.paper \?\? 'dots', 'dots', \(p\) => p !== 'dots', owned\)/);
});
