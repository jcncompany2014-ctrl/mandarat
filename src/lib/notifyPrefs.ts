// 이 기기에서 알림을 받을지 — 기기마다(AsyncStorage 'mandarat:notify:v1'). 문서·백업·iCloud에는 들어가지 않는다.
// 알림 시각은 문서(settings.reminders · 습관 remindAt)에 있고 기기끼리 맞춰지지만, 울릴지는 기기마다 따로 정한다.
// 작은 바깥 저장소(useSyncExternalStore) — 설정 화면(V2-A)과 ReminderSync가 같은 값을 본다.
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORE_KEYS } from './contracts';

const ON = 'on';
const OFF = 'off';

/** null = 아직 읽지 않았다 */
let current: boolean | null = null;
let loading: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

function set(on: boolean): void {
  if (current === on) return;
  current = on;
  for (const cb of [...listeners]) cb();
}

/** 저장된 값 — 없거나 읽지 못하면 false. 처음 한 번만 저장소를 읽는다 */
export function readNotifyDevice(): Promise<boolean> {
  if (current !== null) return Promise.resolve(current);
  if (!loading) {
    loading = AsyncStorage.getItem(STORE_KEYS.notify)
      .then((v) => v === ON, () => false)
      .then((on) => {
        // 읽는 사이에 writeNotifyDevice가 먼저 값을 정했으면 그것을 따른다
        if (current === null) set(on);
        return current ?? on;
      });
  }
  return loading;
}

export async function writeNotifyDevice(on: boolean): Promise<void> {
  set(on);
  try {
    await AsyncStorage.setItem(STORE_KEYS.notify, on ? ON : OFF);
  } catch {
    // 저장하지 못해도 이번 실행에서는 고른 대로 동작한다
  }
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (current === null) void readNotifyDevice();
  return () => {
    listeners.delete(cb);
  };
}

const snapshot = () => current;

/** 이 기기에서 알림을 받는가 — 저장소를 읽기 전에는 null(화면은 꺼진 것으로 그린다) */
export function useNotifyDevice(): boolean | null {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
