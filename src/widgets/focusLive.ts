// 집중 타이머 Live Activity — 웹·Android·Node(기본 파일): 없다. 기기 쪽은 focusLive.ios.ts(V2-B).
import type { FocusActivityProps } from '../lib/contracts';

/**
 * 한 번에 하나뿐인 집중 Live Activity를 다룬다(지금 것은 모듈 안에 둔다).
 * 어떤 호출도 던지지 않는다 — Live Activity는 덤이고, 타이머와 알림은 그것 없이도 간다.
 */
export interface FocusLive {
  /** 띄운다 — 띄웠으면 true, 기기가 못 띄우면(꺼 둠·iPad·iOS 16.1 이하) false */
  start(props: FocusActivityProps): boolean;
  /** 지금 것의 모습을 바꾼다(멈춤·계속) */
  update(props: FocusActivityProps): void;
  /** 지금 것을 끝낸다 — dismissAfterMs가 있으면 그만큼(최대 4시간) 잠금 화면에 남기고, 없으면 바로 지운다 */
  end(props?: FocusActivityProps, dismissAfterMs?: number): void;
  /** 남아 있는 집중 Live Activity를 모두 끝낸다(앱이 꺼진 뒤 다시 열었을 때) */
  endAll(): void;
}

export const focusLive = {
  start: (_props: FocusActivityProps) => false,
  update: (_props: FocusActivityProps) => {},
  end: (_props?: FocusActivityProps, _dismissAfterMs?: number) => {},
  endAll: () => {},
} satisfies FocusLive;
