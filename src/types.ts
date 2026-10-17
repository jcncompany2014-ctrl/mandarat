// Core data model for the Mandalart planner.

/** 앱이 그릴 수 있는 아이콘 이름 — 저장본·백업 검증에도 쓰는 단일 출처 */
export const ICON_NAMES = [
  'heart', 'briefcase', 'book', 'people', 'coin', 'palette', 'lotus', 'compass',
  'grid', 'home', 'check', 'checkCircle', 'chart', 'plus', 'chevR', 'chevL',
  'flame', 'sparkle', 'target', 'pencil', 'dots', 'calendar', 'bell', 'settings',
  'close', 'reset', 'trash', 'share', 'repeat', 'download', 'restore', 'minus',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export type Mood = '연꽃' | '크림' | '화이트' | '파스텔' | '다크';
export type Mgmt = '일일 체크' | '습관 스트릭' | '칸반';
export type CellShape = '둥근' | '각진';

/**
 * 실천 유형 — 64칸은 성격이 저마다 다르다.
 * - once(한 번): 해내면 끝나는 일. 마감일을 둘 수 있다.
 * - habit(습관): 정한 요일마다, 또는 주 N회. 그날 체크는 dayLog에 남고 칸 달성(done)과는 별개.
 * - count(쌓기): 숫자를 채워 가는 목표. 목표에 닿으면 칸이 달성된다.
 * - mind(마음가짐): 매일 체크하지 않고 한 주에 한 번 1~5점으로 돌아본다.
 */
export type ActionKind = 'once' | 'habit' | 'count' | 'mind';

/** One of the 64 execution items. */
export interface Action {
  text: string;
  note: string;
  /** 만다라트 칸의 영구 달성 */
  done: boolean;
  /** 실천 유형. 없으면 이전 저장본 — 반복 요일이 있으면 습관, 없으면 한 번으로 본다. */
  kind?: ActionKind;
  /** 습관: 반복 요일 (0=일 … 6=토) — 오늘 체크는 dayLog에 날짜별로 기록된다. */
  days?: number[];
  /** 습관: 요일 대신 주 N회(1~6) — 이번 주 횟수를 채울 때까지 날마다 '오늘'에 담긴다. */
  perWeek?: number;
  /** 습관을 정한(바꾼) 날 'YYYY-MM-DD' — 그 전 날은 놓친 날로 세지 않는다 */
  since?: string;
  /**
   * 쌓기: 습관이던 칸을 쌓기로 바꾼 날 'YYYY-MM-DD'. 같은 날 다시 습관으로 되돌리면 since·일정 내력을 이어서
   * 연속 기록이 처음부터 시작하지 않게 한다(다음 날 이후에 되돌리면 그날부터 새 습관).
   */
  habitUntil?: string;
  /**
   * 습관: 요일·주 N회를 고쳐 온 내력(오래된 것부터). 지난 날은 그때의 일정으로 센다(연속 기록·이번 주·돌아보기).
   * 마지막 것이 지금 값(days · perWeek)과 같다. 없으면(이전 저장본·고친 적 없는 습관) 모든 날을 지금 값으로 센다.
   */
  schedule?: HabitSchedule[];
  /** 쌓기: 목표 수 */
  goal?: number;
  /** 쌓기: 단위(권·곳·km·만 원…) */
  unit?: string;
  /** 쌓기: 한 번 체크할 때 더하는 수(없으면 1) */
  step?: number;
  /** 쌓기: 지금까지 쌓은 수 */
  count?: number;
  /** 쌓기: 날짜 'YYYY-MM-DD'별로 더한 수 — 그날 했는지·이번 주 얼마나 늘었는지 */
  log?: Record<string, number>;
  /** 한 번: 마감일 'YYYY-MM-DD' */
  due?: string;
  /** 마음가짐: 주(그 주 월요일 'YYYY-MM-DD')별 점수 1~5 */
  ratings?: Record<string, number>;
  /** 습관 알림 시각 'HH:MM' — 그 습관을 하는 날 */
  remindAt?: string;
}

/** 습관 일정 한 토막 — from 'YYYY-MM-DD'부터(다음 토막의 from 전날까지) 쓴 요일 또는 주 N회 */
export interface HabitSchedule {
  from: string;
  /** 반복 요일(0=일 … 6=토) — 주 N회였다면 없다 */
  days?: number[];
  /** 주 N회(1~6) — 요일 습관이었다면 없다 */
  perWeek?: number;
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

/** 종이 무늬(프로) — 없으면 점 종이(지금 모양, 무료) */
export type PaperPattern = 'grid' | 'lines' | 'blank';

/** 알림 — 켠 것만 값이 있다(모두 끄면 필드가 없다). 이 기기가 울릴지는 기기마다의 허락과 'mandarat:notify:v1'이 정한다 */
export interface Reminders {
  /** 아침 알림 'HH:MM' */
  morning?: string;
  /** 저녁 알림 'HH:MM' */
  evening?: string;
  /** 한 주 돌아보기 알림 */
  review?: true;
}

export interface Settings {
  mood: Mood;
  accent: string;
  mgmt: Mgmt;
  cellShape: CellShape;
  /** 마지막으로 백업을 내보낸 날 'YYYY-MM-DD' — 한 번도 안 했으면 없다 */
  lastBackupAt?: string;
  /** 알림 시각 — 켠 것이 없으면 없다 */
  reminders?: Reminders;
  /** 종이 무늬(프로) — 없으면 점 종이. 프로가 없어도 값은 남기고, 그릴 때 잠근다 */
  paper?: PaperPattern;
}

/**
 * 한 주 돌아보기 기록 — 그 주를 닫으며 고른 다음 주 중점 칸과 한 줄 메모.
 * 키는 돌아본 주의 월요일 'YYYY-MM-DD'이고, next의 칸은 그다음 주에 '중점'으로 보인다.
 */
export interface WeekReviewEntry {
  /** 돌아본 날 'YYYY-MM-DD' */
  at: string;
  /** 다음 주 중점 칸 "ti-ai" (3개까지) */
  next: string[];
  /** 한 줄 메모 (120자까지, 비면 없다) */
  note?: string;
}

/** 지난 표 한 장 — 닫을 때 모습 그대로, 그 기간 기록과 함께 */
export interface ArchivedChart {
  /** 'y' + from에서 '-'를 뺀 것, 예: 'y20260101' — 같은 표를 두 기기에서 닫아도 지난 표 하나로 남는다 */
  id: string;
  /** 이 표를 시작한 날 'YYYY-MM-DD' */
  from: string;
  /** 닫은 날 'YYYY-MM-DD' (from ≤ to) */
  to: string;
  centerGoal: string;
  /** 8영역 × 8실천 — done·count·log·ratings 그대로 */
  themes: Theme[];
  /** from..to, 키는 원래 "ti-ai" */
  dayLog: Record<string, string[]>;
  /** from..to */
  dayMeta: Record<string, { mood?: number; reflection?: string }>;
  /** from..to의 주 */
  reviews?: Record<string, WeekReviewEntry>;
  /** from..to */
  closedDays?: string[];
  /** 이 표를 쓰는 동안 집중한 분 */
  focusMinutes: number;
  /** 닫으며 적은 한 줄(120자) */
  note?: string;
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
  /** date 'YYYY-MM-DD' -> list of action keys ("ti-ai") done that day (습관 체크·쌓기·달성·직접 추가한 할 일) */
  dayLog: Record<string, string[]>;
  /** date 'YYYY-MM-DD' -> mood index + one-line reflection */
  dayMeta: Record<string, { mood?: number; reflection?: string }>;
  /** 누적 집중(포커스 타이머) 시간(분) */
  focusMinutes: number;
  settings: Settings;
  /** '오늘' 목록을 마지막으로 정리한 날짜 'YYYY-MM-DD' — 날짜가 바뀌면 완료한 항목을 정리한다 */
  todayDate?: string;
  /**
   * 8영역을 정했는가 — 영역 이름을 고치거나 템플릿·예시를 쓰면 참이 된다.
   * 이전 저장본은 실천이 하나라도 적혀 있거나 기본 이름과 다른 영역 이름이 있으면 참으로 본다.
   */
  areasSet?: boolean;
  /** 한 주 돌아보기 — 키는 돌아본 주의 월요일 'YYYY-MM-DD' */
  reviews?: Record<string, WeekReviewEntry>;
  /** 오늘 할 일을 다 해 마감한 날 'YYYY-MM-DD' — 오래된 날부터, 최근 400일까지 */
  closedDays?: string[];
  /** 지난 표 — 닫은 날(to) 순서로 최근 30장까지 */
  archives?: ArchivedChart[];
  /** 지금 표를 시작한 날 'YYYY-MM-DD' */
  chartStart?: string;
  /** 지금 표를 시작할 때의 누적 집중 시간(분) — 이 표의 집중 시간 = focusMinutes − focusStart */
  focusStart?: number;
}
