// 프로 판매 스위치(src/lib/pro.ts STORE_OPEN) — 1.0은 꺼 두고 프로 기능을 모두 무료로 연다(owner 결정 3, 2026-11 변경).
// 스위치 하나로 앱 · 설정 · 개인정보 처리방침 · 심사 메모가 함께 움직이는지 본다. 판매를 켤 때는 docs/RELEASE_CHECKLIST.md v2-4를 따른다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
/** 주석을 뺀 소스 */
const code = (f) => src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const { STORE_OPEN, PREVIEW } = require('../src/lib/pro');

test('스위치는 불리언 하나이고, 미리보기와 따로 논다', () => {
  assert.equal(typeof STORE_OPEN, 'boolean');
  assert.match(code('src/lib/pro.ts'), /export const STORE_OPEN = (true|false);/);
  assert.equal(PREVIEW, false, '테스트 환경에서는 미리보기가 꺼져 있다');
});

test('ProContext: 판매를 끄면 가진 것으로 보고 StoreKit에 묻지 않는다', () => {
  const c = code('src/store/ProContext.tsx');
  assert.match(c, /owned: PREVIEW \|\| !STORE_OPEN,/, '처음 값');
  assert.match(c, /const owned = PREVIEW \|\| !STORE_OPEN \|\| s\.owned;/, '내보내는 값');
  // check · loadStore · 구독 효과 — 셋 다 스위치를 먼저 본다
  assert.equal((c.match(/if \(!proStore \|\| !STORE_OPEN\) return;/g) || []).length, 3);
});

test("설정: '프로' 구역은 판매를 켰을 때만 그린다", () => {
  const c = code('src/screens/Settings.tsx');
  assert.match(c, /\{STORE_OPEN && <ProSection M=\{M\} \/>\}/);
  assert.equal((c.match(/<ProSection/g) || []).length, 1);
});

test('판매를 끈 동안: 개인정보 처리방침 4항은 "결제가 없어요", 심사 메모에 IAP 블록이 없다', { skip: STORE_OPEN }, () => {
  const privacy = src('docs/v2/privacy.md');
  for (const h of ['**4. 결제가 없어요**', '**4. 課金はありません**', '**4. No purchases**']) assert.ok(privacy.includes(h), h);
  assert.doesNotMatch(privacy, /\*\*4\. (프로 구입|プロの購入|Pro is bought)/);
  const page = src('public/privacy.html');
  assert.ok(page.includes('<h3>4. No purchases</h3>'), '만들어진 페이지도 같다(npm run privacy-page)');
  const notes = src('docs/v2/review-notes.md');
  assert.doesNotMatch(notes, /In-App Purchase review notes|WHERE TO FIND PRO|com\.jcncompany\.mandarat\.pro/);
  assert.match(notes, /NO PURCHASES/);
});
