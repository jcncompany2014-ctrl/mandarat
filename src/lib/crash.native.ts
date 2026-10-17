// 오류 수집 — iOS·Android(V4-F). @sentry/react-native는 이 파일에서만 불러오고 init한다 — 웹·Node는 crash.ts(아무것도 안 함).
// 보내지 않는 것: 개인정보(sendDefaultPii 끔) · 화면 캡처 · 화면 구조 · 성능 추적 · 켤 때마다의 세션 기록. 적은 글은 beforeSend · beforeBreadcrumb가 걸러 낸다.
// SENTRY_DSN이 비어 있는 동안 init()과 모든 호출은 아무것도 하지 않는다(npm run release-check가 출시를 막는다 — docs/v2/V4-F.md).
// 끄기(crashPrefs)는 기기마다: 꺼 둔 채 앱을 켜면 Sentry를 아예 시작하지 않아 기기 쪽 강제 종료 기록도 보내지 않고,
// 쓰는 중에 끄면 beforeSend가 모든 사건을 버린다.
import * as Sentry from '@sentry/react-native';
import type { Breadcrumb, ErrorEvent } from '@sentry/react-native';
import type { ComponentType } from 'react';
import type { CrashApi } from './contracts';
import { readCrashOff } from './crashPrefs';

/** Sentry 프로젝트 DSN(공개 값) — 비면 오류를 보내지 않는다 */
export const SENTRY_DSN = '';

/** 오류 글 한 줄의 최대 길이 */
const MAX_VALUE = 200;
/** 이보다 긴 발자국(breadcrumb)은 적은 글이 들었을 수 있어 버린다 */
const MAX_CRUMB = 80;
/** 시작 전에 모아 둘 호출 수 */
const MAX_PENDING = 30;

/** 따옴표로 묶인 부분 — 적은 글이 오류 글에 끼어드는 자리 */
const QUOTED = /"[^"\n]*"|'[^'\n]*'|`[^`\n]*`|“[^”\n]*”|‘[^’\n]*’|「[^」\n]*」|『[^』\n]*』/g;

/** 따옴표 없이 끼어든 한글 · 가나 · 한자 — 거기서부터 줄 끝까지(코드 이름은 ASCII라 남는다) */
const CJK_RUN = /[\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}][^\n]*/gu;

/** 오류 글 — 따옴표 안과 한글 · 가나 · 한자부터 줄 끝까지를 "…"로 바꾸고 200자로 자른다 */
export function scrubText(s: string): string {
  const out = s.replace(QUOTED, '"…"').replace(CJK_RUN, '"…"');
  return out.length > MAX_VALUE ? `${out.slice(0, MAX_VALUE - 1)}…` : out;
}

const KEEP_CONSOLE = new Set(['warning', 'error', 'fatal']);

/** 남길 발자국인가 — 경고보다 낮은 console 기록과 80자보다 긴 글은 버리고, 남기는 글도 오류 글처럼 거른다 */
export function keepCrumb(b: Breadcrumb): Breadcrumb | null {
  if (b.category === 'console' && !KEEP_CONSOLE.has(String(b.level ?? 'log'))) return null;
  if (typeof b.message === 'string' && b.message.length > MAX_CRUMB) return null;
  const out: Breadcrumb = typeof b.message === 'string' ? { ...b, message: scrubText(b.message) } : { ...b };
  // console 기록의 인자(객체 그대로)는 보내지 않는다
  if (out.category === 'console') delete out.data;
  return out;
}

/** 보내기 전 — 개인정보 칸을 지우고 오류 글을 거른다. 끈 기기면 null(보내지 않음) */
export function scrubEvent(event: ErrorEvent, off: boolean): ErrorEvent | null {
  if (off) return null;
  delete event.extra;
  delete event.user;
  delete event.request;
  delete event.server_name;
  const device = event.contexts?.device as { name?: unknown } | undefined;
  if (device) delete device.name;
  for (const ex of event.exception?.values ?? []) {
    if (typeof ex.value === 'string') ex.value = scrubText(ex.value);
  }
  if (typeof event.message === 'string') event.message = scrubText(event.message);
  if (event.logentry?.message) event.logentry = { message: scrubText(event.logentry.message) };
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map(keepCrumb).filter((b): b is Breadcrumb => b !== null);
  }
  return event;
}

type State = 'idle' | 'reading' | 'on' | 'off';
let state: State = 'idle';
/** 끔(쓰는 중에 바꿀 수 있다) — beforeSend가 본다 */
let off = false;
let started = false;
const tags = new Map<string, string>();
/** 시작 전 report · crumb — 시작하면 차례대로, 끈 기기면 버린다 */
let pending: (() => void)[] = [];

function later(fn: () => void): void {
  if (!SENTRY_DSN) return;
  if (started) fn();
  else if (state !== 'off' && pending.length < MAX_PENDING) pending.push(fn);
}

function start(): void {
  if (started || !SENTRY_DSN) return;
  started = true;
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? (__DEV__ ? 'development' : 'production'),
    enabled: !__DEV__ && process.env.EXPO_PUBLIC_E2E !== '1',
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    // 성능 추적 없음(tracesSampleRate를 주지 않는다) — 자동 추적 기능도 끈다
    enableAutoPerformanceTracing: false,
    enableUserInteractionTracing: false,
    // 켤 때마다 가는 세션 기록(설치 번호 did가 실린다)은 보내지 않는다 — 오류가 났을 때만 보낸다
    enableAutoSessionTracking: false,
    maxBreadcrumbs: 50,
    beforeSend: (event) => scrubEvent(event, off),
    beforeBreadcrumb: (b) => keepCrumb(b),
  });
  for (const [k, v] of tags) Sentry.setTag(k, v);
  const queued = pending;
  pending = [];
  for (const fn of queued) fn();
}

export const crash = {
  init: () => {
    if (!SENTRY_DSN || state !== 'idle') return;
    state = 'reading';
    // 저장소 읽기는 몇 ms — 그동안 생긴 report · crumb · tag는 모아 두었다가 시작할 때 보낸다
    void readCrashOff().then((o) => {
      if (state !== 'reading') return; // 읽는 사이 setEnabled가 먼저 정했다
      off = o;
      state = o ? 'off' : 'on';
      if (o) pending = [];
      else start();
    });
  },
  wrap: <T>(root: T): T => {
    if (!SENTRY_DSN) return root;
    // 누른 곳의 이름표(labelName)는 읽지 않는다 — 접근성 이름에 적은 글이 들어 있다
    return Sentry.wrap(root as ComponentType<Record<string, unknown>>, { touchEventBoundaryProps: { labelName: undefined } }) as T;
  },
  report: (e: unknown, ctx?: Record<string, string>) => {
    later(() => {
      const { componentStack, ...rest } = ctx ?? {};
      const extra: Record<string, string> = {};
      for (const [k, v] of Object.entries(rest)) extra[k] = scrubText(String(v));
      Sentry.captureException(e, {
        contexts: {
          ...(componentStack ? { react: { componentStack } } : {}),
          ...(Object.keys(extra).length > 0 ? { where: extra } : {}),
        },
      });
    });
  },
  crumb: (category: string, message: string) => {
    later(() => Sentry.addBreadcrumb({ category, message, level: 'info' }));
  },
  tag: (key: string, value: string) => {
    tags.set(key, value);
    if (started) Sentry.setTag(key, value);
  },
  setEnabled: (on: boolean) => {
    off = !on;
    if (!SENTRY_DSN) return;
    if (on) {
      state = 'on';
      start();
    } else {
      if (state === 'reading') state = 'off';
      pending = [];
    }
  },
  qaNativeCrash: () => {
    // 미리보기 빌드에서만(EXPO_PUBLIC_APP_ENV는 빌드 때 박힌다) — 출시 빌드에서는 부르는 곳도 없고, 불러도 아무것도 하지 않는다
    if (process.env.EXPO_PUBLIC_APP_ENV !== 'preview' || !SENTRY_DSN || !started) return;
    Sentry.nativeCrash();
  },
} satisfies CrashApi;
