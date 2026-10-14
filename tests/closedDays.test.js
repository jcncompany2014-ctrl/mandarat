require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { migrate, blankDoc, cleanClosedDays, CLOSED_KEEP } = require('../src/data/defaults');

// 마감한 날(closedDays) — 홈의 이번 주 칸이 지난 날에도 마감 표시를 하도록 남기는 목록

test('마감한 날이 없으면 필드를 두지 않는다(이전 저장본·빈 문서와 같은 모양)', () => {
  assert.equal('closedDays' in migrate({}), false);
  assert.equal('closedDays' in migrate({ closedDays: [] }), false);
  assert.equal('closedDays' in migrate({ closedDays: 'x' }), false);
  assert.deepEqual(migrate({ onboarded: true }).closedDays, undefined);
  assert.equal('closedDays' in blankDoc(), false);
});

test('날짜 형식인 글자만, 겹치지 않게, 오래된 날부터', () => {
  const d = migrate({
    closedDays: ['2026-10-14', '2026-10-12', 'nope', 20261013, null, '2026-13-01', '2026-10-12', '2026-10-1', '2026-10-13'],
  });
  assert.deepEqual(d.closedDays, ['2026-10-12', '2026-10-13', '2026-10-14']);
});

test('최근 400일까지만 남긴다', () => {
  const days = [];
  const start = new Date(2025, 0, 1);
  for (let i = 0; i < CLOSED_KEEP + 50; i++) {
    const t = new Date(start);
    t.setDate(start.getDate() + i);
    days.push(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`);
  }
  const kept = cleanClosedDays([...days].reverse());
  assert.equal(CLOSED_KEEP, 400);
  assert.equal(kept.length, 400);
  assert.equal(kept[kept.length - 1], days[days.length - 1]);
  assert.equal(kept[0], days[50]);
});

test('멱등 — 두 번 이행하거나 JSON으로 저장했다 읽어도 같다', () => {
  const once = migrate({ closedDays: ['2026-10-14', '2026-10-12', 'bad'] });
  assert.deepEqual(migrate(once), once);
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(once))), once);
});

test('cleanClosedDays — 배열이 아니면 빈 목록', () => {
  for (const bad of [undefined, null, {}, '2026-10-14', 3]) assert.deepEqual(cleanClosedDays(bad), []);
});
