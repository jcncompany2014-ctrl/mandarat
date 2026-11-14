// 손으로 긋는 표시(체크 칸 · 요일 칸 · 동그라미)의 값과 말 — RN 의존 없는 순수 모듈(단위 테스트에서 그대로 쓴다).
// 그리는 컴포넌트: kit/CheckBox.tsx · kit/DayBoxes.tsx · kit/ChoiceRow.tsx · Check.tsx · MoodRow.tsx · GuideChips.tsx.
// 디자인 A(docs/design/build-plan.md 패키지 K): 체크 칸은 24 상자(모서리 6, 테두리 1.5 printEdge) 위에 펜 획.
import type { DayState } from './routine';
import { lang, msg, type Lang } from '../i18n';
import { liveList } from '../i18n/live';

// ── 체크 칸(kit/CheckBox) ─────────────────────────────────────────────────────

/**
 * 체크 칸의 네 모습 — 하나의 상자, 뜻이 다른 두 가지 '채운' 모습(CI-02).
 * - open: 빈 칸(인쇄된 테두리) · done: 내가 했다(영역 wash 칠 + 영역 dye 테두리 + 칸 밖으로 뻗는 펜 획)
 * - chosen: 이것으로 고른다(빈 칸 + 칸 안의 작은 먹 획 — 설정 켬 · 요일 고르기) · later: 아직 오지 않은 날(tile 칠, 테두리 없음)
 */
export type CheckState = 'open' | 'done' | 'chosen' | 'later';
/** 체크 칸 크기 — 줄 24, 뒤쪽에 놓을 때 20, 주간 표 14 */
export type CheckSize = 24 | 20 | 14;

/**
 * 했어요 펜 획(24 상자 기준) — 짧게 내려 긋고 길게 올려 그어 오른쪽 위 모서리 밖(27.2, −3)까지 뻗는다(목업 A.check).
 * iOS는 Svg를 제 틀에서 자르므로, 획은 상자보다 큰 Svg에 따로 그린다(PEN_TICK_REACH).
 */
export const PEN_TICK = 'M5.6 12.4C8 14.2 9.6 16.2 10.8 18.6 14.6 11 19.8 3.6 27.2 -3';
/** 펜 획 길이(≈35.5)에 둥근 끝(굵기 2)을 더한 것보다 긴 대시 — strokeDashoffset을 이 값에서 0으로 줄이면 한 획으로 그어진다 */
export const PEN_TICK_DASH = 38;
/** 펜 획이 상자 위 · 오른쪽으로 넘는 거리(24 단위, 굵기의 절반 포함) — 획의 Svg는 이만큼 크다 */
export const PEN_TICK_REACH = 4.5;
/** 고른 칸(chosen) 안의 작은 먹 획 — 상자 안에 머문다(목업 S.chosenBox) */
export const CHOSEN_TICK = 'M6.4 12.6C8 13.8 9.2 15.2 10.2 17 12.4 12.6 15 9.2 18 6.6';
/** 고르기 줄(ChoiceRow) 오른쪽의 펜 획 — 18pt로 그린다(목업 S.choice) */
export const CHOICE_TICK = 'M3.5 13C6 14.8 7.8 17 9.2 19.8 12.4 12.8 16.4 7.4 21.5 3.2';

/**
 * 크기 size의 체크 칸 치수 — 24 상자의 값(모서리 6 · 테두리 1.5 · 획 2)을 비례로.
 * reach: 펜 획 Svg가 상자 밖으로 나가는 거리(pt), hit: 44pt 누르는 자리를 만드는 사방 여유.
 */
export function checkGeometry(size: number): { radius: number; edge: number; tick: number; reach: number; hit: number } {
  const k = size / 24;
  return { radius: 6 * k, edge: 1.5 * k, tick: 2 * k, reach: PEN_TICK_REACH * k, hit: Math.max(0, (44 - size) / 2) };
}

/** 화면 읽기의 '선택됨' — 했어요(done)와 고름(chosen)만 켜진 칸이다 */
export function isChecked(state: CheckState): boolean {
  return state === 'done' || state === 'chosen';
}

/**
 * 예전 체크(GuideChips의 시작하기 표시)가 쓰는 꺾은선 획 — 24 viewBox.
 * @deprecated 새 표시는 PEN_TICK · CHOSEN_TICK(웨이브 3 O1이 GuideChips를 옮기면 지운다).
 */
export const TICK_PATH = 'M5 13.5 L10 18 L19.5 7';

// ── 요일 칸(월~일) ────────────────────────────────────────────────────────────

/** 월요일부터 자리 i(월 0 … 일 6) → fmt의 요일 번호(0 = 일요일) */
const dowOf = (i: number) => (i + 1) % 7;

/** 일요일의 자리(월요일부터) — 일요일 글자는 signal(주홍) */
export const SUNDAY_INDEX = 6;

/** 요일 자리 i(월 0 … 일 6)의 한 글자 — 지금 언어의 fmt.dowNarrow(월 · 月 · M) */
export function dayLetter(i: number, l: Lang = lang()): string {
  return msg(l).fmt.dowNarrow({ i: dowOf(i) });
}

/**
 * 월요일부터 — routineWeek()의 칸 순서와 같다(지금 언어의 fmt.dowNarrow).
 * @deprecated dayLetter(i)를 쓴다(V8-A가 지운다).
 */
export const WEEKDAY_KR: readonly string[] = liveList(() => [0, 1, 2, 3, 4, 5, 6].map((i) => dayLetter(i)));

/** 날짜의 요일 자리(월 0 … 일 6) */
export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** 요일 칸 한 날의 모습 — 체크 칸 네 모습 또는 칸 없음(쉬는 날) */
export type DayBox = CheckState | 'none';

/**
 * 습관의 이번 주(routineWeek) → 요일 칸(kit/DayBoxes)의 모습.
 * - 한 날: done · 누를 수 있는 날(지난날 · 오늘): open · 오늘 · 놓친 날: open
 * - 정해 둔 앞날: later(아직 못 누른다) · 쉬는 날: none
 */
export function dayBoxStates(states: readonly DayState[], canPress?: (i: number) => boolean): DayBox[] {
  return states.map((s, i) => {
    if (s === 'done') return 'done';
    if (canPress?.(i)) return 'open';
    if (s === 'today' || s === 'missed') return 'open';
    if (s === 'planned') return 'later';
    return 'none';
  });
}

/** 줄 오른쪽의 작은 주간 칸 — 9pt 네모 일곱 개, 사이 3pt(모두 81pt). 오늘 보기(TodayModes)의 연속 기록 줄이 쓴다 */
export const STRIP = { box: 9, gap: 3, width: 81 } as const;

/**
 * 폭 width에 칸 일곱 개(사이 gap)를 놓을 때 각 칸의 가운데 x — 요일 머리글자를 칸 위에 맞출 때.
 * 81pt면 4.5, 16.5 … 76.5.
 */
export function stripCenters(width: number = STRIP.width, gap: number = STRIP.gap): number[] {
  const box = (width - gap * 6) / 7;
  return Array.from({ length: 7 }, (_, i) => Math.round((i * (box + gap) + box / 2) * 100) / 100);
}

/**
 * 하루 칸 상태의 말 — 화면 읽기용.
 * routineWeek()는 이미 한 오늘을 'done'으로 주므로, 오늘인지(isToday)를 따로 받아 '오늘 함'으로 읽는다.
 */
export function dayWord(state: DayState, isToday = false, l: Lang = lang()): string {
  const c = msg(l).core;
  switch (state) {
    case 'done':
      return isToday ? c.dayDoneToday : c.dayDone;
    case 'today':
      return c.dayToday;
    case 'missed':
      return c.dayMissed;
    case 'planned':
      return c.dayPlanned;
    default:
      return isToday ? c.dayRestToday : c.dayRest;
  }
}

/** 주간 칸 한 줄의 읽기 글 — '월 함, 화 놓침, 수 오늘, 목 예정, 금 쉬는 날, …' */
export function weekStripSummary(states: readonly DayState[], todayIndex = -1, l: Lang = lang()): string {
  const c = msg(l).core;
  return states.map((s, i) => c.stripDay({ i: dowOf(i), word: dayWord(s, i === todayIndex, l) })).join(c.listSep);
}

/** 지난 요일 칸을 눌러 기록을 남기거나 지우는 버튼의 이름 */
export function weekDayActionLabel(i: number, done: boolean, l: Lang = lang()): string {
  const c = msg(l).core;
  return done ? c.dayClear({ i: dowOf(i) }) : c.dayMark({ i: dowOf(i) });
}

/** 누를 수 없는 요일 칸의 이름 — '수요일 오늘', '월요일 함' */
export function weekDayLabel(i: number, state: DayState, isToday = false, l: Lang = lang()): string {
  return msg(l).core.dayState({ i: dowOf(i), word: dayWord(state, isToday, l) });
}

// ── 동그라미(기분 고르기) ──────────────────────────────────────────────────────

/** 타원 둘레(라마누잔 근사) — 동그라미를 대시 하나로 그려 나갈 때의 길이 */
export function ellipseLength(rx: number, ry: number): number {
  const a = Math.max(0, rx);
  const b = Math.max(0, ry);
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

/**
 * 가운데 (cx, cy)의 타원을 왼쪽 끝에서 시작해 위로 돌아 다시 왼쪽 끝으로 오는 경로 —
 * 인쇄된 양식에서 펜으로 답에 동그라미 치는 방향(시계 방향, 위부터).
 */
export function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  const r = (n: number) => Math.round(n * 100) / 100;
  const L = `${r(cx - rx)} ${r(cy)}`;
  const R = `${r(cx + rx)} ${r(cy)}`;
  return `M${L} A${r(rx)} ${r(ry)} 0 1 1 ${R} A${r(rx)} ${r(ry)} 0 1 1 ${L}`;
}
