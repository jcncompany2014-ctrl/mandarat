// 집중 타이머 Live Activity — iOS(expo-widgets). 처음 띄울 때 createLiveActivity가 모습(FocusActivity.ios.tsx를 바꾼 글자)을
// App Group에 써 두고, 잠금 화면·다이내믹 아일랜드는 props만 받아 그린다.
// - start는 동기로 던진다(Live Activity 꺼 둠·iOS 16.2 미만·iPad에서 못 띄움) → 잡아서 false.
// - update·end는 Promise로 실패한다(이미 사라진 Activity면 LiveActivityNotFound) → 삼킨다.
// - 끝날 때 남겨 두는 시간(after)은 ActivityKit이 4시간 안에서만 받는다.
import { createLiveActivity, type LiveActivity, type LiveActivityFactory } from 'expo-widgets';
import { LIVE_KIND, type FocusActivityProps } from '../lib/contracts';
import { FocusLayout } from './FocusActivity.ios';
import type { FocusLive } from './focusLive';

/** ActivityKit이 끝난 Activity를 남겨 두는 최대 시간 */
const MAX_LINGER_MS = 4 * 60 * 60 * 1000;

let factory: LiveActivityFactory<FocusActivityProps> | null = null;
let current: LiveActivity<FocusActivityProps> | null = null;

function getFactory(): LiveActivityFactory<FocusActivityProps> | null {
  if (factory) return factory;
  try {
    factory = createLiveActivity<FocusActivityProps>(LIVE_KIND, FocusLayout);
  } catch (e) {
    console.warn('[live] createLiveActivity', e);
  }
  return factory;
}

/** 끝난 뒤에도 실패는 조용히 — 이미 사라진 Activity는 할 일이 없다 */
function quiet(p: Promise<void> | undefined) {
  if (p) p.catch(() => {});
}

function endAll() {
  const f = getFactory();
  if (!f) return;
  let all: LiveActivity<FocusActivityProps>[] = [];
  try {
    all = f.getInstances();
  } catch {
    return;
  }
  for (const a of all) {
    try {
      quiet(a.end('immediate'));
    } catch {
      // 무시
    }
  }
  current = null;
}

export const focusLive = {
  start: (props: FocusActivityProps) => {
    const f = getFactory();
    if (!f) return false;
    // 앱이 꺼지며 남은 것부터 치운다 — 한 번에 하나만
    endAll();
    try {
      current = f.start(props, props.url);
      return true;
    } catch {
      current = null;
      return false;
    }
  },
  update: (props: FocusActivityProps) => {
    if (!current) return;
    try {
      quiet(current.update(props));
    } catch {
      // 무시
    }
  },
  end: (props?: FocusActivityProps, dismissAfterMs?: number) => {
    const a = current;
    current = null;
    if (!a) return;
    const policy = typeof dismissAfterMs === 'number' && dismissAfterMs > 0
      ? { after: new Date(Date.now() + Math.min(dismissAfterMs, MAX_LINGER_MS)) }
      : ('immediate' as const);
    try {
      quiet(a.end(policy, props));
    } catch {
      // 무시
    }
  },
  endAll,
} satisfies FocusLive;
