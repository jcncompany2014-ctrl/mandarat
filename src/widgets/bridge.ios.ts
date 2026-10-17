// 위젯 다리 — iOS(expo-widgets). 모듈을 처음 불러올 때 createWidget이 위젯 모습(TodayWidget.ios.tsx를 바꾼 글자)을
// App Group('__expo_widgets_TodayWidget_layout')에 써 둔다. 그래서 앱을 한 번 연 뒤에야 위젯이 그려진다(그 전엔 빨간 상자).
// 타임라인은 '__expo_widgets_TodayWidget_timeline'에 통째로 들어간다 — updateTimeline은 배열 전체를 바꾸고,
// 위젯 버튼(expo-widgets AppIntent)과 Siri(V3-B)는 같은 배열의 props.ops에 체크를 덧붙인다.
// 그러니 쓰기 전에 늘 readOps()로 먼저 거둬 들인다(그 순서는 WidgetSync, V2-C가 지킨다).
import { createWidget } from 'expo-widgets';
import { WIDGET_KIND, type TodayWidgetProps, type WidgetOp } from '../lib/contracts';
import type { WidgetBridge, WidgetEntry } from './bridge';
import { TodayLayout } from './TodayWidget.ios';

export const todayWidget = createWidget<TodayWidgetProps>(WIDGET_KIND, TodayLayout);

export const widgetBridge = {
  writeTimeline: (entries: WidgetEntry[]) => {
    try {
      todayWidget.updateTimeline(entries.map((e) => ({ date: e.date, props: e.props })));
    } catch (e) {
      console.warn('[widget] updateTimeline', e);
    }
  },
  readOps: async (): Promise<WidgetOp[] | null> => {
    try {
      const timeline = await todayWidget.getTimeline();
      const out: WidgetOp[] = [];
      for (const entry of timeline) {
        const ops = (entry.props as Partial<TodayWidgetProps> | undefined)?.ops;
        if (Array.isArray(ops)) for (const op of ops) if (op && typeof op.k === 'string' && typeof op.at === 'number') out.push(op);
      }
      return out;
    } catch (e) {
      // 빈 배열이 아니라 null — 읽지 못한 ops를 쓰기로 덮어 지우지 않게(WidgetSync는 이번 차례를 건너뛴다)
      console.warn('[widget] getTimeline', e);
      return null;
    }
  },
} satisfies WidgetBridge;
