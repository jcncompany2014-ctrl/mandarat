// iCloud 동기화의 레지스터 투영 — 문서 ↔ 경로별 값. 순수 함수.
// 경로 지도와 규칙(R1–R6, D1–D8)은 docs/v2/V1-F.md §3–§4가 단일 출처다. 이 파일을 고치면 그 문서도 고친다.
//
// project(doc, parts): 문서를 경로 → 값(Json)으로 펼친다. 값이 없는 칸·날·항목은 경로를 만들지 않는다
//   (지운 표시는 SyncMeta.clock에 도장만 남는다 — 값이 없고 도장이 있으면 지운 것).
// assemble(regs, local): 합친 값들로 문서를 다시 짓는다. 기기마다의 필드(todayDate)와 목록 순서는 local에서 온다.
//   assemble(project(d, parts), d)는 d와 같다(tests/syncProject.test.js).
import type { Action, ArchivedChart, MandaratDoc, Reminders, Settings, Theme, TodayExtra, WeekReviewEntry } from '../types';
import { MAX_NUM } from './kinds';
import { migrate } from '../data/defaults';
import type { Parts, PNPart } from './syncMeta';

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
/** 레지스터 값들 — null(또는 없음)은 "값 없음" */
export type Registers = Map<string, Json>;
/** 카운터 레지스터 값 — b: 몫에 들지 않은 바탕(LWW), p: 기기별 몫(합칠 때 기기마다 큰 쪽). 단위는 1/100 */
export interface CounterValue { b: number; p: Record<string, PNPart> }

/** 카운터 단위 — 쌓기 수는 소수 둘째 자리까지라서 1/100을 정수로 센다(부동소수 찌꺼기 없이 더한다) */
export const COUNTER_SCALE = 100;

/** 문서에 있지만 동기화하지 않는 필드 — 기기마다 다르다(assemble은 local에서 가져온다) */
export const LOCAL_FIELDS: readonly (keyof MandaratDoc)[] = ['version', 'todayDate'];

/** 실천 칸에서 c/<k>/cfg 한 레지스터로 묶는 설정 값 — 한 번에 함께 바뀌는 값들(유형을 바꾸면 같이 바뀐다) */
export const CFG_KEYS = ['kind', 'days', 'perWeek', 'since', 'habitUntil', 'schedule', 'goal', 'unit', 'step', 'due', 'remindAt'] as const;

// ── 경로 ─────────────────────────────────────────────────────────────────────

/** 경로 조각 — '%'와 '/'를 감싸 둔다(저장본 키에는 없지만, 있더라도 경로가 깨지지 않게) */
function esc(s: string): string {
  return s.replace(/%/g, '%25').replace(/\//g, '%2F');
}

function unesc(s: string): string {
  return s.replace(/%(25|2F)/g, (_m, c: string) => (c === '25' ? '%' : '/'));
}

/** 조각들 → 경로 */
export function pathOf(...segs: (string | number)[]): string {
  return segs.map((s) => esc(String(s))).join('/');
}

/** 경로 → 조각들 */
export function segsOf(path: string): string[] {
  return path.split('/').map(unesc);
}

/** 쌓이는 모음(날·주·항목·지난 표)의 한 원소인가 — 지운 표시를 오래 두지 않아도 되는 경로(V2-F GC) */
export function isElementPath(path: string): boolean {
  const s = path.split('/');
  switch (s[0]) {
    case 'tk': case 'x': case 'd': case 'm': case 'cd': case 'rv': case 'ar':
      return s.length >= 2;
    case 'c':
      return s.length === 4 && (s[2] === 'log' || s[2] === 'r');
    default:
      return false;
  }
}

/** PN 카운터 경로인가 — 값이 CounterValue다(누적 집중 분, 쌓기 수, 쌓기의 그날 더한 수) */
export function isCounterPath(path: string): boolean {
  if (path === 'fm') return true;
  const s = path.split('/');
  return s[0] === 'c' && ((s.length === 3 && s[2] === 'n') || (s.length === 4 && s[2] === 'log'));
}

// ── 값 ───────────────────────────────────────────────────────────────────────

/** 키를 정렬한 JSON — 같은 값이면 같은 글. undefined 필드는 JSON.stringify처럼 빠진다 */
export function canon(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? 'null' : canon(x))).join(',')}]`;
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o).filter((k) => o[k] !== undefined).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canon(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v) ?? 'null';
}

/** 두 값이 같은가(canon 비교) */
export function sameValue(a: unknown, b: unknown): boolean {
  return canon(a) === canon(b);
}

/**
 * 도장이 같을 때 고르는 순서 — 큰 rank가 이긴다. 값 없음(null)은 어떤 값보다 작다(같은 도장이면 값을 남긴다).
 * 문자열로 비교한다(rank(a) < rank(b)).
 */
export function rank(v: unknown): string {
  return v === null || v === undefined ? '0' : `1${canon(v)}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function own(o: object, k: string): boolean {
  return Object.prototype.hasOwnProperty.call(o, k);
}

/** 몫의 합(더한 합 − 뺀 합) */
export function partsSum(p: Readonly<Record<string, PNPart>> | undefined): number {
  let n = 0;
  if (!p) return n;
  for (const dev of Object.keys(p)) {
    const part = p[dev];
    if (Array.isArray(part) && part.length === 2 && Number.isSafeInteger(part[0]) && Number.isSafeInteger(part[1])) n += part[0] - part[1];
  }
  return n;
}

/** 수 → 카운터 단위(1/100 정수) */
export function toUnits(n: number): number {
  return Math.round(n * COUNTER_SCALE);
}

/** 카운터 값 = 바탕 + 몫의 합(단위). 모양이 깨졌으면 null */
export function counterTotal(v: unknown): number | null {
  if (!isRecord(v) || typeof v.b !== 'number' || !Number.isSafeInteger(v.b)) return null;
  const p = isRecord(v.p) ? (v.p as Record<string, PNPart>) : {};
  return v.b + partsSum(p);
}

function counter(value: number, parts: Parts, path: string): CounterValue {
  const p = own(parts, path) ? parts[path] : {};
  return { b: toUnits(value) - partsSum(p), p: { ...p } };
}

// ── 투영 ─────────────────────────────────────────────────────────────────────

function actionCfg(a: Action): Json {
  const out: Record<string, Json> = {};
  for (const k of CFG_KEYS) if (a[k] !== undefined) out[k] = a[k] as Json;
  return out;
}

/**
 * 문서 → 경로별 값(R1–R6). doc은 migrate를 거친 문서여야 한다. parts는 카운터 경로의 기기별 몫(SyncMeta.parts).
 * 값이 없는 선택 필드와 원소는 경로를 만들지 않는다.
 */
export function project(doc: MandaratDoc, parts: Parts = {}): Registers {
  const r: Registers = new Map();
  const put = (v: Json, ...segs: (string | number)[]) => r.set(pathOf(...segs), v);

  // R1 뿌리
  put(doc.onboarded, 'ob');
  put(doc.centerGoal, 'cg');
  put(doc.centerGoalEn, 'ce');
  put(doc.areasSet ?? false, 'as');
  put(counter(doc.focusMinutes, parts, 'fm') as unknown as Json, 'fm');
  if (doc.chartStart !== undefined) put(doc.chartStart, 'cs');
  if (doc.focusStart !== undefined) put(doc.focusStart, 'fs');

  // R2 설정 — 알림은 키마다 한 레지스터(아침은 아이폰, 저녁은 아이패드에서 정해도 둘 다 남는다)
  const s = doc.settings;
  put(s.mood, 's', 'mood');
  put(s.accent, 's', 'accent');
  put(s.mgmt, 's', 'mgmt');
  put(s.cellShape, 's', 'cellShape');
  if (s.lastBackupAt !== undefined) put(s.lastBackupAt, 's', 'lastBackupAt');
  if (s.reminders?.morning !== undefined) put(s.reminders.morning, 's', 'reminders', 'morning');
  if (s.reminders?.evening !== undefined) put(s.reminders.evening, 's', 'reminders', 'evening');
  if (s.reminders?.review !== undefined) put(s.reminders.review, 's', 'reminders', 'review');
  if (s.paper !== undefined) put(s.paper, 's', 'paper');

  // R3 영역과 칸 — 칸은 글·메모·달성·설정 묶음·쌓기 수(카운터)·그날 더한 수(카운터 원소)·주별 점수(원소)
  doc.themes.forEach((t, ti) => {
    put(t.title, 't', ti, 'title');
    put(t.color, 't', ti, 'color');
    put(t.icon, 't', ti, 'icon');
    t.actions.forEach((a, ai) => {
      const k = `${ti}-${ai}`;
      put(a.text, 'c', k, 'text');
      put(a.note, 'c', k, 'note');
      put(a.done, 'c', k, 'done');
      put(actionCfg(a), 'c', k, 'cfg');
      if (a.count !== undefined) put(counter(a.count, parts, pathOf('c', k, 'n')) as unknown as Json, 'c', k, 'n');
      for (const day of Object.keys(a.log ?? {})) {
        put(counter((a.log as Record<string, number>)[day], parts, pathOf('c', k, 'log', day)) as unknown as Json, 'c', k, 'log', day);
      }
      for (const wk of Object.keys(a.ratings ?? {})) put((a.ratings as Record<string, number>)[wk], 'c', k, 'r', wk);
    });
  });

  // R4 오늘 목록 — 담은 칸과 직접 추가한 할 일(내용과 했는지를 따로)
  for (const k of doc.todayKeys) put(true, 'tk', k);
  for (const x of doc.todayExtra) {
    put({ ti: x.ti, text: x.text }, 'x', x.id);
    put(x.done, 'x', x.id, 'done');
  }

  // R5 날마다의 기록 — 날·키마다 한 원소(두 기기에서 같은 날 한 체크가 둘 다 남는다)
  for (const day of Object.keys(doc.dayLog)) for (const key of doc.dayLog[day]) put(true, 'd', day, key);
  for (const day of Object.keys(doc.dayMeta)) {
    const m = doc.dayMeta[day];
    if (m.mood !== undefined) put(m.mood, 'm', day, 'mood');
    if (m.reflection !== undefined) put(m.reflection, 'm', day, 'refl');
  }
  for (const day of doc.closedDays ?? []) put(true, 'cd', day);
  for (const wk of Object.keys(doc.reviews ?? {})) put((doc.reviews as Record<string, WeekReviewEntry>)[wk] as unknown as Json, 'rv', wk);

  // R6 지난 표 — 한 장에 한 레지스터(같은 id면 나중에 닫은 것)
  for (const a of doc.archives ?? []) put(a as unknown as Json, 'ar', a.id);
  return r;
}

// ── 다시 짓기 ────────────────────────────────────────────────────────────────

/** local의 순서를 지키고, local에 없던 것은 정렬해 뒤에 붙인다 */
function ordered(present: Iterable<string>, localOrder: readonly string[]): string[] {
  const set = new Set(present);
  const out = localOrder.filter((k) => set.has(k));
  const seen = new Set(out);
  const rest = [...set].filter((k) => !seen.has(k)).sort();
  return [...new Set([...out, ...rest])];
}

/**
 * 합친 값들 → 문서(D1–D8). 끝에 migrate를 거친다.
 * - 꼭 있는 값(뿌리·설정 넷·영역·칸의 글·메모·달성·설정 묶음·누적 집중)이 없거나 모양이 틀리면 local 값을 쓴다(잃지 않는다).
 * - 선택 값과 원소는 없거나 null이면 없는 것이다(지운 것이 되살아나지 않는다).
 */
export function assemble(regs: ReadonlyMap<string, Json>, local: MandaratDoc): MandaratDoc {
  const get = (p: string): Json | undefined => {
    const v = regs.get(p);
    return v === null ? undefined : v;
  };
  const str = (p: string) => {
    const v = get(p);
    return typeof v === 'string' ? v : undefined;
  };
  const bool = (p: string) => {
    const v = get(p);
    return typeof v === 'boolean' ? v : undefined;
  };
  const num = (p: string) => {
    const v = get(p);
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  };
  const total = (p: string) => {
    const v = get(p);
    return v === undefined ? null : counterTotal(v);
  };

  // D1 원소 경로를 모은다(한 번 훑어서)
  const logs = new Map<string, Record<string, number>>(); // k → day → 수
  const ratings = new Map<string, Record<string, number>>(); // k → wk → 점수
  const tk: string[] = [];
  const extraIds: string[] = [];
  const dayLog = new Map<string, string[]>();
  const dayMeta = new Map<string, { mood?: number; reflection?: string }>();
  const closed: string[] = [];
  const reviews: Record<string, WeekReviewEntry> = {};
  const archives: ArchivedChart[] = [];
  for (const [path, v] of regs) {
    if (v === null || v === undefined) continue;
    const s = segsOf(path);
    // JSON에서 온 '__proto__' 조각은 레코드 키로 쓰면 프로토타입이 바뀐다 — 저장본 규칙에도 맞지 않는 키다
    if (s.includes('__proto__')) continue;
    const [top] = s;
    if (top === 'c' && s.length === 4 && s[2] === 'log') {
      const t = counterTotal(v);
      if (t === null || t <= 0) continue;
      const rec = logs.get(s[1]) ?? {};
      rec[s[3]] = t / COUNTER_SCALE;
      logs.set(s[1], rec);
    } else if (top === 'c' && s.length === 4 && s[2] === 'r') {
      if (typeof v !== 'number') continue;
      const rec = ratings.get(s[1]) ?? {};
      rec[s[3]] = v;
      ratings.set(s[1], rec);
    } else if (top === 'tk' && s.length === 2) {
      if (v === true) tk.push(s[1]);
    } else if (top === 'x' && s.length === 2) {
      if (isRecord(v)) extraIds.push(s[1]);
    } else if (top === 'd' && s.length === 3) {
      if (v !== true) continue;
      const list = dayLog.get(s[1]) ?? [];
      list.push(s[2]);
      dayLog.set(s[1], list);
    } else if (top === 'm' && s.length === 3) {
      const e = dayMeta.get(s[1]) ?? {};
      if (s[2] === 'mood' && typeof v === 'number') e.mood = v;
      else if (s[2] === 'refl' && typeof v === 'string') e.reflection = v;
      else continue;
      dayMeta.set(s[1], e);
    } else if (top === 'cd' && s.length === 2) {
      if (v === true) closed.push(s[1]);
    } else if (top === 'rv' && s.length === 2) {
      if (isRecord(v)) reviews[s[1]] = v as unknown as WeekReviewEntry;
    } else if (top === 'ar' && s.length === 2) {
      if (isRecord(v)) archives.push({ ...(v as unknown as ArchivedChart), id: s[1] });
    }
  }

  // D2 뿌리 — 꼭 있는 값은 local로 메우고, 선택 값은 있을 때만
  const fmTotal = total('fm');
  const focusMinutes = fmTotal === null ? local.focusMinutes : Math.max(0, Math.round(fmTotal / COUNTER_SCALE));
  const chartStart = str('cs');
  // 이 표의 집중 시작점은 누적 집중보다 클 수 없다 — 합친 누적이 작아졌으면 버리지 않고 누적에 맞춘다
  const fsRaw = num('fs');
  const focusStart = fsRaw === undefined ? undefined : Math.min(fsRaw, focusMinutes);

  // D3 설정 — 알림은 세 레지스터를 모아 하나로(켠 것이 없으면 없다)
  const reminders: Reminders = {
    ...(str('s/reminders/morning') !== undefined ? { morning: str('s/reminders/morning') } : {}),
    ...(str('s/reminders/evening') !== undefined ? { evening: str('s/reminders/evening') } : {}),
    ...(get('s/reminders/review') === true ? { review: true as const } : {}),
  };
  const lastBackupAt = str('s/lastBackupAt');
  const paper = str('s/paper');
  const settings: Settings = {
    mood: (str('s/mood') ?? local.settings.mood) as Settings['mood'],
    accent: str('s/accent') ?? local.settings.accent,
    mgmt: (str('s/mgmt') ?? local.settings.mgmt) as Settings['mgmt'],
    cellShape: (str('s/cellShape') ?? local.settings.cellShape) as Settings['cellShape'],
    ...(lastBackupAt !== undefined ? { lastBackupAt } : {}),
    ...(Object.keys(reminders).length > 0 ? { reminders } : {}),
    ...(paper !== undefined ? { paper: paper as Settings['paper'] } : {}),
  };

  // D4 영역과 칸
  const themes: Theme[] = local.themes.map((lt, ti): Theme => ({
    title: str(pathOf('t', ti, 'title')) ?? lt.title,
    color: str(pathOf('t', ti, 'color')) ?? lt.color,
    icon: (str(pathOf('t', ti, 'icon')) ?? lt.icon) as Theme['icon'],
    actions: lt.actions.map((la, ai): Action => {
      const k = `${ti}-${ai}`;
      const cfgV = get(pathOf('c', k, 'cfg'));
      const cfg: Record<string, unknown> = isRecord(cfgV) ? cfgV : Object.fromEntries(CFG_KEYS.filter((f) => la[f] !== undefined).map((f) => [f, la[f]]));
      const nTotal = total(pathOf('c', k, 'n'));
      const log = logs.get(k);
      const rt = ratings.get(k);
      const a: Record<string, unknown> = {
        text: str(pathOf('c', k, 'text')) ?? la.text,
        note: str(pathOf('c', k, 'note')) ?? la.note,
        done: bool(pathOf('c', k, 'done')) ?? la.done,
      };
      for (const f of CFG_KEYS) if (own(cfg, f) && cfg[f] !== undefined && cfg[f] !== null) a[f] = cfg[f];
      // 함께 줄인 수가 0 밑으로 내려가도 쌓기 수는 0에서 멈춘다(지우지 않는다)
      if (nTotal !== null) a.count = Math.min(MAX_NUM, Math.max(0, nTotal) / COUNTER_SCALE);
      if (log) a.log = log;
      if (rt) a.ratings = rt;
      return a as unknown as Action;
    }),
  }));

  // D5 오늘 목록 — local 순서를 지키고 새로 온 것은 뒤에
  const localExtra = new Map(local.todayExtra.map((x) => [x.id, x]));
  const todayExtra: TodayExtra[] = ordered(extraIds, local.todayExtra.map((x) => x.id)).map((id) => {
    const v = get(pathOf('x', id)) as Record<string, unknown>;
    return {
      id,
      ti: typeof v.ti === 'number' ? v.ti : localExtra.get(id)?.ti ?? 0,
      text: typeof v.text === 'string' ? v.text : '',
      done: get(pathOf('x', id, 'done')) === true,
    };
  });

  // D6 날마다의 기록 — 그날 키 목록도 local 순서를 지킨다
  const dayLogOut: MandaratDoc['dayLog'] = {};
  for (const [day, keys] of [...dayLog].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    dayLogOut[day] = ordered(keys, own(local.dayLog, day) ? local.dayLog[day] : []);
  }
  const dayMetaOut: MandaratDoc['dayMeta'] = {};
  for (const [day, e] of dayMeta) dayMetaOut[day] = e;

  // D7 문서
  const doc: Record<string, unknown> = {
    version: local.version,
    onboarded: bool('ob') ?? local.onboarded,
    centerGoal: str('cg') ?? local.centerGoal,
    centerGoalEn: str('ce') ?? local.centerGoalEn,
    themes,
    todayKeys: ordered(tk, local.todayKeys),
    todayExtra,
    dayLog: dayLogOut,
    dayMeta: dayMetaOut,
    focusMinutes,
    settings,
    ...(local.todayDate !== undefined ? { todayDate: local.todayDate } : {}),
    areasSet: bool('as') ?? local.areasSet ?? false,
    reviews,
    ...(closed.length > 0 ? { closedDays: closed.sort() } : {}),
    ...(archives.length > 0 ? { archives } : {}),
    ...(chartStart !== undefined ? { chartStart } : {}),
    ...(focusStart !== undefined ? { focusStart } : {}),
  };

  // D8 저장본 규칙으로 검사·정리(형식이 틀린 값은 버리고, 모음은 순서대로)
  return migrate(doc);
}
