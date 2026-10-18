#!/usr/bin/env node
// 개인정보 처리방침 웹 페이지 — docs/v2/privacy.md의 세 언어 본문(한국어 · 日本語 · English)을 public/privacy.html로 옮긴다.
// 문서가 하나뿐이라 페이지와 문서가 어긋나지 않는다: 고칠 때는 privacy.md를 고치고 `npm run privacy-page`로 다시 만든다
// (tests/privacyPage.test.js가 커밋된 페이지와 지금 만든 결과가 같은지 본다).
// - 문의 메일은 src/lib/appInfo.ts의 SUPPORT_EMAIL, 시행일은 아래 EFFECTIVE, 운영자 줄은 판매자 이름을 정하기 전까지 뺀다.
// - Sentry의 'IP 주소를 저장하지 않음' 문장은 owner가 Sentry에서 그 설정을 켠 뒤에만 싣는다(SENTRY_IP_OFF — privacy.md 검토표).
// 쓰는 법: npm run privacy-page  (--check: 다시 만들 필요가 있으면 종료 코드 1)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DOC = path.join(ROOT, 'docs/v2/privacy.md');
const OUT = path.join(ROOT, 'public/privacy.html');

/** 이 방침이 시작되는 날 — 바꾸면 페이지에 새 시행일로 올린다(11. 바뀌면 알려요) */
const EFFECTIVE = '2026-10-18';
/** owner가 Sentry › Security & Privacy › Prevent Storing of IP Addresses를 켰으면 true */
const SENTRY_IP_OFF = false;

const LANGS = [
  { code: 'ko', head: '한국어', name: '한국어', title: '개인정보 처리방침' },
  { code: 'ja', head: '日本語', name: '日本語', title: 'プライバシーポリシー' },
  { code: 'en', head: 'English', name: 'English', title: 'Privacy Policy' },
];

function appInfo() {
  const s = fs.readFileSync(path.join(ROOT, 'src/lib/appInfo.ts'), 'utf8');
  const get = (k) => (new RegExp(`export const ${k} = '([^']*)';`).exec(s) ?? [])[1] ?? '';
  return { email: get('SUPPORT_EMAIL'), url: get('PRIVACY_URL') };
}

function dateIn(code, ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  if (code === 'ko') return `${y}년 ${m}월 ${d}일`;
  if (code === 'ja') return `${y}年${m}月${d}日`;
  const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1];
  return `${month} ${d}, ${y}`;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 줄 안의 꾸밈 — **굵게** · `코드`(틀 자리는 이미 채웠다) */
function inline(s) {
  return esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '$1');
}

/** privacy.md에서 한 언어의 본문(## 머리 다음 ~ 다음 --- 앞) */
function section(md, head) {
  const at = md.indexOf(`\n## ${head}`);
  if (at < 0) throw new Error(`privacy.md에 '## ${head}'가 없어요`);
  const body = md.slice(md.indexOf('\n', at + 1) + 1);
  const end = body.search(/\n---\s*\n/);
  return (end < 0 ? body : body.slice(0, end)).trim();
}

/** 본문 → HTML — 시행일 줄, 번호 머리(**1. …**), 글, - 목록, 문의 줄 */
function render(text, lang, email) {
  const out = [];
  let list = null;
  let para = null;
  const flush = () => {
    if (list) out.push(`<ul>${list.map((li) => `<li>${li}</li>`).join('')}</ul>`);
    if (para) out.push(`<p>${para.join('<br>')}</p>`);
    list = null;
    para = null;
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    // 시행일 · 운영자 — 운영자(판매자 이름)는 정하기 전까지 싣지 않는다
    if (/<EFFECTIVE_DATE>/.test(line)) {
      flush();
      const label = line.split(':')[0];
      out.push(`<p class="meta">${esc(label)}: ${esc(dateIn(lang.code, EFFECTIVE))}</p>`);
      continue;
    }
    if (/<SUPPORT_EMAIL>/.test(line)) {
      flush();
      const label = /^\*\*([^*]+)\*\*/.exec(line)?.[1] ?? '';
      out.push(`<p class="contact"><strong>${esc(label)}</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></p>`);
      continue;
    }
    if (!SENTRY_IP_OFF && /IP ?(주소|アドレス|address)/.test(line)) continue;
    const h = /^\*\*(\d+\..+)\*\*$/.exec(line);
    if (h) { flush(); out.push(`<h3>${inline(h[1])}</h3>`); continue; }
    if (line.startsWith('- ')) {
      if (para) flush();
      (list ??= []).push(inline(line.slice(2)));
      continue;
    }
    if (list) flush();
    (para ??= []).push(inline(line));
  }
  flush();
  return out.join('\n');
}

function build() {
  const md = fs.readFileSync(DOC, 'utf8');
  const { email } = appInfo();
  if (!email) throw new Error('src/lib/appInfo.ts의 SUPPORT_EMAIL이 비어 있어요');
  const sections = LANGS.map((l) => {
    const body = render(section(md, l.head), l, email);
    return `  <section id="${l.code}" lang="${l.code}">\n    <h2>${esc(l.title)}</h2>\n${body.replace(/^/gm, '    ')}\n  </section>`;
  });
  const nav = LANGS.map((l) => `<a href="?lang=${l.code}#${l.code}" data-lang="${l.code}" lang="${l.code}">${esc(l.name)}</a>`).join('<span aria-hidden="true">·</span>');
  return `<!DOCTYPE html>
<!-- 만들어진 파일 — docs/v2/privacy.md를 고치고 \`npm run privacy-page\`로 다시 만든다(scripts/privacy-page.js) -->
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>만다라트 · 개인정보 처리방침 / プライバシーポリシー / Privacy Policy</title>
<meta name="description" content="만다라트 앱의 개인정보 처리방침 — マンダラート プライバシーポリシー — Mandalart Privacy Policy">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<style>
:root{--paper:#FBF9F4;--desk:#F1EEE6;--ink:#2B2620;--sub:#6B635A;--line:rgba(43,38,32,.14);--gold:#8C6A2A;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--paper:#1E1C19;--desk:#161513;--ink:#EDE8DF;--sub:#A69E93;--line:rgba(237,232,223,.16);--gold:#D2AE69;color-scheme:dark}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--desk);color:var(--ink);font:16px/1.7 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans KR","Noto Sans JP","Segoe UI",sans-serif;word-break:keep-all;overflow-wrap:anywhere}
main{max-width:680px;margin:0 auto;min-height:100vh;background:var(--paper);border-left:1px solid var(--line);border-right:1px solid var(--line);padding:28px 20px 56px}
header{display:flex;align-items:center;gap:12px;padding-bottom:14px;border-bottom:2px solid var(--ink)}
.mark{width:28px;height:28px;display:grid;grid-template-columns:repeat(3,1fr);gap:2px;border:2px solid var(--ink);padding:2px}
.mark i{background:var(--ink)}.mark i:nth-child(5){background:var(--gold)}
header b{font-size:18px;letter-spacing:-.01em}
nav{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line);font-size:15px}
nav a{color:var(--ink);text-decoration:underline;text-underline-offset:3px;padding:4px 2px}
nav a[aria-current="true"]{font-weight:700;text-decoration-thickness:2px}
nav span{color:var(--sub)}
section{padding-top:8px}
h2{font-size:24px;line-height:1.35;margin:24px 0 4px}
h3{font-size:16px;margin:26px 0 6px;padding-top:12px;border-top:1px solid var(--line)}
p,ul{margin:0 0 10px}
ul{padding-left:1.2em}
li{margin:4px 0}
.meta{color:var(--sub);font-size:14px;margin-bottom:16px}
.contact{margin-top:26px;padding-top:14px;border-top:2px solid var(--ink)}
a{color:var(--ink)}
html.js section.off{display:none}
@media print{body{background:#fff}main{border:0;max-width:none}nav{display:none}html.js section.off{display:block}}
</style>
</head>
<body>
<main>
  <header><span class="mark" aria-hidden="true">${'<i></i>'.repeat(9)}</span><b>만다라트 · マンダラート · Mandalart</b></header>
  <nav aria-label="Language">${nav}</nav>
${sections.join('\n')}
</main>
<script>
// ?lang= → 주소의 #ko·#ja·#en → 브라우저 언어 순으로 한 언어만 보인다(스크립트가 없으면 세 언어를 모두 보인다)
(function () {
  var ok = { ko: 1, ja: 1, en: 1 };
  function pick() {
    var q = /[?&]lang=([a-z]{2})/.exec(location.search);
    if (q && ok[q[1]]) return q[1];
    var h = location.hash.slice(1);
    if (ok[h]) return h;
    var ls = navigator.languages || [navigator.language || 'ko'];
    for (var i = 0; i < ls.length; i++) { var c = String(ls[i]).slice(0, 2).toLowerCase(); if (ok[c]) return c; }
    return 'ko';
  }
  function show(l) {
    document.documentElement.lang = l;
    var s = document.querySelectorAll('section');
    for (var i = 0; i < s.length; i++) s[i].className = s[i].id === l ? '' : 'off';
    var a = document.querySelectorAll('nav a');
    for (var j = 0; j < a.length; j++) a[j].setAttribute('aria-current', a[j].getAttribute('data-lang') === l ? 'true' : 'false');
  }
  document.documentElement.className = 'js';
  show(pick());
  document.querySelector('nav').addEventListener('click', function (e) {
    var l = e.target && e.target.getAttribute && e.target.getAttribute('data-lang');
    if (!l) return;
    e.preventDefault();
    show(l);
    history.replaceState(null, '', '?lang=' + l);
  });
})();
</script>
</body>
</html>
`;
}

if (require.main === module) {
  const html = build();
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (now !== html) {
      console.error('public/privacy.html이 docs/v2/privacy.md와 달라요 — npm run privacy-page로 다시 만들어 주세요');
      process.exit(1);
    }
    console.log('privacy-page: 같아요');
  } else {
    fs.writeFileSync(OUT, html);
    console.log(`privacy-page: ${path.relative(ROOT, OUT)}`);
  }
}

module.exports = { build, render, section, EFFECTIVE, SENTRY_IP_OFF };
