// 집중 타이머 Live Activity — iOS. V2-B가 expo-widgets createLiveActivity('FocusActivity', …)로 채운다.
// Wave 0에서는 아무것도 하지 않는다.
import type { FocusActivityProps } from '../lib/contracts';
import type { FocusLive } from './focusLive';

export const focusLive = {
  start: (_props: FocusActivityProps) => {},
  update: (_props: FocusActivityProps) => {},
  end: (_props?: FocusActivityProps) => {},
  endAll: () => {},
} satisfies FocusLive;
