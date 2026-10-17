// iCloud 동기화의 시계 — 하이브리드 논리 시계(HLC). 순수 함수(docs/v2/V1-F.md §1).
//
// 도장(Stamp)은 15자 문자열: 밀리초 36진수 9자 + 카운터 36진수 2자 + 기기 꼬리표 4자.
// 같은 길이·소문자 36진수라서 문자열 비교가 곧 (ms, 카운터, 꼬리표) 순서다. ''는 "도장 없음"이고 모든 도장보다 작다.

export type Stamp = string;

/** 밀리초 자리 수 — 36^9 ms ≈ 서기 5000년 */
const MS_LEN = 9;
const CTR_LEN = 2;
const TAG_LEN = 4;
export const STAMP_LEN = MS_LEN + CTR_LEN + TAG_LEN;
/** 같은 밀리초 안에서 셀 수 있는 마지막 카운터(36^2 − 1) — 넘으면 다음 밀리초로 넘어간다 */
export const CTR_MAX = 36 ** CTR_LEN - 1;
const MS_MAX = 36 ** MS_LEN - 1;
/** 꼬리표 공간 36^4 */
export const TAG_SPACE = 36 ** TAG_LEN;
/** 다른 기기 시계를 믿는 한계 — 내 벽시계보다 24시간 넘게 앞선 도장은 받아들이지 않는다 */
export const MAX_SKEW_MS = 24 * 60 * 60 * 1000;

export const STAMP_RE = /^[0-9a-z]{15}$/;
export const TAG_RE = /^[0-9a-z]{4}$/;

function pad36(n: number, len: number): string {
  return n.toString(36).padStart(len, '0');
}

/** 도장 형식이 맞는가('' 는 아니다) */
export function isStamp(s: unknown): s is Stamp {
  return typeof s === 'string' && STAMP_RE.test(s);
}

/** (ms, 카운터, 꼬리표) → 도장. 범위를 벗어나면 던진다(부르는 쪽 버그) */
export function enc(ms: number, ctr: number, tag: string): Stamp {
  if (!Number.isSafeInteger(ms) || ms < 0 || ms > MS_MAX) throw new RangeError(`stamp ms out of range: ${ms}`);
  if (!Number.isInteger(ctr) || ctr < 0 || ctr > CTR_MAX) throw new RangeError(`stamp counter out of range: ${ctr}`);
  if (!TAG_RE.test(tag)) throw new RangeError(`bad device tag: ${tag}`);
  return pad36(ms, MS_LEN) + pad36(ctr, CTR_LEN) + tag;
}

/** 도장의 밀리초('' 는 0) */
export function msOf(s: Stamp): number {
  return s ? parseInt(s.slice(0, MS_LEN), 36) : 0;
}

/** 도장의 카운터('' 는 0) */
export function ctrOf(s: Stamp): number {
  return s ? parseInt(s.slice(MS_LEN, MS_LEN + CTR_LEN), 36) : 0;
}

/** 도장의 기기 꼬리표('' 는 '') */
export function tagOfStamp(s: Stamp): string {
  return s ? s.slice(MS_LEN + CTR_LEN) : '';
}

/** 둘 중 나중 도장 */
export function maxStamp(a: Stamp, b: Stamp): Stamp {
  return a >= b ? a : b;
}

/** 꼬리표를 뺀 시계 부분 — HLC의 (ms, 카운터) 비교에 쓴다 */
function hlcPart(s: Stamp): string {
  return s ? s.slice(0, MS_LEN + CTR_LEN) : '';
}

/** 시계 상태 — SyncMeta의 일부(last: 이 기기가 마지막으로 내거나 받아들인 시각, tag: 이 기기 꼬리표) */
export interface ClockState {
  last: Stamp;
  tag: string;
}

/**
 * 새 도장 하나 — 늘 last보다 크다(단조 증가).
 * 벽시계가 last보다 앞서면 (wall, 0), 아니면 (last.ms, 카운터 + 1). 카운터가 CTR_MAX를 넘으면 다음 밀리초 (ms + 1, 0).
 */
export function tick<T extends ClockState>(meta: T, wall: number): { meta: T; stamp: Stamp } {
  const lastMs = msOf(meta.last);
  const w = Math.max(0, Math.min(MS_MAX, Math.floor(Number.isFinite(wall) ? wall : 0)));
  let ms: number;
  let ctr: number;
  if (!meta.last || w > lastMs) {
    ms = w;
    ctr = 0;
  } else if (ctrOf(meta.last) < CTR_MAX) {
    ms = lastMs;
    ctr = ctrOf(meta.last) + 1;
  } else {
    ms = lastMs + 1;
    ctr = 0;
  }
  const stamp = enc(ms, ctr, meta.tag);
  return { meta: { ...meta, last: stamp }, stamp };
}

/**
 * 다른 기기의 가장 큰 도장을 보았다 — 내 시계를 그 뒤로 당긴다(다음 tick이 그것보다 크게).
 * 그 도장이 내 벽시계보다 MAX_SKEW_MS 넘게 앞서면(고장 난 시계) 받아들이지 않고 meta를 그대로 돌려준다.
 */
export function observe<T extends ClockState>(meta: T, remoteMax: Stamp, wall: number): T {
  if (!isStamp(remoteMax)) return meta;
  if (msOf(remoteMax) > wall + MAX_SKEW_MS) return meta;
  if (hlcPart(remoteMax) <= hlcPart(meta.last)) return meta;
  return { ...meta, last: enc(msOf(remoteMax), ctrOf(remoteMax), meta.tag) };
}

/** 도장이 붙은 복제본의 모양 — 판(epoch)과 경로별 도장 */
export interface Clocked {
  epoch: Stamp;
  clock: Readonly<Record<string, Stamp>>;
}

/**
 * 경로 p의 유효 도장 — 판 E(기본은 R.epoch) 이하의 도장은 초기화로 지워진 것으로 보아 ''.
 * 합칠 때는 두 쪽 판 중 큰 것을 E로 넘긴다(V2-F).
 */
export function eff(R: Clocked, p: string, E: Stamp = R.epoch): Stamp {
  const s = Object.prototype.hasOwnProperty.call(R.clock, p) ? R.clock[p] : '';
  return isStamp(s) && s > E ? s : '';
}
