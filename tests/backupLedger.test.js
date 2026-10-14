require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { ledgerRows, nowIsNewer, LEDGER_NONE } = require('../src/lib/backupLedger');

const base = { goal: '', filled: 0, done: 0, days: 0, routines: 0 };

test('장부: 지금과 백업을 다섯 줄로 나란히 적는다', () => {
  const now = { ...base, goal: '건강한 한 해', filled: 29, done: 3, days: 12, lastLog: '2026-10-14' };
  const backup = { ...base, filled: 41, done: 5, days: 30, lastLog: '2026-10-02' };
  const rows = ledgerRows(now, backup);
  assert.deepEqual(rows.map((r) => r.label), ['핵심 목표', '채운 칸', '달성', '기록 일수', '마지막 기록']);
  assert.deepEqual(rows[0], { label: '핵심 목표', now: '건강한 한 해', backup: LEDGER_NONE, text: true });
  assert.equal(rows[1].now, '29/64');
  assert.equal(rows[1].backup, '41/64');
  assert.equal(rows[2].backup, '5칸');
  assert.equal(rows[3].now, '12일');
  assert.equal(rows[4].now, '10.14 (수)');
  assert.equal(rows[4].backup, '10.2 (금)');
});

test('장부: 기록이 없으면 마지막 기록은 없음', () => {
  const rows = ledgerRows(base, base);
  assert.equal(rows[4].now, LEDGER_NONE);
  assert.equal(rows[4].backup, LEDGER_NONE);
});

test('지금 기록이 백업보다 최근이면 경고한다', () => {
  assert.equal(nowIsNewer({ lastLog: '2026-10-14' }, { lastLog: '2026-10-02' }), true);
  assert.equal(nowIsNewer({ lastLog: '2026-10-14' }, {}), true);
  assert.equal(nowIsNewer({ lastLog: '2026-10-02' }, { lastLog: '2026-10-14' }), false);
  assert.equal(nowIsNewer({ lastLog: '2026-10-14' }, { lastLog: '2026-10-14' }), false);
  assert.equal(nowIsNewer({}, { lastLog: '2026-10-14' }), false);
  assert.equal(nowIsNewer({}, {}), false);
});
