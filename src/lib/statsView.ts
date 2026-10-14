// 통계 화면에 놓을 글과 칸 (React·RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// 계산 자체(weekReview · cellActivity · dayBin …)는 review.ts가 하고, 여기서는 화면 한 줄·한 칸으로 바꾼다.
import type { MandaratDoc } from '../types';
import { DOW_KR, weekKey, ymd } from './routine';
import { addDays, fmtNum } from './kinds';
import { MOOD_WORDS } from './copy';
import { fmtDateLong, fmtDateShort, fmtRange } from './text';
import { bestDay, dayBin, firstLogDay, weekReview, type WeekDay, type WeekReview } from './review';
import { sundayOf } from './ritual';
import { ledgerHabitSpeech } from './sheetSpeech';

/** 기록이 없을 때 화면 맨 위 한 줄 — 빈 양식 위에 이것 하나만 */
export const EMPTY_LINE = '하나 하면 여기부터 기록돼요';

// ── 큰 숫자 ──────────────────────────────────────────────────────────────────

/** '이어 온 날' 아래 한 줄 — 0일 · 오늘까지 이어 옴 · 오늘 하면 n+1일째 */
export function streakCaption(streak: number, todayHas: boolean): string {
  if (!(streak > 0)) return '하나 하면 시작돼요';
  return todayHas ? '오늘까지 이어 왔어요' : `오늘 하나 하면 ${streak + 1}일째`;
}

/** 화면 읽기 — '연속 3일, 오늘은 아직' */
export function streakSpeech(streak: number, todayHas: boolean): string {
  return `연속 ${Math.max(0, streak)}일${todayHas ? '' : ', 오늘은 아직'}`;
}

/**
 * 기록 줄 — '최고 기록 12일 · 이번 달 달성 3칸'. 지금 이어 가는 날이 최고 기록이면 앞부분이 '지금이 최고 기록'(best: true).
 * 아직 이어 온 날이 한 번도 없으면 앞부분 없이 이번 달만.
 */
export function recordParts(longest: number, streak: number, month: number): { lead: string; best: boolean; month: string } {
  const monthText = `이번 달 달성 ${Math.max(0, month)}칸`;
  if (!(longest > 0)) return { lead: '', best: false, month: monthText };
  if (streak > 0 && streak >= longest) return { lead: '지금이 최고 기록', best: true, month: monthText };
  return { lead: `최고 기록 ${longest}일`, best: false, month: monthText };
}

// ── 이번 주 ──────────────────────────────────────────────────────────────────

/**
 * 이번 주 첫 줄 — 한 문장(sentence)이 있으면 그것, 없으면 상태 한 줄.
 * - 이번 주 기록 0 → EMPTY_LINE
 * - 했지만 달성한 칸이 하나도 없음 → 달성이 무엇인지 알려 준다(했는데 0칸이라 헷갈리지 않게)
 */
export function weekLead(weekTotal: number, totalDone: number, sentence: string): string {
  if (!(weekTotal > 0)) return EMPTY_LINE;
  if (!(totalDone > 0)) return `이번 주 ${weekTotal}번 했어요. 칸은 한 번짜리 일을 끝내거나 목표 수에 닿으면 달성돼요.`;
  return sentence || `이번 주 ${weekTotal}번 했어요`;
}

/** 지난주 같은 기간과 견준 짧은 줄 — '지난주 이맘때보다 +2번' · '−1번' · '같아요'. 둘 다 0이면 '' */
export function weekDelta(total: number, prev: number): string {
  if (!(total > 0) && !(prev > 0)) return '';
  const d = total - prev;
  if (d === 0) return '지난주 이맘때와 같아요';
  return `지난주 이맘때보다 ${d > 0 ? '+' : '−'}${Math.abs(d)}번`;
}

/** 막대 줄 하나를 한 번에 읽는 글 — '월 5번, 화 1번, 수 2번 오늘, 목요일부터는 아직' */
export function weekBarsSpeech(days: readonly Pick<WeekDay, 'dow' | 'count' | 'isToday' | 'future'>[]): string {
  const parts: string[] = [];
  for (const d of days) {
    if (d.future) {
      parts.push(`${DOW_KR[d.dow]}요일부터는 아직`);
      break;
    }
    parts.push(`${DOW_KR[d.dow]} ${d.count}번${d.isToday ? ' 오늘' : ''}`);
  }
  return parts.join(', ');
}

/** 막대 높이(pt) — 0은 막대 없음, 1 이상은 최소 6에서 가장 많은 날 72까지 */
export function barHeight(count: number, max: number, full = 72): number {
  if (!(count > 0)) return 0;
  return Math.max(6, (count / Math.max(1, max)) * full);
}

/** 습관 줄 — 값 '5/7번'과 아래 한 줄. 이번 주 습관이 없으면 null(줄을 그리지 않는다) */
export function habitRow(
  r: Pick<WeekReview, 'habitCount' | 'routineDone' | 'routineDue' | 'routineRemaining'>,
): { value: string; sub: string; say?: string } | null {
  if (!(r.habitCount > 0)) return null;
  if (!(r.routineDue > 0) && !(r.routineDone > 0)) return { value: '—', sub: '오늘부터 세요' };
  const due = Math.max(r.routineDue, r.routineDone);
  return {
    value: `${r.routineDone}/${due}번`,
    sub: r.routineRemaining > 0 ? `이번 주 ${r.routineRemaining}번 남음` : '이번 주 다 했어요',
    // '5/7번'은 날짜로 읽힌다 — 소리로는 '7번 중 5번'(한 주 돌아보기 장부와 같은 말)
    say: ledgerHabitSpeech(r.routineDone, due),
  };
}

/**
 * 이번 주 장부 한 줄의 화면 읽기 이름 — '습관 7번 중 5번, 이번 주 2번 남음' · '쌓은 것 2권 더함, 50만 원 더함'.
 * say(소리 말)가 있으면 그것을, 없으면 보이는 값('—'는 '없음')을 읽는다
 */
export function ledgerLabel(r: { label: string; value: string; sub?: string; say?: string }): string {
  return `${r.label} ${r.say || (r.value === '—' ? '없음' : r.value)}${r.sub ? `, ${r.sub}` : ''}`;
}

/** 집중한 시간 — '25분' · '2시간' · '1시간 5분' */
export function fmtMinutes(min: number): string {
  const n = Math.max(0, Math.round(min));
  if (n < 60) return `${n}분`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
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
export function reviewRow(doc: Pick<MandaratDoc, 'themes' | 'dayLog' | 'reviews'>, week: string): ReviewRow {
  const r = weekReview(doc, sundayOf(week), { closed: true });
  const parts = [`${r.total}번`];
  if (r.habitCount > 0 && r.routineDue > 0) parts.push(`습관 ${Math.round((Math.min(r.routineDone, r.routineDue) / r.routineDue) * 100)}%`);
  if (r.mindRated > 0) parts.push(`마음가짐 ${(Math.round((r.mindSum / r.mindRated) * 10) / 10).toFixed(1)}`);
  return { week, range: fmtRange(week), line: parts.join(' · '), note: doc.reviews?.[week]?.note?.trim() ?? '' };
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
 * 달 이름은 그 주 월요일이 새 달에 든 열 위에(첫 열은 바로 다음 열이 새 달이 아닐 때만).
 */
export function heatMap(dayLog: MandaratDoc['dayLog'], weeks: readonly { date: string; future: boolean }[][], today: Date): HeatMap {
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
  const months = weeks.map((col, w) => {
    if (col.length === 0) return '';
    const m = monthOf(col);
    if (w === 0) return weeks.length > 1 && monthOf(weeks[1]) !== m ? '' : `${m}월`;
    return monthOf(weeks[w - 1]) !== m ? `${m}월` : '';
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
export function bestLine(best: HeatMap['best']): string {
  if (!best) return '아직 기록이 없어요';
  return `가장 많이 한 날 ${fmtDateShort(best.date)} · ${best.count}번${best.thisWeek ? ' · 이번 주' : ''}`;
}

/** 히트맵 전체를 한 번에 읽는 글 — 날짜는 또박또박('10.3 (토)'는 소수로 읽힌다) */
export function heatSpeech(map: Pick<HeatMap, 'active' | 'best'>): string {
  const best = map.best ? `, 가장 많이 한 날 ${fmtDateLong(map.best.date)} ${map.best.count}번` : '';
  return `최근 10주 중 ${map.active}일 실천${best}`;
}

/**
 * 그날 한 것의 이름 — 앞 셋, 나머지는 '외 n개'. 칸 키는 지금 칸의 실천 글, 직접 추가한 할 일은 그 글,
 * 칸에서 떼어 둔 지난 기록·이름을 찾을 수 없는 키는 '지난 실천'.
 */
export function dayNames(doc: Pick<MandaratDoc, 'themes' | 'todayExtra'>, keys: readonly string[]): string {
  const names = keys.map((k) => {
    const cell = /^([0-7])-([0-7])$/.exec(k);
    if (cell) return doc.themes[Number(cell[1])]?.actions[Number(cell[2])]?.text.trim() || '지난 실천';
    const extra = /^([0-7])-x(.+)$/.exec(k);
    if (extra) return doc.todayExtra.find((e) => e.id === extra[2])?.text.trim() || '지난 실천';
    return '지난 실천';
  });
  const head = names.slice(0, 3).join(', ');
  return names.length > 3 ? `${head} 외 ${names.length - 3}개` : head;
}

/** 히트맵에서 고른 날의 머리 줄 — '10.3 (금) · 4번 — 걷기, 독서, 물 2L 외 1개' */
export function pickedLine(doc: Pick<MandaratDoc, 'themes' | 'todayExtra' | 'dayLog'>, date: string): string {
  const keys = doc.dayLog[date] ?? [];
  const base = `${fmtDateShort(date)} · ${keys.length}번`;
  return keys.length > 0 ? `${base} — ${dayNames(doc, keys)}` : base;
}

/** pickedLine을 소리로(고른 날 슬라이더의 값) — '10월 3일 토요일, 4번, 걷기, 독서, 물 2L 외 1개' */
export function pickedSpeech(doc: Pick<MandaratDoc, 'themes' | 'todayExtra' | 'dayLog'>, date: string): string {
  const keys = doc.dayLog[date] ?? [];
  return `${fmtDateLong(date)}, ${keys.length}번${keys.length ? `, ${dayNames(doc, keys)}` : ''}`;
}

// ── 숫자 목표 ────────────────────────────────────────────────────────────────

/** 숫자 목표 정렬 — 아직 닿지 않은 것 먼저, 그 안에서 많이 찬 순 */
export function compareCounts(x: { reached: boolean; pct: number }, y: { reached: boolean; pct: number }): number {
  if (x.reached !== y.reached) return x.reached ? 1 : -1;
  return y.pct - x.pct;
}

/** 이번 주 더한 수 — '이번 주 +3권' (없으면 '이번 주 +0권') */
export function weekAddedText(amount: number, unit: string): string {
  return `이번 주 +${fmtNum(Math.max(0, amount))}${unit}`;
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
export function moodStrip(dayMeta: MandaratDoc['dayMeta'], today: Date, days = 14): MoodDay[] {
  const tk = ymd(today);
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(tk, i - (days - 1));
    const m = dayMeta[date]?.mood;
    const [y, mo, d] = date.split('-').map(Number);
    return {
      date,
      dow: DOW_KR[new Date(y, mo - 1, d).getDay()],
      mood: typeof m === 'number' && Number.isInteger(m) && m >= 0 && m <= 4 ? m : null,
    };
  });
}

/** 기분 줄 전체를 읽는 글 — '최근 14일 중 기분을 남긴 날 5일, 10월 12일 월요일 좋음, …' */
export function moodSpeech(strip: readonly MoodDay[]): string {
  const rated = strip.filter((d) => d.mood !== null);
  if (rated.length === 0) return `최근 ${strip.length}일 기분 기록 없음`;
  return [`최근 ${strip.length}일 중 기분을 남긴 날 ${rated.length}일`, ...rated.map((d) => `${fmtDateLong(d.date)} ${MOOD_WORDS[d.mood as number]}`)].join(', ');
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
export function reflections(dayMeta: MandaratDoc['dayMeta'], today: Date, days = 14): ReflectionEntry[] {
  const tk = ymd(today);
  const out: ReflectionEntry[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(tk, -i);
    const meta = dayMeta[date];
    const text = meta?.reflection?.trim();
    if (!text) continue;
    const m = meta?.mood;
    const word = typeof m === 'number' && m >= 0 && m <= 4 ? MOOD_WORDS[m] : '';
    out.push({
      date,
      head: word ? `${fmtDateShort(date)} · ${word}` : fmtDateShort(date),
      say: word ? `${fmtDateLong(date)}, ${word}` : fmtDateLong(date),
      text,
    });
  }
  return out;
}
