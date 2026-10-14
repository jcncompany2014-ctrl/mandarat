// 설정 화면의 순수 도우미 — 앱 정보(판·라이선스·문의 주소)와 백업 안내 글.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const appJson = require('../app.json');
const { APP_VERSION, LICENSES, PRIVACY_URL, SUPPORT_EMAIL, supportMailto } = require('../src/lib/appInfo');
const { backupAgeLabel, backupTextPrefix } = require('../src/lib/backupNote');
const { parseBackup, makeBackup } = require('../src/lib/backup');
const { blankDoc } = require('../src/data/defaults');

test('APP_VERSION은 app.json의 판을 그대로 읽는다', () => {
  assert.equal(APP_VERSION, appJson.expo.version);
});

test('개인정보·문의 주소는 문자열(비어 있으면 설정에서 링크를 숨긴다)', () => {
  assert.equal(typeof PRIVACY_URL, 'string');
  assert.equal(typeof SUPPORT_EMAIL, 'string');
  if (PRIVACY_URL) assert.match(PRIVACY_URL, /^https:\/\//);
});

test('LICENSES는 앱에 실린 오픈소스를 모두 적는다', () => {
  const names = LICENSES.map((l) => l.name);
  for (const n of ['React Native', 'Expo', 'react-native-svg', 'react-native-view-shot', 'Pretendard']) {
    assert.ok(names.includes(n), n);
  }
  assert.equal(LICENSES.find((l) => l.name === 'Pretendard').license, 'SIL OFL 1.1');
  for (const l of LICENSES) assert.ok(l.license.trim(), l.name);
});

test('supportMailto — 주소가 없으면 빈 글, 있으면 판을 적은 제목', () => {
  assert.equal(supportMailto('', '1.0.0'), '');
  assert.equal(supportMailto('  ', '1.0.0'), '');
  const m = supportMailto('help@example.com', '1.2.3');
  assert.ok(m.startsWith('mailto:help@example.com?subject='));
  assert.equal(decodeURIComponent(m.split('subject=')[1]), '만다라트 문의 1.2.3');
});

test('backupAgeLabel — 처음 · 오늘 · n일 전', () => {
  const now = new Date(2026, 9, 14, 9);
  assert.equal(backupAgeLabel(undefined, now), '아직 백업하지 않았어요');
  assert.equal(backupAgeLabel('2026-10-14', now), '마지막 백업 · 오늘');
  assert.equal(backupAgeLabel('2026-10-13', now), '마지막 백업 · 1일 전');
  assert.equal(backupAgeLabel('2026-09-14', now), '마지막 백업 · 30일 전');
  // 시계가 뒤로 간 기기 — 미래의 백업 날은 '오늘'로
  assert.equal(backupAgeLabel('2026-10-20', now), '마지막 백업 · 오늘');
});

test('글 백업의 머리말에는 중괄호가 없고, 붙은 채로 불러올 수 있다', () => {
  const now = new Date(2026, 9, 14, 9);
  const prefix = backupTextPrefix(now);
  assert.ok(!/[{}]/.test(prefix));
  assert.ok(prefix.startsWith('만다라트 백업 · '));
  assert.ok(prefix.includes('10월 14일'));
  const doc = { ...blankDoc(), centerGoal: '마라톤 완주', onboarded: true };
  const r = parseBackup(prefix + makeBackup(doc, now, true));
  assert.equal(r.ok, true);
  assert.equal(r.doc.centerGoal, '마라톤 완주');
});

test('설정 화면에는 오늘 화면 보기 고르기가 없다(오늘에서만 고른다)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'screens', 'Settings.tsx'), 'utf8');
  assert.ok(!src.includes("'mgmt'"));
  assert.ok(!src.includes('SegmentedControl'));
});
