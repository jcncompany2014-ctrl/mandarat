// Core data model for the Mandalart planner.

export type IconName =
  | 'heart' | 'briefcase' | 'book' | 'people' | 'coin' | 'palette' | 'lotus' | 'compass'
  | 'grid' | 'home' | 'check' | 'checkCircle' | 'chart' | 'plus' | 'chevR' | 'chevL'
  | 'flame' | 'sparkle' | 'target' | 'pencil' | 'dots' | 'calendar' | 'bell' | 'settings'
  | 'close' | 'reset' | 'trash';

export type Mood = '크림' | '화이트' | '파스텔' | '다크';
export type Mgmt = '일일 체크' | '습관 스트릭' | '칸반';
export type CellShape = '둥근' | '각진';

/** One of the 64 execution items. */
export interface Action {
  text: string;
  note: string;
  done: boolean;
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
  settings: Settings;
}
