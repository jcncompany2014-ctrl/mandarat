// 앱 정보 — 판(버전)·개인정보 처리방침·문의처·오픈소스 라이선스의 단일 출처 (RN 의존 없는 순수 모듈).
// 판은 app.json에서 읽어, 손으로 적은 버전이 app.json과 어긋나지 않게 한다.
import appJson from '../../app.json';
import { msg } from '../i18n';
import { logText } from './crashLog';

/** 판 — app.json의 expo.version */
export const APP_VERSION: string = appJson.expo.version;

// 개인정보 처리방침 — 웹 미리보기와 같은 곳에 올린 페이지(public/privacy.html, docs/v2/privacy.md에서 만든다). App Review 필수.
// 비어 있으면 설정의 링크는 숨는다
export const PRIVACY_URL = 'https://mandarat-delta.vercel.app/privacy';

// 도움말과 문의 — 처리방침과 같은 곳에 올린 페이지(public/support.html, docs/v2/support.md에서 만든다).
// App Store의 지원 주소(Support URL)가 이 페이지다(App Review 1.5: 문의처가 있는 지원 페이지)
export const SUPPORT_URL = 'https://mandarat-delta.vercel.app/support';

// 문의 받을 메일 — 처리방침 · 도움말 페이지의 문의 줄도 이 값으로 만든다(scripts/privacy-page.js · support-page.js). 비어 있으면 설정의 '문의하기'는 숨는다
export const SUPPORT_EMAIL = 'ian020529@gmail.com';

/** 처리방침을 앱 언어로 연다 — 페이지가 ?lang=으로 그 언어 쪽만 보인다 */
export function privacyLink(l: string, url = PRIVACY_URL): string {
  return url ? `${url}?lang=${l}` : '';
}

/** 도움말과 문의 페이지를 그 언어로 — 처리방침과 같은 ?lang= */
export function supportLink(l: string, url = SUPPORT_URL): string {
  return url ? `${url}?lang=${l}` : '';
}

export interface License {
  name: string;
  license: string;
}

/** 앱에 실린 오픈소스와 그 라이선스 — 설정 › 정보 › 오픈소스 라이선스 */
export const LICENSES: readonly License[] = [
  { name: 'React Native', license: 'MIT' },
  { name: 'Expo', license: 'MIT' },
  { name: 'react-native-svg', license: 'MIT' },
  { name: 'react-native-view-shot', license: 'MIT' },
  // 이 줄만 이름에 설명이 붙어 지금 언어로 읽는다(settings.licLucide). 다른 이름은 고유 이름이라 그대로
  { get name() { return msg().settings.licLucide; }, license: 'ISC' },
  { name: 'Pretendard', license: 'SIL OFL 1.1' },
];

/** 문의 메일 본문(주소에 실은 꼴)의 길이 막음 — 이보다 길면 mailto 주소를 열지 못하는 메일 앱이 있다 */
export const MAIL_BODY_CAP = 1500;

/**
 * 오류 기록을 메일 본문으로 — 주소에 실을 수 있게 바꾼 글(encodeURIComponent). 기록이 없으면 ''.
 * 맨 위에 '이 기기에 남은 오류 기록 · 지우고 보내도 된다'는 한 줄을 적는다(무엇이 붙었는지 보내는 사람이 안다).
 * 바꾼 글이 cap을 넘으면 뒤(오래된 기록)부터 잘라 cap에 들어가는 가장 긴 앞부분만 싣는다 —
 * 바꾸기 전 글을 자르므로 % 묶음이 중간에 끊기지 않는다. 기록이 한 글자도 들어가지 못하면 붙이지 않는다.
 */
export function mailLogBody(log: string, cap = MAIL_BODY_CAP): string {
  if (!log.trim()) return '';
  // 줄바꿈은 CRLF로(RFC 6068). 위 두 줄은 보내는 사람이 글을 적을 자리
  const head = `\n\n${msg().settings.mailLogHead}\n\n`.replace(/\n/g, '\r\n');
  const text = head + log.trim().replace(/\r?\n/g, '\r\n');
  /** 앞의 n글자를 실은 꼴 — 끝에 걸친 CR · 짝 잃은 글자 반쪽은 떼어 낸다. cap을 넘거나 바꾸지 못하면 null */
  const packed = (n: number): string | null => {
    try {
      const enc = encodeURIComponent(text.slice(0, n).replace(/[\r\uD800-\uDBFF]$/, ''));
      return enc.length <= cap ? enc : null;
    } catch {
      return null;
    }
  };
  // cap에 들어가는 가장 긴 앞부분(실은 길이는 n을 따라 줄지 않는다). 실은 글은 원래 글보다 짧아지지 않으므로 cap글자 너머는 볼 것 없다
  let lo = 0;
  let hi = Math.min(text.length, cap);
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (packed(mid) !== null) lo = mid;
    else hi = mid - 1;
  }
  return lo > head.length ? packed(lo) ?? '' : '';
}

/**
 * 문의 메일 주소(mailto:) — 제목(지금 언어)에 판을 적어 둔다. 주소가 비어 있으면 ''.
 * 이 기기에 남은 오류 기록(lib/crashLog)이 있으면 본문에 붙인다 — 메일을 보내는 것은 사용자이고, 앱은 아무것도 보내지 않는다.
 */
export function supportMailto(email = SUPPORT_EMAIL, version = APP_VERSION, log = logText()): string {
  if (!email.trim()) return '';
  const base = `mailto:${email.trim()}?subject=${encodeURIComponent(msg().settings.mailSubject({ version }))}`;
  const body = mailLogBody(log);
  return body ? `${base}&body=${body}` : base;
}
