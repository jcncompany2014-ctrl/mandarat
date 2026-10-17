// 지난 표 — 지금 표를 닫아 보관하고 새 표를 시작한다 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
//
// 지난 표 한 장(ArchivedChart)은 닫을 때 모습 그대로의 8×8과 그 기간(from..to)의 기록을 담는다.
// - 기록은 이름을 바꾸기 전에 잘라 담는다 — 지난 표 안에서는 칸 키 "ti-ai"가 그 칸에 붙어 있다.
// - 지금 문서의 기록은 지우지 않고 칸에서 떼어 둔다(history.archiveAllCells) — 히트맵·영역 기록은 이어진다.
// - 아이디는 시작한 날로 정해진다('y' + from) — 두 기기에서 같은 표를 닫아도 지난 표 하나로 남는다.
// 화면 글은 여기서 만들지 않는다(yearLabel만 fmt로 해 표기를 돌려준다).
import type { Action, ArchivedChart, MandaratDoc, Settings, Theme, WeekReviewEntry } from '../types';
import { ARCHIVE_KEEP, ARCHIVE_NOTE_MAX, blankDoc, cleanArchives, scaffoldThemes } from '../data/defaults';
import { archiveAllCells, detachReviewPicks, firstLogDay } from './history';
import { kindOf, ymd } from './routine';
import { addDays } from './kinds';
import { msg, type Lang } from '../i18n';

/** 새 표를 어떻게 시작하나 — continue: 같은 실천을 새로 · areas: 8영역 이름만 · blank: 처음부터 */
export type NewChartMode = 'continue' | 'areas' | 'blank';

/** 지금 표의 기간 — 시작한 날(없으면 첫 기록 날, 그것도 없으면 오늘) ~ 오늘 */
export function chartRange(doc: Pick<MandaratDoc, 'chartStart' | 'dayLog'>, now: Date): { from: string; to: string } {
  const to = ymd(now);
  const from = doc.chartStart ?? firstLogDay(doc.dayLog) ?? to;
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

/**
 * 지금 표를 지난 표 한 장으로 — 기록(dayLog · dayMeta · 돌아보기 · 마감한 날)을 그 기간으로 잘라 담는다.
 * 돌아보기 키는 그 주 월요일이라 기간에 걸친 주(월요일이 from보다 6일까지 앞선 주)도 담는다(defaults.cleanArchive와 같게).
 * 집중 시간은 이 표를 쓰는 동안의 것(focusMinutes − focusStart). 한 줄은 120자까지, 비면 없다.
 * migrate를 거쳐도 같은 모양이다(cleanArchives로 다듬어 돌려준다).
 */
export function makeArchive(doc: MandaratDoc, now: Date, note = ''): ArchivedChart {
  const { from, to } = chartRange(doc, now);
  const weekFrom = addDays(from, -6);
  const reviews = within<WeekReviewEntry>(doc.reviews, weekFrom, to);
  const closedDays = (doc.closedDays ?? []).filter((d) => d >= from && d <= to);
  const text = Array.from(note.trim()).slice(0, ARCHIVE_NOTE_MAX).join('').trim();
  const raw: ArchivedChart = {
    id: archiveId(from),
    from,
    to,
    centerGoal: doc.centerGoal,
    themes: doc.themes,
    dayLog: within(doc.dayLog, from, to),
    dayMeta: within(doc.dayMeta, from, to),
    ...(Object.keys(reviews).length > 0 ? { reviews } : {}),
    ...(closedDays.length > 0 ? { closedDays } : {}),
    focusMinutes: Math.max(0, Math.round((doc.focusMinutes ?? 0) - (doc.focusStart ?? 0))),
    ...(text ? { note: text } : {}),
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
 * 지금 표를 닫고 새 표를 시작한 문서 — null이면 아무것도 바꾸지 않는다:
 *   같은 아이디의 지난 표가 이미 있을 때, 또는 지금 표가 오늘 시작했고 오늘 닫은 지난 표가 있을 때(오늘 두 번 닫기).
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
  // 같은 지난 표가 이미 있거나, 오늘 닫고 시작한 표를 오늘 또 닫으려 할 때
  if (past.some((a) => a.id === archive.id || (archive.from === today && a.to === today))) return null;
  const goal = opts.goal.trim();
  const reviews = detachReviewPicks(doc.reviews);
  return {
    ...doc,
    archives: sortCap([...(doc.archives ?? []), archive]),
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

/** 표의 해 표기 — 한 해 안이면 '2026년', 해를 넘기면 '2026년 – 2027년' (fmt.year · fmt.yearSpan) */
export function yearLabel(from: string, to: string, l?: Lang): string {
  const y = Number(from.slice(0, 4));
  const y2 = Number(to.slice(0, 4));
  const f = msg(l).fmt;
  return y === y2 ? f.year({ y }) : f.yearSpan({ y, y2 });
}
