// 설정 › 문의하기의 메일(src/lib/appInfo.ts supportMailto) — 이 기기에 남은 오류 기록(src/lib/crashLog.ts)이 있으면 본문에 붙인다.
// 앱은 아무것도 보내지 않는다: 메일을 여는 것도 보내는 것도 사용자이고, 붙은 글 위에는 무엇인지 알리는 한 줄이 있다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const L = require('../src/lib/crashLog');
const { setLang, msg } = require('../src/i18n');
const { supportMailto, mailLogBody, MAIL_BODY_CAP } = require('../src/lib/appInfo');

const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function fresh() {
  L.resetLogForTest();
}
function err(name, message, stack) {
  const e = new Error(message);
  e.name = name;
  if (stack !== undefined) e.stack = stack;
  return e;
}

test('supportMailto: 기록이 없으면 예전 그대로, 있으면 본문에 붙인다 — 안내 한 줄 + 기록', () => {
  fresh();
  setLang('ko');
  const plain = supportMailto('help@example.com', '1.2.3');
  assert.equal(plain, `mailto:help@example.com?subject=${encodeURIComponent('만다라트 문의 1.2.3')}`);
  assert.equal(supportMailto('help@example.com', '1.2.3', '   '), plain);
  assert.equal(supportMailto('', '1.2.3', 'log'), '');

  L.setLogOs('ios 18.1');
  L.record(err('TypeError', "Cannot read property 'actions' of undefined", '    at Dashboard (main.jsbundle:1:2)'), { kind: 'fatal' });
  const url = supportMailto('help@example.com', '1.2.3');
  assert.ok(url.startsWith(`${plain}&body=`));
  const body = decodeURIComponent(url.split('&body=')[1]);
  assert.ok(body.startsWith(`\r\n\r\n${msg('ko').settings.mailLogHead}\r\n\r\n`), '위 두 줄은 글을 적을 자리, 그다음 안내 한 줄');
  assert.ok(body.includes("TypeError: Cannot read property 'actions' of undefined\r\n  Dashboard (main.jsbundle:1:2)"));
  assert.doesNotMatch(body, /[^\r]\n/, '줄바꿈은 CRLF(RFC 6068)');
  // 안내 한 줄은 언어를 따른다
  for (const l of ['ja', 'en']) {
    setLang(l);
    assert.ok(decodeURIComponent(supportMailto('a@b.co', '1.0.0').split('&body=')[1]).includes(msg(l).settings.mailLogHead), l);
  }
  setLang('ko');
});

test('mailLogBody: 주소에 실은 본문은 1,500자를 넘지 않는다 — 뒤(오래된 기록)부터 자르고, % 묶음은 끊기지 않는다', () => {
  setLang('ko');
  assert.equal(MAIL_BODY_CAP, 1500);
  assert.equal(mailLogBody(''), '');
  // 가득 찬 고리(20건)
  fresh();
  for (let i = 0; i < 20; i++) {
    L.record(err('TypeError', `problem ${i} ${'m'.repeat(200)}`, Array.from({ length: 6 }, (_, j) => `    at fn${j} (main.jsbundle:1:${i}${j})`).join('\n')), { kind: 'fatal' });
  }
  const log = L.logText();
  assert.ok(encodeURIComponent(log).length > 5 * MAIL_BODY_CAP, '자르지 않으면 한참 넘는다');
  for (const l of ['ko', 'ja', 'en']) {
    setLang(l);
    const body = mailLogBody(log);
    assert.ok(body.length <= MAIL_BODY_CAP, `${l}: ${body.length}`);
    assert.ok(body.length > MAIL_BODY_CAP - 12, `${l}: 막음 가까이 채운다(${body.length})`);
    const text = decodeURIComponent(body);
    assert.ok(text.includes(msg(l).settings.mailLogHead), l);
    assert.ok(text.includes('problem 19'), '가장 새 기록이 먼저 들어간다');
    assert.equal(text.includes('problem 0 '), false, '오래된 기록은 잘린다');
    assert.doesNotMatch(body, /%(?![0-9A-F]{2})/, '% 묶음이 끊기지 않는다');
    assert.doesNotMatch(text, /\r$/, '줄바꿈 한가운데서 끊지 않는다');
    const url = supportMailto('help@example.com', '1.0.0', log);
    assert.ok(url.length < 1800, `${l}: 주소 전체 ${url.length}`);
  }
  setLang('ko');
  // 막음을 바꿔도 지킨다 — 아주 작으면 붙이지 않는다
  for (const cap of [40, 300, 301, 302, 303, 777, 1000]) assert.ok(mailLogBody(log, cap).length <= cap, String(cap));
  assert.equal(mailLogBody(log, 0), '');
  // 짝 잃은 글자 반쪽이 끝에 걸려도 던지지 않는다
  assert.doesNotThrow(() => mailLogBody(`${'a'.repeat(40)}😀😀😀😀`.repeat(40), 500));
  assert.ok(mailLogBody(`${'a'.repeat(40)}😀😀😀😀`.repeat(40), 500).length <= 500);
});

test('설정 › 문의하기는 supportMailto()를 그대로 연다 — 기록이 있으면 저절로 붙는다', () => {
  const s = src('src/screens/Settings.tsx');
  assert.match(s, /const mailto = supportMailto\(\);/);
  assert.match(s, /onPress=\{\(\) => openLink\(mailto\)\}/);
  assert.match(src('src/lib/appInfo.ts'), /export function supportMailto\(email = SUPPORT_EMAIL, version = APP_VERSION, log = logText\(\)\): string \{/);
});
