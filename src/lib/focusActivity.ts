// 집중 타이머 Live Activity가 그릴 값(순수) — 잠금 화면·다이내믹 아일랜드는 앱 밖(ActivityKit)에서 그려지므로
// 값은 plist·JSON에 그대로 들어가야 한다: null · undefined · Date가 없고, 시각은 ms 숫자, 색은 '#RRGGBB(AA)'만.
// 모습은 src/widgets/FocusActivity.ios.tsx, 띄우고 바꾸고 끝내는 것은 src/widgets/focusLive(.ios).ts.
import type { Lang } from '../i18n/types';
import { msg } from '../i18n';
import type { Mood } from '../types';
import { MOODS, withAccent, type Palette } from '../theme/moods';
import { LINK_SCHEME, type FocusActivityLines, type FocusActivityProps, type WidgetPalette } from './contracts';
import { FOCUS_TOTAL } from './focusClock';
import { plistSafe, widgetHex } from './widgetSnapshot';

/** Live Activity를 누르면 여는 곳 — 도는 타이머는 이미 화면에 있다(§2.8) */
export const FOCUS_URL = `${LINK_SCHEME}://focus`;
/** 25분을 다 채운 뒤 잠금 화면에 '마쳤어요'를 남겨 두는 시간 */
export const FOCUS_DONE_LINGER_MS = 5 * 60 * 1000;

export interface FocusPropsInput {
  /** 실천 글 */
  text: string;
  /** 영역 이름 */
  area: string;
  /** 영역 색 */
  color: string;
  /** 이 세션의 (가상) 시작 시각 ms — 끝 시각에서 25분을 뺀 값 */
  startAt: number;
  /** 끝날 시각 ms */
  endAt: number;
  /** 멈춘 동안 남은 ms — 도는 중이면 null(또는 음수) */
  pausedLeft?: number | null;
  /** 25분을 다 채웠다 */
  done?: boolean;
  mood: Mood;
  /** 포인트 컬러 — 없으면 무드 표의 금색 */
  accent?: string;
  lang?: Lang;
}

function palette(P: Palette, accent: string | undefined): WidgetPalette {
  const M = accent ? withAccent(P, accent) : P;
  return { paper: widgetHex(M.bg), ink: widgetHex(M.ink), sub: widgetHex(M.sub), line: widgetHex(M.line), accent: widgetHex(M.goldInk) };
}

/** Live Activity 문구 — 함수가 아닌 글자 그대로 */
export function focusLines(lang?: Lang): FocusActivityLines {
  const l = msg(lang).live;
  return { left: l.left, paused: l.paused, done: l.done, focus: l.focus };
}

/** 지금 끝 시각으로 도는 세션의 시작 시각 — 멈췄다 다시 가도 진행 막대가 25분 전체를 기준으로 남는다 */
export function focusStartOf(endAt: number): number {
  return endAt - FOCUS_TOTAL * 1000;
}

/** 한 순간의 Live Activity 모습 */
export function focusProps(input: FocusPropsInput): FocusActivityProps {
  const { text, area, color, startAt, endAt, pausedLeft, done, mood, accent, lang } = input;
  const light = mood === '다크' ? '연꽃' : mood;
  const end = Math.round(Number.isFinite(endAt) ? endAt : 0);
  const start = Math.min(end, Math.round(Number.isFinite(startAt) ? startAt : end));
  const paused = !done && typeof pausedLeft === 'number' && Number.isFinite(pausedLeft) && pausedLeft >= 0
    ? Math.round(pausedLeft)
    : -1;
  return plistSafe({
    v: 1,
    t: String(text || '').replace(/\s+/g, ' ').trim(),
    area: String(area || '').trim(),
    c: widgetHex(color || MOODS['연꽃'].ink),
    start,
    end,
    paused,
    done: !!done,
    lines: focusLines(lang),
    pal: { light: palette(MOODS[light] ?? MOODS['연꽃'], accent), dark: palette(MOODS['다크'], accent) },
    url: FOCUS_URL,
  });
}
