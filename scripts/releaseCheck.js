#!/usr/bin/env node
// 출시 막음 검사 — 개인정보 처리방침 주소(PRIVACY_URL)와 문의 메일(SUPPORT_EMAIL)이 비어 있으면 출시 빌드를 만들지 않는다.
// App Review는 개인정보 처리방침 URL과 지원 URL을 요구한다(docs/RELEASE_CHECKLIST.md › 막는 항목).
// 오류 수집(V4-F): Sentry DSN(SENTRY_DSN, src/lib/crash.native.ts)이 비어 있어도 막는다 — 비면 출시 앱이 오류를 보내지 않는다.
// 쓰는 법: npm run release-check  (production 빌드 전에. 실패하면 종료 코드 1)
const fs = require('fs');
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

/** Sentry DSN 꼴 — https://<공개 키>@o<조직 번호>.ingest[.us|.de].sentry.io/<프로젝트 번호> */
const DSN_RE = /^https:\/\/[0-9a-f]{32}@o\d+\.ingest(\.[a-z]{2})?\.sentry\.io\/\d+$/;

/** 오류 수집 값 → 고칠 것 목록(비어 있으면 출시해도 된다) */
function crashProblems({ SENTRY_DSN }) {
  const dsn = String(SENTRY_DSN ?? '').trim();
  if (!dsn) {
    return ['SENTRY_DSN 값이 비어 있어요 — Sentry 조직 farmerstail에 프로젝트 mandarat을 만들고 DSN을 src/lib/crash.native.ts에 넣어 주세요(docs/v2/V4-F.md › owner 할 일).'];
  }
  if (!DSN_RE.test(dsn)) return [`SENTRY_DSN 값이 Sentry DSN 모양이 아니에요: ${dsn}`];
  return [];
}

/** crash.native.ts는 @sentry/react-native를 불러와 Node에서 읽을 수 없다 — 소스에서 SENTRY_DSN 한 줄만 읽는다 */
function readSentryDsn(root = path.join(__dirname, '..')) {
  const src = fs.readFileSync(path.join(root, 'src', 'lib', 'crash.native.ts'), 'utf8');
  const m = /^export const SENTRY_DSN = (['"])(.*?)\1;$/m.exec(src);
  return m ? m[2] : '';
}

module.exports = { releaseProblems, crashProblems, readSentryDsn };

if (require.main === module) {
  require(path.join(__dirname, '..', 'tests', 'register'));
  const info = require(path.join(__dirname, '..', 'src', 'lib', 'appInfo.ts'));
  const problems = [...releaseProblems(info), ...crashProblems({ SENTRY_DSN: readSentryDsn() })];
  if (problems.length) {
    console.error('출시할 수 없어요 (docs/RELEASE_CHECKLIST.md):');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`출시 막음 검사 통과 — 판 ${info.APP_VERSION}`);
}
