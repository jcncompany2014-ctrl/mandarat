// 앱 정보 — 판(버전)·개인정보 처리방침·문의처·오픈소스 라이선스의 단일 출처 (RN 의존 없는 순수 모듈).
// 판은 app.json에서 읽어, 손으로 적은 버전이 app.json과 어긋나지 않게 한다.
import appJson from '../../app.json';
import { msg } from '../i18n';

/** 판 — app.json의 expo.version */
export const APP_VERSION: string = appJson.expo.version;

// 개인정보 처리방침 — 웹 미리보기와 같은 곳에 올린 페이지(public/privacy.html, docs/v2/privacy.md에서 만든다). App Review 필수.
// 비어 있으면 설정의 링크는 숨는다
export const PRIVACY_URL = 'https://mandarat-delta.vercel.app/privacy';

// 문의 받을 메일 — 처리방침 페이지의 문의 줄도 이 값으로 만든다(scripts/privacy-page.js). 비어 있으면 설정의 '문의하기'는 숨는다
export const SUPPORT_EMAIL = 'ian020529@gmail.com';

/** 처리방침을 앱 언어로 연다 — 페이지가 ?lang=으로 그 언어 쪽만 보인다 */
export function privacyLink(l: string, url = PRIVACY_URL): string {
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

/** 문의 메일 주소(mailto:) — 제목(지금 언어)에 판을 적어 둔다. 주소가 비어 있으면 '' */
export function supportMailto(email = SUPPORT_EMAIL, version = APP_VERSION): string {
  if (!email.trim()) return '';
  return `mailto:${email.trim()}?subject=${encodeURIComponent(msg().settings.mailSubject({ version }))}`;
}
