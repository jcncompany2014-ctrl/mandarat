// iCloud 동기화 — 이 기기에서 바꾼 것에 도장 찍기, 초기화(새 판), 오래된 지운 표시 치우기. 순수 함수.
// 규칙(§7.4)은 docs/v2/V2-F.md. 경로와 값은 project(syncProject)와 똑같아야 한다(tests/syncLocal.test.js가 지킨다).
//
// stampLocal(prev, next, meta, wall): 저장할 때마다 부른다. 바뀐 경로에 도장 하나를 함께 찍고,
//   카운터(누적 집중·쌓기 수·그날 더한 수)의 바뀐 만큼은 이 기기 몫에 넣는다(reattribute).
//   빠른 길: 문서의 갈래(설정·영역·칸·날…)를 참조로 비교해, 같은 참조는 건너뛴다.
import type { Action, ArchivedChart, MandaratDoc, Settings, TodayExtra, WeekReviewEntry } from '../types';
import { ymd } from './routine';
import type { Parts, PNPart, SyncMeta } from './syncMeta';
import { msOf, tick, type Stamp } from './syncStamp';
import { CFG_KEYS, canon, isCounterPath, isElementPath, pathOf, project, toUnits } from './syncProject';

/** 지운 표시를 남겨 두는 날 수 — 이보다 오래 받지 않은 기기는 묻고 합친다(isStale, V4-A) */
export const SYNC_TTL_DAYS = 180;
export const SYNC_TTL_MS = SYNC_TTL_DAYS * 24 * 60 * 60 * 1000;

type Emit = (path: string, v: unknown) => void;

function own(o: object, k: string): boolean {
  return Object.prototype.hasOwnProperty.call(o, k);
}

// ── 갈래별 값(project와 같은 경로·같은 값, 카운터는 문서의 수 그대로) ──────────

function rootRegs(d: MandaratDoc, put: Emit): void {
  put('ob', d.onboarded);
  put('cg', d.centerGoal);
  put('ce', d.centerGoalEn);
  put('as', d.areasSet ?? false);
  put('fm', d.focusMinutes);
  if (d.chartStart !== undefined) put('cs', d.chartStart);
  if (d.focusStart !== undefined) put('fs', d.focusStart);
}

function settingsRegs(s: Settings, put: Emit): void {
  put('s/mood', s.mood);
  put('s/accent', s.accent);
  put('s/mgmt', s.mgmt);
  put('s/cellShape', s.cellShape);
  if (s.lastBackupAt !== undefined) put('s/lastBackupAt', s.lastBackupAt);
  if (s.reminders?.morning !== undefined) put('s/reminders/morning', s.reminders.morning);
  if (s.reminders?.evening !== undefined) put('s/reminders/evening', s.reminders.evening);
  if (s.reminders?.review !== undefined) put('s/reminders/review', s.reminders.review);
  if (s.paper !== undefined) put('s/paper', s.paper);
}

function themeHeadRegs(t: MandaratDoc['themes'][number], ti: number, put: Emit): void {
  put(pathOf('t', ti, 'title'), t.title);
  put(pathOf('t', ti, 'color'), t.color);
  put(pathOf('t', ti, 'icon'), t.icon);
}

function cellRegs(a: Action, k: string, put: Emit): void {
  put(pathOf('c', k, 'text'), a.text);
  put(pathOf('c', k, 'note'), a.note);
  put(pathOf('c', k, 'done'), a.done);
  const cfg: Record<string, unknown> = {};
  for (const f of CFG_KEYS) if (a[f] !== undefined) cfg[f] = a[f];
  put(pathOf('c', k, 'cfg'), cfg);
  if (a.count !== undefined) put(pathOf('c', k, 'n'), a.count);
  for (const day of Object.keys(a.log ?? {})) put(pathOf('c', k, 'log', day), (a.log as Record<string, number>)[day]);
  for (const wk of Object.keys(a.ratings ?? {})) put(pathOf('c', k, 'r', wk), (a.ratings as Record<string, number>)[wk]);
}

function tkRegs(keys: readonly string[], put: Emit): void {
  for (const k of keys) put(pathOf('tk', k), true);
}

function extraRegs(xs: readonly TodayExtra[], put: Emit): void {
  for (const x of xs) {
    put(pathOf('x', x.id), { ti: x.ti, text: x.text });
    put(pathOf('x', x.id, 'done'), x.done);
  }
}

function dayRegs(day: string, keys: readonly string[] | undefined, put: Emit): void {
  for (const key of keys ?? []) put(pathOf('d', day, key), true);
}

function metaRegs(day: string, m: { mood?: number; reflection?: string } | undefined, put: Emit): void {
  if (!m) return;
  if (m.mood !== undefined) put(pathOf('m', day, 'mood'), m.mood);
  if (m.reflection !== undefined) put(pathOf('m', day, 'refl'), m.reflection);
}

// ── 바뀐 경로 ────────────────────────────────────────────────────────────────

/** 경로 → 바뀌기 전·뒤 값(카운터는 수, 없으면 undefined) */
export type Changes = Map<string, { from: unknown; to: unknown }>;

function diffWith(out: Changes, emitPrev: (put: Emit) => void, emitNext: (put: Emit) => void): void {
  const before = new Map<string, unknown>();
  emitPrev((p, v) => before.set(p, v));
  const after = new Map<string, unknown>();
  emitNext((p, v) => after.set(p, v));
  for (const [p, v] of after) {
    const was = before.get(p);
    if (!before.has(p) || canon(was) !== canon(v)) out.set(p, { from: was, to: v });
  }
  for (const [p, v] of before) if (!after.has(p)) out.set(p, { from: v, to: undefined });
}

function recordDiff<T>(
  out: Changes,
  prev: Readonly<Record<string, T>> | undefined,
  next: Readonly<Record<string, T>> | undefined,
  emit: (key: string, v: T | undefined, put: Emit) => void,
): void {
  if (prev === next) return;
  const a = prev ?? {};
  const b = next ?? {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const va = own(a, key) ? a[key] : undefined;
    const vb = own(b, key) ? b[key] : undefined;
    if (va === vb) continue;
    diffWith(out, (put) => emit(key, va, put), (put) => emit(key, vb, put));
  }
}

/**
 * prev → next에서 값이 바뀐 경로(project 기준, 카운터는 문서의 수). 갈래를 참조로 비교해 같은 참조는 건너뛴다.
 * project(prev)와 project(next)를 통째로 비교한 것과 같다(tests/syncLocal.test.js).
 */
export function changedPaths(prev: MandaratDoc, next: MandaratDoc): Changes {
  const out: Changes = new Map();
  if (prev === next) return out;
  diffWith(out, (put) => rootRegs(prev, put), (put) => rootRegs(next, put));
  if (prev.settings !== next.settings) diffWith(out, (put) => settingsRegs(prev.settings, put), (put) => settingsRegs(next.settings, put));
  if (prev.themes !== next.themes) {
    const n = Math.max(prev.themes.length, next.themes.length);
    for (let ti = 0; ti < n; ti++) {
      const ta = prev.themes[ti];
      const tb = next.themes[ti];
      if (ta === tb) continue;
      diffWith(out, (put) => ta && themeHeadRegs(ta, ti, put), (put) => tb && themeHeadRegs(tb, ti, put));
      const aa = ta?.actions ?? [];
      const ab = tb?.actions ?? [];
      if (aa === ab) continue;
      const m = Math.max(aa.length, ab.length);
      for (let ai = 0; ai < m; ai++) {
        if (aa[ai] === ab[ai]) continue;
        const k = `${ti}-${ai}`;
        diffWith(out, (put) => aa[ai] && cellRegs(aa[ai], k, put), (put) => ab[ai] && cellRegs(ab[ai], k, put));
      }
    }
  }
  if (prev.todayKeys !== next.todayKeys) diffWith(out, (put) => tkRegs(prev.todayKeys, put), (put) => tkRegs(next.todayKeys, put));
  if (prev.todayExtra !== next.todayExtra) diffWith(out, (put) => extraRegs(prev.todayExtra, put), (put) => extraRegs(next.todayExtra, put));
  recordDiff(out, prev.dayLog, next.dayLog, (day, keys, put) => dayRegs(day, keys, put));
  recordDiff(out, prev.dayMeta, next.dayMeta, (day, m, put) => metaRegs(day, m, put));
  if (prev.closedDays !== next.closedDays) {
    diffWith(out, (put) => (prev.closedDays ?? []).forEach((d) => put(pathOf('cd', d), true)), (put) => (next.closedDays ?? []).forEach((d) => put(pathOf('cd', d), true)));
  }
  recordDiff<WeekReviewEntry>(out, prev.reviews, next.reviews, (wk, v, put) => v !== undefined && put(pathOf('rv', wk), v));
  if (prev.archives !== next.archives) {
    const byId = (xs: readonly ArchivedChart[] | undefined) => {
      const o: Record<string, ArchivedChart> = {};
      for (const a of xs ?? []) o[a.id] = a;
      return o;
    };
    recordDiff<ArchivedChart>(out, byId(prev.archives), byId(next.archives), (id, v, put) => v !== undefined && put(pathOf('ar', id), v));
  }
  return out;
}

// ── 도장 찍기 ────────────────────────────────────────────────────────────────

function units(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? toUnits(v) : 0;
}

/**
 * 카운터의 바뀐 만큼을 이 기기 몫에 넣는다(없던 값·없어진 값은 0으로 센다).
 * 그래서 바탕 b(= 값 − Σ몫)는 이 기기에서 고치는 동안 변하지 않고, 다른 기기의 +1과 내 +1이 함께 쌓인다.
 */
export function reattribute(parts: Readonly<Parts>, dev: string, path: string, from: unknown, to: unknown): Parts {
  const delta = units(to) - units(from);
  if (delta === 0) return parts as Parts;
  const byDev = own(parts, path) ? parts[path] : {};
  const cur: PNPart = own(byDev, dev) ? byDev[dev] : [0, 0];
  const next: PNPart = delta > 0 ? [cur[0] + delta, cur[1]] : [cur[0], cur[1] - delta];
  return { ...parts, [path]: { ...byDev, [dev]: next } };
}

/**
 * 이 기기에서 prev → next로 고쳤다 — 바뀐 경로마다 같은 도장 하나(없어진 경로는 지운 표시), 카운터는 내 몫에.
 * 바뀐 것이 없으면 meta를 그대로 돌려준다.
 */
export function stampLocal(prev: MandaratDoc, next: MandaratDoc, meta: SyncMeta, wall: number): SyncMeta {
  const changes = changedPaths(prev, next);
  if (changes.size === 0) return meta;
  const { meta: ticked, stamp } = tick(meta, wall);
  const clock: Record<string, Stamp> = { ...meta.clock };
  let parts: Parts = meta.parts;
  for (const [p, { from, to }] of changes) {
    clock[p] = stamp;
    if (isCounterPath(p)) parts = reattribute(parts, meta.dev, p, from, to);
  }
  return { ...ticked, clock, parts };
}

/**
 * 새 판 — 처음부터 다시(resetAll과 그 되돌리기)나 "이 기기 기록으로 이어 써요". doc은 남기는 문서.
 * 판을 새 도장으로 올리고 옛 시계·몫을 버린 뒤, doc의 모든 경로에 새 판보다 큰 도장을 찍는다.
 * (시계만 비우면 남긴 값에 판보다 큰 도장이 없어 "판 이하는 지워진 것"이 그 값을 지운다.)
 */
export function epochReset(meta: SyncMeta, wall: number, doc: MandaratDoc): SyncMeta {
  const first = tick(meta, wall);
  const second = tick(first.meta, wall);
  const clock: Record<string, Stamp> = {};
  for (const p of project(doc).keys()) clock[p] = second.stamp;
  return { ...second.meta, epoch: first.stamp, clock, parts: {} };
}

/**
 * 오래된 지운 표시 치우기 — 하루에 한 번. 쌓이는 모음의 원소(isElementPath)이면서 doc에 값이 없고,
 * 도장이 TTL보다 오래된 경로만 시계에서 뺀다. 값이 있는 경로의 도장은 두는데,
 * 도장을 빼면 그 값이 다른 기기의 더 오래된 지운 표시에 질 수 있기 때문이다. 몫은 건드리지 않는다.
 */
export function gc(meta: SyncMeta, wall: number, doc: MandaratDoc): SyncMeta {
  const day = ymd(new Date(wall));
  if (meta.gcDay === day) return meta;
  const cutoff = wall - SYNC_TTL_MS;
  const present = project(doc);
  const clock: Record<string, Stamp> = {};
  for (const p of Object.keys(meta.clock)) {
    const s = meta.clock[p];
    if (isElementPath(p) && !present.has(p) && msOf(s) < cutoff) continue;
    clock[p] = s;
  }
  return { ...meta, clock, gcDay: day };
}

/** 마지막으로 받아 합친 지 TTL이 넘었나 — 넘었으면 그동안 치운 지운 표시를 모르니 묻고 합친다(V4-A) */
export function isStale(meta: Pick<SyncMeta, 'pulledAt'>, wall: number): boolean {
  return meta.pulledAt !== undefined && wall - meta.pulledAt > SYNC_TTL_MS;
}
