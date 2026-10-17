// V2-F — 이 기기에서 바꾼 것에 도장 찍기(syncLocal).
// - changedPaths(빠른 길: 갈래 참조 비교)는 project(prev)와 project(next)를 통째로 비교한 것과 같다(500개 무작위 고침 줄).
// - 도장은 늘 커지고, 한 번 저장에 한 도장. 카운터의 바뀐 만큼은 이 기기 몫에 들어간다.
// - clearAction은 맞는 경로들을 한 도장으로 지운다. epochReset은 옛 시계를 버리고 남긴 문서의 모든 경로를 새 판 위에 찍는다.
// - GC는 TTL보다 오래된, 값 없는 원소의 도장만 치운다. isStale.
require('./register');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { rng, fuzzDoc, fullDoc, mutate } = require('./helpers/docFuzz');
const { blankDoc, migrate, sampleThemes } = require('../src/data/defaults');
const { resetDoc, startNewChart } = require('../src/lib/archive');
const { addCount, clearedAction } = require('../src/lib/kinds');
const { archiveCellLog } = require('../src/lib/history');
const { toggleDayLog, ymd } = require('../src/lib/routine');
const { canon, project, isCounterPath, isElementPath, partsSum, toUnits, pathOf } = require('../src/lib/syncProject');
const { cleanSyncMeta } = require('../src/lib/syncMeta');
const { msOf, isStamp } = require('../src/lib/syncStamp');
const { stampLocal, epochReset, changedPaths, reattribute, gc, isStale, SYNC_TTL_MS, SYNC_TTL_DAYS } = require('../src/lib/syncLocal');

const DEV = 'aaaaaaaaaaaaaaaa';
const T0 = Date.UTC(2026, 9, 1);
const DAY = 24 * 60 * 60 * 1000;

function metaFor(dev = DEV) {
  return cleanSyncMeta({ v: 1, dev, last: '', epoch: '', clock: {}, parts: {}, enabled: true, seen: {} });
}

/** 통째로 비교한 바뀐 경로(값은 카운터도 수 그대로) */
function naiveChanged(prev, next) {
  const raw = (doc) => {
    const out = new Map();
    for (const [p, v] of project(doc)) out.set(p, isCounterPath(p) ? v.b / 100 : v);
    return out;
  };
  const a = raw(prev);
  const b = raw(next);
  const out = new Map();
  for (const [p, v] of b) if (!a.has(p) || canon(a.get(p)) !== canon(v)) out.set(p, canon(v));
  for (const p of a.keys()) if (!b.has(p)) out.set(p, 'null');
  return out;
}

function asCanon(changes) {
  const out = new Map();
  for (const [p, { to }] of changes) out.set(p, canon(to ?? null));
  return out;
}

function editCell(doc, ti, ai, fn) {
  return { ...doc, themes: doc.themes.map((t, i) => (i === ti ? { ...t, actions: t.actions.map((a, j) => (j === ai ? fn(a) : a)) } : t)) };
}

/** 저장소처럼 참조를 나누는 고침 하나 */
function sharedEdit(r, doc, now) {
  const int = (n) => Math.floor(r() * n);
  const one = (xs) => xs[int(xs.length)];
  const ti = int(8);
  const ai = int(8);
  const key = `${ti}-${ai}`;
  const day = ymd(new Date(2026, 9, 1 + int(10)));
  switch (int(14)) {
    case 0: return editCell(doc, ti, ai, (a) => ({ ...a, text: one(['걷기', '', 'a/b', '100%']) }));
    case 1: return editCell(doc, ti, ai, (a) => ({ ...a, note: one(['', '메모']) }));
    case 2: return editCell(doc, ti, ai, (a) => ({ ...a, done: !a.done }));
    case 3: return editCell(doc, ti, ai, (a) => ({ ...a, text: a.text || '쌓기', kind: 'count', goal: 9, step: 1, remindAt: one([undefined, '07:00']) }));
    case 4: return addCount(editCell(doc, ti, ai, (a) => ({ ...a, text: a.text || '쌓기', kind: 'count' })), ti, ai, one([1, -1, 0.5]), day);
    case 5: return { ...doc, dayLog: toggleDayLog(doc.dayLog, key, day) };
    case 6: return { ...doc, dayMeta: { ...doc.dayMeta, [day]: { mood: int(5) } } };
    case 7: return { ...doc, focusMinutes: doc.focusMinutes + 25 };
    case 8: return { ...doc, settings: { ...doc.settings, paper: one(['grid', 'lines']), reminders: { morning: one(['07:00', '08:00']) } } };
    case 9: return { ...doc, todayKeys: doc.todayKeys.includes(key) ? doc.todayKeys.filter((k) => k !== key) : [...doc.todayKeys, key] };
    case 10: return { ...doc, todayExtra: [...doc.todayExtra, { id: `e${int(999)}`, ti, text: '할 일', done: false }] };
    case 11: return { ...doc, themes: doc.themes.map((t, i) => (i === ti ? { ...t, title: one(['건강', '일', '']) } : t)) };
    case 12: return { ...doc, todayKeys: doc.todayKeys.filter((k) => k !== key), dayLog: archiveCellLog(doc.dayLog, key, now), themes: editCell(doc, ti, ai, clearedAction).themes };
    default: return startNewChart(doc, 'continue', new Date(now), { goal: '', note: '', time: now }) ?? { ...doc, centerGoal: '새 목표' };
  }
}

test('changedPaths equals the naive full diff on 500 random edit sequences (shared and fresh references)', () => {
  for (let seq = 0; seq < 500; seq++) {
    const r = rng(seq + 1);
    let doc = fuzzDoc(r);
    for (let step = 0; step < 6; step++) {
      const next = r() < 0.7 ? sharedEdit(r, doc, T0 + step * DAY) : mutate(r, doc);
      assert.deepEqual(asCanon(changedPaths(doc, next)), naiveChanged(doc, next), `seq ${seq} step ${step}`);
      doc = next;
    }
  }
  // 같은 참조면 빈 결과, 모든 필드를 채운 문서 ↔ 빈 문서
  const f = fullDoc();
  assert.equal(changedPaths(f, f).size, 0);
  assert.deepEqual(asCanon(changedPaths(f, blankDoc())), naiveChanged(f, blankDoc()));
  assert.deepEqual(asCanon(changedPaths(blankDoc(), f)), naiveChanged(blankDoc(), f));
});

test('the fast path skips untouched sections: a one-cell edit on a heavy doc finds its paths in under a millisecond', () => {
  const themes = sampleThemes(new Date(2024, 0, 1)).map((t) => ({
    ...t, actions: t.actions.map((a) => {
      const log = {};
      for (let i = 0; i < 200; i++) log[ymd(new Date(2024, 0, 1 + i * 5))] = 1;
      return { ...a, kind: 'count', goal: 999, count: 200, log };
    }),
  }));
  const dayLog = {};
  for (let i = 0; i < 1095; i++) dayLog[ymd(new Date(2024, 0, 1 + i))] = ['0-0', '1-1', '2-2', '3-3', '4-4', '5-5', '6-6', '7-7', '0-1', '1-2'];
  const heavy = migrate({ ...fullDoc(), themes, dayLog });
  let meta = epochReset(metaFor(), T0, heavy);
  let doc = heavy;
  const find = [];
  const stamp = [];
  const ms = (t) => Number(process.hrtime.bigint() - t) / 1e6;
  for (let i = 0; i < 31; i++) {
    const next = editCell(doc, i % 8, (i * 3) % 8, (a) => ({ ...a, text: `글 ${i}` }));
    let t = process.hrtime.bigint();
    const changes = changedPaths(doc, next);
    find.push(ms(t));
    assert.deepEqual([...changes.keys()], [`c/${i % 8}-${(i * 3) % 8}/text`]);
    t = process.hrtime.bigint();
    meta = stampLocal(doc, next, meta, T0 + 1000 + i);
    stamp.push(ms(t));
    doc = next;
  }
  find.sort((a, b) => a - b);
  stamp.sort((a, b) => a - b);
  assert.ok(Object.keys(meta.clock).length > 20000, 'heavy');
  // 2만 경로 문서에서 바뀐 길 찾기는 중간값 1ms 안팎 — 바쁜 CI에서도 흔들리지 않게 여유를 두되, 통째 비교(수십 ms)는 잡는다
  assert.ok(find[15] < 5, `changedPaths median ${find[15].toFixed(2)} ms`);
  // 나머지는 2만 경로 시계의 사본이다(순수 함수라 고쳐 쓰지 않는다) — docs/v2/V2-F.md §8 성능
  assert.ok(stamp[15] < 40, `stampLocal median ${stamp[15].toFixed(2)} ms`);
});

test('stamps increase: one stamp per commit, above every earlier stamp, even when the wall clock goes back', () => {
  const r = rng(9);
  let doc = fuzzDoc(r);
  let meta = metaFor();
  let last = '';
  for (let i = 0; i < 300; i++) {
    const next = sharedEdit(r, doc, T0 + i * 1000);
    const wall = T0 + (i % 7 === 0 ? -50000 : i * 1000); // 가끔 시계가 뒤로
    const m = stampLocal(doc, next, meta, wall);
    const changes = changedPaths(doc, next);
    if (changes.size === 0) {
      assert.equal(m, meta, 'nothing changed → same meta');
    } else {
      const stamps = new Set([...changes.keys()].map((p) => m.clock[p]));
      assert.equal(stamps.size, 1, 'one stamp per commit');
      const [s] = stamps;
      assert.ok(isStamp(s) && s > last && s > meta.epoch, 'stamps increase');
      assert.equal(m.last, s);
      // 바뀌지 않은 경로의 도장은 그대로
      for (const p of Object.keys(meta.clock)) if (!changes.has(p)) assert.equal(m.clock[p], meta.clock[p]);
      last = s;
    }
    meta = m;
    doc = next;
  }
});

test('reattribute: counter deltas go to this device part, so b = value − Σparts never changes with local edits', () => {
  const r = rng(21);
  let doc = editCell(migrate({ ...blankDoc(), themes: sampleThemes(new Date(2026, 8, 1)) }), 1, 1, (a) => ({ ...a, text: '책', kind: 'count', count: 5, step: 1, goal: 100 }));
  let meta = metaFor();
  const baseOf = (d, m, p) => {
    const v = project(d, m.parts).get(p);
    return v ? v.b : 0 - partsSum(m.parts[p]);
  };
  const b0 = baseOf(doc, meta, 'c/1-1/n');
  const fm0 = baseOf(doc, meta, 'fm');
  const days = ['2026-10-01', '2026-10-02'];
  const logBase = Object.fromEntries(days.map((day) => [day, baseOf(doc, meta, pathOf('c', '1-1', 'log', day))]));
  for (let i = 0; i < 200; i++) {
    const day = days[i % 2];
    const next = r() < 0.2 ? { ...doc, focusMinutes: doc.focusMinutes + 25 } : addCount(doc, 1, 1, r() < 0.6 ? 1 : -1, day);
    meta = stampLocal(doc, next, meta, T0 + i);
    doc = next;
    assert.equal(baseOf(doc, meta, 'c/1-1/n'), b0);
    assert.equal(baseOf(doc, meta, 'fm'), fm0);
    for (const d of days) assert.equal(baseOf(doc, meta, pathOf('c', '1-1', 'log', d)), logBase[d], `log base ${d}`);
  }
  for (const [p, byDev] of Object.entries(meta.parts)) {
    assert.ok(isCounterPath(p));
    assert.deepEqual(Object.keys(byDev), [DEV]);
    assert.ok(byDev[DEV][0] >= 0 && byDev[DEV][1] >= 0);
  }
  // 없던 값 → 값, 값 → 없음
  assert.deepEqual(reattribute({}, DEV, 'c/0-0/n', undefined, 2.5), { 'c/0-0/n': { [DEV]: [250, 0] } });
  assert.deepEqual(reattribute({ 'c/0-0/n': { [DEV]: [250, 0] } }, DEV, 'c/0-0/n', 2.5, undefined), { 'c/0-0/n': { [DEV]: [250, 250] } });
  const same = { fm: { [DEV]: [1, 2] } };
  assert.equal(reattribute(same, DEV, 'fm', 3, 3), same);
});

test('clearAction tombstones the right paths under one stamp', () => {
  let doc = fullDoc();
  let meta = epochReset(metaFor(), T0, doc);
  const key = '2-0';
  const a = doc.themes[2].actions[0];
  const next = {
    ...doc,
    todayKeys: doc.todayKeys.filter((k) => k !== key),
    dayLog: archiveCellLog(doc.dayLog, key, T0 + 5000),
    themes: editCell(doc, 2, 0, clearedAction).themes,
  };
  const m = stampLocal(doc, next, meta, T0 + 5000);
  const changed = Object.keys(m.clock).filter((p) => m.clock[p] !== meta.clock[p]);
  const s = m.clock[changed[0]];
  for (const p of changed) assert.equal(m.clock[p], s, 'one stamp');
  const want = [
    'c/2-0/text', 'c/2-0/done', 'c/2-0/cfg', 'c/2-0/n',
    ...Object.keys(a.log).map((d) => pathOf('c', '2-0', 'log', d)),
    ...Object.keys(a.ratings).map((w) => pathOf('c', '2-0', 'r', w)),
    'tk/2-0',
    ...Object.keys(doc.dayLog).filter((d) => doc.dayLog[d].includes(key)).map((d) => pathOf('d', d, key)),
  ];
  for (const p of want) assert.ok(changed.includes(p), `stamped ${p}`);
  // 지워진 경로는 값이 없다(지운 표시), 메모는 남는다(clearedAction이 남긴다)
  const after = project(next);
  for (const p of want) if (!p.startsWith('d/') && !['c/2-0/text', 'c/2-0/done', 'c/2-0/cfg'].includes(p)) assert.ok(!after.has(p), `${p} is a tombstone`);
  assert.ok(!changed.includes('c/2-0/note'));
  // 다른 칸은 그대로
  // 칸 기록은 떼어 둔 키(2-xh…)로 옮겨 간다
  for (const p of changed) assert.ok(p.includes('2-0') || /^d\/[0-9-]+\/2-xh/.test(p), `only this cell: ${p}`);
  // 카운터의 줄어든 만큼은 이 기기 몫(뺀 합)에
  assert.deepEqual(m.parts['c/2-0/n'][DEV], [0, toUnits(a.count)]);
});

test('epochReset bumps the epoch, drops the old clock and parts, and stamps every path of the kept doc above it', () => {
  const r = rng(4);
  for (let i = 0; i < 100; i++) {
    let doc = fuzzDoc(r);
    let meta = metaFor();
    for (let k = 0; k < 5; k++) {
      const next = sharedEdit(r, doc, T0 + k);
      meta = stampLocal(doc, next, meta, T0 + k * 1000);
      doc = next;
    }
    const kept = i % 2 === 0 ? resetDoc(doc) : doc;
    const m = epochReset(meta, T0 + 10000, kept);
    assert.ok(m.epoch > meta.last && m.epoch > meta.epoch, 'new epoch above everything seen');
    assert.deepEqual(m.parts, {});
    const paths = [...project(kept).keys()].sort();
    assert.deepEqual(Object.keys(m.clock).sort(), paths, 'exactly the kept paths');
    const stamps = new Set(Object.values(m.clock));
    assert.equal(stamps.size, 1);
    assert.ok([...stamps][0] > m.epoch);
    assert.equal(m.last, [...stamps][0]);
    assert.equal(m.dev, meta.dev);
    assert.deepEqual(m.seen, meta.seen);
  }
});

test('gc drops only element stamps older than the TTL whose value is gone, at most once a day', () => {
  const doc = fullDoc();
  const old = T0 - 200 * DAY;
  let meta = epochReset(metaFor(), old, doc);
  // 오래된 지운 표시: 체크 해제·오늘 목록에서 빼기·지난 표 지우기 / 오래된 값: 그대로 남은 원소
  const gone = { ...doc, dayLog: { ...doc.dayLog, '2026-09-02': [] }, todayKeys: ['0-3'], archives: [] };
  delete gone.dayLog['2026-09-02'];
  meta = stampLocal(doc, gone, meta, old + 1000);
  // 최근 지운 표시
  const recent = { ...gone, todayKeys: [] };
  meta = stampLocal(gone, recent, meta, T0 - 10 * DAY);
  const g = gc(meta, T0, recent);
  const dropped = Object.keys(meta.clock).filter((p) => !(p in g.clock));
  assert.deepEqual(dropped.sort(), ['ar/y20250901', 'd/2026-09-02/2-0', 'tk/2-0'].sort());
  for (const p of dropped) assert.ok(isElementPath(p) && msOf(meta.clock[p]) < T0 - SYNC_TTL_MS);
  assert.ok('tk/0-3' in g.clock, 'a recent tombstone stays');
  assert.ok('d/2026-09-01/2-0' in g.clock, 'an old stamp with a value stays');
  assert.ok('cg' in g.clock && 's/mood' in g.clock, 'non-element paths stay');
  assert.equal(g.gcDay, ymd(new Date(T0)));
  assert.equal(gc(g, T0 + 1000, recent), g, 'once a day');
  assert.notEqual(gc(g, T0 + DAY, recent), g);
  assert.deepEqual(g.parts, meta.parts);
  assert.equal(SYNC_TTL_DAYS, 180);
});

test('isStale: pulledAt older than the TTL', () => {
  assert.equal(isStale({}, T0), false);
  assert.equal(isStale({ pulledAt: T0 - SYNC_TTL_MS }, T0), false);
  assert.equal(isStale({ pulledAt: T0 - SYNC_TTL_MS - 1 }, T0), true);
  assert.equal(isStale({ pulledAt: T0 - DAY }, T0), false);
});
