// Default scaffold + an optional rich sample (loadable from Settings).
import type { Action, MandaratDoc, Theme } from '../types';

export const CENTER_EN = 'My Best Self';

interface ThemeSeed {
  title: string;
  color: string;
  icon: Theme['icon'];
  sample: { kr: string; done?: boolean }[];
}

// The 8 pillars: positional color + icon are fixed per slot; titles & actions are editable.
export const THEME_SEEDS: ThemeSeed[] = [
  {
    title: '건강', color: '#2FA968', icon: 'heart',
    sample: [
      { kr: '주 3회 운동', done: true }, { kr: '하루 물 2L', done: true }, { kr: '11시 취침' },
      { kr: '1만보 걷기', done: true }, { kr: '단 음식 줄이기' }, { kr: '정기 건강검진', done: true },
      { kr: '스트레칭 10분', done: true }, { kr: '야식 끊기' },
    ],
  },
  {
    title: '커리어', color: '#4F6BED', icon: 'briefcase',
    sample: [
      { kr: '사이드 프로젝트', done: true }, { kr: '발표 1회' }, { kr: '멘토 찾기', done: true },
      { kr: '이력서 갱신' }, { kr: '새 기술 1개', done: true }, { kr: '업계 네트워킹' },
      { kr: '성과 기록' }, { kr: '자격증 취득' },
    ],
  },
  {
    title: '자기계발', color: '#E8A33D', icon: 'book',
    sample: [
      { kr: '책 12권 읽기', done: true }, { kr: '온라인 강의', done: true }, { kr: '영어 회화' },
      { kr: '매일 글쓰기', done: true }, { kr: '새 언어 배우기' }, { kr: '다큐 시청', done: true },
      { kr: '메모 정리' }, { kr: '강연 참석' },
    ],
  },
  {
    title: '관계', color: '#E5547F', icon: 'people',
    sample: [
      { kr: '부모님 주 1통화', done: true }, { kr: '친구 모임' }, { kr: '감사 표현하기', done: true },
      { kr: '데이트 나이트' }, { kr: '새 친구 사귀기' }, { kr: '손편지 쓰기' },
      { kr: '경청 연습' }, { kr: '봉사활동' },
    ],
  },
  {
    title: '재정', color: '#159E9E', icon: 'coin',
    sample: [
      { kr: '가계부 쓰기', done: true }, { kr: '비상금 마련', done: true }, { kr: '투자 공부' },
      { kr: '구독 정리', done: true }, { kr: '수입 20% 저축' }, { kr: '부수입 만들기' },
      { kr: '소비 점검' }, { kr: '연금 점검' },
    ],
  },
  {
    title: '취미', color: '#8B5CF6', icon: 'palette',
    sample: [
      { kr: '사진 찍기', done: true }, { kr: '요리 10가지', done: true }, { kr: '악기 배우기' },
      { kr: '그림 그리기', done: true }, { kr: '등산 가기' }, { kr: '식물 키우기', done: true },
      { kr: '보드게임' }, { kr: '캠핑 가기' },
    ],
  },
  {
    title: '마음챙김', color: '#4DA3E0', icon: 'lotus',
    sample: [
      { kr: '명상 10분', done: true }, { kr: '감사일기', done: true }, { kr: '디지털 디톡스' },
      { kr: '호흡 연습', done: true }, { kr: '산책하기', done: true }, { kr: '일기 쓰기' },
      { kr: '요가', done: true }, { kr: '감정 체크' },
    ],
  },
  {
    title: '모험', color: '#F4793B', icon: 'compass',
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
    actions: s.sample.map((a) => ({ text: a.kr, note: '', done: !!a.done })),
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
    settings: { mood: '연꽃', accent: '#B0883C', mgmt: '일일 체크', cellShape: '둥근' },
  };
}

/**
 * 저장된 문서를 현재 스키마로 안전하게 이행한다.
 * - 누락/손상된 필드는 blankDoc 기본값으로 채운다.
 * - settings는 깊은 병합으로 새 옵션 추가에도 안전.
 * - 향후 스키마 변경 시 parsed.version 으로 분기해 단계적 업그레이드.
 */
export function migrate(parsed: unknown): MandaratDoc {
  const base = blankDoc();
  if (!parsed || typeof parsed !== 'object') return base;
  const p = parsed as Partial<MandaratDoc>;
  return {
    ...base,
    ...p,
    version: 1,
    settings: { ...base.settings, ...(p.settings ?? {}) },
  };
}
