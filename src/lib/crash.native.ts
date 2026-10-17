// 오류 수집 — iOS·Android. V4-F가 @sentry/react-native로 채운다(이 파일에서만 init — 개인정보·화면 캡처·추적 없음).
// SENTRY_DSN이 비어 있는 동안 init()은 아무것도 하지 않는다(Sentry 프로젝트 'mandarat'을 아직 만들지 못했다).
import type { CrashApi } from './contracts';

/** Sentry 프로젝트 DSN(공개 값) — 비면 오류를 보내지 않는다 */
export const SENTRY_DSN = '';

export const crash = {
  init: () => {},
  wrap: <T>(root: T): T => root,
  report: (_e: unknown, _ctx?: Record<string, string>) => {},
  crumb: (_category: string, _message: string) => {},
  tag: (_key: string, _value: string) => {},
  setEnabled: (_on: boolean) => {},
} satisfies CrashApi;
