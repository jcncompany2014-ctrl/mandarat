// 오류 수집 — 웹·Node(기본 파일): 아무것도 보내지 않는다. 기기 쪽은 crash.native.ts(Sentry, V4-F).
// 웹과 Node 테스트는 Sentry를 불러오지 않는다(tests/crash.test.js · 웹 스모크의 번들 검사가 지킨다).
import type { CrashApi } from './contracts';

export const crash = {
  init: () => {},
  wrap: <T>(root: T): T => root,
  report: (_e: unknown, _ctx?: Record<string, string>) => {},
  crumb: (_category: string, _message: string) => {},
  tag: (_key: string, _value: string) => {},
  setEnabled: (_on: boolean) => {},
} satisfies CrashApi;
