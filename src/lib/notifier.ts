// 알림 — 웹·Node(그리고 기본 파일): 알림이 없다. 모든 호출은 아무것도 하지 않는다.
// 기기 쪽은 notifier.native.ts(expo-notifications). 두 쪽은 같은 이름 notifier를 내보낸다.
import type { Notifier, NotifyStatus, PlannedReminder } from './contracts';

export const notifier = {
  supported: false,
  status: async (): Promise<NotifyStatus> => 'unsupported',
  request: async (): Promise<NotifyStatus> => 'unsupported',
  apply: async (_plan: PlannedReminder[]) => {},
  focusEnd: async (_at: number | null, _title?: string, _body?: string) => {},
  onOpen: (_cb: (url: string) => void) => () => {},
} satisfies Notifier;
