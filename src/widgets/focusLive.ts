// 집중 타이머 Live Activity — 웹·Android·Node(기본 파일): 없다. 기기 쪽은 focusLive.ios.ts(V2-B).
import type { FocusActivityProps } from '../lib/contracts';

export interface FocusLive {
  start(props: FocusActivityProps): void;
  update(props: FocusActivityProps): void;
  end(props?: FocusActivityProps): void;
  /** 남아 있는 집중 Live Activity를 모두 끝낸다(앱을 다시 열었을 때) */
  endAll(): void;
}

export const focusLive = {
  start: (_props: FocusActivityProps) => {},
  update: (_props: FocusActivityProps) => {},
  end: (_props?: FocusActivityProps) => {},
  endAll: () => {},
} satisfies FocusLive;
