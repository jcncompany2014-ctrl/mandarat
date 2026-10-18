// 웹 · iOS가 함께 쓰는 맞추기 바깥 조각 — 저장 봉투의 JSON, 올리기 시간, 꺼진 상태.
// 맞추기 코드(합치기 · 도장 · 엔진)를 불러오지 않는다: 웹 번들에는 이 파일과 syncCommit.ts(빈 손잡이)만 들어간다(R-8 #5).
// iOS의 진짜 손잡이는 syncCommit.ios.ts가 syncEnvelope · syncEngine에서 다시 내보낸다.
import type { MandaratDoc } from '../types';
import type { SyncMeta } from './syncMeta';
import type { SyncStatus } from './syncEngine';

/** 봉투에서 메타를 담는 필드 — MandaratDoc에는 없다(migrate가 버리므로 이전 앱은 문서만 읽는다) */
export const SYNC_FIELD = '_sync';

/** 문서(와 메타)를 저장할 값으로 — 메타가 없으면(웹·안드로이드) 문서 그대로 */
export function serializeStored(doc: MandaratDoc, meta: SyncMeta | null): string {
  return JSON.stringify(meta ? { ...doc, [SYNC_FIELD]: meta } : doc);
}

/** 하루 한 번 남기는 저장본의 값 — 지난 표와 메타 없이(되살릴 때 지금 지난 표를 다시 붙인다) */
export function docOnlyJson(doc: MandaratDoc): string {
  return JSON.stringify({ ...doc, archives: undefined, [SYNC_FIELD]: undefined });
}

/** 이 기기에서 고친 뒤 올리기까지 몰아 두는 시간 */
export const PUSH_DEBOUNCE_MS = 5000;
/**
 * 새 판(처음부터 다시)을 올리기까지 기다리는 시간 — 되돌리기 토스트(8초, src/overlays/Snackbar.tsx toastLife)가
 * 닫힌 뒤에. 그 안에 되돌리면 올리지 않은 판을 거둔다(undoResetMeta, R-1 F2)
 */
export const EPOCH_PUSH_DEBOUNCE_MS = 10_000;

export const OFF_STATUS: SyncStatus = { phase: 'off', enabled: false };
