// v2 공통 약속 — 여러 꾸러미(알림·위젯·Live Activity·인쇄·연도·프로·iCloud·오류 수집)가 함께 쓰는 키와 모양.
// Wave 0이 정하고 리드만 고친다(docs/v2/plan.md §2.7). app.json·expo-widgets와 맞는지는 tests/contracts.test.js가 지킨다.

export const STORE_KEYS = { lang: 'mandarat:lang:v1', pro: 'mandarat:pro:v1', notify: 'mandarat:notify:v1', crash: 'mandarat:crash:v1', print: 'mandarat:print:v1' } as const;
export const LINK_SCHEME = 'mandarat';
export const APP_GROUP = 'group.com.jcncompany.mandarat';
export const ICLOUD_CONTAINER = 'iCloud.com.jcncompany.mandarat';
export const PRO_PRODUCT_ID = 'com.jcncompany.mandarat.pro';
export const PRO_FEATURES = ['paper', 'widgetStyle', 'printSize', 'archive'] as const;
export type ProFeature = (typeof PRO_FEATURES)[number];

// print
export const PRINT_PAPERS = ['A4', 'Letter', 'A3', 'A5', 'B5'] as const; // B5 = JIS B5 (182×257 mm)
export type PrintPaper = (typeof PRINT_PAPERS)[number];
export const FREE_PAPERS: readonly PrintPaper[] = ['A4', 'Letter'];
export type PrintLayout = 'chart' | 'areas'; // areas = cover + 8 area pages (pro)
export interface PrintOptions { paper: PrintPaper; layout: PrintLayout; blank: boolean }
export interface PrintTarget { archiveId?: string }

// year
export type YearView = { kind: 'review'; id: string | null } | { kind: 'shelf' } | { kind: 'sheet'; id: string };

// widgets + Live Activity — props are plist/JSON-safe: no null, no undefined values, no Date (ms numbers only), colours '#RRGGBB(AA)'
export const WIDGET_KIND = 'TodayWidget';
export const LIVE_KIND = 'FocusActivity';
export const WIDGET_TIMELINE_KEY = '__expo_widgets_TodayWidget_timeline'; // read by native/ios Swift intents
export interface WidgetItem { k: string /* 'ti-ai' | 'x:<extraId>' */; t: string; d: boolean; c: string /* area hex */ }
export interface WidgetOp { kind: 'check' | 'focus' | 'open'; k: string; on: boolean; day: string; at: number; t: string; src: 'widget' | 'siri' }
export interface WidgetPalette { paper: string; ink: string; sub: string; line: string; accent: string }
export type WidgetPattern = 'dots' | 'grid' | 'lines' | 'blank';
export interface TodayWidgetLines {
  left: string /* '오늘 {n}개 남았어요' */; allDone: string; empty: string; more: string /* '그 밖에 {n}개' */;
  leftShort: string /* '남음' */; doneShort: string /* '끝' */; today: string /* '오늘' */;
  next: string /* '다음 할 일: {t}' */; checked: string /* '{t} — 했어요' */;
}
export interface TodayWidgetProps {
  v: 1; day: string; date: string; done: number; total: number;
  items: WidgetItem[]; more: number; areas: number[]; colors: string[]; goal: string;
  lines: TodayWidgetLines; pal: { light: WidgetPalette; dark: WidgetPalette }; pat: WidgetPattern;
  ops: WidgetOp[]; url: string;
}
export interface FocusActivityLines { left: string; paused: string; done: string; focus: string }
export interface FocusActivityProps {
  v: 1; t: string; area: string; c: string; start: number; end: number;
  paused: number /* -1 = running, else ms left */; done: boolean;
  lines: FocusActivityLines; pal: { light: WidgetPalette; dark: WidgetPalette }; url: string;
}

// notifications
export type NotifyStatus = 'granted' | 'denied' | 'undetermined' | 'unsupported';
export type ReminderKind = 'am' | 'pm' | 'habit' | 'review';
export interface PlannedReminder {
  id: string; kind: ReminderKind; fireAt: number;
  at: { y: number; m: number /* 1-based */; d: number; hh: number; mm: number };
  title: string; body: string; url: string; sig: string;
}
export interface Notifier {
  supported: boolean;
  status(): Promise<NotifyStatus>;
  request(): Promise<NotifyStatus>;
  apply(plan: PlannedReminder[]): Promise<void>;
  focusEnd(at: number | null, title?: string, body?: string): Promise<void>;
  onOpen(cb: (url: string) => void): () => void;
}

// crash
export interface CrashApi {
  init(): void; wrap<T>(root: T): T; report(e: unknown, ctx?: Record<string, string>): void;
  crumb(category: string, message: string): void; tag(key: string, value: string): void; setEnabled(on: boolean): void;
}
