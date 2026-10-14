#!/usr/bin/env node
// 출시 막음 검사 — 개인정보 처리방침 주소(PRIVACY_URL)와 문의 메일(SUPPORT_EMAIL)이 비어 있으면 출시 빌드를 만들지 않는다.
// App Review는 개인정보 처리방침 URL과 지원 URL을 요구한다(docs/RELEASE_CHECKLIST.md › 막는 항목).
// 쓰는 법: npm run release-check  (production 빌드 전에. 실패하면 종료 코드 1)
const path = require('path');

/** 앱 정보 값 → 고칠 것 목록(비어 있으면 출시해도 된다) */
function releaseProblems({ PRIVACY_URL, SUPPORT_EMAIL }) {
  const out = [];
  const url = String(PRIVACY_URL ?? '').trim();
  const email = String(SUPPORT_EMAIL ?? '').trim();
  if (!url) out.push('PRIVACY_URL 값이 비어 있어요 — 개인정보 처리방침을 게시하고 src/lib/appInfo.ts에 주소를 넣어 주세요.');
  else if (!/^https:\/\/[^\s/]+\.[^\s]+$/.test(url)) out.push(`PRIVACY_URL 값이 https 주소가 아니에요: ${url}`);
  if (!email) out.push('SUPPORT_EMAIL 값이 비어 있어요 — 문의 받을 메일 주소를 src/lib/appInfo.ts에 넣어 주세요.');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) out.push(`SUPPORT_EMAIL 값이 메일 주소 모양이 아니에요: ${email}`);
  return out;
}

module.exports = { releaseProblems };

if (require.main === module) {
  require(path.join(__dirname, '..', 'tests', 'register'));
  const info = require(path.join(__dirname, '..', 'src', 'lib', 'appInfo.ts'));
  const problems = releaseProblems(info);
  if (problems.length) {
    console.error('출시할 수 없어요 (docs/RELEASE_CHECKLIST.md):');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`출시 막음 검사 통과 — 판 ${info.APP_VERSION}`);
}
