// V4-A iCloud 맞추기 엔진 — 가짜 iCloud 폴더 위에서 저장소 흉내(같은 makeSyncPort · commitMeta · stampPending · openStored)와
// 진짜 엔진(createSyncEngine)을 돌린다. 가장 중요한 것: 어느 순서로 끼어들어도 이 기기에서 고친 것을 잃지 않는다.
require('./register');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { rng, canonArrays, withoutLocal } = require('./helpers/docFuzz');
const { blankDoc, migrate, sampleThemes } = require('../src/data/defaults');
const { resetDoc, startNewChart } = require('../src/lib/archive');
const { addCount } = require('../src/lib/kinds');
const { rolloverToday, ymd } = require('../src/lib/routine');
const { canon, project } = require('../src/lib/syncProject');
const { cleanSyncMeta, newSyncMeta } = require('../src/lib/syncMeta');
const { isStamp, tagOfStamp } = require('../src/lib/syncStamp');
const { encodeReplica, replicaName, devOfName } = require('../src/lib/syncFile');
const { SYNC_TTL_MS } = require('../src/lib/syncLocal');
const { makeSyncPort, openStored, serializeStored, commitMeta, stampPending, docOnlyJson, undoResetMeta } = require('../src/lib/syncEnvelope');
const {
  classify, isEmptyDoc, createSyncEngine, probe, applyPulled, PUSH_DEBOUNCE_MS, EPOCH_PUSH_DEBOUNCE_MS,
} = require('../src/lib/syncEngine');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const T0 = Date.UTC(2026, 9, 1, 3, 0, 0);
const DAY = 24 * 60 * 60 * 1000;
const DEVS = ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb', 'cccccccccccccccc'];
const ACC = '0123456789abcdef';

const tick = () => new Promise((r) => setImmediate(r));
async function settle(n = 6) {
  for (let i = 0; i < n; i++) await tick();
}

function baseDoc(goal = '목표', chartStart = '2026-01-05') {
  return migrate({
    ...blankDoc(), onboarded: true, centerGoal: goal, themes: sampleThemes(new Date(2026, 8, 1)),
    todayDate: ymd(new Date(T0)), chartStart, focusStart: 0,
  });
}

function editCell(doc, ti, ai, fn) {
  return { ...doc, themes: doc.themes.map((t, i) => (i === ti ? { ...t, actions: t.actions.map((a, j) => (j === ai ? fn(a) : a)) } : t)) };
}

const textOf = (doc, ti, ai) => doc.themes[ti].actions[ai].text;

/** 가짜 iCloud 컨테이너 — 이름 → { json, modified }. 쓰기마다 수정 시각이 오른다 */
function makeCloud() {
  return { files: new Map(), t: T0, account: ACC, available: true, writes: [] };
}

/**
 * 기기 하나 — 저장소 흉내 + 가짜 IO + 엔진. world.wall이 시계.
 * hooks.read/write를 바꾸면 그 IO가 언제 끝날지 테스트가 정한다.
 */
function makeDevice(world, cloud, dev, doc, opts = {}) {
  const key = opts.key ?? `key-${dev}`;
  const meta0 = opts.meta ?? cleanSyncMeta({ v: 1, dev, vendor: key, last: '', epoch: '', clock: {}, parts: {}, enabled: false, seen: {} });
  const d = { dev, key, latest: doc, stamped: doc, meta: meta0, rev: 0, copies: [], calls: [], hooks: {}, statuses: [], cloud };
  world.devices.push(d);
  const record = (oldMeta, newMeta, docNow) => {
    if (!newMeta || newMeta === oldMeta) return;
    let vals = null;
    for (const [p, st] of Object.entries(newMeta.clock)) {
      if (oldMeta && oldMeta.clock[p] === st) continue;
      if (tagOfStamp(st) !== newMeta.tag) continue;
      const k = `${p}|${st}`;
      if (world.issued.has(k)) continue;
      vals = vals ?? project(migrate(JSON.parse(JSON.stringify(docNow))));
      world.issued.set(k, canon(vals.get(p) ?? null));
    }
  };
  // 저장소처럼 도장은 미뤄서 — commit은 문서만, 저장 · 손잡이 읽기 전에 flush(R-8 #3)
  d.flush = () => {
    const old = d.meta;
    d.meta = stampPending(d.stamped, d.latest, d.meta, world.wall);
    d.stamped = d.latest;
    record(old, d.meta, d.latest);
  };
  d.commit = (next, how = 'stamp') => {
    if (how !== 'stamp') d.flush();
    const old = d.meta;
    const c = commitMeta(d.latest, next, d.meta, d.stamped, how, world.wall);
    d.meta = c.meta;
    d.stamped = c.stamped;
    d.latest = next;
    record(old, d.meta, next);
  };
  d.update = (fn, how) => {
    d.rev += 1;
    d.commit(fn(d.latest), how);
  };
  const raw = makeSyncPort({
    doc: () => d.latest,
    meta: () => d.meta,
    flush: () => d.flush(),
    setMeta: (m) => { record(d.meta, m, d.latest); d.meta = m; },
    putMerged: (doc2, m) => { record(d.meta, m, doc2); d.meta = m; d.rev += 1; d.commit(doc2, 'none'); },
    today: () => ymd(new Date(world.wall)),
    now: () => world.wall,
    writeCopy: (x) => {
      d.copies.push(JSON.parse(docOnlyJson(x)));
      return Promise.resolve(opts.copyFails ? false : true);
    },
    writing: (delta) => { d.writing += delta; },
  });
  d.writing = 0;
  // 처음부터 다시와 그 되돌리기(MandaratContext resetAll · undoReset과 같은 차례) — 판까지 거두었으면 undoReset이 true
  d.resetAll = () => {
    d.flush();
    const before = d.latest;
    const meta = d.meta;
    d.update((x) => rolloverToday(resetDoc(x), ymd(new Date(world.wall))), 'epoch');
    d.resetUndo = { doc: before, rev: d.rev, mark: meta ? { before: meta, epoch: d.meta.epoch, ...(meta.pushed ? { pushed: meta.pushed } : {}) } : null };
    return before;
  };
  d.undoReset = (snapshot) => {
    const u = d.resetUndo;
    d.resetUndo = null;
    d.flush();
    const restored = u && d.writing === 0 && u.doc === snapshot && u.rev === d.rev ? undoResetMeta(u.mark, d.meta) : null;
    if (!restored) {
      d.rev += 1;
      d.commit(rolloverToday(snapshot, ymd(new Date(world.wall))));
      return false;
    }
    d.rev += 1;
    d.meta = restored;
    d.commit(snapshot, 'none');
    d.commit(rolloverToday(snapshot, ymd(new Date(world.wall))));
    return true;
  };
  // 손잡이 감시 — 부른 순서를 남긴다(저장본이 늘 먼저인지)
  d.port = {
    ...raw,
    applyRemote: (r) => { d.calls.push('applyRemote'); return raw.applyRemote(r); },
    adopt: (r) => { d.calls.push('adopt'); return raw.adopt(r); },
    epochReset: () => { d.calls.push('epochReset'); return raw.epochReset(); },
    keepCopy: () => { d.calls.push('keepCopy'); return raw.keepCopy(); },
  };
  d.writes = 0;
  d.io = {
    status: async () => ({ available: cloud.available, account: cloud.available ? cloud.account : null }),
    deviceKey: async () => d.key,
    start: async () => {
      setImmediate(() => d.engine && d.engine.changed());
      return cloud.available;
    },
    stop: async () => {},
    list: async () => [...cloud.files.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([name, f]) => ({ name, modified: f.modified, size: f.json.length, downloaded: true })),
    read: async (name) => {
      if (d.hooks.read) return d.hooks.read(name);
      const f = cloud.files.get(name);
      if (!f) throw Object.assign(new Error('gone'), { code: 'E_NOT_FOUND' });
      return [f.json];
    },
    write: async (name, json) => {
      if (d.hooks.write) return d.hooks.write(name, json);
      d.writes += 1;
      cloud.writes.push({ dev: d.dev, name });
      cloud.t += 1000;
      cloud.files.set(name, { json, modified: cloud.t });
    },
    remove: async (name) => { cloud.files.delete(name); },
    now: () => world.wall,
  };
  d.makeEngine = () => {
    d.engine = createSyncEngine({ port: d.port, io: d.io, random: world.random, emit: (s) => d.statuses.push(s), gatherTimeoutMs: 2000 });
    return d.engine;
  };
  d.makeEngine();
  /** 앱이 꺼졌다 다시 열린다 — 저장된 것(문서 + 메타)만 남는다 */
  d.kill = () => {
    void d.engine.dispose();
    d.flush();
    const stored = serializeStored(d.latest, d.meta);
    const o = openStored(stored, ymd(new Date(world.wall)), world.wall, () => newSyncMeta(world.random));
    d.latest = o.doc;
    d.stamped = o.doc;
    d.meta = o.meta;
    d.hooks = {};
    d.makeEngine();
  };
  return d;
}

/**
 * 시계를 움직이면 먼저 모든 기기의 밀린 도장을 찍는다 — 저장소는 고친 뒤 300ms 안에 저장하며(persist) 찍으니,
 * 시간이 흐르기 전에 늘 찍혀 있다(R-8 #3). 같은 순간의 고침 여러 개는 한 번에 찍힌다.
 */
function makeWorld(seed = 1) {
  const r = rng(seed);
  let wall = T0;
  const world = {
    issued: new Map(), random: r, r, devices: [],
    get wall() { return wall; },
    set wall(v) {
      if (v !== wall) for (const d of world.devices) d.flush();
      wall = v;
    },
  };
  return world;
}

/** 정규형 — 문서만(판 · 시계 · 순서 · 기기 필드 없이) */
function docKey(doc) {
  return canon(canonArrays(withoutLocal(migrate(JSON.parse(JSON.stringify(doc))))));
}

/** 켜진 두 기기: A가 먼저 켜고(올리기), B는 비어 있어 그대로 가져온다 */
async function pairOn(world, seed) {
  const cloud = makeCloud();
  const A = makeDevice(world, cloud, DEVS[0], baseDoc('A의 목표'));
  const B = makeDevice(world, cloud, DEVS[1], blankDoc());
  await A.engine.setEnabled(true);
  await B.engine.setEnabled(true);
  return { cloud, A, B };
}

/** 두 기기를 몇 번 주고받게 해 맞춘다 */
async function converge(...devs) {
  for (let round = 0; round < 3; round++) {
    for (const d of devs) await d.engine.sync();
  }
}

// ── 판단 ────────────────────────────────────────────────────────────────────

test('classify: no remotes → push; empty local → adopt; otherwise ask', () => {
  const remote = { dev: DEVS[1], epoch: '', clock: {}, parts: {}, doc: baseDoc() };
  assert.equal(classify(baseDoc(), []), 'push');
  assert.equal(classify(baseDoc(), [{ newer: true, schema: 9 }]), 'push', 'a newer replica alone is not a remote to merge');
  assert.equal(classify(blankDoc(), [remote]), 'adopt', 'not onboarded');
  const onboardedEmpty = migrate({ ...blankDoc(), onboarded: true });
  assert.equal(isEmptyDoc(onboardedEmpty), true);
  assert.equal(classify(onboardedEmpty, [remote]), 'adopt', 'onboarded but nothing written');
  assert.equal(classify(baseDoc(), [remote]), 'ask');
  // 무엇이든 하나 적었으면 비지 않았다
  const one = editCell(migrate({ ...blankDoc(), onboarded: true }), 2, 3, (a) => ({ ...a, text: '걷기' }));
  assert.equal(isEmptyDoc(one), false);
  assert.equal(isEmptyDoc({ ...onboardedEmpty, dayMeta: { '2026-10-01': { reflection: '좋았다' } } }), false);
  assert.equal(isEmptyDoc({ ...onboardedEmpty, centerGoal: '목표' }), false);
});

// ── 켜기와 고르기 ───────────────────────────────────────────────────────────

test('enable: the first device pushes; an empty second device adopts the chart exactly', async () => {
  const world = makeWorld(2);
  const { cloud, A, B } = await pairOn(world);
  assert.equal(A.engine.status().phase, 'idle');
  assert.equal(B.engine.status().phase, 'idle');
  assert.ok(cloud.files.has(replicaName(A.dev)) && cloud.files.has(replicaName(B.dev)));
  assert.equal(docKey(B.latest), docKey(A.latest), 'the phone took the iPad chart exactly');
  assert.equal(B.latest.centerGoal, 'A의 목표');
  assert.deepEqual(B.calls.slice(0, 2), ['keepCopy', 'adopt'], 'adopt keeps a copy first');
  assert.equal(B.meta.enabled, true);
  assert.equal(B.meta.account, ACC);
});

test('enable with content on both sides asks, and never prompts by itself afterwards', async () => {
  const world = makeWorld(3);
  const cloud = makeCloud();
  const A = makeDevice(world, cloud, DEVS[0], baseDoc('A'));
  const B = makeDevice(world, cloud, DEVS[1], baseDoc('B'));
  await A.engine.setEnabled(true);
  await B.engine.setEnabled(true);
  const s = B.engine.status();
  assert.equal(s.phase, 'needsChoice');
  assert.equal(s.enabled, false);
  assert.equal(s.remote.centerGoal, 'A', 'the choice sheet can compare with what iCloud holds');
  assert.equal(B.writes, 0, 'nothing is pushed before a choice');
  assert.equal(B.meta.enabled, false);
  // 묻는 동안 받기 · 올리기는 하지 않는다
  await B.engine.sync();
  await B.engine.local();
  await B.engine.background();
  assert.equal(B.writes, 0);
  // 고르지 않기
  await B.engine.choose(null);
  assert.equal(B.engine.status().phase, 'off');
  assert.equal(B.latest.centerGoal, 'B', 'nothing changed');
});

test('merge: a text edit on A and a note edit on B to the same cell are both kept', async () => {
  const world = makeWorld(4);
  const cloud = makeCloud();
  const A = makeDevice(world, cloud, DEVS[0], baseDoc('A'));
  const B = makeDevice(world, cloud, DEVS[1], baseDoc('A'));
  await A.engine.setEnabled(true);
  await B.engine.setEnabled(true);
  assert.equal(B.engine.status().phase, 'needsChoice');
  await B.engine.choose('merge');
  assert.deepEqual(B.calls.slice(0, 2), ['keepCopy', 'applyRemote']);
  world.wall += 60_000;
  A.update((d) => editCell(d, 1, 1, (a) => ({ ...a, text: 'A 글' })));
  world.wall += 1000;
  B.update((d) => editCell(d, 1, 1, (a) => ({ ...a, note: 'B 메모' })));
  await converge(A, B);
  for (const d of [A, B]) {
    assert.equal(d.latest.themes[1].actions[1].text, 'A 글');
    assert.equal(d.latest.themes[1].actions[1].note, 'B 메모');
  }
  assert.equal(docKey(A.latest), docKey(B.latest));
});

test('adopt on a phone with its own archives keeps them, unioned with the iPad archives', async () => {
  const world = makeWorld(5);
  const cloud = makeCloud();
  const now = new Date(T0);
  const ipad = startNewChart(baseDoc('iPad', '2025-01-06'), 'continue', now, { goal: '', note: 'iPad 표', time: T0 });
  // 폰: 지난 표는 있고 지금 표는 아직 비었다(처음부터 다시 한 뒤)
  const phoneArchived = startNewChart(baseDoc('Phone', '2024-03-04'), 'blank', now, { goal: '', note: '폰 표', time: T0 });
  const phone = resetDoc(phoneArchived);
  const A = makeDevice(world, cloud, DEVS[0], ipad);
  const B = makeDevice(world, cloud, DEVS[1], phone);
  // 처음부터 다시 한 폰은 지금 표가 비었다 — 묻지 않고 가져오되, 지난 표는 아이디로 합친다
  assert.equal(classify(phone, [A.port.replica()]), 'adopt');
  await A.engine.setEnabled(true);
  await B.engine.setEnabled(true);
  assert.ok(B.calls.includes('adopt'));
  const ids = (d) => (d.latest.archives ?? []).map((a) => a.id).sort();
  assert.deepEqual(ids(B), ['y20240304', 'y20250106']);
  assert.equal(B.latest.centerGoal, 'iPad', 'the live chart is the iPad one');
  await converge(A, B);
  assert.deepEqual(ids(A), ['y20240304', 'y20250106'], 'the iPad gets the phone archive');
  assert.equal(docKey(A.latest), docKey(B.latest));
});

test('mine: this device beats older remote edits, its data survives on the other device, remote archives are kept', async () => {
  const world = makeWorld(6);
  const cloud = makeCloud();
  const now = new Date(T0);
  const withArchive = startNewChart(baseDoc('iPad', '2025-01-06'), 'continue', now, { goal: 'iPad', note: '', time: T0 });
  const A = makeDevice(world, cloud, DEVS[0], withArchive);
  const B = makeDevice(world, cloud, DEVS[1], editCell(baseDoc('Phone'), 0, 0, (a) => ({ ...a, text: '폰 글' })));
  await A.engine.setEnabled(true);
  world.wall += 1000;
  A.update((d) => editCell(d, 0, 0, (a) => ({ ...a, text: 'iPad 글' })));
  await A.engine.sync();
  await B.engine.setEnabled(true);
  assert.equal(B.engine.status().phase, 'needsChoice');
  const before = B.calls.length;
  await B.engine.choose('mine');
  assert.deepEqual(B.calls.slice(before).filter((c) => c !== 'adopt'), ['keepCopy', 'epochReset'], 'a copy before the new epoch');
  assert.ok(B.copies.some((c) => c.centerGoal === 'Phone'));
  await converge(A, B);
  for (const d of [A, B]) {
    assert.equal(textOf(d.latest, 0, 0), '폰 글', 'mine wins over the older remote edit');
    assert.equal(d.latest.centerGoal, 'Phone');
    assert.deepEqual((d.latest.archives ?? []).map((a) => a.id), ['y20250106'], 'the iPad archive is never dropped');
  }
  assert.ok(A.calls.indexOf('keepCopy') >= 0 && A.calls.indexOf('keepCopy') < A.calls.lastIndexOf('applyRemote'),
    'the device that receives the higher epoch keeps a copy first');
  assert.ok(A.copies.some((c) => textOf(c, 0, 0) === 'iPad 글'), 'A’s replaced edit is recoverable from 저장본');
});

test('every enable choice calls keepCopy before it changes anything', async () => {
  for (const choice of ['merge', 'adopt', 'mine']) {
    const world = makeWorld(7);
    const cloud = makeCloud();
    const A = makeDevice(world, cloud, DEVS[0], baseDoc('A'));
    const B = makeDevice(world, cloud, DEVS[1], baseDoc('B'));
    await A.engine.setEnabled(true);
    await B.engine.setEnabled(true, choice);
    const first = B.calls.findIndex((c) => c !== 'keepCopy');
    assert.equal(B.calls[0], 'keepCopy', choice);
    assert.ok(first > 0, choice);
    assert.equal(B.engine.status().phase, 'idle', choice);
  }
});

test('a choice whose copy cannot be written changes nothing (ioError)', async () => {
  const world = makeWorld(8);
  const cloud = makeCloud();
  const A = makeDevice(world, cloud, DEVS[0], baseDoc('A'));
  const B = makeDevice(world, cloud, DEVS[1], baseDoc('B'), { copyFails: true });
  await A.engine.setEnabled(true);
  await B.engine.setEnabled(true, 'adopt');
  assert.equal(B.engine.status().phase, 'problem');
  assert.equal(B.engine.status().problem, 'ioError');
  assert.equal(B.latest.centerGoal, 'B');
  assert.equal(B.meta.enabled, false);
});

// ── 끼어들기 ─────────────────────────────────────────────────────────────────

test('pull race: an edit committed while a read is downloading survives the pull', async () => {
  const world = makeWorld(9);
  const { A, B } = await pairOn(world);
  world.wall += 1000;
  A.update((d) => editCell(d, 4, 4, (a) => ({ ...a, text: 'A가 쓴 글' })));
  await A.engine.sync();
  let release;
  B.hooks.read = (name) => new Promise((resolve) => {
    release = () => resolve([B.cloud.files.get(name).json]);
  });
  const pulling = B.engine.sync();
  await settle();
  assert.ok(release, 'the read is in flight');
  // 받는 동안 B에서 쓴다
  world.wall += 500;
  B.update((d) => editCell(d, 4, 5, (a) => ({ ...a, text: 'B가 받는 동안 쓴 글' })));
  B.update((d) => editCell(d, 4, 4, (a) => ({ ...a, note: 'B 메모' })));
  B.hooks = {};
  release();
  await pulling;
  assert.equal(textOf(B.latest, 4, 5), 'B가 받는 동안 쓴 글');
  assert.equal(B.latest.themes[4].actions[4].note, 'B 메모');
  assert.equal(textOf(B.latest, 4, 4), 'A가 쓴 글');
  await converge(A, B);
  assert.equal(textOf(A.latest, 4, 5), 'B가 받는 동안 쓴 글', 'and it reaches the other device');
});

test('background mid-push, then the app is killed: the edit is pushed on the next launch', async () => {
  const world = makeWorld(10);
  const { A, B } = await pairOn(world);
  world.wall += 1000;
  B.update((d) => editCell(d, 6, 1, (a) => ({ ...a, text: '뒤로 가며 쓴 글' })));
  B.hooks.write = () => new Promise(() => {}); // 쓰기가 끝나기 전에 꺼진다
  void B.engine.background();
  await settle();
  B.update((d) => editCell(d, 6, 2, (a) => ({ ...a, text: '그 뒤 한 글자' })));
  B.kill();
  assert.equal(textOf(B.latest, 6, 1), '뒤로 가며 쓴 글', 'the doc kept it locally');
  await B.engine.boot();
  await converge(A, B);
  assert.equal(textOf(A.latest, 6, 1), '뒤로 가며 쓴 글');
  assert.equal(textOf(A.latest, 6, 2), '그 뒤 한 글자');
});

test('an edit made while a push is being written is pushed by the next push', async () => {
  const world = makeWorld(24);
  const { cloud, A, B } = await pairOn(world);
  B.update((d) => editCell(d, 7, 0, (a) => ({ ...a, text: '먼저' })));
  let release;
  B.hooks.write = (name, json) => new Promise((resolve) => {
    release = () => {
      cloud.t += 1000;
      cloud.files.set(name, { json, modified: cloud.t });
      resolve();
    };
  });
  const pushing = B.engine.local();
  await settle();
  assert.ok(release, 'the write is in flight');
  B.update((d) => editCell(d, 7, 1, (a) => ({ ...a, text: '쓰는 동안' })));
  B.hooks = {};
  release();
  await pushing;
  await B.engine.local();
  await A.engine.sync();
  assert.equal(textOf(A.latest, 7, 0), '먼저');
  assert.equal(textOf(A.latest, 7, 1), '쓰는 동안', 'the pushed mark is the written state, not the state at completion');
});

test('a background push writes immediately without waiting for an in-flight pull', async () => {
  const world = makeWorld(11);
  const { A, B } = await pairOn(world);
  A.update((d) => editCell(d, 2, 2, (a) => ({ ...a, text: 'x' })));
  await A.engine.sync();
  let release;
  B.hooks.read = (name) => new Promise((resolve) => { release = () => resolve([B.cloud.files.get(name).json]); });
  const pulling = B.engine.sync();
  await settle();
  B.update((d) => editCell(d, 3, 3, (a) => ({ ...a, text: '뒤로' })));
  const w = B.writes;
  await B.engine.background();
  assert.equal(B.writes, w + 1, 'pushed while the pull is still waiting');
  B.hooks = {};
  release();
  await pulling;
  await converge(A, B);
  assert.equal(textOf(A.latest, 3, 3), '뒤로');
});

test('+1 and +1 on two devices offline gives +2', async () => {
  const world = makeWorld(12);
  const { A, B } = await pairOn(world);
  const day = ymd(new Date(T0));
  const cnt = (doc) => editCell(doc, 0, 7, (a) => ({ ...a, text: '책', kind: 'count' }));
  A.update(cnt);
  await converge(A, B);
  world.wall += 1000;
  A.update((d) => addCount(d, 0, 7, 1, day));
  B.update((d) => addCount(d, 0, 7, 1, day));
  await converge(A, B);
  for (const d of [A, B]) assert.equal(d.latest.themes[0].actions[7].count, 2);
});

test('epoch reset on A: B keeps a copy, follows the reset, and keeps an archive only B had', async () => {
  const world = makeWorld(13);
  const { A, B } = await pairOn(world);
  world.wall += 1000;
  // B가 맞추지 않은 채 표를 닫고(지난 표) 글도 쓴다
  B.update((d) => startNewChart({ ...d, chartStart: '2025-02-03' }, 'continue', new Date(world.wall), { goal: '', note: 'B만', time: world.wall }));
  B.update((d) => editCell(d, 5, 5, (a) => ({ ...a, text: 'B의 맞추지 않은 글' })));
  world.wall += 1000;
  A.update((d) => resetDoc(d), 'epoch');
  await A.engine.sync();
  const before = B.calls.length;
  await B.engine.sync();
  const calls = B.calls.slice(before);
  assert.ok(calls.indexOf('keepCopy') >= 0 && calls.indexOf('keepCopy') < calls.indexOf('adopt'), 'copy first');
  assert.ok(B.copies.some((c) => textOf(c, 5, 5) === 'B의 맞추지 않은 글'), 'the discarded edit is in today’s 저장본');
  assert.equal(B.latest.onboarded, false, 'B follows the reset');
  await converge(A, B);
  for (const d of [A, B]) {
    assert.deepEqual((d.latest.archives ?? []).map((a) => a.id), ['y20250203'], 'the archive is a keepsake on both');
  }
  assert.equal(docKey(A.latest), docKey(B.latest));
});

test('applyPulled: a higher epoch that deleted an archive after the reset is respected', async () => {
  const world = makeWorld(14);
  const { A, B } = await pairOn(world);
  // A가 판을 올린 뒤에도 그 지난 표가 없으면 되살리지만, A가 판 뒤에 지운 표시가 있으면 따른다
  B.update((d) => startNewChart({ ...d, chartStart: '2025-02-03' }, 'continue', new Date(world.wall), { goal: '', note: '', time: world.wall }));
  A.update((d) => resetDoc(d), 'epoch');
  const rA = A.port.replica();
  const pathAr = 'ar/y20250203';
  const deleted = { ...rA, clock: { ...rA.clock, [pathAr]: A.meta.last } };
  B.calls.length = 0;
  applyPulled(B.port, deleted);
  assert.equal(B.latest.archives, undefined, 'a deliberate post-reset delete wins');
  assert.deepEqual(B.calls, ['applyRemote']);
});

test('newer app replica: problem(newerApp), nothing merged and nothing pushed', async () => {
  const world = makeWorld(15);
  const { cloud, A, B } = await pairOn(world);
  const newer = JSON.parse(cloud.files.get(replicaName(A.dev)).json);
  newer.schema = 99;
  newer.doc.centerGoal = '새 앱';
  cloud.t += 1000;
  cloud.files.set(replicaName(A.dev), { json: JSON.stringify(newer), modified: cloud.t });
  B.update((d) => editCell(d, 1, 0, (a) => ({ ...a, text: 'B' })));
  const w = B.writes;
  const goal = B.latest.centerGoal;
  await B.engine.sync();
  assert.equal(B.engine.status().phase, 'problem');
  assert.equal(B.engine.status().problem, 'newerApp');
  assert.equal(B.latest.centerGoal, goal, 'nothing merged');
  await B.engine.local();
  await B.engine.background();
  await B.engine.sync();
  assert.equal(B.writes, w, 'nothing pushed until the app is updated');
  assert.equal(B.meta.seen[replicaName(A.dev)] === cloud.t, false, 'the file is read again after an update');
  // 켜는 중에 만나도 같다
  const C = makeDevice(world, cloud, DEVS[2], blankDoc());
  await C.engine.setEnabled(true);
  assert.equal(C.engine.status().problem, 'newerApp');
  assert.equal(C.meta.enabled, false);
  assert.equal(C.writes, 0);
});

test('clone: a meta restored onto another device re-keys before its first push and counts add up', async () => {
  const world = makeWorld(16);
  const { cloud, A, B } = await pairOn(world);
  const day = ymd(new Date(T0));
  A.update((d) => editCell(d, 0, 6, (a) => ({ ...a, text: '물', kind: 'count' })));
  A.update((d) => addCount(d, 0, 6, 1, day));
  await converge(A, B);
  // A의 저장본(봉투째)이 C로 복원됐다 — C의 열쇠는 다르다
  const restored = openStored(serializeStored(A.latest, A.meta), day, world.wall, () => newSyncMeta(world.random));
  assert.equal(restored.meta.dev, A.dev);
  const C = makeDevice(world, cloud, A.dev, restored.doc, { meta: restored.meta, key: 'key-new-phone' });
  const writesBefore = cloud.writes.length;
  await C.engine.boot();
  assert.notEqual(C.meta.dev, A.dev, 're-keyed');
  assert.equal(C.meta.vendor, 'key-new-phone');
  assert.ok(cloud.writes.slice(writesBefore).every((w) => w.name !== replicaName(A.dev)), 'never writes A’s file');
  world.wall += 1000;
  A.update((d) => addCount(d, 0, 6, 1, day));
  C.update((d) => addCount(d, 0, 6, 1, day));
  B.update((d) => addCount(d, 0, 6, 1, day));
  await converge(A, B, C);
  for (const d of [A, B, C]) assert.equal(d.latest.themes[0].actions[6].count, 4, 'A, B, C and the original +1 all count');
  assert.equal([...cloud.files.keys()].filter((n) => devOfName(n)).length, 3, 'three replica files, not two');
});

test('account change disables sync; signed out is a problem that resumes on return', async () => {
  const world = makeWorld(17);
  const { cloud, A } = await pairOn(world);
  cloud.available = false;
  await A.engine.accountChanged({ available: false, account: null });
  assert.equal(A.engine.status().problem, 'noAccount');
  assert.equal(A.meta.enabled, true, 'signed out keeps the choice');
  const w = A.writes;
  A.update((d) => editCell(d, 0, 1, (a) => ({ ...a, text: 'x' })));
  await A.engine.local();
  await A.engine.background();
  assert.equal(A.writes, w);
  cloud.available = true;
  await A.engine.accountChanged({ available: true, account: ACC });
  assert.equal(A.engine.status().phase, 'idle');
  assert.equal(A.writes, w + 1, 'resumed and pushed');
  // 다른 계정
  cloud.account = 'ffffffffffffffff';
  await A.engine.accountChanged({ available: true, account: cloud.account });
  assert.equal(A.engine.status().problem, 'accountChanged');
  assert.equal(A.meta.enabled, false);
  await A.engine.foreground();
  await A.engine.background();
  assert.equal(A.writes, w + 1, 'nothing is written into the other account');
  // 다시 켜면 그 계정의 기록과 견주어 묻고, 고르면 그 계정으로 켠다
  await A.engine.setEnabled(true);
  assert.equal(A.engine.status().phase, 'needsChoice');
  await A.engine.choose('merge');
  assert.equal(A.meta.account, 'ffffffffffffffff');
  assert.equal(A.meta.enabled, true);
});

test('an account changed while the app was closed is caught at boot, before any push', async () => {
  const world = makeWorld(18);
  const { cloud, A } = await pairOn(world);
  A.update((d) => editCell(d, 0, 1, (a) => ({ ...a, text: 'x' })));
  A.kill();
  cloud.account = 'eeeeeeeeeeeeeeee';
  const w = A.writes;
  await A.engine.boot();
  assert.equal(A.engine.status().problem, 'accountChanged');
  assert.equal(A.writes, w);
});

test('stale (no pull for longer than the TTL) forces ask', async () => {
  const world = makeWorld(19);
  const { A, B } = await pairOn(world);
  B.update((d) => editCell(d, 0, 2, (a) => ({ ...a, text: 'B' })));
  world.wall += SYNC_TTL_MS + DAY;
  await B.engine.sync();
  assert.equal(B.engine.status().phase, 'needsChoice');
  await B.engine.choose('merge');
  assert.equal(B.engine.status().phase, 'idle');
  assert.equal(textOf(B.latest, 0, 2), 'B');
  // A도 그동안 맞추지 않았다 — A도 묻고, 고른 뒤 받는다
  await A.engine.sync();
  assert.equal(A.engine.status().phase, 'needsChoice');
  await A.engine.choose('merge');
  await converge(A, B);
  assert.equal(textOf(A.latest, 0, 2), 'B');
});

test('R-1 F4: a stale device never pushes on background while the stale-ask is being prepared (probe p3, inverted)', async () => {
  const world = makeWorld(19);
  const { A, B } = await pairOn(world);
  await converge(A, B);
  A.update((d) => editCell(d, 0, 2, (a) => ({ ...a, text: 'B-old' })));
  await converge(A, B);
  world.wall += SYNC_TTL_MS + DAY;
  B.update((d) => editCell(d, 1, 1, (a) => ({ ...a, note: 'offline note' })));
  let release;
  B.hooks.read = (name) => new Promise((res) => { release = () => res([B.cloud.files.get(name).json]); });
  const before = B.writes;
  const p = B.engine.sync();
  await settle(10);
  assert.equal(B.engine.status().phase, 'checking', 'the ask is still being prepared (reading every remote)');
  await B.engine.background();
  assert.equal(B.writes, before, 'no write while stale');
  release && release();
  await p;
  assert.equal(B.engine.status().phase, 'needsChoice');
  await B.engine.background();
  assert.equal(B.writes, before, 'still none while the choice is open');
  // 고른 뒤에는 받고 올린다(pulledAt이 새로 — 더는 오래되지 않았다)
  B.hooks = {};
  await B.engine.choose('merge');
  assert.equal(B.engine.status().phase, 'idle');
  assert.ok(B.writes > before, 'pushes again after the choice');
  assert.equal(B.latest.themes[1].actions[1].note, 'offline note');
});

test('unchanged replicas are never pushed', async () => {
  const world = makeWorld(20);
  const { A, B } = await pairOn(world);
  await converge(A, B);
  const wa = A.writes;
  const wb = B.writes;
  for (let i = 0; i < 4; i++) {
    await A.engine.sync();
    await A.engine.local();
    await A.engine.background();
    await B.engine.foreground();
  }
  assert.equal(A.writes, wa);
  assert.equal(B.writes, wb);
  A.update((d) => editCell(d, 0, 0, (a) => ({ ...a, text: 'new' })));
  await A.engine.local();
  assert.equal(A.writes, wa + 1);
});

test('GC: daily tombstone GC and removal of device files older than the TTL that were merged', async () => {
  const world = makeWorld(21);
  const cloud = makeCloud();
  const A = makeDevice(world, cloud, DEVS[0], baseDoc('A'));
  const B = makeDevice(world, cloud, DEVS[1], blankDoc());
  await A.engine.setEnabled(true);
  await B.engine.setEnabled(true);
  // B는 더 쓰지 않는다. 오래 지나 A만 계속 쓴다(A는 그동안 맞춰 와서 오래되지 않았다)
  for (let i = 0; i < 7; i++) {
    world.wall += 30 * DAY;
    A.update((d) => editCell(d, 0, 0, (a) => ({ ...a, text: `t${i}` })));
    await A.engine.sync();
  }
  assert.ok(A.meta.gcDay, 'GC ran');
  assert.equal(cloud.files.has(replicaName(B.dev)), false, 'the old, merged B file is gone');
  assert.equal(A.meta.seen[replicaName(B.dev)], undefined);
  assert.ok(cloud.files.has(replicaName(A.dev)));
});

test('a read that fails on every file is ioError; a corrupt file is skipped until it changes', async () => {
  const world = makeWorld(22);
  const { cloud, A, B } = await pairOn(world);
  A.update((d) => editCell(d, 0, 3, (a) => ({ ...a, text: 'A' })));
  await A.engine.sync();
  B.hooks.read = async () => { throw Object.assign(new Error('t'), { code: 'E_TIMEOUT' }); };
  await B.engine.sync();
  assert.equal(B.engine.status().problem, 'ioError');
  B.hooks = {};
  await B.engine.sync();
  assert.equal(B.engine.status().phase, 'idle', 'the next try recovers');
  assert.equal(textOf(B.latest, 0, 3), 'A');
  cloud.t += 1000;
  cloud.files.set(replicaName(A.dev), { json: 'garbage', modified: cloud.t });
  await B.engine.sync();
  assert.equal(B.engine.status().phase, 'idle', 'garbage is skipped');
  assert.equal(textOf(B.latest, 0, 3), 'A');
});

test('turning off stops pushing and keeps the doc', async () => {
  const world = makeWorld(23);
  const { A } = await pairOn(world);
  await A.engine.setEnabled(false);
  assert.equal(A.engine.status().phase, 'off');
  assert.equal(A.meta.enabled, false);
  const w = A.writes;
  A.update((d) => editCell(d, 0, 0, (a) => ({ ...a, text: 'off' })));
  await A.engine.local();
  await A.engine.background();
  await A.engine.sync();
  assert.equal(A.writes, w);
  assert.equal(textOf(A.latest, 0, 0), 'off');
});

// ── 무작위 끼어들기: 두 기기, 200번의 고침과 받기 ───────────────────────────

/** 앱이 하는 고침 하나 */
function appEdit(r, doc, day, now) {
  const int = (n) => Math.floor(r() * n);
  const ti = int(8);
  const ai = int(8);
  const tok = () => `w${int(100000)}`;
  switch (int(8)) {
    case 0: case 1: case 2: return editCell(doc, ti, ai, (x) => ({ ...x, text: tok() }));
    case 3: return editCell(doc, ti, ai, (x) => ({ ...x, note: tok() }));
    case 4: return editCell(doc, ti, ai, (x) => ({ ...x, done: !x.done }));
    case 5: {
      const c = doc.themes[ti].actions[ai].kind === 'count' ? doc : editCell(doc, ti, ai, (x) => ({ ...x, text: x.text || '쌓기', kind: 'count' }));
      return addCount(c, ti, ai, 1, day);
    }
    case 6: return { ...doc, dayMeta: { ...doc.dayMeta, [day]: { ...doc.dayMeta[day], reflection: tok() } } };
    default: return { ...doc, centerGoal: tok() };
  }
}

/** 잃지 않음: 마지막 판 뒤에 낸 도장 중 가장 큰 것의 값이 맞춘 문서에 있다(카운터는 V2-F가 따로 본다) */
function checkNeverLost(world, devs, label) {
  const keys = devs.map((d) => docKey(d.latest));
  for (const k of keys) assert.equal(k, keys[0], `converged, ${label}`);
  const F = devs[0].port.replica();
  for (const d of devs) assert.equal(d.meta.epoch, F.epoch, `same epoch, ${label}`);
  const vals = project(migrate(JSON.parse(JSON.stringify(F.doc))));
  const latest = new Map();
  for (const key of world.issued.keys()) {
    const i = key.lastIndexOf('|');
    const p = key.slice(0, i);
    const st = key.slice(i + 1);
    if (!isStamp(st) || st <= F.epoch) continue;
    if (/^(fm|c\/[^/]+\/n|c\/[^/]+\/log\/)/.test(p)) continue;
    if (!latest.has(p) || latest.get(p) < st) latest.set(p, st);
  }
  for (const [p, st] of latest) {
    assert.equal(canon(vals.get(p) ?? null), world.issued.get(`${p}|${st}`), `${label}: ${p} keeps its latest edit`);
  }
}

test('fuzz: two devices converge after any interleaving of 200 edits, pulls, pushes, kills and resets — and lose no edit', async () => {
  for (let seed = 1; seed <= 30; seed++) {
    const world = makeWorld(100 + seed);
    const r = world.r;
    const { A, B } = await pairOn(world);
    const devs = [A, B];
    const pending = [];
    for (let i = 0; i < 200; i++) {
      world.wall += Math.floor(r() * 120_000) + 1;
      const d = devs[Math.floor(r() * 2)];
      const x = r();
      if (x < 0.5) {
        d.update((doc) => appEdit(r, doc, ymd(new Date(world.wall)), world.wall));
      } else if (x < 0.62) {
        // 내려받기가 늦게 끝나는 받기 — 그 사이 계속 고친다
        if (!d.hooks.read) {
          let rel;
          const gate = new Promise((res) => { rel = res; });
          d.hooks.read = async (name) => {
            await gate;
            const f = d.cloud.files.get(name);
            return f ? [f.json] : [];
          };
          pending.push(() => { d.hooks.read = null; rel(); });
          pending.push(d.engine.sync());
        }
      } else if (x < 0.72) {
        const rel = pending.find((p) => typeof p === 'function');
        if (rel) { pending.splice(pending.indexOf(rel), 1); rel(); await settle(); }
      } else if (x < 0.82) {
        pending.push(d.engine.local());
      } else if (x < 0.88) {
        pending.push(d.engine.background());
      } else if (x < 0.93) {
        // 꺼졌다 켜진다 — 걸려 있던 받기는 사라진다
        const rel = pending.filter((p) => typeof p === 'function');
        for (const f of rel) { pending.splice(pending.indexOf(f), 1); f(); }
        await settle();
        d.kill();
        await d.engine.boot();
      } else if (x < 0.96) {
        d.update((doc) => resetDoc(doc), 'epoch');
      } else {
        pending.push(d.engine.sync());
      }
      await tick();
    }
    for (const p of pending) if (typeof p === 'function') p();
    await Promise.all(pending.filter((p) => typeof p !== 'function'));
    await settle(20);
    for (const d of devs) d.hooks = {};
    await converge(A, B);
    for (const d of devs) assert.equal(d.engine.status().phase, 'idle', `seed ${seed}`);
    checkNeverLost(world, devs, `seed ${seed}`);
  }
});

// ── 살펴보기(probeRemote) ─────────────────────────────────────────────────

function fakeNative({ available = true, names = [], startOk = true, silent = false } = {}) {
  const n = { calls: [], listeners: new Set() };
  n.status = async () => (n.calls.push('status'), { available, account: available ? ACC : null });
  n.start = async () => {
    n.calls.push('start');
    if (startOk && !silent) setImmediate(() => { for (const l of n.listeners) l({ names }); });
    return startOk;
  };
  n.stop = async () => { n.calls.push('stop'); };
  n.addListener = (ev, cb) => {
    n.calls.push(`listen:${ev}`);
    n.listeners.add(cb);
    return { remove: () => { n.calls.push('remove'); n.listeners.delete(cb); } };
  };
  return n;
}

test('probe: listens before start, counts other replica files after the first gather, then stops', async () => {
  const own = replicaName(DEVS[0]);
  const n = fakeNative({ names: [own, replicaName(DEVS[1]), replicaName(DEVS[2]), 'Sync/v1/BAD.jsonz', 'other.txt'] });
  assert.deepEqual(await probe(n, { running: () => false, own }), { available: true, files: 2 });
  assert.deepEqual(n.calls, ['status', 'listen:onChange', 'start', 'remove', 'stop']);
  const m = fakeNative({ names: [replicaName(DEVS[1])] });
  assert.deepEqual(await probe(m, { running: () => true }), { available: true, files: 1 });
  assert.equal(m.calls.includes('stop'), false, 'the engine query keeps running');
  assert.deepEqual(await probe(fakeNative({ available: false }), { running: () => false }), { available: false, files: 0 });
  assert.deepEqual(await probe(fakeNative({ startOk: false }), { running: () => false }), { available: false, files: 0 });
  const silent = fakeNative({ silent: true });
  assert.deepEqual(await probe(silent, { running: () => false, timeoutMs: 20 }), { available: true, files: 0 });
  assert.ok(silent.calls.includes('remove') && silent.calls.includes('stop'));
});

// ── syncStatus: 엔진이 없으면(웹) 아무것도 하지 않는다 ────────────────────

function loadSyncStatus() {
  const resolve = Module._resolveFilename;
  Module._resolveFilename = function (req, ...rest) {
    if (req === 'expo') return 'fake-expo';
    return resolve.call(this, req, ...rest);
  };
  require.cache['fake-expo'] = { id: 'fake-expo', filename: 'fake-expo', loaded: true, exports: { requireOptionalNativeModule: () => null } };
  try {
    for (const f of ['src/lib/syncStatus.ts', 'modules/icloud-sync/index.ts']) delete require.cache[path.join(ROOT, f)];
    return require('../src/lib/syncStatus');
  } finally {
    Module._resolveFilename = resolve;
    delete require.cache['fake-expo'];
  }
}

test('syncStatus: off and inert without an engine (web); a bound engine drives it', async () => {
  const s = loadSyncStatus();
  assert.deepEqual(s.getSyncStatus(), { phase: 'off', enabled: false });
  await s.requestSync();
  await s.setSyncEnabled(true);
  await s.setChoice('merge');
  assert.deepEqual(await s.probeRemote(), { available: false, files: 0 }, 'no native module → no probe');
  assert.deepEqual(s.getSyncStatus(), { phase: 'off', enabled: false });
  const seen = [];
  const calls = [];
  const unsub = s.subscribeSyncStatus(() => seen.push(s.getSyncStatus().phase));
  const unbind = s.bindSyncDriver({
    sync: async () => { calls.push('sync'); },
    setEnabled: async (on, c) => { calls.push(`enable:${on}:${c}`); },
    choose: async (c) => { calls.push(`choose:${c}`); },
    watching: () => false,
    ownName: () => null,
  });
  await s.requestSync();
  await s.setSyncEnabled(true, 'adopt');
  await s.setChoice(null);
  assert.deepEqual(calls, ['sync', 'enable:true:adopt', 'choose:null']);
  s.publishSyncStatus({ phase: 'idle', enabled: true, at: 1 });
  unbind();
  assert.deepEqual(seen, ['idle', 'off']);
  unsub();
});

// ── 소스 지킴이 ─────────────────────────────────────────────────────────────

test('source guards: host, engine and status', () => {
  const host = src('src/hosts/ICloudSync.tsx');
  assert.match(host, /return null;\s*\}\s*$/);
  assert.match(host, /useSyncPort\(\)/);
  assert.match(host, /Platform\.OS === 'ios' && icloud !== null/);
  assert.match(host, /state === 'active'\) void e\.foreground\(\)/);
  assert.match(host, /state === 'background'\) void e\.background\(\)/);
  // 몰아 올리기는 5초, 새 판(처음부터 다시)은 되돌리기 토스트보다 오래(R-1 F2)
  assert.match(host, /const wait = epoch !== pushedEpoch\.current \? EPOCH_PUSH_DEBOUNCE_MS : PUSH_DEBOUNCE_MS;/);
  assert.match(host, /setTimeout\(\(\) => \{\s*pushedEpoch\.current = epoch;\s*void e\.local\(\);\s*\}, wait\)/);
  assert.match(host, /const epoch = port\.epoch\(\);/);
  // 엔진은 손잡이(syncCommit)에서만 — 웹 번들에 들어가지 않게(R-8 #5)
  assert.match(host, /import \{ createSyncEngine, EPOCH_PUSH_DEBOUNCE_MS, PUSH_DEBOUNCE_MS \} from '\.\.\/lib\/syncCommit';/);
  assert.doesNotMatch(host, /^import \{[^}]*\} from '\.\.\/lib\/syncEngine';/m);
  assert.match(host, /crash\.crumb\('sync', phase\)/);
  // 듣기를 start(boot) 전에
  assert.ok(host.indexOf("addListener('onChange'") < host.indexOf('e.boot()'));
  assert.equal(PUSH_DEBOUNCE_MS, 5000);
  // 되돌리기 토스트(행동이 있는 토스트 8초 — Snackbar toastLife)보다 길다. 스크린리더가 켜져 있으면 토스트는 닫힐 때까지 남는다:
  // 그 사이 뒤로 가면(background) 곧바로 올린다(R-1 F2가 받아들인 틈)
  const snack = src('src/overlays/Snackbar.tsx');
  const life = Number(/return t\.duration \?\? \(t\.action \? (\d+) : \d+\);/.exec(snack)[1]);
  assert.equal(life, 8000);
  assert.ok(EPOCH_PUSH_DEBOUNCE_MS > life, `${EPOCH_PUSH_DEBOUNCE_MS} > ${life}`);
  const eng = src('src/lib/syncEngine.ts');
  // 엔진은 기기 모듈을 타입으로만 안다(Node · 웹에서 불러도 된다)
  assert.match(eng, /import type \{[^}]+\} from '\.\.\/\.\.\/modules\/icloud-sync';/);
  assert.doesNotMatch(eng, /^import \{[^}]*\} from '\.\.\/\.\.\/modules/m);
  // 넣기는 기다리지 않는다 — applyPulled · applyMine은 async가 아니고 await가 없다
  for (const fn of ['applyPulled', 'applyMine']) {
    const start = eng.indexOf(`export function ${fn}(`);
    const body = eng.slice(start, eng.indexOf('\n}\n', start));
    assert.ok(start > 0, fn);
    assert.doesNotMatch(body, /await|\.then\(/, fn);
  }
  // 메타 고치기는 늘 updateMeta로(엔진은 메타를 직접 저장하지 않는다)
  assert.doesNotMatch(eng, /setMeta|putMerged/);
  const st = src('src/lib/syncStatus.ts');
  assert.match(st, /if \(!icloud\) return Promise\.resolve\(\{ available: false, files: 0 \}\);/);
  assert.doesNotMatch(src('src/lib/syncStatus.ts') + eng, /icloud\.list\(/);
});

test('R-1 F2: 새 판을 쓰는 중에 누른 되돌리기는 판을 거두지 않는다 — 그 파일을 다른 기기가 읽어도 두 기기 모두 표가 남는다', async () => {
  const world = makeWorld(31);
  const { cloud, A, B } = await pairOn(world);
  A.update((d) => editCell(d, 1, 1, (a) => ({ ...a, text: 'A의 칸' })));
  await converge(A, B);
  const snap = A.resetAll();
  let release;
  A.hooks.write = (name, json) => new Promise((resolve) => {
    release = () => {
      cloud.t += 1000;
      cloud.files.set(name, { json, modified: cloud.t });
      resolve();
    };
  });
  const pushing = A.engine.sync(); // 새 판을 올린다(쓰기가 붙잡혀 있다)
  for (let i = 0; i < 200 && !release; i++) await new Promise((r) => setTimeout(r, 1));
  assert.ok(release, '쓰는 중');
  assert.equal(A.writing, 1);
  assert.equal(A.undoReset(snap), false, '쓰는 중이면 판을 거두지 않고 replaceDoc');
  A.hooks = {};
  release();
  await pushing;
  assert.equal(A.writing, 0);
  // B가 A의 새 판 파일을 먼저 읽는다 — 그래도 A가 되살린 표는 새 도장이라 두 기기 모두 남는다
  world.wall += 1000;
  await B.engine.sync();
  await converge(A, B);
  assert.equal(textOf(A.latest, 1, 1), 'A의 칸');
  assert.equal(textOf(B.latest, 1, 1), 'A의 칸');
  assert.equal(A.latest.centerGoal, 'A의 목표');
});

test('R-1 F2: 아무것도 쓰지 않은 사이의 되돌리기는 판을 거둔다(쓰는 중이 아니면 빠른 길)', async () => {
  const world = makeWorld(32);
  const { A, B } = await pairOn(world);
  await converge(A, B);
  const epoch = A.meta.epoch;
  const snap = A.resetAll();
  assert.notEqual(A.meta.epoch, epoch);
  assert.equal(A.undoReset(snap), true);
  assert.equal(A.meta.epoch, epoch);
});

test('R-1 F2: 초기화한 문서는 오늘로 정리돼 있다 — 그 사이 아무것도 바꾸지 않는 받기가 편집 횟수를 올려 되돌리기를 막지 않는다', async () => {
  const world = makeWorld(33);
  const { A, B } = await pairOn(world);
  await converge(A, B);
  const snap = A.resetAll();
  assert.equal(A.latest.todayDate, ymd(new Date(world.wall)));
  const rev = A.rev;
  // 다른 기기가 다시 올린 것을 받는 한 바퀴(onChange) — 내용은 그대로
  world.wall += 1000;
  B.update((d) => editCell(d, 5, 5, (a) => ({ ...a, note: '' })));
  await B.engine.local();
  await A.engine.sync();
  assert.equal(A.rev, rev, '받은 것이 아무것도 바꾸지 않았으니 편집 횟수 그대로 — 되돌리기 알림이 거절하지 않는다');
  // 그 바퀴가 새 판을 올렸으니 판은 거두지 않고 replaceDoc — 표는 되살아난다
  assert.equal(A.undoReset(snap), false);
  assert.equal(A.latest.centerGoal, 'A의 목표');
});

test('R-1 F4: 오래 받지 못한 기기는 다른 기기 파일을 하나도 풀지 못해도 묻는다 — 깨진 파일 앞에서 올리지 않는다', async () => {
  const world = makeWorld(34);
  const { cloud, A, B } = await pairOn(world);
  await converge(A, B);
  world.wall += SYNC_TTL_MS + 24 * 3600e3;
  B.update((d) => editCell(d, 2, 2, (a) => ({ ...a, text: '오래 전' })));
  const aName = [...cloud.files.keys()].find((n) => devOfName(n) === A.dev);
  cloud.t += 1000;
  cloud.files.set(aName, { json: 'garbage', modified: cloud.t });
  const before = B.writes;
  await B.engine.sync();
  assert.equal(B.engine.status().phase, 'needsChoice');
  assert.equal(B.writes, before, '묻는 동안 올리지 않는다');
  await B.engine.choose('merge');
  assert.ok(B.writes > before, '고른 뒤에는 올린다');
});

test('R-8 #6: 받기는 풀기와 합치기 사이에 한 번 쉰다 — 그 사이의 고침도 합친 문서에 남고 다른 기기로 간다', async () => {
  const world = makeWorld(35);
  const { A, B } = await pairOn(world);
  await converge(A, B);
  A.update((d) => editCell(d, 3, 3, (a) => ({ ...a, text: 'A가 먼저' })));
  await A.engine.local();
  const real = global.setTimeout;
  let hooked = 0;
  global.setTimeout = (fn, ms, ...rest) => {
    if (ms === 0 && hooked === 0) {
      hooked += 1;
      // 쉬는 동안 B에서 누른 것
      B.update((d) => editCell(d, 4, 4, (a) => ({ ...a, text: '쉬는 동안' })));
    }
    return real(fn, ms, ...rest);
  };
  try {
    await B.engine.sync();
  } finally {
    global.setTimeout = real;
  }
  assert.equal(hooked, 1, '받기 안에서 한 번 쉬었다');
  assert.equal(textOf(B.latest, 3, 3), 'A가 먼저');
  assert.equal(textOf(B.latest, 4, 4), '쉬는 동안');
  await converge(A, B);
  assert.equal(textOf(A.latest, 4, 4), '쉬는 동안');
});
