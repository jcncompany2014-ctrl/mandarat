// 도움말과 문의 페이지 — docs/v2/support.md에서 만든 public/support.html이 최신이고, 문의 메일 · 주소 · 앱이 보이는 메뉴 이름과 맞는다.
// 처리방침 페이지와 함께 쓰는 모습(scripts/site-page.js)도 여기서 본다: 색은 토큰 값 그대로, 예전 크림 종이 · 금색은 없다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { build, section } = require('../scripts/support-page');
const { build: buildPrivacy } = require('../scripts/privacy-page');
const { PRIVACY_URL, SUPPORT_URL, SUPPORT_EMAIL, privacyLink, supportLink } = require('../src/lib/appInfo');
const { msg, LANGS } = require('../src/i18n');
const { LIGHT, DARK } = require('../src/theme/tokens');
const { REMINDER_DAYS } = require('../src/lib/reminders');
const { STORE_OPEN } = require('../src/lib/pro');
const { textProblems } = require('./i18nLint');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const page = src('public/support.html');
const doc = src('docs/v2/support.md');
const HEADS = { ko: '한국어', ja: '日本語', en: 'English' };

/** 페이지에서 한 언어 쪽의 HTML */
const part = (html, l) => new RegExp(`<section id="${l}" lang="${l}">([\\s\\S]*?)</section>`).exec(html)?.[1] ?? '';
/** 꼬리표를 떼고 읽는 글로 */
const plain = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const count = (s, re) => (s.match(re) ?? []).length;

test('public/support.html은 support.md에서 지금 만든 것과 같다(글이나 색 토큰을 고치면 npm run support-page)', () => {
  assert.equal(page, build());
  assert.equal(JSON.parse(src('package.json')).scripts['support-page'], 'node scripts/support-page.js');
});

test('세 언어 · 문의 메일 · 처리방침 링크 — 틀 자리(<…>)나 검토용 표는 실리지 않는다', () => {
  const mailto = `href="mailto:${SUPPORT_EMAIL}"`;
  for (const l of LANGS) {
    const html = part(page, l);
    assert.ok(html, `${l} 쪽이 있다`);
    // 문의 메일은 SUPPORT_EMAIL 그대로, 언어마다 한 번 — 글로도 보인다
    assert.equal(html.split(mailto).length - 1, 1, `${l}: 문의 메일`);
    assert.ok(html.includes(`<p class="mail"><a ${mailto}>${SUPPORT_EMAIL}</a></p>`), `${l}: 메일 단추`);
    // 처리방침은 그 언어로 연다(앱의 privacyLink와 같은 주소)
    assert.ok(html.includes(`<a href="${privacyLink(l)}">`), `${l}: 처리방침 링크`);
    // 문의하기 · 자주 묻는 질문, 질문 여덟
    assert.equal(count(html, /<h3>/g), 2, `${l}: 구역 머리`);
    assert.equal(count(html, /<h4>/g), 8, `${l}: 질문`);
  }
  assert.equal(page.split(mailto).length - 1, 3);
  assert.doesNotMatch(page, /SUPPORT_EMAIL|PRIVACY_URL|For the reviewer|\|---\|/);
  // 바깥 글꼴 · 스크립트를 부르지 않는다
  assert.doesNotMatch(page, /<script[^>]+src=|<link[^>]+stylesheet|@font-face|@import/);
});

test('메뉴 이름은 앱이 그 언어로 보이는 이름과 같다', () => {
  for (const l of LANGS) {
    const m = msg(l);
    const text = plain(part(page, l));
    const names = [
      m.settings.screenTitle, m.settings.secCloud, m.sync.toggle, m.sync.now,
      m.settings.exportTitle, m.settings.importTitle, m.settings.snapTitle,
      m.settings.subRestart, m.settings.resetRow, m.year.shelf,
      m.settings.secInfo, m.settings.contact, m.settings.appName,
      m.notify.sectionTitle, m.notify.morning, m.notify.evening, m.widget.empty,
    ];
    for (const n of names) assert.ok(text.includes(n), `${l}: '${n}'`);
    // 판 번호 줄의 이름 — 한 글자짜리도 놓치지 않게 따옴표째
    const version = { ko: `‘${m.settings.colVersion}’`, ja: `「${m.settings.colVersion}」`, en: `› ${m.settings.colVersion}` }[l];
    assert.ok(text.includes(version), `${l}: ${version}`);
  }
});

test('앱이 지금 쓰는 말 그대로 — 동기화 · 自動保存 · タップ · Apple Account · 굽은 따옴표', () => {
  const text = Object.fromEntries(LANGS.map((l) => [l, plain(part(page, l))]));
  // ko: iCloud는 동기화(맞추기라고 하지 않는다), 버전 줄은 ‘버전’
  assert.doesNotMatch(text.ko, /맞추|맞춰|맞출|맞춘|‘판’/);
  // ja: 保存コピー → 自動保存、押す → タップ、版 → バージョン
  assert.doesNotMatch(text.ja, /保存コピー|保存版|「版」|(?<!長)押(す|し|せ)/);
  // en: 굽은 따옴표(곧은 따옴표는 주소 속에도 없다)
  assert.doesNotMatch(text.en, /'/);
  // Apple 계정의 이름은 한 가지로 — 기기 설정의 길에서도
  const account = { ko: 'Apple 계정', ja: 'Apple Account', en: 'Apple Account' };
  for (const l of LANGS) {
    assert.ok(text[l].includes(account[l]), `${l}: ${account[l]}`);
    assert.doesNotMatch(text[l].split(account[l]).join(''), /Apple|アップル|애플/, `${l}: Apple 계정의 다른 적기`);
  }
});

test('전체 초기화의 답 — 지우는 것 · 남는 것 · 다른 기기를 앱의 확인 글과 같은 말로 적는다', () => {
  for (const l of LANGS) {
    const m = msg(l);
    const html = part(page, l);
    // 여섯 번째 질문(기록을 모두 지우고 싶어요)의 답 — 다음 질문 머리 앞까지
    const answer = plain(html.split('<h4>')[6].split('</h4>')[1]);
    for (const n of [m.settings.subRestart, m.settings.resetRow, m.year.shelf]) assert.ok(answer.includes(n), `${l}: '${n}'`);
    assert.ok(answer.toLowerCase().includes(m.settings.snapTitle.toLowerCase()), `${l}: ${m.settings.snapTitle}`);
    assert.match(answer, /iCloud/, `${l}: 동기화를 켰을 때 다른 기기`);
    // 확인 글의 낱말 그대로 — 지우는 세 가지
    const erased = m.settings.resetAskBody.split(/[.。]/)[0].replace(/^Your /, '').replace(/ will be erased$/, '').replace(/(이 지워져요|が消えます)$/, '');
    assert.ok(answer.includes(erased), `${l}: '${erased}'`);
  }
  // 글이 기대는 코드 — 다른 기기는 높은 판(초기화)을 받기 전에 저장본을 남긴다
  assert.match(src('src/lib/syncEngine.ts'), /if \(meta && merged\.epoch > meta\.epoch\) \{\s*const kept = await port\.keepCopy\(\);/);
});

test('문의하기 — 메일 초안에 이 기기의 오류 기록이 들어갈 수 있고 지워도 된다고 적는다(앱이 초안에 적는 말과 같은 낱말)', () => {
  const { supportMailto } = require('../src/lib/appInfo');
  // 앱의 사실: 기록이 있으면 본문에 안내 한 줄과 함께 붙고, 없으면 제목뿐이다
  const withLog = supportMailto('a@b.co', '1.0.0', 'TypeError: x');
  assert.ok(decodeURIComponent(withLog.split('&body=')[1] ?? '').includes(msg().settings.mailLogHead));
  assert.doesNotMatch(supportMailto('a@b.co', '1.0.0', ''), /&body=/);
  const noun = { ko: '오류 기록', ja: 'エラーの記録', en: 'error log' };
  const erase = { ko: /지워도 괜찮아요/, ja: /消しても大丈夫です/, en: /delete it before sending/ };
  for (const l of LANGS) {
    // 문의하기 구역(첫 h3 다음 ~ 둘째 h3 앞)
    const contact = plain(part(page, l).split('<h3>')[1]);
    assert.ok(msg(l).settings.mailLogHead.includes(noun[l]), `${l}: 앱의 말`);
    assert.ok(contact.includes(noun[l]), `${l}: '${noun[l]}'`);
    assert.match(contact, erase[l], `${l}: 지워도 된다`);
  }
});

test('답이 기대는 앱의 사실 — 바뀌면 support.md도 함께 고친다', () => {
  // 저장본 7일치 · 알림은 2주치를 미리 건다 · 결제 없음 · 전체 초기화는 지난 표를 남긴다
  assert.match(src('src/store/MandaratContext.tsx'), /const SNAP_KEEP = 7;/);
  // 7일은 달력의 7일이 아니라 저장본이 있는 날 가운데 최근 일곱 — 열쇠를 날짜순으로 늘어놓고 앞의 일곱만 둔다
  assert.match(src('src/store/MandaratContext.tsx'), /\.sort\(\)\.reverse\(\)\.slice\(0, SNAP_KEEP\)/);
  assert.equal(REMINDER_DAYS, 14);
  assert.equal(STORE_OPEN, false);
  assert.match(src('src/lib/archive.ts'), /return \{ \.\.\.blankDoc\(\), settings: d\.settings, \.\.\.\(d\.archives && d\.archives\.length > 0 \? \{ archives: d\.archives \} : \{\}\) \};/);
  // 위젯 모습은 앱을 처음 열 때 써 둔다 — '앱을 한 번 연 뒤 위젯을 추가'
  assert.match(src('src/widgets/bridge.ios.ts'), /createWidget<TodayWidgetProps>\(WIDGET_KIND, TodayLayout\)/);
});

test('말투 — 느낌표 · 이모지 · 다른 모바일 플랫폼 이름이 없고, 언어마다 낱말장 규칙을 지킨다', () => {
  for (const l of LANGS) {
    const text = section(doc, HEADS[l]);
    assert.deepEqual(textProblems(l, text), [], `${l}: 낱말장`);
    assert.doesNotMatch(text, /[!！]/, `${l}: 느낌표`);
  }
  // App Review 2.3.10 — 페이지 어디에도(주석 · 스크립트 포함)
  assert.doesNotMatch(page, /android|안드로이드|アンドロイド|google play|구글 플레이|갤럭시|galaxy/i);
  // 다른 언어 글자가 섞이지 않는다(머리의 세 언어 이름은 section 밖)
  assert.doesNotMatch(plain(part(page, 'en')), /[가-힯぀-ヿ一-鿿]/);
  assert.doesNotMatch(plain(part(page, 'ja')), /[가-힯]/);
  assert.doesNotMatch(plain(part(page, 'ko')), /[぀-ヿ]/);
});

test('지원 주소는 그 페이지(https · cleanUrls)이고, 처리방침과 같은 곳에서 ?lang=으로 연다', () => {
  assert.match(SUPPORT_URL, /^https:\/\/[^/]+\/support$/);
  assert.equal(new URL(SUPPORT_URL).origin, new URL(PRIVACY_URL).origin);
  assert.equal(supportLink('ja'), `${SUPPORT_URL}?lang=ja`);
  assert.equal(supportLink('ko', ''), '');
  // /support는 public/support.html — Expo 웹 내보내기가 public/을 dist/로 옮기고, 모든 길을 앱으로 돌리는 rewrite보다 파일이 먼저다
  const vercel = JSON.parse(src('vercel.json'));
  assert.equal(vercel.cleanUrls, true);
  assert.equal(vercel.outputDirectory, 'dist');
  assert.deepEqual(vercel.rewrites, [{ source: '/(.*)', destination: '/' }]);
  assert.ok(fs.existsSync(path.join(ROOT, 'public/support.html')));
  assert.ok(!fs.existsSync(path.join(ROOT, 'public/support')), '같은 이름의 폴더가 길을 가리지 않는다');
});

test('두 페이지의 모습 — 토큰 값 그대로(밝게 LIGHT · 어둡게 DARK), 크림 종이 · 금색 없음, 마크는 먹 둘레에 여덟 영역 색', () => {
  const vars = (T) => [
    `--paper:${T.paper}`, `--ink:${T.ink}`, `--ink2:${T.ink2}`, `--print:${T.print}`, `--rule:${T.printRule}`, `--tile:${T.tile}`, `--core:${T.core}`,
    ...T.dye.map((c, i) => `--dye${i + 1}:${c}`),
  ].join(';');
  assert.equal(LIGHT.paper, '#FFFFFF');
  assert.equal(LIGHT.ink, '#191B1F');
  // 색은 src/theme/tokens.ts에서 읽는다 — 토큰을 고치면 두 페이지도 다시 만든다
  assert.equal(src('public/privacy.html'), buildPrivacy(), '색 토큰이나 글을 고쳤다면: npm run privacy-page');
  assert.equal(page, build(), '색 토큰이나 글을 고쳤다면: npm run support-page');
  const scripts = [];
  for (const f of ['public/privacy.html', 'public/support.html']) {
    const html = src(f);
    const css = /<style>([\s\S]*?)<\/style>/.exec(html)[1];
    assert.ok(css.startsWith(`\n:root{${vars(LIGHT)};color-scheme:light}\n@media (prefers-color-scheme:dark){:root{${vars(DARK)};color-scheme:dark}}\n`), `${f}: 색 변수`);
    // 색은 변수로만 — 그 밖의 색 값(예전 #FBF9F4 · 금색 …)이 스타일에 없다
    const known = new Set([LIGHT, DARK].flatMap((T) => [T.paper, T.ink, T.ink2, T.print, T.printRule, T.tile, T.core, ...T.dye]));
    for (const c of css.match(/#[0-9A-Fa-f]{3,8}\b/g) ?? []) assert.ok(known.has(c), `${f}: ${c}`);
    assert.doesNotMatch(html, /FBF9F4|F1EEE6|8C6A2A|D2AE69|--gold|--desk|rgba?\(/i, `${f}: 예전 색`);
    assert.match(css, /body\{margin:0;background:var\(--paper\);color:var\(--ink\);font:16px\/1\.7 -apple-system,/, `${f}: 흰 바탕 · 시스템 글꼴`);
    // 마크 — 아홉 칸, 가운데(다섯째)는 먹(core), 나머지는 토큰 차례대로 영역 1~8
    assert.equal(count(html, /<i><\/i>/g), 9, f);
    assert.match(css, /\.mark i\{border-radius:2px;background:var\(--core\)\}/, f);
    [1, 2, 3, 4, 6, 7, 8, 9].forEach((cell, i) => assert.ok(css.includes(`.mark i:nth-child(${cell}){background:var(--dye${i + 1})}`), `${f}: 마크 ${cell}`));
    assert.doesNotMatch(css, /\.mark i:nth-child\(5\)/, f);
    // 한 단 · 인쇄(밝은 색으로, 언어 고르기는 빼고 세 언어 모두)
    assert.match(css, /main\{max-width:680px;margin:0 auto;/, f);
    assert.ok(css.includes(`@media print{:root{${vars(LIGHT)};color-scheme:light}`), `${f}: 인쇄는 밝게`);
    assert.match(css, /@media print\{[^\n]*nav\{display:none\}html\.js section\.off\{display:block\}/, f);
    assert.equal(html.includes(`<meta name="theme-color" content="${LIGHT.paper}" media="(prefers-color-scheme: light)">`), true, f);
    assert.equal(html.includes(`<meta name="theme-color" content="${DARK.paper}" media="(prefers-color-scheme: dark)">`), true, f);
    scripts.push(/<script>([\s\S]*?)<\/script>/.exec(html)[1]);
  }
  // 언어 고르기는 두 페이지가 같다: ?lang= → #ko·#ja·#en → 브라우저 언어, 고르면 주소를 ?lang=으로
  assert.equal(scripts[0], scripts[1]);
  assert.match(scripts[0], /\/\[\?&\]lang=\(\[a-z\]\{2\}\)\/\.exec\(location\.search\)/);
  assert.match(scripts[0], /history\.replaceState\(null, '', '\?lang=' \+ l\)/);
});
