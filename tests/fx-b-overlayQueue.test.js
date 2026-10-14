// 오버레이 대기열(src/lib/overlayQueue.ts) — 가짜 시계·타이머로 UIProvider가 부르는 순서를 흉내 낸다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createOverlayQueue, OVERLAY_GAP } = require('../src/lib/overlayQueue');

/** 가짜 시계 + 타이머 + "렌더" — open은 화면 상태(anyOpen), render()가 그것으로 sync를 부른다 */
function harness() {
  let t = 1000;
  const timers = [];
  const env = {
    open: false,
    log: [],
    passes: 0,
    now: () => t,
    q: null,
    advance(ms) {
      const end = t + ms;
      for (;;) {
        timers.sort((a, b) => a.at - b.at);
        const next = timers.find((x) => !x.dead && x.at <= end);
        if (!next) break;
        t = next.at;
        next.dead = true;
        next.fn();
        env.flush();
      }
      t = end;
    },
    pending: false,
    flush() {
      // requestPass → 다음 렌더 뒤 sync(open)
      while (env.pending) {
        env.pending = false;
        env.q.sync(env.open);
      }
    },
    /** 열림 상태가 바뀌는 렌더 */
    setOpen(o) {
      env.open = o;
      env.q.sync(o);
      env.flush();
    },
  };
  env.q = createOverlayQueue({
    now: env.now,
    setTimer: (fn, ms) => { const x = { at: t + ms, fn, dead: false }; timers.push(x); return x; },
    clearTimer: (x) => { x.dead = true; },
    requestPass: () => { env.pending = true; env.passes += 1; },
  });
  return env;
}

test('H1 — 아무것도 열려 있지 않아도 방금 닫혔다면 OVERLAY_GAP을 기다린 뒤에 띄운다', () => {
  const h = harness();
  h.setOpen(true); // 집중 타이머
  h.advance(5000);
  // 타이머를 닫는 같은 커밋에서 64/64 → fireCelebrate. 자식 효과(Milestones)가 먼저 push한다
  h.q.push(() => { h.log.push('celebrate'); h.open = true; });
  h.setOpen(false);
  h.advance(OVERLAY_GAP - 1);
  assert.deepEqual(h.log, [], '닫힌 지 OVERLAY_GAP이 지나기 전에는 띄우지 않는다');
  h.advance(1);
  assert.deepEqual(h.log, ['celebrate']);
});

test('H1 — 닫힌 뒤 sync가 먼저 오고 push가 나중에 와도 남은 시간만큼 기다린다', () => {
  const h = harness();
  h.setOpen(true);
  h.setOpen(false);
  h.advance(100);
  h.q.push(() => h.log.push('ritual'));
  h.flush();
  h.advance(OVERLAY_GAP - 101);
  assert.deepEqual(h.log, []);
  h.advance(1);
  assert.deepEqual(h.log, ['ritual']);
});

test('오래 전에 닫혔거나 처음이면 바로(다음 틱) 띄운다', () => {
  const h = harness();
  h.q.push(() => h.log.push('share'));
  h.flush();
  h.advance(0);
  assert.deepEqual(h.log, ['share']);
});

test('열려 있는 동안은 기다리고, 다시 열리면 걸어 둔 타이머를 걷는다', () => {
  const h = harness();
  h.setOpen(true);
  h.q.push(() => h.log.push('a'));
  h.flush();
  h.advance(10000);
  assert.deepEqual(h.log, []);
  h.setOpen(false);
  h.advance(200);
  h.setOpen(true); // 다른 시트가 끼어들었다
  h.advance(10000);
  assert.deepEqual(h.log, []);
  h.setOpen(false);
  h.advance(OVERLAY_GAP);
  assert.deepEqual(h.log, ['a']);
});

test('H2 — 한 번에 하나만: 앞의 것이 무언가를 열면 나머지는 그것이 닫힐 때까지 기다린다', () => {
  const h = harness();
  h.setOpen(true); // 실천 시트
  h.q.push(() => { h.log.push('celebrate'); h.open = true; }); // 마지막 칸 체크 → 마무리 페이지
  h.q.push(() => { h.log.push('editor'); h.open = true; }); // 연필 → 편집 창
  h.flush();
  h.setOpen(false);
  h.advance(OVERLAY_GAP);
  assert.deepEqual(h.log, ['celebrate'], '두 모달을 같은 프레임에 띄우지 않는다');
  // 마무리 페이지가 실제로 열린 렌더
  h.setOpen(true);
  h.advance(60000);
  assert.deepEqual(h.log, ['celebrate']);
  h.setOpen(false);
  h.advance(OVERLAY_GAP - 1);
  assert.deepEqual(h.log, ['celebrate']);
  h.advance(1);
  assert.deepEqual(h.log, ['celebrate', 'editor']);
});

test('H2 — 아무것도 열지 않은 것(화면 이동)이면 다음 차례에 바로 이어서', () => {
  const h = harness();
  h.q.push(() => h.log.push('go'));
  h.q.push(() => h.log.push('go2'));
  h.flush();
  h.advance(0);
  assert.deepEqual(h.log, ['go', 'go2']);
  assert.equal(h.q.size(), 0);
});

test('부른 것이 던져도 대기열은 계속 돈다', () => {
  const h = harness();
  const warn = console.warn;
  console.warn = () => {};
  try {
    h.q.push(() => { throw new Error('x'); });
    h.q.push(() => h.log.push('after'));
    h.flush();
    h.advance(0);
  } finally {
    console.warn = warn;
  }
  assert.deepEqual(h.log, ['after']);
});

test('ui.tsx — fireCelebrate · openRitual · openShare는 늘 afterOverlays를 거친다', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'src/navigation/ui.tsx'), 'utf8');
  assert.match(src, /createOverlayQueue/);
  for (const name of ['fireCelebrate', 'openRitual', 'openShare']) {
    const body = src.slice(src.indexOf(`const ${name} = useCallback`), src.indexOf('}, [afterOverlays]', src.indexOf(`const ${name} = useCallback`)));
    assert.ok(body.length > 0, name);
    assert.doesNotMatch(body, /anyOpenRef/, `${name}가 열린 게 없을 때 바로 띄우지 않는다`);
    assert.match(body, /afterOverlays\(/, name);
  }
});
