// 이 기기에서 오류 기록을 보낼지 — 기기마다(AsyncStorage 'mandarat:crash:v1' = { off: true }). 문서·백업·iCloud에는 들어가지 않는다.
// 기본은 보낸다(값이 없거나 읽지 못하면 켜짐). 설정 › 정보의 CrashRow와 crash.native.ts가 같은 값을 본다.
// 작은 바깥 저장소(useSyncExternalStore) — notifyPrefs와 같은 꼴.
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORE_KEYS } from './contracts';

/** 저장한 글 → 꺼 두었는가. 모르는 꼴이면 켜짐(false) */
export function parseCrashPrefs(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const v = JSON.parse(raw) as unknown;
    return typeof v === 'object' && v !== null && (v as { off?: unknown }).off === true;
  } catch {
    return false;
  }
}

export function serializeCrashPrefs(off: boolean): string {
  return JSON.stringify({ off });
}

/** null = 아직 읽지 않았다 */
let current: boolean | null = null;
let loading: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

function set(off: boolean): void {
  if (current === off) return;
  current = off;
  for (const cb of [...listeners]) cb();
}

/** 꺼 두었는가 — 없거나 읽지 못하면 false. 처음 한 번만 저장소를 읽는다 */
export function readCrashOff(): Promise<boolean> {
  if (current !== null) return Promise.resolve(current);
  if (!loading) {
    loading = AsyncStorage.getItem(STORE_KEYS.crash)
      .then(parseCrashPrefs, () => false)
      .then((off) => {
        // 읽는 사이에 writeCrashOff가 먼저 값을 정했으면 그것을 따른다
        if (current === null) set(off);
        return current ?? off;
      });
  }
  return loading;
}

export async function writeCrashOff(off: boolean): Promise<void> {
  set(off);
  try {
    await AsyncStorage.setItem(STORE_KEYS.crash, serializeCrashPrefs(off));
  } catch {
    // 저장하지 못해도 이번 실행에서는 고른 대로 동작한다
  }
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (current === null) void readCrashOff();
  return () => {
    listeners.delete(cb);
  };
}

const snapshot = () => current;

/** 오류 기록을 꺼 두었는가 — 저장소를 읽기 전에는 null(화면은 켜진 것으로 그린다) */
export function useCrashOff(): boolean | null {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
