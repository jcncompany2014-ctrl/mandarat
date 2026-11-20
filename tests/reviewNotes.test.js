// 출시 문서 — 심사 메모(docs/v2/review-notes.md)의 영어 블록과 출시 점검 문서 두 장.
// 영어 블록은 App Store Connect 칸에 그대로 붙인다: 4,000바이트 아래여야 하고, 메모가 부르는 조작 이름은 지금 영어 화면 글과 같아야 한다.
// 화면 글(src/i18n/en)을 고치면 이 테스트가 떨어진다 — 메모의 같은 이름도 함께 고친다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { msg } = require('../src/i18n');
const { SUPPORT_EMAIL } = require('../src/lib/appInfo');
const { PAPER_CHOICES } = require('../src/lib/paper');
const { LOOKS } = require('../src/lib/look');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const NOTES = read('docs/v2/review-notes.md');
/** 붙여 넣는 영어 블록 — '## English' 머리 아래 첫 코드 블록 */
const BLOCK = NOTES.split('## English')[1].split('```')[1].trim();
const LIMIT = 4000;

test('영어 블록: 메일 주소를 채운 뒤에도 4,000바이트 아래', () => {
  assert.ok(BLOCK.includes('<SUPPORT_EMAIL>'), '메일 자리 표시');
  const pasted = BLOCK.replace('<SUPPORT_EMAIL>', SUPPORT_EMAIL);
  const bytes = Buffer.byteLength(pasted, 'utf8');
  assert.ok(bytes < LIMIT, `${bytes}바이트 — ${LIMIT}바이트를 넘지 않게 줄여 주세요`);
});

test('영어 블록: 따옴표로 부르는 조작 이름은 지금 영어 화면 글 그대로', () => {
  const m = msg('en');
  const quoted = [
    m.onboarding.start, m.settings.sampleRow, m.today.closeTitle, m.today.expand,
    m.print.shareLinkSay, m.print.printGo, m.print.exportPdf, m.notify.morning,
    m.sheet.focusRow, m.sync.toggle, m.widget.galleryName,
  ];
  for (const s of quoted) assert.ok(BLOCK.includes(`"${s}"`), `"${s}"`);
});

test('영어 블록: 길(탭 · 설정 구역)은 지금 화면의 이름과 차례 그대로', () => {
  const m = msg('en');
  const st = m.settings;
  const looks = { auto: st.lookAuto, light: st.lookLight, dark: st.lookDark };
  const paths = [
    `${m.core.tabHome} tab › gear icon (${st.screenTitle}) › ${st.subRestart} › "${st.sampleRow}"`,
    `${m.core.tabHome} or ${m.core.tabToday} tab`,
    `${m.core.tabGrid} tab`,
    `${st.screenTitle} › ${st.secView}: ${st.subLook} (${LOOKS.map((l) => looks[l]).join(' / ')}) and ${m.paper.head} (${PAPER_CHOICES.map((p) => m.paper[p]).join(' / ')})`,
    `${st.screenTitle} › ${m.notify.sectionTitle}:`,
    `The ${m.core.tabAdd} button`,
    `${st.screenTitle} › ${st.secCloud} › "${m.sync.toggle}"`,
    `${st.screenTitle} › ${m.lang.sectionTitle}`,
  ];
  for (const s of paths) assert.ok(BLOCK.includes(s), s);
});

test('영어 블록: Siri 문장은 기기 언어마다 네 가지, 단축어 글(AppShortcuts.strings)에 있는 문장', () => {
  for (const l of ['en', 'ko', 'ja']) {
    const name = JSON.parse(read(`locales/${l}.json`)).ios.CFBundleDisplayName;
    const phrases = [...read(`native/ios/${l}.lproj/AppShortcuts.strings`).matchAll(/^".*" = "(.*)";$/gm)]
      .map((x) => x[1].replace('${applicationName}', name));
    assert.equal(phrases.length, 8, l);
    const used = phrases.filter((p) => BLOCK.includes(`"${p}"`));
    assert.equal(used.length, 4, `${l}: ${used.join(' / ')}`);
  }
});

test('영어 블록: 사실만 적는다', () => {
  // 결제 — 없다. 다만 결제 모듈은 실려 있고 앱을 켤 때 거래 알림을 듣기 시작한다(modules/pro-store OnCreate): 'StoreKit을 부르지 않는다'고 적지 않는다
  assert.match(BLOCK, /NO PURCHASES/);
  assert.doesNotMatch(BLOCK, /no StoreKit call/i);
  assert.match(BLOCK, /only starts StoreKit's transaction listener/);
  assert.match(read('modules/pro-store/ios/ProStoreModule.swift'), /OnCreate \{[\s\S]*?Transaction\.updates/);
  // 위젯 — 앱을 열기 전에 넣으면 expo-widgets가 오류 상자를 그린다
  assert.match(BLOCK, /open the app once before adding the widget/);
  // 하루 마감 — 장부 두 줄은 없어졌다
  assert.doesNotMatch(BLOCK, /double rule/);
  // 스토어 이름은 store.config.json을 따른다 — 블록은 홈 화면 이름으로만 부른다
  assert.doesNotMatch(BLOCK, /Mandalart Planner|プランナー|플래너/);
  for (const l of ['en', 'ko', 'ja']) assert.ok(BLOCK.includes(JSON.parse(read(`locales/${l}.json`)).ios.CFBundleDisplayName), l);
});

test('출시 점검 문서: 처음 내는 1.0.0, 저작권에 © 없이, 스크린샷은 두 가지', () => {
  const list = read('docs/RELEASE_CHECKLIST.md');
  const mac = read('docs/MAC_RELEASE_KO.md');
  const version = JSON.parse(read('app.json')).expo.version;
  assert.equal(version, '1.0.0');
  assert.doesNotMatch(list, /proposed `2\.0\.0`|# v2 — 2\.0 release/);
  assert.ok(list.includes(`**DONE — ${version}**`));
  // 저작권 칸에는 '2026 이름'만 — ©는 App Store가 붙인다
  for (const doc of [list, mac]) assert.doesNotMatch(doc, /`© 2026/);
  // 저장소에 있는 스크린샷은 6.9″ iPhone과 13″ iPad뿐
  assert.deepEqual(fs.readdirSync(path.join(ROOT, 'store/screenshots/ko')).sort(), ['APP_IPAD_PRO_3GEN_129', 'APP_IPHONE_67']);
  assert.doesNotMatch(mac, /6\.5″|6\.3″/);
  // 점검에서 더한 항목
  for (const s of ['ITMS-91053', 'J-PlatPat', 'id6741136966', 'Apple Vision Pro', 'staleDate: nil', '"image": "latest"']) assert.ok(list.includes(s), s);
  assert.doesNotMatch(list, /no StoreKit call is made/);
});
