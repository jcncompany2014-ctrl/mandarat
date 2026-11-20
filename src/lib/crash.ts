// 오류 기록 자리 — 1.0은 어디에도 아무것도 보내지 않는다(Sentry를 빼고 낸다, owner 결정 2026-11).
// 앱 곳곳은 이 crash만 부른다. 알린 오류 · 부스러기 · 태그는 이 기기에만 남는 기록(crashLog.ts, 마지막 20건)으로 간다 —
// 사용자가 적은 글은 남기지 않으므로 crumb · tag에는 코드가 정한 낱말만 넘긴다(화면 이름 · 단계 · 개수).
// 오류 수집을 다시 켤 때는 이 자리에 crash.native.ts(Sentry, V4-F)를 되살리면 된다.
import type { CrashApi } from './contracts';
import { logCrumb, logTag, record } from './crashLog';

export const crash = {
  // 전역 손잡이와 저장 자리는 index.ts가 App보다 먼저 건다(crashBoot.ts) — 여기서는 할 일이 없다
  init: () => {},
  wrap: <T>(root: T): T => root,
  /** ctx: where(잡은 자리) · componentStack(경계가 잡은 그리기 오류) — 그 밖의 값은 남기지 않는다 */
  report: (e: unknown, ctx?: Record<string, string>) => record(e, { where: ctx?.where, componentStack: ctx?.componentStack }),
  crumb: (category: string, message: string) => logCrumb(category, message),
  tag: (key: string, value: string) => logTag(key, value),
  setEnabled: (_on: boolean) => {},
  qaNativeCrash: () => {},
} satisfies CrashApi;
