// 웹 · 안드로이드의 맞추기 손잡이 — 메타가 없으니 모두 그대로 돌려주는 빈 것(iOS는 syncCommit.ios.ts).
// 합치기 · 도장 · 엔진 코드를 불러오지 않는다(R-8 #5) — 타입만 본다(import type · typeof import는 번들에 남지 않는다).
// 이름과 모양은 syncCommit.ios.ts와 같아야 한다(tests/syncCommit.test.js가 지킨다).
import type { MandaratDoc } from '../types';
import { migrate } from '../data/defaults';
import { rolloverToday } from './routine';
import type { SyncMeta } from './syncMeta';
import type { EngineDeps, SyncEngine } from './syncEngine';
import type { SyncPort, SyncPortHost } from './syncEnvelope';

export { docOnlyJson, serializeStored, EPOCH_PUSH_DEBOUNCE_MS, OFF_STATUS, PUSH_DEBOUNCE_MS } from './syncCommitBase';

/** 메타는 만들지 않는다 */
export const makeSyncMeta: (() => SyncMeta) | null = null;

/** 문서만 읽어 오늘로 정리한다(봉투의 _sync는 migrate가 버린다) — 메타는 늘 null */
export function openStored(
  raw: string,
  todayKey: string,
  _wall: number,
  _makeMeta: (() => SyncMeta) | null,
): { doc: MandaratDoc; meta: SyncMeta | null } {
  return { doc: rolloverToday(migrate(JSON.parse(raw)), todayKey), meta: null };
}

export const stampPending: typeof import('./syncEnvelope').stampPending = (_stamped, _latest, meta) => meta;

export const commitMeta: typeof import('./syncEnvelope').commitMeta = (_prev, _next, meta, stamped) => ({ meta, stamped });

export const undoResetMeta: typeof import('./syncEnvelope').undoResetMeta = () => null;

/** 손잡이가 없다 — 맞추기 엔진도 만들지 않는다 */
export function makeSyncPort(_host: SyncPortHost): SyncPort | null {
  return null;
}

export const createSyncEngine: ((deps: EngineDeps) => SyncEngine) | null = null;

export const probe: typeof import('./syncEngine').probe = async () => ({ available: false, files: 0 });
