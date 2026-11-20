// 집중 세션을 기기에 적어 둔다 — 멈춰 있던 앱을 iOS가 끝내도(잠금 화면의 Live Activity와 끝 알림은 혼자 간다),
// 다음에 열 때 그 세션이 이어지거나, 끝났으면 집중한 분이 남는다. 화면(FocusTimer)과 떼어 Node에서 시험한다:
// 저장소(AsyncStorage)와 지금 시각은 받아서 쓴다. 기기마다의 것이라 문서 · 백업 · iCloud에는 들어가지 않는다.
//
// - 적는 때: 돌기 시작 · 멈춤 · 다시 이음(도는 중은 끝날 시각, 멈춘 중은 남은 ms — 시계는 벽시계다, focusClock). 닫으면 지운다.
// - 앱을 켤 때(resume): 아직 도는 세션은 남은 시간 그대로 다시 열고, 끝난 세션은 집중한 분을 한 번만 더한 뒤 다 채운 모습으로 연다.
//   이미 더한 분(credited)을 세션에 먼저 적고 나서 문서에 더한다 — 적지 못했으면 더하지 않는다(두 번 더하지 않는 쪽으로).
// - 다른 날의 세션(어제 끝났거나 어제 멈춘 것)은 분만 더하고 열지 않는다: 끝내기 단추의 '오늘 했어요'가 다른 날을 체크하지 않게.
import { FOCUS_TOTAL, elapsedOf, leftOfMs, minutesToRecord } from './focusClock';

/** AsyncStorage 열쇠 — 적어 둔 집중 세션(한 번에 하나) */
export const FOCUS_SESSION_KEY = 'mandarat:focus:v1';
/** 한 번의 집중(분) */
export const FOCUS_PLANNED_MINS = FOCUS_TOTAL / 60;

export interface FocusSession {
  /** 세션 아이디 — 다시 열어도 같은 세션이다(더한 분을 이 세션에 적는다) */
  id: string;
  /** 영역 · 실천 번호(0~7) */
  ti: number;
  ai: number;
  /** 처음 시작한 시각(ms) */
  startedAt: number;
  /** 계획한 분(25) */
  plannedMins: number;
  /** 도는 중: 끝날 시각(ms). 멈췄으면 null */
  endAt: number | null;
  /** 멈춘 중: 남은 ms. 도는 중이면 null */
  remainingMs: number | null;
  /** 이 세션에서 이미 문서에 더한 분 — 닫을 때 그만큼은 다시 더하지 않는다 */
  credited: number;
  /** 적은 시각(ms) — 멈춘 세션이 어느 날의 것인지 */
  savedAt: number;
}

/** 저장소에서 쓰는 것만 — AsyncStorage가 이 모양이다 */
export interface FocusStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
}

/** 새 세션 아이디 — 시작 시각 + 짧은 난수 */
export function newFocusId(now: number, random: () => number = Math.random): string {
  return `${Math.round(now).toString(36)}-${Math.floor(random() * 0x7fffffff).toString(36)}`;
}

/** 지금 모습을 적어 둘 꼴로 — 도는 중(run)이면 끝날 시각, 멈췄으면 남은 ms */
export function focusRecord(
  base: Pick<FocusSession, 'id' | 'ti' | 'ai' | 'startedAt' | 'credited'>,
  clock: { run: boolean; endAt: number; remainingMs: number },
  now: number,
): FocusSession {
  return {
    id: base.id, ti: base.ti, ai: base.ai, startedAt: base.startedAt, plannedMins: FOCUS_PLANNED_MINS,
    endAt: clock.run ? Math.round(clock.endAt) : null,
    remainingMs: clock.run ? null : Math.max(0, Math.round(clock.remainingMs)),
    credited: base.credited,
    savedAt: Math.round(now),
  };
}

export function serializeFocusSession(s: FocusSession): string {
  return JSON.stringify({ v: 1, ...s });
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isCell = (v: unknown): v is number => isNum(v) && Number.isInteger(v) && v >= 0 && v < 8;

/** 적어 둔 글 → 세션. 모양이 어긋나면 null(깨진 값 · 다른 판) */
export function parseFocusSession(raw: string | null | undefined): FocusSession | null {
  if (!raw) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (o.v !== 1 || typeof o.id !== 'string' || o.id === '') return null;
  if (!isCell(o.ti) || !isCell(o.ai)) return null;
  if (!isNum(o.startedAt) || !isNum(o.savedAt)) return null;
  if (!isNum(o.plannedMins) || o.plannedMins <= 0 || o.plannedMins > 24 * 60) return null;
  if (!isNum(o.credited) || o.credited < 0) return null;
  // 도는 중이면 끝날 시각만, 멈췄으면 남은 ms만
  const running = isNum(o.endAt) && o.remainingMs == null;
  const paused = o.endAt == null && isNum(o.remainingMs) && o.remainingMs >= 0;
  if (!running && !paused) return null;
  return {
    id: o.id, ti: o.ti, ai: o.ai, startedAt: o.startedAt, plannedMins: o.plannedMins,
    endAt: running ? (o.endAt as number) : null,
    remainingMs: paused ? (o.remainingMs as number) : null,
    credited: o.credited, savedAt: o.savedAt,
  };
}

/** 지금 남은 ms — 도는 중이면 끝날 시각에서 지금을 빼고, 멈췄으면 적어 둔 값. 0 ~ 계획한 시간 사이 */
export function sessionLeftMs(s: FocusSession, now: number): number {
  const ms = s.endAt !== null ? s.endAt - now : s.remainingMs ?? 0;
  return Math.max(0, Math.min(s.plannedMins * 60 * 1000, ms));
}

/** 아직 문서에 더하지 않은 분 — 남은 초로 센 집중한 분(다 채운 1분만)에서 이미 더한 분을 뺀다 */
export function owedMinutes(leftSec: number, credited: number, plannedMins: number = FOCUS_PLANNED_MINS): number {
  return Math.max(0, minutesToRecord(elapsedOf(leftSec, plannedMins * 60)) - Math.max(0, credited));
}

function sameDay(a: number, b: number): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

export interface FocusResumePlan {
  /** 지금 문서에 더할 분 */
  credit: number;
  /** 저장소에 남길 세션 — null이면 지운다. 받은 세션과 다르면 다시 적는다 */
  keep: FocusSession | null;
  /** 다시 열 세션 — null이면 열지 않는다 */
  open: FocusSession | null;
}

/**
 * 앱을 켰을 때 적어 둔 세션으로 할 일.
 * - 아직 도는 중: 그대로 다시 연다(남은 시간은 끝날 시각에서).
 * - 오늘 멈춘 것: 멈춘 채로 다시 연다.
 * - 끝났다(끝날 시각이 지났다): 집중한 분 중 아직 더하지 않은 만큼 더한다. 오늘 끝났으면 다 채운 모습으로 다시 열고
 *   (끝내기 단추로 체크할 수 있게), 더한 분을 세션에 적어 둔다 — 그 모습에서 또 꺼져도 다시 더하지 않는다.
 * - 다른 날에 끝났거나 멈춘 것: 집중한 분만 더하고 지운다.
 */
export function resumePlan(s: FocusSession, now: number): FocusResumePlan {
  const leftMs = sessionLeftMs(s, now);
  if (s.endAt !== null && leftMs > 0) return { credit: 0, keep: s, open: s };
  const today = sameDay(s.endAt ?? s.savedAt, now);
  const owed = owedMinutes(leftOfMs(leftMs), s.credited, s.plannedMins);
  if (!today) return { credit: owed, keep: null, open: null };
  if (leftMs > 0) return { credit: 0, keep: s, open: s };
  const kept = owed > 0 ? { ...s, credited: s.credited + owed } : s;
  return { credit: owed, keep: kept, open: kept };
}

export interface FocusSessionStore {
  /** 지금 모습을 적는다(돌기 시작 · 멈춤 · 다시 이음) */
  save(s: FocusSession): Promise<void>;
  /** 지운다(닫기) */
  clear(): Promise<void>;
  /**
   * 앱을 켰을 때 — 적어 둔 세션을 읽어 끝난 분을 credit으로 한 번 더하고, 다시 열 세션을 돌려준다(없으면 null).
   * 더한 분은 먼저 세션에 적는다: 적지 못하면 더하지 않고, 열 수 있는 세션이면 더하지 않은 채 돌려준다(닫을 때 더한다).
   */
  resume(now: number, credit: (minutes: number) => void): Promise<FocusSession | null>;
}

/** 저장소 하나를 감싼다 — 적기 · 지우기 · 읽기는 부른 차례대로 하나씩(늦게 끝난 적기가 뒤의 지우기를 덮지 않게). 던지지 않는다 */
export function focusSessionStore(storage: FocusStorage): FocusSessionStore {
  let tail: Promise<unknown> = Promise.resolve();
  const inOrder = <T>(job: () => Promise<T>, fallback: T): Promise<T> => {
    const p = tail.then(job).catch(() => fallback);
    tail = p;
    return p;
  };
  return {
    save: (s) => inOrder(async () => { await storage.setItem(FOCUS_SESSION_KEY, serializeFocusSession(s)); }, undefined),
    clear: () => inOrder(async () => { await storage.removeItem(FOCUS_SESSION_KEY); }, undefined),
    resume: (now, credit) => inOrder(async () => {
      const raw = await storage.getItem(FOCUS_SESSION_KEY);
      if (raw == null) return null;
      const s = parseFocusSession(raw);
      if (!s) {
        await storage.removeItem(FOCUS_SESSION_KEY);
        return null;
      }
      const plan = resumePlan(s, now);
      try {
        if (!plan.keep) await storage.removeItem(FOCUS_SESSION_KEY);
        else if (plan.keep !== s) await storage.setItem(FOCUS_SESSION_KEY, serializeFocusSession(plan.keep));
      } catch {
        return plan.open ? s : null;
      }
      if (plan.credit > 0) credit(plan.credit);
      return plan.open;
    }, null),
  };
}
