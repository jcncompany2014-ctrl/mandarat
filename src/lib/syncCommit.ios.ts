// iOS의 맞추기 손잡이 — 저장소(MandaratContext) · 기기 손잡이(ICloudSync) · 맞추기 상태(syncStatus)는 './syncCommit'으로만 닿는다.
// Metro가 iOS에서는 이 파일을, 웹 · 안드로이드에서는 syncCommit.ts(빈 손잡이)를 고른다 — 웹 번들에 합치기 · 도장이 들어가지 않게(R-8 #5).
// 이름과 모양은 syncCommit.ts와 같아야 한다(tests/syncCommit.test.js가 지킨다).
import { newSyncMeta, type SyncMeta } from './syncMeta';

export { docOnlyJson, serializeStored, EPOCH_PUSH_DEBOUNCE_MS, OFF_STATUS, PUSH_DEBOUNCE_MS } from './syncCommitBase';
export { commitMeta, makeSyncPort, openStored, stampPending, undoResetMeta } from './syncEnvelope';
export { createSyncEngine, probe } from './syncEngine';

/** 새 메타(동기화는 꺼진 채) — 저장본에 메타가 없거나 깨졌을 때 */
export const makeSyncMeta: (() => SyncMeta) | null = () => newSyncMeta(Math.random);
