// iCloud 시계(V1-F) — HLC 도장과 동기화 메타.
// 도장: 형식·순서·단조 증가·카운터 넘김·시계 어긋남 거절·유효 도장. 메타: 새로 만들기·너그러운 정리·꼬리표·rekey.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  enc, msOf, ctrOf, tagOfStamp, tick, observe, eff, isStamp, maxStamp, STAMP_LEN, CTR_MAX, MAX_SKEW_MS,
} = require('../src/lib/syncStamp');
const { newSyncMeta, cleanSyncMeta, tagOf, rekey, cleanParts, DEV_RE } = require('../src/lib/syncMeta');
const { rng } = require('./helpers/docFuzz');

const T0 = Date.UTC(2026, 9, 14, 0, 30);
const clockOf = (tag = 'ab12', last = '') => ({ tag, last });

test('도장: 15자, 나눈 값으로 되돌아오고, 문자열 순서가 (ms, 카운터, 꼬리표) 순서다', () => {
  const r = rng(0x51);
  const s = enc(T0, 7, 'zz09');
  assert.equal(s.length, STAMP_LEN);
  assert.equal(STAMP_LEN, 15);
  assert.ok(isStamp(s));
  assert.equal(msOf(s), T0);
  assert.equal(ctrOf(s), 7);
  assert.equal(tagOfStamp(s), 'zz09');
  assert.equal(msOf(''), 0);
  assert.equal(ctrOf(''), 0);
  assert.ok('' < enc(0, 0, '0000'), "'' 는 어떤 도장보다 작다");
  const tags = ['0000', 'ab12', 'zzzz', '9z0a'];
  for (let i = 0; i < 3000; i++) {
    const a = [Math.floor(r() * 2 ** 44), Math.floor(r() * (CTR_MAX + 1)), tags[Math.floor(r() * 4)]];
    const b = r() < 0.3 ? [a[0], Math.floor(r() * (CTR_MAX + 1)), tags[Math.floor(r() * 4)]] : [Math.floor(r() * 2 ** 44), Math.floor(r() * (CTR_MAX + 1)), tags[Math.floor(r() * 4)]];
    const cmp = (x, y) => (x[0] !== y[0] ? x[0] - y[0] : x[1] !== y[1] ? x[1] - y[1] : x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : 0);
    const want = Math.sign(cmp(a, b));
    const sa = enc(...a);
    const sb = enc(...b);
    assert.equal(sa < sb ? -1 : sa > sb ? 1 : 0, want);
    assert.deepEqual([msOf(sa), ctrOf(sa), tagOfStamp(sa)], a);
  }
  assert.equal(maxStamp(enc(1, 0, 'aaaa'), enc(1, 1, 'aaaa')), enc(1, 1, 'aaaa'));
  assert.equal(maxStamp('', enc(1, 0, 'aaaa')), enc(1, 0, 'aaaa'));
});

test('도장: 범위를 벗어난 값은 만들지 않는다', () => {
  assert.throws(() => enc(-1, 0, 'aaaa'));
  assert.throws(() => enc(36 ** 9, 0, 'aaaa'));
  assert.throws(() => enc(1.5, 0, 'aaaa'));
  assert.throws(() => enc(1, CTR_MAX + 1, 'aaaa'));
  assert.throws(() => enc(1, 0, 'AAAA'));
  assert.throws(() => enc(1, 0, 'aaa'));
  for (const bad of ['', 'x', enc(1, 0, 'aaaa').toUpperCase(), `${enc(1, 0, 'aaaa')}0`, 7, null]) assert.equal(isStamp(bad), false);
});

test('tick: 벽시계가 멈추거나 뒤로 가도 늘 커진다(단조 증가), 벽시계가 앞서면 그 시각을 쓴다', () => {
  const r = rng(0x52);
  let c = clockOf();
  let prev = '';
  let wall = T0;
  for (let i = 0; i < 5000; i++) {
    // 앞으로·제자리·뒤로(시계 조정)
    wall += [0, 0, 1, 5, -3, -1000, 60000][Math.floor(r() * 7)];
    const out = tick(c, wall);
    assert.ok(out.stamp > prev, `step ${i}`);
    assert.equal(out.meta.last, out.stamp);
    assert.equal(tagOfStamp(out.stamp), 'ab12');
    assert.ok(msOf(out.stamp) >= Math.min(wall, msOf(prev)));
    prev = out.stamp;
    c = out.meta;
  }
  const first = tick(clockOf(), T0);
  assert.equal(first.stamp, enc(T0, 0, 'ab12'));
  const later = tick(first.meta, T0 + 10);
  assert.equal(later.stamp, enc(T0 + 10, 0, 'ab12'));
  const same = tick(later.meta, T0 + 10);
  assert.equal(same.stamp, enc(T0 + 10, 1, 'ab12'));
  const back = tick(same.meta, T0 - 5000);
  assert.equal(back.stamp, enc(T0 + 10, 2, 'ab12'));
});

test('tick: 같은 밀리초에 1295번을 넘기면 다음 밀리초 카운터 0으로 넘어간다', () => {
  let c = clockOf();
  const seen = [];
  for (let i = 0; i <= CTR_MAX + 2; i++) {
    const out = tick(c, T0);
    seen.push(out.stamp);
    c = out.meta;
  }
  assert.equal(CTR_MAX, 1295);
  assert.equal(seen[CTR_MAX], enc(T0, 1295, 'ab12'));
  assert.equal(seen[CTR_MAX + 1], enc(T0 + 1, 0, 'ab12'));
  assert.equal(seen[CTR_MAX + 2], enc(T0 + 1, 1, 'ab12'));
  assert.equal(new Set(seen).size, seen.length);
  assert.deepEqual([...seen].sort(), seen);
});

test('observe: 다른 기기 도장 뒤로 시계를 당기지만, 24시간 넘게 앞선 도장은 거절한다', () => {
  const mine = tick(clockOf('aaaa'), T0).meta;
  const remote = enc(T0 + 60_000, 4, 'bbbb');
  const pulled = observe(mine, remote, T0);
  assert.equal(pulled.last, enc(T0 + 60_000, 4, 'aaaa'));
  const next = tick(pulled, T0).stamp;
  assert.ok(next > remote, '다음 도장은 본 도장보다 크다');
  // 정확히 24시간은 받아들이고, 그 뒤는 거절
  assert.equal(observe(mine, enc(T0 + MAX_SKEW_MS, 0, 'bbbb'), T0).last, enc(T0 + MAX_SKEW_MS, 0, 'aaaa'));
  const far = enc(T0 + MAX_SKEW_MS + 1, 0, 'bbbb');
  assert.equal(observe(mine, far, T0), mine, '고장 난 시계는 받아들이지 않는다');
  assert.equal(MAX_SKEW_MS, 24 * 60 * 60 * 1000);
  // 이미 앞선 시계는 그대로, 깨진 도장은 무시
  const ahead = tick(clockOf('aaaa'), T0 + 5000).meta;
  assert.equal(observe(ahead, enc(T0, 0, 'zzzz'), T0), ahead);
  assert.equal(observe(ahead, 'garbage', T0), ahead);
  assert.equal(observe(ahead, '', T0), ahead);
  // 같은 (ms, 카운터)에 꼬리표만 큰 도장 — 시계는 그대로지만 다음 tick이 그것보다 크다
  const tie = observe(ahead, enc(T0 + 5000, 0, 'zzzz'), T0);
  assert.ok(tick(tie, T0).stamp > enc(T0 + 5000, 0, 'zzzz'));
});

test('observe 뒤의 tick은 본 모든 도장보다 크다(무작위)', () => {
  const r = rng(0x53);
  let c = clockOf('aaaa');
  let maxSeen = '';
  let wall = T0;
  for (let i = 0; i < 3000; i++) {
    wall += Math.floor(r() * 50) - 10;
    if (r() < 0.4) {
      const remote = enc(Math.max(0, wall + Math.floor(r() * 20000) - 10000), Math.floor(r() * (CTR_MAX + 1)), 'bbbb');
      c = observe(c, remote, wall);
      maxSeen = maxStamp(maxSeen, remote);
    } else {
      const out = tick(c, wall);
      assert.ok(out.stamp > maxSeen, `step ${i}`);
      maxSeen = out.stamp;
      c = out.meta;
    }
  }
});

test('eff: 판 이하의 도장은 초기화로 지워진 것("")이고, 판을 넘겨 받으면 그 판으로 본다', () => {
  const E = enc(T0, 0, 'aaaa');
  const R = { epoch: E, clock: { a: enc(T0 - 1, 0, 'bbbb'), b: E, c: enc(T0, 1, 'bbbb'), d: 'junk', __proto__x: enc(T0 + 9, 0, 'aaaa') } };
  assert.equal(eff(R, 'a'), '');
  assert.equal(eff(R, 'b'), '', '판과 같은 도장도 지워진 것');
  assert.equal(eff(R, 'c'), enc(T0, 1, 'bbbb'));
  assert.equal(eff(R, 'd'), '');
  assert.equal(eff(R, 'missing'), '');
  assert.equal(eff(R, 'toString'), '', '프로토타입 이름은 경로가 아니다');
  assert.equal(eff(R, 'c', enc(T0 + 1, 0, 'aaaa')), '', '더 큰 판을 넘기면 그 판 이하는 지워진 것');
  assert.equal(eff({ epoch: '', clock: { a: enc(1, 0, 'aaaa') } }, 'a'), enc(1, 0, 'aaaa'));
});

// ── 메타 ─────────────────────────────────────────────────────────────────────

test('newSyncMeta: 정리해도 같고(JSON 왕복), 꺼진 채 비어 있다', () => {
  const r = rng(0x54);
  for (let i = 0; i < 200; i++) {
    const m = newSyncMeta(r, i % 2 ? `key-${i}` : undefined);
    assert.match(m.dev, DEV_RE);
    assert.equal(m.dev.length, 16);
    assert.equal(m.tag, tagOf(m.dev));
    assert.equal(m.enabled, false);
    assert.deepEqual([m.last, m.epoch, m.clock, m.parts, m.seen], ['', '', {}, {}, {}]);
    assert.equal('vendor' in m, i % 2 === 1);
    assert.deepEqual(cleanSyncMeta(JSON.parse(JSON.stringify(m))), m);
  }
  // 이상한 난수여도 형식이 맞는다
  for (const bad of [() => 1, () => -1, () => NaN, () => 0.999999]) assert.match(newSyncMeta(bad).dev, DEV_RE);
});

test('tagOf: 4자이고 결정적이며, 기기마다 다르다', () => {
  const r = rng(0x55);
  const devs = Array.from({ length: 300 }, () => newSyncMeta(r).dev);
  const tags = devs.map(tagOf);
  for (const t of tags) assert.match(t, /^[0-9a-z]{4}$/);
  assert.equal(new Set(devs).size, devs.length);
  assert.equal(new Set(tags).size, tags.length, '300대의 꼬리표가 겹치지 않는다');
  assert.equal(tagOf('aaaaaaaaaaaaaaaa'), tagOf('aaaaaaaaaaaaaaaa'));
  assert.notEqual(tagOf('aaaaaaaaaaaaaaaa'), tagOf('aaaaaaaaaaaaaaab'));
});

function richMeta(r) {
  let m = { ...newSyncMeta(r, 'vendor-1'), enabled: true, account: 'acct', pushed: 'h1', pulledAt: T0, gcDay: '2026-10-14' };
  const other = newSyncMeta(r).dev;
  for (let i = 0; i < 50; i++) {
    const out = tick(m, T0 + i);
    m = { ...out.meta, clock: { ...out.meta.clock, [`d/2026-10-${10 + (i % 5)}/0-${i % 8}`]: out.stamp } };
  }
  m = { ...m, epoch: enc(T0 - 1000, 0, 'zzzz') };
  m.parts = { fm: { [m.dev]: [2500, 0], [other]: [100, 25] }, 'c/0-0/n': { [other]: [300, 0] } };
  m.seen = { [`Sync/v1/${other}.jsonz`]: T0 - 5 };
  return m;
}

test('cleanSyncMeta: 깨진 메타는 null, 고칠 수 있는 것은 하나씩 버리고 나머지를 지킨다', () => {
  for (const bad of [null, undefined, 1, 'x', [], {}, { v: 2, dev: 'aaaaaaaaaaaaaaaa' }, { v: 1 }, { v: 1, dev: 'BAD' }, { v: 1, dev: 'a/b' }, { v: 1, dev: 'short' }]) {
    assert.equal(cleanSyncMeta(bad), null, JSON.stringify(bad));
  }
  const r = rng(0x56);
  const m = richMeta(r);
  assert.deepEqual(cleanSyncMeta(JSON.parse(JSON.stringify(m))), m, '바른 메타는 그대로');
  const messy = JSON.parse(JSON.stringify(m));
  messy.tag = 'zzzz';
  messy.clock['bad'] = 'nope';
  messy.clock[''] = enc(T0, 0, 'aaaa');
  messy.parts.fm.BAD = [1, 1];
  messy.parts.fm.cccccccccccccccc = [-1, 0];
  messy.parts.fm.dddddddddddddddd = [1.5, 0];
  messy.parts['c/1-1/n'] = 'x';
  messy.seen.x = 'later';
  messy.pulledAt = -1;
  messy.gcDay = 'yesterday';
  messy.account = '';
  messy.enabled = 'yes';
  messy.extra = 1;
  const json = JSON.parse(JSON.stringify(messy).replace('"extra":1', '"extra":1,"__proto__":{"polluted":true}'));
  json.parts.__proto__ = { aaaaaaaaaaaaaaaa: [1, 0] };
  const c = cleanSyncMeta(json);
  assert.equal(c.tag, tagOf(m.dev), 'tag는 dev에서 다시 셈한다');
  assert.equal(c.clock.bad, undefined);
  assert.equal('' in c.clock, false);
  assert.deepEqual(c.parts.fm, m.parts.fm);
  assert.equal('c/1-1/n' in c.parts, false);
  assert.equal(c.seen.x, undefined);
  assert.equal('pulledAt' in c, false);
  assert.equal('gcDay' in c, false);
  assert.equal('account' in c, false);
  assert.equal(c.enabled, false, '참(true)일 때만 켜져 있다');
  assert.equal('extra' in c, false);
  assert.equal(c.polluted, undefined);
  assert.equal(Object.getPrototypeOf(c.parts), Object.prototype);
  assert.deepEqual(cleanSyncMeta(JSON.parse(JSON.stringify(c))), c, '정리는 멱등');
  assert.deepEqual(cleanParts({ p: { aaaaaaaaaaaaaaaa: [1, 2, 3] } }), {});
});

test('cleanSyncMeta: last는 판과 시계의 모든 도장 이상으로 올린다 — 깨진 last 뒤의 tick도 이미 있는 도장보다 크다', () => {
  const r = rng(0x57);
  for (let i = 0; i < 100; i++) {
    const m = richMeta(r);
    const broken = { ...JSON.parse(JSON.stringify(m)), last: r() < 0.5 ? 'garbage' : '' };
    const c = cleanSyncMeta(broken);
    const all = [...Object.values(m.clock), m.epoch];
    const next = tick(c, T0 - 1e6).stamp;
    for (const s of all) assert.ok(next > s);
    assert.equal(tagOfStamp(c.last), c.tag);
  }
});

test('rekey: dev·tag·vendor가 바뀌고 시계·몫·판·읽은 파일은 그대로, 올린 해시는 지운다', () => {
  const r = rng(0x58);
  for (let i = 0; i < 100; i++) {
    const m = richMeta(r);
    const k = rekey(m, r, 'vendor-2');
    assert.notEqual(k.dev, m.dev);
    assert.notEqual(k.tag, m.tag);
    assert.equal(k.tag, tagOf(k.dev));
    assert.equal(k.vendor, 'vendor-2');
    assert.deepEqual(k.clock, m.clock);
    assert.deepEqual(k.parts, m.parts, '원래 기기 몫은 원래 dev 아래 남는다');
    assert.equal(k.epoch, m.epoch);
    assert.deepEqual(k.seen, m.seen);
    assert.equal(k.enabled, m.enabled);
    assert.equal('pushed' in k, false, '새 파일 이름이라 다시 올린다');
    assert.equal(msOf(k.last), msOf(m.last));
    assert.equal(ctrOf(k.last), ctrOf(m.last));
    assert.equal(tagOfStamp(k.last), k.tag);
    // 새 기기의 도장은 원래 기기의 어떤 도장보다도 크다
    const s = tick(k, T0).stamp;
    for (const old of Object.values(m.clock)) assert.ok(s > old);
    assert.deepEqual(cleanSyncMeta(JSON.parse(JSON.stringify(k))), k);
  }
  // 난수가 같은 dev를 내도 다른 dev를 고른다
  const m = richMeta(rng(9));
  let calls = 0;
  const sticky = () => (calls++ < 16 ? 0 : 0.5);
  const same = { ...m, dev: '0000000000000000', tag: tagOf('0000000000000000') };
  assert.notEqual(rekey(same, sticky, 'v').dev, '0000000000000000');
});
