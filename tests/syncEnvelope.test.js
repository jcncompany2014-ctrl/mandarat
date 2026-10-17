// V3-E — iCloud 저장 봉투와 저장소의 맞추기 손잡이(syncEnvelope · MandaratContext).
// - 봉투가 오가고, 이전 앱은 문서만 읽는다. 저장본 JSON에는 _sync · archives가 없다. 깨진 _sync는 meta === null.
// - 경합: 받는 동안 쓴 글은 applyRemote 뒤에도 남는다(옛 문서와 합친 결과가 되지 않는다).
// - 끼어들기 흉내: 두·세 기기가 고치기 · 받기 시작/끝(늦게 끝남) · 되돌리기 · 초기화 · 내려감(저장 후 다시 열기) ·
//   하루 정리 · '이 기기 기록으로'를 무작위로 섞어도, 다 맞춘 뒤 모든 경로는 그 경로에 마지막으로 낸 값을 갖는다.
// - 오늘 저장본(keepCopy)은 부른 순간의 문서, 판이 높은 복제본을 합치기 전에 남는다.
// - 소스 지킴: 도장은 메타가 있을 때만, 미뤄서(저장 · 손잡이 읽기 전 flush — R-8 #3), applyRemote는 기다리지 않고 그 순간의 문서를 읽는다.
// - 처음부터 다시의 되돌리기: 새 판을 올리기 전이면 판까지 거둔다 — 다른 기기의 맞추지 않은 기록이 남는다(R-1 F2).
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
const { stampLocal, epochReset, changedPaths } = require('../src/lib/syncLocal');
const { toggleCountToday } = require('../src/lib/kinds');
const { partsSum } = require('../src/lib/syncProject');
const { heavyDoc } = require('./helpers/heavyDoc');
const { encodeReplica, decodeReplica, replicaDigest } = require('../src/lib/syncFile');
const {
  SYNC_FIELD, parseStored, serializeStored, docOnlyJson, stampCommit, openStored, joinRemote, makeSyncPort,
  stampPending, commitMeta, undoResetMeta,
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
 * 저장소(MandaratProvider) 흉내 — 같은 함수(commitMeta · stampPending · makeSyncPort · openStored · serializeStored ·
 * undoResetMeta)를 같은 순서로 쓴다. 도장은 미뤄서: commit은 문서만, 저장 · 손잡이 읽기 전에 flush(R-8 #3).
 * issued: "경로|도장" → 그 도장을 낼 때 이 기기 문서의 값(canon, migrate 뒤) — 잃지 않음 검사에 쓴다.
 * 다른 기기가 이 기기 복제본을 읽는 것은 올리기와 같다(publish — pushed 지문을 남긴다).
 */
function storeSim(world, dev, doc) {
  const s = { dev, latest: doc, stamped: doc, meta: metaFor(dev), rev: 0, inflight: [], undo: null, copies: [], resetUndo: null, sinceReset: null };
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
      if (s.sinceReset) s.sinceReset.push(key);
    }
  };
  s.flush = () => {
    const old = s.meta;
    s.meta = stampPending(s.stamped, s.latest, s.meta, world.now(s));
    s.stamped = s.latest;
    record(old, s.meta, s.latest);
  };
  s.commit = (next, how = 'stamp') => {
    const old = s.meta;
    const prev = s.latest;
    const c = commitMeta(prev, next, s.meta, s.stamped, how, world.now(s));
    // 'epoch' · 'none'은 밀린 도장을 prev에 맞춰 먼저 찍는다 — 그 값으로 남기고, 새 판의 도장은 next 값으로
    if (how !== 'stamp' && c.meta !== old) {
      const flushed = stampPending(s.stamped, prev, old, world.now(s));
      record(old, flushed, prev);
      record(flushed, c.meta, next);
    }
    s.meta = c.meta;
    s.stamped = c.stamped;
    s.latest = next;
  };
  s.update = (fn, how) => {
    s.rev += 1;
    s.commit(fn(s.latest), how);
  };
  s.replaceDoc = (d) => {
    s.rev += 1;
    s.commit(rolloverToday(d, world.today(s)));
  };
  // 처음부터 다시와 그 되돌리기(MandaratContext resetAll · undoReset)
  s.resetAll = () => {
    s.flush();
    const before = s.latest;
    const meta = s.meta;
    s.sinceReset = [];
    s.update((d) => resetDoc(d), 'epoch');
    s.resetUndo = { doc: before, rev: s.rev, mark: { before: meta, epoch: s.meta.epoch, ...(meta.pushed ? { pushed: meta.pushed } : {}) } };
    return before;
  };
  /** 되돌리기 토스트(useResetUndo) — 그 사이 바뀐 게 없을 때만 부른다. 판까지 거두었으면 true */
  s.undoReset = (snapshot) => {
    const u = s.resetUndo;
    s.resetUndo = null;
    s.flush();
    const restored = u && u.doc === snapshot && u.rev === s.rev ? undoResetMeta(u.mark, s.meta) : null;
    const dropped = s.sinceReset ?? [];
    s.sinceReset = null;
    if (!restored) {
      s.replaceDoc(snapshot);
      return false;
    }
    // 올리지 않은 새 판의 도장은 아무도 보지 못했다 — 낸 적 없는 것으로
    for (const k of dropped) world.issued.delete(k);
    s.rev += 1;
    s.meta = restored;
    s.commit(snapshot, 'none');
    s.commit(rolloverToday(snapshot, world.today(s)));
    return true;
  };
  s.port = makeSyncPort({
    doc: () => s.latest,
    meta: () => s.meta,
    flush: () => s.flush(),
    setMeta: (m) => { record(s.meta, m, s.latest); s.meta = m; },
    putMerged: (d, m) => { record(s.meta, m, d); s.meta = m; s.rev += 1; s.commit(d, 'none'); },
    today: () => world.today(s),
    now: () => world.now(s),
    writeCopy: (d) => { s.copies.push({ json: docOnlyJson(d), epoch: s.meta.epoch }); return Promise.resolve(true); },
  });
  /** 다른 기기가 읽을 복제본 — 올리기(엔진 push)처럼 지문을 남긴다 */
  s.publish = () => {
    const rep = s.port.replica();
    s.port.updateMeta((m) => ({ ...m, pushed: replicaDigest(rep) }));
    s.sinceReset = null;
    return rep;
  };
  /** 내려가 저장하고(늘 latest와 그 메타를 함께, 밀린 도장을 먼저) 앱이 닫힌 뒤 다시 연다 — 받던 것과 되돌리기는 사라진다 */
  s.kill = () => {
    s.flush();
    const raw = serializeStored(s.latest, s.meta);
    const old = s.meta;
    const o = openStored(raw, world.today(s), world.now(s), () => newSyncMeta(Math.random));
    assert.equal(o.meta.dev, dev, 'the meta survives a relaunch');
    s.latest = o.doc;
    s.stamped = o.doc;
    s.meta = o.meta;
    record(old, o.meta, o.doc);
    s.rev = 0;
    s.inflight = [];
    s.undo = null;
    s.resetUndo = null;
    s.sinceReset = null;
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
    tick: () => {
      // 저장소는 고친 뒤 300ms 안에 저장하며 밀린 도장을 찍는다 — 대개는 시간이 흐르기 전에 찍혀 있고,
      // 가끔(연달아 고치는 동안) 다음 걸음까지 밀린다(R-8 #3)
      for (const s of world.devs ?? []) if (r() < 0.8) s.flush();
      wall += Math.floor(r() * (r() < 0.1 ? 20 * HOUR : 10 * 60 * 1000));
    },
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
    if (o !== s) s.inflight.push(encodeReplica({ ...o.publish(), at: world.now(o) }));
  } else if (x < 0.78) {
    if (s.inflight.length > 0) {
      const i = Math.floor(r() * s.inflight.length);
      const [json] = s.inflight.splice(i, 1);
      s.port.applyRemote(decodeReplica(json));
    }
  } else if (x < 0.83) {
    // 처음부터 다시(resetAll) — 되돌릴 수 있다(useResetUndo → undoReset)
    s.undo = { snapshot: s.resetAll(), rev: s.rev, reset: true };
  } else if (x < 0.89) {
    // 되돌리기(useSnapshotUndo · useResetUndo): 그 사이 바뀐 게 없을 때만
    if (s.undo && s.rev === s.undo.rev) {
      if (s.undo.reset) s.undoReset(s.undo.snapshot);
      else s.replaceDoc(s.undo.snapshot);
    }
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
  const pull = (d, o) => d.port.applyRemote(wire(o.publish(), world.now(o)));
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
    // 받는 동안 A에서 고친다 — 도장은 미뤄 찍으니(R-8 #3) 손잡이로 한 번 읽어(flush) 시작 시계를 잡는다
    const startClock = A.port.meta().clock;
    const edits = [];
    for (let k = 0; k < 5; k++) {
      world.tick();
      const before = A.latest;
      A.update((d) => appEdit(world.r, d, world.today(A), world.now(A)));
      if (A.latest !== before) edits.push(A.latest);
    }
    const mine = A.latest;
    // 받는 동안 고친 것의 도장은 다음 저장 · 손잡이 읽기가 찍는다 — applyRemote도 먼저 그렇게 한다
    A.port.meta();
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

test('R-1 F2: B’s unsynced edit from before A’s reset + undo survives when A pulls B and when B pulls A', () => {
  const world = makeWorld(92, 2);
  const [A, B] = world.devs;
  A.update((d) => editCell(d, 1, 1, (a) => ({ ...a, text: '지킬 글' })));
  converge(world);
  const epoch0 = A.meta.epoch;
  world.tick();
  // B가 쓰고 아직 올리지 않았다
  const day = world.today(B);
  B.update((d) => ({ ...d, dayMeta: { ...d.dayMeta, [day]: { ...d.dayMeta[day], reflection: 'B가 아침에 쓴 글' } } }));
  world.tick();
  // A: 처음부터 다시 → 몇 초 뒤 되돌리기(새 판은 아직 올리지 않았다 — 토스트보다 오래 기다린다)
  const snapshot = A.resetAll();
  assert.ok(A.meta.epoch > epoch0, 'the reset raised the epoch');
  world.tick();
  assert.equal(A.undoReset(snapshot), true, 'the unpushed epoch is taken back');
  assert.equal(A.meta.epoch, epoch0, 'A is back on the epoch from before the reset');
  assert.equal(A.latest.themes[1].actions[1].text, '지킬 글');
  // A가 B를 받고, B가 A를 받는다
  A.port.applyRemote(wire(B.publish(), world.now(B)));
  B.port.applyRemote(wire(A.publish(), world.now(A)));
  for (const s of [A, B]) {
    assert.equal(s.latest.dayMeta[day]?.reflection, 'B가 아침에 쓴 글', `${s.dev} kept B's unsynced edit`);
    assert.equal(s.latest.themes[1].actions[1].text, '지킬 글', `${s.dev} has A's chart`);
  }
  assert.equal(B.copies.length, 0, 'no higher epoch ever reached B');
  converge(world);
  checkNeverLost(world, 'reset-undo before push');
});

test('R-1 F2: once the reset epoch was pushed, its undo falls back to replaceDoc (the epoch stays; the copy on B keeps the edit)', () => {
  const world = makeWorld(93, 2);
  const [A, B] = world.devs;
  converge(world);
  const day = world.today(B);
  B.update((d) => ({ ...d, dayMeta: { ...d.dayMeta, [day]: { reflection: 'B 글' } } }));
  world.tick();
  const snapshot = A.resetAll();
  const epoch = A.meta.epoch;
  B.port.applyRemote(wire(A.publish(), world.now(A))); // 올렸다 — B가 새 판을 받았다
  world.tick();
  assert.equal(A.undoReset(snapshot), false, 'pushed → not taken back');
  assert.equal(A.meta.epoch, epoch);
  assert.deepEqual(A.latest.themes, snapshot.themes, 'the chart still comes back, restamped');
  assert.equal(B.copies.length, 1);
  assert.match(B.copies[0].json, /B 글/, 'B kept a copy before applying the higher epoch');
  converge(world);
  checkNeverLost(world, 'reset-undo after push');
});

test('R-1 probe p2 (regression): reset → undo before a push leaves B’s reflection; the old undo through replaceDoc erased it', () => {
  const T = Date.UTC(2026, 9, 17, 9);
  const day = '2026-10-17';
  const base = migrate({ ...blankDoc(), onboarded: true, centerGoal: 'goal', themes: sampleThemes(new Date(2026, 9, 1)), todayDate: day });
  const edit = (d, next, how, t) => { d.meta = stampCommit(d.doc, next, d.meta, how, t); d.doc = next; };
  const run = (undo) => {
    const A = { doc: base, meta: metaFor(DEVS[0]) };
    const B = { doc: base, meta: metaFor(DEVS[1]) };
    edit(B, { ...B.doc, dayMeta: { [day]: { reflection: 'B wrote this at 09:00' } } }, 'stamp', T);
    const before = { doc: A.doc, meta: A.meta };
    edit(A, resetDoc(A.doc), 'epoch', T + 60e3); // resetAll
    undo(A, before, { before: before.meta, epoch: A.meta.epoch });
    assert.equal(A.doc.centerGoal, 'goal');
    return joinRemote(B.doc, B.meta, wire(replicaOf(A.doc, A.meta), T + 100e3), day, T + 120e3).doc.dayMeta[day] ?? null;
  };
  // undoReset: 판까지 거둔다
  const kept = run((A, before, mark) => {
    const restored = undoResetMeta(mark, A.meta);
    assert.ok(restored);
    A.meta = restored;
    A.doc = before.doc;
  });
  assert.deepEqual(kept, { reflection: 'B wrote this at 09:00' });
  // 예전 되돌리기(replaceDoc → 'stamp') — 새 판이 남아 B의 글을 지웠다(R-1 F2의 재현)
  const lost = run((A, before) => edit(A, before.doc, 'stamp', T + 62e3));
  assert.equal(lost, null);
});

test('undoResetMeta: only for the same unpushed epoch; restores epoch · clock · parts · seen and keeps identity, switch and the clock’s last', () => {
  const doc = baseDoc();
  const m0 = { ...stampLocal(doc, editCell(doc, 0, 0, (a) => ({ ...a, text: 'x' })), metaFor(DEVS[0]), T0), seen: { 'a.jsonz': 1 }, pushed: 'p0', account: 'acc' };
  const reset = { ...epochReset(m0, T0 + 1000, resetDoc(doc)), seen: { 'a.jsonz': 1, 'b.jsonz': 2 }, pulledAt: T0 + 2000 };
  const mark = { before: m0, epoch: reset.epoch, pushed: 'p0' };
  const back = undoResetMeta(mark, reset);
  assert.equal(back.epoch, m0.epoch);
  assert.equal(back.clock, m0.clock);
  assert.equal(back.parts, m0.parts);
  assert.deepEqual(back.seen, m0.seen, 'files read in between are read again');
  assert.equal(back.last, reset.last, 'the clock only moves forward');
  assert.equal(back.pulledAt, reset.pulledAt);
  assert.equal(back.dev, reset.dev);
  assert.equal(undoResetMeta(mark, { ...reset, pushed: 'p1' }), null, 'pushed since → no');
  assert.equal(undoResetMeta(mark, { ...reset, pushed: undefined }), null);
  assert.equal(undoResetMeta(mark, { ...reset, epoch: m0.epoch }), null, 'another epoch arrived → no');
  assert.equal(undoResetMeta(null, reset), null);
  assert.equal(undoResetMeta(mark, null), null, 'no meta (web) → replaceDoc');
  assert.equal(undoResetMeta({ before: m0, epoch: reset.epoch }, { ...reset, pushed: undefined }) !== null, true, 'never pushed before or after');
  // 켜기를 그 사이 껐으면 그대로 꺼져 있다(되돌리기가 맞추기를 다시 켜지 않는다)
  assert.equal(undoResetMeta(mark, { ...reset, enabled: false }).enabled, false);
});

// ── 미뤄 찍는 도장(R-8 #3) ───────────────────────────────────────────────────

test('lazy stamp: a commit leaves the meta alone; the next persist or port read stamps the net change once', () => {
  const world = makeWorld(41, 2);
  const [A] = world.devs;
  A.port.meta();
  const m0 = A.meta;
  const d0 = A.latest;
  A.update((d) => editCell(d, 2, 2, (a) => ({ ...a, text: '하나' })));
  A.update((d) => editCell(d, 3, 3, (a) => ({ ...a, note: '메모' })));
  A.update((d) => editCell(d, 3, 3, (a) => ({ ...a, note: d0.themes[3].actions[3].note }))); // 되돌려 놓았다
  assert.equal(A.meta, m0, 'commits do not touch the meta (no clock copy per tap)');
  const m = A.port.meta();
  assert.notEqual(m, m0);
  const stamped = Object.keys(m.clock).filter((p) => m.clock[p] !== m0.clock[p]);
  assert.deepEqual(stamped, ['c/2-2/text'], 'one stamp for the net change; the edit that was undone is not stamped');
  assert.deepEqual(stamped, [...changedPaths(d0, A.latest).keys()]);
  assert.equal(A.port.meta(), m, 'nothing pending → the same meta');
  // 저장(kill = persist 뒤 다시 열기)도 먼저 찍는다
  A.update((d) => editCell(d, 4, 4, (a) => ({ ...a, text: '저장 전' })));
  A.kill();
  assert.ok(A.meta.clock['c/4-4/text'] > m.clock['c/2-2/text'], 'persist flushed the pending stamp');
});

test('lazy stamp: \'epoch\' and \'none\' commits stamp what was pending first; counters keep the net delta', () => {
  const doc = baseDoc();
  const meta = metaFor(DEVS[0]);
  const pending = editCell(doc, 0, 0, (a) => ({ ...a, text: '밀린 글' }));
  const merged = editCell(pending, 7, 7, (a) => ({ ...a, note: '받은 것' }));
  const none = commitMeta(pending, merged, meta, doc, 'none', T0);
  assert.deepEqual(Object.keys(none.meta.clock), ['c/0-0/text'], "'none' flushed the pending edit and added nothing for the merge");
  assert.equal(none.stamped, merged);
  const ep = commitMeta(pending, resetDoc(pending), meta, doc, 'epoch', T0);
  assert.ok(ep.meta.epoch > '', 'new epoch');
  for (const s of Object.values(ep.meta.clock)) assert.ok(s > ep.meta.epoch);
  const st = commitMeta(doc, pending, meta, doc, 'stamp', T0);
  assert.equal(st.meta, meta);
  assert.equal(st.stamped, doc);
  assert.equal(stampPending(doc, doc, meta, T0), meta);
  assert.equal(stampPending(doc, pending, null, T0), null, 'no meta (web) → nothing');
  // 쌓기 +1, +1, −1을 한 번에: 몫은 합(+1)만큼
  let c = editCell(doc, 1, 1, (a) => ({ ...a, text: '물', kind: 'count', goal: 8 }));
  const start = c;
  for (const delta of [1, 1, -1]) c = addCount(c, 1, 1, delta, doc.todayDate);
  const flushed = stampPending(start, c, meta, T0);
  assert.equal(partsSum(flushed.parts['c/1-1/n']), 100, 'net +1 (units of 1/100)');
});

test('R-8 #3 timing guard: 50 checkToday commits on the 3-year doc cost under 1 ms each (median) in Node, and one flush stamps them', () => {
  const doc = heavyDoc();
  const day = '2026-10-02';
  let meta = epochReset(metaFor(DEVS[0]), T0, doc);
  assert.ok(Object.keys(meta.clock).length > 20000, 'a heavy clock');
  let latest = doc;
  let stamped = doc;
  const times = [];
  for (let i = 0; i < 50; i++) {
    // 저장소 checkToday(쌓기 칸) → update → commit. 재는 것은 commit의 몫(도장) — 바꾸기 자체(그날 기록 베끼기)는 그 앞
    const next = toggleCountToday(latest, i % 8, (i * 3) % 8, day);
    const t = process.hrtime.bigint();
    const c = commitMeta(latest, next, meta, stamped, 'stamp', T0 + i);
    meta = c.meta;
    stamped = c.stamped;
    latest = next;
    times.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  times.sort((a, b) => a - b);
  const median = times[25];
  if (process.env.SYNC_TIMING) console.log(`checkToday commit median ${median.toFixed(3)} ms, max ${times[49].toFixed(3)} ms`);
  assert.ok(median < 1, `median commit ${median.toFixed(3)} ms`);
  // 다음 저장 · 손잡이 읽기: 처음 → 지금의 바뀜에 도장 하나, 카운터는 합만큼
  const flushed = stampPending(stamped, latest, meta, T0 + 100);
  const net = changedPaths(doc, latest);
  assert.ok(net.size > 0);
  const restamped = Object.keys(flushed.clock).filter((p) => flushed.clock[p] !== meta.clock[p]);
  assert.deepEqual(restamped.sort(), [...net.keys()].sort());
  let eager = epochReset(metaFor(DEVS[0]), T0, doc);
  let d = doc;
  for (let i = 0; i < 50; i++) {
    const next = toggleCountToday(d, i % 8, (i * 3) % 8, day);
    eager = stampLocal(d, next, eager, T0 + i);
    d = next;
  }
  for (const p of Object.keys(eager.parts)) assert.equal(partsSum(flushed.parts[p]), partsSum(eager.parts[p]), `counter ${p} adds up the same`);
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
  P.stamped = P.latest;
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

test('source: the store stamps lazily — commit only through commitMeta, every meta reader flushes first, and only on iOS', () => {
  const s = src('src/store/MandaratContext.tsx');
  assert.match(s, /const SYNC_ON = Platform\.OS === 'ios';/);
  assert.match(s, /const makeMeta = SYNC_ON \? makeSyncMeta : null;/);
  // 맞추기 코드는 손잡이(syncCommit)로만 — 엔진 쪽 파일은 타입으로만
  assert.match(s, /from '\.\.\/lib\/syncCommit';/);
  assert.match(s, /import type \{ CommitHow, ResetMark, SyncPort \} from '\.\.\/lib\/syncEnvelope';/);
  assert.doesNotMatch(s, /^import \{[^}]*\} from '\.\.\/lib\/sync(Envelope|Local|Merge|Engine|Meta)';/m, 'no value import from the sync code itself');
  // R-8 #3: commit은 문서만(도장은 commitMeta가 'stamp'에서 아무것도 하지 않는다) — 눌러 바꾸는 길에 시계 베끼기가 없다
  const commit = body(s, 'const commit = useCallback(', '}, []);');
  assert.match(commit, /const c = commitMeta\(latest\.current, next, metaRef\.current, stampedDoc\.current, how, Date\.now\(\)\);\s*metaRef\.current = c\.meta;\s*stampedDoc\.current = c\.stamped;\s*latest\.current = next;\s*setDoc\(next\);/);
  const flush = body(s, 'const flushStamp = useCallback(', '}, []);');
  assert.match(flush, /metaRef\.current = stampPending\(stampedDoc\.current, latest\.current, metaRef\.current, Date\.now\(\)\);\s*stampedDoc\.current = latest\.current;/);
  assert.equal((s.match(/stampLocal|epochReset\(|stampCommit\(/g) ?? []).length, 0, 'the store never stamps by itself');
  assert.equal((s.match(/commitMeta\(/g) ?? []).length, 1);
  assert.equal((s.match(/stampPending\(/g) ?? []).length, 1);
  // 메타를 읽는 곳은 모두 먼저 flush: 저장 · 손잡이(host.flush) · 초기화 · 그 되돌리기
  assert.match(body(s, 'const persist = useCallback(', 'const json = serializeStored'), /flushStamp\(\);\s*$/);
  assert.match(body(s, 'const resetAll = useCallback', 'const relocalizeDefaults = useCallback'), /flushStamp\(\);\s*const before = latest\.current;\s*const meta = metaRef\.current;/);
  assert.match(body(s, 'const undoReset = useCallback', '}, [flushStamp, replaceDoc, commit]);'), /resetUndo\.current = null;\s*flushStamp\(\);/);
  const env = src('src/lib/syncEnvelope.ts');
  assert.match(body(env, 'export function stampCommit(', '\n}\n'), /if \(!meta \|\| next === prev \|\| how === 'none'\) return meta;/);
  assert.match(body(env, 'export function commitMeta(', '\n}\n'), /if \(how === 'stamp'\) return \{ meta, stamped \};\s*return \{ meta: stampCommit\(prev, next, stampPending\(stamped, prev, meta, wall\), how, wall\), stamped: next \};/);
  const port = body(env, 'export function makeSyncPort(', '\n}\n');
  for (const m of ['    meta() {', '    updateMeta(fn) {', '    replica() {', '    applyRemote(remote) {', '    adopt(remote) {', '    epochReset() {']) {
    assert.match(body(port, m, '\n    },\n'), /^[^\n]*\{\s*host\.flush\?\.\(\);/, `${m.trim()} flushes first`);
  }
  // 초기화는 새 판, 받은 것을 넣을 때는 도장 없이
  assert.match(body(s, 'const resetAll = useCallback', 'const applyTemplate = useCallback'), /update\(\(d\) => resetDoc\(d\), 'epoch'\)/);
  const host = body(s, 'makeSyncPort({', '}),');
  assert.match(host, /doc: \(\) => latest\.current,/);
  assert.match(host, /meta: \(\) => metaRef\.current,/);
  assert.match(host, /flush: flushStamp,/);
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

test('source: reset-undo wiring — Settings resets with getDoc() and useResetUndo; undoReset restores only through undoResetMeta, else replaceDoc', () => {
  const st = src('src/screens/Settings.tsx');
  const doReset = body(st, 'const doReset = () => {', '\n  };');
  assert.match(doReset, /const snapshot = getDoc\(\);\s*resetAll\(\);\s*offerResetUndo\(st\.resetDone, snapshot\);/);
  assert.match(st, /const offerResetUndo = useResetUndo\(\);/);
  const hook = src('src/store/useSnapshotUndo.ts');
  assert.match(hook, /export function useResetUndo\(\) \{\s*return useUndoToast\(useActions\(\)\.undoReset\);/);
  assert.match(hook, /if \(revision\(\) === rev\) restore\(snapshot\);\s*else showToast\(m\.core\.undoStale\);/);
  const s = src('src/store/MandaratContext.tsx');
  const reset = body(s, 'const resetAll = useCallback', 'const relocalizeDefaults = useCallback');
  assert.match(reset, /resetUndo\.current = \{\s*doc: before,\s*rev: revRef\.current,\s*mark: meta && after \? \{ before: meta, epoch: after\.epoch, \.\.\.\(meta\.pushed \? \{ pushed: meta\.pushed \} : \{\}\) \} : null,/);
  const undo = body(s, 'const undoReset = useCallback', '}, [flushStamp, replaceDoc, commit]);');
  assert.match(undo, /const restored = u && u\.doc === snapshot && u\.rev === revRef\.current \? undoResetMeta\(u\.mark, metaRef\.current\) : null;/);
  assert.match(undo, /if \(!restored\) \{\s*replaceDoc\(snapshot\);\s*return;\s*\}/);
  assert.match(undo, /metaRef\.current = restored;\s*commit\(snapshot, 'none'\);\s*\/\/[^\n]*\n\s*commit\(rolloverToday\(snapshot, dateKey\(\)\)\);/);
  assert.match(undo, /dropEditorDraft\(\);\s*revRef\.current \+= 1;/);
});

test('source: applyTemplate on a chart not yet onboarded starts the chart today, like completeOnboarding (R-1 F7)', () => {
  const s = src('src/store/MandaratContext.tsx');
  const tpl = body(s, 'const applyTemplate = useCallback(', '[update],');
  assert.match(tpl, /\.\.\.\(d\.onboarded \? \{\} : \{ chartStart: dateKey\(\), focusStart: d\.focusMinutes \?\? 0 \}\),\s*areasSet: true,\s*onboarded: true,/);
  const onboard = body(s, 'const completeOnboarding = useCallback(', '[update],');
  assert.match(onboard, /chartStart: dateKey\(\), focusStart: d\.focusMinutes \?\? 0/);
  // 온보딩의 템플릿 길이 이 함수다 — 그래서 첫 표의 시작이 첫 기록 날이 아니라 온보딩 날
  assert.match(src('src/screens/Onboarding.tsx'), /applyTemplate\(/);
});
