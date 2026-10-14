// 칸 기록 떼어 두기 — 칸을 비우거나 차트를 통째로 바꿀 때 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
//
// 실천 기록(dayLog)은 칸 자리 "ti-ai"로 남는다. 칸을 비우고 새 실천을 쓰면 이전 실천의 기록이 새 실천에
// 붙어(오늘 이미 한 것처럼 보이는 등) 거짓이 되고, 그렇다고 지우면 실제로 한 날이 사라진다.
// 그래서 지우지 않고 이름만 바꿔 칸에서 떼어 둔다: "ti-ai" → "ti-xh<시각(36진)>_<ai>".
// - 날마다 기록 개수와 영역 접두사 `${ti}-`는 그대로라 히트맵·주간 합계·영역 연속 기록은 이어진다.
// - 칸 자리 키가 아니므로 습관 체크·오늘 했는지·칸별 기록에는 더 이상 잡히지 않는다.
// - 직접 추가한 할 일 키 "ti-x<id>"와 같은 꼴이라 저장본 검증(defaults.ts LOG_KEY_RE)을 그대로 통과한다.
import type { MandaratDoc, WeekReviewEntry } from '../types';
import { daysBetween, weekDates, ymd } from './routine';
import { addDays } from './kinds';

type DayLog = MandaratDoc['dayLog'];

/** 칸 자리 키 "ti-ai" */
const CELL_KEY_RE = /^([0-7])-([0-7])$/;
/** 떼어 둔 기록 키 "ti-xh<시각>_<ai>" */
const ARCHIVED_RE = /^[0-7]-xh[0-9a-z]{1,13}_[0-7]$/;

/** 떼어 둔 기록의 키 — time(보통 Date.now())는 36진수로 짧게 */
export function archivedKey(ti: number, ai: number, time: number): string {
  // 0 ~ 안전한 정수 범위로(36진 11자 이하) — 저장본 검증의 키 길이(40자) 안에 늘 들어간다
  const tag = Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(Number.isFinite(time) ? time : 0))).toString(36);
  return `${ti}-xh${tag}_${ai}`;
}

/** 칸에서 떼어 둔 지난 기록 키인가 */
export function isArchivedKey(key: string): boolean {
  return ARCHIVED_RE.test(key);
}

/**
 * 키 이름 바꾸기 — rename이 새 이름을 주면 바꾸고(null이면 그대로) 날마다 개수·순서를 지킨다.
 * 바뀐 날만 새 배열로, 바뀐 게 없으면 같은 객체를 돌려준다(불필요한 저장·렌더를 막는다).
 */
function renameKeys(dayLog: DayLog, rename: (key: string) => string | null): DayLog {
  let changed = false;
  const out: DayLog = {};
  for (const [day, list] of Object.entries(dayLog)) {
    if (!list.some((k) => rename(k) !== null)) {
      out[day] = list;
      continue;
    }
    changed = true;
    const seen = new Set<string>();
    const next: string[] = [];
    for (const k of list) {
      const nk = rename(k) ?? k;
      // 같은 시각에 두 번 떼어 낸 경우에만 겹친다 — 한 날에 같은 키는 하나만
      if (seen.has(nk)) continue;
      seen.add(nk);
      next.push(nk);
    }
    out[day] = next;
  }
  return changed ? out : dayLog;
}

/** 칸 하나("ti-ai")의 지난 기록을 칸에서 떼어 둔다 — 지우지 않는다 */
export function archiveCellLog(dayLog: DayLog, key: string, time: number): DayLog {
  const m = CELL_KEY_RE.exec(key);
  if (!m) return dayLog;
  const renamed = archivedKey(Number(m[1]), Number(m[2]), time);
  return renameKeys(dayLog, (k) => (k === key ? renamed : null));
}

/** 64칸 모두의 지난 기록을 떼어 둔다(템플릿·예시로 차트를 통째로 바꿀 때). 직접 추가한 할 일 기록은 그대로 */
export function archiveAllCells(dayLog: DayLog, time: number): DayLog {
  return renameKeys(dayLog, (k) => {
    const m = CELL_KEY_RE.exec(k);
    return m ? archivedKey(Number(m[1]), Number(m[2]), time) : null;
  });
}

/** 기록이 있는 가장 이른 날 'YYYY-MM-DD' — 없으면 null */
export function firstLogDay(dayLog: DayLog): string | null {
  let first: string | null = null;
  for (const [day, list] of Object.entries(dayLog)) {
    if (list.length > 0 && (first === null || day < first)) first = day;
  }
  return first;
}

/**
 * 한 주 돌아보기에서 고른 다음 주 중점 칸을 떼어 낸다 — 그 칸이 비워지거나(key) 차트가 통째로 바뀌면(key 없음)
 * 같은 자리에 새로 쓴 실천이 엉뚱하게 '중점'으로 보이지 않게. 메모와 돌아본 날은 남긴다.
 * 바뀐 게 없으면 같은 객체.
 */
export function detachReviewPicks(
  reviews: Record<string, WeekReviewEntry> | undefined,
  key?: string,
): Record<string, WeekReviewEntry> | undefined {
  if (!reviews) return reviews;
  let changed = false;
  const out: Record<string, WeekReviewEntry> = {};
  for (const [week, r] of Object.entries(reviews)) {
    const next = key === undefined ? [] : r.next.filter((k) => k !== key);
    if (next.length !== r.next.length) {
      changed = true;
      out[week] = { ...r, next };
    } else out[week] = r;
  }
  return changed ? out : reviews;
}

/**
 * 영역별 연속 기록 — 그 영역(`${ti}-` 키: 칸·직접 추가한 할 일·떼어 둔 기록 모두) 기록이 있는 날로 센다.
 * - cur: 오늘부터 거꾸로 이어진 날 수(오늘을 아직 안 했어도 어제까지 이어졌으면 끊기지 않는다)
 * - best: 전체 기록에서 가장 길게 이어진 날 수(정렬한 날짜를 한 번 훑는다 — 기간 제한 없음)
 * - week: 이번 주 월~일에 기록이 있었는지(1/0)
 */
export function areaStreak(dayLog: DayLog, ti: number, now: Date): { cur: number; best: number; week: number[] } {
  const prefix = `${ti}-`;
  const days = Object.keys(dayLog)
    .filter((k) => (dayLog[k] ?? []).some((x) => x.startsWith(prefix)))
    .sort();
  const has = new Set(days);

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of days) {
    run = prev !== null && daysBetween(prev, k) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = k;
  }

  const today = ymd(now);
  let cur = 0;
  for (let k = has.has(today) ? today : addDays(today, -1); has.has(k); k = addDays(k, -1)) cur++;

  const week = weekDates(now).map((d) => (has.has(ymd(d)) ? 1 : 0));
  return { cur, best: Math.max(best, cur), week };
}
