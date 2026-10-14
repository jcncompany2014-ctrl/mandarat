// 손으로 긋는 표시(체크 칸 · 주간 칸 · 동그라미)의 값과 말 — RN 의존 없는 순수 모듈(단위 테스트에서 그대로 쓴다).
// 그리는 컴포넌트: Check.tsx · WeekStrip.tsx · MoodRow.tsx · GuideChips.tsx · KindBits.tsx(RatingBoxes).
import type { DayState } from './routine';
import { toHex } from '../theme/moods';
import { readableOn } from '../theme/palette';

// ── 체크 칸 ──────────────────────────────────────────────────────────────────

/** 펜으로 긋는 체크 — 24 viewBox, 둥근 끝. 짧은 획(아래로) 다음 긴 획(오른쪽 위로) */
export const TICK_PATH = 'M5 13.5 L10 18 L19.5 7';

/** 체크 획 길이(≈21.3)보다 조금 긴 대시 — strokeDashoffset을 이 값에서 0으로 줄이면 한 획으로 그려진다 */
export const TICK_DASH = 25;

/**
 * 조용한 체크(muted) — '완료' 묶음처럼 한발 물러선 줄의 체크 칸 전체(칠과 획을 함께) 농도.
 * 칠만 옅게 하고 획 색을 따로 고르면(옅은 칠 위 먹색 획) 흔한 체크박스 그림처럼 보여서, 같은 표시를 통째로 옅게 한다.
 * 그 줄이 끝났다는 것은 '완료' 머리글과 취소선 글자(보조 글자색, 4.5:1 이상)가 함께 말해 준다.
 */
export const MUTED_OPACITY = 0.55;

/**
 * 체크 획의 색 — 칠한 영역 색 위에서 읽히는 색(영역 색 8가지는 모두 흰색).
 * 밝은 종이·다크 종이, 조용한 체크(muted) 모두 같은 획 색이다 — 어디서나 같은 '칠한 칸 + 흰 획'.
 */
export function tickInk(color: string): string {
  return readableOn(toHex(color));
}

/**
 * 빈 체크 칸·점수 칸의 테두리 — 종이 위에 겹쳐 그린 색이 바탕·면 위 3:1 이상(글씨 아닌 표시, WCAG 1.4.11).
 * 밝은 종이 넷: 먹 55%(3.4~3.5:1), 다크: 흰색 40%(3.8:1). tests/contrast.test.js가 같은 값을 잰다.
 */
export const CHECK_BORDER = { light: 'rgba(43,38,32,0.55)', dark: 'rgba(255,255,255,0.40)' } as const;

export function checkBorder(dark: boolean): string {
  return dark ? CHECK_BORDER.dark : CHECK_BORDER.light;
}

/**
 * 같은 칸은 늘 같은 각도로 — 항목 키(seed)에서 정한 -max°~+max° 기울기(0.1° 단위).
 * 손으로 그은 체크가 줄마다 조금씩 다르게 보이도록. seed가 없으면 0(반듯하게).
 */
export function seedTilt(seed?: string, max = 3): number {
  if (!seed) return 0;
  // FNV-1a 32비트
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // 마무리 섞기(murmur3 fmix32) — FNV만으로는 '3-5'·'3-6'처럼 끝 글자만 다른 짧은 키의 윗자리가 거의 같아
  // 한 영역의 칸들이 모두 같은 쪽으로 기운다
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  const unit = (h >>> 0) / 0xffffffff; // 0~1
  return Math.round((unit * 2 - 1) * max * 10) / 10;
}

// ── 주간 칸(월~일) ────────────────────────────────────────────────────────────

/** 월요일부터 — routineWeek()의 칸 순서와 같다 */
export const WEEKDAY_KR = ['월', '화', '수', '목', '금', '토', '일'] as const;

/** 날짜의 요일 자리(월 0 … 일 6) */
export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** 줄 오른쪽의 작은 주간 칸 — 9pt 네모 일곱 개, 사이 3pt(모두 81pt) */
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
export function dayWord(state: DayState, isToday = false): string {
  switch (state) {
    case 'done':
      return isToday ? '오늘 함' : '함';
    case 'today':
      return '오늘';
    case 'missed':
      return '놓침';
    case 'planned':
      return '예정';
    default:
      return isToday ? '오늘 쉬는 날' : '쉬는 날';
  }
}

/** 주간 칸 한 줄의 읽기 글 — '월 함, 화 놓침, 수 오늘, 목 예정, 금 쉬는 날, …' */
export function weekStripSummary(states: readonly DayState[], todayIndex = -1): string {
  return states.map((s, i) => `${WEEKDAY_KR[i] ?? ''} ${dayWord(s, i === todayIndex)}`).join(', ');
}

/** 지난 요일 칸을 눌러 기록을 남기거나 지우는 버튼의 이름 */
export function weekDayActionLabel(i: number, done: boolean): string {
  return `${WEEKDAY_KR[i] ?? ''}요일 ${done ? '기록 지우기' : '했어요로 남기기'}`;
}

/** 누를 수 없는 요일 칸의 이름 — '수요일 오늘', '월요일 함' */
export function weekDayLabel(i: number, state: DayState, isToday = false): string {
  return `${WEEKDAY_KR[i] ?? ''}요일 ${dayWord(state, isToday)}`;
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
