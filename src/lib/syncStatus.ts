// iCloud 맞추기 상태 — 화면(설정 › iCloud · 고르기 시트 · 온보딩, V5-E)이 읽고 부르는 바깥 저장소.
// 엔진(syncEngine.ts)은 기기 손잡이(src/hosts/ICloudSync.tsx)가 iOS에서만 만들어 여기에 묶는다(bindSyncDriver).
// 묶인 엔진이 없으면(웹 · 안드로이드 · Expo Go · 저장본을 읽기 전) 상태는 늘 'off'이고 부르기는 아무것도 하지 않는다.
import { useSyncExternalStore } from 'react';
import { icloud } from '../../modules/icloud-sync';
import { OFF_STATUS, probe, type RemoteProbe, type SyncChoice, type SyncStatus } from './syncEngine';

export type { RemoteProbe, SyncChoice, SyncPhase, SyncProblem, SyncStatus } from './syncEngine';

/** 화면이 엔진에 부탁하는 것 — 엔진(SyncEngine)이 그대로 맞는다 */
export interface SyncDriver {
  sync(): Promise<void>;
  setEnabled(on: boolean, choice?: SyncChoice): Promise<void>;
  choose(choice: SyncChoice | null): Promise<void>;
  watching(): boolean;
  ownName(): string | null;
}

let current: SyncStatus = OFF_STATUS;
const listeners = new Set<() => void>();
let driver: SyncDriver | null = null;

export function getSyncStatus(): SyncStatus {
  return current;
}

export function subscribeSyncStatus(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** 엔진이 상태를 알린다 */
export function publishSyncStatus(s: SyncStatus): void {
  if (s === current) return;
  current = s;
  for (const cb of [...listeners]) cb();
}

/** 지금 맞추기 상태 — 바뀔 때만 다시 그린다 */
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribeSyncStatus, getSyncStatus, getSyncStatus);
}

/** 기기 손잡이가 엔진을 묶는다 — 돌려받은 함수로 푼다(풀면 상태는 'off') */
export function bindSyncDriver(d: SyncDriver): () => void {
  driver = d;
  return () => {
    if (driver !== d) return;
    driver = null;
    publishSyncStatus(OFF_STATUS);
  };
}

/** '지금 맞추기' — 켜져 있을 때만 받고 올린다 */
export function requestSync(): Promise<void> {
  return driver ? driver.sync() : Promise.resolve();
}

/**
 * 켜기 · 끄기. 켜면 엔진이 iCloud를 살펴 다른 기기 기록이 있으면 묻는다(phase 'needsChoice').
 * choice를 주면 묻지 않는다 — 온보딩의 '가져오기'는 'adopt'. 고르기 전에는 늘 오늘 저장본을 남긴다.
 */
export function setSyncEnabled(on: boolean, choice?: SyncChoice): Promise<void> {
  return driver ? driver.setEnabled(on, choice) : Promise.resolve();
}

/** 고르기 시트의 답 — null은 '켜지 않기' */
export function setChoice(choice: SyncChoice | null): Promise<void> {
  return driver ? driver.choose(choice) : Promise.resolve();
}

/**
 * 맞추기를 켜지 않고 iCloud에 다른 기기 기록이 있는지 본다(온보딩, V5-E) — 질의를 시작해 첫 모으기를 기다린다.
 * 질의의 목록(list)은 모으기 전에 비어 있어 쓰지 않는다. 기기 모듈이 없으면 { available: false, files: 0 }.
 */
export function probeRemote(): Promise<RemoteProbe> {
  if (!icloud) return Promise.resolve({ available: false, files: 0 });
  return probe(icloud, { running: () => !!driver?.watching(), own: driver?.ownName() ?? null });
}
