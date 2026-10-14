/**
 * 겹치지 않는 시트(오버레이 대기열) — React 없이 도는 순수한 부분.
 *
 * iOS는 모든 Modal을 루트 화면에서 띄우는데, 다른 모달이 올라오거나 내려가는 중이면 새 모달을 아무 말 없이 버린다.
 * 그래서 시트·타이머·편집 창·마무리 페이지는 모두 이 대기열을 거쳐 한 번에 하나씩 뜬다.
 * - 열린 것이 있으면 기다리고, 모두 닫히면 닫힌 때로부터 gap(ms)이 지난 뒤에 하나를 부른다.
 *   지금 열린 것이 없어도 방금 닫혔다면 gap을 채운다(타이머를 닫자마자 마무리 페이지를 띄우는 경우).
 * - 한 번에 하나만 부른다. 그것이 무언가를 열었으면 나머지는 그것이 닫힐 때까지, 아니면(화면 이동 등) 다음 차례에.
 *
 * 쓰는 쪽(UIProvider)은 열림 상태가 바뀔 때마다 sync(open)을 부르고, requestPass가 오면 다음 렌더 뒤에 다시 sync를 부른다.
 */

/** 시트·모달이 모두 닫힌 뒤 다음 것을 띄우기까지 기다리는 시간(ms) */
export const OVERLAY_GAP = 380;

type Timer = unknown;

export interface OverlayQueueOptions {
  gap?: number;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => Timer;
  clearTimer?: (t: Timer) => void;
  /** 한 차례가 끝났다(무언가를 불렀거나 새로 쌓였다) — 화면에 반영된 뒤의 열림 상태로 sync를 다시 불러 달라 */
  requestPass: () => void;
  onError?: (e: unknown) => void;
}

export interface OverlayQueue {
  /** fn을 대기열 끝에 넣는다 */
  push: (fn: () => void) => void;
  /** 지금 무언가 열려 있는지 알린다 — 열림 상태가 바뀔 때와 requestPass를 받은 뒤에 */
  sync: (open: boolean) => void;
  size: () => number;
  /** 기다리는 타이머를 걷는다(대기열은 그대로) */
  dispose: () => void;
}

export function createOverlayQueue(opts: OverlayQueueOptions): OverlayQueue {
  const gap = opts.gap ?? OVERLAY_GAP;
  const now = opts.now ?? Date.now;
  const setTimer = opts.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearTimer = opts.clearTimer ?? ((t: Timer) => clearTimeout(t as ReturnType<typeof setTimeout>));
  const onError = opts.onError ?? ((e: unknown) => console.warn('afterOverlays', e));

  const queue: (() => void)[] = [];
  let timer: Timer | null = null;
  let wasOpen = false;
  let closedAt = -Infinity;

  const cancel = () => {
    if (timer != null) clearTimer(timer);
    timer = null;
  };

  const sync = (open: boolean) => {
    cancel();
    if (open) {
      wasOpen = true;
      return;
    }
    if (wasOpen) {
      wasOpen = false;
      closedAt = now();
    }
    if (queue.length === 0) return;
    const wait = Math.max(0, gap - (now() - closedAt));
    timer = setTimer(() => {
      timer = null;
      const fn = queue.shift();
      try {
        fn?.();
      } catch (e) {
        onError(e);
      }
      // 부른 것이 무언가를 열었는지는 다음 렌더 뒤에야 안다 — 남은 것이 있으면 그때 sync가 다시 불린다
      if (queue.length) opts.requestPass();
    }, wait);
  };

  return {
    push: (fn) => {
      queue.push(fn);
      opts.requestPass();
    },
    sync,
    size: () => queue.length,
    dispose: cancel,
  };
}
