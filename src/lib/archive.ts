// 지난 표 — 지금 표를 닫아 보관하고 새 표를 시작한다 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
//
// 지난 표 한 장(ArchivedChart)은 닫을 때 모습 그대로의 8×8과 그 기간(from..to)의 기록을 담는다.
// - 기록은 이름을 바꾸기 전에 잘라 담는다 — 지난 표 안에서는 칸 키 "ti-ai"가 그 칸에 붙어 있다.
// - 지금 문서의 기록은 지우지 않고 칸에서 떼어 둔다(history.archiveAllCells) — 히트맵·영역 기록은 이어진다.
// - 아이디는 시작한 날로 정해진다('y' + from) — 두 기기에서 같은 표를 닫아도 지난 표 하나로 남는다.
// 화면 글은 여기서 만들지 않는다(yearLabel · chartRangeLabel만 fmt로 해 · 기간 표기를 돌려준다).
import type { Action, ArchivedChart, MandaratDoc, Settings, Theme, WeekReviewEntry } from '../types';
import { ARCHIVE_KEEP, ARCHIVE_NOTE_MAX, blankDoc, cleanArchives, scaffoldThemes } from '../data/defaults';
import { archiveAllCells, detachReviewPicks, firstLogDay, isArchivedKey } from './history';
import { kindOf, ymd } from './routine';
import { addDays } from './kinds';
import { msg, type Lang } from '../i18n';

/** 새 표를 어떻게 시작하나 — continue: 같은 실천을 새로 · areas: 8영역 이름만 · blank: 처음부터 */
export type NewChartMode = 'continue' | 'areas' | 'blank';

/**
 * 지금 표의 기간 — 시작한 날(없으면 첫 기록 날, 그것도 없으면 오늘) ~ 오늘.
 * 시작한 날을 모를 때(v3 백업 · 예전 저장본)는 가장 늦게 닫은 지난 표의 끝(to)보다 앞서 시작하지 않는다 —
 * 이미 닫은 기간을 또 담으면 같은 해가 지난 표 두 장에 겹친다.
 */
export function chartRange(doc: Pick<MandaratDoc, 'chartStart' | 'dayLog' | 'archives'>, now: Date): { from: string; to: string } {
  const to = ymd(now);
  const lastTo = (doc.archives ?? []).reduce((m, a) => (a.to > m ? a.to : m), '');
  let from = doc.chartStart ?? firstLogDay(doc.dayLog) ?? to;
  if (!doc.chartStart && lastTo && from < lastTo) from = lastTo;
  // 시계를 되돌린 기기 — 시작한 날이 오늘보다 늦으면 오늘 하루짜리 표로 본다
  return { from: from <= to ? from : to, to };
}

/** 지난 표 아이디 — 'y' + 시작한 날에서 '-'를 뺀 것 (같은 표는 어느 기기에서 닫아도 같은 아이디) */
export function archiveId(from: string): string {
  return `y${from.replace(/-/g, '')}`;
}

function within<T>(rec: Record<string, T> | undefined, from: string, to: string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(rec ?? {})) if (k >= from && k <= to) out[k] = v;
  return out;
}

/** 닫은 날(to) · 아이디 순서로 — migrate(cleanArchives)와 같은 순서 · 같은 상한(ARCHIVE_KEEP, 평소에는 닿지 않는다) */
function sortCap(list: ArchivedChart[]): ArchivedChart[] {
  const out = [...list].sort((a, b) => (a.to === b.to ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.to < b.to ? -1 : 1));
  return out.slice(-ARCHIVE_KEEP);
}

/** 칸 기록 키 "ti-ai" — 새 표에서 같은 칸을 다시 체크하면 앞 표의 키와 글자가 같다 */
const CELL_KEY = /^[0-7]-[0-7]$/;

/** 앞 표 — 이 표가 시작한 날(from)에 닫힌 다른 지난 표(같은 아이디는 같은 표를 다시 닫는 것이라 앞 표가 아니다) */
function prevChart(from: string, past: readonly ArchivedChart[]): ArchivedChart | undefined {
  return past.find((a) => a.to === from && a.id !== archiveId(from));
}

/**
 * 닫은 날의 겹침 — 표를 닫은 날(to)은 다음 표의 시작한 날(from)이기도 하다. 앞 표에 이미 담긴 그날의 기록은 빼서 두 번 세지 않는다.
 * - 칸 기록 "ti-ai"는 지금 문서에 떼어 둔 키 "ti-xh<시각>_ai"로 남아 있다(archiveAllCells) — 그 키를 뺀다.
 * - 닫기 전에 끝낸 직접 추가한 할 일 "ti-x<id>" · 그날 먼저 비운 칸 "ti-xh…_ai"는 앞 표에 같은 글자 그대로 있다 — 그 키를 뺀다
 *   (끝낸 할 일은 닫을 때 목록에서 빠지고, 새로 떼는 키는 새 시각이라 새 표의 기록과 글자가 겹치지 않는다).
 * - 새 표에서 같은 칸을 다시 체크한 "ti-ai"는 앞 표의 키와 글자가 같아도 남긴다.
 */
function dropClosedDay(dayLog: MandaratDoc['dayLog'], from: string, past: readonly ArchivedChart[]): MandaratDoc['dayLog'] {
  const closed = new Set(prevChart(from, past)?.dayLog[from] ?? []);
  const list = dayLog[from];
  if (closed.size === 0 || !list) return dayLog;
  const keep = list.filter((k) =>
    !(!CELL_KEY.test(k) && closed.has(k)) && !(isArchivedKey(k) && closed.has(k.replace(/-xh[0-9a-z]+_/, '-'))));
  if (keep.length === list.length) return dayLog;
  const out = { ...dayLog };
  if (keep.length > 0) out[from] = keep;
  else delete out[from];
  return out;
}

/** 닫은 날의 한 줄 · 기분 — 앞 표에 같은 것이 이미 담겼으면 이 표에서는 뺀다(닫은 뒤 고쳐 쓰면 다르니 남는다) */
function dropClosedDayMeta(dayMeta: MandaratDoc['dayMeta'], from: string, past: readonly ArchivedChart[]): MandaratDoc['dayMeta'] {
  const was = prevChart(from, past)?.dayMeta[from];
  const now = dayMeta[from];
  if (!was || !now || was.mood !== now.mood || (was.reflection ?? '') !== (now.reflection ?? '')) return dayMeta;
  const out = { ...dayMeta };
  delete out[from];
  return out;
}

/**
 * 지금 표를 지난 표 한 장으로 — 기록(dayLog · dayMeta · 돌아보기 · 마감한 날)을 그 기간으로 잘라 담는다.
 * 앞 표를 닫은 날(from)의 기록 중 앞 표에 이미 담긴 것은 뺀다(dropClosedDay).
 * 돌아보기 키는 그 주 월요일이라 기간에 걸친 주(월요일이 from보다 6일까지 앞선 주)도 담는다(defaults.cleanArchive와 같게).
 * 집중 시간은 이 표를 쓰는 동안의 것(focusMinutes − focusStart). 한 줄은 120자까지, 비면 없다.
 * migrate를 거쳐도 같은 모양이다(cleanArchives로 다듬어 돌려준다).
 */
export function makeArchive(doc: MandaratDoc, now: Date, note = ''): ArchivedChart {
  const { from, to } = chartRange(doc, now);
  const weekFrom = addDays(from, -6);
  const reviews = within<WeekReviewEntry>(doc.reviews, weekFrom, to);
  // 앞 표에서 이미 마감한 날로 담긴 닫은 날은 빼서 두 번 세지 않는다
  const prevClosed = prevChart(from, doc.archives ?? [])?.closedDays ?? [];
  const closedDays = (doc.closedDays ?? []).filter((d) => d >= from && d <= to && !(d === from && prevClosed.includes(d)));
  const text = Array.from(note.trim()).slice(0, ARCHIVE_NOTE_MAX).join('').trim();
  const raw: ArchivedChart = {
    id: archiveId(from),
    from,
    to,
    centerGoal: doc.centerGoal,
    themes: doc.themes,
    dayLog: dropClosedDay(within(doc.dayLog, from, to), from, doc.archives ?? []),
    dayMeta: dropClosedDayMeta(within(doc.dayMeta, from, to), from, doc.archives ?? []),
    ...(Object.keys(reviews).length > 0 ? { reviews } : {}),
    ...(closedDays.length > 0 ? { closedDays } : {}),
    focusMinutes: Math.max(0, Math.round((doc.focusMinutes ?? 0) - (doc.focusStart ?? 0))),
    ...(text ? { note: text } : {}),
  };
  return cleanArchives([raw])[0] ?? raw;
}

/** 날(주) 단위로 채우기 — mine에 없는 열쇠만 theirs에서 */
function fill<T>(mine: Record<string, T> | undefined, theirs: Record<string, T> | undefined): Record<string, T> {
  const out: Record<string, T> = { ...(mine ?? {}) };
  for (const [k, v] of Object.entries(theirs ?? {})) if (!(k in out)) out[k] = v;
  return out;
}

/**
 * 같은 표를 다시 닫을 때(닫기 전 저장본 · 예전 백업을 되돌린 뒤) — 이번 것을 바탕으로, 앞서 닫은 그 표에만 남은 기록을 잃지 않게 합친다.
 * 되돌린 저장본 · 백업보다 뒤에 쓴 기록은 앞서 닫은 지난 표에만 있다(readSnapshot · 백업 불러오기는 지난 표를 그대로 둔다).
 * - 기록(dayLog · dayMeta)은 날 단위로 — 이번 것에 없는 날만 앞 것에서 가져온다(같은 날은 지금 문서의 것)
 * - 마감한 날은 합집합, 돌아보기는 이번 것에 없는 주만, 집중 시간은 더 큰 쪽, 한 줄은 이번 것이 비면 앞 것
 */
export function mergeReclosed(next: ArchivedChart, same: ArchivedChart): ArchivedChart {
  const reviews = fill(next.reviews, same.reviews);
  const closedDays = [...new Set([...(next.closedDays ?? []), ...(same.closedDays ?? [])])].sort();
  const raw: ArchivedChart = {
    ...next,
    dayLog: fill(next.dayLog, same.dayLog),
    dayMeta: fill(next.dayMeta, same.dayMeta),
    ...(Object.keys(reviews).length > 0 ? { reviews } : {}),
    ...(closedDays.length > 0 ? { closedDays } : {}),
    focusMinutes: Math.max(next.focusMinutes ?? 0, same.focusMinutes ?? 0),
    ...(next.note || same.note ? { note: next.note || same.note } : {}),
  };
  return cleanArchives([raw])[0] ?? raw;
}

/**
 * 같은 실천으로 새 표를 시작할 때의 칸 — 글·메모·유형과 그 설정(요일·주 N회·목표·단위·한 번에 더하는 수·알림)만 남기고
 * 달성·쌓은 수는 처음으로, 기록(log · ratings)·마감·일정 내력·습관이던 날은 버린다. 습관은 오늘(day)부터 다시 센다.
 */
export function freshAction(a: Action, day: string): Action {
  const kind = kindOf(a);
  return {
    text: a.text,
    note: a.note,
    done: false,
    ...(a.kind ? { kind: a.kind } : {}),
    ...(a.days && a.days.length > 0 ? { days: [...a.days] } : {}),
    ...(a.perWeek ? { perWeek: a.perWeek } : {}),
    ...(kind === 'habit' ? { since: day } : {}),
    ...(a.goal !== undefined ? { goal: a.goal } : {}),
    ...(a.unit ? { unit: a.unit } : {}),
    ...(a.step !== undefined && a.step !== 1 ? { step: a.step } : {}),
    ...(kind === 'count' || a.count !== undefined ? { count: 0 } : {}),
    ...(a.remindAt ? { remindAt: a.remindAt } : {}),
  };
}

function blankActions(): Action[] {
  return Array.from({ length: 8 }, () => ({ text: '', note: '', done: false }));
}

function themesFor(doc: MandaratDoc, mode: NewChartMode, day: string): Theme[] {
  if (mode === 'blank') return scaffoldThemes();
  if (mode === 'areas') return doc.themes.map((t) => ({ title: t.title, color: t.color, icon: t.icon, actions: blankActions() }));
  return doc.themes.map((t) => ({ ...t, actions: t.actions.map((a) => freshAction(a, day)) }));
}

/**
 * 지금 표를 닫고 새 표를 시작한 문서 — null이면 아무것도 바꾸지 않는다(오늘 두 번 닫기):
 *   같은 아이디의 지난 표를 오늘(또는 시계를 되돌린 기기에서 그 뒤에) 닫았을 때, 또는 지금 표가 오늘 시작했고 오늘 닫은 지난 표가 있을 때.
 * - 같은 아이디의 지난 표가 더 일찍 닫혀 있으면 같은 표를 다시 닫는 것이다(닫기 전 저장본 · 예전 백업을 되돌린 뒤) —
 *   더 긴 이번 것으로 바꾸되 앞 것에만 남은 기록은 합친다(mergeReclosed). iCloud에서는 ar/<id> 하나라 늦게 닫은 것이 이긴다.
 * - archives: 지난 표들 + 이번 표(버리지 않는다 — 상한 ARCHIVE_KEEP은 깨진 저장본 대비)
 * - themes: mode대로. centerGoal: goal을 다듬은 것(비면 지금 목표)
 * - 오늘 목록의 실천은 비우고, 끝내지 않은 직접 추가한 할 일은 남긴다. 기분·한 줄·마감한 날은 그대로(지금 문서의 것)
 * - 칸 기록은 칸에서 떼어 두고(time: 떼어 둔 키의 시각, 보통 Date.now()), 돌아보기의 중점 칸도 떼어 낸다
 * - chartStart: 오늘, focusStart: 지금까지의 집중 시간, areasSet: blank가 아니면 참
 */
export function startNewChart(
  doc: MandaratDoc,
  mode: NewChartMode,
  now: Date,
  opts: { goal: string; note: string; time?: number },
): MandaratDoc | null {
  const archive = makeArchive(doc, now, opts.note);
  const today = ymd(now);
  const past = doc.archives ?? [];
  // 같은 지난 표를 오늘(이후) 이미 닫았거나, 오늘 닫고 시작한 표를 오늘 또 닫으려 할 때
  const same = past.find((a) => a.id === archive.id);
  if ((same && same.to >= today) || past.some((a) => archive.from === today && a.to === today)) return null;
  const next = same ? mergeReclosed(archive, same) : archive;
  const goal = opts.goal.trim();
  const reviews = detachReviewPicks(doc.reviews);
  return {
    ...doc,
    archives: sortCap([...past.filter((a) => a.id !== archive.id), next]),
    themes: themesFor(doc, mode, today),
    centerGoal: goal || doc.centerGoal,
    todayKeys: [],
    todayExtra: doc.todayExtra.filter((x) => !x.done),
    dayLog: archiveAllCells(doc.dayLog, opts.time ?? now.getTime()),
    ...(reviews ? { reviews } : {}),
    chartStart: today,
    focusStart: doc.focusMinutes ?? 0,
    areasSet: mode !== 'blank',
  };
}

/** 지난 표를 문서 모양으로 — 통계·차트를 그리는 순수 코드가 그대로 읽게. 오늘 목록은 비우고, 설정은 지금 것 */
export function archiveAsDoc(a: ArchivedChart, settings: Settings): MandaratDoc {
  return {
    ...blankDoc(),
    onboarded: true,
    centerGoal: a.centerGoal,
    themes: a.themes,
    todayKeys: [],
    todayExtra: [],
    dayLog: a.dayLog,
    dayMeta: a.dayMeta,
    focusMinutes: a.focusMinutes,
    settings,
    todayDate: a.to,
    areasSet: true,
    reviews: a.reviews ?? {},
    ...(a.closedDays ? { closedDays: a.closedDays } : {}),
    chartStart: a.from,
  };
}

/**
 * 지난 표로 할 수 있는 것 — 지난 표 열기 · 그 해 돌아보기 · 인쇄 · 그 표로 새로 시작하기는 프로.
 * 보관함 목록(이름·목표·수)은 늘 보인다. 방금 닫은 표의 돌아보기를 무료로 두려면 여기만 바꾼다(plan §1.3-5).
 */
export function archiveAccess(owned: boolean): { open: boolean; review: boolean; print: boolean; reuse: boolean } {
  return { open: owned, review: owned, print: owned, reuse: owned };
}

/** 처음부터 다시 — 보기 설정과 지난 표는 남긴다(저장본은 지난 표를 빼고 남기므로, 여기서 지우면 되찾을 수 없다) */
export function resetDoc(d: Pick<MandaratDoc, 'settings' | 'archives'>): MandaratDoc {
  return { ...blankDoc(), settings: d.settings, ...(d.archives && d.archives.length > 0 ? { archives: d.archives } : {}) };
}

/**
 * 백업을 불러올 때의 지난 표 — 아이디로 합치고 같은 아이디는 백업(incoming)의 것. 백업에 없는 지난 표는 남긴다.
 * 닫은 날 순서로(버리지 않는다), 하나도 없으면 undefined(필드를 두지 않는다).
 */
export function unionArchives(
  current: readonly ArchivedChart[] | undefined,
  incoming: readonly ArchivedChart[] | undefined,
): ArchivedChart[] | undefined {
  const byId = new Map<string, ArchivedChart>();
  for (const a of current ?? []) byId.set(a.id, a);
  for (const a of incoming ?? []) byId.set(a.id, a);
  const out = sortCap([...byId.values()]);
  return out.length > 0 ? out : undefined;
}

/**
 * 한 해를 마무리하자고 권할 때인가 — 12월 15일 ~ 1월 31일에만.
 * 닫을 해 Y: 12월이면 올해, 1월이면 지난해. 온보딩을 마쳤고, 지금 표를 그해 12월 1일 이전부터 썼고,
 * 이번 기간(Y-12-15 ~ Y+1-01-31)에 닫은 지난 표가 없을 때.
 */
export function yearClosePrompt(doc: Pick<MandaratDoc, 'onboarded' | 'chartStart' | 'dayLog' | 'archives'>, now: Date): boolean {
  const m = now.getMonth();
  const inDec = m === 11 && now.getDate() >= 15;
  if (!inDec && m !== 0) return false;
  if (!doc.onboarded) return false;
  const y = inDec ? now.getFullYear() : now.getFullYear() - 1;
  const winFrom = `${y}-12-15`;
  const winTo = `${y + 1}-01-31`;
  if (chartRange(doc, now).from > `${y}-12-01`) return false;
  return !(doc.archives ?? []).some((a) => a.to >= winFrom && a.to <= winTo);
}

/** 한 해의 몫으로 치는 날 수 — 두 해에 걸친 표는 두 해 모두 이만큼은 써야 두 해 이름('2026년 – 2027년')을 얻는다 */
export const YEAR_SHARE_DAYS = 45;
/** 이날(12월 15일)부터 시작한 표는 다음 해의 표다 — 한 해 마무리를 권하는 기간(yearClosePrompt)의 첫날 */
const NEXT_YEAR_FROM = '12-15';

/** 'YYYY-MM-DD' → 날 번호(하루에 1씩) */
function dayNo(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

/**
 * 표의 해 — 날이 가장 많이 든 해 하나(y). 두 해 모두 한 해의 몫(YEAR_SHARE_DAYS일)만큼 썼을 때만 두 해(y ~ y2).
 * 표를 닫은 날(to)은 다음 표가 시작한 날(from)이기도 해서, 달력 해로만 가르면 12월에 닫으면 새 표가, 1월에 닫으면
 * 닫은 표가 두 해 이름을 얻는다. 그래서 날 수로 고른다 — 12월 15일 ~ 1월 31일 어느 날 닫아도 닫은 표는 그해, 새 표는 다음 해.
 * - 12월 15일부터 시작한 표는 다음 해의 표다 — 그해 12월의 며칠은 다음 해 몫으로 센다(12월 29일에 시작한 표는 2027년).
 * - 어느 해도 한 해의 몫이 안 되는 짧은 표는 날이 많은 해, 같으면 앞 해(12월 1일에 시작해 1월 31일에 닫은 표는 시작한 해).
 * - 같은 표는 지금 쓰는 동안에도 닫은 뒤에도 같은 기간이면 같은 해로 적힌다(지금 표는 to가 오늘).
 */
export function chartYears(from: string, to: string): { y: number; y2?: number } {
  const end = to >= from ? to : from;
  const y0 = Number(from.slice(0, 4));
  const y1 = Number(end.slice(0, 4));
  // 해마다 든 날 수(시작한 날 · 끝 날 포함)
  const days = new Map<number, number>();
  for (let y = y0; y <= y1; y++) {
    days.set(y, dayNo(y === y1 ? end : `${y}-12-31`) - dayNo(y === y0 ? from : `${y}-01-01`) + 1);
  }
  if (from.slice(5) >= NEXT_YEAR_FROM) {
    days.set(y0 + 1, (days.get(y0 + 1) ?? 0) + (days.get(y0) ?? 0));
    days.delete(y0);
  }
  const years = [...days.keys()].sort((a, b) => a - b);
  if (years.length === 0) return { y: y0 };
  const full = years.filter((y) => (days.get(y) ?? 0) >= YEAR_SHARE_DAYS);
  if (full.length > 1) return { y: full[0], y2: full[full.length - 1] };
  return { y: years.reduce((best, y) => ((days.get(y) ?? 0) > (days.get(best) ?? 0) ? y : best), years[0]) };
}

/** 표의 해 표기 — '2026년', 두 해 모두 한 해의 몫만큼 쓴 표만 '2026년 – 2027년' (chartYears · fmt.year · fmt.yearSpan) */
export function yearLabel(from: string, to: string, l?: Lang): string {
  const { y, y2 } = chartYears(from, to);
  const f = msg(l).fmt;
  return y2 === undefined ? f.year({ y }) : f.yearSpan({ y, y2 });
}

/**
 * 지금 쓰는 표가 어느 해의 표인가 — 만다라트 탭의 '2027 만다라트', 표 이미지의 '2027 핵심 목표', 홈의 '남은 날'이 모두 이 해를 쓴다.
 * 오늘의 달력 해다. 다만 올해 12월 15일부터 시작한 표는 다음 해의 표라, 그해가 끝날 때까지를 센다(chartYears와 같은 규칙).
 */
export function chartYear(doc: Pick<MandaratDoc, 'chartStart' | 'dayLog' | 'archives'>, now: Date): number {
  const y = now.getFullYear();
  return chartRange(doc, now).from >= `${y}-${NEXT_YEAR_FROM}` ? y + 1 : y;
}

/**
 * 표의 기간 표기 — '1월 5일 – 12월 20일'(fmt.range). 하루뿐인 기간은 '12월 29일 – 29일'로 적지 않는다:
 * 지금 쓰는 표(open)는 '12월 29일부터'(year.rangeFrom), 닫은 표는 그날 하나 '12월 29일'.
 */
export function chartRangeLabel(from: string, to: string, open: boolean, l?: Lang): string {
  const m = msg(l);
  const day = (key: string) => {
    const [y, mo, d] = key.split('-').map(Number);
    return new Date(y, mo - 1, d);
  };
  if (to > from) return m.fmt.range({ from: day(from), to: day(to) });
  const date = m.fmt.monthDay({ d: day(from) });
  return open ? m.year.rangeFrom({ date }) : date;
}
