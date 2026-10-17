// 위젯 다리 — iOS. V1-C가 expo-widgets(createWidget('TodayWidget', …) · updateTimeline · getTimeline)로 채운다.
// Wave 0에서는 아무것도 하지 않는다.
import type { WidgetOp } from '../lib/contracts';
import type { WidgetBridge, WidgetEntry } from './bridge';

export const widgetBridge = {
  writeTimeline: (_entries: WidgetEntry[]) => {},
  readOps: async (): Promise<WidgetOp[]> => [],
} satisfies WidgetBridge;
