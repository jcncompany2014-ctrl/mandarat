// 오류 수집 자리 — 1.0은 어디에서도 아무것도 보내지 않는다(Sentry를 빼고 낸다, owner 결정 2026-11).
// 앱 곳곳은 이 crash만 부른다. 오류 수집을 다시 켤 때는 이 자리에 crash.native.ts(Sentry, V4-F)를 되살리면 된다.
import type { CrashApi } from './contracts';

export const crash = {
  init: () => {},
  wrap: <T>(root: T): T => root,
  report: (_e: unknown, _ctx?: Record<string, string>) => {},
  crumb: (_category: string, _message: string) => {},
  tag: (_key: string, _value: string) => {},
  setEnabled: (_on: boolean) => {},
  qaNativeCrash: () => {},
} satisfies CrashApi;
