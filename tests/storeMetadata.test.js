// V8-B — App Store 메타데이터(store.config.json)와 올릴 스크린샷(store/screenshots/**)을 지킨다.
// 글자 수 상한은 App Store Connect와 eas-cli 25.1.1의 schema/metadata-0.json · metadata:lint 규칙과 같다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { BANNED_JA, BANNED_EN } = require('../src/i18n/glossary');
const { DEVICES } = require('../tools/store-shots/devices');
const { SCENES } = require('../tools/store-shots/scenes');

const ROOT = path.join(__dirname, '..');
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'store.config.json'), 'utf8'));
const INFO = CONFIG.apple.info;
const LOCALES = { ko: 'ko', ja: 'ja', 'en-US': 'en' };
const DISPLAYS = ['APP_IPHONE_67', 'APP_IPAD_PRO_3GEN_129'];

// App Store Connect 상한 — 키워드는 쉼표로 이은 한 줄이 100자
const LIMITS = { title: 30, subtitle: 30, promoText: 170, description: 4000, releaseNotes: 4000 };
const KEYWORDS_MAX = 100;
const URL_MAX = 255;
const ALLOWED = new Set(['title', 'subtitle', 'description', 'keywords', 'releaseNotes', 'promoText', 'marketingUrl', 'supportUrl', 'privacyPolicyUrl', 'privacyChoicesUrl', 'screenshots', 'previews']);
const TEXTS = ['title', 'subtitle', 'promoText', 'description', 'releaseNotes'];
const allText = (v) => [...TEXTS.map((k) => v[k]), ...v.keywords].join('\n');
const len = (s) => [...s].length;

test('EAS Metadata 형식: configVersion 0, 세 로케일, 아는 열쇠만', () => {
  assert.equal(CONFIG.configVersion, 0);
  assert.deepEqual(Object.keys(INFO).sort(), Object.keys(LOCALES).sort());
  assert.deepEqual(CONFIG.apple.categories, ['PRODUCTIVITY', 'LIFESTYLE']);
  for (const [l, v] of Object.entries(INFO)) {
    for (const k of Object.keys(v)) assert.ok(ALLOWED.has(k), `${l}.${k}: schema에 없는 열쇠`);
    for (const k of [...TEXTS, 'keywords', 'privacyPolicyUrl', 'supportUrl', 'screenshots']) assert.ok(v[k], `${l}.${k}가 비었어요`);
  }
});

for (const [l, v] of Object.entries(INFO)) {
  test(`글자 수 상한(${l})`, () => {
    for (const [k, max] of Object.entries(LIMITS)) {
      assert.equal(typeof v[k], 'string', `${l}.${k}`);
      assert.equal(v[k].trim(), v[k], `${l}.${k}: 앞뒤 빈칸`);
      // App Store Connect는 UTF-16 단위로 센다 — 둘 중 큰 쪽으로 본다
      const n = Math.max(v[k].length, len(v[k]));
      assert.ok(n > 0 && n <= max, `${l}.${k}: ${n}자 > ${max}자`);
    }
    assert.ok(Array.isArray(v.keywords) && v.keywords.length > 0);
    assert.equal(new Set(v.keywords.map((w) => w.toLowerCase())).size, v.keywords.length, `${l}: 키워드가 겹쳐요`);
    for (const w of v.keywords) assert.ok(w.trim() === w && w.length > 0 && !w.includes(','), `${l} 키워드 '${w}'`);
    const joined = v.keywords.join(',');
    assert.ok(joined.length <= KEYWORDS_MAX, `${l}.keywords: ${joined.length}자 > ${KEYWORDS_MAX}자`);
    // 이름과 같은 낱말은 키워드에서 빼도 되지만, 부제와 이름이 같으면 안 된다
    assert.notEqual(v.title, v.subtitle);
  });

  test(`말투와 금지어(${l})`, () => {
    const text = allText(v);
    assert.doesNotMatch(text, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, `${l}: 이모지`);
    assert.doesNotMatch(text, /[!！]/, `${l}: 느낌표`);
    assert.doesNotMatch(text, /\bbeta\b|베타|ベータ/i, `${l}: Apple이 막는 'beta'`);
    // 과장 · 순위 · 가격 문구는 심사에서 걸리고, 종이 수첩 말투와도 맞지 않는다
    assert.doesNotMatch(text, /\b(best|#1|ultimate|free trial|sale)\b|최고의|1위|最高|No\.1|無料体験/i, `${l}: 과장 문구`);
    assert.doesNotMatch(text, /\b20\d\d\b|20\d\d년|20\d\d年/, `${l}: 연도 숫자`);
    assert.doesNotMatch(text, /Mandarat\b|Mandal-Art/, `${l}: 앱 이름은 만다라트 · マンダラート · Mandalart`);
    if (l === 'ja') for (const b of BANNED_JA) assert.doesNotMatch(text, typeof b === 'string' ? new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : b, `ja: ${b}`);
    if (l === 'en-US') for (const b of BANNED_EN) assert.doesNotMatch(text, typeof b === 'string' ? new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : b, `en: ${b}`);
    if (l === 'ko') assert.doesNotMatch(text, /완료|데이터를|탭하/, 'ko: 낱말장 금지어');
  });

  test(`기능 설명이 실제 기능과 맞다(${l})`, () => {
    const d = v.description;
    const want = {
      ko: ['81칸', 'iCloud', '위젯', '알림', '인쇄', 'Siri', '한 해 돌아보기', '프로', '한 번 결제'],
      ja: ['81マス', 'iCloud', 'ウィジェット', '通知', '印刷', 'Siri', '一年のふりかえり', 'プロ', '一度の購入'],
      'en-US': ['81 squares', 'iCloud', 'Widgets', 'Reminders', 'Print', 'Siri', 'The year in review', 'Pro', 'one-time purchase'],
    }[l];
    for (const w of want) assert.ok(d.includes(w), `${l}.description에 '${w}'가 없어요`);
    // 지금 무료인 것은 계속 무료(owner 결정 3) — 설명이 이를 밝힌다
    assert.match(d, { ko: /모두 무료/, ja: /すべて無料/, 'en-US': /is free/ }[l]);
  });

  test(`주소: 255자 이하, https, 아직 없는 것은 TODO 자리(${l})`, () => {
    for (const k of ['privacyPolicyUrl', 'supportUrl', 'marketingUrl', 'privacyChoicesUrl']) {
      if (v[k] === undefined) continue;
      assert.ok(v[k].length <= URL_MAX, `${l}.${k}`);
      assert.match(v[k], /^https:\/\/[^\s]+$/, `${l}.${k}`);
    }
  });
}

test('기본 이름(plan §1.3 확인 1): 만다라트 · マンダラート · Mandalart', () => {
  assert.equal(INFO.ko.title, '만다라트');
  assert.equal(INFO.ja.title, 'マンダラート');
  assert.equal(INFO['en-US'].title, 'Mandalart');
});

/** PNG 머리(IHDR)의 가로 · 세로 · 비트 깊이 · 색 형식 */
function ihdr(file) {
  const b = fs.readFileSync(file);
  assert.equal(b.toString('latin1', 1, 4), 'PNG', file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), depth: b[24], color: b[25] };
}

test('스크린샷: 로케일마다 6.9" · 13" iPad 여섯 장, 파일이 있고 크기가 맞다', () => {
  const order = SCENES.map((s, i) => `${String(i + 1).padStart(2, '0')}-${s.id}.png`);
  for (const [l, dir] of Object.entries(LOCALES)) {
    const shots = INFO[l].screenshots;
    assert.deepEqual(Object.keys(shots).sort(), [...DISPLAYS].sort(), l);
    for (const display of DISPLAYS) {
      const dev = DEVICES.find((d) => d.displayType === display);
      assert.deepEqual(shots[display], order.map((f) => `./store/screenshots/${dir}/${display}/${f}`), `${l} ${display}`);
      for (const rel of shots[display]) {
        const file = path.join(ROOT, rel);
        assert.ok(fs.existsSync(file), `${rel}이 없어요 — npm run store-shots 뒤 복사`);
        const h = ihdr(file);
        assert.deepEqual([h.w, h.h], dev.out, rel);
        assert.equal(h.depth, 8, rel);
        assert.equal(h.color, 2, `${rel}: RGB(알파 없음)`);
      }
    }
  }
});

test('스크린샷: 올린 것 말고는 커밋하지 않는다(36장, 6.3" · 6.5"는 out/에만)', () => {
  const base = path.join(ROOT, 'store', 'screenshots');
  const found = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) e.isDirectory() ? walk(path.join(d, e.name)) : found.push(path.relative(ROOT, path.join(d, e.name))); };
  walk(base);
  const pngs = found.filter((f) => f.endsWith('.png'));
  assert.equal(pngs.length, 36);
  const listed = new Set(Object.values(INFO).flatMap((v) => Object.values(v.screenshots).flat()).map((p) => path.normalize(p)));
  for (const f of pngs) assert.ok(listed.has(path.normalize(f)), `${f}가 store.config.json에 없어요`);
});
