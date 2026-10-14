// L4 — 백업을 불러와도 '마지막 백업'이 사라지지 않는다(src/lib/lastBackup.ts)
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { lastBackupAfterImport } = require('../src/lib/lastBackup');
const { ymd } = require('../src/lib/routine');

test('백업을 만든 날(지역 날짜)이 지금 기록보다 늦으면 그날로', () => {
  const at = new Date(2026, 9, 14, 23, 30); // 지역 시각 — UTC로는 다른 날일 수 있다
  assert.equal(lastBackupAfterImport(undefined, undefined, at.toISOString()), ymd(at));
  assert.equal(lastBackupAfterImport('2026-10-01', undefined, at.toISOString()), '2026-10-14');
});

test('지금 기록이 더 늦으면 그대로, 백업 안의 값도 함께 본다', () => {
  assert.equal(lastBackupAfterImport('2026-10-20', '2026-09-01', new Date(2026, 9, 14).toISOString()), '2026-10-20');
  assert.equal(lastBackupAfterImport(undefined, '2026-09-01', undefined), '2026-09-01');
});

test('날짜를 알 수 없으면 없음', () => {
  assert.equal(lastBackupAfterImport(undefined, undefined, undefined), undefined);
  assert.equal(lastBackupAfterImport(undefined, undefined, 'not a date'), undefined);
  assert.equal(lastBackupAfterImport('garbage', undefined, undefined), undefined);
});
