// App Review 2.3.10 — 앱과 스토어 글에 다른 모바일 플랫폼의 이름을 쓰지 않는다.
// iPhone·iPad에서 보이는 글(세 언어 카탈로그의 값, 스토어 설정, InfoPlist 글)에 Android가 나오면 실패한다. 주석과 키 이름은 보지 않는다.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const NAMES = /android|안드로이드|アンドロイド|google play|구글 플레이|갤럭시|galaxy/i;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.ts$/.test(e.name)) out.push(p);
  }
  return out;
}

/** 주석을 뺀 본문 — 줄 주석 · 블록 주석 */
function code(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

test('세 언어의 글에 다른 모바일 플랫폼 이름이 없다', () => {
  const hits = [];
  for (const f of walk(path.join(ROOT, 'src', 'i18n'))) {
    const rel = path.relative(ROOT, f);
    // notify.ts의 채널 이름은 안드로이드 기기에서만 보이는 값이라 글 자체에는 이름이 없다 — 본문만 본다
    code(fs.readFileSync(f, 'utf8')).split('\n').forEach((l, i) => { if (NAMES.test(l)) hits.push(`${rel}:${i + 1}`); });
  }
  assert.deepEqual(hits, []);
});

test('스토어 글과 InfoPlist 글에도 없다', () => {
  // 키 이름(locales의 "android" 묶음 등)이 아니라 사람이 읽는 값만 본다
  const values = (v, out = []) => {
    if (typeof v === 'string') out.push(v);
    else if (v && typeof v === 'object') for (const x of Object.values(v)) values(x, out);
    return out;
  };
  const store = JSON.parse(fs.readFileSync(path.join(ROOT, 'store.config.json'), 'utf8'));
  for (const s of values(store.apple)) assert.doesNotMatch(s, NAMES, 'store.config.json');
  for (const l of ['ko', 'ja', 'en']) {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales', `${l}.json`), 'utf8'));
    for (const s of values(j.ios)) assert.doesNotMatch(s, NAMES, `locales/${l}.json`);
  }
});
