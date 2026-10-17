// V2-F — 복제본 합치기(syncMerge)와 복제본 파일(syncFile).
// - 격자 성질: joinStates는 교환·결합·멱등이 정확히 성립한다(무작위 여러 기기 기록 5,000쌍 이상).
//   문서로 지은 merge도, 문서가 담을 수 없는 값(0 밑의 수·누적보다 큰 집중 시작점)이 생기지 않은 합치기에서는 정확히 성립한다.
// - 잃지 않음: 여러 기기가 고치고·되돌리고·지우고·닫고·초기화하며 아무렇게나 주고받아도, 다 맞춘 뒤에는
//   경로마다 마지막 판 이후 가장 늦은 고침의 값이 남는다(그보다 늦은 고침이 없는 한 어떤 고침도 사라지지 않는다).
// - 시나리오: 같은 날 체크 둘, 글·메모, +1 +1 = +2, 체크·해제, 판, 지난 표, 알림 키, epochReset, newer, 무거운 문서.
require('./register');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { rng, fuzzDoc, fullDoc, mutate, canonArrays, withoutLocal } = require('./helpers/docFuzz');
const { blankDoc, migrate, sampleThemes } = require('../src/data/defaults');
const { resetDoc, startNewChart } = require('../src/lib/archive');
const { addCount, clearedAction } = require('../src/lib/kinds');
const { archiveCellLog } = require('../src/lib/history');
const { extraLogKey, setDayLog, toggleDayLog, ymd } = require('../src/lib/routine');
const { canon, project, isCounterPath, counterTotal, pathOf, COUNTER_SCALE } = require('../src/lib/syncProject');
const { cleanSyncMeta } = require('../src/lib/syncMeta');
const { observe, isStamp } = require('../src/lib/syncStamp');
const { merge, mergeAll, joinStates, stateOf, materialize, replicaOf, adoptMerged, isNewer, topStamp } = require('../src/lib/syncMerge');
const { stampLocal, epochReset, changedPaths } = require('../src/lib/syncLocal');
const { encodeReplica, decodeReplica, replicaName, devOfName, replicaDigest, SIZE_WARN } = require('../src/lib/syncFile');
const { BACKUP_SCHEMA } = require('../src/lib/backup');

const DEVS = ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb', 'cccccccccccccccc', 'dddddddddddddddd'];

/**
 * 잃지 않음 · 카운터 보존 흉내의 기록 수 — 기본은 CI 그대로, FUZZ_SEEDS=N이면 N개(FUZZ_FROM=K면 K번째부터, 나눠 돌리기용).
 * 예: FUZZ_SEEDS=12500 FUZZ_FROM=12501 node --test --test-name-pattern="never loses|conserved" tests/syncMerge.test.js
 */
function fuzzSeeds(dflt) {
  const n = Number(process.env.FUZZ_SEEDS);
  const from = Number(process.env.FUZZ_FROM);
  const count = Number.isSafeInteger(n) && n > 0 ? n : dflt;
  const first = Number.isSafeInteger(from) && from > 0 ? from : 1;
  return { first, last: first + count - 1, count };
}
const T0 = Date.UTC(2026, 9, 1, 0, 0, 0);

function metaFor(dev) {
  return cleanSyncMeta({ v: 1, dev, last: '', epoch: '', clock: {}, parts: {}, enabled: true, seen: {} });
}

// ── 상태 비교 ────────────────────────────────────────────────────────────────

/** 상태의 정규형 — 판 이하 도장은 지우고, 그날 더한 수의 합 0 이하는 "없음"(합 0)으로 본다 */
const keyCache = new WeakMap();
const valueCanon = new WeakMap();
/** 값의 canon — 합친 상태는 받은 값 객체를 그대로 쓰므로 객체마다 한 번만 센다 */
function canonOf(v) {
  if (!v || typeof v !== 'object') return canon(v);
  let c = valueCanon.get(v);
  if (c === undefined) {
    c = canon(v);
    valueCanon.set(v, c);
  }
  return c;
}
function normState(S) {
  if (keyCache.has(S)) return keyCache.get(S);
  const j = S.joined ? S : joinStates(S, S);
  const paths = [...j.values.keys()].sort();
  const key = canon({ e: j.epoch, c: j.clock, p: j.parts }) + paths.map((p) => `\n${p}=${canonOf(j.values.get(p))}`).join('');
  keyCache.set(S, key);
  return key;
}

/** joinStates의 결과 표시 — 결과는 이미 정규형이다(멱등 검사가 확인한다) */
function J(a, b) {
  const out = joinStates(a, b);
  out.joined = true;
  return out;
}

/** 두 정규형이 다르면 어디가 다른지 */
function sameState(x, y, msg) {
  if (normState(x) === normState(y)) return;
  const nx = x.joined ? x : joinStates(x, x);
  const ny = y.joined ? y : joinStates(y, y);
  const diffs = [];
  if (nx.epoch !== ny.epoch) diffs.push(`epoch ${nx.epoch} ${ny.epoch}`);
  for (const [k, a, b] of [['c', nx.clock, ny.clock], ['p', nx.parts, ny.parts]]) {
    for (const q of new Set([...Object.keys(a), ...Object.keys(b)])) if (canon(a[q]) !== canon(b[q])) diffs.push(`${k}:${q} ${canon(a[q])} ≠ ${canon(b[q])}`);
  }
  for (const q of new Set([...nx.values.keys(), ...ny.values.keys()])) {
    if (canon(nx.values.get(q) ?? null) !== canon(ny.values.get(q) ?? null)) diffs.push(`v:${q} ${canon(nx.values.get(q) ?? null)} ≠ ${canon(ny.values.get(q) ?? null)}`);
  }
  assert.fail(`${msg}: ${diffs.slice(0, 8).join(' | ')}`);
}

/** 문서까지 포함한 복제본 비교 — 기기마다의 필드와 목록 순서는 뺀다 */
function replicaKey(R) {
  return canon({ e: R.epoch, c: R.clock, p: R.parts, d: canonArrays(withoutLocal(R.doc)) });
}

/** 합친 상태가 문서에 고스란히 담기는가 — 아니면(잘라 낸 값이 있으면) 그 경로들 */
function lossyPaths(j, doc) {
  const back = stateOf({ epoch: j.epoch, clock: j.clock, parts: j.parts, doc });
  const a = joinStates(j, j);
  const b = joinStates(back, back);
  const out = [];
  const paths = new Set([...a.values.keys(), ...b.values.keys()]);
  for (const p of paths) {
    let va = a.values.get(p);
    let vb = b.values.get(p);
    if (isCounterPath(p) && p.split('/')[2] === 'log') {
      // 합이 0 이하인 그날 더한 수는 문서에 없다 — 합이 정확히 0이면 다시 읽어도 같다
      const ta = va === undefined ? 0 : counterTotal(va);
      const tb = vb === undefined ? 0 : counterTotal(vb);
      if (ta <= 0 && tb <= 0 && ta === tb) continue;
      if (ta === tb && canon(va?.b) === canon(vb?.b)) continue;
    }
    if (canon(va ?? null) !== canon(vb ?? null)) out.push(p);
  }
  return out;
}

// ── 여러 기기 흉내 ───────────────────────────────────────────────────────────

/** 칸 하나 고치기(저장소처럼 바뀐 갈래만 새 참조) */
function editCell(doc, ti, ai, fn) {
  return { ...doc, themes: doc.themes.map((t, i) => (i === ti ? { ...t, actions: t.actions.map((a, j) => (j === ai ? fn(a) : a)) } : t)) };
}

/** 앱이 하는 고침 하나 — 저장소의 액션과 같은 모양(참조를 나눈다). null이면 바뀐 것 없음 */
function appEdit(r, doc, day, now) {
  const int = (n) => Math.floor(r() * n);
  const one = (xs) => xs[int(xs.length)];
  const ti = int(8);
  const ai = int(8);
  const key = `${ti}-${ai}`;
  const a = doc.themes[ti].actions[ai];
  const d0 = ymd(new Date(2026, 9, 1 + int(20)));
  switch (int(19)) {
    case 0: return editCell(doc, ti, ai, (x) => ({ ...x, text: one(['걷기', '책 읽기', '물 2L', '', 'Run']) }));
    case 1: return editCell(doc, ti, ai, (x) => ({ ...x, note: one(['메모', '', '새 메모']) }));
    case 2: return editCell(doc, ti, ai, (x) => ({ ...x, done: !x.done }));
    case 3: return editCell(doc, ti, ai, (x) => ({ ...x, text: x.text || '쌓기', kind: 'count', goal: one([3, 10]), step: one([1, 0.5]) }));
    case 4: return editCell(doc, ti, ai, (x) => ({ ...x, text: x.text || '습관', kind: 'habit', days: [1, 3, 5], remindAt: one(['07:30', '21:00']) }));
    case 5: case 6: return { ...doc, dayLog: toggleDayLog(doc.dayLog, key, one([day, d0])) };
    case 7: case 8: {
      const c = a.kind === 'count' ? doc : editCell(doc, ti, ai, (x) => ({ ...x, text: x.text || '쌓기', kind: 'count' }));
      const out = addCount(c, ti, ai, one([1, 1, 2, 0.5, -1, -0.5]), one([day, day, d0]));
      return out;
    }
    case 9: return {
      ...doc,
      todayKeys: doc.todayKeys.filter((k) => k !== key),
      dayLog: archiveCellLog(doc.dayLog, key, now),
      themes: doc.themes.map((t, i) => (i === ti ? { ...t, actions: t.actions.map((x, j) => (j === ai ? clearedAction(x) : x)) } : t)),
    };
    case 10: return { ...doc, focusMinutes: doc.focusMinutes + one([25, 50]) };
    case 11: return { ...doc, dayMeta: { ...doc.dayMeta, [one([day, d0])]: one([{ mood: int(5) }, { reflection: '좋은 하루' }, { mood: 2, reflection: 'ok' }]) } };
    case 12: {
      const k = one(['morning', 'evening', 'review']);
      const reminders = { ...(doc.settings.reminders ?? {}) };
      if (reminders[k] !== undefined && r() < 0.4) delete reminders[k];
      else reminders[k] = k === 'review' ? true : one(['07:00', '08:15', '21:30']);
      const settings = { ...doc.settings };
      if (Object.keys(reminders).length > 0) settings.reminders = reminders;
      else delete settings.reminders;
      return { ...doc, settings };
    }
    case 13: {
      const settings = { ...doc.settings };
      const paper = one(['grid', 'lines', 'blank', undefined]);
      if (paper) settings.paper = paper;
      else delete settings.paper;
      return { ...doc, settings };
    }
    case 14: return { ...doc, todayKeys: doc.todayKeys.includes(key) ? doc.todayKeys.filter((k) => k !== key) : [...doc.todayKeys, key] };
    case 15: {
      if (doc.todayExtra.length > 0 && r() < 0.6) {
        const x = one(doc.todayExtra);
        if (r() < 0.5) {
          return { ...doc, todayExtra: doc.todayExtra.filter((e) => e.id !== x.id), dayLog: setDayLog(doc.dayLog, extraLogKey(x.ti, x.id), day, false) };
        }
        const done = !x.done;
        return { ...doc, todayExtra: doc.todayExtra.map((e) => (e.id === x.id ? { ...e, done } : e)), dayLog: setDayLog(doc.dayLog, extraLogKey(x.ti, x.id), day, done) };
      }
      return { ...doc, todayExtra: [...doc.todayExtra, { id: `e${int(1e6).toString(36)}`, ti: int(8), text: one(['전화', '장보기']), done: false }] };
    }
    case 16: return { ...doc, reviews: { ...doc.reviews, '2026-10-05': { at: day, next: [key], ...(r() < 0.5 ? { note: '좋은 주' } : {}) } } };
    case 17: {
      const closedDays = (doc.closedDays ?? []).includes(day) ? (doc.closedDays ?? []).filter((x) => x !== day) : [...(doc.closedDays ?? []), day].sort();
      const out = { ...doc, closedDays };
      if (closedDays.length === 0) delete out.closedDays;
      return out;
    }
    default: {
      const next = startNewChart(doc, one(['continue', 'areas', 'blank']), new Date(now), { goal: one(['', '새 목표']), note: one(['', '한 해 끝']), time: now });
      return next ?? doc;
    }
  }
}

/**
 * 여러 기기의 기록 — 고침·되돌리기·주고받기·초기화·"이 기기 기록으로"·합친 뒤 다듬기.
 * issued: "경로|도장" → 그 도장을 낼 때의 값(canon) — 잃지 않음 검사에 쓴다.
 */
function world(seed, opts = {}) {
  const r = rng(seed);
  const n = opts.devices ?? 3;
  const base = opts.base ?? (opts.fuzzBase ?? r() < 0.3 ? fuzzDoc(r) : migrate({ ...blankDoc(), onboarded: true, themes: sampleThemes(new Date(2026, 8, 1)) }));
  const devs = DEVS.slice(0, n).map((dev) => ({
    dev, meta: metaFor(dev), doc: opts.sameBase === false && r() < 0.5 ? fuzzDoc(r) : base, undo: [],
    skew: Math.floor((r() - 0.5) * 20000),
  }));
  const issued = new Map();
  let wall = T0;
  const record = (stampOf, regsOf) => {
    for (const [p, v] of regsOf) issued.set(`${p}|${stampOf(p)}`, canon(v ?? null));
  };
  const commit = (d, next, w) => {
    if (next === d.doc) return;
    const changes = changedPaths(d.doc, next);
    const meta = stampLocal(d.doc, next, d.meta, w);
    // 다른 기기가 보는 값은 migrate를 거친 값이다(합친 문서는 늘 migrate를 거친다)
    const after = project(migrate(JSON.parse(JSON.stringify(next))));
    for (const p of changes.keys()) issued.set(`${p}|${meta.clock[p]}`, canon(after.get(p) ?? null));
    d.meta = meta;
    d.doc = next;
  };
  const pull = (d, o) => {
    const m = merge(replicaOf(d.doc, d.meta), replicaOf(o.doc, o.meta));
    d.meta = observe(adoptMerged(d.meta, m), topStamp(replicaOf(o.doc, o.meta)), wall + d.skew);
    d.doc = m.doc;
    if (opts.materialize !== false && r() < 0.5) commit(d, materialize(d.doc), wall + d.skew);
  };
  const steps = opts.steps ?? 6 + Math.floor(r() * 30);
  for (let s = 0; s < steps; s++) {
    wall += Math.floor(r() * 3 * 60 * 60 * 1000);
    const d = devs[Math.floor(r() * n)];
    const w = r() < 0.05 ? wall + d.skew - 60 * 60 * 1000 : wall + d.skew; // 가끔 시계가 뒤로 간다
    const day = ymd(new Date(w));
    const x = r();
    if (x < 0.55) {
      const next = appEdit(r, d.doc, day, w);
      if (next !== d.doc) {
        d.undo.push(d.doc);
        commit(d, next, w);
      }
    } else if (x < 0.62 && d.undo.length > 0) {
      commit(d, d.undo.pop(), w); // 되돌리기 — 저장소의 replaceDoc처럼 이전 문서를 다시 쓴다
    } else if (x < 0.66 && opts.mutate !== false) {
      commit(d, mutate(r, d.doc), w);
    } else if (x < 0.93) {
      const o = devs[Math.floor(r() * n)];
      if (o !== d) pull(d, o);
    } else if (x < 0.97 && opts.resets !== false) {
      const kept = resetDoc(d.doc);
      d.meta = epochReset(d.meta, w, kept);
      record((p) => d.meta.clock[p], project(migrate(JSON.parse(JSON.stringify(kept)))));
      d.doc = kept;
      d.undo = [];
    } else if (opts.resets !== false) {
      d.meta = epochReset(d.meta, w, d.doc); // "이 기기 기록으로 이어 써요"
      record((p) => d.meta.clock[p], project(migrate(JSON.parse(JSON.stringify(d.doc)))));
      d.undo = [];
    }
  }
  return { devs, issued, pull, commit, r, get wall() { return wall; } };
}

/** 모두 맞춘다 — 둘씩 서로 받기를 몇 바퀴 */
function converge(w) {
  // 한 기기가 모두에게서 받고, 모두가 그 기기에게서 받는다 — 그다음 한 바퀴 더(다듬기 도장까지 퍼지게)
  const [hub, ...rest] = w.devs;
  for (let round = 0; round < 2; round++) {
    for (const d of rest) w.pull(hub, d);
    for (const d of rest) w.pull(d, hub);
  }
}

function replicas(w) {
  return w.devs.map((d) => replicaOf(d.doc, d.meta));
}

// ── 격자 성질 ────────────────────────────────────────────────────────────────

test('joinStates is commutative, associative and idempotent on 5,000 random triples of multi-device histories', () => {
  // 세계 100개(기기 셋씩)의 상태 — 같은 세계의 기기끼리(대부분)와 다른 세계끼리(다른 바탕) 섞는다
  const worlds = [];
  for (let seed = 1; seed <= 100; seed++) worlds.push(replicas(world(seed, { sameBase: seed % 3 !== 0, fuzzBase: seed % 4 === 0 })).map(stateOf));
  const r = rng(4242);
  const pick = (ws) => ws[Math.floor(r() * ws.length)];
  for (let k = 0; k < 5000; k++) {
    const home = pick(worlds);
    const [A, B, C] = [0, 1, 2].map(() => (r() < 0.8 ? pick(home) : pick(pick(worlds))));
    const ab = J(A, B);
    sameState(ab, J(B, A), `comm ${k}`);
    sameState(J(ab, C), J(A, J(B, C)), `assoc ${k}`);
    sameState(J(ab, ab), ab, `idem ${k}`);
    if (k % 5 === 0) sameState(J(J(A, A), A), J(A, A), `idem A ${k}`);
  }
});

test('merge on documents is commutative, associative and idempotent wherever nothing had to be clipped (500 triples)', () => {
  let exact = 0;
  let clipped = 0;
  for (let seed = 1; exact + clipped < 500; seed++) {
    // 받은 복제본은 늘 migrate를 거친다(decodeReplica) — 이 기기 문서도 같은 모양으로 맞춰 둔다
    const pool = replicas(world(seed + 7000)).map((R) => ({ ...R, doc: migrate(JSON.parse(JSON.stringify(R.doc))) }));
    const r = rng(seed * 17);
    for (let k = 0; k < 4; k++) {
      const [A, B, C] = [0, 1, 2].map(() => pool[Math.floor(r() * pool.length)]);
      const ab = merge(A, B);
      // 두 쪽만으로는 잘라 낼 것이 없다 — 교환·멱등은 늘 정확하다
      assert.equal(replicaKey(ab), replicaKey(merge(B, A)), `comm seed ${seed}`);
      assert.equal(replicaKey(merge(ab, ab)), replicaKey(ab), `idem seed ${seed}`);
      if (k === 0) assert.deepEqual(merge(A, A).doc, migrate(JSON.parse(JSON.stringify(A.doc))), `merge(A, A) keeps A's doc, seed ${seed}`);
      const bc = merge(B, C);
      const lossy = [...lossyPaths(J(stateOf(A), stateOf(B)), ab.doc), ...lossyPaths(J(stateOf(B), stateOf(C)), bc.doc)];
      const left = merge(ab, C);
      const right = merge(A, bc);
      if (lossy.length === 0) {
        assert.equal(replicaKey(left), replicaKey(right), `assoc seed ${seed}`);
        exact++;
      } else {
        // 잘라 낸 경로 밖은 같다
        const strip = (R) => {
          const st = stateOf(R);
          const values = new Map(st.values);
          for (const p of lossy) values.delete(p);
          return normState({ ...st, values });
        };
        assert.equal(strip(left), strip(right), `assoc outside ${lossy.join(',')} seed ${seed}`);
        clipped++;
      }
    }
  }
  assert.ok(clipped < exact / 20, `clipping is rare (${clipped} of ${exact + clipped})`);
});

test('merge of a replica with itself returns the same document, and assemble ∘ project round-trips through merge', () => {
  const r = rng(5);
  for (let i = 0; i < 200; i++) {
    const d = fuzzDoc(r);
    const R = replicaOf(d, metaFor(DEVS[0]));
    assert.deepEqual(merge(R, R).doc, d);
    const blank = replicaOf(blankDoc(), metaFor(DEVS[1]));
    // 아무 도장 없는 빈 문서와 합쳐도 값이 있는 쪽이 남는다(같은 도장 ''이면 값이 이긴다)
    const m = merge(R, blank).doc;
    assert.equal(m.centerGoal, d.centerGoal || blank.doc.centerGoal);
    for (const day of Object.keys(d.dayLog)) assert.deepEqual([...m.dayLog[day]].sort(), [...new Set(d.dayLog[day])].sort());
  }
});

// ── 잃지 않음 ────────────────────────────────────────────────────────────────

test('never loses an edit: after convergence every path holds the value of its latest edit since the last epoch (150 histories)', () => {
  const { first, last } = fuzzSeeds(150);
  for (let seed = first; seed <= last; seed++) {
    const w = world(seed + 50000, { devices: 2 + (seed % 3) });
    converge(w);
    const reps = replicas(w);
    const keys = reps.map(replicaKey);
    for (const k of keys) assert.equal(k, keys[0], `converged, seed ${seed}`);
    const F = reps[0];
    const S = stateOf(F);
    // 경로마다 낸 도장 중 판보다 큰 가장 늦은 것
    const latest = new Map();
    for (const key of w.issued.keys()) {
      const i = key.lastIndexOf('|');
      const p = key.slice(0, i);
      const s = key.slice(i + 1);
      if (!isStamp(s) || s <= F.epoch) continue;
      if (!latest.has(p) || s > latest.get(p)) latest.set(p, s);
    }
    for (const [p, s] of latest) {
      if (isCounterPath(p)) continue; // 카운터는 아래 보존 검사
      // 직접 추가한 할 일의 끝냄(x/<id>/done)은 그 할 일(x/<id>)이 있을 때만 값이다 — 머리가 지워졌으면(초기화 · 지우기가
      // 더 늦거나 판 이하) 늦게 고친 끝냄도 문서에 없다. V1-F 레지스터 표의 "x/<id>/done — 원소, x/<id> 없으면 무시"(R-1 F8)
      const xd = /^x\/([^/]+)\/done$/.exec(p);
      if (xd && !S.values.has(pathOf('x', xd[1]))) continue;
      const stamp = F.clock[p] ?? '';
      assert.equal(stamp, s, `latest stamp kept for ${p}, seed ${seed}`);
      const want = w.issued.get(`${p}|${s}`);
      let got = canon(S.values.get(p) ?? null);
      if (p === 'fs' && got !== want) {
        // 집중 시작점은 누적 집중을 넘지 않게 맞춘다(버리지 않는다)
        assert.ok(Number(got) <= Number(want), `fs clamped, seed ${seed}`);
        continue;
      }
      assert.equal(got, want, `value of latest edit kept for ${p}, seed ${seed}`);
    }
    // 판보다 큰 도장은 모두 누군가 낸 것이다(지어낸 도장이 없다)
    for (const [p, s] of Object.entries(F.clock)) {
      assert.ok(s > F.epoch, `no stamp at or below the epoch, ${p}`);
      if (!isCounterPath(p)) assert.ok(w.issued.has(`${p}|${s}`), `stamp ${s} for ${p} was issued, seed ${seed}`);
    }
  }
});

test('counters are conserved: random +/− on many devices with random pulls add up exactly after convergence', () => {
  const { first, last } = fuzzSeeds(80);
  const COUNTED = [['1-1', 1, 1], ['2-2', 2, 2]];
  let exact = 0;
  for (let seed = first; seed <= last; seed++) {
    const r = rng(seed + 900);
    let base = migrate({ ...blankDoc(), onboarded: true, themes: sampleThemes(new Date(2026, 8, 1)) });
    base = editCell(base, 1, 1, (a) => ({ ...a, text: '책', kind: 'count', count: 5, step: 1, goal: 1000 }));
    base = editCell(base, 2, 2, (a) => ({ ...a, text: '물', kind: 'count', step: 0.5, goal: 1000 }));
    const devs = DEVS.slice(0, 3).map((dev) => ({ dev, meta: metaFor(dev), doc: base }));
    // 합친 카운터(바탕 + 몫의 합)를 문서가 담지 못해 잘라 낸 적이 있는가 — 함께 줄여 0 밑으로 간 수(V2-F §7.2).
    // 잘라 낸 뒤 이 기기에서 고치면 잘린 값이 새 바탕이 되므로, 그런 기록의 그 카운터는 보존 법칙 밖이다(R-1 F8)
    const clipped = new Set();
    const pull = (d, o) => {
      const L = replicaOf(d.doc, d.meta);
      const X = replicaOf(o.doc, o.meta);
      const m = merge(L, X);
      const j = joinStates(stateOf(L), stateOf(X));
      for (const [key, ti, ai] of COUNTED) {
        const total = counterTotal(j.values.get(`c/${key}/n`));
        if (total !== null && total !== Math.round((m.doc.themes[ti].actions[ai].count ?? 0) * COUNTER_SCALE)) clipped.add(key);
      }
      d.meta = adoptMerged(d.meta, m);
      d.doc = m.doc;
    };
    let wall = T0;
    let expectFm = 0;
    const expectCount = { '1-1': 5, '2-2': 0 };
    for (let s = 0; s < 60; s++) {
      wall += 1000 + Math.floor(r() * 100000);
      const d = devs[Math.floor(r() * 3)];
      const x = r();
      if (x < 0.5) {
        const [ti, ai] = r() < 0.5 ? [1, 1] : [2, 2];
        const key = `${ti}-${ai}`;
        const a = d.doc.themes[ti].actions[ai];
        // 이 기기가 보는 수는 0 밑으로 내려가지 않는다(다른 기기와 함께 줄여 합이 0 밑으로 가는 것은 위 clipped가 센다)
        const delta = r() < 0.7 || (a.count ?? 0) < 3 ? [1, 0.5, 2][Math.floor(r() * 3)] : -1;
        const next = addCount(d.doc, ti, ai, delta, ymd(new Date(2026, 9, 1 + Math.floor(r() * 3))));
        const real = (next.themes[ti].actions[ai].count ?? 0) - (a.count ?? 0);
        expectCount[key] = Math.round((expectCount[key] + real) * 100) / 100;
        d.meta = stampLocal(d.doc, next, d.meta, wall);
        d.doc = next;
      } else if (x < 0.65) {
        const next = { ...d.doc, focusMinutes: d.doc.focusMinutes + 25 };
        expectFm += 25;
        d.meta = stampLocal(d.doc, next, d.meta, wall);
        d.doc = next;
      } else {
        const o = devs[Math.floor(r() * 3)];
        if (o === d) continue;
        pull(d, o);
      }
    }
    for (let round = 0; round < 2; round++) {
      for (const d of devs) for (const o of devs) {
        if (d !== o) pull(d, o);
      }
    }
    const F = devs[0].doc;
    for (const d of devs) assert.deepEqual(canonArrays(withoutLocal(d.doc)), canonArrays(withoutLocal(F)));
    assert.equal(F.focusMinutes, expectFm, `focus minutes, seed ${seed}`);
    // 어느 합치기에서도 잘라 내지 않은 카운터는 정확하다 — 잘라 낸 것만 건너뛴다(짐작이 아니라 잰 것)
    for (const [key, ti, ai] of COUNTED) {
      if (clipped.has(key)) continue;
      assert.equal(F.themes[ti].actions[ai].count ?? 0, expectCount[key], `count ${key}, seed ${seed}`);
      exact++;
    }
  }
  assert.ok(exact > (last - first + 1), `most counters were checked (${exact})`);
});

// ── 시나리오 ────────────────────────────────────────────────────────────────

/** 같은 문서에서 시작한 두 기기 — 둘 다 같은 바탕(도장 없음) */
function pair(doc) {
  const base = doc ?? migrate({ ...blankDoc(), onboarded: true, themes: sampleThemes(new Date(2026, 8, 1)) });
  return [{ meta: metaFor(DEVS[0]), doc: base }, { meta: metaFor(DEVS[1]), doc: base }];
}

function edit(d, fn, wall) {
  const next = fn(d.doc);
  d.meta = stampLocal(d.doc, next, d.meta, wall);
  d.doc = next;
}

function both(A, B) {
  const ab = merge(replicaOf(A.doc, A.meta), replicaOf(B.doc, B.meta));
  const ba = merge(replicaOf(B.doc, B.meta), replicaOf(A.doc, A.meta));
  assert.equal(replicaKey(ab), replicaKey(ba));
  return ab.doc;
}

test("two devices' checks on the same day are both kept", () => {
  const [A, B] = pair();
  edit(A, (d) => ({ ...d, dayLog: toggleDayLog(d.dayLog, '0-0', '2026-10-02') }), T0 + 1000);
  edit(B, (d) => ({ ...d, dayLog: toggleDayLog(d.dayLog, '3-4', '2026-10-02') }), T0 + 900);
  assert.deepEqual([...both(A, B).dayLog['2026-10-02']].sort(), ['0-0', '3-4']);
});

test('a text edit and a note edit to the same cell are both kept', () => {
  const [A, B] = pair();
  edit(A, (d) => editCell(d, 2, 3, (a) => ({ ...a, text: '매일 걷기' })), T0 + 1000);
  edit(B, (d) => editCell(d, 2, 3, (a) => ({ ...a, note: '아침에' })), T0 + 2000);
  const m = both(A, B);
  assert.equal(m.themes[2].actions[3].text, '매일 걷기');
  assert.equal(m.themes[2].actions[3].note, '아침에');
});

test('+1 and +1 on two offline devices gives +2 (count, the day log and focus minutes)', () => {
  const start = editCell(pair()[0].doc, 1, 1, (a) => ({ ...a, text: '책', kind: 'count', count: 3, step: 1, goal: 10 }));
  const [A, B] = pair(start);
  edit(A, (d) => ({ ...addCount(d, 1, 1, 1, '2026-10-02'), focusMinutes: d.focusMinutes + 25 }), T0 + 1000);
  edit(B, (d) => ({ ...addCount(d, 1, 1, 1, '2026-10-02'), focusMinutes: d.focusMinutes + 25 }), T0 + 1000);
  const m = both(A, B);
  assert.equal(m.themes[1].actions[1].count, 5);
  assert.equal(m.themes[1].actions[1].log['2026-10-02'], 2);
  assert.equal(m.focusMinutes, start.focusMinutes + 50);
});

test("one device's undo of its own +1 does not erase the other device's +1 on the same day", () => {
  const start = editCell(pair()[0].doc, 1, 1, (a) => ({ ...a, text: '책', kind: 'count', count: 0, step: 1, goal: 10 }));
  const [A, B] = pair(start);
  edit(A, (d) => addCount(d, 1, 1, 1, '2026-10-02'), T0 + 1000);
  edit(A, (d) => addCount(d, 1, 1, -1, '2026-10-02'), T0 + 5000); // 되돌림 — 그날 기록이 사라진다
  edit(B, (d) => addCount(d, 1, 1, 1, '2026-10-02'), T0 + 2000);
  const m = materialize(both(A, B));
  assert.equal(m.themes[1].actions[1].count, 1);
  assert.equal(m.themes[1].actions[1].log['2026-10-02'], 1);
  assert.ok(m.dayLog['2026-10-02'].includes('1-1'), 'M1 puts the count cell back into that day');
});

test('an uncheck beats an older check and loses to a newer one', () => {
  const [A, B] = pair();
  edit(A, (d) => ({ ...d, dayLog: toggleDayLog(d.dayLog, '0-0', '2026-10-02') }), T0 + 1000);
  B.doc = merge(replicaOf(B.doc, B.meta), replicaOf(A.doc, A.meta)).doc;
  B.meta = adoptMerged(B.meta, merge(replicaOf(B.doc, B.meta), replicaOf(A.doc, A.meta)));
  // B가 늦게 해제
  const B1 = { meta: B.meta, doc: B.doc };
  edit(B1, (d) => ({ ...d, dayLog: toggleDayLog(d.dayLog, '0-0', '2026-10-02') }), T0 + 3000);
  assert.equal(both(A, B1).dayLog['2026-10-02'], undefined);
  // A가 그보다 늦게 다시 체크
  const A2 = { meta: A.meta, doc: A.doc };
  edit(A2, (d) => ({ ...d, dayLog: toggleDayLog(toggleDayLog(d.dayLog, '0-0', '2026-10-02'), '0-0', '2026-10-02') }), T0 + 4000);
  edit(A2, (d) => editCell(d, 0, 0, (a) => ({ ...a, done: true })), T0 + 4000);
  const A3 = { meta: A2.meta, doc: A2.doc };
  edit(A3, (d) => ({ ...d, dayLog: toggleDayLog(d.dayLog, '0-0', '2026-10-02') }), T0 + 5000); // 해제
  edit(A3, (d) => ({ ...d, dayLog: toggleDayLog(d.dayLog, '0-0', '2026-10-02') }), T0 + 6000); // 다시 체크
  assert.deepEqual(both(A3, B1).dayLog['2026-10-02'], ['0-0']);
});

test('a reset epoch beats everything older, and later edits on the stale device survive', () => {
  const [A, B] = pair(fullDoc());
  edit(B, (d) => editCell(d, 4, 4, (a) => ({ ...a, text: '리셋 전 고침' })), T0 + 1000);
  A.doc = resetDoc(A.doc);
  A.meta = epochReset(A.meta, T0 + 2000, A.doc);
  edit(B, (d) => editCell(d, 5, 5, (a) => ({ ...a, text: '리셋 뒤 고침' })), T0 + 3000);
  const m = both(A, B);
  assert.equal(m.themes[4].actions[4].text, '', 'an edit older than the reset is reset away');
  assert.equal(m.themes[5].actions[5].text, '리셋 뒤 고침', 'an edit newer than the reset survives');
  assert.deepEqual(m.dayLog, {});
  assert.equal(m.focusMinutes, 0);
  assert.deepEqual(m.settings, fullDoc().settings, 'reset keeps settings');
  assert.deepEqual(m.archives, fullDoc().archives, 'reset keeps archives');
});

test('after epochReset on A (mine), everything A kept survives on B, and B older edits do not', () => {
  const [A, B] = pair(fullDoc());
  edit(B, (d) => ({ ...d, settings: { ...d.settings, paper: 'lines', reminders: { morning: '06:00' } }, centerGoal: 'B의 목표' }), T0 + 1000);
  edit(B, (d) => ({ ...d, archives: [] }), T0 + 1500);
  edit(A, (d) => ({ ...d, centerGoal: 'A의 목표' }), T0 + 500);
  A.meta = epochReset(A.meta, T0 + 2000, A.doc);
  const onB = merge(replicaOf(B.doc, B.meta), replicaOf(A.doc, A.meta)).doc;
  assert.deepEqual(canonArrays(withoutLocal(onB)), canonArrays(withoutLocal(A.doc)));
  assert.equal(onB.settings.paper, 'grid');
  assert.deepEqual(onB.archives, fullDoc().archives);
  for (const st of Object.values(A.meta.clock)) assert.ok(st > A.meta.epoch, 'every kept path carries a stamp above the new epoch');
});

test('archives union by id; the same chart closed on two devices gives one archive, the later close', () => {
  const start = fullDoc();
  const [A, B] = pair(start);
  const close = (d, note, w) => edit(d, (doc) => startNewChart(doc, 'continue', new Date(2026, 9, 10), { goal: '', note, time: w }), w);
  close(A, 'A가 닫음', T0 + 1000);
  close(B, 'B가 닫음', T0 + 2000);
  const m = both(A, B);
  const ids = m.archives.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, start.archives.length + 1);
  assert.equal(m.archives.find((a) => a.id === 'y20260901').note, 'B가 닫음');
  // 서로 다른 지난 표는 모두 남는다
  const [C, D] = pair(start);
  edit(C, (d) => ({ ...d, archives: [...d.archives, { ...d.archives[0], id: 'y20240101', from: '2024-01-01', to: '2024-12-31' }] }), T0 + 1000);
  edit(D, (d) => ({ ...d, archives: [...d.archives, { ...d.archives[0], id: 'y20230101', from: '2023-01-01', to: '2023-12-31' }] }), T0 + 1000);
  assert.deepEqual(both(C, D).archives.map((a) => a.id).sort(), ['y20230101', 'y20240101', 'y20250901']);
});

test('each reminder key and paper are LWW: a morning time from A and an evening time from B both survive', () => {
  const [A, B] = pair();
  edit(A, (d) => ({ ...d, settings: { ...d.settings, reminders: { morning: '07:30' }, paper: 'grid' } }), T0 + 1000);
  edit(B, (d) => ({ ...d, settings: { ...d.settings, reminders: { evening: '21:00' }, paper: 'lines' } }), T0 + 2000);
  const m = both(A, B);
  assert.deepEqual(m.settings.reminders, { morning: '07:30', evening: '21:00' });
  assert.equal(m.settings.paper, 'lines');
  // 끈 것도 LWW — B가 늦게 아침 알림을 끄면 꺼진다
  const B2 = { meta: B.meta, doc: both(A, B) };
  B2.meta = adoptMerged(B.meta, merge(replicaOf(B.doc, B.meta), replicaOf(A.doc, A.meta)));
  edit(B2, (d) => ({ ...d, settings: { ...d.settings, reminders: { evening: '21:00' } } }), T0 + 3000);
  assert.deepEqual(both(A, B2).settings.reminders, { evening: '21:00' });
});

test('onboarded and areasSet: a fresh device that never onboarded does not undo onboarding', () => {
  // 온보딩하지 않은 기기의 false는 도장이 없다(초기화만 false를 찍고, 초기화는 판을 올린다)
  const [A, B] = pair(migrate({ ...blankDoc(), onboarded: false }));
  edit(A, (d) => ({ ...d, onboarded: true, areasSet: true }), T0 + 1000);
  edit(B, (d) => ({ ...d, centerGoal: 'x', settings: { ...d.settings, paper: 'grid' } }), T0 + 2000);
  assert.equal(both(A, B).onboarded, true);
  assert.equal(both(A, B).areasSet, true);
  // 둘 다 도장이 없으면(동기화 전 문서) 같은 도장 ''에서 값이 큰 true가 이긴다
  const [C, D] = pair(migrate({ ...blankDoc(), onboarded: false }));
  C.doc = { ...C.doc, onboarded: true };
  assert.equal(both(C, D).onboarded, true);
});

test('mergeAll folds in device order and rejects a newer-schema replica without merging anything', () => {
  const r = rng(77);
  const local = replicaOf(fuzzDoc(r), metaFor(DEVS[0]));
  const rs = [DEVS[2], DEVS[1], DEVS[3]].map((dev) => {
    const m = epochReset(metaFor(dev), T0 + dev.charCodeAt(0), fuzzDoc(r));
    return replicaOf(fuzzDoc(r), m);
  });
  const a = mergeAll(local, rs);
  const b = mergeAll(local, [rs[2], rs[0], rs[1]]);
  assert.equal(replicaKey(a), replicaKey(b));
  assert.equal(mergeAll(null, []), null);
  assert.equal(topStamp(rs[0]), Object.values(rs[0].clock).reduce((a, x) => (x > a ? x : a), rs[0].epoch));
  assert.equal(topStamp({ epoch: '', clock: {} }), '');
  assert.equal(mergeAll(null, [rs[0]]), rs[0]);
  const text = encodeReplica({ ...rs[0], at: 1 }).replace(`"schema":${BACKUP_SCHEMA}`, `"schema":${BACKUP_SCHEMA + 1}`);
  const newer = decodeReplica(text);
  assert.ok(isNewer(newer));
  assert.equal(newer.dev, rs[0].dev);
  const out = mergeAll(local, [rs[1], newer]);
  assert.ok(isNewer(out), 'a newer replica stops the merge');
  assert.equal(out.doc, undefined);
});

test('materialize only adds: count logs show in the day log; a logged extra is done; unchanged docs keep identity', () => {
  let d = editCell(fullDoc(), 2, 0, (a) => ({ ...a, log: { '2026-09-03': 2 } }));
  const m = materialize(d);
  assert.ok(m.dayLog['2026-09-03'].includes('2-0'));
  for (const day of Object.keys(d.dayLog)) for (const k of d.dayLog[day]) assert.ok(m.dayLog[day].includes(k));
  assert.equal(materialize(m), m);
  d = { ...fullDoc(), todayDate: '2026-09-02', todayExtra: [{ id: 'q1', ti: 1, text: '전화', done: false }], dayLog: { '2026-09-02': ['1-xq1'] } };
  assert.equal(materialize(d).todayExtra[0].done, true);
  d = { ...fullDoc(), todayDate: '2026-09-05', todayExtra: [{ id: 'q1', ti: 1, text: '전화', done: true }], dayLog: {} };
  assert.deepEqual(materialize(d).dayLog['2026-09-05'], ['1-xq1']);
  const r = rng(3);
  for (let i = 0; i < 200; i++) {
    const f = fuzzDoc(r);
    const out = materialize(f);
    assert.deepEqual(migrate(JSON.parse(JSON.stringify(out))), out, 'materialize output is a migrate fixed point');
    for (const day of Object.keys(f.dayLog)) for (const k of f.dayLog[day]) assert.ok(out.dayLog[day].includes(k));
    assert.equal(materialize(out), out, 'idempotent');
  }
});

// ── 복제본 파일 ──────────────────────────────────────────────────────────────

test('replica files round-trip, carry the schema, and are named per device', () => {
  const r = rng(11);
  for (let i = 0; i < 100; i++) {
    const w = world(i + 300, { steps: 10 });
    const d = w.devs[0];
    const json = encodeReplica({ dev: d.dev, at: 1700000000000 + i, epoch: d.meta.epoch, clock: d.meta.clock, parts: d.meta.parts, doc: d.doc });
    const back = decodeReplica(json);
    assert.ok(back && !isNewer(back));
    assert.equal(JSON.parse(json).schema, BACKUP_SCHEMA);
    assert.equal(back.at, 1700000000000 + i);
    const want = replicaOf(d.doc, d.meta);
    assert.deepEqual(back.clock, want.clock);
    assert.deepEqual(back.parts, want.parts);
    assert.equal(back.epoch, want.epoch);
    assert.deepEqual(back.doc, migrate(JSON.parse(JSON.stringify(d.doc))));
    // 쓴 시각만 다르면 지문이 같고, 내용이 다르면 다르다
    const dg = replicaDigest({ dev: d.dev, epoch: d.meta.epoch, clock: d.meta.clock, parts: d.meta.parts, doc: d.doc });
    assert.equal(dg, replicaDigest({ dev: d.dev, epoch: d.meta.epoch, clock: { ...d.meta.clock }, parts: d.meta.parts, doc: JSON.parse(JSON.stringify(d.doc)) }));
    assert.notEqual(dg, replicaDigest({ dev: d.dev, epoch: d.meta.epoch, clock: d.meta.clock, parts: d.meta.parts, doc: { ...d.doc, centerGoal: d.doc.centerGoal + '!' } }));
    assert.match(dg, /^[0-9a-f]{16}$/);
  }
  assert.equal(replicaName(DEVS[0]), `Sync/v1/${DEVS[0]}.jsonz`);
  assert.equal(devOfName(replicaName(DEVS[1])), DEVS[1]);
  assert.equal(devOfName('Sync/v1/x.jsonz'), null);
  assert.equal(devOfName('Other/aaaaaaaaaaaaaaaa.jsonz'), null);
  assert.equal(SIZE_WARN, 2 * 1024 * 1024);
  void r;
});

test('decodeReplica returns null on garbage and never throws', () => {
  const d = fullDoc();
  const m = epochReset(metaFor(DEVS[0]), T0, d);
  const good = JSON.parse(encodeReplica({ dev: DEVS[0], at: 1, epoch: m.epoch, clock: m.clock, parts: { fm: { [DEVS[0]]: [100, 0] } }, doc: d }));
  assert.ok(decodeReplica(JSON.stringify(good)));
  const bad = [
    '', 'null', '[]', '{', '"x"', '{"v":2}',
    { ...good, v: 2 }, { ...good, schema: 'x' }, { ...good, schema: 0 }, { ...good, dev: 'NOPE' }, { ...good, dev: undefined },
    { ...good, epoch: 'zz' }, { ...good, at: -1 }, { ...good, at: 'x' },
    { ...good, clock: [] }, { ...good, clock: { a: 'bad' } }, { ...good, clock: { a: 5 } },
    { ...good, parts: { fm: { [DEVS[0]]: [-1, 0] } } }, { ...good, parts: { fm: { BAD: [1, 0] } } }, { ...good, parts: { fm: [] } },
    { ...good, doc: null }, { ...good, doc: [] }, { ...good, doc: { themes: 'x' } },
  ];
  for (const b of bad) {
    const text = typeof b === 'string' ? b : JSON.stringify(b);
    assert.equal(decodeReplica(text), null, text.slice(0, 60));
  }
  // 시계의 __proto__ 키는 받지 않는다(프로토타입이 바뀌지 않는다)
  const proto = decodeReplica(JSON.stringify(good).replace('"clock":{', `"clock":{"__proto__":"${m.epoch}",`));
  assert.equal(proto, null);
  assert.equal({}.polluted, undefined);
});

// ── 무거운 문서 ──────────────────────────────────────────────────────────────

// 3년 문서(tests/helpers/heavyDoc.js) — 도장 시간 지킴이(syncEnvelope.test.js)와 같은 것
const { heavyDoc } = require('./helpers/heavyDoc');

test('a heavy 3-year doc merges in under 600 ms in Node', () => {
  const d = heavyDoc();
  const A = { meta: epochReset(metaFor(DEVS[0]), T0, d), doc: d };
  const B = { meta: { ...A.meta, dev: DEVS[1], tag: metaFor(DEVS[1]).tag }, doc: d };
  edit(A, (doc) => ({ ...addCount(doc, 3, 3, 1, '2026-10-02'), dayLog: toggleDayLog(doc.dayLog, '0-0', '2026-10-02') }), T0 + 1000);
  edit(B, (doc) => editCell(doc, 7, 7, (a) => ({ ...a, note: '아이패드에서' })), T0 + 2000);
  assert.ok(project(d).size > 20000, 'heavy enough');
  merge(replicaOf(A.doc, A.meta), replicaOf(B.doc, B.meta)); // 데우기
  const t = process.hrtime.bigint();
  const m = merge(replicaOf(A.doc, A.meta), replicaOf(B.doc, B.meta));
  const ms = Number(process.hrtime.bigint() - t) / 1e6;
  assert.ok(ms < 600, `merge took ${ms.toFixed(0)} ms`);
  if (process.env.SYNC_TIMING) console.log(`heavy merge ${ms.toFixed(0)} ms`);
  assert.equal(m.doc.themes[7].actions[7].note, '아이패드에서');
  assert.equal(m.doc.themes[3].actions[3].count, 401);
});

