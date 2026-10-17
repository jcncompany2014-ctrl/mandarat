// 위젯 다리 — 웹·Android·Node(기본 파일): 위젯이 없다. 기기 쪽은 bridge.ios.ts(V1-C가 expo-widgets로 채운다).
// expo-widgets·@expo/ui는 이 파일에서 불러오지 않는다(웹 번들·Android 자동 연결에서 빠진다).
import type { TodayWidgetProps, WidgetOp } from '../lib/contracts';

/** 위젯 타임라인 한 칸 — 그 시각부터 보일 모습(expo-widgets WidgetTimelineEntry와 같은 꼴) */
export interface WidgetEntry { date: Date; props: TodayWidgetProps }

export interface WidgetBridge {
  /** 타임라인을 통째로 바꾼다(지금 + 다음 자정 7번) */
  writeTimeline(entries: WidgetEntry[]): void;
  /** 위젯·Siri가 남긴 체크(ops)를 읽는다 — 앱이 앞으로 나올 때 */
  readOps(): Promise<WidgetOp[]>;
}

export const widgetBridge = {
  writeTimeline: (_entries: WidgetEntry[]) => {},
  readOps: async (): Promise<WidgetOp[]> => [],
} satisfies WidgetBridge;
