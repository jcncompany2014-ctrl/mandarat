// 알림 — iOS·Android. V1-A가 expo-notifications로 채운다(하루씩 앞날 14일, 60개까지, 차이만 적용).
// Wave 0에서는 아직 아무것도 하지 않는다(supported:false) — 화면은 지원하지 않는 기기처럼 보인다.
import type { Notifier, NotifyStatus, PlannedReminder } from './contracts';

export const notifier = {
  supported: false,
  status: async (): Promise<NotifyStatus> => 'unsupported',
  request: async (): Promise<NotifyStatus> => 'unsupported',
  apply: async (_plan: PlannedReminder[]) => {},
  focusEnd: async (_at: number | null, _title?: string, _body?: string) => {},
  onOpen: (_cb: (url: string) => void) => () => {},
} satisfies Notifier;
