// 칸 기록 떼어 두기 — 칸을 비우거나 차트를 통째로 바꿀 때 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
//
// 실천 기록(dayLog)은 칸 자리 "ti-ai"로 남는다. 칸을 비우고 새 실천을 쓰면 이전 실천의 기록이 새 실천에
// 붙어(오늘 이미 한 것처럼 보이는 등) 거짓이 되고, 그렇다고 지우면 실제로 한 날이 사라진다.
// 그래서 지우지 않고 이름만 바꿔 칸에서 떼어 둔다: "ti-ai" → "ti-xh<시각(36진)>_<ai>".
// - 날마다 기록 개수와 영역 접두사 `${ti}-`는 그대로라 히트맵·주간 합계·영역 연속 기록은 이어진다.
// - 칸 자리 키가 아니므로 습관 체크·오늘 했는지·칸별 기록에는 더 이상 잡히지 않는다.
// - 직접 추가한 할 일 키 "ti-x<id>"와 같은 꼴이라 저장본 검증(defaults.ts LOG_KEY_RE)을 그대로 통과한다.
import type { MandaratDoc, WeekReviewEntry } from '../types';
import { daysBetween, kindOf, setDayLog, weekDates, ymd } from './routine';
import { addDays, applyConfig, type KindConfig } from './kinds';

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
function renameKeys(dayLog: DayLog, rename: (key: string) => string | null, onDay?: (day: string) => boolean): DayLog {
  let changed = false;
  const out: DayLog = {};
  for (const [day, list] of Object.entries(dayLog)) {
    if ((onDay && !onDay(day)) || !list.some((k) => rename(k) !== null)) {
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

/** 칸 하나("ti-ai")의 지난 기록을 칸에서 떼어 둔다 — 지우지 않는다. onDay를 주면 그 날들만 */
export function archiveCellLog(dayLog: DayLog, key: string, time: number, onDay?: (day: string) => boolean): DayLog {
  const m = CELL_KEY_RE.exec(key);
  if (!m) return dayLog;
  const renamed = archivedKey(Number(m[1]), Number(m[2]), time);
  return renameKeys(dayLog, (k) => (k === key ? renamed : null), onDay);
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

/**
 * 하나라도 한 날이 이어진 날 수(오늘 또는 어제까지) — 아직 비어 있는 오늘은 끊지 않는다.
 * 기록한 날 모음을 거슬러 걸어 길이에 상한이 없다(최고 기록 review.longestStreak과 같은 기준).
 */
export function activeStreak(dayLog: DayLog, now: Date): number {
  const active = new Set<string>();
  for (const [day, list] of Object.entries(dayLog)) if (list.length > 0) active.add(day);
  let day = ymd(now);
  if (!active.has(day)) day = addDays(day, -1);
  let streak = 0;
  for (; active.has(day); day = addDays(day, -1)) streak++;
  return streak;
}

/** 이 키가 기록된 가장 늦은 날 — 없으면 null */
export function lastLogDay(dayLog: DayLog, key: string): string | null {
  let last: string | null = null;
  for (const [day, list] of Object.entries(dayLog)) if ((last === null || day > last) && list.includes(key)) last = day;
  return last;
}

type CellDoc = Pick<MandaratDoc, 'themes' | 'dayLog'>;

function withAction<T extends CellDoc>(doc: T, ti: number, ai: number, next: MandaratDoc['themes'][number]['actions'][number], dayLog: DayLog): T {
  return {
    ...doc,
    dayLog,
    themes: doc.themes.map((t, i) => (i === ti ? { ...t, actions: t.actions.map((x, j) => (j === ai ? next : x)) } : t)),
  };
}

/**
 * 칸에 유형 설정을 입힌 새 문서(저장소 setActionConfig) — day: 오늘 'YYYY-MM-DD', time: 떼어 둔 기록 키의 시각.
 * - 습관이 아니던 칸의 유형을 바꾸면 그 칸의 지난 기록(한 번 달성한 날·쌓은 날)을 칸에서 떼어 둔다 —
 *   새 유형이 이전 기록을 이어받아 '오늘 습관 했어요'처럼 보이지 않게(지우지 않아 히트맵·영역 기록에는 남는다).
 *   쌓기였던 칸은 쌓은 날(log에 더한 수가 있는 날)만 떼어 낸다 — 그 전에 습관이던 때의 체크는 남는다.
 *   습관이던 칸은 그대로 — 쌓기로 바꿨다 되돌려도 습관 체크가 사라지지 않는다.
 * - 쌓기는 그날 더한 수가 곧 그날 기록 — 이미 쌓기였던 칸은 지금까지를 줄여 그날 것이 사라졌다면 빼고,
 *   기록을 떼어 내고 쌓기가 된 칸은 그날 더한 수(log)만 다시 기록으로.
 * - since·일정 내력은 applyConfig가 맡는다(이미 습관이면 since 그대로, 일정을 고치면 지난 일정을 남긴다).
 */
export function configCell<T extends CellDoc>(doc: T, ti: number, ai: number, cfg: KindConfig, day: string, time: number): T {
  const prev = doc.themes[ti]?.actions[ai];
  if (!prev) return doc;
  const next = applyConfig(prev, cfg, day);
  const key = `${ti}-${ai}`;
  const was = kindOf(prev);
  const kind = kindOf(next);
  const archived = was !== kind && was !== 'habit';
  const counted = (d: string) => (prev.log?.[d] ?? 0) > 0;
  let dayLog = archived ? archiveCellLog(doc.dayLog, key, time, was === 'count' ? counted : undefined) : doc.dayLog;
  if (kind === 'count' && (was === 'count' || archived)) dayLog = setDayLog(dayLog, key, day, (next.log?.[day] ?? 0) > 0);
  return withAction(doc, ti, ai, next, dayLog);
}

/**
 * 칸 달성을 뒤집은 새 문서(저장소 toggleDone) — 습관의 칸 달성은 하루 체크와 별개, 쌓기의 그날 기록은 더한 수로만.
 * 그 밖(한 번·마음가짐)만 기록에 남긴다: 달성은 오늘(day)에, 풀면 달성을 남겼던 날(오늘이 아닐 수 있다)의 기록을 뺀다.
 */
export function toggleCellDone<T extends CellDoc>(doc: T, ti: number, ai: number, day: string): T {
  const a = doc.themes[ti]?.actions[ai];
  if (!a) return doc;
  const nowDone = !a.done;
  const kind = kindOf(a);
  const key = `${ti}-${ai}`;
  const dayLog = kind === 'habit' || kind === 'count'
    ? doc.dayLog
    : setDayLog(doc.dayLog, key, nowDone ? day : lastLogDay(doc.dayLog, key) ?? day, nowDone);
  return withAction(doc, ti, ai, { ...a, done: nowDone }, dayLog);
}
