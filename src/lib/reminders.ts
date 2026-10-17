// 알림 짜기(순수) — 문서와 지금 시각으로 앞날 14일의 알림을 짜고, 기기에 걸린 알림과의 차이를 낸다.
// React·RN·expo-notifications 없이 돈다(단위 테스트 대상). 기기에 거는 일은 notifier.native.ts가 한다.
//
// - 아침(am): 정한 시각마다 그날 할 일 수. 할 일이 없는 날은 건너뛴다. 오늘은 이미 한 것을 뺀다.
// - 저녁(pm): 오늘은 남은 일이 있을 때만, 앞날은 할 일이 있을 때만.
// - 습관(habit): remindAt이 있는 습관이 그날 할 습관이면(반복 요일, 또는 주 N회를 아직 못 채웠으면). 그날 이미 했으면 뺀다.
//   같은 날 같은 시각의 습관은 하나로 묶는다.
// - 돌아보기(review): 일요일 18:00, 그때 ritualTarget이 바로 그 주일 때만.
// 앞날의 목록은 projectDay(그날 아침 하루 정리를 마친 모습)로 센다 — 화면이 쓰는 todayItems의 기억을 건드리지 않는다.
import type { MandaratDoc } from '../types';
import type { PlannedReminder, ReminderKind } from './contracts';
import { TIME_RE } from '../data/defaults';
import { msg, type Lang } from '../i18n';
import { projectDay } from './dayProjection';
import { ritualTarget, RITUAL_HOUR } from './ritual';
import { autoToday, doneOn, kindOf, sortTodayItems, weekKey, ymd } from './routine';

/** 오늘부터 며칠 앞까지 거는가 */
export const REMINDER_DAYS = 14;
/** 한 번에 걸어 두는 알림 수 — iOS가 앱마다 64개까지만 남기므로 집중 끝 알림 자리를 남긴다 */
export const REMINDER_BUDGET = 60;
/** 한 주 돌아보기 알림 시각(일요일) — 돌아보기를 권하기 시작하는 시각과 같다 */
export const REVIEW_HOUR = RITUAL_HOUR;

/** 우리 알림의 id 머리 — 이것으로 시작하지 않는 알림은 건드리지 않는다 */
export const REMINDER_PREFIX = 'mandarat.';
/** 집중 끝 알림 — 짜는 알림과 따로 걸고 지운다(notifier.focusEnd) */
export const FOCUS_END_ID = 'mandarat.focus.end';
/** 안드로이드 알림 채널 */
export const REMINDER_CHANNEL = 'reminders';

const TODAY_URL = 'mandarat://today';

type PlanDoc = Pick<MandaratDoc, 'themes' | 'dayLog' | 'todayKeys' | 'todayExtra' | 'todayDate' | 'reviews' | 'settings'>;

const pad = (n: number) => String(n).padStart(2, '0');

/** 'HH:MM' → [시, 분] — 모양이 틀리면 null */
function parseTime(t: string | undefined): [number, number] | null {
  if (!t || !TIME_RE.test(t)) return null;
  const [h, m] = t.split(':').map(Number);
  return [h, m];
}

/** 알림 한 줄에 넣을 글 — 줄바꿈·겹친 공백을 한 칸으로 */
function oneLine(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** 짧은 지문(FNV-1a 32비트, 36진수) — 같은 글·시각·주소면 같은 값 */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function reminder(kind: ReminderKind, id: string, day: Date, hh: number, mm: number, title: string, body: string, url: string): PlannedReminder {
  const y = day.getFullYear();
  const m = day.getMonth() + 1;
  const d = day.getDate();
  const fireAt = new Date(y, m - 1, d, hh, mm).getTime();
  const sig = hash([title, body, `${hh}:${mm}`, url].join('\u0001'));
  return { id, kind, fireAt, at: { y, m, d, hh, mm }, title, body, url, sig };
}

/** 앞에서 max개를 잇고, 나머지 수를 '외 n개'로 */
function listBody(texts: string[], max: number, l?: Lang): string {
  const n = msg(l).notify;
  const head = texts.slice(0, max).join(n.sep);
  const rest = texts.length - max;
  return rest > 0 ? `${head} ${n.more({ n: rest })}` : head;
}

/**
 * 앞날 14일(오늘 포함)의 알림 — 울릴 시각 순, 60개까지. 이미 지난 시각은 뺀다.
 * 알림을 하나도 켜지 않았으면(settings.reminders도 습관 remindAt도 없으면) 빈 목록.
 */
export function planReminders(doc: PlanDoc, now: Date, opts: { lang?: Lang } = {}): PlannedReminder[] {
  const l = opts.lang;
  const n = msg(l).notify;
  const f = msg(l).fmt;
  const rem = doc.settings.reminders;
  const am = parseTime(rem?.morning);
  const pm = parseTime(rem?.evening);
  const habits: { ti: number; ai: number; at: [number, number] }[] = [];
  doc.themes.forEach((t, ti) => t.actions.forEach((a, ai) => {
    const at = parseTime(a.remindAt);
    if (at && a.text.trim() && kindOf(a) === 'habit') habits.push({ ti, ai, at });
  }));
  if (!am && !pm && !rem?.review && habits.length === 0) return [];

  const nowMs = now.getTime();
  const todayKey = ymd(now);
  const out: PlannedReminder[] = [];
  const textOf = (ti: number, ai: number) => oneLine(doc.themes[ti]?.actions[ai]?.text ?? '');

  for (let i = 0; i < REMINDER_DAYS; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const key = ymd(day);
    const isToday = key === todayKey;

    if (am || pm) {
      const p = projectDay(doc, day);
      // 화면의 '오늘' 순서대로(급한 것 먼저), 직접 추가한 할 일은 뒤에
      const items = sortTodayItems(p.items, doc, day);
      const all = [
        ...items.map((it) => ({ t: textOf(it.ti, it.ai), done: it.done })),
        ...p.extras.map((x) => ({ t: oneLine(x.text), done: x.done })),
      ].filter((x) => x.t !== '');
      // 오늘은 이미 한 것을 빼고, 앞날은 그날 할 것 전부
      const left = isToday ? all.filter((x) => !x.done).map((x) => x.t) : all.map((x) => x.t);
      if (am && left.length > 0) {
        const [hh, mm] = am;
        out.push(reminder('am', `mandarat.am.${key}.${pad(hh)}${pad(mm)}`, day, hh, mm, n.amTitle({ n: left.length }), listBody(left, 3, l), TODAY_URL));
      }
      if (pm && left.length > 0) {
        const [hh, mm] = pm;
        out.push(reminder('pm', `mandarat.pm.${key}.${pad(hh)}${pad(mm)}`, day, hh, mm, n.pmTitle({ n: left.length }), listBody(left, 2, l), TODAY_URL));
      }
    }

    // 습관 — 같은 시각끼리 묶는다(시각 순, 그 안에서는 칸 순)
    const byTime = new Map<string, string[][]>();
    for (const h of habits) {
      if (!autoToday(doc, h.ti, h.ai, day)) continue;
      if (doneOn(doc.dayLog, `${h.ti}-${h.ai}`, key)) continue;
      const hm = `${pad(h.at[0])}${pad(h.at[1])}`;
      const list = byTime.get(hm) ?? [];
      list.push([textOf(h.ti, h.ai), oneLine(doc.themes[h.ti].title ?? '')]);
      byTime.set(hm, list);
    }
    for (const [hm, list] of [...byTime].sort(([a], [b]) => (a < b ? -1 : 1))) {
      const hh = Number(hm.slice(0, 2));
      const mm = Number(hm.slice(2));
      const [title, body] = list.length === 1
        ? [list[0][0], n.habitBody({ area: list[0][1] })]
        : [n.habitsTitle({ n: list.length }), list.map((x) => x[0]).join(n.sep)];
      out.push(reminder('habit', `mandarat.habit.${key}.${hm}`, day, hh, mm, title, body, TODAY_URL));
    }

    // 한 주 돌아보기 — 일요일 18:00에 그 주를 돌아볼 차례일 때만
    if (rem?.review && day.getDay() === 0) {
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), REVIEW_HOUR);
      const week = weekKey(day);
      if (ritualTarget(doc, at) === week) {
        const [wy, wm, wd] = week.split('-').map(Number);
        const range = f.range({ from: new Date(wy, wm - 1, wd), to: day });
        out.push(reminder('review', `mandarat.review.${key}`, day, REVIEW_HOUR, 0, n.reviewTitle, n.reviewBody({ range }), `mandarat://ritual/${week}`));
      }
    }
  }

  return out
    .filter((p) => p.fireAt > nowMs)
    .sort((a, b) => a.fireAt - b.fireAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, REMINDER_BUDGET);
}

/** 우리가 짜서 거는 알림인가 — 다른 알림과 집중 끝 알림은 아니다 */
export function isPlannedId(id: string): boolean {
  return id.startsWith(REMINDER_PREFIX) && !id.startsWith('mandarat.focus.');
}

/**
 * 기기에 걸린 알림(existing)과 짠 알림(desired)의 차이.
 * - cancel: 우리 알림 중 이제 없거나 글·시각이 바뀐 것(바뀐 것은 지운 뒤 schedule로 다시 건다)
 * - schedule: 새로 걸 것
 * 우리 것이 아닌 id와 집중 끝 알림은 건드리지 않는다.
 */
export function diffReminders(existing: readonly { id: string; sig?: string }[], desired: readonly PlannedReminder[]): { cancel: string[]; schedule: PlannedReminder[] } {
  const want = new Map(desired.map((p) => [p.id, p]));
  const have = new Map<string, string | undefined>();
  for (const e of existing) if (isPlannedId(e.id)) have.set(e.id, e.sig);
  const cancel: string[] = [];
  for (const [id, sig] of have) {
    const p = want.get(id);
    if (!p || p.sig !== sig) cancel.push(id);
  }
  const schedule = desired.filter((p) => !have.has(p.id) || have.get(p.id) !== p.sig);
  return { cancel, schedule };
}

/** 기기에 넘길 시각 — iOS는 달력 시각(벽시계 그대로, 시간대를 옮겨도 그 시각), 안드로이드는 그 순간 */
export type ReminderTrigger =
  | { type: 'calendar'; year: number; month: number /* 1-based */; day: number; hour: number; minute: number; repeats: false }
  | { type: 'date'; date: number; channelId: typeof REMINDER_CHANNEL };

export function triggerFor(p: PlannedReminder, os: string): ReminderTrigger {
  if (os === 'ios') return { type: 'calendar', year: p.at.y, month: p.at.m, day: p.at.d, hour: p.at.hh, minute: p.at.mm, repeats: false };
  return { type: 'date', date: p.fireAt, channelId: REMINDER_CHANNEL };
}

/** 짠 알림의 열쇠 — 같으면 다시 걸 필요가 없다 */
export function planKey(plan: readonly PlannedReminder[]): string {
  return plan.map((p) => `${p.id}:${p.sig}`).join('|');
}
