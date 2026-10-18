// 개인정보 처리방침 페이지 — docs/v2/privacy.md에서 만든 public/privacy.html이 최신이고, 앱의 주소 · 문의 메일과 맞는다
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { build, SENTRY_IP_OFF } = require('../scripts/privacy-page');
const { PRIVACY_URL, SUPPORT_EMAIL, privacyLink } = require('../src/lib/appInfo');

const ROOT = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(ROOT, 'public/privacy.html'), 'utf8');

test('public/privacy.html은 privacy.md에서 지금 만든 것과 같다(고치면 npm run privacy-page)', () => {
  assert.equal(page, build());
});

test('세 언어 · 11개 항목 · 문의 메일 — 틀 자리(<…>)나 검토용 표는 실리지 않는다', () => {
  for (const l of ['ko', 'ja', 'en']) assert.match(page, new RegExp(`<section id="${l}" lang="${l}">`));
  assert.equal((page.match(/<h3>/g) ?? []).length, 33);
  assert.equal((page.match(new RegExp(`href="mailto:${SUPPORT_EMAIL.replace(/[.]/g, '\\.')}"`, 'g')) ?? []).length, 3);
  assert.doesNotMatch(page, /<(SUPPORT_EMAIL|EFFECTIVE_DATE|OPERATOR)>|DRAFT|For the reviewer/);
  // Sentry의 IP 설정은 owner가 켠 뒤에만 싣는다
  if (!SENTRY_IP_OFF) assert.doesNotMatch(page, /IP ?(주소|アドレス|address)/);
  // 바깥 글꼴 · 스크립트를 부르지 않는다
  assert.doesNotMatch(page, /<script[^>]+src=|<link[^>]+stylesheet/);
});

test('앱의 처리방침 주소는 그 페이지(https · cleanUrls)이고, 앱 언어로 연다', () => {
  assert.match(PRIVACY_URL, /^https:\/\/[^/]+\/privacy$/);
  assert.match(SUPPORT_EMAIL, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).cleanUrls, true);
  assert.equal(privacyLink('ja'), `${PRIVACY_URL}?lang=ja`);
  assert.equal(privacyLink('ko', ''), '');
  const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  assert.match(src('src/screens/Settings.tsx'), /openLink\(privacyLink\(lang\(\)\)\)/);
  assert.match(src('src/overlays/ProSheet.tsx'), /Linking\.openURL\(privacyLink\(lang\(\)\)\)/);
});
