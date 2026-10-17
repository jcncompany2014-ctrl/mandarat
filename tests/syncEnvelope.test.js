// V3-E — iCloud 저장 봉투와 저장소의 맞추기 손잡이(syncEnvelope · MandaratContext).
// - 봉투가 오가고, 이전 앱은 문서만 읽는다. 저장본 JSON에는 _sync · archives가 없다. 깨진 _sync는 meta === null.
// - 경합: 받는 동안 쓴 글은 applyRemote 뒤에도 남는다(옛 문서와 합친 결과가 되지 않는다).
// - 끼어들기 흉내: 두·세 기기가 고치기 · 받기 시작/끝(늦게 끝남) · 되돌리기 · 초기화 · 내려감(저장 후 다시 열기) ·
//   하루 정리 · '이 기기 기록으로'를 무작위로 섞어도, 다 맞춘 뒤 모든 경로는 그 경로에 마지막으로 낸 값을 갖는다.
// - 오늘 저장본(keepCopy)은 부른 순간의 문서, 판이 높은 복제본을 합치기 전에 남는다.
// - 소스 지킴: 도장은 메타가 있을 때만 commit에서, applyRemote는 기다리지 않고 그 순간의 문서를 읽는다.
require('./register');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { rng, fuzzDoc, fullDoc, mutate, canonArrays, withoutLocal } = require('./helpers/docFuzz');
const { blankDoc, migrate, sampleThemes } = require('../src/data/defaults');
const { resetDoc, startNewChart } = require('../src/lib/archive');
const { addCount, clearedAction } = require('../src/lib/kinds');
const { archiveCellLog } = require('../src/lib/history');
const { rolloverToday, toggleDayLog, ymd } = require('../src/lib/routine');
const { canon, project, isCounterPath } = require('../src/lib/syncProject');
const { cleanSyncMeta, newSyncMeta } = require('../src/lib/syncMeta');
const { isStamp, tagOfStamp } = require('../src/lib/syncStamp');
const { merge, replicaOf, adoptMerged } = require('../src/lib/syncMerge');
const { stampLocal } = require('../src/lib/syncLocal');
const { encodeReplica, decodeReplica } = require('../src/lib/syncFile');
const {
  SYNC_FIELD, parseStored, serializeStored, docOnlyJson, stampCommit, openStored, joinRemote, makeSyncPort,
} = require('../src/lib/syncEnvelope');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const DEVS = ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb', 'cccccccccccccccc'];
const T0 = Date.UTC(2026, 9, 1, 12, 0, 0);
const HOUR = 60 * 60 * 1000;

function metaFor(dev) {
  return cleanSyncMeta({ v: 1, dev, last: '', epoch: '', clock: {}, parts: {}, enabled: true, seen: {} });
}

function baseDoc() {
  return migrate({ ...blankDoc(), onboarded: true, centerGoal: '목표', themes: sampleThemes(new Date(2026, 8, 1)), todayDate: ymd(new Date(T0)) });
}

function editCell(doc, ti, ai, fn) {
  return { ...doc, themes: doc.themes.map((t, i) => (i === ti ? { ...t, actions: t.actions.map((a, j) => (j === ai ? fn(a) : a)) } : t)) };
}

/** 파일로 오간 복제본(늘 encode → decode를 거친다) */
function wire(R, at) {
  return decodeReplica(encodeReplica({ ...R, at }));
}

/** 정규형 — 판 · 시계 · 몫 · 순서를 뺀 문서 */
function replicaKey(R) {
  return canon({ e: R.epoch, c: R.clock, p: R.parts, d: canonArrays(withoutLocal(migrate(JSON.parse(JSON.stringify(R.doc))))) });
}

// ── 봉투 ─────────────────────────────────────────────────────────────────────

test('the envelope round-trips: serializeStored → parseStored gives the doc and the meta back', () => {
  const r = rng(1);
  for (let i = 0; i < 100; i++) {
    const doc = i === 0 ? fullDoc() : fuzzDoc(r);
    const meta = stampLocal(doc, mutate(r, doc), newSyncMeta(r), T0 + i);
    const raw = serializeStored(doc, meta);
    assert.ok(JSON.parse(raw)[SYNC_FIELD], 'the stored value carries _sync');
    const back = parseStored(raw);
    assert.deepEqual(back.doc, migrate(doc));
    assert.deepEqual(back.meta, cleanSyncMeta(meta));
    assert.deepEqual(back.meta, meta, 'a meta made by the store is already clean');
  }
});

test('without a meta the stored value is the plain doc (web · Android), and parseStored gives meta === null', () => {
  const doc = fullDoc();
  assert.equal(serializeStored(doc, null), JSON.stringify(doc));
  const back = parseStored(serializeStored(doc, null));
  assert.equal(back.meta, null);
  assert.deepEqual(back.doc, migrate(doc));
});

test('an older build reading the envelope keeps the doc: migrate drops _sync', () => {
  const r = rng(2);
  for (let i = 0; i < 50; i++) {
    const doc = fuzzDoc(r);
    const raw = serializeStored(doc, newSyncMeta(r));
    const old = migrate(JSON.parse(raw)); // 이전 앱의 읽기
    assert.equal(SYNC_FIELD in old, false);
    assert.deepEqual(old, migrate(doc));
  }
});

test('snapshot JSON has no _sync and no archives, and re-attaching the archives gives the doc back', () => {
  const doc = { ...fullDoc(), [SYNC_FIELD]: newSyncMeta(rng(3)) };
  const snap = JSON.parse(docOnlyJson(doc));
  assert.equal(SYNC_FIELD in snap, false);
  assert.equal('archives' in snap, false);
  assert.deepEqual({ ...migrate(snap), archives: fullDoc().archives }, migrate(fullDoc()));
});

test('garbage _sync gives meta === null (the doc still loads)', () => {
  const doc = fullDoc();
  for (const bad of [null, 1, 'x', [], {}, { v: 2, dev: DEVS[0] }, { v: 1, dev: 'NOPE' }, { v: 1 }, { v: 1, dev: 'a' }]) {
    const raw = JSON.stringify({ ...doc, [SYNC_FIELD]: bad });
    const back = parseStored(raw);
    assert.equal(back.meta, null, JSON.stringify(bad));
    assert.deepEqual(back.doc, migrate(doc));
  }
  assert.throws(() => parseStored('{not json'), 'a broken value is left to the caller (kept as a copy)');
});

test('openStored: a missing or broken meta becomes a new one (sync off), only on a platform with sync, and only the rollover is stamped', () => {
  const doc = baseDoc();
  const day0 = doc.todayDate;
  const made = [];
  const mk = () => { const m = newSyncMeta(rng(made.length + 7)); made.push(m); return m; };
  // 같은 날: 바뀐 것이 없다 — 도장 없음
  const same = openStored(serializeStored(doc, null), day0, T0, mk);
  assert.equal(made.length, 1);
  assert.equal(same.meta.enabled, false, 'a fresh meta never turns sync on by itself');
  assert.deepEqual(same.meta.clock, {});
  // 웹 · 안드로이드: 봉투가 있어도 메타를 쓰지 않는다
  assert.equal(openStored(serializeStored(doc, metaFor(DEVS[0])), day0, T0, null).meta, null);
  // 다음 날: 끝낸 오늘 칸이 빠진 것만 도장(지운 표시) — 다른 기기가 되살리지 않게
  let d = { ...doc, todayKeys: ['0-0', '0-1'], dayLog: { [day0]: ['0-0'] } };
  d = editCell(d, 0, 0, (a) => ({ ...a, kind: 'once', done: true }));
  const meta = metaFor(DEVS[0]);
  const next = openStored(serializeStored(d, meta), ymd(new Date(T0 + 30 * HOUR)), T0 + 30 * HOUR, mk);
  assert.notEqual(next.doc.todayDate, day0);
  const stamped = Object.keys(next.meta.clock);
  assert.deepEqual(stamped.sort(), Object.keys(stampLocal(migrate(d), next.doc, meta, T0 + 30 * HOUR).clock).sort());
  assert.ok(stamped.length > 0 && stamped.every((p) => p.startsWith('tk/')), stamped.join(','));
});

test('stampCommit: stamps only with a meta and a new doc; epoch restamps the kept doc; none leaves the meta alone', () => {
  const doc = baseDoc();
  const next = editCell(doc, 1, 1, (a) => ({ ...a, text: '새 글' }));
  assert.equal(stampCommit(doc, next, null, 'stamp', T0), null, 'no meta → no stamp (web · Android · before load)');
  const meta = metaFor(DEVS[0]);
  assert.equal(stampCommit(doc, doc, meta, 'stamp', T0), meta, 'same doc → same meta');
  assert.equal(stampCommit(doc, next, meta, 'none', T0), meta);
  assert.deepEqual(Object.keys(stampCommit(doc, next, meta, 'stamp', T0).clock), ['c/1-1/text']);
  const kept = resetDoc(doc);
  const ep = stampCommit(doc, kept, meta, 'epoch', T0);
  assert.ok(ep.epoch > meta.epoch);
  assert.deepEqual(Object.keys(ep.clock).sort(), [...project(kept).keys()].sort());
  for (const s of Object.values(ep.clock)) assert.ok(s > ep.epoch);
});

// ── 경합 ─────────────────────────────────────────────────────────────────────

test('race: an edit made while a pull was awaiting IO survives applyRemote (and the result is not the stale join)', () => {
  const r = rng(11);
  for (let i = 0; i < 60; i++) {
    let A = { doc: baseDoc(), meta: metaFor(DEVS[0]) };
    let B = { doc: baseDoc(), meta: metaFor(DEVS[1]) };
    // B가 고치고 A가 받기 시작한다 — A의 복제본을 읽어 둔 채(옛 방식) 기다린다
    const bNext = mutate(r, editCell(B.doc, 2, 2, (a) => ({ ...a, note: `B${i}` })));
    B = { doc: bNext, meta: stampLocal(B.doc, bNext, B.meta, T0 + 1000) };
    const remote = wire(replicaOf(B.doc, B.meta), T0 + 1000);
    const stale = replicaOf(A.doc, A.meta);
    // 기다리는 동안 A에서 쓴 글
    const typed = `A-${i}-${r().toString(36).slice(2, 6)}`;
    const aNext = editCell(A.doc, 5, 3, (a) => ({ ...a, text: typed }));
    A = { doc: aNext, meta: stampLocal(A.doc, aNext, A.meta, T0 + 2000) };
    // 받기가 끝난다 — 그 순간의 A와 합친다
    const j = joinRemote(A.doc, A.meta, remote, A.doc.todayDate, T0 + 3000);
    assert.equal(j.doc.themes[5].actions[3].text, typed, 'the edit typed during the pull is kept');
    assert.equal(j.doc.themes[2].actions[2].note, B.doc.themes[2].actions[2].note, 'the remote edit arrived');
    assert.ok(j.meta.clock['c/5-3/text'], 'and it keeps its stamp, so it propagates');
    // 옛 방식: 기다리기 전에 읽은 A와 합친 문서를 넣으면 그 글이 사라진다
    const old = merge(stale, remote);
    assert.notEqual(old.doc.themes[5].actions[3].text, typed);
    assert.notEqual(canon(j.doc), canon(old.doc), 'the result never equals the stale join');
    // B가 A를 받으면 그 글이 B에도 간다
    const back = joinRemote(B.doc, B.meta, wire(replicaOf(j.doc, j.meta), T0 + 4000), B.doc.todayDate, T0 + 4000);
    assert.equal(back.doc.themes[5].actions[3].text, typed);
  }
});

test('joinRemote: unchanged → the same doc object; a newer-schema replica changes nothing; the clock moves past the remote', () => {
  const doc = baseDoc();
  const meta = metaFor(DEVS[0]);
  const same = joinRemote(doc, meta, wire(replicaOf(doc, metaFor(DEVS[1])), T0), doc.todayDate, T0);
  assert.equal(same.changed, false);
  assert.equal(same.doc, doc);
  const newer = joinRemote(doc, meta, { newer: true, schema: 99, dev: DEVS[1] }, doc.todayDate, T0);
  assert.deepEqual(newer, { doc, meta, changed: false });
  const bNext = editCell(doc, 0, 0, (a) => ({ ...a, text: '먼 미래' }));
  const bMeta = stampLocal(doc, bNext, metaFor(DEVS[1]), T0 + 5 * HOUR);
  const j = joinRemote(doc, meta, wire(replicaOf(bNext, bMeta), T0), doc.todayDate, T0);
  assert.ok(j.changed);
  assert.ok(j.meta.last.slice(0, 11) >= bMeta.clock['c/0-0/text'].slice(0, 11), 'observe: the next local stamp is above every stamp received');
  const after = stampLocal(j.doc, editCell(j.doc, 0, 0, (a) => ({ ...a, text: '지금' })), j.meta, T0 + 1);
  assert.ok(after.clock['c/0-0/text'] > bMeta.clock['c/0-0/text'], 'a later local edit wins over the remote one');
});

// ── 저장소 흉내 ──────────────────────────────────────────────────────────────

/**
 * 저장소(MandaratProvider) 흉내 — 같은 함수(stampCommit · makeSyncPort · openStored · serializeStored)를 같은 순서로 쓴다.
 * issued: "경로|도장" → 그 도장을 낼 때 이 기기 문서의 값(canon, migrate 뒤) — 잃지 않음 검사에 쓴다.
 */
function storeSim(world, dev, doc) {
  const s = { dev, latest: doc, meta: metaFor(dev), rev: 0, inflight: [], undo: null, copies: [] };
  const record = (oldMeta, newMeta, d) => {
    if (!newMeta || newMeta === oldMeta) return;
    let vals = null;
    for (const [p, st] of Object.entries(newMeta.clock)) {
      if (oldMeta && oldMeta.clock[p] === st) continue;
      if (tagOfStamp(st) !== newMeta.tag) continue;
      const key = `${p}|${st}`;
      if (world.issued.has(key)) continue;
      vals = vals ?? project(migrate(JSON.parse(JSON.stringify(d))));
      world.issued.set(key, canon(vals.get(p) ?? null));
    }
  };
  s.commit = (next, how = 'stamp') => {
    const old = s.meta;
    s.meta = stampCommit(s.latest, next, s.meta, how, world.now(s));
    s.latest = next;
    record(old, s.meta, next);
  };
  s.update = (fn, how) => {
    s.rev += 1;
    s.commit(fn(s.latest), how);
  };
  s.replaceDoc = (d) => {
    s.rev += 1;
    s.commit(rolloverToday(d, world.today(s)));
  };
  s.port = makeSyncPort({
    doc: () => s.latest,
    meta: () => s.meta,
    setMeta: (m) => { record(s.meta, m, s.latest); s.meta = m; },
    putMerged: (d, m) => { record(s.meta, m, d); s.meta = m; s.rev += 1; s.commit(d, 'none'); },
    today: () => world.today(s),
    now: () => world.now(s),
    writeCopy: (d) => { s.copies.push({ json: docOnlyJson(d), epoch: s.meta.epoch }); return Promise.resolve(true); },
  });
  /** 내려가 저장하고(늘 latest와 그 메타를 함께) 앱이 닫힌 뒤 다시 연다 — 받던 것과 되돌리기는 사라진다 */
  s.kill = () => {
    const raw = serializeStored(s.latest, s.meta);
    const old = s.meta;
    const o = openStored(raw, world.today(s), world.now(s), () => newSyncMeta(Math.random));
    assert.equal(o.meta.dev, dev, 'the meta survives a relaunch');
    s.latest = o.doc;
    s.meta = o.meta;
    record(old, o.meta, o.doc);
    s.rev = 0;
    s.inflight = [];
    s.undo = null;
  };
  return s;
}

/** 앱이 하는 고침 하나(저장소 액션과 같은 모양 — 바뀐 갈래만 새 참조) */
function appEdit(r, doc, day, now) {
  const int = (n) => Math.floor(r() * n);
  const one = (xs) => xs[int(xs.length)];
  const ti = int(8);
  const ai = int(8);
  const key = `${ti}-${ai}`;
  const tok = () => `${one(['걷기', '책', 'Run', ''])}${int(1000)}`;
  switch (int(12)) {
    case 0: case 1: return editCell(doc, ti, ai, (x) => ({ ...x, text: tok() }));
    case 2: return editCell(doc, ti, ai, (x) => ({ ...x, note: tok() }));
    case 3: return editCell(doc, ti, ai, (x) => ({ ...x, done: !x.done }));
    case 4: return { ...doc, dayLog: toggleDayLog(doc.dayLog, key, day) };
    case 5: {
      const c = doc.themes[ti].actions[ai].kind === 'count' ? doc : editCell(doc, ti, ai, (x) => ({ ...x, text: x.text || '쌓기', kind: 'count' }));
      return addCount(c, ti, ai, one([1, 2, 0.5]), day);
    }
    case 6: return { ...doc, dayMeta: { ...doc.dayMeta, [day]: { ...doc.dayMeta[day], reflection: tok() } } };
    case 7: return { ...doc, todayKeys: doc.todayKeys.includes(key) ? doc.todayKeys.filter((k) => k !== key) : [...doc.todayKeys, key] };
    case 8: return {
      ...doc,
      todayKeys: doc.todayKeys.filter((k) => k !== key),
      dayLog: archiveCellLog(doc.dayLog, key, now),
      themes: doc.themes.map((t, i) => (i === ti ? { ...t, actions: t.actions.map((x, j) => (j === ai ? clearedAction(x) : x)) } : t)),
    };
    case 9: return { ...doc, settings: { ...doc.settings, reminders: { ...(doc.settings.reminders ?? {}), [one(['morning', 'evening'])]: one(['07:00', '21:30']) } } };
    case 10: return { ...doc, centerGoal: tok() };
    default: return startNewChart(doc, one(['continue', 'areas']), new Date(now), { goal: '', note: tok(), time: now }) ?? doc;
  }
}

function makeWorld(seed, n) {
  const r = rng(seed);
  let wall = T0;
  const world = {
    r, issued: new Map(),
    now: (s) => wall + s.skew,
    today: (s) => ymd(new Date(wall + s.skew)),
    tick: () => { wall += Math.floor(r() * (r() < 0.1 ? 20 * HOUR : 10 * 60 * 1000)); },
  };
  const base = r() < 0.3 ? migrate({ ...fuzzDoc(r), onboarded: true }) : baseDoc();
  world.devs = DEVS.slice(0, n).map((dev) => Object.assign(storeSim(world, dev, base), { skew: Math.floor((r() - 0.5) * 20000) }));
  return world;
}

/** 무작위로 끼어든 한 걸음 */
function step(world) {
  const { r, devs } = world;
  world.tick();
  const s = devs[Math.floor(r() * devs.length)];
  const x = r();
  if (x < 0.42) {
    const before = s.latest;
    s.update((d) => appEdit(r, d, world.today(s), world.now(s)));
    // 통째 바꾸기(템플릿 · 백업)처럼 되돌릴 수 있는 고침
    if (r() < 0.15 && s.latest !== before) s.undo = { snapshot: before, rev: s.rev };
  } else if (x < 0.6) {
    // 받기 시작 — 다른 기기의 파일을 그때 읽어 두고, 끝나는 것은 나중(그 사이 이 기기에서 계속 고친다)
    const o = devs[Math.floor(r() * devs.length)];
    if (o !== s) s.inflight.push(encodeReplica({ ...o.port.replica(), at: world.now(o) }));
  } else if (x < 0.78) {
    if (s.inflight.length > 0) {
      const i = Math.floor(r() * s.inflight.length);
      const [json] = s.inflight.splice(i, 1);
      s.port.applyRemote(decodeReplica(json));
    }
  } else if (x < 0.83) {
    // 처음부터 다시(resetAll) — 되돌릴 수 있다
    const before = s.latest;
    s.update((d) => resetDoc(d), 'epoch');
    s.undo = { snapshot: before, rev: s.rev };
  } else if (x < 0.89) {
    // 되돌리기(useSnapshotUndo): 그 사이 바뀐 게 없을 때만
    if (s.undo && s.rev === s.undo.rev) s.replaceDoc(s.undo.snapshot);
    s.undo = null;
  } else if (x < 0.94) {
    s.kill();
  } else if (x < 0.98) {
    s.commit(rolloverToday(s.latest, world.today(s)));
  } else {
    s.port.epochReset(); // '이 기기 기록으로 이어 써요'
  }
}

function converge(world) {
  const [hub, ...rest] = world.devs;
  const pull = (d, o) => d.port.applyRemote(wire(o.port.replica(), world.now(o)));
  for (let round = 0; round < 3; round++) {
    for (const d of rest) pull(hub, d);
    for (const d of rest) pull(d, hub);
  }
}

function checkNeverLost(world, label) {
  const reps = world.devs.map((d) => d.port.replica());
  const keys = reps.map(replicaKey);
  for (const k of keys) assert.equal(k, keys[0], `converged, ${label}`);
  const F = reps[0];
  const vals = project(migrate(JSON.parse(JSON.stringify(F.doc))));
  const latest = new Map();
  for (const key of world.issued.keys()) {
    const i = key.lastIndexOf('|');
    const p = key.slice(0, i);
    const st = key.slice(i + 1);
    if (!isStamp(st) || st <= F.epoch) continue;
    if (!latest.has(p) || st > latest.get(p)) latest.set(p, st);
  }
  let checked = 0;
  for (const [p, st] of latest) {
    if (isCounterPath(p)) continue;
    assert.equal(F.clock[p] ?? '', st, `latest stamp kept for ${p}, ${label}`);
    const want = world.issued.get(`${p}|${st}`);
    const got = canon(vals.get(p) ?? null);
    if (p === 'fs' && got !== want) {
      assert.ok(Number(got) <= Number(want), `fs clamped, ${label}`);
      continue;
    }
    assert.equal(got, want, `value of the latest edit kept for ${p}, ${label}`);
    checked++;
  }
  for (const [p, st] of Object.entries(F.clock)) {
    assert.ok(st > F.epoch, `no stamp at or below the epoch, ${p}`);
    if (!isCounterPath(p)) assert.ok(world.issued.has(`${p}|${st}`), `stamp ${st} for ${p} was issued, ${label}`);
  }
  return checked;
}

test('interleavings: edits, late pulls, undo, reset, relaunch, rollover and "mine" on 2–3 stores never lose an edit (120 histories)', () => {
  let checked = 0;
  for (let seed = 1; seed <= 120; seed++) {
    const world = makeWorld(seed * 31 + 7, 2 + (seed % 2));
    const steps = 40 + Math.floor(world.r() * 60);
    for (let k = 0; k < steps; k++) step(world);
    converge(world);
    checked += checkNeverLost(world, `seed ${seed}`);
  }
  assert.ok(checked > 2000, `enough paths were checked (${checked})`);
});

test('a pull that finishes late never takes back an edit made after it started (targeted, every edit kind)', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const world = makeWorld(seed + 500, 2);
    const [A, B] = world.devs;
    for (let k = 0; k < 10; k++) { world.tick(); B.update((d) => appEdit(world.r, d, world.today(B), world.now(B))); }
    const json = encodeReplica({ ...B.port.replica(), at: world.now(B) });
    // 받는 동안 A에서 고친다
    const startClock = A.meta.clock;
    const edits = [];
    for (let k = 0; k < 5; k++) {
      world.tick();
      const before = A.latest;
      A.update((d) => appEdit(world.r, d, world.today(A), world.now(A)));
      if (A.latest !== before) edits.push(A.latest);
    }
    const mine = A.latest;
    const typed = Object.keys(A.meta.clock).filter((p) => p.length > 0 && !isCounterPath(p) && !(p in startClock && startClock[p] === A.meta.clock[p]));
    const typedClock = A.meta.clock;
    const changed = A.port.applyRemote(decodeReplica(json));
    // 받는 동안 A에서 고친 경로는 모두 A가 둔 값 그대로(그 고침이 B의 것보다 늦다)
    const before = project(migrate(JSON.parse(JSON.stringify(mine))));
    const after = project(migrate(JSON.parse(JSON.stringify(A.latest))));
    for (const p of typed) {
      // 합친 뒤 다듬기(materialize M1 · 하루 정리)가 이 기기 도장으로 다시 정한 경로는 그 새 도장이 더 늦다 — 받은 옛 값이 아니다
      if (A.meta.clock[p] !== typedClock[p]) {
        assert.ok(A.meta.clock[p] > typedClock[p] && tagOfStamp(A.meta.clock[p]) === A.meta.tag, `${p} re-derived later, seed ${seed}`);
        continue;
      }
      assert.equal(canon(after.get(p) ?? null), canon(before.get(p) ?? null), `${p} kept, seed ${seed}`);
    }
    if (edits.length > 0) assert.ok(typed.length > 0);
    if (!changed) assert.equal(A.latest, mine, 'nothing new → the same doc (no re-render, no revision bump)');
    converge(world);
    checkNeverLost(world, `seed ${seed}`);
  }
});

test('applyRemote bumps the revision only when the doc changed — so an open undo toast cannot overwrite what arrived', () => {
  const world = makeWorld(77, 2);
  const [A, B] = world.devs;
  const snapshot = A.latest;
  A.update((d) => editCell(d, 0, 0, (a) => ({ ...a, text: '템플릿' })));
  const rev = A.rev;
  // 아무것도 바뀌지 않는 받기 — 되돌리기는 그대로 된다
  A.port.applyRemote(wire(replicaOf(A.latest, { ...A.meta, dev: B.dev }), world.now(B)));
  assert.equal(A.rev, rev);
  B.update((d) => editCell(d, 7, 7, (a) => ({ ...a, text: 'B에서' })));
  assert.equal(A.port.applyRemote(wire(B.port.replica(), world.now(B))), true);
  assert.equal(A.rev, rev + 1, 'a changing pull counts as a change');
  // 되돌리기 토스트는 이제 거절한다(useSnapshotUndo: revision() !== rev)
  assert.notEqual(A.rev, rev);
  assert.equal(A.latest.themes[7].actions[7].text, 'B에서');
  assert.notEqual(snapshot.themes[7].actions[7].text, 'B에서');
});

test('reset and its undo: the restored chart reaches the device that pulled the reset, and that device’s edits after it survive', () => {
  const world = makeWorld(91, 2);
  const [A, B] = world.devs;
  A.update((d) => editCell(d, 1, 1, (a) => ({ ...a, text: '지킬 글' })));
  converge(world);
  world.tick();
  const before = A.latest;
  A.update((d) => resetDoc(d), 'epoch');
  const undo = { snapshot: before, rev: A.rev };
  world.tick();
  B.port.applyRemote(wire(A.port.replica(), world.now(A)));
  assert.equal(B.latest.themes[1].actions[1].text, '', 'B took the reset');
  assert.equal(B.copies.length, 1, 'B kept a copy before applying the higher epoch');
  assert.match(B.copies[0].json, /지킬 글/);
  world.tick();
  // 되살린 표에서 비어 있는 자리(메모) — 같은 칸 글이면 더 늦은 되돌리기가 이긴다(보통의 나중 쓰기)
  assert.equal(before.themes[6].actions[6].note, '');
  B.update((d) => editCell(d, 6, 6, (a) => ({ ...a, note: '리셋 뒤 B' })));
  world.tick();
  assert.equal(A.rev, undo.rev);
  A.replaceDoc(undo.snapshot);
  converge(world);
  for (const s of [A, B]) {
    assert.equal(s.latest.themes[1].actions[1].text, '지킬 글', `${s.dev} has the restored chart`);
    assert.equal(s.latest.themes[6].actions[6].note, '리셋 뒤 B', `${s.dev} kept B's edit after the reset`);
  }
  checkNeverLost(world, 'reset-undo');
});

test('backgrounding writes the doc and its meta as one pair, so a relaunch keeps every stamp and the next pull loses nothing', () => {
  const world = makeWorld(101, 2);
  const [A, B] = world.devs;
  for (let k = 0; k < 20; k++) { world.tick(); A.update((d) => appEdit(world.r, d, world.today(A), world.now(A))); }
  const clock = A.meta.clock;
  A.kill();
  for (const [p, st] of Object.entries(clock)) assert.ok((A.meta.clock[p] ?? '') >= st, `stamp of ${p} survived the relaunch`);
  for (let k = 0; k < 20; k++) { world.tick(); B.update((d) => appEdit(world.r, d, world.today(B), world.now(B))); }
  converge(world);
  checkNeverLost(world, 'relaunch');
});

// ── 오늘 저장본 ──────────────────────────────────────────────────────────────

test('keepCopy writes the doc of the moment it was called, even if the doc changes before the write finishes', async () => {
  let doc = baseDoc();
  let release;
  const written = [];
  const port = makeSyncPort({
    doc: () => doc, meta: () => metaFor(DEVS[0]), setMeta() {}, putMerged() {}, today: () => doc.todayDate, now: () => T0,
    writeCopy: (d) => new Promise((res) => { release = () => { written.push(docOnlyJson(d)); res(true); }; }),
  });
  const p = port.keepCopy();
  doc = editCell(doc, 0, 0, (a) => ({ ...a, text: '고른 뒤' }));
  release();
  assert.equal(await p, true);
  assert.equal(JSON.parse(written[0]).themes[0].actions[0].text, baseDoc().themes[0].actions[0].text);
});

test('applyRemote of a higher epoch keeps a copy of the pre-merge doc first; a same-epoch pull does not', () => {
  const world = makeWorld(5, 2);
  const [A, B] = world.devs;
  A.update((d) => editCell(d, 2, 2, (a) => ({ ...a, text: 'A의 글' })));
  B.update((d) => editCell(d, 3, 3, (a) => ({ ...a, text: 'B의 글' })));
  A.port.applyRemote(wire(B.port.replica(), world.now(B)));
  assert.equal(A.copies.length, 0);
  world.tick();
  B.port.epochReset();
  world.tick();
  A.update((d) => editCell(d, 4, 4, (a) => ({ ...a, text: '맞추기 전' })));
  const pre = A.latest;
  A.port.applyRemote(wire(B.port.replica(), world.now(B)));
  assert.equal(A.copies.length, 1);
  assert.equal(A.copies[0].json, docOnlyJson(pre), 'the copy is the doc from before the merge');
  assert.equal(A.latest.themes[4].actions[4].text, '맞추기 전', 'a local edit made after the other device’s new epoch still stands');
  assert.equal(A.latest.themes[3].actions[3].text, 'B의 글');
});

test('port: replica() pairs the doc with its meta; updateMeta gets the current meta and doc; no meta → inert', () => {
  const world = makeWorld(9, 2);
  const [A] = world.devs;
  A.update((d) => editCell(d, 0, 1, (a) => ({ ...a, text: 'x' })));
  const R = A.port.replica();
  assert.equal(R.doc, A.latest);
  assert.equal(R.clock, A.meta.clock);
  let seen = null;
  A.port.updateMeta((m, d) => { seen = { m, d }; return { ...m, pulledAt: 5 }; });
  assert.equal(seen.d, A.latest);
  assert.equal(A.meta.pulledAt, 5);
  const inert = makeSyncPort({ doc: () => baseDoc(), meta: () => null, setMeta() { throw new Error('no'); }, putMerged() { throw new Error('no'); }, today: () => '', now: () => 0, writeCopy: async () => false });
  assert.equal(inert.replica(), null);
  assert.equal(inert.applyRemote(wire(A.port.replica(), T0)), false);
  inert.updateMeta(() => { throw new Error('not called'); });
  inert.epochReset();
});

test('adopt: an empty phone takes the iPad chart exactly; a phone with its own archives keeps them, unioned; a copy is kept first', () => {
  const world = makeWorld(303, 2);
  const [P, I] = world.devs;
  // 아이패드: 고친 표와 지난 표 하나
  for (let k = 0; k < 15; k++) { world.tick(); I.update((d) => appEdit(world.r, d, world.today(I), world.now(I))); }
  world.tick();
  I.update((d) => startNewChart(d, 'continue', new Date(world.now(I)), { goal: '', note: 'iPad', time: world.now(I) }) ?? d);
  // 빈 아이폰
  P.latest = migrate({ ...blankDoc(), todayDate: world.today(P) });
  P.meta = metaFor(P.dev);
  assert.equal(P.port.adopt(wire(I.port.replica(), world.now(I))), true);
  assert.deepEqual(canonArrays(withoutLocal(migrate(JSON.parse(JSON.stringify(P.latest))))), canonArrays(withoutLocal(migrate(JSON.parse(JSON.stringify(I.latest))))));
  assert.equal(P.meta.epoch, I.meta.epoch);
  assert.equal(P.copies.length, 0, 'nothing onboarded to keep — today’s copy is not overwritten with an empty chart');
  // 지난 표가 있는 아이폰
  const world2 = makeWorld(304, 2);
  const [P2, I2] = world2.devs;
  world2.tick();
  P2.update((d) => startNewChart(d, 'blank', new Date(world2.now(P2) - 400 * 24 * HOUR), { goal: '', note: 'phone', time: world2.now(P2) }) ?? d);
  const mine = P2.latest.archives.map((a) => a.id);
  for (let k = 0; k < 10; k++) { world2.tick(); I2.update((d) => appEdit(world2.r, d, world2.today(I2), world2.now(I2))); }
  world2.tick();
  I2.update((d) => startNewChart(d, 'continue', new Date(world2.now(I2)), { goal: '', note: 'iPad', time: world2.now(I2) }) ?? d);
  const theirs = (I2.latest.archives ?? []).map((a) => a.id);
  const pre = P2.latest;
  P2.port.adopt(wire(I2.port.replica(), world2.now(I2)));
  assert.equal(P2.copies.length, 1);
  assert.equal(P2.copies[0].json, docOnlyJson(pre));
  const ids = (P2.latest.archives ?? []).map((a) => a.id);
  for (const id of [...mine, ...theirs]) assert.ok(ids.includes(id), `archive ${id} kept`);
  assert.equal(P2.latest.centerGoal, I2.latest.centerGoal);
  // 아이패드가 아이폰을 받으면 아이폰의 지난 표도 간다 — 그리고 둘은 같아진다
  converge(world2);
  for (const id of mine) assert.ok(I2.latest.archives.some((a) => a.id === id));
  // 고른 기기의 다른 고침은 바꾼 것(adopt) — 저장본(위)에 남는다. 둘은 같아진다
  const keys = world2.devs.map((d) => replicaKey(d.port.replica()));
  assert.equal(keys[0], keys[1]);
});

// ── 소스 지킴 ────────────────────────────────────────────────────────────────

function body(s, start, end) {
  const i = s.indexOf(start);
  assert.ok(i >= 0, start);
  const j = s.indexOf(end, i + start.length);
  assert.ok(j > i, end);
  return s.slice(i, j);
}

test('source: the store stamps in commit only through stampCommit (which needs a meta), and only on iOS', () => {
  const s = src('src/store/MandaratContext.tsx');
  assert.match(s, /const SYNC_ON = Platform\.OS === 'ios';/);
  assert.match(s, /const makeMeta = SYNC_ON \? \(\) => newSyncMeta\(Math\.random\) : null;/);
  const commit = body(s, 'const commit = useCallback(', '}, []);');
  assert.match(commit, /metaRef\.current = stampCommit\(latest\.current, next, metaRef\.current, how, Date\.now\(\)\);\s*latest\.current = next;\s*setDoc\(next\);/);
  assert.equal((s.match(/stampLocal|epochReset\(/g) ?? []).length, 0, 'the store never stamps outside commit and the port');
  assert.equal((s.match(/stampCommit\(/g) ?? []).length, 1);
  const env = src('src/lib/syncEnvelope.ts');
  assert.match(body(env, 'export function stampCommit(', '\n}\n'), /if \(!meta \|\| next === prev \|\| how === 'none'\) return meta;/);
  // 초기화는 새 판, 받은 것을 넣을 때는 도장 없이
  assert.match(body(s, 'const resetAll = useCallback', 'const applyTemplate = useCallback'), /update\(\(d\) => resetDoc\(d\), 'epoch'\)/);
  const host = body(s, 'makeSyncPort({', '}),');
  assert.match(host, /doc: \(\) => latest\.current,/);
  assert.match(host, /meta: \(\) => metaRef\.current,/);
  assert.match(host, /putMerged: \(d, m\) => \{\s*metaRef\.current = m;\s*revRef\.current \+= 1;\s*commit\(d, 'none'\);/);
  assert.match(s, /<SyncPortCtx\.Provider value=\{portOn \? port : null\}>/);
  assert.match(s, /export function useSyncPort\(\): SyncPort \| null \{\s*return useContext\(SyncPortCtx\);/);
});

test('source: applyRemote reads the doc and meta inside its own body and awaits nothing; it stamps only through joinRemote', () => {
  const env = src('src/lib/syncEnvelope.ts');
  const apply = body(env, '    applyRemote(remote) {', '\n    },\n');
  assert.match(apply, /const doc = host\.doc\(\);\s*const meta = host\.meta\(\);/);
  assert.doesNotMatch(apply, /\bawait\b|\.then\(|async/);
  assert.doesNotMatch(apply, /stampLocal|epochReset/);
  assert.match(apply, /joinRemote\(doc, meta, remote, host\.today\(\), host\.now\(\)\)/);
  assert.match(apply, /if \(r\.changed\) host\.putMerged\(r\.doc, r\.meta\);/);
  const adopt = body(env, '    adopt(remote) {', '\n    },\n');
  assert.match(adopt, /const local = host\.doc\(\);\s*const meta = host\.meta\(\);/);
  assert.doesNotMatch(adopt, /\bawait\b|\.then\(|async/);
  assert.match(adopt, /void keepCopy\(\);[\s\S]*unionArchives\(local\.archives, remote\.doc\.archives\)/);
  const keep = body(env, 'const keepCopy = (): Promise<boolean> => {', '\n  };');
  assert.match(keep, /const doc = host\.doc\(\);\s*return doc\.onboarded \? host\.writeCopy\(doc\) : Promise\.resolve\(false\);/);
});

test('source: persist writes the envelope of latest.current, snapshots are doc-only, and the guard lines stay verbatim', () => {
  const s = src('src/store/MandaratContext.tsx');
  assert.match(s, /const json = serializeStored\(d, metaRef\.current\);/);
  const calls = s.match(/persist\([^)]*\)/g).filter((c) => c !== 'persist(d: MandaratDoc)');
  assert.ok(calls.length >= 3);
  for (const c of calls) assert.equal(c, 'persist(latest.current)', 'the doc written is always the one the meta pairs with');
  assert.match(s, /AsyncStorage\.setItem\(mine, docOnlyJson\(d\)\)/);
  assert.doesNotMatch(s, /JSON\.stringify\(/, 'the store writes only through serializeStored · docOnlyJson');
  assert.match(s, /commit\(rolloverToday\(latest\.current, k\)\)/);
  assert.match(s, /queueMicrotask\(\(\) => \{[\s\S]{0,200}void persist\(latest\.current\);/);
  assert.match(s, /loaded = openStored\(read\.raw, dateKey\(\), Date\.now\(\), makeMeta\);/);
  assert.match(s, /if \(loaded\) commit\(loaded\.doc, 'none'\);/);
});
