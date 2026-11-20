// 홈·잠금 화면 위젯이 그릴 값(순수) — 지금 한 칸 + 다음 자정 29번의 30칸, 그 뒤에 닫는 칸 하나가 붙는 타임라인.
// 위젯은 앱 밖(WidgetKit)에서 그려지므로 값은 plist에 그대로 들어가야 한다: null · undefined · Date가 없고,
// 날짜는 ms 숫자, 색은 '#RRGGBB(AA)'만(rgba()는 SwiftUI가 못 읽는다). 글은 msg(lang).widget의 '{n}' · '{t}' 틀 그대로
// 넘긴다 — 위젯 버튼을 누르면 앱 없이 위젯 쪽에서 남은 수를 다시 세어 틀에 넣는다(src/widgets/TodayWidget.ios.tsx).
// 색은 토큰(LIGHT · DARK)을 영역 번호로 넘긴다 — theme.color · 무드 · 포인트 컬러는 읽지 않는다(build-plan §2.5 · §4.1).
// 위젯은 앱 안의 밝게/어둡게 선택이 아니라 시스템을 따른다(WidgetKit은 앱의 선택을 읽지 못한다, §4.2).
import type { Lang } from '../i18n/types';
import { msg } from '../i18n';
import type { MandaratDoc } from '../types';
import { toHex } from '../theme/moods';
import { DARK, LIGHT, type Tokens } from '../theme/tokens';
import {
  LINK_SCHEME, type TodayWidgetLines, type TodayWidgetProps, type WidgetItem, type WidgetPalette, type WidgetPattern,
} from './contracts';
import { projectDay } from './dayProjection';
import { dueInfo } from './kinds';
import { actionStates } from './mapCells';
import { weekPriority } from './ritual';
import { sortTodayItems } from './routine';

/** 위젯 목록에 늘어놓는 줄 수 — 나머지는 more(머리의 남은 수가 말한다) */
export const WIDGET_MAX_ITEMS = 8;
/**
 * 타임라인이 담는 날 수 — 지금 + 다음 자정 29번(앱을 열지 않아도 한 달은 날짜가 넘어간다). 한 칸 ≈ 2 KB(팔레트 · 문구가 칸마다 든다)라
 * 30칸 ≈ 60 KB(App Group). 그 뒤로는 닫는 칸(widgetTimeline)이 목록 대신 앱을 열어 달라는 한 줄을 보인다
 * (src/widgets/TodayWidget.ios.tsx의 stale). 8칸일 때는 여드레째부터 마지막 칸에 머물러 지난 날짜로 체크가 적혔다
 */
export const WIDGET_DAYS = 30;
/** 위젯을 누르면 여는 곳 */
export const WIDGET_URL = `${LINK_SCHEME}://today`;

type WidgetDoc = Pick<MandaratDoc, 'themes' | 'dayLog' | 'todayKeys' | 'todayExtra' | 'todayDate' | 'centerGoal' | 'settings'>
  & Partial<Pick<MandaratDoc, 'reviews'>>;

export interface WidgetTimelineOptions {
  /** 종이 무늬 — 그릴 무늬(lib/paper drawnPattern: 없으면 무지, 프로 무늬는 프로일 때만) */
  pat: WidgetPattern;
  lang?: Lang;
}

/**
 * 색 하나를 '#RRGGBB' 또는 '#RRGGBBAA'로 — toHex()는 알파를 버리므로 rgba()의 알파는 여기서 붙인다.
 * 위젯 괘선처럼 반투명한 색을 그대로 넘길 때.
 */
export function widgetHex(color: string): string {
  const hex = toHex(color);
  const m = color.trim().match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)$/i);
  if (m) {
    const a = Math.round(Math.min(1, Math.max(0, Number(m[1]))) * 255);
    return `${hex}${a.toString(16).padStart(2, '0').toUpperCase()}`;
  }
  const h8 = color.trim().match(/^#[0-9a-f]{6}([0-9a-f]{2})$/i);
  return h8 ? `${hex}${h8[1].toUpperCase()}` : hex;
}

/** 토큰 한 벌 → 위젯 팔레트(위젯이 쓰는 것만, hex) */
export function widgetPalette(T: Tokens): WidgetPalette {
  return {
    paper: widgetHex(T.paper), ink: widgetHex(T.ink), ink2: widgetHex(T.ink2), print: widgetHex(T.print),
    printEdge: widgetHex(T.printEdge), printRule: widgetHex(T.printRule), tile: widgetHex(T.tile),
    signal: widgetHex(T.signal), core: widgetHex(T.core),
    dye: T.dye.map(widgetHex), washL1: T.washL1.map(widgetHex), tint: T.tint.map(widgetHex),
  };
}

/** 밝게 · 어둡게 두 벌 — 토큰은 바뀌지 않으니 한 번만 만든다(타임라인의 서른 칸이 같은 것을 쓴다. 고쳐 쓰지 않는다) */
let pals: TodayWidgetProps['pal'] | null = null;
function widgetPals(): TodayWidgetProps['pal'] {
  pals ??= { light: widgetPalette(LIGHT), dark: widgetPalette(DARK) };
  return pals;
}

/** 위젯 문구 — 틀('{n}' · '{t}')은 채우지 않고 넘긴다. 위젯 고르기 화면의 두 글(gallery*)은 넘기지 않는다 */
export function widgetLines(lang?: Lang): TodayWidgetLines {
  const w = msg(lang).widget;
  return {
    left: w.left, allDone: w.allDone, empty: w.empty, more: w.more,
    leftShort: w.leftShort, doneShort: w.doneShort, today: w.today, next: w.next, checked: w.checked,
    unchecked: w.unchecked, progress: w.progress,
    listHead: w.listHead, nextHead: w.nextHead, leftUnit: w.leftUnit, focus: w.focus, stale: w.stale,
  };
}

/** date 하루의 위젯 모습 */
export function widgetProps(doc: WidgetDoc, date: Date, { pat, lang }: WidgetTimelineOptions): TodayWidgetProps {
  const p = projectDay(doc, date);
  const w = msg(lang).widget;
  // 이번 주 중점 — 그날의 주로 센다(타임라인의 앞날이 다음 주로 넘어가면 그 주의 중점)
  const focus = new Set(weekPriority({ themes: doc.themes, reviews: doc.reviews ?? {} }, date));
  /** 오른쪽 글 — 아직 안 한 줄만: 중점, 아니면 마감(D-2), 둘 다 아니면 ''(위젯이 영역 표시를 그린다) */
  const right = (key: string, ti: number, ai: number, done: boolean): string => {
    if (done) return '';
    if (focus.has(key)) return w.focus;
    return dueInfo(doc.themes[ti].actions[ai], date, lang)?.label ?? '';
  };
  const listed: WidgetItem[] = [
    ...sortTodayItems(p.items, doc, date).map((i) => ({
      k: i.key, t: doc.themes[i.ti].actions[i.ai].text.trim(), d: i.done, a: i.ti, r: right(i.key, i.ti, i.ai, i.done),
    })),
    ...p.extras.map((x) => ({ k: `x:${x.id}`, t: x.text.trim(), d: x.done, a: x.ti, r: '' })),
  ];
  // 남은 것부터 — 그중 이번 주 중점이 먼저, 같은 무게끼리는 순서를 지킨다
  const ordered = [
    ...listed.filter((i) => !i.d && focus.has(i.k)),
    ...listed.filter((i) => !i.d && !focus.has(i.k)),
    ...listed.filter((i) => i.d),
  ];
  return {
    v: 1,
    day: p.key,
    date: msg(lang).fmt.monthDayDow({ d: date }),
    done: p.done,
    total: p.total,
    items: ordered.slice(0, WIDGET_MAX_ITEMS),
    more: Math.max(0, ordered.length - WIDGET_MAX_ITEMS),
    goal: doc.centerGoal.trim(),
    cells: actionStates(doc),
    names: doc.themes.map((t) => (t.title ?? '').trim()),
    lines: widgetLines(lang),
    pal: widgetPals(),
    pat,
    ops: [],
    url: WIDGET_URL,
  };
}

/**
 * 위젯 타임라인 — now 한 칸 + 다음 자정 WIDGET_DAYS - 1번, 그리고 닫는 칸 하나. date는 ms 숫자(가까운 것부터).
 * 닫는 칸은 마지막 날이 끝나는 자정부터 보인다: 목록 없이 expired만 실어, 위젯이 그 순간부터 앱을 열어 달라는 한 줄을 그린다.
 * WidgetKit은 칸을 미리 그려 두고 타임라인이 끝나야 다시 읽으므로, 이 칸이 없으면 다시 그려질 때까지 어제의 목록이 그대로 보인다.
 * day는 마지막 날 그대로 둔다 — 위젯도 Siri(TodayStore.current)도 오늘의 칸으로 읽지 않게.
 */
export function widgetTimeline(doc: WidgetDoc, now: Date, opts: WidgetTimelineOptions): { date: number; props: TodayWidgetProps }[] {
  const out: { date: number; props: TodayWidgetProps }[] = [];
  for (let i = 0; i < WIDGET_DAYS; i++) {
    const at = i === 0 ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push({ date: at.getTime(), props: plistSafe(widgetProps(doc, at, opts)) });
  }
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + WIDGET_DAYS);
  const closing: TodayWidgetProps = { ...out[out.length - 1].props, done: 0, total: 0, items: [], more: 0, expired: true };
  out.push({ date: end.getTime(), props: plistSafe(closing) });
  return out;
}

/** widgetTimeline의 칸을 위젯 다리(widgetBridge.writeTimeline)가 받는 꼴로 — date만 Date로 */
export function toWidgetEntries(timeline: readonly { date: number; props: TodayWidgetProps }[]): { date: Date; props: TodayWidgetProps }[] {
  return timeline.map((e) => ({ date: new Date(e.date), props: e.props }));
}

/** plist에 못 넣는 값(null · undefined · Date · 숫자가 아닌 수 · 함수)이 있으면 던진다. 그대로 돌려준다 */
export function plistSafe<T>(props: T): T {
  const walk = (v: unknown, path: string): void => {
    if (v === null || v === undefined) throw new Error(`widget props: ${path} is ${v}`);
    if (v instanceof Date) throw new Error(`widget props: ${path} is a Date`);
    if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`widget props: ${path} is ${v}`);
    if (typeof v === 'function' || typeof v === 'symbol' || typeof v === 'bigint') throw new Error(`widget props: ${path} is a ${typeof v}`);
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (typeof v === 'object') for (const [k, x] of Object.entries(v as Record<string, unknown>)) walk(x, `${path}.${k}`);
  };
  walk(props, 'props');
  return props;
}
