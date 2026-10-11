// Core data model for the Mandalart planner.

/** 앱이 그릴 수 있는 아이콘 이름 — 저장본·백업 검증에도 쓰는 단일 출처 */
export const ICON_NAMES = [
  'heart', 'briefcase', 'book', 'people', 'coin', 'palette', 'lotus', 'compass',
  'grid', 'home', 'check', 'checkCircle', 'chart', 'plus', 'chevR', 'chevL',
  'flame', 'sparkle', 'target', 'pencil', 'dots', 'calendar', 'bell', 'settings',
  'close', 'reset', 'trash', 'share', 'repeat', 'download', 'restore',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export type Mood = '연꽃' | '크림' | '화이트' | '파스텔' | '다크';
export type Mgmt = '일일 체크' | '습관 스트릭' | '칸반';
export type CellShape = '둥근' | '각진';

/** One of the 64 execution items. */
export interface Action {
  text: string;
  note: string;
  /** 만다라트 칸의 영구 달성 */
  done: boolean;
  /** 반복 요일 (0=일 … 6=토). 있으면 루틴 — 오늘 체크는 dayLog에 날짜별로 기록된다. */
  days?: number[];
  /** 반복 요일을 정한(바꾼) 날 'YYYY-MM-DD' — 그 전 날은 놓친 날로 세지 않는다 */
  since?: string;
}

/** One of the 8 sub-goals (each owns 8 actions). */
export interface Theme {
  title: string;
  color: string;
  icon: IconName;
  actions: Action[]; // length 8
}

export interface TodayExtra {
  id: string;
  ti: number;
  text: string;
  done: boolean;
}

export interface Settings {
  mood: Mood;
  accent: string;
  mgmt: Mgmt;
  cellShape: CellShape;
}

/** Persisted root document. */
export interface MandaratDoc {
  version: 1;
  onboarded: boolean;
  centerGoal: string;
  centerGoalEn: string;
  themes: Theme[]; // length 8
  todayKeys: string[]; // "ti-ai"
  todayExtra: TodayExtra[];
  /** date 'YYYY-MM-DD' -> list of action keys ("ti-ai") completed that day */
  dayLog: Record<string, string[]>;
  /** date 'YYYY-MM-DD' -> mood index + one-line reflection */
  dayMeta: Record<string, { mood?: number; reflection?: string }>;
  /** 누적 집중(포커스 타이머) 시간(분) */
  focusMinutes: number;
  settings: Settings;
  /** '오늘' 목록을 마지막으로 정리한 날짜 'YYYY-MM-DD' — 날짜가 바뀌면 완료한 항목을 정리한다 */
  todayDate?: string;
}
