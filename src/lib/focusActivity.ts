// 집중 타이머 Live Activity가 그릴 값(순수) — 잠금 화면·다이내믹 아일랜드는 앱 밖(ActivityKit)에서 그려지므로
// 값은 plist·JSON에 그대로 들어가야 한다: null · undefined · Date가 없고, 시각은 ms 숫자, 색은 '#RRGGBB(AA)'만.
// 모습은 src/widgets/FocusActivity.ios.tsx, 띄우고 바꾸고 끝내는 것은 src/widgets/focusLive(.ios).ts.
// 색은 토큰(LIGHT · DARK)과 영역 번호(ti)로 — 무드 · 포인트 컬러는 받기만 하고 읽지 않는다(build-plan §4.1, O4가 지울 때까지).
import type { Lang } from '../i18n/types';
import { msg } from '../i18n';
import type { Mood } from '../types';
import { DARK, LIGHT, type Tokens } from '../theme/tokens';
import { LINK_SCHEME, type FocusActivityLines, type FocusActivityProps, type LivePalette } from './contracts';
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
  /** 영역 번호 0~7 — 있으면 영역 색은 토큰의 dye[ti](밝게 · 어둡게 따로) */
  ti?: number;
  /** 영역 색(theme.color) — ti가 없을 때만 쓰는 대신 색 */
  color?: string;
  /** 이 세션의 (가상) 시작 시각 ms — 끝 시각에서 25분을 뺀 값 */
  startAt: number;
  /** 끝날 시각 ms */
  endAt: number;
  /** 멈춘 동안 남은 ms — 도는 중이면 null(또는 음수) */
  pausedLeft?: number | null;
  /** 25분을 다 채웠다 */
  done?: boolean;
  /** 읽지 않는다 — FocusTimer(O4 전)가 아직 넘긴다 */
  mood?: Mood;
  /** 읽지 않는다 — FocusTimer(O4 전)가 아직 넘긴다 */
  accent?: string;
  lang?: Lang;
}

const validTi = (ti: number | undefined): ti is number => typeof ti === 'number' && Number.isInteger(ti) && ti >= 0 && ti < 8;

/** 토큰 한 벌 → Live Activity 팔레트. 영역 색은 ti의 dye, 없으면 넘긴 색, 그것도 없으면 ink2 */
function livePalette(T: Tokens, ti: number | undefined, color: string | undefined): LivePalette {
  const dye = validTi(ti) ? T.dye[ti] : color && color.trim() ? color : T.ink2;
  return {
    paper: widgetHex(T.paper), ink: widgetHex(T.ink), ink2: widgetHex(T.ink2), print: widgetHex(T.print),
    tile: widgetHex(T.tile), dye: widgetHex(dye),
  };
}

/** Live Activity 문구 — 함수가 아닌 글자 그대로 */
export function focusLines(lang?: Lang): FocusActivityLines {
  const l = msg(lang).live;
  return { left: l.left, paused: l.paused, done: l.done, focus: l.focus, label: l.label, leftShort: l.leftShort };
}

/** 지금 끝 시각으로 도는 세션의 시작 시각 — 멈췄다 다시 가도 진행 막대가 25분 전체를 기준으로 남는다 */
export function focusStartOf(endAt: number): number {
  return endAt - FOCUS_TOTAL * 1000;
}

/** 한 순간의 Live Activity 모습 */
export function focusProps(input: FocusPropsInput): FocusActivityProps {
  const { text, area, ti, color, startAt, endAt, pausedLeft, done, lang } = input;
  const end = Math.round(Number.isFinite(endAt) ? endAt : 0);
  const start = Math.min(end, Math.round(Number.isFinite(startAt) ? startAt : end));
  const paused = !done && typeof pausedLeft === 'number' && Number.isFinite(pausedLeft) && pausedLeft >= 0
    ? Math.round(pausedLeft)
    : -1;
  const light = livePalette(LIGHT, ti, color);
  return plistSafe({
    v: 1,
    t: String(text || '').replace(/\s+/g, ' ').trim(),
    area: String(area || '').trim(),
    c: light.dye,
    start,
    end,
    paused,
    done: !!done,
    lines: focusLines(lang),
    pal: { light, dark: livePalette(DARK, ti, color) },
    url: FOCUS_URL,
  });
}
