// Default scaffold + an optional rich sample (loadable from Settings).
import { ICON_NAMES, type Action, type CellShape, type MandaratDoc, type Mgmt, type Mood, type Settings, type Theme, type TodayExtra } from '../types';
import { MOODS } from '../theme/moods';
import { GOLD, PILLAR_COLORS, migrateAccent, migrateAreaColor } from '../theme/palette';
import { normalizeDays } from '../lib/routine';

export const CENTER_EN = 'My Best Self';

interface ThemeSeed {
  title: string;
  color: string;
  icon: Theme['icon'];
  sample: { kr: string; done?: boolean; days?: number[] }[];
}

// The 8 pillars: positional color + icon are fixed per slot; titles & actions are editable.
export const THEME_SEEDS: ThemeSeed[] = [
  {
    title: '건강', color: PILLAR_COLORS[0], icon: 'heart',
    sample: [
      { kr: '주 3회 운동', done: true }, { kr: '하루 물 2L', done: true, days: [0, 1, 2, 3, 4, 5, 6] }, { kr: '11시 취침' },
      { kr: '1만보 걷기', done: true }, { kr: '단 음식 줄이기' }, { kr: '정기 건강검진', done: true },
      { kr: '스트레칭 10분', done: true, days: [1, 2, 3, 4, 5] }, { kr: '야식 끊기' },
    ],
  },
  {
    title: '커리어', color: PILLAR_COLORS[1], icon: 'briefcase',
    sample: [
      { kr: '사이드 프로젝트', done: true }, { kr: '발표 1회' }, { kr: '멘토 찾기', done: true },
      { kr: '이력서 갱신' }, { kr: '새 기술 1개', done: true }, { kr: '업계 네트워킹' },
      { kr: '성과 기록' }, { kr: '자격증 취득' },
    ],
  },
  {
    title: '자기계발', color: PILLAR_COLORS[2], icon: 'book',
    sample: [
      { kr: '책 12권 읽기', done: true }, { kr: '온라인 강의', done: true }, { kr: '영어 회화' },
      { kr: '매일 글쓰기', done: true, days: [1, 3, 5] }, { kr: '새 언어 배우기' }, { kr: '다큐 시청', done: true },
      { kr: '메모 정리' }, { kr: '강연 참석' },
    ],
  },
  {
    title: '관계', color: PILLAR_COLORS[3], icon: 'people',
    sample: [
      { kr: '부모님 주 1통화', done: true }, { kr: '친구 모임' }, { kr: '감사 표현하기', done: true },
      { kr: '데이트 나이트' }, { kr: '새 친구 사귀기' }, { kr: '손편지 쓰기' },
      { kr: '경청 연습' }, { kr: '봉사활동' },
    ],
  },
  {
    title: '재정', color: PILLAR_COLORS[4], icon: 'coin',
    sample: [
      { kr: '가계부 쓰기', done: true, days: [0] }, { kr: '비상금 마련', done: true }, { kr: '투자 공부' },
      { kr: '구독 정리', done: true }, { kr: '수입 20% 저축' }, { kr: '부수입 만들기' },
      { kr: '소비 점검' }, { kr: '연금 점검' },
    ],
  },
  {
    title: '취미', color: PILLAR_COLORS[5], icon: 'palette',
    sample: [
      { kr: '사진 찍기', done: true }, { kr: '요리 10가지', done: true }, { kr: '악기 배우기' },
      { kr: '그림 그리기', done: true }, { kr: '등산 가기' }, { kr: '식물 키우기', done: true },
      { kr: '보드게임' }, { kr: '캠핑 가기' },
    ],
  },
  {
    title: '마음챙김', color: PILLAR_COLORS[6], icon: 'lotus',
    sample: [
      { kr: '명상 10분', done: true, days: [0, 1, 2, 3, 4, 5, 6] }, { kr: '감사일기', done: true }, { kr: '디지털 디톡스' },
      { kr: '호흡 연습', done: true }, { kr: '산책하기', done: true }, { kr: '일기 쓰기' },
      { kr: '요가', done: true }, { kr: '감정 체크' },
    ],
  },
  {
    title: '모험', color: PILLAR_COLORS[7], icon: 'compass',
    sample: [
      { kr: '새 도시 3곳', done: true }, { kr: '혼자 여행' }, { kr: '번지점프' },
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

/** Themes fully populated from the sample (for "예시로 채우기"). */
export function sampleThemes(): Theme[] {
  return THEME_SEEDS.map((s) => ({
    title: s.title, color: s.color, icon: s.icon,
    actions: s.sample.map((a) => ({ text: a.kr, note: '', done: !!a.done, ...(a.days ? { days: a.days } : {}) })),
  }));
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
  };
}

// ── 저장본 검증 ──────────────────────────────────────────────────────────────
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
/** 오늘 목록의 실천 키 "ti-ai" */
const ACTION_KEY_RE = /^[0-7]-[0-7]$/;
/** dayLog 키: 실천 "ti-ai" 또는 직접 추가한 할 일 "ti-x<id>" */
const LOG_KEY_RE = /^[0-7]-(?:[0-7]|x[A-Za-z0-9_-]{1,40})$/;
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
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
    if (typeof m.mood === 'number' && Number.isInteger(m.mood) && m.mood >= 0 && m.mood <= 4) e.mood = m.mood;
    if (typeof m.reflection === 'string') e.reflection = m.reflection;
    if (e.mood !== undefined || e.reflection !== undefined) out[day] = e;
  }
  return out;
}

function cleanExtras(v: unknown): TodayExtra[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: TodayExtra[] = [];
  v.forEach((x, i) => {
    if (!isRecord(x) || typeof x.text !== 'string' || !x.text.trim()) return;
    const ti = typeof x.ti === 'number' && Number.isInteger(x.ti) && x.ti >= 0 && x.ti <= 7 ? x.ti : 0;
    let id = typeof x.id === 'string' && ID_RE.test(x.id) ? x.id : `m${i}`;
    if (seen.has(id)) id = `${id.slice(0, 30)}d${i}`;
    seen.add(id);
    out.push({ id, ti, text: x.text, done: !!x.done });
  });
  return out;
}

/**
 * 저장된(또는 백업에서 불러온) 문서를 현재 스키마로 안전하게 이행한다.
 * - 필드마다 형식을 검사해, 손상·누락된 값은 blankDoc 기본값으로 채운다.
 * - themes는 항상 8영역 × 8실천. 이전 원색 팔레트는 연꽃 팔레트로 옮긴다.
 * - 알 수 없는 필드는 버린다. 향후 스키마 변경 시 parsed.version 으로 분기해 단계적 업그레이드.
 */
export function migrate(parsed: unknown): MandaratDoc {
  const base = blankDoc();
  if (!isRecord(parsed)) return base;
  const p = parsed;

  // themes는 항상 8개 슬롯이어야 한다. 손상된 저장본은 슬롯별로 안전하게 보정한다.
  const seed = scaffoldThemes();
  const rawThemes = Array.isArray(p.themes) ? p.themes : [];
  const themes: Theme[] = seed.map((s, i) => {
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
        if (!isRecord(a)) return blank;
        const days = normalizeDays(a.days);
        const since = days.length > 0 && typeof a.since === 'string' && DATE_RE.test(a.since) ? a.since : undefined;
        return {
          text: typeof a.text === 'string' ? a.text : '',
          note: typeof a.note === 'string' ? a.note : '',
          done: !!a.done,
          ...(days.length > 0 ? { days } : {}),
          ...(since ? { since } : {}),
        };
      }),
    };
  });

  const rs = isRecord(p.settings) ? p.settings : {};
  const settings: Settings = {
    mood: pick(rs.mood, MOOD_OPTS, base.settings.mood),
    accent: typeof rs.accent === 'string' && HEX_RE.test(rs.accent) ? migrateAccent(rs.accent) : base.settings.accent,
    mgmt: pick(rs.mgmt, MGMT_OPTS, base.settings.mgmt),
    cellShape: pick(rs.cellShape, SHAPE_OPTS, base.settings.cellShape),
  };

  const todayKeys = Array.isArray(p.todayKeys)
    ? [...new Set(p.todayKeys.filter((k): k is string => typeof k === 'string' && ACTION_KEY_RE.test(k)))]
    : [];
  const focus = typeof p.focusMinutes === 'number' && Number.isFinite(p.focusMinutes) && p.focusMinutes > 0 ? Math.round(p.focusMinutes) : 0;

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
  };
}
