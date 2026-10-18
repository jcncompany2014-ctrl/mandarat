// 알림 — iOS·Android(expo-notifications). 짠 알림(src/lib/reminders.ts)을 기기에 걸린 것과 비교해 차이만 걸고 지운다.
// 허락을 묻는 것은 request() 하나뿐이고, 사용자가 누를 때만 부른다(설정 화면). 손잡이(ReminderSync)는 status()만 읽는다.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Notifier, NotifyStatus, PlannedReminder } from './contracts';
import { msg } from '../i18n';
import { diffReminders, FOCUS_END_ID, REMINDER_CHANNEL, triggerFor, type ReminderTrigger } from './reminders';

// 앱을 보고 있을 때 온 알림은 배너 없이 알림 센터에만 — 소리·배지도 없다
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

let channel: Promise<unknown> | null = null;
/** 안드로이드 채널 — 허락을 묻기 전에 있어야 한다(안드로이드 13). 한 번만 만든다 */
function ensureChannel(): Promise<unknown> {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (!channel) {
    channel = Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
      name: msg().notify.channel,
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => {
      channel = null;
    });
  }
  return channel;
}

function toStatus(p: Notifications.NotificationPermissionsStatus): NotifyStatus {
  const ios = p.ios?.status;
  if (ios === Notifications.IosAuthorizationStatus.PROVISIONAL || ios === Notifications.IosAuthorizationStatus.EPHEMERAL) return 'granted';
  if (p.granted || p.status === 'granted') return 'granted';
  if (p.status === 'denied') return 'denied';
  return 'undetermined';
}

async function status(): Promise<NotifyStatus> {
  try {
    await ensureChannel();
    return toStatus(await Notifications.getPermissionsAsync());
  } catch {
    return 'undetermined';
  }
}

async function request(): Promise<NotifyStatus> {
  try {
    await ensureChannel();
    return toStatus(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }));
  } catch {
    return status();
  }
}

function nativeTrigger(t: ReminderTrigger): Notifications.SchedulableNotificationTriggerInput {
  return t.type === 'calendar'
    ? { ...t, type: Notifications.SchedulableTriggerInputTypes.CALENDAR }
    : { ...t, type: Notifications.SchedulableTriggerInputTypes.DATE };
}

// 걸기·지우기는 한 번에 하나씩 — 앞의 apply가 끝난 뒤에 다음 것을 비교한다
let queue: Promise<void> = Promise.resolve();

async function applyNow(plan: PlannedReminder[]): Promise<void> {
  if ((await status()) !== 'granted') return;
  const existing = (await Notifications.getAllScheduledNotificationsAsync()).map((r) => {
    const sig = r.content.data?.sig;
    return { id: r.identifier, sig: typeof sig === 'string' ? sig : undefined };
  });
  const { cancel, schedule } = diffReminders(existing, plan);
  for (const id of cancel) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  }
  for (const p of schedule) {
    await Notifications.scheduleNotificationAsync({
      identifier: p.id,
      content: { title: p.title, body: p.body, data: { url: p.url, sig: p.sig }, sound: 'default' },
      trigger: nativeTrigger(triggerFor(p, Platform.OS)),
    }).catch(() => {});
  }
}

function apply(plan: PlannedReminder[]): Promise<void> {
  queue = queue.then(() => applyNow(plan)).catch(() => {});
  return queue;
}

/** 집중 끝 알림 — at이 있으면 그때 울리게 걸고, null이면 지운다. 허락을 묻지 않는다(없으면 걸지 않는다) */
async function focusEnd(at: number | null, title?: string, body?: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(FOCUS_END_ID).catch(() => {});
    if (at === null || at <= Date.now()) return;
    if ((await status()) !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      identifier: FOCUS_END_ID,
      content: { title: title ?? '', body: body ?? '', data: { url: 'mandarat://focus' }, sound: 'default' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
        ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL } : {}),
      },
    });
  } catch {
    // 알림이 없어도 타이머 화면은 그대로 끝을 알린다
  }
}

// 이미 넘긴 누름 — 앱을 켜게 한 알림이 리스너로 한 번 더 올 수 있다(id + 울린 시각)
const seen = new Set<string>();

function urlOf(r: Notifications.NotificationResponse | null): { key: string; url: string } | null {
  if (!r) return null;
  const req = r.notification.request;
  const url = req.content.data?.url;
  if (typeof url !== 'string' || !url.startsWith('mandarat://')) return null;
  return { key: `${req.identifier}@${r.notification.date}`, url };
}

/** 알림을 눌러 앱이 열릴 때 — 꺼져 있다 켜진 때(마지막 누름)와 켜져 있던 때(리스너) 둘 다, 한 번씩만 */
function onOpen(cb: (url: string) => void): () => void {
  const pass = (r: Notifications.NotificationResponse | null) => {
    const hit = urlOf(r);
    if (!hit || seen.has(hit.key)) return;
    seen.add(hit.key);
    cb(hit.url);
  };
  try {
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      Notifications.clearLastNotificationResponse();
      pass(last);
    }
  } catch {
    // 마지막 누름을 읽지 못해도 리스너는 건다
  }
  const sub = Notifications.addNotificationResponseReceivedListener(pass);
  return () => sub.remove();
}

export const notifier = {
  supported: true,
  status,
  request,
  apply,
  focusEnd,
  onOpen,
} satisfies Notifier;
