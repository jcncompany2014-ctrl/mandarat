// 집중 세션 적어 두기(src/lib/focusSession.ts) — 멈춰 있던 앱을 iOS가 끝내도 세션이 남는다.
// 가짜 저장소 · 가짜 시계로: 도는 중에 꺼짐 · 멈춘 채 꺼짐 · 끝난 뒤 다시 엶 · 두 번 다시 엶(분을 두 번 더하지 않는다).
// 화면(src/overlays/FocusTimer.tsx)이 같은 함수를 같은 자리에서 부르는지는 아래 '화면' 시험이 본다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../src/lib/focusSession');
const { FOCUS_TOTAL, leftOfMs } = require('../src/lib/focusClock');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const MIN = 60 * 1000;
/** 2026-11-20(금) — 그날의 시 · 분 · 초 */
const at = (h, m = 0, s = 0, day = 20) => new Date(2026, 10, day, h, m, s).getTime();

/** 가짜 AsyncStorage — 기기에 남는 것. fail에 이름을 넣으면 그 호출이 던진다 */
function fakeStorage() {
  const st = {
    mem: new Map(),
    calls: [],
    fail: new Set(),
    delay: 0,
    async getItem(k) {
      st.calls.push('get');
      if (st.fail.has('get')) throw new Error('get');
      return st.mem.has(k) ? st.mem.get(k) : null;
    },
    async setItem(k, v) {
      st.calls.push('set');
      if (st.delay) await new Promise((r) => setTimeout(r, st.delay));
      if (st.fail.has('set')) throw new Error('set');
      st.mem.set(k, v);
    },
    async removeItem(k) {
      st.calls.push('remove');
      if (st.fail.has('remove')) throw new Error('remove');
      st.mem.delete(k);
    },
    saved: () => S.parseFocusSession(st.mem.get(S.FOCUS_SESSION_KEY)),
  };
  return st;
}

/**
 * 화면의 세션(FocusSession)을 흉내 낸다 — 같은 벽시계 셈(끝날 시각 · 남은 ms)과 같은 lib 함수.
 * 처음: 되살린 세션이면 적어 둔 모습에서, 아니면 25:00. 돌기 시작 · 멈춤 · 다시 이음에 적고, 닫으면 더하고 지운다.
 */
class Timer {
  constructor(app, ti, ai, from) {
    this.app = app;
    const now = app.clock.now;
    this.init = from
      ? { ms: S.sessionLeftMs(from, now), run: from.endAt !== null, base: { id: from.id, ti, ai, startedAt: from.startedAt, credited: from.credited } }
      : { ms: FOCUS_TOTAL * 1000, run: true, base: { id: S.newFocusId(now, () => 0.5), ti, ai, startedAt: now, credited: 0 } };
    this.remainingMs = this.init.ms;
    this.run = this.init.run;
    this.endAt = 0;
    this.effect();
  }

  /** 지금 남은 초 */
  left() {
    return leftOfMs(this.run && this.endAt ? this.endAt - this.app.clock.now : this.remainingMs);
  }

  get finished() {
    return this.left() <= 0;
  }

  /** run이 바뀐 뒤의 효과 — 시계를 맞추고 적는다 */
  effect() {
    if (this.run && this.remainingMs > 0) this.endAt = this.app.clock.now + this.remainingMs;
    if (this.finished) return;
    this.app.store.save(S.focusRecord(this.init.base, { run: this.run, endAt: this.endAt, remainingMs: this.remainingMs }, this.app.clock.now));
  }

  pause() {
    this.remainingMs = Math.max(0, this.endAt - this.app.clock.now);
    this.run = false;
    this.endAt = 0;
    this.effect();
  }

  resume() {
    this.run = true;
    this.effect();
  }

  /** 닫기 — 아직 더하지 않은 분을 더하고 지운다 */
  close() {
    const m = S.owedMinutes(this.left(), this.init.base.credited);
    if (m > 0) this.app.doc.focusMinutes += m;
    this.app.timer = null;
    return this.app.store.clear();
  }
}

/** 앱 한 번(프로세스 하나) — 저장소와 문서는 기기에 남고, 타이머는 프로세스와 함께 사라진다 */
class App {
  constructor(device) {
    this.clock = device.clock;
    this.doc = device.doc;
    this.store = S.focusSessionStore(device.storage);
    this.timer = null;
    this.credits = [];
  }

  /** 앱을 켠다 — 적어 둔 세션을 읽고, 다시 열 것이 있으면 연다 */
  async boot() {
    const r = await this.store.resume(this.clock.now, (m) => {
      this.credits.push(m);
      this.doc.focusMinutes += m;
    });
    if (r) this.timer = new Timer(this, r.ti, r.ai, r);
    return r;
  }

  start(ti, ai) {
    this.timer = new Timer(this, ti, ai, null);
    return this.timer;
  }
}

function device(now = at(10)) {
  return { clock: { now }, doc: { focusMinutes: 0 }, storage: fakeStorage() };
}

/** 적기 · 지우기가 끝나길 기다린다(가짜 저장소는 바로 끝난다) */
const flush = () => new Promise((r) => setTimeout(r, 5));

// ── 적는 꼴 ─────────────────────────────────────────────────────────────────

test('적는 꼴 — 도는 중은 끝날 시각, 멈춘 중은 남은 ms. 열쇠는 앱의 이름공간', () => {
  assert.equal(S.FOCUS_SESSION_KEY, 'mandarat:focus:v1');
  assert.equal(S.FOCUS_PLANNED_MINS, 25);
  const base = { id: 'a-1', ti: 2, ai: 5, startedAt: at(10), credited: 0 };
  const running = S.focusRecord(base, { run: true, endAt: at(10, 25), remainingMs: 123 }, at(10));
  assert.deepEqual(running, { id: 'a-1', ti: 2, ai: 5, startedAt: at(10), plannedMins: 25, endAt: at(10, 25), remainingMs: null, credited: 0, savedAt: at(10) });
  const paused = S.focusRecord(base, { run: false, endAt: 0, remainingMs: 17.5 * MIN + 0.4 }, at(10, 8));
  assert.equal(paused.endAt, null);
  assert.equal(paused.remainingMs, 17.5 * MIN, '온 ms로');
  assert.equal(paused.savedAt, at(10, 8));
  // 왕복
  for (const s of [running, paused]) assert.deepEqual(S.parseFocusSession(S.serializeFocusSession(s)), s);
  assert.equal(JSON.parse(S.serializeFocusSession(running)).v, 1);
  // 아이디 — 시작 시각 + 난수
  assert.match(S.newFocusId(at(10)), /^[0-9a-z]+-[0-9a-z]+$/);
  assert.notEqual(S.newFocusId(at(10), () => 0.1), S.newFocusId(at(10), () => 0.2));
});

test('읽기 — 깨진 값 · 모르는 판 · 어긋난 모양은 버린다', () => {
  const ok = { v: 1, id: 'x', ti: 0, ai: 7, startedAt: 1, plannedMins: 25, endAt: 5, remainingMs: null, credited: 0, savedAt: 1 };
  assert.ok(S.parseFocusSession(JSON.stringify(ok)));
  for (const raw of [null, undefined, '', '{not json', 'null', '[]', '"x"']) assert.equal(S.parseFocusSession(raw), null, String(raw));
  const bad = [
    { v: 2 }, { id: '' }, { id: 3 }, { ti: 8 }, { ti: -1 }, { ai: 1.5 }, { ai: '1' }, { startedAt: null }, { savedAt: 'x' },
    { plannedMins: 0 }, { plannedMins: 99999 }, { credited: -1 }, { credited: null },
    // 끝날 시각과 남은 ms는 하나만
    { endAt: null, remainingMs: null }, { endAt: 5, remainingMs: 5 }, { endAt: null, remainingMs: -1 }, { endAt: 'x' },
  ];
  for (const patch of bad) assert.equal(S.parseFocusSession(JSON.stringify({ ...ok, ...patch })), null, JSON.stringify(patch));
});

test('남은 시간 · 더할 분 — 벽시계에서, 0 ~ 25분 사이', () => {
  const run = S.focusRecord({ id: 'a', ti: 0, ai: 0, startedAt: at(10), credited: 0 }, { run: true, endAt: at(10, 25), remainingMs: 0 }, at(10));
  assert.equal(S.sessionLeftMs(run, at(10)), 25 * MIN);
  assert.equal(S.sessionLeftMs(run, at(10, 10, 40)), 14 * MIN + 20 * 1000);
  assert.equal(S.sessionLeftMs(run, at(10, 25)), 0);
  assert.equal(S.sessionLeftMs(run, at(18)), 0);
  // 시계가 거꾸로 가도 25분을 넘지 않는다
  assert.equal(S.sessionLeftMs(run, at(9)), 25 * MIN);
  const paused = { ...run, endAt: null, remainingMs: 7 * MIN };
  assert.equal(S.sessionLeftMs(paused, at(10)), 7 * MIN);
  assert.equal(S.sessionLeftMs(paused, at(23)), 7 * MIN, '멈춘 동안은 흐르지 않는다');
  // 다 채운 1분만, 이미 더한 분은 뺀다
  assert.equal(S.owedMinutes(FOCUS_TOTAL, 0), 0);
  assert.equal(S.owedMinutes(FOCUS_TOTAL - 640, 0), 10);
  assert.equal(S.owedMinutes(0, 0), 25);
  assert.equal(S.owedMinutes(0, 25), 0);
  assert.equal(S.owedMinutes(0, 30), 0);
  assert.equal(S.owedMinutes(0, 10), 15);
});

// ── 꺼졌다 켜지기 ────────────────────────────────────────────────────────────

test('도는 중에 꺼짐 → 끝나기 전에 다시 엶: 남은 시간 그대로 이어지고, 닫을 때 한 번 더한다', async () => {
  const d = device(at(10));
  const a = new App(d);
  a.start(3, 4);
  await flush();
  assert.deepEqual([d.storage.saved().ti, d.storage.saved().ai, d.storage.saved().endAt], [3, 4, at(10, 25)]);
  // 10분 40초 뒤 iOS가 앱을 끝낸다 — 닫기도 언마운트도 없다
  d.clock.now = at(10, 10, 40);
  // 12분째에 다시 연다
  d.clock.now = at(10, 12);
  const b = new App(d);
  const r = await b.boot();
  assert.ok(r, '다시 연다');
  assert.deepEqual(b.credits, [], '아직 도는 세션은 켤 때 더하지 않는다');
  assert.equal(b.timer.run, true);
  assert.equal(b.timer.left(), 13 * 60, '끝날 시각은 그대로(꺼져 있던 동안도 흐른다)');
  assert.equal(b.timer.init.base.id, a.timer.init.base.id, '같은 세션');
  assert.equal(b.timer.init.base.startedAt, at(10));
  await flush();
  assert.equal(d.storage.saved().endAt, at(10, 25));
  // 15분째에 그만하기
  d.clock.now = at(10, 15);
  await b.timer.close();
  assert.equal(d.doc.focusMinutes, 15);
  assert.equal(d.storage.mem.size, 0, '닫으면 지운다');
  // 다음에 켜면 아무것도 없다
  const c = new App(d);
  assert.equal(await c.boot(), null);
  assert.equal(d.doc.focusMinutes, 15);
});

test('도는 중에 꺼짐 → 끝난 뒤 다시 엶: 25분을 한 번 더하고, 다 채운 모습으로 연다', async () => {
  const d = device(at(10));
  new App(d).start(1, 0);
  await flush();
  // 5분째에 꺼지고, 40분 뒤에 연다(끝 알림은 10:25에 혼자 울렸다)
  d.clock.now = at(10, 40);
  const b = new App(d);
  const r = await b.boot();
  assert.deepEqual(b.credits, [25]);
  assert.equal(d.doc.focusMinutes, 25);
  assert.ok(r, '오늘 끝난 세션은 다시 연다 — 끝내기 단추(했어요)를 고를 수 있게');
  assert.equal(b.timer.finished, true);
  assert.equal(b.timer.left(), 0);
  assert.equal(r.credited, 25);
  assert.equal(d.storage.saved().credited, 25, '더한 분은 세션에 적혀 있다');
  // 끝내기(또는 닫기) — 이미 더한 분은 다시 더하지 않는다
  await b.timer.close();
  assert.equal(d.doc.focusMinutes, 25);
  assert.equal(d.storage.mem.size, 0);
});

test('두 번 다시 엶: 다 채운 모습에서 또 꺼져도 분은 한 번만', async () => {
  const d = device(at(10));
  new App(d).start(0, 0);
  await flush();
  d.clock.now = at(10, 40);
  const b = new App(d);
  await b.boot();
  assert.equal(d.doc.focusMinutes, 25);
  // 닫지 않고 또 꺼진다 → 50분째에 다시
  d.clock.now = at(10, 50);
  const c = new App(d);
  const r = await c.boot();
  assert.deepEqual(c.credits, [], '두 번째에는 더하지 않는다');
  assert.equal(d.doc.focusMinutes, 25);
  assert.ok(r && c.timer.finished, '그래도 다 채운 모습으로 다시 연다');
  // 세 번째도
  const e = new App(d);
  await e.boot();
  assert.equal(d.doc.focusMinutes, 25);
  await e.timer.close();
  assert.equal(d.doc.focusMinutes, 25);
  assert.equal(await new App(d).boot(), null);
  assert.equal(d.doc.focusMinutes, 25);
});

test('한 프로세스에서 읽기가 두 번 겹쳐도(개발 모드의 두 번 마운트) 한 번만 더한다', async () => {
  const d = device(at(10));
  new App(d).start(0, 0);
  await flush();
  d.clock.now = at(11);
  const b = new App(d);
  let n = 0;
  const [r1, r2] = await Promise.all([
    b.store.resume(d.clock.now, (m) => { n += m; }),
    b.store.resume(d.clock.now, (m) => { n += m; }),
  ]);
  assert.equal(n, 25);
  assert.equal(r1.credited, 25);
  assert.equal(r2.credited, 25);
});

test('멈춘 채 꺼짐 → 같은 날 다시 엶: 멈춘 채로 그 남은 시간에서, 더하지 않는다', async () => {
  const d = device(at(10));
  const a = new App(d);
  a.start(5, 2);
  d.clock.now = at(10, 7, 30);
  a.timer.pause();
  await flush();
  assert.deepEqual([d.storage.saved().endAt, d.storage.saved().remainingMs], [null, 17.5 * MIN]);
  // 두 시간 뒤(멈춘 동안은 흐르지 않는다)
  d.clock.now = at(12, 7);
  const b = new App(d);
  const r = await b.boot();
  assert.ok(r);
  assert.deepEqual(b.credits, []);
  assert.equal(b.timer.run, false, '멈춘 채로');
  assert.equal(b.timer.left(), 17 * 60 + 30);
  // 다시 이으면 지금부터 17분 30초
  b.timer.resume();
  await flush();
  assert.equal(d.storage.saved().endAt, at(12, 7) + 17.5 * MIN);
  assert.equal(d.storage.saved().remainingMs, null);
  // 다 채우고 닫는다 — 25분
  d.clock.now = at(12, 30);
  assert.equal(b.timer.finished, true);
  await b.timer.close();
  assert.equal(d.doc.focusMinutes, 25);
  assert.equal(d.storage.mem.size, 0);
});

test('멈춘 채 꺼짐 → 바로 그만하기: 멈추기 전까지의 분만', async () => {
  const d = device(at(10));
  const a = new App(d);
  a.start(5, 2);
  d.clock.now = at(10, 7, 30);
  a.timer.pause();
  await flush();
  d.clock.now = at(10, 30);
  const b = new App(d);
  await b.boot();
  await b.timer.close();
  assert.equal(d.doc.focusMinutes, 7);
});

test('다른 날의 세션은 열지 않는다 — 집중한 분만 더하고 지운다(끝내기의 "오늘 했어요"가 다른 날을 체크하지 않게)', async () => {
  // 어제 23:10에 시작해 꺼졌고(23:35에 끝났다), 오늘 아침에 연다
  let d = device(at(23, 10, 0, 19));
  new App(d).start(0, 0);
  await flush();
  d.clock.now = at(9);
  let b = new App(d);
  assert.equal(await b.boot(), null);
  assert.deepEqual(b.credits, [25]);
  assert.equal(d.storage.mem.size, 0);
  assert.equal(await new App(d).boot(), null);
  assert.equal(d.doc.focusMinutes, 25, '한 번만');

  // 어제 멈춘 채 꺼진 세션 — 멈추기 전까지의 분만
  d = device(at(22, 0, 0, 19));
  const a = new App(d);
  a.start(0, 0);
  d.clock.now = at(22, 9, 10, 19);
  a.timer.pause();
  await flush();
  d.clock.now = at(9);
  b = new App(d);
  assert.equal(await b.boot(), null);
  assert.deepEqual(b.credits, [9]);
  assert.equal(d.storage.mem.size, 0);

  // 자정을 넘겨 아직 도는 세션은 이어진다(23:50 시작 → 00:05에 다시 엶, 10분 남음)
  d = device(at(23, 50, 0, 19));
  new App(d).start(0, 0);
  await flush();
  d.clock.now = at(0, 5);
  b = new App(d);
  assert.ok(await b.boot());
  assert.equal(b.timer.left(), 10 * 60);
  assert.deepEqual(b.credits, []);
  await flush();

  // 자정을 넘겨 끝난 세션(00:15)을 그날 아침에 연다 — 끝난 날이 오늘이라 다 채운 모습으로
  d.clock.now = at(8);
  b = new App(d);
  const r = await b.boot();
  assert.ok(r && b.timer.finished);
  assert.deepEqual(b.credits, [25]);
});

test('다 채운 뒤 꺼짐(닫기 전): 다시 열 때 한 번 더하고 다 채운 모습으로', async () => {
  const d = device(at(10));
  const a = new App(d);
  a.start(0, 0);
  await flush();
  // 25분을 화면에서 다 채웠다 — 닫기 전에는 아직 더하지 않았다(적어 둔 끝날 시각은 그대로)
  d.clock.now = at(10, 26);
  assert.equal(a.timer.finished, true);
  assert.equal(d.doc.focusMinutes, 0);
  assert.equal(d.storage.saved().endAt, at(10, 25));
  d.clock.now = at(10, 31);
  const b = new App(d);
  await b.boot();
  assert.equal(d.doc.focusMinutes, 25);
  assert.ok(b.timer.finished);
  await b.timer.close();
  assert.equal(d.doc.focusMinutes, 25);
});

test('보통의 세션(꺼지지 않음): 닫으면 지우고, 다음에 켤 때 아무 일도 없다', async () => {
  const d = device(at(10));
  const a = new App(d);
  assert.equal(await a.boot(), null, '적어 둔 것이 없다');
  assert.deepEqual(d.storage.calls, ['get']);
  a.start(0, 0);
  d.clock.now = at(10, 3, 20);
  a.timer.pause();
  d.clock.now = at(10, 10);
  a.timer.resume();
  d.clock.now = at(10, 12, 5);
  await a.timer.close();
  assert.equal(d.doc.focusMinutes, 5, '3분 20초 + 2분 5초 = 5분(다 채운 1분만)');
  assert.equal(d.storage.mem.size, 0);
  assert.equal(await new App(d).boot(), null);
  assert.equal(d.doc.focusMinutes, 5);
});

// ── 저장소가 말을 안 들을 때 ─────────────────────────────────────────────────

test('차례대로 — 늦게 끝난 적기가 뒤의 지우기를 덮지 않는다', async () => {
  const d = device(at(10));
  d.storage.delay = 15;
  const a = new App(d);
  a.start(0, 0);
  // 적기가 끝나기 전에 닫는다
  await a.timer.close();
  await flush();
  assert.equal(d.storage.mem.size, 0);
  assert.deepEqual(d.storage.calls, ['set', 'remove']);
});

test('더한 분을 적지 못하면 더하지 않는다 — 다음에 또 더하게 되느니, 닫을 때 한 번', async () => {
  const d = device(at(10));
  new App(d).start(0, 0);
  await flush();
  d.clock.now = at(11);
  d.storage.fail.add('set');
  const b = new App(d);
  const r = await b.boot();
  assert.deepEqual(b.credits, [], '적지 못했다 → 켤 때는 더하지 않는다');
  assert.ok(r && r.credited === 0, '그래도 다 채운 모습으로 연다');
  // 또 꺼졌다 켜져도 그대로
  const c = new App(d);
  await c.boot();
  assert.equal(d.doc.focusMinutes, 0);
  // 닫을 때 한 번
  await c.timer.close();
  assert.equal(d.doc.focusMinutes, 25);

  // 다른 날의 세션인데 지우지 못하면 — 더하지 않는다(다음에 켤 때 다시 본다)
  const d2 = device(at(10, 0, 0, 19));
  new App(d2).start(0, 0);
  await flush();
  d2.clock.now = at(10);
  d2.storage.fail.add('remove');
  const e = new App(d2);
  assert.equal(await e.boot(), null);
  assert.deepEqual(e.credits, []);
  d2.storage.fail.clear();
  const f = new App(d2);
  assert.equal(await f.boot(), null);
  assert.deepEqual(f.credits, [25]);
  assert.equal(await new App(d2).boot(), null);
  assert.equal(d2.doc.focusMinutes, 25);
});

test('읽기가 던지거나 값이 깨졌으면 조용히 없던 일로', async () => {
  const d = device(at(10));
  d.storage.fail.add('get');
  const a = new App(d);
  assert.equal(await a.boot(), null);
  d.storage.fail.clear();
  d.storage.mem.set(S.FOCUS_SESSION_KEY, '{broken');
  assert.equal(await a.boot(), null);
  assert.equal(d.storage.mem.size, 0, '깨진 값은 지운다');
  assert.deepEqual(a.credits, []);
  // 적기 · 지우기가 던져도 밖으로 던지지 않는다
  d.storage.fail.add('set');
  d.storage.fail.add('remove');
  a.start(0, 0);
  await a.timer.close();
  await flush();
});

// ── 화면 ────────────────────────────────────────────────────────────────────

test('화면(FocusTimer): 같은 저장소 · 같은 함수를 — 돌기 시작 · 멈춤 · 다시 이음에 적고, 닫으면 지우고, 켤 때 되살린다', () => {
  const s = src('src/overlays/FocusTimer.tsx');
  assert.match(s, /import AsyncStorage from '@react-native-async-storage\/async-storage';/);
  assert.match(s, /const saved = focusSessionStore\(AsyncStorage\);/);

  // 켤 때 — 프로세스마다 한 번 읽고, 다시 열 세션이 있으면 그 칸의 타이머를 연다
  const outer = s.slice(s.indexOf('export function FocusTimer()'), s.indexOf('function keepAwake('));
  assert.match(outer, /if \(!openRef\.current\) focusLive\.endAll\(\);/);
  assert.match(outer, /boot \?\?= saved\.resume\(Date\.now\(\), addFocusMinutes\);/);
  assert.match(outer, /if \(!alive \|\| bootTaken \|\| !r\) return;\s*bootTaken = true;/);
  assert.match(outer, /setResumed\(r\);\s*startFocus\(r\.ti, r\.ai\);/);
  // 그새 다른 집중이 열렸으면 열지 않고 남은 분만 더한다
  assert.match(outer, /if \(openRef\.current\) \{\s*const owed = owedMinutes\(leftOfMs\(sessionLeftMs\(r, Date\.now\(\)\)\), r\.credited, r\.plannedMins\);\s*if \(owed > 0\) addFocusMinutes\(owed\);\s*return;/);
  // 닫히면 되살릴 값도 버린다(다음 집중은 25:00에서)
  assert.match(outer, /if \(!focus\) setResumed\(null\);\s*\}, \[focus\]\);/);
  assert.match(outer, /const from = resumed && resumed\.ti === focus\.ti && resumed\.ai === focus\.ai \? resumed : null;\s*return <FocusSession ti=\{focus\.ti\} ai=\{focus\.ai\} from=\{from\} \/>;/);

  // 처음 모습 — 되살린 세션이면 적어 둔 남은 시간 · 멈춤 · 아이디 · 이미 더한 분
  assert.match(s, /\? \{ ms: sessionLeftMs\(from, now\), run: from\.endAt !== null, base: \{ id: from\.id, ti, ai, startedAt: from\.startedAt, credited: from\.credited \} \}/);
  assert.match(s, /: \{ ms: FOCUS_TOTAL \* 1000, run: true, base: \{ id: newFocusId\(now\), ti, ai, startedAt: now, credited: 0 \} \};/);
  assert.match(s, /const \[left, setLeft\] = useState\(\(\) => leftOfMs\(init\.ms\)\);\s*const \[run, setRun\] = useState\(init\.run\);/);
  assert.match(s, /const remainingMsRef = useRef\(init\.ms\);/);

  // 적기 — 시계 효과(끝날 시각 · 남은 ms를 맞춘다) 뒤에, run · finished가 바뀔 때
  const clock = s.indexOf('useEffect(() => {\n    if (!run || finished) return;\n    endAtRef.current');
  const save = s.indexOf('saved.save(');
  assert.ok(clock > 0 && save > clock, '적기는 시계 효과 뒤');
  assert.match(s, /useEffect\(\(\) => \{\s*if \(finished\) return;\s*saved\.save\(focusRecord\(init\.base, \{ run, endAt: endAtRef\.current, remainingMs: remainingMsRef\.current \}, Date\.now\(\)\)\);\s*\}, \[run, finished, init\]\);/);
  assert.equal((s.match(/saved\.save\(/g) ?? []).length, 1);
  // 지우기 — 닫기 · 끝내기 · 언마운트(닫으면 세션이 언마운트된다)
  assert.match(s, /useEffect\(\(\) => \(\) => \{\s*saved\.clear\(\);\s*\}, \[\]\);/);
  // 기록 — 이미 더한 분은 뺀다, 한 번만
  assert.match(s, /if \(recordedRef\.current\) return;\s*\/\/[^\n]*\n\s*const m = owedMinutes\(currentLeft\(\), init\.base\.credited\);/);
  // 이미 끝난 세션을 되살렸으면 다시 울리지 않는다
  assert.match(s, /const firedRef = useRef\(init\.ms <= 0\);/);
});

test('문서 · 백업 · iCloud에는 들어가지 않는다 — 기기마다의 열쇠 하나', () => {
  for (const f of ['src/types.ts', 'src/lib/backup.ts', 'src/lib/syncProject.ts', 'src/store/MandaratContext.tsx']) {
    assert.doesNotMatch(src(f), /mandarat:focus|focusSession/, f);
  }
  // 다른 기기 값들과 열쇠가 겹치지 않는다
  const { STORE_KEYS } = require('../src/lib/contracts');
  assert.ok(!Object.values(STORE_KEYS).includes(S.FOCUS_SESSION_KEY));
  assert.match(S.FOCUS_SESSION_KEY, /^mandarat:[a-z]+:v1$/);
});
