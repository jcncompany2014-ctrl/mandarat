// 웹에 올리는 글 페이지(개인정보 처리방침 · 도움말과 문의)가 함께 쓰는 틀 — 세 언어 본문을 한 장의 HTML로 묶는다.
// scripts/privacy-page.js · scripts/support-page.js가 부른다. 페이지는 public/에 두고 Expo 웹 내보내기가 dist/로 그대로 옮긴다
// (vercel.json cleanUrls: /privacy · /support). 바깥 글꼴 · 스크립트 · 스타일시트는 부르지 않는다.
// - 모습은 앱과 같다: 색은 src/theme/tokens.ts의 LIGHT(밝게) · DARK(시스템이 어두울 때)에서 읽고, 머리의 3×3 마크는
//   앱 아이콘처럼 가운데 먹(core) 둘레에 여덟 영역 색(dye, 토큰 차례 그대로)을 둔다.
// - 주소 · 문의 메일은 src/lib/appInfo.ts에서 읽는다. 두 파일 모두 글자로 읽어, 이 스크립트는 TypeScript 없이 돈다.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/** 세 언어 — head는 문서(.md)의 '## 머리' 첫 낱말, name은 언어 고르기에 보이는 이름 */
const LANGS = [
  { code: 'ko', head: '한국어', name: '한국어' },
  { code: 'ja', head: '日本語', name: '日本語' },
  { code: 'en', head: 'English', name: 'English' },
];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** src/lib/appInfo.ts의 문의 메일 · 처리방침 주소 */
function appInfo() {
  const s = read('src/lib/appInfo.ts');
  const get = (k) => (new RegExp(`export const ${k} = '([^']*)';`).exec(s) ?? [])[1] ?? '';
  return { email: get('SUPPORT_EMAIL'), privacyUrl: get('PRIVACY_URL') };
}

/** src/theme/tokens.ts에서 페이지가 쓰는 색만 — { light, dark } 각각 paper · ink · ink2 · print · printRule · tile · core · dye[8] */
function tokens() {
  const s = read('src/theme/tokens.ts');
  const palette = (name) => {
    const body = (new RegExp(`export const ${name}: Tokens = \\{([\\s\\S]*?)\\n\\};`).exec(s) ?? [])[1];
    if (!body) throw new Error(`src/theme/tokens.ts에서 ${name}를 찾지 못했어요`);
    const one = (k) => {
      const v = (new RegExp(`\\b${k}: '(#[0-9A-Fa-f]{6})'`).exec(body) ?? [])[1];
      if (!v) throw new Error(`src/theme/tokens.ts ${name}.${k}를 읽지 못했어요`);
      return v;
    };
    const dye = ((new RegExp(`\\bdye:\\s*\\[([^\\]]*)\\]`).exec(body) ?? [])[1] ?? '').match(/#[0-9A-Fa-f]{6}/g) ?? [];
    if (dye.length !== 8) throw new Error(`src/theme/tokens.ts ${name}.dye는 여덟 색이어야 해요`);
    return { paper: one('paper'), ink: one('ink'), ink2: one('ink2'), print: one('print'), printRule: one('printRule'), tile: one('tile'), core: one('core'), dye };
  };
  return { light: palette('LIGHT'), dark: palette('DARK') };
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 줄 안의 꾸밈 — **굵게** · [글](주소) · `코드`(틀 자리는 이미 채웠다). 길잡이 꺾쇠( › )는 앞말에 붙여 줄 머리에 오지 않게 한다 */
function inline(s) {
  return esc(s)
    .replace(/ › /g, '&nbsp;› ')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, '$1');
}

/** 문서에서 한 언어의 본문('## 머리' 다음 줄 ~ 다음 --- 앞) */
function section(md, head, doc = '문서') {
  const at = md.indexOf(`\n## ${head}`);
  if (at < 0) throw new Error(`${doc}에 '## ${head}'가 없어요`);
  const body = md.slice(md.indexOf('\n', at + 1) + 1);
  const end = body.search(/\n---\s*\n/);
  return (end < 0 ? body : body.slice(0, end)).trim();
}

/**
 * 본문 → HTML. 읽는 것: '### 머리'(h3) · '#### 머리'(h4) · 번호 머리 '**1. …**'(h3) · '- ' 목록 · '> ' 덧붙이는 말(흐린 글) · 글(이어진 줄은 <br>).
 * special(line)이 글자를 돌려주면 그 줄은 그것으로 싣는다(''이면 싣지 않는다) — 시행일 · 문의 메일처럼 페이지마다 다른 줄.
 */
function blocks(text, special = () => null) {
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
    const own = special(line);
    if (own != null) { flush(); if (own) out.push(own); continue; }
    const h = /^(#{3,4}) (.+)$/.exec(line);
    if (h) { flush(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    const n = /^\*\*(\d+\..+)\*\*$/.exec(line);
    if (n) { flush(); out.push(`<h3>${inline(n[1])}</h3>`); continue; }
    if (line.startsWith('> ')) { flush(); out.push(`<p class="note">${inline(line.slice(2))}</p>`); continue; }
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

/** 색 변수 한 벌 — 토큰 값 그대로 */
function vars(t) {
  return `--paper:${t.paper};--ink:${t.ink};--ink2:${t.ink2};--print:${t.print};--rule:${t.printRule};--tile:${t.tile};--core:${t.core};${t.dye.map((c, i) => `--dye${i + 1}:${c}`).join(';')}`;
}

/** 마크의 아홉 칸 — 가운데(다섯째)는 먹, 나머지는 영역 1~8(앱의 마크와 같은 자리: components/chart/geometry markTiles) */
const MARK_CSS = [1, 2, 3, 4, 6, 7, 8, 9].map((cell, i) => `.mark i:nth-child(${cell}){background:var(--dye${i + 1})}`).join('');

function css() {
  const { light, dark } = tokens();
  return `:root{${vars(light)};color-scheme:light}
@media (prefers-color-scheme:dark){:root{${vars(dark)};color-scheme:dark}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.7 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans KR","Noto Sans JP","Segoe UI",sans-serif;overflow-wrap:anywhere;-webkit-font-smoothing:antialiased}
section:lang(ko){word-break:keep-all}
section:lang(ja){line-break:strict}
main{max-width:680px;margin:0 auto;padding:28px max(24px,env(safe-area-inset-right)) 72px max(24px,env(safe-area-inset-left))}
header{display:flex;align-items:center;gap:12px}
.mark{flex:none;width:28px;height:28px;display:grid;grid-template-columns:repeat(3,1fr);gap:2px}
.mark i{border-radius:2px;background:var(--core)}
${MARK_CSS}
header b{font-size:15px;font-weight:600;letter-spacing:-.01em}
nav{display:flex;flex-wrap:wrap;gap:2px 12px;align-items:center;margin-top:20px;padding-bottom:12px;border-bottom:1px solid var(--rule);font-size:15px}
nav a{color:var(--ink2);text-decoration:none;padding:6px 0}
nav a[aria-current="true"]{color:var(--ink);font-weight:700;box-shadow:inset 0 -2px var(--ink)}
nav span{color:var(--print)}
h2{font-size:30px;line-height:1.25;letter-spacing:-.02em;margin:36px 0 10px}
h3{font-size:17px;line-height:1.45;margin:30px 0 8px;padding-top:20px;border-top:1px solid var(--rule)}
h4{font-size:16px;line-height:1.5;margin:26px 0 6px}
p,ul{margin:0 0 10px}
ul{padding-left:1.25em}
li{margin:4px 0}
li::marker{color:var(--print)}
a{color:var(--ink);text-decoration-thickness:1px;text-underline-offset:3px}
.meta{color:var(--print);font-size:14px;margin-bottom:20px}
.note{color:var(--ink2);font-size:15px}
.mail{margin:14px 0 18px}
.mail a{display:inline-block;padding:11px 16px;border-radius:12px;background:var(--tile);font-size:17px;font-weight:600;text-decoration:none}
.contact{margin-top:30px;padding-top:20px;border-top:1px solid var(--rule)}
html.js section.off{display:none}
@media print{:root{${vars(light)};color-scheme:light}main{max-width:none;padding:0}nav{display:none}html.js section.off{display:block}section+section{break-before:page}h3,h4{break-after:avoid}.mark i{-webkit-print-color-adjust:exact;print-color-adjust:exact}.mail a{padding:0;background:none}}`;
}

// ?lang= → 주소의 #ko·#ja·#en → 브라우저 언어 순으로 한 언어만 보인다(스크립트가 없으면 세 언어를 모두 보인다)
const SWITCHER = `(function () {
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
})();`;

/**
 * 페이지 한 장.
 * - doc · command · script: 맨 위 '만들어진 파일' 안내에 적는 문서 · npm 명령 · 스크립트
 * - title · description: <title> · 설명(세 언어를 한 줄에)
 * - sections: [{ code, title, body }] — 언어 차례대로, body는 blocks()의 결과
 */
function page({ doc, command, script, title, description, sections }) {
  const { light, dark } = tokens();
  const nav = LANGS.map((l) => `<a href="?lang=${l.code}#${l.code}" data-lang="${l.code}" lang="${l.code}">${esc(l.name)}</a>`).join('<span aria-hidden="true">·</span>');
  const body = sections.map((s) => `  <section id="${s.code}" lang="${s.code}">\n    <h2>${esc(s.title)}</h2>\n${s.body.replace(/^/gm, '    ')}\n  </section>`);
  return `<!DOCTYPE html>
<!-- 만들어진 파일 — ${doc}를 고치고 \`npm run ${command}\`로 다시 만든다(${script}) -->
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="${light.paper}" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="${dark.paper}" media="(prefers-color-scheme: dark)">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<style>
${css()}
</style>
</head>
<body>
<main>
  <header><span class="mark" aria-hidden="true">${'<i></i>'.repeat(9)}</span><b>만다라트 · マンダラート · Mandalart</b></header>
  <nav aria-label="Language">${nav}</nav>
${body.join('\n')}
</main>
<script>
// ?lang= → 주소의 #ko·#ja·#en → 브라우저 언어 순으로 한 언어만 보인다(스크립트가 없으면 세 언어를 모두 보인다)
${SWITCHER}
</script>
</body>
</html>
`;
}

/** 명령줄 — 그냥 부르면 out에 쓰고, --check면 다시 만들 필요가 있을 때 종료 코드 1 */
function run({ name, doc, out, build }) {
  const html = build();
  const file = path.join(ROOT, out);
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (now !== html) {
      console.error(`${out}이 ${doc}와 달라요 — npm run ${name}로 다시 만들어 주세요`);
      process.exit(1);
    }
    console.log(`${name}: 같아요`);
  } else {
    fs.writeFileSync(file, html);
    console.log(`${name}: ${out}`);
  }
}

module.exports = { ROOT, LANGS, appInfo, tokens, esc, inline, section, blocks, page, run };
