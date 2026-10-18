// iCloud 동기화 메타 — 저장본 봉투 _sync에 문서와 나란히 둔다(문서 MandaratDoc에는 들어가지 않는다).
// 순수 함수. 모양과 규칙은 docs/v2/V1-F.md §2.
import { DATE_RE } from '../data/defaults';
import { STAMP_RE, TAG_SPACE, ctrOf, enc, isStamp, msOf, type Stamp } from './syncStamp';

export const SYNC_META_V = 1;
/** 기기 아이디 — 소문자 36진수(새로 만들면 16자). 복제본 파일 이름 Sync/v1/<dev>.jsonz와 PN 카운터 몫의 키 */
export const DEV_RE = /^[0-9a-z]{8,32}$/;
const DEV_LEN = 16;

/** 한 기기의 PN 카운터 몫 [더한 합, 뺀 합] — 0 이상 정수(단위는 docs/v2/V1-F.md §3의 1/100) */
export type PNPart = [number, number];
/** 카운터 경로 → 기기 → 몫 */
export type Parts = Record<string, Record<string, PNPart>>;

export interface SyncMeta {
  v: 1;
  /** 이 기기 아이디 */
  dev: string;
  /** 도장 꼬리표 = tagOf(dev) */
  tag: string;
  /** 이 기기 열쇠(V3-F deviceKey(), 백업되지 않는다) — 다르면 복원·복제된 메타라 rekey한다 */
  vendor?: string;
  /** 이 기기가 마지막으로 내거나 받아들인 도장 — 다음 tick은 이것보다 크다 */
  last: Stamp;
  /** 판 — 이 도장 이하의 도장은 초기화로 지워진 값이다('' = 초기화한 적 없음) */
  epoch: Stamp;
  /** 경로 → 마지막으로 바꾼 도장(값이 없는 경로의 도장은 지운 표시) */
  clock: Record<string, Stamp>;
  /** 카운터 경로의 기기별 몫 */
  parts: Parts;
  /** 이 기기에서 동기화를 켰는가 */
  enabled: boolean;
  /** 동기화를 켤 때의 iCloud 계정 표시 — 바뀌면 끈다(V4-A) */
  account?: string;
  /** 읽은 다른 기기 파일 → 그때의 수정 시각(ms) */
  seen: Record<string, number>;
  /** 마지막으로 올린 복제본의 해시 — 같으면 다시 올리지 않는다 */
  pushed?: string;
  /** 마지막으로 받아 합친 시각(ms) */
  pulledAt?: number;
  /** 마지막으로 오래된 지운 표시를 치운 날 'YYYY-MM-DD' */
  gcDay?: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/** JSON.parse가 만든 '__proto__' 키는 담으면 프로토타입이 바뀐다 — 경로·이름으로 받지 않는다 */
function okKey(k: string): boolean {
  return k !== '' && k !== '__proto__';
}

function own(o: Record<string, unknown>, k: string): boolean {
  return Object.prototype.hasOwnProperty.call(o, k);
}

/** FNV-1a 32비트 — 기기 아이디 → 꼬리표 */
function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** 기기 아이디 → 4자 꼬리표(fnv1a32 mod 36^4) */
export function tagOf(dev: string): string {
  return (fnv1a32(dev) % TAG_SPACE).toString(36).padStart(4, '0');
}

function randomDev(random: () => number): string {
  let out = '';
  for (let i = 0; i < DEV_LEN; i++) {
    const r = random();
    const n = Number.isFinite(r) ? Math.min(35, Math.max(0, Math.floor(r * 36))) : 0;
    out += n.toString(36);
  }
  return out;
}

/** 처음 켜는 기기의 메타 — 시계·판·도장은 비어 있고 동기화는 꺼져 있다 */
export function newSyncMeta(random: () => number, vendor?: string): SyncMeta {
  const dev = randomDev(random);
  return {
    v: SYNC_META_V, dev, tag: tagOf(dev),
    ...(vendor ? { vendor } : {}),
    last: '', epoch: '', clock: {}, parts: {}, enabled: false, seen: {},
  };
}

/**
 * 다른 기기의 메타였다(백업 복원·새 아이폰으로 옮김) — 새 dev·tag·vendor로 바꾸고 시계·몫·판은 그대로 둔다.
 * 원래 기기의 몫은 원래 dev 아래 남고, 여기서 더하는 수는 새 dev 몫에 쌓인다. 새 파일 이름이라 pushed는 지운다.
 */
export function rekey(meta: SyncMeta, random: () => number, vendor: string): SyncMeta {
  let dev = randomDev(random);
  for (let i = 0; dev === meta.dev && i < 8; i++) dev = randomDev(random);
  const tag = tagOf(dev);
  const { pushed: _drop, ...rest } = meta;
  return {
    ...rest, dev, tag, vendor,
    last: meta.last ? enc(msOf(meta.last), ctrOf(meta.last), tag) : '',
  };
}

function cleanPart(v: unknown): PNPart | null {
  if (!Array.isArray(v) || v.length !== 2) return null;
  const [p, n] = v;
  const ok = (x: unknown) => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0;
  return ok(p) && ok(n) ? [p + 0, n + 0] : null;
}

/** 몫 — 경로·기기 키와 [더한 합, 뺀 합]이 맞는 것만 */
export function cleanParts(v: unknown): Parts {
  const out: Parts = {};
  if (!isRecord(v)) return out;
  for (const path of Object.keys(v)) {
    const byDev = v[path];
    if (!okKey(path) || !isRecord(byDev)) continue;
    const devs: Record<string, PNPart> = {};
    for (const dev of Object.keys(byDev)) {
      const part = DEV_RE.test(dev) ? cleanPart(byDev[dev]) : null;
      if (part) devs[dev] = part;
    }
    if (Object.keys(devs).length > 0) out[path] = devs;
  }
  return out;
}

/** 시계 — 경로가 비지 않고 도장 형식이 맞는 것만 */
export function cleanClock(v: unknown): Record<string, Stamp> {
  const out: Record<string, Stamp> = {};
  if (!isRecord(v)) return out;
  for (const path of Object.keys(v)) {
    const s = v[path];
    if (okKey(path) && isStamp(s)) out[path] = s;
  }
  return out;
}

/**
 * 저장본에서 읽은 _sync — 너그럽게 고친다. 버전·기기 아이디가 깨졌으면 null(새로 만들어야 한다).
 * - tag는 늘 tagOf(dev)로 다시 셈한다.
 * - last는 판과 시계의 모든 도장 이상으로 올린다 — 그래야 다음 tick이 이미 있는 도장보다 크다.
 * - 깨진 항목은 하나씩 버리고 나머지는 남긴다.
 */
export function cleanSyncMeta(v: unknown): SyncMeta | null {
  if (!isRecord(v) || v.v !== SYNC_META_V || typeof v.dev !== 'string' || !DEV_RE.test(v.dev)) return null;
  const dev = v.dev;
  const tag = tagOf(dev);
  const epoch = isStamp(v.epoch) ? v.epoch : '';
  const clock = cleanClock(v.clock);
  // 시계 부분(ms·카운터)이 가장 큰 도장 — 꼬리표는 이 기기 것으로 다시 붙인다
  let top = typeof v.last === 'string' && STAMP_RE.test(v.last) ? v.last.slice(0, 11) : '';
  if (epoch.slice(0, 11) > top) top = epoch.slice(0, 11);
  for (const s of Object.values(clock)) if (s.slice(0, 11) > top) top = s.slice(0, 11);
  const last = top ? top + tag : '';
  const seen: Record<string, number> = {};
  if (isRecord(v.seen)) {
    for (const name of Object.keys(v.seen)) {
      const at = v.seen[name];
      if (okKey(name) && typeof at === 'number' && Number.isFinite(at)) seen[name] = at + 0;
    }
  }
  const str = (k: string) => (own(v, k) && typeof v[k] === 'string' && (v[k] as string) !== '' ? (v[k] as string) : undefined);
  const vendor = str('vendor');
  const account = str('account');
  const pushed = str('pushed');
  const pulledAt = typeof v.pulledAt === 'number' && Number.isFinite(v.pulledAt) && v.pulledAt >= 0 ? v.pulledAt + 0 : undefined;
  const gcDay = typeof v.gcDay === 'string' && DATE_RE.test(v.gcDay) ? v.gcDay : undefined;
  return {
    v: SYNC_META_V, dev, tag,
    ...(vendor ? { vendor } : {}),
    last, epoch, clock, parts: cleanParts(v.parts), enabled: v.enabled === true,
    ...(account ? { account } : {}),
    seen,
    ...(pushed ? { pushed } : {}),
    ...(pulledAt !== undefined ? { pulledAt } : {}),
    ...(gcDay ? { gcDay } : {}),
  };
}
