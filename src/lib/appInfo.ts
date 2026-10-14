// 앱 정보 — 판(버전)·개인정보 처리방침·문의처·오픈소스 라이선스의 단일 출처 (RN 의존 없는 순수 모듈).
// 판은 app.json에서 읽어, 손으로 적은 버전이 app.json과 어긋나지 않게 한다.
import appJson from '../../app.json';

/** 판 — app.json의 expo.version */
export const APP_VERSION: string = appJson.expo.version;

// TODO(owner): 출시 전에 개인정보 처리방침 주소를 넣는다(App Review 필수). 비어 있는 동안 설정의 링크는 숨는다.
export const PRIVACY_URL = '';

// TODO(owner): 출시 전에 문의 받을 메일 주소를 넣는다. 비어 있는 동안 설정의 '문의하기'는 숨는다.
export const SUPPORT_EMAIL = '';

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
  { name: 'Lucide 아이콘 도형', license: 'ISC' },
  { name: 'Pretendard', license: 'SIL OFL 1.1' },
];

/** 문의 메일 주소(mailto:) — 제목에 판을 적어 둔다. 주소가 비어 있으면 '' */
export function supportMailto(email = SUPPORT_EMAIL, version = APP_VERSION): string {
  if (!email.trim()) return '';
  return `mailto:${email.trim()}?subject=${encodeURIComponent(`만다라트 문의 ${version}`)}`;
}
