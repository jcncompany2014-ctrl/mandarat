#!/usr/bin/env node
// 개인정보 처리방침 웹 페이지 — docs/v2/privacy.md의 세 언어 본문(한국어 · 日本語 · English)을 public/privacy.html로 옮긴다.
// 문서가 하나뿐이라 페이지와 문서가 어긋나지 않는다: 고칠 때는 privacy.md를 고치고 `npm run privacy-page`로 다시 만든다
// (tests/privacyPage.test.js가 커밋된 페이지와 지금 만든 결과가 같은지 본다).
// - 문의 메일은 src/lib/appInfo.ts의 SUPPORT_EMAIL, 시행일은 아래 EFFECTIVE, 운영자 줄은 판매자 이름을 정하기 전까지 뺀다.
// - 틀과 모습(색 · 마크 · 언어 고르기 · 인쇄)은 scripts/site-page.js — 도움말 페이지(scripts/support-page.js)와 함께 쓴다.
// 쓰는 법: npm run privacy-page  (--check: 다시 만들 필요가 있으면 종료 코드 1)
const fs = require('fs');
const path = require('path');
const site = require('./site-page');

const DOC = 'docs/v2/privacy.md';
const OUT = 'public/privacy.html';

/** 이 글이 시작되는 날 — 방침의 글(privacy.md의 세 언어 본문)을 고치면 그날로 바꿔 새 시행일로 올린다(11. 바뀌면 알려요) */
const EFFECTIVE = '2026-11-20';

const TITLES = { ko: '개인정보 처리방침', ja: 'プライバシーポリシー', en: 'Privacy Policy' };

function dateIn(code, ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  if (code === 'ko') return `${y}년 ${m}월 ${d}일`;
  if (code === 'ja') return `${y}年${m}月${d}日`;
  const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1];
  return `${month} ${d}, ${y}`;
}

/** privacy.md에서 한 언어의 본문(## 머리 다음 ~ 다음 --- 앞) */
const section = (md, head) => site.section(md, head, 'privacy.md');

/** 본문 → HTML — 시행일 줄, 번호 머리(**1. …**), 글, - 목록, 문의 줄 */
function render(text, lang, email) {
  return site.blocks(text, (line) => {
    // 시행일 · 운영자 — 운영자(판매자 이름)는 정하기 전까지 싣지 않는다
    if (/<EFFECTIVE_DATE>/.test(line)) {
      const label = line.split(':')[0];
      return `<p class="meta">${site.esc(label)}: ${site.esc(dateIn(lang.code, EFFECTIVE))}</p>`;
    }
    if (/<SUPPORT_EMAIL>/.test(line)) {
      const label = /^\*\*([^*]+)\*\*/.exec(line)?.[1] ?? '';
      return `<p class="contact"><strong>${site.esc(label)}</strong> <a href="mailto:${site.esc(email)}">${site.esc(email)}</a></p>`;
    }
    return null;
  });
}

function build() {
  const md = fs.readFileSync(path.join(site.ROOT, DOC), 'utf8');
  const { email } = site.appInfo();
  if (!email) throw new Error('src/lib/appInfo.ts의 SUPPORT_EMAIL이 비어 있어요');
  return site.page({
    doc: DOC,
    command: 'privacy-page',
    script: 'scripts/privacy-page.js',
    title: '만다라트 · 개인정보 처리방침 / プライバシーポリシー / Privacy Policy',
    description: '만다라트 앱의 개인정보 처리방침 — マンダラート プライバシーポリシー — Mandalart Privacy Policy',
    sections: site.LANGS.map((l) => ({ code: l.code, title: TITLES[l.code], body: render(section(md, l.head), l, email) })),
  });
}

if (require.main === module) site.run({ name: 'privacy-page', doc: DOC, out: OUT, build });

module.exports = { build, render, section, EFFECTIVE };
