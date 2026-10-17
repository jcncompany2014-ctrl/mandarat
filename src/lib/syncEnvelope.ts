// iCloud 저장 봉투와 저장소 쪽 맞추기 손잡이(sync port) — 순수 함수와 작은 공장 하나.
// 저장소(src/store/MandaratContext.tsx)는 iOS에서 'mandarat:doc:v1'에 { ...doc, _sync } 봉투를 쓰고,
// 맞추기 엔진(V4-A)은 여기서 만든 SyncPort로만 저장소에 닿는다. 규칙과 이유는 docs/v2/V3-E.md.
//
// 가장 중요한 규칙: 이 기기에서 고친 것을 잃지 않는다.
// - applyRemote는 그 순간의 문서와 메타를 읽어 그 자리에서(기다리지 않고) 합친다 — 받는 동안(최대 10초) 쓴 글이 남는다.
// - 저장은 늘 같은 순간의 문서와 메타를 짝으로 쓴다(앞선 도장이 옛 값에 붙지 않게).
// - 판이 더 높은 복제본(다른 기기의 초기화·'이 기기 기록으로')을 합치기 전에 오늘 저장본을 남긴다.
import type { MandaratDoc } from '../types';
import { migrate } from '../data/defaults';
import { rolloverToday } from './routine';
import { cleanSyncMeta, type SyncMeta } from './syncMeta';
import { changedPaths, epochReset, stampLocal } from './syncLocal';
import { adoptMerged, isNewer, materialize, mergeAll, replicaOf, topStamp, type NewerReplica, type Replica } from './syncMerge';
import { observe } from './syncStamp';

/** 봉투에서 메타를 담는 필드 — MandaratDoc에는 없다(migrate가 버리므로 이전 앱은 문서만 읽는다) */
export const SYNC_FIELD = '_sync';

/** 저장된 값 → 문서와 메타. 메타가 없거나 깨졌으면 null. JSON이 아니면 던진다(부르는 쪽이 깨진 저장본으로 다룬다) */
export function parseStored(raw: string): { doc: MandaratDoc; meta: SyncMeta | null } {
  const parsed: unknown = JSON.parse(raw);
  const env = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  const meta = env && Object.prototype.hasOwnProperty.call(env, SYNC_FIELD) ? cleanSyncMeta(env[SYNC_FIELD]) : null;
  return { doc: migrate(parsed), meta };
}

/** 문서(와 메타)를 저장할 값으로 — 메타가 없으면(웹·안드로이드) 문서 그대로 */
export function serializeStored(doc: MandaratDoc, meta: SyncMeta | null): string {
  return JSON.stringify(meta ? { ...doc, [SYNC_FIELD]: meta } : doc);
}

/** 하루 한 번 남기는 저장본의 값 — 지난 표와 메타 없이(되살릴 때 지금 지난 표를 다시 붙인다) */
export function docOnlyJson(doc: MandaratDoc): string {
  return JSON.stringify({ ...doc, archives: undefined, [SYNC_FIELD]: undefined });
}

/** 저장소의 한 번 바꾸기가 메타를 어떻게 바꾸는가 — 보통은 도장, 초기화는 새 판, 받은 것을 넣을 때는 그대로 */
export type CommitHow = 'stamp' | 'epoch' | 'none';

/**
 * 저장소 commit의 메타 몫 — 메타가 있을 때만. prev → next로 바꾸면:
 * - 'stamp': 바뀐 경로에 이 기기 도장(stampLocal)
 * - 'epoch': 새 판을 올리고 next(남기는 문서)의 모든 경로를 새 판 위에 찍는다(epochReset — 다시 stampLocal하지 않는다)
 * - 'none': 그대로(applyRemote가 이미 메타를 맞췄다)
 */
export function stampCommit(prev: MandaratDoc, next: MandaratDoc, meta: SyncMeta | null, how: CommitHow, wall: number): SyncMeta | null {
  if (!meta || next === prev || how === 'none') return meta;
  return how === 'epoch' ? epochReset(meta, wall, next) : stampLocal(prev, next, meta, wall);
}

/**
 * 앱을 열 때 — 저장된 값을 읽어 오늘로 정리한다. 정리(rolloverToday)로 바뀐 것에만 도장을 찍는다.
 * makeMeta가 null이면(웹·안드로이드) 메타 없이. 메타가 없거나 깨졌으면 makeMeta()로 새로(동기화는 꺼진 채 —
 * 다시 켜면 엔진이 고르기를 묻고, 고르기 전에 저장본을 남긴다).
 */
export function openStored(
  raw: string,
  todayKey: string,
  wall: number,
  makeMeta: (() => SyncMeta) | null,
): { doc: MandaratDoc; meta: SyncMeta | null } {
  const { doc, meta: stored } = parseStored(raw);
  const meta = makeMeta ? stored ?? makeMeta() : null;
  const rolled = rolloverToday(doc, todayKey);
  return { doc: rolled, meta: stampCommit(doc, rolled, meta, 'stamp', wall) };
}

/**
 * 다른 기기의 복제본을 지금 이 기기의 문서·메타와 합친다(순수). 받은 복제본이 더 새 앱의 것이면 아무것도 바꾸지 않는다.
 * 합친 뒤 materialize(M1–M2)와 이 기기 날짜로 하루 정리(M3)를 하고, 그 둘로 바뀐 것에만 이 기기 도장을 찍는다
 * (정리로 뺀 오늘 담은 칸에 지운 표시가 없으면 다른 기기가 다음에 되살린다). 시계는 받은 가장 큰 도장 뒤로 당긴다.
 * changed: 문서가 바뀌었는가 — 아니면 doc은 localDoc 그대로(같은 객체).
 */
export function joinRemote(
  localDoc: MandaratDoc,
  localMeta: SyncMeta,
  remote: Replica | NewerReplica,
  todayKey: string,
  wall: number,
): { doc: MandaratDoc; meta: SyncMeta; changed: boolean } {
  if (isNewer(remote)) return { doc: localDoc, meta: localMeta, changed: false };
  const m = mergeAll(replicaOf(localDoc, localMeta), [remote]);
  if (isNewer(m)) return { doc: localDoc, meta: localMeta, changed: false };
  const next = rolloverToday(materialize(m.doc), todayKey);
  const meta = observe(stampLocal(m.doc, next, adoptMerged(localMeta, m), wall), topStamp(m), wall);
  const changed = next.todayDate !== localDoc.todayDate || changedPaths(localDoc, next).size > 0;
  return { doc: changed ? next : localDoc, meta, changed };
}

/** 맞추기 엔진(V4-A)이 저장소에 닿는 좁은 손잡이 — useSyncPort()가 iOS에서만 준다 */
export interface SyncPort {
  /** 지금 메타(없으면 null) */
  meta(): SyncMeta | null;
  /**
   * 메타 고치기(seen · pulledAt · enabled · observe · rekey · gc) — fn은 지금 메타와 지금 문서를 받는다.
   * await 앞에서 읽어 둔 메타를 돌려주지 말 것(그 사이 찍은 도장이 사라진다). 시계·판을 바꾸는 일은 epochReset · applyRemote로.
   */
  updateMeta(fn: (meta: SyncMeta, doc: MandaratDoc) => SyncMeta): void;
  /** 지금 이 기기의 복제본(올릴 것) — 문서와 메타는 같은 순간의 짝 */
  replica(): Replica | null;
  /** 받은 복제본을 지금 문서와 합쳐 넣는다 — 기다리지 않는다. 문서가 바뀌었으면 true */
  applyRemote(remote: Replica | NewerReplica): boolean;
  /** 지금 문서를 남긴 채 새 판('이 기기 기록으로 이어 써요') */
  epochReset(): void;
  /** 오늘 저장본 'mandarat:snap:<오늘>'을 지금 문서로 다시 쓴다 — 문서는 부른 순간의 것 */
  keepCopy(): Promise<boolean>;
}

/** 저장소가 손잡이에 빌려주는 것 — 모두 그 순간의 값(latest.current · metaRef.current) */
export interface SyncPortHost {
  doc(): MandaratDoc;
  meta(): SyncMeta | null;
  /** 메타만 바꾸고 저장을 예약한다 */
  setMeta(meta: SyncMeta): void;
  /** 받은 것을 합친 문서와 그 메타 — 도장 없이 넣고 편집 횟수를 올린다 */
  putMerged(doc: MandaratDoc, meta: SyncMeta): void;
  today(): string;
  now(): number;
  /** 문서를 오늘 저장본으로 쓴다(성공하면 true) */
  writeCopy(doc: MandaratDoc): Promise<boolean>;
}

export function makeSyncPort(host: SyncPortHost): SyncPort {
  const keepCopy = (): Promise<boolean> => {
    // 문서는 지금 읽는다 — 쓰기를 기다리는 동안 바뀌어도 부른 순간의 모습이 남는다
    const doc = host.doc();
    return host.writeCopy(doc);
  };
  return {
    meta: () => host.meta(),
    updateMeta(fn) {
      const meta = host.meta();
      if (!meta) return;
      const next = fn(meta, host.doc());
      if (next !== meta) host.setMeta(next);
    },
    replica() {
      const meta = host.meta();
      return meta ? replicaOf(host.doc(), meta) : null;
    },
    applyRemote(remote) {
      const doc = host.doc();
      const meta = host.meta();
      if (!meta || isNewer(remote)) return false;
      // 판이 더 높다 — 이 기기의 맞추지 않은 기록이 새 판에 지워지기 전에 오늘 저장본으로 남긴다(엔진도 먼저 부르지만 한 번 더)
      if (remote.epoch > meta.epoch) void keepCopy();
      const r = joinRemote(doc, meta, remote, host.today(), host.now());
      if (r.changed) host.putMerged(r.doc, r.meta);
      else if (r.meta !== meta) host.setMeta(r.meta);
      return r.changed;
    },
    epochReset() {
      const meta = host.meta();
      if (meta) host.setMeta(epochReset(meta, host.now(), host.doc()));
    },
    keepCopy,
  };
}
