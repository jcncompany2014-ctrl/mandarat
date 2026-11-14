// 통계 화면에 놓을 글과 칸 (React·RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// 계산 자체(weekReview · cellActivity · dayBin …)는 review.ts가 하고, 여기서는 화면 한 줄·한 칸으로 바꾼다.
import type { MandaratDoc } from '../types';
import { kindOf, weekKey, ymd } from './routine';
import { addDays, fmtNum, ratingOf } from './kinds';
import { fmtDateLong, fmtDateShort, fmtRange } from './text';
import { msg, type Lang } from '../i18n';
import { bestDay, dayBin, firstLogDay, weekReview, type WeekDay, type WeekReview } from './review';
import { sundayOf } from './ritual';
import { ledgerHabitSpeech } from './sheetSpeech';
import { addedLine, addedSpeech, mindLine } from './ritualView';
import { daysLeftInYear, isoWeek } from './home';

/** 기록이 없을 때 화면 맨 위 한 줄 — 빈 양식 위에 이것 하나만 */
export function emptyLine(l?: Lang): string {
  return msg(l).stats.empty;
}

/** 기분 0~4의 낱말 — core.mood0~4 */
function moodWord(mood: number, l?: Lang): string {
  const c = msg(l).core;
  return [c.mood0, c.mood1, c.mood2, c.mood3, c.mood4][mood] ?? '';
}

// ── 큰 숫자 ──────────────────────────────────────────────────────────────────

/** '이어 온 날' 아래 한 줄 — 0일 · 오늘까지 이어 옴 · 오늘 하면 n+1일째 */
export function streakCaption(streak: number, todayHas: boolean, l?: Lang): string {
  const s = msg(l).stats;
  if (!(streak > 0)) return s.streakStart;
  return todayHas ? s.streakKept : s.streakNext({ n: streak + 1 });
}

/** 화면 읽기 — '연속 3일, 오늘은 아직' */
export function streakSpeech(streak: number, todayHas: boolean, l?: Lang): string {
  const s = msg(l).stats;
  const n = Math.max(0, streak);
  return todayHas ? s.streakSay({ n }) : s.streakSayPending({ n });
}

/**
 * 기록 줄 — '최고 기록 12일 · 이번 달 달성 3칸'. 지금 이어 가는 날이 최고 기록이면 앞부분이 '지금이 최고 기록'(best: true).
 * 아직 이어 온 날이 한 번도 없으면 앞부분 없이 이번 달만.
 */
export function recordParts(longest: number, streak: number, month: number, l?: Lang): { lead: string; best: boolean; month: string } {
  const s = msg(l).stats;
  const monthText = s.recordMonth({ n: Math.max(0, month) });
  if (!(longest > 0)) return { lead: '', best: false, month: monthText };
  if (streak > 0 && streak >= longest) return { lead: s.recordNow, best: true, month: monthText };
  return { lead: s.recordBest({ n: longest }), best: false, month: monthText };
}

// ── 이번 주 ──────────────────────────────────────────────────────────────────

/**
 * 이번 주 첫 줄 — 한 문장(sentence)이 있으면 그것, 없으면 상태 한 줄.
 * - 이번 주 기록 0 → emptyLine()
 * - 했지만 달성한 칸이 하나도 없음 → 달성이 무엇인지 알려 준다(했는데 0칸이라 헷갈리지 않게)
 */
export function weekLead(weekTotal: number, totalDone: number, sentence: string, l?: Lang): string {
  const s = msg(l).stats;
  if (!(weekTotal > 0)) return s.empty;
  if (!(totalDone > 0)) return s.weekNoDone({ n: weekTotal });
  return sentence || s.weekDid({ n: weekTotal });
}

/** 지난주 같은 기간과 견준 짧은 줄 — '지난주 이맘때보다 +2번' · '−1번' · '같아요'. 둘 다 0이면 '' */
export function weekDelta(total: number, prev: number, l?: Lang): string {
  if (!(total > 0) && !(prev > 0)) return '';
  const s = msg(l).stats;
  const d = total - prev;
  if (d === 0) return s.deltaSame;
  return d > 0 ? s.deltaMore({ n: d }) : s.deltaLess({ n: -d });
}

/** 막대 줄 하나를 한 번에 읽는 글 — '월 5번, 화 1번, 수 2번 오늘, 목요일부터는 아직' */
export function weekBarsSpeech(days: readonly Pick<WeekDay, 'dow' | 'count' | 'isToday' | 'future'>[], l?: Lang): string {
  const m = msg(l);
  const parts: string[] = [];
  for (const d of days) {
    if (d.future) {
      parts.push(m.stats.barFutureSay({ i: d.dow }));
      break;
    }
    parts.push((d.isToday ? m.stats.barTodaySay : m.stats.barDaySay)({ i: d.dow, n: d.count }));
  }
  return parts.join(m.core.listSep);
}

/** 막대 높이(pt) — 0은 막대 없음, 1 이상은 최소 6에서 가장 많은 날 72까지 */
export function barHeight(count: number, max: number, full = 72): number {
  if (!(count > 0)) return 0;
  return Math.max(6, (count / Math.max(1, max)) * full);
}

/**
 * 습관 줄 — 값 '5/9번'과 아래 한 줄. 이번 주 습관이 없으면 null(줄을 그리지 않는다).
 * 값·아래 줄·소리 모두 한 바탕(이번 주 전체 계획 routinePlannedWeek)으로 센다 — 한 것 + 놓침 + 남음 = 계획.
 * - 놓침: 지나간 예정일 중 못 한 것(주 N회는 남은 날로 더는 채울 수 없게 된 만큼만 — 주 중간엔 0)
 * - 남음: 아직 할 수 있는 것(오늘 포함)
 * - 계획을 다 채웠을 때만 '이번 주 다 했어요'(놓친 뒤 남은 게 없을 때 다 했다고 말하지 않는다)
 */
export function habitRow(
  r: Pick<WeekReview, 'habitCount' | 'routineDone' | 'routinePlannedWeek' | 'routineRemaining'>,
  l?: Lang,
): { value: string; sub: string; say?: string; subSay?: string } | null {
  if (!(r.habitCount > 0)) return null;
  const m = msg(l);
  const s = m.stats;
  const planned = Math.max(r.routinePlannedWeek, r.routineDone);
  if (!(planned > 0)) return { value: '—', sub: s.habitFromToday };
  const remaining = Math.max(0, r.routineRemaining);
  const missed = Math.max(0, planned - r.routineDone - remaining);
  const parts = r.routineDone >= planned
    ? [s.habitAll]
    : [missed > 0 ? s.habitMissed({ n: missed }) : '', remaining > 0 ? s.habitLeft({ n: remaining }) : ''].filter(Boolean);
  return {
    value: s.habitValue({ done: r.routineDone, total: planned }),
    sub: parts.join(m.core.dot),
    // '5/9번'은 날짜로 읽힌다 — 소리로는 '9번 중 5번'(한 주 돌아보기 장부와 같은 말), 가운뎃점은 쉼표로
    say: ledgerHabitSpeech(r.routineDone, planned, l),
    subSay: parts.join(m.core.listSep),
  };
}

/**
 * 이번 주 장부 한 줄의 화면 읽기 이름 — '습관 9번 중 5번, 2번 놓침, 2번 남음' · '쌓은 것 2권 더함, 50만 원 더함'.
 * say(소리 말)가 있으면 그것을, 없으면 보이는 값('—'는 '없음')을 읽는다. 아래 줄도 subSay가 있으면 그것을
 */
export function ledgerLabel(r: { label: string; value: string; sub?: string; say?: string; subSay?: string }, l?: Lang): string {
  const m = msg(l);
  const sub = r.subSay || r.sub;
  const head = m.stats.ledgerSay({ label: r.label, value: r.say || (r.value === '—' ? m.stats.ledgerNone : r.value) });
  return sub ? `${head}${m.core.listSep}${sub}` : head;
}

/** 집중한 시간 — '25분' · '2시간' · '1시간 5분' (fmt.duration) */
export function fmtMinutes(min: number, l?: Lang): string {
  return msg(l).fmt.duration({ mins: min });
}

// ── 돌아본 주 ────────────────────────────────────────────────────────────────

export interface ReviewRow {
  week: string;
  range: string;
  /** '24번 · 습관 80% · 마음가짐 3.5' — 그 주에 없던 것은 뺀다 */
  line: string;
  note: string;
}

/** 돌아본 주 한 줄 — 그 주를 닫힌 주로 다시 센다(돌아볼 때 본 숫자와 같게) */
export function reviewRow(doc: Pick<MandaratDoc, 'themes' | 'dayLog' | 'reviews'>, week: string, l?: Lang): ReviewRow {
  const m = msg(l);
  const r = weekReview(doc, sundayOf(week), { closed: true });
  const parts = [m.fmt.times({ n: r.total })];
  if (r.habitCount > 0 && r.routineDue > 0) parts.push(m.stats.reviewHabit({ pct: Math.round((Math.min(r.routineDone, r.routineDue) / r.routineDue) * 100) }));
  if (r.mindRated > 0) parts.push(m.stats.reviewMind({ avg: (Math.round((r.mindSum / r.mindRated) * 10) / 10).toFixed(1) }));
  return { week, range: fmtRange(week, l), line: parts.join(m.core.dot), note: doc.reviews?.[week]?.note?.trim() ?? '' };
}

// ── 최근 10주 ────────────────────────────────────────────────────────────────

export interface HeatCell {
  date: string;
  count: number;
  /** none: 그리지 않음(아직 안 온 날 · 쓰기 전 날) · empty: 지난 빈 날(테두리) · ink: 한 날 */
  state: 'none' | 'empty' | 'ink';
  bin: 0 | 1 | 2 | 3 | 4;
  today: boolean;
  best: boolean;
}

export interface HeatMap {
  cols: HeatCell[][];
  /** 열마다 위에 적을 달 이름('10월') — 없으면 '' */
  months: string[];
  /** 창 안에서 기록이 시작된 날 — 창보다 먼저 시작했거나 기록이 없으면 null */
  since: string | null;
  best: { date: string; count: number; thisWeek: boolean } | null;
  /** 기록이 있는 날 수 */
  active: number;
}

/**
 * 달력형 히트맵 칸 — weeks는 calendarWeeks()의 열(주)들. 첫 기록 전 날과 아직 안 온 날은 그리지 않는다.
 * 달 이름은 그 주 월요일이 새 달에 든 열 위에, 그리는 열에만(처음 그리는 열은 바로 다음 열이 새 달이 아닐 때만).
 */
export function heatMap(dayLog: MandaratDoc['dayLog'], weeks: readonly { date: string; future: boolean }[][], today: Date, l?: Lang): HeatMap {
  const monthLabel = (n: number) => msg(l).stats.monthLabel({ n });
  const tk = ymd(today);
  const first = firstLogDay(dayLog);
  const thisMonday = weekKey(today);
  const cols: HeatCell[][] = weeks.map((col) => col.map(({ date, future }) => {
    const count = future ? 0 : (dayLog[date] ?? []).length;
    const before = first === null || date < first;
    const state: HeatCell['state'] = future || (before && count === 0 && first !== null) ? 'none' : count > 0 ? 'ink' : 'empty';
    return { date, count, state, bin: dayBin(count), today: date === tk, best: false };
  }));
  const flat = cols.flat().filter((c) => c.state === 'ink');
  const top = bestDay(flat);
  if (top) top.best = true;
  const monthOf = (col: readonly { date: string }[]) => Number(col[0]?.date.slice(5, 7));
  // 그리지 않는 열(첫 기록 전 · 아직 안 온 주) 위에는 달 이름을 적지 않는다 — 빈 종이 위에 '8월'이 뜨지 않게.
  // 처음 그리는 열은 바로 다음 열이 새 달이 아닐 때만 그 달 이름을 적는다(첫 열과 같은 규칙)
  const drawn = cols.map((col) => col.some((c) => c.state !== 'none'));
  const firstDrawn = drawn.indexOf(true);
  const months = weeks.map((col, w) => {
    if (col.length === 0 || !drawn[w]) return '';
    const m = monthOf(col);
    if (w === firstDrawn) return w + 1 < weeks.length && drawn[w + 1] && monthOf(weeks[w + 1]) !== m ? '' : monthLabel(m);
    return monthOf(weeks[w - 1]) !== m ? monthLabel(m) : '';
  });
  const start = weeks[0]?.[0]?.date;
  return {
    cols,
    months,
    since: first !== null && start !== undefined && first > start ? first : null,
    best: top ? { date: top.date, count: top.count, thisWeek: top.date >= thisMonday } : null,
    active: flat.length,
  };
}

/** 히트맵 머리 한 줄 — '가장 많이 한 날 10.3 (금) · 6번 · 이번 주' */
export function bestLine(best: HeatMap['best'], l?: Lang): string {
  const m = msg(l);
  const s = m.stats;
  if (!best) return s.bestNone;
  const line = s.bestDay({ date: fmtDateShort(best.date, l), n: best.count });
  return best.thisWeek ? `${line}${m.core.dot}${s.thisWeek}` : line;
}

/** 히트맵 전체를 한 번에 읽는 글 — 날짜는 또박또박('10.3 (토)'는 소수로 읽힌다) */
export function heatSpeech(map: Pick<HeatMap, 'active' | 'best'>, l?: Lang): string {
  const m = msg(l);
  const head = m.stats.heatSay({ n: map.active });
  if (!map.best) return head;
  return `${head}${m.core.listSep}${m.stats.heatBestSay({ date: fmtDateLong(map.best.date, l), n: map.best.count })}`;
}

/**
 * 그날 한 것의 이름 — 앞 셋, 나머지는 '외 n개'. 칸 키는 지금 칸의 실천 글, 직접 추가한 할 일은 그 글,
 * 칸에서 떼어 둔 지난 기록·이름을 찾을 수 없는 키는 '지난 실천'.
 */
export function dayNames(doc: Pick<MandaratDoc, 'themes' | 'todayExtra'>, keys: readonly string[], l?: Lang): string {
  const m = msg(l);
  const past = m.stats.pastAction;
  const names = keys.map((k) => {
    const cell = /^([0-7])-([0-7])$/.exec(k);
    if (cell) return doc.themes[Number(cell[1])]?.actions[Number(cell[2])]?.text.trim() || past;
    const extra = /^([0-7])-x(.+)$/.exec(k);
    if (extra) return doc.todayExtra.find((e) => e.id === extra[2])?.text.trim() || past;
    return past;
  });
  const head = names.slice(0, 3).join(m.core.listSep);
  return names.length > 3 ? m.stats.namesMore({ names: head, n: names.length - 3 }) : head;
}

/** 히트맵에서 고른 날의 머리 줄 — '10.3 (금) · 4번 — 걷기, 독서, 물 2L 외 1개' */
export function pickedLine(doc: Pick<MandaratDoc, 'themes' | 'todayExtra' | 'dayLog'>, date: string, l?: Lang): string {
  const keys = doc.dayLog[date] ?? [];
  const base = msg(l).stats.pickedHead({ date: fmtDateShort(date, l), n: keys.length });
  return keys.length > 0 ? `${base} — ${dayNames(doc, keys, l)}` : base;
}

/** pickedLine을 소리로(고른 날 슬라이더의 값) — '10월 3일 토요일, 4번, 걷기, 독서, 물 2L 외 1개' */
export function pickedSpeech(doc: Pick<MandaratDoc, 'themes' | 'todayExtra' | 'dayLog'>, date: string, l?: Lang): string {
  const m = msg(l);
  const keys = doc.dayLog[date] ?? [];
  const base = m.stats.pickedSay({ date: fmtDateLong(date, l), n: keys.length });
  return keys.length ? `${base}${m.core.listSep}${dayNames(doc, keys, l)}` : base;
}

// ── 숫자 목표 ────────────────────────────────────────────────────────────────

/** 숫자 목표 정렬 — 아직 닿지 않은 것 먼저, 그 안에서 많이 찬 순 */
export function compareCounts(x: { reached: boolean; pct: number }, y: { reached: boolean; pct: number }): number {
  if (x.reached !== y.reached) return x.reached ? 1 : -1;
  return y.pct - x.pct;
}

/** 이번 주 더한 수 — '이번 주 +3권' (없으면 '이번 주 +0권') */
export function weekAddedText(amount: number, unit: string, l?: Lang): string {
  return msg(l).stats.weekAdded({ num: fmtNum(Math.max(0, amount)), unit });
}

// ── 회고 ─────────────────────────────────────────────────────────────────────

export interface MoodDay {
  date: string;
  /** 요일 한 글자 */
  dow: string;
  /** 0(힘듦)~4(최고) — 매기지 않았으면 null */
  mood: number | null;
}

/** 최근 days일(오늘 포함, 오래된 날 먼저)의 기분 */
export function moodStrip(dayMeta: MandaratDoc['dayMeta'], today: Date, days = 14, l?: Lang): MoodDay[] {
  const f = msg(l).fmt;
  const tk = ymd(today);
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(tk, i - (days - 1));
    const m = dayMeta[date]?.mood;
    const [y, mo, d] = date.split('-').map(Number);
    return {
      date,
      dow: f.dowNarrow({ i: new Date(y, mo - 1, d).getDay() }),
      mood: typeof m === 'number' && Number.isInteger(m) && m >= 0 && m <= 4 ? m : null,
    };
  });
}

/** 기분 줄 전체를 읽는 글 — '최근 14일 중 기분을 남긴 날 5일, 10월 12일 월요일 좋음, …' */
export function moodSpeech(strip: readonly MoodDay[], l?: Lang): string {
  const m = msg(l);
  const rated = strip.filter((d) => d.mood !== null);
  if (rated.length === 0) return m.stats.moodNoneSay({ days: strip.length });
  return [
    m.stats.moodSay({ days: strip.length, n: rated.length }),
    ...rated.map((d) => m.stats.moodDaySay({ date: fmtDateLong(d.date, l), word: moodWord(d.mood as number, l) })),
  ].join(m.core.listSep);
}

export interface ReflectionEntry {
  date: string;
  /** '10.12 (일) · 좋음' */
  head: string;
  /** head를 소리로 — '10월 12일 월요일, 좋음' */
  say: string;
  text: string;
}

/** 최근 days일 중 한 줄을 남긴 날 — 최근 날 먼저 */
export function reflections(dayMeta: MandaratDoc['dayMeta'], today: Date, days = 14, l?: Lang): ReflectionEntry[] {
  const { listSep: sep, dot } = msg(l).core;
  const tk = ymd(today);
  const out: ReflectionEntry[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(tk, -i);
    const meta = dayMeta[date];
    const text = meta?.reflection?.trim();
    if (!text) continue;
    const m = meta?.mood;
    const word = typeof m === 'number' && m >= 0 && m <= 4 ? moodWord(m, l) : '';
    out.push({
      date,
      head: word ? `${fmtDateShort(date, l)}${dot}${word}` : fmtDateShort(date, l),
      say: word ? `${fmtDateLong(date, l)}${sep}${word}` : fmtDateLong(date, l),
      text,
    });
  }
  return out;
}

// ── 디자인 A(build-plan S4) ──────────────────────────────────────────────────

/** 머리 위 줄 — '2026 · 42주 · D-78'(ISO 주 · 올해 남은 날) */
export function statsEyebrow(now: Date, l?: Lang): string {
  const w = isoWeek(now);
  return msg(l).stats.eyebrow({ y: w.year, w: w.week, days: daysLeftInYear(now) });
}

/** 한 줄에 넣는 영역 이름의 최대 글자 수(말줄임 포함) — 한 주 돌아보기의 한 문장과 같다 */
const NAME_MAX = 10;

/** 영역 이름 — 줄인 이름(name)과 조사를 고를 원래 이름(full). 이름을 짓지 않은 영역은 '영역 3' */
function areaNameOf(doc: Pick<MandaratDoc, 'themes'>, ti: number, l?: Lang): { name: string; full: string } {
  const full = doc.themes[ti]?.title.trim() || msg(l).chart.areaN({ n: ti + 1 });
  const chars = Array.from(full);
  return { name: chars.length > NAME_MAX ? `${chars.slice(0, NAME_MAX - 1).join('').trimEnd()}…` : full, full };
}

export interface WeekReading {
  /** 읽는 한 줄 — 기록이 없으면 emptyLine() */
  text: string;
  /** 가장 많이 챙긴 영역 · 가장 적게 챙긴 영역(문장에 이름이 나온 것) — 없으면 null */
  top: number | null;
  low: number | null;
}

/**
 * 이번 주를 읽는 한 줄(prompt) — 그 주에 가장 많이 챙긴 영역과 가장 적게 챙긴 영역에서(i18n stats.reading).
 * 적게 챙긴 영역은 실천을 적어 두었거나 그 주에 한 일이 있는 영역 중에서만 고른다(비어 있는 영역을 탓하지 않는다).
 * 같은 수면 앞 영역. 고를 영역이 모두 가장 많이 한 영역과 같은 수면 'k개 영역을 n번씩'. 기록이 없으면 emptyLine().
 */
export function weekReading(review: Pick<WeekReview, 'total' | 'areaCounts'>, doc: Pick<MandaratDoc, 'themes'>, l?: Lang): WeekReading {
  const s = msg(l).stats;
  const counts = review.areaCounts;
  if (!(review.total > 0) || !counts.some((c) => c > 0)) return { text: s.empty, top: null, low: null };
  let top = 0;
  counts.forEach((c, ti) => { if (c > counts[top]) top = ti; });
  const inPlay = (ti: number) => counts[ti] > 0 || !!doc.themes[ti]?.actions.some((a) => a.text.trim() !== '');
  let low = -1;
  counts.forEach((c, ti) => {
    if (ti === top || !inPlay(ti)) return;
    if (low < 0 || c < counts[low]) low = ti;
  });
  const a = areaNameOf(doc, top, l);
  if (low < 0) return { text: s.reading({ top: a.name, topFull: a.full, n: counts[top], low: '', lowFull: '', lowN: 0 }), top, low: null };
  if (counts[low] === counts[top]) {
    const k = counts.filter((c, ti) => inPlay(ti) && c === counts[top]).length;
    return { text: s.readingEven({ k, n: counts[top] }), top: null, low: null };
  }
  const b = areaNameOf(doc, low, l);
  return { text: s.reading({ top: a.name, topFull: a.full, n: counts[top], low: b.name, lowFull: b.full, lowN: counts[low] }), top, low };
}

/** 막대 아래 영역 표 — 그 주에 한 영역(많은 순, 같으면 영역 순) + 한 줄이 '아직'이라 부른 영역(0) */
export function weekAreaKey(counts: readonly number[], low: number | null): { ti: number; n: number }[] {
  const out = counts.map((n, ti) => ({ ti, n })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n || a.ti - b.ti);
  if (low !== null && !out.some((x) => x.ti === low)) out.push({ ti: low, n: counts[low] ?? 0 });
  return out;
}

/** 숫자 · 단위 조각 — '120일' → 120 · 일, '2시간 5분' → 2 · 시간 · 5 · 분, '6/41번' → 6/41 · 번. 숫자가 없으면 통째로 숫자 자리 */
export interface FigurePart {
  t: string;
  /** 단위(작은 글자)인가 */
  unit: boolean;
}

const FIGURE_NUM = /[+\-−]?\d[\d,.]*(?:\/\d[\d,.]*)?/g;

export function figureParts(text: string): FigurePart[] {
  const out: FigurePart[] = [];
  let at = 0;
  for (const m of text.matchAll(FIGURE_NUM)) {
    const i = m.index ?? 0;
    if (i > at) out.push({ t: text.slice(at, i), unit: true });
    out.push({ t: m[0], unit: false });
    at = i + m[0].length;
  }
  if (at < text.length) out.push({ t: text.slice(at), unit: true });
  return out.some((p) => !p.unit) ? out : [{ t: text, unit: false }];
}

/** 유형 줄의 링크 — 만다라트에서 정하기 · 그 칸 열어 점수 매기기 · 오늘에서 집중 시작하기 */
export type KindLink = { kind: 'set' } | { kind: 'rate'; ti: number; ai: number } | { kind: 'today' };

export interface KindRow {
  key: 'habit' | 'count' | 'mind' | 'focus';
  label: string;
  /** 오른쪽 숫자 — 없으면 이 유형은 기록이 없는 한 줄(link) */
  value?: string;
  sub: string;
  say?: string;
  subSay?: string;
  link?: KindLink;
}

/**
 * 이번 주의 유형 줄 — 습관 · 쌓기(이번 주 더한 것이 있을 때만) · 마음가짐 · 집중.
 * 기록이 없는 유형은 한 줄 + 링크(습관 · 마음가짐 칸이 없으면 '정하기', 매기지 않은 마음가짐은 '매기기', 집중이 없으면 '오늘 보기').
 */
export function kindRows(
  review: WeekReview,
  doc: Pick<MandaratDoc, 'themes' | 'focusMinutes'>,
  now: Date,
  l?: Lang,
): KindRow[] {
  const m = msg(l);
  const s = m.stats;
  const k = m.kinds;
  const rows: KindRow[] = [];
  const habit = habitRow(review, l);
  rows.push(habit ? { key: 'habit', label: k.labelHabit, ...habit } : { key: 'habit', label: k.labelHabit, sub: s.habitNone, link: { kind: 'set' } });
  if (review.added.length > 0) {
    rows.push({ key: 'count', label: k.labelCount, value: addedLine(review.added, l), sub: '', say: addedSpeech(review.added, l) });
  }
  if (!(review.mindTotal > 0)) {
    rows.push({ key: 'mind', label: k.labelMind, sub: s.mindNone, link: { kind: 'set' } });
  } else if (!(review.mindRated > 0)) {
    let at: { ti: number; ai: number } | null = null;
    doc.themes.forEach((th, ti) => th.actions.forEach((a, ai) => {
      if (!at && a.text.trim() && kindOf(a) === 'mind' && !(ratingOf(a, now) > 0)) at = { ti, ai };
    }));
    const target = at as { ti: number; ai: number } | null;
    rows.push({ key: 'mind', label: k.labelMind, sub: s.mindNotYet, link: target ? { kind: 'rate', ...target } : undefined });
  } else {
    rows.push({
      key: 'mind', label: k.labelMind, value: mindLine(review, l),
      sub: s.mindRatedOf({ total: review.mindTotal, done: review.mindRated }),
    });
  }
  const mins = doc.focusMinutes ?? 0;
  rows.push(mins > 0
    ? { key: 'focus', label: s.ledgerFocus, value: fmtMinutes(mins, l), sub: s.soFar }
    : { key: 'focus', label: s.ledgerFocus, sub: s.focusNone, link: { kind: 'today' } });
  return rows;
}

/** 칸 진하기(dayBin 0~4) → 토큰 이름. 최근 10주(날): tile → printMid → printEdge → ink2 → ink */
export const HEAT_TONES = ['tile', 'printMid', 'printEdge', 'ink2', 'ink'] as const;
/** 닳은 자리(칸, 영역 색): 기록 없음 tile → tint → wash → washL1 → dye */
export const WEAR_TONES = ['tile', 'tint', 'wash', 'washL1', 'dye'] as const;
