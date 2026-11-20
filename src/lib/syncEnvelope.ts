// iCloud 저장 봉투와 저장소 쪽 맞추기 손잡이(sync port) — 순수 함수와 작은 공장 하나.
// 저장소(src/store/MandaratContext.tsx)는 iOS에서 'mandarat:doc:v1'에 { ...doc, _sync } 봉투를 쓰고,
// 맞추기 엔진(V4-A)은 여기서 만든 SyncPort로만 저장소에 닿는다. 규칙과 이유는 docs/v2/V3-E.md.
//
// 가장 중요한 규칙: 이 기기에서 고친 것을 잃지 않는다.
// - applyRemote는 그 순간의 문서와 메타를 읽어 그 자리에서(기다리지 않고) 합친다 — 받는 동안(최대 10초) 쓴 글이 남는다.
// - 저장은 늘 같은 순간의 문서와 메타를 짝으로 쓴다(앞선 도장이 옛 값에 붙지 않게).
// - 판이 더 높은 복제본(다른 기기의 초기화·'이 기기 기록으로')을 합치기 전에 오늘 저장본을 남긴다.
// - 도장은 미뤄 찍는다(R-8 #3): 저장소 commit은 문서만 바꾸고, 메타를 읽는 곳(저장 · 손잡이의 모든 길)이
//   먼저 밀린 바뀜을 한 번에 찍는다(stampPending). 누르기 한 번이 시계 전체를 베끼지 않는다.
import type { MandaratDoc } from '../types';
import { migrate } from '../data/defaults';
import { extraLogKey, kindOf, rolloverToday } from './routine';
import { unionArchives } from './archive';
import { cleanSyncMeta, type SyncMeta } from './syncMeta';
import { changedPaths, dayStartOf, epochReset, stampDayRoll, stampLocal } from './syncLocal';
import { adoptMerged, isNewer, materialize, mergeAll, replicaOf, topStamp, type NewerReplica, type Replica } from './syncMerge';
import { pathOf } from './syncProject';
import { msOf, observe, type Stamp } from './syncStamp';
import { SYNC_FIELD } from './syncCommitBase';

// 봉투의 JSON은 웹과 함께 쓴다(syncCommitBase — 웹 번들은 이 파일을 불러오지 않는다)
export { SYNC_FIELD, docOnlyJson, serializeStored } from './syncCommitBase';

/** 저장된 값 → 문서와 메타. 메타가 없거나 깨졌으면 null. JSON이 아니면 던진다(부르는 쪽이 깨진 저장본으로 다룬다) */
export function parseStored(raw: string): { doc: MandaratDoc; meta: SyncMeta | null } {
  const parsed: unknown = JSON.parse(raw);
  const env = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  const meta = env && Object.prototype.hasOwnProperty.call(env, SYNC_FIELD) ? cleanSyncMeta(env[SYNC_FIELD]) : null;
  return { doc: migrate(parsed), meta };
}

/**
 * 저장소의 한 번 바꾸기가 메타를 어떻게 바꾸는가 — 보통은 도장, 초기화는 새 판, 받은 것을 넣을 때는 그대로,
 * 하루 정리(rolloverToday)는 오늘이 시작된 때의 도장('day')
 */
export type CommitHow = 'stamp' | 'epoch' | 'none' | 'day';

/**
 * 한 번 바꾸기의 메타 몫(곧바로) — 메타가 있을 때만. 저장소는 commitMeta로 'epoch' · 'none'에만 부르고, 앱을 열 때 정리(openStored)도 쓴다.
 * prev → next로 바꾸면:
 * - 'stamp': 바뀐 경로에 이 기기 도장(stampLocal)
 * - 'epoch': 새 판을 올리고 next(남기는 문서)의 모든 경로를 새 판 위에 찍는다(epochReset — 다시 stampLocal하지 않는다)
 * - 'none': 그대로(applyRemote가 이미 메타를 맞췄다)
 * - 'day': 하루 정리 — 오늘 목록에서 뺀 것은 오늘(next.todayDate)이 시작된 때의 도장(stampDayRoll). 늦게 연 기기의 정리가
 *   다른 기기에서 오늘 먼저 담은 칸을 지우지 않는다
 */
export function stampCommit(prev: MandaratDoc, next: MandaratDoc, meta: SyncMeta | null, how: CommitHow, wall: number): SyncMeta | null {
  if (!meta || next === prev || how === 'none') return meta;
  if (how === 'day') return stampDayRoll(prev, next, meta, wall, dayStartOf(next.todayDate ?? '', wall));
  return how === 'epoch' ? epochReset(meta, wall, next) : stampLocal(prev, next, meta, wall);
}

/**
 * 미뤄 둔 도장 — stamped(메타가 마지막으로 도장을 맞춘 문서) → latest의 바뀜을 한 번에 찍는다.
 * 여러 번 고친 것은 그 합(처음 → 지금)에 도장 하나: 다시 원래 값으로 돌아온 경로는 찍지 않고, 카운터는 합만큼 내 몫에.
 * 메타가 없거나 밀린 것이 없으면 meta 그대로.
 */
export function stampPending(stamped: MandaratDoc, latest: MandaratDoc, meta: SyncMeta | null, wall: number): SyncMeta | null {
  return meta && stamped !== latest ? stampLocal(stamped, latest, meta, wall) : meta;
}

/**
 * 저장소 commit의 메타 몫(prev = 지금 문서, stamped = 메타의 짝 문서) — 돌려준 meta · stamped를 그대로 둔다.
 * - 'stamp': 아무것도 하지 않는다(도장은 다음 저장 · 손잡이 읽기가 stampPending으로) — 누르기마다 O(1)
 * - 'epoch' · 'none' · 'day': 밀린 도장을 먼저 찍고(stampPending) stampCommit, 그 뒤 메타의 짝은 next
 */
export function commitMeta(
  prev: MandaratDoc,
  next: MandaratDoc,
  meta: SyncMeta | null,
  stamped: MandaratDoc,
  how: CommitHow,
  wall: number,
): { meta: SyncMeta | null; stamped: MandaratDoc } {
  if (how === 'stamp') return { meta, stamped };
  return { meta: stampCommit(prev, next, stampPending(stamped, prev, meta, wall), how, wall), stamped: next };
}

/** 처음부터 다시 직전의 맞추기 몫 — 되돌리기가 그 판을 거두는 데 쓴다(R-1 F2) */
export interface ResetMark {
  /** 초기화 직전(밀린 도장까지 찍은) 메타 */
  before: SyncMeta;
  /** 초기화가 올린 새 판 */
  epoch: Stamp;
  /** 초기화 때 마지막으로 올린 지문 — 그 뒤 올렸으면 다른 기기가 새 판을 보았을 수 있다 */
  pushed?: string;
}

/**
 * 처음부터 다시를 되돌릴 때의 메타 — 새 판을 아직 올리지 않았고(pushed 그대로) 판도 그대로일 때만,
 * 판 · 시계 · 몫 · 읽은 파일(seen)을 초기화 전으로 되돌린다. 그러면 다른 기기의 맞추지 않은 기록이 새 판에 지워지지 않는다.
 * 기기 · 켜기 · 계정 · last(시계는 앞으로만) · pushed는 지금 것. 조건이 맞지 않으면 null(지금처럼 replaceDoc).
 * seen을 되돌려 그 사이 받은 파일은 다음 받기에서 다시 읽는다.
 */
export function undoResetMeta(mark: ResetMark | null, current: SyncMeta | null): SyncMeta | null {
  if (!mark || !current || current.epoch !== mark.epoch || current.pushed !== mark.pushed) return null;
  const { before } = mark;
  return { ...current, epoch: before.epoch, clock: before.clock, parts: before.parts, seen: before.seen };
}

/**
 * 앱을 열 때 — 저장된 값을 읽어 오늘로 정리한다. 정리(rolloverToday)로 바뀐 것에만 도장을 찍는다 —
 * 연 시각이 아니라 오늘이 시작된 때의 도장('day'): 다른 기기에서 오늘 먼저 담은 칸을 늦게 연 이 기기의 정리가 지우지 않게.
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
  return { doc: rolled, meta: stampCommit(doc, rolled, meta, 'day', wall) };
}

/**
 * 합친 문서의 하루 정리(M3) — 오늘 목록(담은 칸 · 직접 추가한 할 일)은 날마다의 것인데 경로에는 날짜가 없다.
 * 그래서 도장으로 가린다: 오늘(이 기기의 날 dayStart)이 시작되기 전에 담은 칸 · 끝낸 할 일은 지난 날의 것이고,
 * rolloverToday와 같은 규칙으로 뺀다(끝내지 않은 한 번 칸과 끝내지 않은 할 일만 넘어온다).
 * - 이 기기가 이미 오늘로 정리한 뒤에 다른 기기의 지난 복제본에서 들어온 것도 뺀다 — 어제 끝낸 할 일이 오늘 목록에
 *   '한 것'으로 남아 오늘 기록에 또 들어가거나, 어제 담은 칸이 오늘 목록으로 되살아나지 않는다.
 * - 오늘 시작 뒤의 도장이 붙은 것(다른 기기에서 오늘 담은 칸 · 오늘 끝낸 것)은 이 기기의 정리가 아직이어도 남긴다.
 * - 도장이 없는 것(맞추기 전부터 있던 값)은 나이를 모른다: 이 기기의 정리가 아직이면 지난 것으로, 이미 지났으면 오늘 것으로 본다.
 *   다만 끝낸 할 일은 그날 기록으로도 가린다 — 오늘 기록에 없고 지난 날 기록에만 있으면 그날 끝낸 것이다.
 * 날짜가 없던 문서 · 기기 날짜보다 앞선 날짜는 rolloverToday처럼 아무것도 빼지 않고 오늘로 맞춘다. 바뀐 게 없으면 같은 객체.
 */
export function rollMerged(doc: MandaratDoc, clock: Readonly<Record<string, Stamp>>, todayKey: string, dayStart: number): MandaratDoc {
  if (!doc.todayDate || todayKey < doc.todayDate || !Number.isFinite(dayStart)) return rolloverToday(doc, todayKey);
  const unrolled = doc.todayDate !== todayKey;
  const stampOf = (path: string): Stamp => (Object.prototype.hasOwnProperty.call(clock, path) ? clock[path] : '');
  const fresh = (path: string): boolean => {
    const s = stampOf(path);
    return s ? msOf(s) >= dayStart : !unrolled;
  };
  const todayKeys = doc.todayKeys.filter((k) => {
    if (fresh(pathOf('tk', k))) return true;
    const [ti, ai] = k.split('-').map(Number);
    const a = doc.themes[ti]?.actions[ai];
    if (!a || !a.text.trim() || kindOf(a) !== 'once') return false;
    return !a.done || fresh(pathOf('c', k, 'done'));
  });
  const todayExtra = doc.todayExtra.filter((x) => {
    if (!x.done) return true;
    const path = pathOf('x', x.id, 'done');
    if (stampOf(path) || unrolled) return fresh(path);
    const key = extraLogKey(x.ti, x.id);
    if ((doc.dayLog[todayKey] ?? []).includes(key)) return true;
    return !Object.keys(doc.dayLog).some((day) => day < todayKey && doc.dayLog[day].includes(key));
  });
  const same = todayKeys.length === doc.todayKeys.length && todayExtra.length === doc.todayExtra.length;
  if (same) return unrolled ? { ...doc, todayDate: todayKey } : doc;
  return { ...doc, todayKeys, todayExtra, todayDate: todayKey };
}

/**
 * 다른 기기의 복제본을 지금 이 기기의 문서·메타와 합친다(순수). 받은 복제본이 더 새 앱의 것이면 아무것도 바꾸지 않는다.
 * 합친 뒤 materialize(M1–M2)와 이 기기 날짜로 하루 정리(M3, rollMerged)를 하고, 그 둘로 바뀐 것에만 이 기기 도장을 찍는다
 * (정리로 뺀 오늘 담은 칸에 지운 표시가 없으면 다른 기기가 다음에 되살린다) — 다듬기는 지금 도장, 정리로 뺀 것은
 * 오늘이 시작된 때의 도장(stampDayRoll). 시계는 받은 가장 큰 도장 뒤로 당긴다.
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
  const dayStart = dayStartOf(todayKey, wall);
  const tidy = materialize(m.doc);
  const tidied = stampLocal(m.doc, tidy, adoptMerged(localMeta, m), wall);
  const next = rollMerged(tidy, tidied.clock, todayKey, dayStart);
  const meta = observe(stampDayRoll(tidy, next, tidied, wall, dayStart), topStamp(m), wall);
  const changed = next.todayDate !== localDoc.todayDate || changedPaths(localDoc, next).size > 0;
  return { doc: changed ? next : localDoc, meta, changed };
}

/** 맞추기 엔진(V4-A)이 저장소에 닿는 좁은 손잡이 — useSyncPort()가 iOS에서만 준다 */
export interface SyncPort {
  /** 지금 메타(없으면 null) — 밀린 도장을 먼저 찍는다 */
  meta(): SyncMeta | null;
  /** 지금 판(메타가 없으면 null) — 도장을 찍지 않고 읽는다(미뤄 둔 도장은 판을 바꾸지 않는다) */
  epoch(): Stamp | null;
  /**
   * 메타 고치기(seen · pulledAt · enabled · observe · rekey · gc) — fn은 지금 메타와 지금 문서를 받는다.
   * await 앞에서 읽어 둔 메타를 돌려주지 말 것(그 사이 찍은 도장이 사라진다). 시계·판을 바꾸는 일은 epochReset · applyRemote로.
   */
  updateMeta(fn: (meta: SyncMeta, doc: MandaratDoc) => SyncMeta): void;
  /** 지금 이 기기의 복제본(올릴 것) — 문서와 메타는 같은 순간의 짝 */
  replica(): Replica | null;
  /** 받은 복제본을 지금 문서와 합쳐 넣는다 — 기다리지 않는다. 문서가 바뀌었으면 true */
  applyRemote(remote: Replica | NewerReplica): boolean;
  /**
   * 처음 켤 때 '다른 기기 기록으로'(V4-A enable('adopt')) — 받은(합친) 복제본의 표·설정·기록과 판을 그대로 쓰되,
   * 이 기기의 지난 표는 버리지 않고 아이디로 합친다. 바꾸기 전에 오늘 저장본을 남긴다. 바꿨으면 true
   */
  adopt(remote: Replica | NewerReplica): boolean;
  /** 지금 문서를 남긴 채 새 판('이 기기 기록으로 이어 써요') */
  epochReset(): void;
  /** 오늘 저장본 'mandarat:snap:<오늘>'을 지금 문서로 다시 쓴다 — 문서는 부른 순간의 것 */
  keepCopy(): Promise<boolean>;
  /** 복제본 쓰기가 시작되면 +1, 끝나면(실패해도) −1 — 저장소가 '올리는 중'을 안다(초기화 되돌리기가 판을 거둘지 정한다) */
  writing?(delta: 1 | -1): void;
}

/** 저장소가 손잡이에 빌려주는 것 — 모두 그 순간의 값(latest.current · metaRef.current) */
export interface SyncPortHost {
  doc(): MandaratDoc;
  /** 메타 그대로(밀린 도장 없이) — 손잡이는 늘 flush 뒤에 읽는다 */
  meta(): SyncMeta | null;
  /** 도장을 미뤄 찍는 저장소(MandaratContext)는 여기서 밀린 도장을 찍는다 — 손잡이의 모든 길이 먼저 부른다 */
  flush?(): void;
  /** 메타만 바꾸고 저장을 예약한다 */
  setMeta(meta: SyncMeta): void;
  /** 받은 것을 합친 문서와 그 메타 — 도장 없이 넣고 편집 횟수를 올린다 */
  putMerged(doc: MandaratDoc, meta: SyncMeta): void;
  today(): string;
  now(): number;
  /** 문서를 오늘 저장본으로 쓴다(성공하면 true) */
  writeCopy(doc: MandaratDoc): Promise<boolean>;
  /** 복제본 쓰기가 시작될 때 +1, 끝날 때 −1(SyncPort.writing) */
  writing?(delta: 1 | -1): void;
}

export function makeSyncPort(host: SyncPortHost): SyncPort {
  const keepCopy = (): Promise<boolean> => {
    // 문서는 지금 읽는다 — 쓰기를 기다리는 동안 바뀌어도 부른 순간의 모습이 남는다.
    // 처음 쓰지 않은 표(초기화 뒤 등)는 남기지 않는다 — 그날 앞서 남긴 저장본을 빈 표로 덮지 않게
    const doc = host.doc();
    return doc.onboarded ? host.writeCopy(doc) : Promise.resolve(false);
  };
  // 메타를 읽는 모든 길은 먼저 밀린 도장을 찍는다(host.flush) — 엔진은 도장이 밀린 메타를 보지 않는다
  return {
    meta() {
      host.flush?.();
      return host.meta();
    },
    epoch: () => host.meta()?.epoch ?? null,
    updateMeta(fn) {
      host.flush?.();
      const meta = host.meta();
      if (!meta) return;
      const next = fn(meta, host.doc());
      if (next !== meta) host.setMeta(next);
    },
    replica() {
      host.flush?.();
      const meta = host.meta();
      return meta ? replicaOf(host.doc(), meta) : null;
    },
    applyRemote(remote) {
      host.flush?.();
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
    adopt(remote) {
      host.flush?.();
      const local = host.doc();
      const meta = host.meta();
      if (!meta || isNewer(remote)) return false;
      void keepCopy();
      const { archives: _theirs, ...rest } = remote.doc;
      const archives = unionArchives(local.archives, remote.doc.archives);
      const now = host.now();
      const today = host.today();
      const dayStart = dayStartOf(today, now);
      // 날짜 정리 상태(todayDate)는 이 기기의 것 — 그다음 이 기기 날짜로 하루 정리(받은 기록의 지난 날 오늘 목록도 뺀다)
      const taken: MandaratDoc = { ...rest, ...(archives ? { archives } : {}), todayDate: local.todayDate };
      // 받은 시계·몫·판을 쓰고, 그 위에 이 기기에서 더한 것(남긴 지난 표 · 하루 정리)만 도장 — 다른 기기로 퍼지게
      const kept = stampLocal(remote.doc, taken, adoptMerged(meta, remote), now);
      const doc = rollMerged(taken, kept.clock, today, dayStart);
      host.putMerged(doc, observe(stampDayRoll(taken, doc, kept, now, dayStart), topStamp(remote), now));
      return true;
    },
    epochReset() {
      host.flush?.();
      const meta = host.meta();
      if (meta) host.setMeta(epochReset(meta, host.now(), host.doc()));
    },
    keepCopy,
    writing: (delta) => host.writing?.(delta),
  };
}
