// 오류 화면(ErrorBoundary)에서 벗어나는 길 — 잇달아 난 횟수 세기와 '저장본으로 열기' 넘겨주기. RN 의존 없는 순수 모듈.
//
// 오류 화면은 저장소(MandaratProvider) 위에 있어, 그 화면이 떠 있는 동안에는 저장소가 내려가 있다.
// 그래서 저장본으로 바꾸는 일은 거기서 하지 않고 '어느 날 것을 열지'만 적어 둔다 — 다시 뜬 앱이 첫 화면을 그리기 전에
// 저장소의 손잡이(readSnapshot · replaceDoc)로 바꾸고(src/store/useCrashRecovery.ts useSnapOpen), 설정 › 저장본과 같은 되돌리기를 권한다(SnapOpenNotice).
import type { MandaratDoc } from '../types';

/** 하루 저장본 열쇠의 앞머리 — MandaratContext의 SNAP_PREFIX와 같은 값(tests/crashRecover.test.js가 지킨다) */
export const SNAP_PREFIX = 'mandarat:snap:';
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** '다시 시도' 뒤 이 안에 또 멈추면 잇달아 난 것으로 센다(ms) */
export const STREAK_WINDOW_MS = 60_000;

/**
 * 잇달아 난 횟수 — retriedAt은 마지막으로 '다시 시도'를 누른 때(누른 적 없으면 0).
 * 누른 지 STREAK_WINDOW_MS 안에 또 멈췄으면 하나 더, 아니면 처음부터.
 */
export function failStreak(prev: number, retriedAt: number, now: number): number {
  return retriedAt > 0 && now - retriedAt <= STREAK_WINDOW_MS ? prev + 1 : 1;
}

/** 저장소 열쇠들 → 저장본이 있는 날('YYYY-MM-DD'), 새것부터 */
export function snapDays(keys: readonly string[]): string[] {
  return keys
    .filter((k) => k.startsWith(SNAP_PREFIX))
    .map((k) => k.slice(SNAP_PREFIX.length))
    .filter((d) => DAY_RE.test(d))
    .sort()
    .reverse();
}

/** 열어 볼 저장본 — 아직 열어 보지 않은 것 가운데 가장 새것. 없으면 null */
export function pickSnapDay(days: readonly string[], tried: ReadonlySet<string>): string | null {
  return days.find((d) => !tried.has(d)) ?? null;
}

// ── 넘겨주기(오류 화면 → 다시 뜬 앱) ────────────────────────────────────────────

let pending: string | null = null;
const tried = new Set<string>();
let undo: { day: string; doc: MandaratDoc } | null = null;

/** 이번 실행에서 이미 열어 본 저장본의 날들 */
export function triedSnapDays(): ReadonlySet<string> {
  return tried;
}

/** 오류 화면: 이 날의 저장본으로 열어 달라 — 같은 날을 다시 권하지 않게 적어 둔다 */
export function requestSnapOpen(day: string): void {
  if (!DAY_RE.test(day)) return;
  pending = day;
  tried.add(day);
}

/** 열어 달라고 한 날 — 없으면 null */
export function pendingSnapOpen(): string | null {
  return pending;
}

/** 바꾸기를 마쳤다(또는 그 저장본을 읽지 못했다) */
export function clearSnapOpen(): void {
  pending = null;
}

/**
 * 바꾸기 전의 문서를 되돌리기용으로 맡긴다. 이미 맡긴 것이 있으면(저장본을 잇달아 열었다) 처음 것을 그대로 둔다 —
 * 되돌리면 오류가 나기 전의 내 기록으로 돌아가야 한다.
 */
export function keepSnapUndo(day: string, doc: MandaratDoc): void {
  undo = { day, doc: undo ? undo.doc : doc };
}

/** 맡겨 둔 되돌리기 — 한 번 읽으면 지운다 */
export function takeSnapUndo(): { day: string; doc: MandaratDoc } | null {
  const u = undo;
  undo = null;
  return u;
}
