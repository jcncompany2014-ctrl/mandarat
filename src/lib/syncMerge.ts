// iCloud 동기화의 합치기 — 복제본 둘을 하나로(상태 기반 join). 순수 함수.
// 규칙(§7.1 merge, §7.3 materialize)은 docs/v2/V2-F.md가 단일 출처다. 이 파일을 고치면 그 문서도 고친다.
//
// 복제본 = 문서 + 시계(경로 → 도장) + 판(epoch) + 카운터 몫. 경로별로:
// - 보통 레지스터: 유효 도장(eff, 판 E 이하는 '')이 큰 쪽의 값. 같으면 rank가 큰 쪽(값 > 값 없음).
// - 카운터: 바탕 b는 위와 같이 고르고, 몫 p는 기기마다 더한 합·뺀 합의 큰 쪽(판이 E인 복제본의 몫만).
//   그날 더한 수(c/<k>/log/<day>)는 없으면 0이다(지운 표시가 아니다) — 한 기기의 되돌리기가 다른 기기의 +1을 지우지 않는다.
// - 판 E = 두 쪽 판 중 큰 것. 판이 E보다 낮은 복제본에서는 E보다 큰 도장이 붙은 값만 남고, 카운터는 모두 빠진다.
// 결과 문서의 기기마다의 필드(todayDate)와 목록 순서는 L에서 온다.
import type { MandaratDoc } from '../types';
import { extraLogKey, kindOf } from './routine';
import type { Parts, PNPart, SyncMeta } from './syncMeta';
import { eff, maxStamp, type Stamp } from './syncStamp';
import { assemble, canon, partsSum, project, rank, type Json } from './syncProject';

/** 한 기기의 복제본 — 파일(syncFile)로 오가고, 합치면 새 복제본이 된다 */
export interface Replica {
  /** 이 복제본을 쓴 기기(합친 결과는 L의 기기) */
  dev: string;
  /** 파일에 쓴 시각(ms) — 합치기에는 쓰지 않는다 */
  at?: number;
  epoch: Stamp;
  clock: Readonly<Record<string, Stamp>>;
  parts: Readonly<Parts>;
  /** migrate를 거친 문서 */
  doc: MandaratDoc;
}

/** 이 앱보다 새 스키마로 쓴 복제본 — 합치지 않는다(모르는 필드를 덮어쓰지 않게, V4-A newerApp) */
export interface NewerReplica {
  newer: true;
  schema: number;
  dev?: string;
}

export function isNewer(r: Replica | NewerReplica | null | undefined): r is NewerReplica {
  return !!r && (r as NewerReplica).newer === true;
}

/** 이 기기의 문서·메타 → 복제본 */
export function replicaOf(doc: MandaratDoc, meta: Pick<SyncMeta, 'dev' | 'epoch' | 'clock' | 'parts'>): Replica {
  return { dev: meta.dev, epoch: meta.epoch, clock: meta.clock, parts: meta.parts, doc };
}

/** 복제본의 가장 큰 도장(판 포함) — 받은 뒤 observe(meta, topStamp(R), wall)로 이 기기 시계를 그 뒤로 당긴다(V4-A) */
export function topStamp(R: Pick<Replica, 'epoch' | 'clock'>): Stamp {
  let top = R.epoch;
  for (const p of Object.keys(R.clock)) if (R.clock[p] > top) top = R.clock[p];
  return top;
}

/** 합친 복제본의 시계·몫·판을 이 기기 메타에 — 나머지(dev·last·seen…)는 그대로 */
export function adoptMerged(meta: SyncMeta, merged: Pick<Replica, 'epoch' | 'clock' | 'parts'>): SyncMeta {
  return { ...meta, epoch: merged.epoch, clock: { ...merged.clock }, parts: clonePartsOf(merged.parts) };
}

function clonePartsOf(parts: Readonly<Parts>): Parts {
  const out: Parts = {};
  for (const p of Object.keys(parts)) {
    const byDev: Record<string, PNPart> = {};
    for (const d of Object.keys(parts[p])) byDev[d] = [parts[p][d][0], parts[p][d][1]];
    out[p] = byDev;
  }
  return out;
}

// ── 한 경로의 값 ────────────────────────────────────────────────────────────

/** 보통 레지스터 하나 — s: 유효 도장, v: 값(null = 없음) */
interface Reg { s: Stamp; v: Json }
/** 카운터 하나 — has: 값이 있는가(그날 더한 수는 늘 있다), b: 바탕(1/100 단위) */
interface Ctr { s: Stamp; has: boolean; b: number }

/**
 * 카운터 종류 — 0: 카운터 아님, 1: 누적 집중·쌓기 수, 2: 그날 더한 수(없으면 0으로 본다).
 * isCounterPath와 같은 판정을 조각으로 나누지 않고 한다(합치기에서 경로마다 부른다).
 */
function ctrKind(p: string): 0 | 1 | 2 {
  if (p === 'fm') return 1;
  if (p.charCodeAt(0) !== 99 /* c */ || p.charCodeAt(1) !== 47 /* / */) return 0;
  const i = p.indexOf('/', 2);
  if (i < 0) return 0;
  if (p.length === i + 2 && p.charCodeAt(i + 1) === 110 /* n */) return 1;
  return p.startsWith('log/', i + 1) && p.indexOf('/', i + 5) < 0 ? 2 : 0;
}

function own(o: object, k: string): boolean {
  return Object.prototype.hasOwnProperty.call(o, k);
}

/** 이 경로의 바탕(b) — 카운터 값 {b, p}에서 */
function baseOf(v: Json | undefined): number | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const b = (v as Record<string, Json>).b;
  return typeof b === 'number' && Number.isSafeInteger(b) ? b : null;
}

/** 합치기의 바탕 상태 — 경로별 값(project 모양, 카운터는 {b, p})·시계·몫·판. 합치기는 이 상태 위의 join이다 */
export interface SyncState {
  epoch: Stamp;
  clock: Readonly<Record<string, Stamp>>;
  parts: Readonly<Parts>;
  values: ReadonlyMap<string, Json>;
}

/** 복제본 → 상태(문서를 경로별 값으로 펼친다) */
export function stateOf(R: Pick<Replica, 'epoch' | 'clock' | 'parts' | 'doc'>): SyncState {
  return { epoch: R.epoch, clock: R.clock, parts: R.parts, values: project(R.doc, R.parts as Parts) };
}

interface Lifted {
  regs: Map<string, Reg>;
  ctrs: Map<string, Ctr>;
  /** 판이 E인 상태의 카운터 몫(E보다 낮으면 비어 있다) */
  parts: Readonly<Parts>;
}

/**
 * 상태를 판 E 위로 올린다 — 경로마다 유효 도장과 값.
 * - 판이 E보다 낮으면: E 이하 도장(과 도장 없는 값)은 초기화로 지워진 것, 카운터는 모두 빠진다.
 * - 그날 더한 수가 없으면 합이 0인 카운터(b = −Σp)로 본다.
 */
function lift(S: SyncState, E: Stamp): Lifted {
  const current = S.epoch === E;
  const regs = new Map<string, Reg>();
  const ctrs = new Map<string, Ctr>();
  const paths = new Set<string>(S.values.keys());
  for (const p of Object.keys(S.clock)) paths.add(p);
  if (current) for (const p of Object.keys(S.parts)) if (ctrKind(p) !== 0) paths.add(p);
  for (const p of paths) {
    if (p === '__proto__') continue;
    const s = eff(S, p, E);
    const raw = S.values.get(p);
    const kind = ctrKind(p);
    if (kind !== 0) {
      if (!current) continue;
      const b = baseOf(raw);
      if (b !== null) ctrs.set(p, { s, has: true, b });
      else if (kind === 2) ctrs.set(p, { s, has: true, b: 0 - partsSum(own(S.parts, p) ? S.parts[p] : undefined) });
      else ctrs.set(p, { s, has: false, b: 0 });
      continue;
    }
    // 판이 낮은 쪽의, 판보다 앞선 값은 지워진 것이다
    const v = raw === undefined || (!current && s === '') ? null : raw;
    if (v === null && s === '') continue;
    regs.set(p, { s, v });
  }
  return { regs, ctrs, parts: current ? S.parts : {} };
}

/** 값 객체의 rank — 레지스터 값은 고치지 않는 객체라서 객체마다 한 번만 센다(여러 복제본을 접을 때 같은 객체가 다시 온다) */
const rankCache = new WeakMap<object, string>();
function rankOf(v: Json): string {
  if (!v || typeof v !== 'object') return rank(v);
  let r = rankCache.get(v);
  if (r === undefined) {
    r = rank(v);
    rankCache.set(v, r);
  }
  return r;
}

/** 이기는 쪽 — 큰 쪽이 a면 true */
function regWins(a: Reg, b: Reg): boolean {
  if (a.s !== b.s) return a.s > b.s;
  if (a.v === b.v) return true;
  return rankOf(a.v) >= rankOf(b.v);
}

function ctrRank(c: Ctr): string {
  return c.has ? `1${canon(c.b)}` : '0';
}

function ctrWins(a: Ctr, b: Ctr): boolean {
  if (a.s !== b.s) return a.s > b.s;
  return ctrRank(a) >= ctrRank(b);
}

/** 몫 합치기 — 경로·기기마다 [더한 합, 뺀 합]의 큰 쪽 */
function joinParts(a: Readonly<Parts>, b: Readonly<Parts>): Parts {
  const out: Parts = {};
  for (const src of [a, b]) {
    for (const p of Object.keys(src)) {
      if (ctrKind(p) === 0 || p === '__proto__') continue;
      const byDev = src[p];
      const dst = own(out, p) ? out[p] : (out[p] = {});
      for (const d of Object.keys(byDev)) {
        if (d === '__proto__') continue;
        const [inc, dec] = byDev[d];
        const cur = own(dst, d) ? dst[d] : null;
        dst[d] = cur ? [Math.max(cur[0], inc), Math.max(cur[1], dec)] : [inc, dec];
      }
    }
  }
  for (const p of Object.keys(out)) if (Object.keys(out[p]).length === 0) delete out[p];
  return out;
}

/**
 * 상태 둘의 join(§7.1) — 교환·결합·멱등이 정확히 성립한다(tests/syncMerge.test.js).
 * 그날 더한 수는 합이 0 이하여도 값으로 남긴다(문서로 지을 때 빠진다).
 */
export function joinStates(A: SyncState, X: SyncState): SyncState {
  const E = maxStamp(A.epoch, X.epoch);
  const a = lift(A, E);
  const b = lift(X, E);
  const clock: Record<string, Stamp> = {};
  const values = new Map<string, Json>();

  for (const [p, ra] of a.regs) {
    const rb = b.regs.get(p);
    const w = rb && !regWins(ra, rb) ? rb : ra;
    const s = rb ? maxStamp(ra.s, rb.s) : ra.s;
    if (s) clock[p] = s;
    if (w.v !== null) values.set(p, w.v);
  }
  for (const [p, rb] of b.regs) {
    if (a.regs.has(p)) continue;
    if (rb.s) clock[p] = rb.s;
    if (rb.v !== null) values.set(p, rb.v);
  }

  const parts = joinParts(a.parts, b.parts);
  const ctrPaths = new Set<string>([...a.ctrs.keys(), ...b.ctrs.keys()]);
  for (const p of ctrPaths) {
    const ca = a.ctrs.get(p);
    const cb = b.ctrs.get(p);
    const w = ca && cb ? (ctrWins(ca, cb) ? ca : cb) : ((ca ?? cb) as Ctr);
    const s = ca && cb ? maxStamp(ca.s, cb.s) : w.s;
    if (s) clock[p] = s;
    if (w.has) values.set(p, { b: w.b, p: (own(parts, p) ? parts[p] : {}) as unknown as Json });
  }
  return { epoch: E, clock, parts, values };
}

/**
 * 두 복제본을 하나로 — joinStates를 문서로 짓는다(assemble). 결과의 dev·todayDate·목록 순서는 L에서 온다.
 * 문서는 기기마다의 필드와 목록 순서를 빼면 교환·결합·멱등이다. 다만 문서가 담을 수 없는 값
 * (함께 줄여 0 밑으로 간 수, 누적 집중보다 큰 집중 시작점, 31장째 지난 표)은 assemble·migrate가 잘라 내므로,
 * 그런 값이 생긴 합치기에서만 순서에 따라 그 경로의 결과가 다를 수 있다(docs/v2/V2-F.md §7.2).
 */
export function merge(L: Replica, X: Replica): Replica {
  const j = joinStates(stateOf(L), stateOf(X));
  return { dev: L.dev, epoch: j.epoch, clock: j.clock, parts: j.parts, doc: assemble(j.values, L.doc) };
}

/**
 * 여러 복제본을 한 번에 — 기기 아이디 순서로 접는다(같은 입력이면 늘 같은 결과).
 * 하나라도 이 앱보다 새 스키마면 아무것도 합치지 않고 그것을 돌려준다(V4-A newerApp).
 * local이 null이면 첫 복제본이 L 자리에 선다(순서·todayDate). 아무것도 없으면 null.
 */
export function mergeAll(local: Replica, remotes: readonly (Replica | NewerReplica)[]): Replica | NewerReplica;
export function mergeAll(local: Replica | null, remotes: readonly (Replica | NewerReplica)[]): Replica | NewerReplica | null;
export function mergeAll(local: Replica | null, remotes: readonly (Replica | NewerReplica)[]): Replica | NewerReplica | null {
  const newer = remotes.find(isNewer);
  if (newer) return newer;
  const list = (remotes as readonly Replica[]).slice().sort((x, y) => (x.dev < y.dev ? -1 : x.dev > y.dev ? 1 : 0));
  let acc = local;
  for (const r of list) acc = acc ? merge(acc, r) : r;
  return acc;
}

// ── 합친 뒤의 문서 다듬기(§7.3) ───────────────────────────────────────────

/**
 * 합친 문서를 앱이 쓰는 모양으로 맞춘다. 더하기만 한다(어느 기기의 기록도 지우지 않는다).
 * - M1 쌓기 칸: 그날 더한 수가 있는 날은 그날 기록(dayLog)에도 그 칸이 있다.
 * - M2 직접 추가한 할 일: 오늘(todayDate) 기록에 있으면 한 것, 한 것이면 오늘 기록에도 있다.
 * - M3 하루 정리(rolloverToday)는 기기 날짜로 저장소가 한다 — 여기서 하지 않는다.
 * 바뀐 것이 없으면 같은 객체.
 */
export function materialize(doc: MandaratDoc): MandaratDoc {
  let dayLog = doc.dayLog;
  const addKey = (day: string, key: string) => {
    const list = own(dayLog, day) ? dayLog[day] : [];
    if (list.includes(key)) return;
    if (dayLog === doc.dayLog) dayLog = { ...doc.dayLog };
    dayLog[day] = [...list, key];
  };
  // M1
  doc.themes.forEach((t, ti) => t.actions.forEach((a, ai) => {
    if (!a.log || kindOf(a) !== 'count') return;
    for (const day of Object.keys(a.log)) if (a.log[day] > 0) addKey(day, `${ti}-${ai}`);
  }));
  // M2
  let todayExtra = doc.todayExtra;
  const today = doc.todayDate;
  if (today) {
    const logged = new Set(own(dayLog, today) ? dayLog[today] : []);
    todayExtra = doc.todayExtra.map((x) => (!x.done && logged.has(extraLogKey(x.ti, x.id)) ? { ...x, done: true } : x));
    if (todayExtra.every((x, i) => x === doc.todayExtra[i])) todayExtra = doc.todayExtra;
    for (const x of todayExtra) if (x.done) addKey(today, extraLogKey(x.ti, x.id));
  }
  if (dayLog === doc.dayLog && todayExtra === doc.todayExtra) return doc;
  return { ...doc, dayLog, todayExtra };
}
