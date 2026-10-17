// Default scaffold + an optional rich sample (loadable from Settings).
import {
  ICON_NAMES, type Action, type ActionKind, type ArchivedChart, type CellShape, type HabitSchedule, type MandaratDoc, type Mgmt, type Mood,
  type PaperPattern, type Reminders, type Settings, type Theme, type TodayExtra, type WeekReviewEntry,
} from '../types';
import { MOODS } from '../theme/moods';
import { GOLD, PILLAR_COLORS, migrateAccent, migrateAreaColor } from '../theme/palette';
import { KINDS, normalizeDays, normalizePerWeek, ymd } from '../lib/routine';
import { MAX_NUM, cleanNum, cleanUnit } from '../lib/kinds';

export const CENTER_EN = 'My Best Self';

interface ThemeSeed {
  title: string;
  color: string;
  icon: Theme['icon'];
  sample: SampleAction[];
}

/** 예시 칸 — 유형별 값과, 마감은 오늘부터 며칠 뒤(dueIn)로 */
interface SampleAction {
  kr: string;
  done?: boolean;
  kind?: ActionKind;
  days?: number[];
  perWeek?: number;
  goal?: number;
  unit?: string;
  count?: number;
  dueIn?: number;
  /** 마음가짐: 지난 몇 주의 점수(오래된 주 → 지난주) */
  rated?: number[];
}

// The 8 pillars: positional color + icon are fixed per slot; titles & actions are editable.
export const THEME_SEEDS: ThemeSeed[] = [
  {
    title: '건강', color: PILLAR_COLORS[0], icon: 'heart',
    sample: [
      { kr: '주 3회 운동', kind: 'habit', perWeek: 3 }, { kr: '하루 물 2L', done: true, days: [0, 1, 2, 3, 4, 5, 6] }, { kr: '11시 취침', kind: 'habit', days: [0, 1, 2, 3, 4] },
      { kr: '1만보 걷기', done: true, days: [0, 1, 2, 3, 4, 5, 6] }, { kr: '단 음식 줄이기' }, { kr: '정기 건강검진', done: true },
      { kr: '스트레칭 10분', done: true, days: [1, 2, 3, 4, 5] }, { kr: '야식 끊기' },
    ],
  },
  {
    title: '커리어', color: PILLAR_COLORS[1], icon: 'briefcase',
    sample: [
      { kr: '사이드 프로젝트', done: true }, { kr: '발표 1회' }, { kr: '멘토 찾기', done: true },
      { kr: '이력서 갱신', dueIn: 2 }, { kr: '새 기술 1개', done: true }, { kr: '업계 네트워킹' },
      { kr: '성과 기록' }, { kr: '자격증 취득', dueIn: 45 },
    ],
  },
  {
    title: '자기계발', color: PILLAR_COLORS[2], icon: 'book',
    sample: [
      { kr: '책 12권 읽기', kind: 'count', goal: 12, unit: '권', count: 7 }, { kr: '온라인 강의', done: true }, { kr: '영어 회화', kind: 'habit', perWeek: 2 },
      { kr: '아침 글쓰기', done: true, days: [1, 3, 5] }, { kr: '새 언어 배우기' }, { kr: '다큐 시청', done: true },
      { kr: '메모 정리' }, { kr: '강연 참석' },
    ],
  },
  {
    title: '관계', color: PILLAR_COLORS[3], icon: 'people',
    sample: [
      { kr: '부모님 주 1통화', done: true, kind: 'habit', perWeek: 1 }, { kr: '친구 모임' }, { kr: '감사 표현하기', kind: 'mind', rated: [2, 3, 3, 4] },
      { kr: '데이트 나이트' }, { kr: '새 친구 사귀기' }, { kr: '손편지 쓰기' },
      { kr: '경청 연습', kind: 'mind', rated: [3, 2, 4] }, { kr: '봉사활동' },
    ],
  },
  {
    title: '재정', color: PILLAR_COLORS[4], icon: 'coin',
    sample: [
      { kr: '가계부 쓰기', done: true, days: [0] }, { kr: '비상금 300만 원', done: true, kind: 'count', goal: 300, unit: '만 원', count: 300 }, { kr: '투자 공부' },
      { kr: '구독 정리', done: true }, { kr: '수입 20% 저축' }, { kr: '부수입 만들기' },
      { kr: '소비 점검' }, { kr: '연금 점검' },
    ],
  },
  {
    title: '취미', color: PILLAR_COLORS[5], icon: 'palette',
    sample: [
      { kr: '사진 찍기', done: true }, { kr: '요리 10가지', done: true, kind: 'count', goal: 10, unit: '가지', count: 10 }, { kr: '악기 배우기' },
      { kr: '그림 그리기', done: true }, { kr: '등산 가기' }, { kr: '식물 키우기', done: true },
      { kr: '보드게임' }, { kr: '캠핑 가기' },
    ],
  },
  {
    title: '마음챙김', color: PILLAR_COLORS[6], icon: 'lotus',
    sample: [
      { kr: '명상 10분', done: true, days: [0, 1, 2, 3, 4, 5, 6] }, { kr: '감사일기', done: true }, { kr: '디지털 디톡스' },
      { kr: '호흡 연습', done: true }, { kr: '산책하기', done: true }, { kr: '일기 쓰기' },
      { kr: '요가', done: true }, { kr: '감정 체크', kind: 'mind' },
    ],
  },
  {
    title: '모험', color: PILLAR_COLORS[7], icon: 'compass',
    sample: [
      { kr: '새 도시 3곳', done: true, kind: 'count', goal: 3, unit: '곳', count: 3 }, { kr: '혼자 여행' }, { kr: '번지점프' },
      { kr: '콘서트 가기' }, { kr: '새 음식 도전' }, { kr: '일출 보기' },
      { kr: '외국어 대화' }, { kr: '별 보기 캠핑' },
    ],
  },
];

function emptyActions(): Action[] {
  return Array.from({ length: 8 }, () => ({ text: '', note: '', done: false }));
}

/** Themes with the 8-pillar names filled in but actions left blank for the user. */
export function scaffoldThemes(): Theme[] {
  return THEME_SEEDS.map((s) => ({
    title: s.title, color: s.color, icon: s.icon, actions: emptyActions(),
  }));
}

/** Themes fully populated from the sample (for "예시로 채우기"). 마감은 today 기준으로 정한다. */
export function sampleThemes(today = new Date()): Theme[] {
  return THEME_SEEDS.map((s) => ({
    title: s.title, color: s.color, icon: s.icon,
    actions: s.sample.map((a): Action => ({
      text: a.kr, note: '', done: !!a.done,
      ...(a.kind ? { kind: a.kind } : {}),
      ...(a.days ? { days: a.days } : {}),
      ...(a.perWeek ? { perWeek: a.perWeek } : {}),
      ...(a.kind === 'count' ? { goal: a.goal, count: a.count ?? 0, ...(a.unit ? { unit: a.unit } : {}) } : {}),
      ...(a.dueIn !== undefined ? { due: ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + a.dueIn)) } : {}),
      ...(a.rated ? { ratings: pastWeeks(today, a.rated) } : {}),
    })),
  }));
}

/** 지난 몇 주(오래된 주 → 지난주)에 점수를 매긴 기록 — 주는 그 주 월요일 날짜 */
function pastWeeks(today: Date, scores: number[]): Record<string, number> {
  const mon = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const out: Record<string, number> = {};
  scores.forEach((score, i) => {
    out[ymd(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - (scores.length - i) * 7))] = score;
  });
  return out;
}

export function blankDoc(): MandaratDoc {
  return {
    version: 1,
    onboarded: false,
    centerGoal: '',
    centerGoalEn: CENTER_EN,
    themes: scaffoldThemes(),
    todayKeys: [],
    todayExtra: [],
    dayLog: {},
    dayMeta: {},
    focusMinutes: 0,
    settings: { mood: '연꽃', accent: GOLD, mgmt: '일일 체크', cellShape: '둥근' },
    areasSet: false,
    reviews: {},
  };
}

// ── 저장본 검증 ──────────────────────────────────────────────────────────────
export const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
/** 오늘 목록의 실천 키 "ti-ai" */
export const ACTION_KEY_RE = /^[0-7]-[0-7]$/;
/**
 * dayLog 키: 실천 "ti-ai", 직접 추가한 할 일 "ti-x<id>",
 * 또는 칸을 비우거나 통째로 바꿀 때 떼어 둔 지난 기록 "ti-xh<시각>_<ai>" (src/lib/history.ts)
 */
const LOG_KEY_RE = /^[0-7]-(?:[0-7]|x[A-Za-z0-9_-]{1,40})$/;
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
/** 알림 시각 'HH:MM' (24시간) */
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
/** 종이 무늬(프로) — 없으면 점 종이 */
export const PAPER_OPTS: readonly PaperPattern[] = ['grid', 'lines', 'blank'];
/**
 * 지난 표의 상한 — 깨진 저장본이 끝없이 커지지 않게 막는 안전장치일 뿐, 평소에는 닿지 않는다.
 * 지난 표는 사용자가 남긴 기념물이라 조용히 버리지 않는다: 표를 닫을 때(startNewChart)도,
 * 다른 기기·백업과 합칠 때(cleanArchives · iCloud union)도 이 수까지 모두 남긴다(1년에 한 장이면 수백 년).
 */
export const ARCHIVE_KEEP = 200;
/** 지난 표를 닫으며 적는 한 줄 메모의 글자 수 상한 */
export const ARCHIVE_NOTE_MAX = 120;
const HEX_RE = /^#[0-9a-f]{6}$/i;
const MOOD_OPTS = Object.keys(MOODS) as Mood[];
const MGMT_OPTS: readonly Mgmt[] = ['일일 체크', '습관 스트릭', '칸반'];
const SHAPE_OPTS: readonly CellShape[] = ['둥근', '각진'];

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function pick<T extends string>(v: unknown, options: readonly T[], fallback: T): T {
  return options.includes(v as T) ? (v as T) : fallback;
}

function cleanDayLog(v: unknown): MandaratDoc['dayLog'] {
  if (!isRecord(v)) return {};
  const out: MandaratDoc['dayLog'] = {};
  for (const [day, list] of Object.entries(v)) {
    if (!DATE_RE.test(day) || !Array.isArray(list)) continue;
    const keys = [...new Set(list.filter((k): k is string => typeof k === 'string' && LOG_KEY_RE.test(k)))];
    if (keys.length > 0) out[day] = keys;
  }
  return out;
}

function cleanDayMeta(v: unknown): MandaratDoc['dayMeta'] {
  if (!isRecord(v)) return {};
  const out: MandaratDoc['dayMeta'] = {};
  for (const [day, m] of Object.entries(v)) {
    if (!DATE_RE.test(day) || !isRecord(m)) continue;
    const e: { mood?: number; reflection?: string } = {};
    // + 0: -0은 JSON으로 저장하면 0이 되므로 이행 결과도 0으로 맞춘다(저장·불러오기 뒤에도 같은 문서)
    if (typeof m.mood === 'number' && Number.isInteger(m.mood) && m.mood >= 0 && m.mood <= 4) e.mood = m.mood + 0;
    if (typeof m.reflection === 'string') e.reflection = m.reflection;
    if (e.mood !== undefined || e.reflection !== undefined) out[day] = e;
  }
  return out;
}

/** 날짜 → 수 기록(쌓기의 그날 더한 수, 마음가짐의 주별 점수) — 날짜 형식과 값 검사를 통과한 것만 */
function cleanDateNums(v: unknown, ok: (n: unknown) => number | undefined): Record<string, number> | undefined {
  if (!isRecord(v)) return undefined;
  const out: Record<string, number> = {};
  for (const [day, n] of Object.entries(v)) {
    if (!DATE_RE.test(day)) continue;
    const c = ok(n);
    if (c !== undefined) out[day] = c;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** 남겨 두는 일정 내력 — 최근 60번 고친 것까지(그보다 오래된 날은 남은 것 중 첫 일정으로 센다) */
export const SCHEDULE_KEEP = 60;

/**
 * 습관 일정 내력 — from이 날짜이고 요일(0~6) 또는 주 N회(1~6)가 맞는 토막만, from 순서로 겹치지 않게(같은 날은 나중 것).
 * 바로 앞 토막과 같은 일정은 합친다. 토막이 둘 이상일 때만 남긴다(하나면 지금 값과 같아 내력이 필요 없다).
 */
function cleanSchedule(v: unknown): HabitSchedule[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const byDay = new Map<string, HabitSchedule>();
  for (const e of v) {
    if (!isRecord(e) || typeof e.from !== 'string' || !DATE_RE.test(e.from)) continue;
    const days = normalizeDays(e.days);
    const perWeek = normalizePerWeek(e.perWeek);
    if (days.length > 0) byDay.set(e.from, { from: e.from, days });
    else if (perWeek > 0) byDay.set(e.from, { from: e.from, perWeek });
  }
  const out: HabitSchedule[] = [];
  for (const from of [...byDay.keys()].sort()) {
    const e = byDay.get(from) as HabitSchedule;
    const last = out[out.length - 1];
    if (last && (last.perWeek ?? 0) === (e.perWeek ?? 0) && (last.days ?? []).join() === (e.days ?? []).join()) continue;
    out.push(e);
  }
  const kept = out.slice(-SCHEDULE_KEEP);
  return kept.length > 1 ? kept : undefined;
}

/** 실천 칸 하나 — 모르는 값·깨진 값은 버리고, 유형별 값은 형식이 맞을 때만 남긴다 */
function cleanAction(a: Record<string, unknown>): Action {
  const days = normalizeDays(a.days);
  const perWeek = normalizePerWeek(a.perWeek);
  const since = (days.length > 0 || perWeek > 0) && typeof a.since === 'string' && DATE_RE.test(a.since) ? a.since : undefined;
  const schedule = days.length > 0 || perWeek > 0 ? cleanSchedule(a.schedule) : undefined;
  const kind = (KINDS as readonly unknown[]).includes(a.kind) ? (a.kind as ActionKind) : undefined;
  // 습관에서 쌓기로 바꾼 날 — 쌓기이고 이어 갈 since가 있을 때만 뜻이 있다
  const habitUntil = kind === 'count' && since && typeof a.habitUntil === 'string' && DATE_RE.test(a.habitUntil) ? a.habitUntil : undefined;
  const goal = cleanNum(a.goal, 0.01);
  const unit = cleanUnit(a.unit);
  const step = cleanNum(a.step, 0.01);
  const count = cleanNum(a.count, 0, MAX_NUM);
  const log = cleanDateNums(a.log, (n) => cleanNum(n, 0.01));
  const due = typeof a.due === 'string' && DATE_RE.test(a.due) ? a.due : undefined;
  const ratings = cleanDateNums(a.ratings, (n) => (Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 5 ? (n as number) : undefined));
  // 습관 알림 시각 — 유형과 상관없이 형식이 맞으면 남긴다(다른 유형 값은 남겨 둔다)
  const remindAt = typeof a.remindAt === 'string' && TIME_RE.test(a.remindAt) ? a.remindAt : undefined;
  return {
    text: typeof a.text === 'string' ? a.text : '',
    note: typeof a.note === 'string' ? a.note : '',
    done: !!a.done,
    ...(kind ? { kind } : {}),
    ...(days.length > 0 ? { days } : {}),
    ...(perWeek > 0 ? { perWeek } : {}),
    ...(since ? { since } : {}),
    ...(schedule ? { schedule } : {}),
    ...(habitUntil ? { habitUntil } : {}),
    ...(goal !== undefined ? { goal } : {}),
    ...(unit ? { unit } : {}),
    ...(step !== undefined && step !== 1 ? { step } : {}),
    ...(count !== undefined ? { count: count + 0 } : {}), // -0 → 0 (JSON 왕복과 같게)
    ...(log ? { log } : {}),
    ...(due ? { due } : {}),
    ...(ratings ? { ratings } : {}),
    ...(remindAt ? { remindAt } : {}),
  };
}

/** 8영역 × 8실천 — 손상된 슬롯은 기본 영역으로, 이전 원색은 연꽃 팔레트로, 모르는 아이콘은 슬롯 기본 아이콘으로 */
export function cleanThemes(raw: unknown): Theme[] {
  const seed = scaffoldThemes();
  const rawThemes = Array.isArray(raw) ? raw : [];
  return seed.map((s, i) => {
    const t = rawThemes[i];
    if (!isRecord(t)) return s;
    const actions = Array.isArray(t.actions) ? t.actions : [];
    return {
      title: typeof t.title === 'string' ? t.title : s.title,
      // 이전 원색 기본 팔레트였다면 연꽃 팔레트로 옮긴다(사용자가 고른 다른 색은 보존)
      color: typeof t.color === 'string' && HEX_RE.test(t.color) ? migrateAreaColor(t.color) : s.color,
      // 아는 아이콘만 — 'constructor' 같은 이름이 그대로 그려지면 앱이 멈춘다
      icon: (ICON_NAMES as readonly unknown[]).includes(t.icon) ? (t.icon as Theme['icon']) : s.icon,
      actions: s.actions.map((blank, j) => {
        const a = actions[j];
        return isRecord(a) ? cleanAction(a) : blank;
      }),
    };
  });
}

/** 알림 — 'HH:MM'이 맞는 아침·저녁과 참인 돌아보기만. 켠 것이 없으면 undefined(필드를 두지 않는다) */
export function cleanReminders(v: unknown): Reminders | undefined {
  if (!isRecord(v)) return undefined;
  const out: Reminders = {
    ...(typeof v.morning === 'string' && TIME_RE.test(v.morning) ? { morning: v.morning } : {}),
    ...(typeof v.evening === 'string' && TIME_RE.test(v.evening) ? { evening: v.evening } : {}),
    ...(v.review === true ? { review: true as const } : {}),
  };
  return Object.keys(out).length > 0 ? out : undefined;
}

function cleanExtras(v: unknown): TodayExtra[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: TodayExtra[] = [];
  v.forEach((x, i) => {
    if (!isRecord(x) || typeof x.text !== 'string' || !x.text.trim()) return;
    const ti = typeof x.ti === 'number' && Number.isInteger(x.ti) && x.ti >= 0 && x.ti <= 7 ? x.ti + 0 : 0;
    let id = typeof x.id === 'string' && ID_RE.test(x.id) ? x.id : `m${i}`;
    if (seen.has(id)) id = `${id.slice(0, 30)}d${i}`;
    seen.add(id);
    out.push({ id, ti, text: x.text, done: !!x.done });
  });
  return out;
}

// ── 한 주 돌아보기 ────────────────────────────────────────────────────────────
/** 다음 주 중점으로 고를 수 있는 칸 수 */
export const REVIEW_PICKS = 3;
/** 한 줄 메모 글자 수 상한 */
export const REVIEW_NOTE_MAX = 120;
/** 남겨 두는 돌아보기 — 최근 104주(2년) */
export const REVIEW_KEEP = 104;

/** 달력에 있는 날짜이면서 월요일인 'YYYY-MM-DD' (돌아보기의 키) */
export function isMondayKey(key: string): boolean {
  if (!DATE_RE.test(key)) return false;
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return ymd(dt) === key && dt.getDay() === 1;
}

/** 메모: 앞뒤 공백을 걷고 120자까지(글자 단위로 잘라 이모지 반쪽이 남지 않게) */
function clipNote(s: string): string {
  return Array.from(s.trim()).slice(0, REVIEW_NOTE_MAX).join('').trim();
}

/** 돌아보기 한 건 — 날짜가 깨졌으면 버리고(null), 중점 칸은 겹치지 않는 "ti-ai" 3개까지, 빈 메모는 두지 않는다 */
export function cleanReviewEntry(v: unknown): WeekReviewEntry | null {
  if (!isRecord(v) || typeof v.at !== 'string' || !DATE_RE.test(v.at)) return null;
  const next = Array.isArray(v.next)
    ? [...new Set(v.next.filter((k): k is string => typeof k === 'string' && ACTION_KEY_RE.test(k)))].slice(0, REVIEW_PICKS)
    : [];
  const note = typeof v.note === 'string' ? clipNote(v.note) : '';
  return { at: v.at, next, ...(note ? { note } : {}) };
}

/** 돌아보기 기록 — 키가 월요일 날짜인 것만, 최근 104주까지(오래된 주 → 최근 주 순서로 담는다) */
export function cleanReviews(v: unknown): Record<string, WeekReviewEntry> {
  if (!isRecord(v)) return {};
  const kept: [string, WeekReviewEntry][] = [];
  for (const wk of Object.keys(v).filter(isMondayKey).sort().reverse()) {
    if (kept.length >= REVIEW_KEEP) break;
    const e = cleanReviewEntry(v[wk]);
    if (e) kept.push([wk, e]);
  }
  const out: Record<string, WeekReviewEntry> = {};
  for (const [wk, e] of kept.reverse()) out[wk] = e;
  return out;
}

// ── 마감한 날 ────────────────────────────────────────────────────────────────
/** 남겨 두는 마감한 날 — 최근 400일 */
export const CLOSED_KEEP = 400;

/** 오늘 할 일을 다 해 마감한 날들 — 날짜 형식인 것만, 겹치지 않게, 오래된 날 → 최근 날 순서로 최근 400일까지 */
export function cleanClosedDays(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const days = [...new Set(v.filter((d): d is string => typeof d === 'string' && DATE_RE.test(d)))].sort();
  return days.slice(-CLOSED_KEEP);
}

// ── 지난 표 ──────────────────────────────────────────────────────────────────
/** from..to 안의 날짜 키만 남긴다 */
function within<T>(rec: Record<string, T>, from: string, to: string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(rec)) if (k >= from && k <= to) out[k] = v;
  return out;
}

/** 지난 표 한 장 — 아이디·기간이 깨졌으면 버리고(null), 기록은 그 기간 안의 것만, 빈 값은 두지 않는다 */
function cleanArchive(v: unknown): ArchivedChart | null {
  if (!isRecord(v) || typeof v.id !== 'string' || !ID_RE.test(v.id)) return null;
  const { from, to } = v;
  if (typeof from !== 'string' || typeof to !== 'string' || !DATE_RE.test(from) || !DATE_RE.test(to) || from > to) return null;
  // 돌아보기 키는 그 주 월요일 — 기간이 걸친 주(월요일이 from보다 6일까지 앞선 주)도 이 표의 주다
  const [fy, fm, fd] = from.split('-').map(Number);
  const weekFrom = ymd(new Date(fy, fm - 1, fd - 6));
  const reviews = within(cleanReviews(v.reviews), weekFrom, to);
  const closedDays = cleanClosedDays(v.closedDays).filter((d) => d >= from && d <= to);
  const focus = typeof v.focusMinutes === 'number' && Number.isInteger(v.focusMinutes) && v.focusMinutes >= 0 ? v.focusMinutes + 0 : 0;
  const note = typeof v.note === 'string' ? Array.from(v.note.trim()).slice(0, ARCHIVE_NOTE_MAX).join('').trim() : '';
  return {
    id: v.id,
    from,
    to,
    centerGoal: typeof v.centerGoal === 'string' ? v.centerGoal : '',
    themes: cleanThemes(v.themes),
    dayLog: within(cleanDayLog(v.dayLog), from, to),
    dayMeta: within(cleanDayMeta(v.dayMeta), from, to),
    ...(Object.keys(reviews).length > 0 ? { reviews } : {}),
    ...(closedDays.length > 0 ? { closedDays } : {}),
    focusMinutes: focus,
    ...(note ? { note } : {}),
  };
}

/** 지난 표들 — 아이디가 겹치면 앞의 것만, 닫은 날(to)·아이디 순서로(상한 ARCHIVE_KEEP은 깨진 저장본 대비) */
export function cleanArchives(v: unknown): ArchivedChart[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: ArchivedChart[] = [];
  for (const raw of v) {
    const a = cleanArchive(raw);
    if (!a || seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  out.sort((a, b) => (a.to === b.to ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.to < b.to ? -1 : 1));
  return out.slice(-ARCHIVE_KEEP);
}

/**
 * 8영역을 정했다고 볼 수 있는가.
 * - 저장된 참/거짓이 있으면 그대로 — 앱을 다시 열어도 시작하기 단계가 저절로 바뀌지 않는다.
 * - 값이 없는 이전 저장본·백업만 짐작한다: 실천이 하나라도 적혀 있거나, 기본 이름과 다른 영역 이름이 있으면(사용자가 고친 것) 참.
 */
function deriveAreasSet(flag: unknown, themes: Theme[]): boolean {
  if (typeof flag === 'boolean') return flag;
  return themes.some((t, i) => {
    const title = t.title.trim();
    return (title !== '' && title !== THEME_SEEDS[i]?.title) || t.actions.some((a) => a.text.trim() !== '');
  });
}

/**
 * 저장된(또는 백업에서 불러온) 문서를 현재 스키마로 안전하게 이행한다.
 * - 필드마다 형식을 검사해, 손상·누락된 값은 blankDoc 기본값으로 채운다.
 * - themes는 항상 8영역 × 8실천. 이전 원색 팔레트는 연꽃 팔레트로 옮긴다.
 *   아이콘 키는 그대로 둔다('lotus'도 유효 — 그림만 바뀐다).
 * - areasSet은 저장된 참/거짓을 지키고, 값이 없을 때만 적힌 실천·고친 영역 이름으로 짐작한다. reviews는 월요일 키·날짜·칸 키를 검사한다.
 * - settings.lastBackupAt은 날짜 형식일 때만 남긴다. closedDays는 날짜 형식만, 겹치지 않게 최근 400일까지(없으면 필드를 두지 않는다).
 * - 스키마 4: settings.reminders·paper, action.remindAt, archives·chartStart·focusStart — 값이 있을 때만 필드를 둔다.
 *   chartStart·focusStart는 오늘 날짜로 짐작하지 않는다. iCloud 봉투 _sync는 문서가 아니라 버린다.
 * - 알 수 없는 필드는 버린다. 향후 스키마 변경 시 parsed.version 으로 분기해 단계적 업그레이드.
 * - 멱등이다: migrate(migrate(x))와 JSON으로 저장했다 읽은 결과가 migrate(x)와 같다(tests/invariants.test.js).
 */
export function migrate(parsed: unknown): MandaratDoc {
  const base = blankDoc();
  if (!isRecord(parsed)) return base;
  const p = parsed;

  // themes는 항상 8개 슬롯이어야 한다. 손상된 저장본은 슬롯별로 안전하게 보정한다.
  const themes = cleanThemes(p.themes);

  const rs = isRecord(p.settings) ? p.settings : {};
  const settings: Settings = {
    mood: pick(rs.mood, MOOD_OPTS, base.settings.mood),
    // 사용자가 고른 포인트 컬러는 그대로 — 이전 원색 팔레트의 색만 대응 색으로 옮긴다
    accent: typeof rs.accent === 'string' && HEX_RE.test(rs.accent) ? migrateAccent(rs.accent) : base.settings.accent,
    mgmt: pick(rs.mgmt, MGMT_OPTS, base.settings.mgmt),
    cellShape: pick(rs.cellShape, SHAPE_OPTS, base.settings.cellShape),
    ...(typeof rs.lastBackupAt === 'string' && DATE_RE.test(rs.lastBackupAt) ? { lastBackupAt: rs.lastBackupAt } : {}),
  };
  const reminders = cleanReminders(rs.reminders);
  if (reminders) settings.reminders = reminders;
  // 프로가 없어도 고른 무늬는 남긴다 — 잠금은 화면이 그릴 때 정한다
  if (PAPER_OPTS.includes(rs.paper as PaperPattern)) settings.paper = rs.paper as PaperPattern;

  const todayKeys = Array.isArray(p.todayKeys)
    ? [...new Set(p.todayKeys.filter((k): k is string => typeof k === 'string' && ACTION_KEY_RE.test(k)))]
    : [];
  const closedDays = cleanClosedDays(p.closedDays);
  const focus = typeof p.focusMinutes === 'number' && Number.isFinite(p.focusMinutes) && p.focusMinutes > 0 ? Math.round(p.focusMinutes) : 0;
  const archives = cleanArchives(p.archives);
  // 오늘 날짜로 짐작하지 않는다 — 저장된 값이 맞을 때만(멱등)
  const chartStart = typeof p.chartStart === 'string' && DATE_RE.test(p.chartStart) ? p.chartStart : undefined;
  const focusStart = typeof p.focusStart === 'number' && Number.isInteger(p.focusStart) && p.focusStart >= 0 && p.focusStart <= focus ? p.focusStart + 0 : undefined;

  return {
    version: 1,
    onboarded: !!p.onboarded,
    centerGoal: typeof p.centerGoal === 'string' ? p.centerGoal : '',
    centerGoalEn: typeof p.centerGoalEn === 'string' ? p.centerGoalEn : CENTER_EN,
    themes,
    todayKeys,
    todayExtra: cleanExtras(p.todayExtra),
    dayLog: cleanDayLog(p.dayLog),
    dayMeta: cleanDayMeta(p.dayMeta),
    focusMinutes: focus,
    settings,
    ...(typeof p.todayDate === 'string' && DATE_RE.test(p.todayDate) ? { todayDate: p.todayDate } : {}),
    areasSet: deriveAreasSet(p.areasSet, themes),
    reviews: cleanReviews(p.reviews),
    ...(closedDays.length > 0 ? { closedDays } : {}),
    ...(archives.length > 0 ? { archives } : {}),
    ...(chartStart ? { chartStart } : {}),
    ...(focusStart !== undefined ? { focusStart } : {}),
  };
}
