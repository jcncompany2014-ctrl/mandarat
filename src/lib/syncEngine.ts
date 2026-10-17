// iCloud 맞추기 엔진 — 받기(pull) · 합치기 · 올리기(push)의 순서와 때, 그리고 화면이 보여 줄 상태.
// 기기 IO(icloud 모듈)는 주입받는다(SyncIO) — Node 테스트가 가짜 iCloud 폴더로 같은 코드를 돌린다.
// 저장소에는 SyncPort(syncEnvelope.ts)로만 닿는다. 규칙과 이유는 docs/v2/V4-A.md.
//
// 가장 중요한 규칙: 이 기기에서 고친 것을 잃지 않는다.
// - 받은 복제본은 IO를 기다린 뒤 port.applyRemote(받은 것)로 넣는다 — 저장소가 그 순간의 문서와 합친다.
//   기다리기 전에 읽은 문서로 합친 결과를 넣지 않는다(받는 동안 쓴 글이 사라진다).
// - 메타 고치기는 늘 port.updateMeta((지금 메타) => …)로 — await 앞에서 읽은 메타를 돌려주지 않는다.
// - 고르기(합치기 · iCloud 것으로 · 이 기기 것으로)와 판이 더 높은 복제본을 넣기 전에는 오늘 저장본을 남긴다(keepCopy).
// - 지난 표는 기념물 — 어떤 고르기 · 다른 기기의 초기화도 지난 표를 지우지 않는다(아이디로 합친다).
// - 더 새 앱이 쓴 복제본이 있으면 아무것도 합치거나 올리지 않는다(newerApp — 모르는 필드를 덮어쓰지 않게).
import type { ArchivedChart, MandaratDoc } from '../types';
import type { ICloudFile, ICloudStatus, ICloudSyncNative } from '../../modules/icloud-sync';
import { unionArchives } from './archive';
import type { SyncPort } from './syncEnvelope';
import { decodeReplica, devOfName, encodeReplica, replicaDigest, replicaName, SIZE_WARN } from './syncFile';
import { gc, isStale, SYNC_TTL_MS } from './syncLocal';
import { isNewer, mergeAll, topStamp, type NewerReplica, type Replica } from './syncMerge';
import { rekey } from './syncMeta';
import { pathOf } from './syncProject';
import { eff, maxStamp, observe } from './syncStamp';

/** 이 기기에서 고친 뒤 올리기까지 몰아 두는 시간 */
export const PUSH_DEBOUNCE_MS = 5000;
/** 메타데이터 질의가 처음 모으기를 마칠 때까지 기다리는 시간 — 넘으면 ioError */
export const GATHER_TIMEOUT_MS = 10_000;
/** 온보딩의 살펴보기(probeRemote)가 첫 모으기를 기다리는 시간 */
export const PROBE_TIMEOUT_MS = 5000;

export type SyncPhase = 'off' | 'checking' | 'needsChoice' | 'syncing' | 'idle' | 'problem';
export type SyncProblem = 'noAccount' | 'driveOff' | 'accountChanged' | 'tooLarge' | 'ioError' | 'newerApp';
/** 처음 켤 때(또는 오래 맞추지 않았을 때) 고르는 것 — 둘을 합쳐요 · iCloud 기록으로 바꿔요 · 이 기기 기록으로 이어 써요 */
export type SyncChoice = 'merge' | 'adopt' | 'mine';
/** 켜기 전 판단 — 올리기만 · 그대로 가져오기(이 기기가 비었다) · 묻기 */
export type Classified = 'push' | 'adopt' | 'ask';

export interface SyncStatus {
  phase: SyncPhase;
  /** 이 기기에서 맞추기를 켰는가(메타의 enabled) */
  enabled: boolean;
  /** 마지막으로 다 맞춘 때(ms) */
  at?: number;
  /** phase가 'problem'일 때의 까닭 */
  problem?: SyncProblem;
  /** phase가 'needsChoice'일 때 iCloud에 있는 기록(다른 기기 것을 모두 합친 문서) — 고르기 화면의 비교용 */
  remote?: MandaratDoc;
}

export const OFF_STATUS: SyncStatus = { phase: 'off', enabled: false };

/** 엔진이 쓰는 기기 IO — 기기에서는 icloud 모듈, 테스트에서는 가짜 폴더 */
export interface SyncIO {
  status(): Promise<ICloudStatus>;
  /** 백업에서 빠진 이 기기 열쇠 — 메타의 vendor와 다르면 rekey */
  deviceKey(): Promise<string>;
  /** 메타데이터 질의 시작 — 모으기를 마치면 엔진의 changed()가 불린다. 컨테이너가 없으면 false */
  start(): Promise<boolean>;
  stop(): Promise<void>;
  list(): Promise<ICloudFile[]>;
  /** [현재 내용, 풀리지 않은 충돌본…] */
  read(name: string): Promise<string[]>;
  write(name: string, json: string): Promise<void>;
  remove(name: string): Promise<void>;
  now(): number;
}

// ── 순수한 판단 ─────────────────────────────────────────────────────────────

/** 이 기기 문서에 사람이 적은 것이 없나 — 처음 쓰지 않았거나, 글 · 기록 · 돌아보기 · 지난 표가 하나도 없다 */
export function isEmptyDoc(doc: MandaratDoc): boolean {
  if (!doc.onboarded) return true;
  if (doc.centerGoal.trim() || doc.centerGoalEn.trim()) return false;
  if ((doc.archives?.length ?? 0) > 0 || doc.todayExtra.length > 0) return false;
  if (Object.keys(doc.dayLog).some((d) => doc.dayLog[d].length > 0)) return false;
  if (Object.keys(doc.dayMeta).some((d) => doc.dayMeta[d].reflection?.trim() || doc.dayMeta[d].mood !== undefined)) return false;
  if (Object.keys(doc.reviews ?? {}).length > 0 || (doc.closedDays?.length ?? 0) > 0) return false;
  return doc.themes.every((t) => t.actions.every((a) => !a.text.trim() && !a.note.trim() && !a.done && !a.count && !a.log));
}

/**
 * 켜기 전 판단 — iCloud에 다른 기기 기록이 없으면 올리기만, 이 기기가 비었으면 그대로 가져오기, 아니면 묻는다.
 * 더 새 앱의 복제본은 세지 않는다(그런 것이 있으면 엔진이 먼저 멈춘다).
 */
export function classify(localDoc: MandaratDoc, remotes: readonly (Replica | NewerReplica)[]): Classified {
  if (!remotes.some((r) => !isNewer(r))) return 'push';
  return isEmptyDoc(localDoc) ? 'adopt' : 'ask';
}

// ── 받기 · 넣기 · 올리기 ─────────────────────────────────────────────────────

/** 엔진을 멈추게 하는 까닭 */
export class SyncStop extends Error {
  constructor(readonly problem: SyncProblem) {
    super(`sync stopped: ${problem}`);
  }
}

/** 기기 모듈이 거절할 때의 code(E_NO_ACCOUNT …) */
export function errCode(e: unknown): string | undefined {
  const c = e && typeof e === 'object' ? (e as { code?: unknown }).code : undefined;
  return typeof c === 'string' ? c : undefined;
}

export interface ReadResult {
  /** 읽어 푼 복제본(더 새 앱의 것 포함 — 합치기 전에 본다) */
  remotes: (Replica | NewerReplica)[];
  /** 다 읽은 파일 → 그때 수정 시각 — 이번 읽기가 끝나면 seen에 더한다 */
  seen: Record<string, number>;
  /** 목록 전체(오래된 파일 치우기에 쓴다) */
  files: ICloudFile[];
  /** 읽으려 한 파일 수 · 읽지 못한 수 */
  tried: number;
  failed: number;
}

/**
 * 다른 기기의 복제본 파일을 읽는다 — 이 기기 파일은 건너뛴다. all이 아니면 seen과 수정 시각이 같은 파일도 건너뛴다.
 * - 내려받지 않았던 파일(downloaded: false)은 읽어도 seen에 넣지 않는다: 10초 안에 다 내려받지 못하면
 *   기기 모듈은 예전 내용을 돌려주므로, 다음 받기에서 한 번 더 읽는다(합치기는 같은 것을 두 번 해도 그대로다).
 * - 깨진 파일은 그 수정 시각으로 seen에 넣고 건너뛴다(바뀌면 다시 읽는다). 계정이 없으면 멈춘다(noAccount).
 */
export async function readRemotes(port: SyncPort, io: SyncIO, all: boolean): Promise<ReadResult> {
  const files = await io.list();
  const out: ReadResult = { remotes: [], seen: {}, files, tried: 0, failed: 0 };
  for (const f of files) {
    const meta = port.meta();
    if (!meta) break;
    // 지금 dev와 견준다 — rekey 뒤의 옛 dev 파일은 다른 기기의 것처럼 읽는다
    const dev = devOfName(f.name);
    if (!dev || dev === meta.dev) continue;
    if (!all && meta.seen[f.name] === f.modified) continue;
    out.tried += 1;
    let texts: string[];
    try {
      texts = await io.read(f.name);
    } catch (e) {
      const code = errCode(e);
      if (code === 'E_NO_ACCOUNT') throw new SyncStop('noAccount');
      if (code === 'E_CORRUPT') out.seen[f.name] = f.modified;
      else out.failed += 1;
      continue;
    }
    for (const t of texts) {
      const r = decodeReplica(t);
      if (r) out.remotes.push(r);
    }
    if (f.downloaded) out.seen[f.name] = f.modified;
  }
  return out;
}

/** 지난 표 아이디 모음 */
function idsOf(list: readonly ArchivedChart[] | undefined): Set<string> {
  return new Set((list ?? []).map((a) => a.id));
}

/**
 * 받은 것을 넣는다 — 기다리지 않는다(부르는 쪽도 이 앞에서 기다리지 않은 채로 부른다).
 * 판이 더 높은 복제본(다른 기기의 처음부터 다시 · '이 기기 기록으로')은 판 이하의 값을 지우는데, 지난 표는 기념물이라
 * 지우지 않는다: 이 기기에만 있던 지난 표가 합친 결과에서 빠졌고 받은 쪽이 판 뒤에 그것을 지운 적이 없으면,
 * port.adopt로 아이디 합치기를 하며 새 도장을 찍어(다른 기기로도 퍼진다) 되살린다. 문서가 바뀌었으면 true.
 */
export function applyPulled(port: SyncPort, remote: Replica): boolean {
  const L = port.replica();
  if (!L) return false;
  if (!(remote.epoch > L.epoch)) return port.applyRemote(remote);
  const E = maxStamp(L.epoch, remote.epoch);
  const m = mergeAll(L, [remote]);
  if (isNewer(m)) return false;
  const kept = idsOf(m.doc.archives);
  const lost = (L.doc.archives ?? []).filter((a) => !kept.has(a.id) && eff(remote, pathOf('ar', a.id), E) === '');
  if (lost.length === 0) return port.applyRemote(remote);
  // L과 m은 같은 순간(사이에 기다림이 없다) — adopt는 m의 표 · 시계에 이 기기의 지난 표를 아이디로 합치고 그 차이에 도장을 찍는다
  port.adopt(m);
  // 합친 문서 다듬기(materialize)와 그 도장 — 같은 것을 한 번 더 합치면 그 밖에는 바뀌지 않는다
  port.applyRemote(m);
  return true;
}

/**
 * '이 기기 기록으로 이어 써요' — 기다리지 않는다. 받은 가장 큰 도장 뒤로 시계를 당긴 뒤(새 판이 받은 판보다 크게),
 * iCloud에만 있던 지난 표를 이 기기 문서에 아이디로 합치고(같은 아이디는 이 기기 것), 지금 문서 전부를 새 판 위에 찍는다.
 */
export function applyMine(port: SyncPort, remote: Replica | null, wall: number): void {
  if (!remote) return;
  port.updateMeta((m) => observe(m, topStamp(remote), wall));
  const L = port.replica();
  if (!L) return;
  const mineIds = idsOf(L.doc.archives);
  if ((remote.doc.archives ?? []).some((a) => !mineIds.has(a.id))) {
    const archives = unionArchives(remote.doc.archives, L.doc.archives);
    port.adopt({ ...L, doc: { ...L.doc, ...(archives ? { archives } : {}) } });
  }
  port.epochReset();
}

export interface PushResult {
  /** 올렸는가(같은 내용이면 false) */
  wrote: boolean;
  /** 올린 글이 SIZE_WARN을 넘었다 */
  large: boolean;
}

/**
 * 지금 복제본을 올린다 — 문서와 메타는 부른 순간의 짝. 지난번에 올린 것과 같으면(지문) 쓰지 않는다.
 * 지문은 쓰기가 끝난 뒤에 남긴다(앱이 그 사이 꺼지면 다음에 다시 올린다). 그 사이 rekey했으면 남기지 않는다.
 */
export async function push(port: SyncPort, io: SyncIO): Promise<PushResult> {
  const rep = port.replica();
  const meta = port.meta();
  if (!rep || !meta) return { wrote: false, large: false };
  const digest = replicaDigest(rep);
  if (digest === meta.pushed) return { wrote: false, large: false };
  const json = encodeReplica({ ...rep, at: io.now() });
  try {
    await io.write(replicaName(rep.dev), json);
  } catch (e) {
    throw new SyncStop(errCode(e) === 'E_NO_ACCOUNT' ? 'noAccount' : 'ioError');
  }
  port.updateMeta((m) => (m.dev === rep.dev ? { ...m, pushed: digest } : m));
  return { wrote: true, large: json.length > SIZE_WARN };
}

export type PullResult = { kind: 'newer' } | { kind: 'ok'; changed: boolean; files: ICloudFile[] };

/**
 * 받기 — 바뀐 다른 기기 파일을 읽어 풀고, 하나라도 더 새 앱의 것이면 멈춘다(아무것도 넣지 않고 seen도 그대로).
 * 받은 것들을 먼저 서로 합친 뒤(mergeAll) 기다림 없이 넣는다. 판이 더 높으면 넣기 전에 오늘 저장본을 남긴다 —
 * 남기지 못했는데 지킬 기록이 있으면 넣지 않는다(ioError, 다음에 다시). 모든 파일을 읽지 못했으면 ioError.
 */
export async function pull(port: SyncPort, io: SyncIO): Promise<PullResult> {
  const r = await readRemotes(port, io, false);
  if (r.tried > 0 && r.failed === r.tried) throw new SyncStop('ioError');
  const merged = mergeAll(null, r.remotes);
  if (isNewer(merged)) return { kind: 'newer' };
  let changed = false;
  if (merged) {
    const meta = port.meta();
    if (meta && merged.epoch > meta.epoch) {
      const kept = await port.keepCopy();
      if (!kept && port.replica()?.doc.onboarded) throw new SyncStop('ioError');
    }
    // ↓ 여기부터 기다림 없이: 저장소가 지금 문서와 합친다
    changed = applyPulled(port, merged);
  }
  const wall = io.now();
  port.updateMeta((m) => ({
    ...(merged ? observe(m, topStamp(merged), wall) : m),
    seen: { ...m.seen, ...r.seen },
    pulledAt: wall,
  }));
  return { kind: 'ok', changed, files: r.files };
}

/**
 * 오래된 기기 파일 치우기 — 다른 기기의 파일 중 TTL보다 오래 바뀌지 않았고, 그 내용을 이미 합쳤고(seen이 같다),
 * 이 기기 파일에 그 뒤 상태를 올려 둔(pushed가 지금 지문) 것만 지운다. 지운 파일은 seen에서도 뺀다.
 */
export async function removeStale(port: SyncPort, io: SyncIO, files: readonly ICloudFile[]): Promise<string[]> {
  const meta = port.meta();
  const rep = port.replica();
  if (!meta || !rep || meta.pushed !== replicaDigest(rep)) return [];
  const cutoff = io.now() - SYNC_TTL_MS;
  const gone: string[] = [];
  for (const f of files) {
    const dev = devOfName(f.name);
    if (!dev || dev === meta.dev || f.modified >= cutoff || meta.seen[f.name] !== f.modified) continue;
    try {
      await io.remove(f.name);
      gone.push(f.name);
    } catch {
      // 다음 날 다시
    }
  }
  if (gone.length > 0) {
    port.updateMeta((m) => {
      const seen = { ...m.seen };
      for (const n of gone) delete seen[n];
      return { ...m, seen };
    });
  }
  return gone;
}

// ── 엔진(때와 차례) ─────────────────────────────────────────────────────────

export interface EngineDeps {
  port: SyncPort;
  io: SyncIO;
  random: () => number;
  /** 상태가 바뀔 때마다 */
  emit?: (s: SyncStatus) => void;
  /** 단계가 바뀔 때 — 오류 수집의 빵부스러기 */
  crumb?: (phase: string) => void;
  gatherTimeoutMs?: number;
}

export interface SyncEngine {
  status(): SyncStatus;
  /** 처음 — 이 기기 열쇠 견주기(rekey), 켜져 있으면 연결하고 받고 올린다 */
  boot(): Promise<void>;
  /** 메타데이터 질의의 onChange — 모으기를 마쳤거나 파일이 바뀌었다 */
  changed(): void;
  /** onAccountChange */
  accountChanged(s: ICloudStatus): Promise<void>;
  /** 앱이 앞으로 왔다 — 받고 올린다(계정 문제였으면 다시 본다) */
  foreground(): Promise<void>;
  /** 이 기기에서 고쳤다(몰아 둔 뒤) — 올린다 */
  local(): Promise<void>;
  /** 앱이 뒤로 간다 — 곧바로 올린다(받기를 기다리지 않는다) */
  background(): Promise<void>;
  /** '지금 맞추기' */
  sync(): Promise<void>;
  /** 켜기 · 끄기. 켤 때 choice가 있으면 묻지 않고 그대로(온보딩의 '가져오기'는 'adopt') */
  setEnabled(on: boolean, choice?: SyncChoice): Promise<void>;
  /** needsChoice에 답한다 — null이면 켜지 않는다 */
  choose(choice: SyncChoice | null): Promise<void>;
  /** 엔진의 메타데이터 질의가 돌고 있나(살펴보기가 멈추지 않게) */
  watching(): boolean;
  /** 이 기기 복제본 파일 이름 */
  ownName(): string | null;
  /** 차례에 있던 일을 마친 뒤 질의를 멈춘다 */
  dispose(): Promise<void>;
}

/** 엔진이 그대로 멈춰 있어야 하는 문제 — 앱 업데이트 · 계정이 돌아올 때까지 */
const BLOCKING: readonly SyncProblem[] = ['newerApp', 'noAccount', 'driveOff', 'accountChanged'];

export function createSyncEngine(deps: EngineDeps): SyncEngine {
  const { port, io } = deps;
  const gatherTimeout = deps.gatherTimeoutMs ?? GATHER_TIMEOUT_MS;
  const firstMeta = port.meta();
  let status: SyncStatus = {
    phase: 'off',
    enabled: !!firstMeta?.enabled,
    ...(firstMeta?.pulledAt !== undefined ? { at: firstMeta.pulledAt } : {}),
  };
  let chain: Promise<void> = Promise.resolve();
  let pushChain: Promise<unknown> = Promise.resolve();
  const queued = new Set<string>();
  let watchingQ = false;
  let gathered = false;
  let waiters: (() => void)[] = [];
  let block: SyncProblem | null = null;
  /** 이번 실행에서 계정을 견주어 보았나 — 보기 전에는 올리지 않는다(바뀐 계정의 iCloud에 이 기록을 묻지 않고 쓰지 않게) */
  let verified = false;
  let disposed = false;

  const enabled = () => !!port.meta()?.enabled;

  function set(phase: SyncPhase, extra: { problem?: SyncProblem; remote?: MandaratDoc; at?: number } = {}) {
    const at = extra.at ?? status.at;
    const next: SyncStatus = {
      phase,
      enabled: enabled(),
      ...(at !== undefined ? { at } : {}),
      ...(extra.problem ? { problem: extra.problem } : {}),
      ...(extra.remote ? { remote: extra.remote } : {}),
    };
    const moved = next.phase !== status.phase || next.problem !== status.problem;
    status = next;
    if (moved) deps.crumb?.(phase === 'problem' ? `problem:${extra.problem}` : phase);
    deps.emit?.(status);
  }

  function fail(e: unknown) {
    const problem: SyncProblem = e instanceof SyncStop ? e.problem : errCode(e) === 'E_NO_ACCOUNT' ? 'noAccount' : 'ioError';
    if (BLOCKING.includes(problem)) block = problem;
    set('problem', { problem });
  }

  /** 한 줄 차례 — 엔진의 일은 겹치지 않는다. key가 있으면 아직 시작하지 않은 같은 일은 하나로 */
  function queue(key: string | null, task: () => Promise<void>): Promise<void> {
    if (key) {
      if (queued.has(key)) return chain;
      queued.add(key);
    }
    chain = chain.then(async () => {
      if (key) queued.delete(key);
      if (disposed) return;
      try {
        await task();
      } catch (e) {
        fail(e);
      }
    });
    return chain;
  }

  /** 올리기도 한 줄 — 뒤로 갈 때는 받기를 기다리지 않고 곧바로 이 줄에 선다 */
  function pushQueued(): Promise<PushResult> {
    const run = pushChain.then(() => push(port, io));
    pushChain = run.catch(() => undefined);
    return run;
  }

  function gotGather() {
    gathered = true;
    const w = waiters;
    waiters = [];
    for (const f of w) f();
  }

  function waitGather(): Promise<void> {
    if (gathered) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waiters = waiters.filter((f) => f !== done);
        reject(new SyncStop('ioError'));
      }, gatherTimeout);
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      waiters.push(done);
    });
  }

  /** 계정이 있나 — 없으면 멈춘다(로그인 안 함 · iCloud Drive 끔은 기기가 가려내지 못한다: V3-F) */
  async function account(): Promise<string> {
    const s = await io.status();
    if (!s.available || !s.account) throw new SyncStop(s.account ? 'driveOff' : 'noAccount');
    return s.account;
  }

  async function watch(): Promise<void> {
    if (!watchingQ) {
      const ok = await io.start();
      if (!ok) throw new SyncStop('noAccount');
      watchingQ = true;
    }
    await waitGather();
  }

  async function unwatch(): Promise<void> {
    verified = false;
    if (!watchingQ) return;
    watchingQ = false;
    gathered = false;
    try {
      await io.stop();
    } catch {
      // 멈추지 못해도 다음 start가 다시 쓴다
    }
  }

  /** 계정이 바뀌었다 — 끄고 까닭을 남긴다(다시 켜면 그 계정 기록과 견주어 묻는다) */
  async function disableFor(problem: SyncProblem): Promise<void> {
    port.updateMeta((m) => (m.enabled ? { ...m, enabled: false } : m));
    await unwatch();
    block = problem;
    set('problem', { problem });
  }

  /** 켜져 있는 기기의 연결 — 계정 견주기, 질의, 첫 모으기 */
  async function connect(): Promise<boolean> {
    set('checking');
    const acc = await account();
    const meta = port.meta();
    if (!meta) return false;
    if (meta.account && meta.account !== acc) {
      await disableFor('accountChanged');
      return false;
    }
    if (!meta.account) port.updateMeta((m) => ({ ...m, account: acc }));
    block = null;
    await watch();
    verified = true;
    return true;
  }

  /** 받고(full이면) 올리고 하루 한 번 치운다 — 켜져 있고 막힌 것이 없을 때만 */
  async function cycle(full: boolean): Promise<void> {
    const meta = port.meta();
    if (!meta?.enabled || status.phase === 'needsChoice') return;
    if (block === 'newerApp' || block === 'accountChanged') return;
    if (!verified || (full && (block || !watchingQ || !gathered))) {
      if (!(await connect())) return;
    } else if (block) return;
    if (isStale(meta, io.now())) {
      // 오래 맞추지 않았다 — 그동안 다른 기기가 치운 지운 표시를 모르니 그냥 합치지 않고 묻는다
      await decide(null);
      return;
    }
    set('syncing');
    let files: ICloudFile[] = [];
    if (full) {
      const p = await pull(port, io);
      if (p.kind === 'newer') {
        block = 'newerApp';
        set('problem', { problem: 'newerApp' });
        return;
      }
      files = p.files;
    }
    const pushed = await pushQueued();
    if (full) {
      const day = port.meta()?.gcDay;
      port.updateMeta((m, d) => gc(m, io.now(), d));
      if (port.meta()?.gcDay !== day) await removeStale(port, io, files);
    }
    finish(pushed.large);
  }

  function finish(large: boolean) {
    const at = io.now();
    if (large) set('problem', { problem: 'tooLarge', at });
    else set('idle', { at });
  }

  /**
   * 켜기 전(또는 오래 맞추지 않은 기기의) 판단 — 모든 다른 기기 파일을 읽어 classify.
   * choice가 있으면 묻지 않고 그대로 한다. 'ask'면 needsChoice로 멈추고 고르기를 기다린다.
   */
  async function decide(choice: SyncChoice | null): Promise<void> {
    set('checking');
    const acc = await account();
    await watch();
    const r = await readRemotes(port, io, true);
    if (r.tried > 0 && r.failed === r.tried) throw new SyncStop('ioError');
    const merged = mergeAll(null, r.remotes);
    if (isNewer(merged)) {
      block = 'newerApp';
      set('problem', { problem: 'newerApp' });
      return;
    }
    const local = port.replica()?.doc;
    if (!local) return;
    const c: Classified | SyncChoice = choice ?? classify(local, r.remotes);
    if (c === 'ask') {
      set('needsChoice', { remote: merged ? merged.doc : undefined });
      return;
    }
    await apply(c === 'push' ? 'merge' : c, acc, r, merged);
  }

  /**
   * 고른 것을 한다. 먼저 오늘 저장본(keepCopy) — 받은 기록이 있는데 남기지 못했으면 아무것도 바꾸지 않는다.
   * 넣기(applyRemote · adopt · 새 판)는 기다림 없이, 그다음 메타(켜기 · 계정 · seen · pulledAt)와 올리기.
   */
  async function apply(choice: SyncChoice, acc: string, r: ReadResult, merged: Replica | null): Promise<void> {
    set('syncing');
    const kept = await port.keepCopy();
    if (!kept && merged && port.replica()?.doc.onboarded) throw new SyncStop('ioError');
    // ↓ 기다림 없이 — 저장소가 지금 문서로 한다
    if (merged) {
      if (choice === 'adopt') port.adopt(merged);
      else if (choice === 'mine') applyMine(port, merged, io.now());
      else applyPulled(port, merged);
    }
    const wall = io.now();
    port.updateMeta((m) => ({
      ...(merged ? observe(m, topStamp(merged), wall) : m),
      enabled: true,
      account: acc,
      seen: r.seen,
      pulledAt: wall,
    }));
    block = null;
    verified = true;
    const pushed = await pushQueued();
    finish(pushed.large);
  }

  return {
    status: () => status,
    boot: () =>
      queue(null, async () => {
        const key = await io.deviceKey();
        // 백업 복원 · 새 아이폰으로 옮긴 메타 — 새 dev로(옛 dev 파일은 다른 기기 것처럼 읽는다). 올리기 전에 한다
        port.updateMeta((m) => (m.vendor === key ? m : rekey(m, deps.random, key)));
        if (!enabled()) {
          set('off');
          return;
        }
        await cycle(true);
      }),
    changed() {
      gotGather();
      if (enabled() && status.phase !== 'needsChoice') void queue('pull', () => cycle(true));
    },
    accountChanged: (s) =>
      queue(null, async () => {
        const meta = port.meta();
        if (!meta?.enabled) return;
        if (!s.available || !s.account) {
          await unwatch();
          block = s.account ? 'driveOff' : 'noAccount';
          set('problem', { problem: block });
          return;
        }
        if (meta.account && meta.account !== s.account) {
          await disableFor('accountChanged');
          return;
        }
        block = null;
        await unwatch(); // 컨테이너가 바뀌었을 수 있다 — 질의를 새로
        await cycle(true);
      }),
    foreground: () => queue('pull', () => cycle(true)),
    local: () => queue('push', () => cycle(false)),
    background: async () => {
      const meta = port.meta();
      if (disposed || !meta?.enabled || block || !verified || status.phase === 'needsChoice') return;
      try {
        await pushQueued();
      } catch (e) {
        fail(e);
      }
    },
    sync: () =>
      queue('pull', async () => {
        if (block === 'newerApp' || block === 'accountChanged') return;
        if (block) block = null; // '지금 맞추기'는 계정을 다시 본다
        await cycle(true);
      }),
    setEnabled: (on, choice) =>
      queue(null, async () => {
        if (!on) {
          port.updateMeta((m) => (m.enabled ? { ...m, enabled: false } : m));
          await unwatch();
          block = null;
          set('off');
          return;
        }
        if (enabled() && !choice) {
          await cycle(true);
          return;
        }
        block = null;
        await decide(choice ?? null);
      }),
    choose: (choice) =>
      queue(null, async () => {
        if (status.phase !== 'needsChoice') return;
        if (choice === null) {
          port.updateMeta((m) => (m.enabled ? { ...m, enabled: false } : m));
          set('off');
          return;
        }
        // 고르는 동안 다른 기기가 또 썼을 수 있다 — 다시 모두 읽는다
        await decide(choice);
      }),
    watching: () => watchingQ,
    ownName: () => {
      const m = port.meta();
      return m ? replicaName(m.dev) : null;
    },
    dispose: () => {
      const done = chain.then(async () => {
        disposed = true;
        await unwatch();
      });
      disposed = true;
      return done;
    },
  };
}

// ── 온보딩의 살펴보기(probeRemote) ───────────────────────────────────────────

export interface RemoteProbe {
  available: boolean;
  /** iCloud에 있는 다른 기기 복제본 파일 수 */
  files: number;
}

export type ProbeNative = Pick<ICloudSyncNative, 'status' | 'start' | 'stop' | 'addListener'>;

/**
 * 맞추기를 켜지 않고 iCloud에 기록이 있는지만 본다 — 계정, 질의 시작, 첫 모으기(onChange)까지 기다려 센 뒤 멈춘다.
 * list()는 모으기 전에 비어 있으므로 쓰지 않는다. 엔진이 자기 질의를 돌리고 있으면 멈추지 않는다(질의는 하나다).
 */
export async function probe(
  native: ProbeNative,
  opts: { running: () => boolean; own?: string | null; timeoutMs?: number },
): Promise<RemoteProbe> {
  try {
    const s = await native.status();
    if (!s.available) return { available: false, files: 0 };
    let resolveNames: (names: string[] | null) => void = () => {};
    const names = new Promise<string[] | null>((resolve) => {
      resolveNames = resolve;
    });
    const sub = native.addListener('onChange', (e) => resolveNames(Array.isArray(e?.names) ? e.names : []));
    let got: string[] | null = null;
    try {
      if (!(await native.start())) return { available: false, files: 0 };
      const timer = setTimeout(() => resolveNames(null), opts.timeoutMs ?? PROBE_TIMEOUT_MS);
      got = await names;
      clearTimeout(timer);
    } finally {
      sub.remove();
      if (!opts.running()) await native.stop().catch(() => undefined);
    }
    const files = (got ?? []).filter((n) => devOfName(n) !== null && n !== opts.own).length;
    return { available: true, files };
  } catch {
    return { available: false, files: 0 };
  }
}
