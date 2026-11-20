#!/usr/bin/env node
// 도움말과 문의 웹 페이지 — docs/v2/support.md의 세 언어 본문(한국어 · 日本語 · English)을 public/support.html로 옮긴다.
// App Store의 지원 주소(Support URL)가 여는 페이지다: 문의 메일과 자주 묻는 질문(App Review 1.5).
// 고칠 때는 support.md를 고치고 `npm run support-page`로 다시 만든다(tests/supportPage.test.js가 커밋된 페이지와 지금 만든 결과가 같은지 본다).
// - 문의 메일은 src/lib/appInfo.ts의 SUPPORT_EMAIL — 그 틀 자리만 있는 줄이 메일 단추가 된다.
// - 처리방침 링크는 PRIVACY_URL에 그 언어의 ?lang=을 붙인다(앱의 privacyLink와 같은 주소).
// - 틀과 모습(색 · 마크 · 언어 고르기 · 인쇄)은 scripts/site-page.js — 처리방침 페이지(scripts/privacy-page.js)와 함께 쓴다.
// 쓰는 법: npm run support-page  (--check: 다시 만들 필요가 있으면 종료 코드 1)
const fs = require('fs');
const path = require('path');
const site = require('./site-page');

const DOC = 'docs/v2/support.md';
const OUT = 'public/support.html';

const TITLES = { ko: '도움말과 문의', ja: 'サポート', en: 'Support' };

/** support.md에서 한 언어의 본문(## 머리 다음 ~ 다음 --- 앞) */
const section = (md, head) => site.section(md, head, 'support.md');

/** 본문 → HTML — 머리(### · ####), 글, - 목록, > 덧붙이는 말, 메일 단추 */
function render(text, lang, { email, privacyUrl }) {
  const filled = text.split('<PRIVACY_URL>').join(`${privacyUrl}?lang=${lang.code}`);
  return site.blocks(filled, (line) => {
    if (line === '`<SUPPORT_EMAIL>`') return `<p class="mail"><a href="mailto:${site.esc(email)}">${site.esc(email)}</a></p>`;
    return null;
  });
}

function build() {
  const md = fs.readFileSync(path.join(site.ROOT, DOC), 'utf8');
  const info = site.appInfo();
  if (!info.email) throw new Error('src/lib/appInfo.ts의 SUPPORT_EMAIL이 비어 있어요');
  if (!info.privacyUrl) throw new Error('src/lib/appInfo.ts의 PRIVACY_URL이 비어 있어요');
  return site.page({
    doc: DOC,
    command: 'support-page',
    script: 'scripts/support-page.js',
    title: '만다라트 · 도움말과 문의 / サポート / Support',
    description: '만다라트 앱의 도움말과 문의 — マンダラート サポート — Mandalart Support',
    sections: site.LANGS.map((l) => ({ code: l.code, title: TITLES[l.code], body: render(section(md, l.head), l, info) })),
  });
}

if (require.main === module) site.run({ name: 'support-page', doc: DOC, out: OUT, build });

module.exports = { build, render, section };
