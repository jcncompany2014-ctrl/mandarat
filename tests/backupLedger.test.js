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

test('장부: 화면 읽기 말 — 채운 칸은 64칸 중, 마지막 기록은 또박또박(해가 다르면 해까지) (FX-VERIFY A-1 · NEW-1)', () => {
  const today = new Date(2026, 9, 14);
  const now = { ...base, filled: 23, lastLog: '2026-10-03' };
  const backup = { ...base, filled: 41, lastLog: '2025-09-30' };
  const rows = ledgerRows(now, backup, today);
  assert.equal(rows[1].nowSay, '64칸 중 23칸');
  assert.equal(rows[1].backupSay, '64칸 중 41칸');
  assert.equal(rows[4].nowSay, '10월 3일 토요일');
  assert.equal(rows[4].backupSay, '2025년 9월 30일 화요일');
  // 보이는 값은 그대로
  assert.equal(rows[1].now, '23/64');
  assert.equal(rows[4].now, '10.3 (토)');
  // 기록이 없으면 없음
  assert.equal(ledgerRows(base, base, today)[4].nowSay, LEDGER_NONE);
  // BackupImport가 읽는 이름 — '/' · 점 날짜 없이
  const said = rows.map((r) => `${r.label}, 지금 ${r.nowSay ?? r.now}, 백업 ${r.backupSay ?? r.backup}`);
  for (const s of said) assert.doesNotMatch(s, /\d\s*\/\s*\d|\d\.\d+ \(/, s);
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'src/overlays/BackupImport.tsx'), 'utf8');
  assert.match(src, /accessibilityLabel=\{b\.rowSay\(\{ label: r\.label, now: r\.nowSay \?\? r\.now, backup: r\.backupSay \?\? r\.backup \}\)\}/);
  const ko = require('../src/i18n/ko/backup').default;
  assert.deepEqual(rows.map((r) => ko.rowSay({ label: r.label, now: r.nowSay ?? r.now, backup: r.backupSay ?? r.backup })), said);
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

test('장부: 지난 표가 어느 쪽이든 있으면 지난 표 줄을 더한다(없으면 다섯 줄 그대로) (V1-D)', () => {
  const { setLang } = require('../src/i18n');
  const plain = ledgerRows({ ...base, archives: 0 }, { ...base, archives: 0 });
  assert.equal(plain.length, 5);
  const rows = ledgerRows({ ...base, archives: 2 }, { ...base, archives: 0 });
  assert.equal(rows.length, 6);
  assert.deepEqual(rows[5], { label: '지난 표', now: '2장', backup: '0장' });
  assert.deepEqual(ledgerRows({ ...base, archives: 0 }, { ...base, archives: 1 })[5], { label: '지난 표', now: '0장', backup: '1장' });
  // 글은 year 이름공간에서 — 언어를 따른다
  try {
    setLang('en');
    assert.deepEqual(ledgerRows({ ...base, archives: 1 }, { ...base, archives: 3 })[5], { label: 'Past charts', now: '1 chart', backup: '3 charts' });
    setLang('ja');
    assert.deepEqual(ledgerRows({ ...base, archives: 1 }, { ...base, archives: 3 })[5], { label: '過去の表', now: '1枚', backup: '3枚' });
  } finally {
    setLang('ko');
  }
});

test('장부: ja·en에서는 이름표 · 값 · 소리 말이 그 언어로, 없음도 따라간다(X-K)', () => {
  const { setLang } = require('../src/i18n');
  const today = new Date(2026, 9, 14);
  const now = { ...base, goal: '', filled: 23, done: 1, days: 12, lastLog: '2026-10-03' };
  try {
    setLang('en');
    let rows = ledgerRows(now, base, today);
    assert.deepEqual(rows.map((r) => r.label), ['Core goal', 'Filled', 'Achieved', 'Days logged', 'Last record']);
    assert.equal(rows[0].now, 'None');
    assert.equal(require('../src/lib/backupLedger').LEDGER_NONE, 'None');
    assert.equal(rows[1].nowSay, '23 of 64 squares');
    assert.equal(rows[2].now, '1 square');
    assert.equal(rows[3].now, '12 days');
    assert.equal(rows[4].backup, 'None');
    setLang('ja');
    rows = ledgerRows(now, base, today);
    assert.deepEqual(rows.map((r) => r.label), ['中心の目標', '書いたマス', '達成', '記録した日', '最後の記録']);
    assert.equal(require('../src/lib/backupLedger').LEDGER_NONE, 'なし');
    assert.equal(rows[1].nowSay, '64マス中23マス');
    assert.equal(rows[2].now, '1マス');
    // 언어를 넘겨 주면 지금 언어와 상관없이
    assert.equal(ledgerRows(now, base, today, 'ko')[0].now, '없음');
  } finally {
    setLang('ko');
  }
  assert.equal(require('../src/lib/backupLedger').LEDGER_NONE, '없음');
});
