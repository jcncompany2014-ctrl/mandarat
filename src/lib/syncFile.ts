// iCloud 동기화 — 복제본 파일(기기마다 한 개, Sync/v1/<dev>.jsonz). 순수 함수.
// 여기서는 JSON 글을 만들고 읽기만 한다. 압축(zlib)은 Swift가 한다(V3-F). 모양은 docs/v2/V2-F.md §4.
import type { MandaratDoc } from '../types';
import { migrate } from '../data/defaults';
import { BACKUP_SCHEMA } from './backup';
import { DEV_RE, cleanClock, cleanParts, type Parts } from './syncMeta';
import { isStamp, type Stamp } from './syncStamp';
import type { NewerReplica, Replica } from './syncMerge';

/** 복제본 파일 형식 버전 */
export const REPLICA_V = 1;
/** 복제본 폴더(iCloud 컨테이너의 숨은 Data 영역 안) */
export const REPLICA_DIR = 'Sync/v1/';
/** 이보다 큰 복제본은 알린다(압축 전 JSON 글자 수) */
export const SIZE_WARN = 2 * 1024 * 1024;

export interface ReplicaInput {
  dev: string;
  at: number;
  epoch: Stamp;
  clock: Readonly<Record<string, Stamp>>;
  parts: Readonly<Parts>;
  doc: MandaratDoc;
}

function sortedRecord<T>(o: Readonly<Record<string, T>>, map: (v: T) => T = (v) => v): Record<string, T> {
  const out: Record<string, T> = {};
  for (const k of Object.keys(o).sort()) out[k] = map(o[k]);
  return out;
}

function body(r: Omit<ReplicaInput, 'at'>) {
  return {
    v: REPLICA_V,
    schema: BACKUP_SCHEMA,
    dev: r.dev,
    epoch: r.epoch,
    // 시계·몫은 키를 정렬한다 — 같은 상태면 같은 글(올릴지 정하는 해시가 흔들리지 않게)
    clock: sortedRecord(r.clock),
    parts: sortedRecord(r.parts, (byDev) => sortedRecord(byDev)),
    doc: r.doc,
  };
}

/** 복제본 → JSON 글. schema(저장본 스키마)를 함께 싣는다 — 더 새 앱이 쓴 것은 옛 앱이 합치지 않는다 */
export function encodeReplica(r: ReplicaInput): string {
  const b = body(r);
  return JSON.stringify({ v: b.v, schema: b.schema, dev: b.dev, at: r.at, epoch: b.epoch, clock: b.clock, parts: b.parts, doc: b.doc });
}

/**
 * 글의 FNV-1a 해시 두 개(16진 16자). 글자마다 도는 고리라 JIT 없는 엔진(iOS의 Hermes)에서는 글이 길수록 그대로 느려진다 —
 * 고리 안에는 꼭 필요한 셈만 둔다(부호 없는 수로 바꾸기는 끝에 한 번: 32비트 곱과 XOR은 부호와 상관없이 같은 비트다).
 */
function digestOf(s: string): string {
  const imul = Math.imul;
  const n = s.length;
  let h1 = 0x811c9dc5 | 0;
  let h2 = 0x01000193;
  for (let i = 0; i < n; i++) {
    const c = s.charCodeAt(i);
    h1 = imul(h1 ^ c, 0x01000193);
    h2 = imul(h2 ^ c, 0x5bd1e995);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

/**
 * 올릴 내용의 지문 — 쓴 시각(at)을 뺀 상태의 FNV-1a 해시 두 개(16진 16자). 같으면 다시 올리지 않는다(SyncMeta.pushed).
 */
export function replicaDigest(r: Omit<ReplicaInput, 'at'>): string {
  return digestOf(JSON.stringify(body(r)));
}

/**
 * 올릴 글과 그 지문을 한 번에 — 큰 JSON을 한 번만 만든다(올리기마다 두 번 만들던 것).
 * 지문은 쓴 시각을 뺀 글의 것이고, 올릴 글은 그 글의 dev 뒤에 at을 끼운 것이다:
 * json은 encodeReplica(r), digest는 replicaDigest(r)와 글자 하나까지 같다(tests/syncMerge.test.js가 지킨다).
 */
export function encodeForPush(r: ReplicaInput): { json: string; digest: string } {
  const b = body(r);
  const bare = JSON.stringify(b);
  const digest = digestOf(bare);
  const at = JSON.stringify(r.at);
  if (at === undefined) return { json: bare, digest };
  // bare는 head의 닫는 중괄호 자리에서 ',"epoch":…'으로 이어진다 — 그 사이가 encodeReplica의 at 자리다(v · schema · dev · at · epoch …)
  const head = JSON.stringify({ v: b.v, schema: b.schema, dev: b.dev });
  return { json: `${head.slice(0, -1)},"at":${at}${bare.slice(head.length - 1)}`, digest };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * JSON 글 → 복제본. 모양이 하나라도 틀리면 null(깨진 파일은 합치지 않는다 — 고쳐 읽으면 지운 표시나 도장을 잃는다).
 * 이 앱보다 새 schema면 { newer: true }(합치지 않는다).
 */
export function decodeReplica(json: string): Replica | NewerReplica | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(raw) || raw.v !== REPLICA_V) return null;
  const { schema, dev, at, epoch, clock, parts, doc } = raw;
  if (typeof schema !== 'number' || !Number.isInteger(schema) || schema < 1) return null;
  if (typeof dev !== 'string' || !DEV_RE.test(dev)) return null;
  if (schema > BACKUP_SCHEMA) return { newer: true, schema, dev };
  if (at !== undefined && (typeof at !== 'number' || !Number.isFinite(at) || at < 0)) return null;
  if (epoch !== '' && !isStamp(epoch)) return null;
  if (!isRecord(clock) || !isRecord(parts) || !isRecord(doc) || !Array.isArray(doc.themes)) return null;
  const cleanC = cleanClock(clock);
  if (Object.keys(cleanC).length !== Object.keys(clock).length) return null;
  const cleanP = cleanParts(parts);
  if (canonParts(cleanP) !== canonParts(parts)) return null;
  return {
    dev,
    ...(typeof at === 'number' ? { at } : {}),
    epoch: epoch as Stamp,
    clock: cleanC,
    parts: cleanP,
    doc: migrate(doc),
  };
}

function canonParts(p: Record<string, unknown>): string {
  return JSON.stringify(sortedRecord(p as Record<string, Record<string, unknown>>, (byDev) => (isRecord(byDev) ? sortedRecord(byDev) : byDev)));
}

/** 이 기기의 복제본 파일 이름 */
export function replicaName(dev: string): string {
  return `${REPLICA_DIR}${dev}.jsonz`;
}

/** 파일 이름 → 기기 아이디(복제본 파일이 아니면 null) */
export function devOfName(name: string): string | null {
  if (!name.startsWith(REPLICA_DIR) || !name.endsWith('.jsonz')) return null;
  const dev = name.slice(REPLICA_DIR.length, -'.jsonz'.length);
  return DEV_RE.test(dev) ? dev : null;
}
