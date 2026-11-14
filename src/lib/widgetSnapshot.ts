// 홈·잠금 화면 위젯이 그릴 값(순수) — 지금 한 칸 + 다음 자정 7번, 모두 8칸의 타임라인.
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
/** 타임라인 칸 수 — 지금 + 다음 자정 7번(앱을 열지 않아도 일주일은 날짜가 넘어간다) */
export const WIDGET_DAYS = 8;
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

/** 위젯 문구 — 틀('{n}' · '{t}')은 채우지 않고 넘긴다. 위젯 고르기 화면의 두 글(gallery*)은 넘기지 않는다 */
export function widgetLines(lang?: Lang): TodayWidgetLines {
  const w = msg(lang).widget;
  return {
    left: w.left, allDone: w.allDone, empty: w.empty, more: w.more,
    leftShort: w.leftShort, doneShort: w.doneShort, today: w.today, next: w.next, checked: w.checked,
    unchecked: w.unchecked, progress: w.progress,
    listHead: w.listHead, nextHead: w.nextHead, leftUnit: w.leftUnit, focus: w.focus,
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
    pal: { light: widgetPalette(LIGHT), dark: widgetPalette(DARK) },
    pat,
    ops: [],
    url: WIDGET_URL,
  };
}

/** 위젯 타임라인 — now 한 칸 + 다음 자정 7번. date는 ms 숫자(가까운 것부터) */
export function widgetTimeline(doc: WidgetDoc, now: Date, opts: WidgetTimelineOptions): { date: number; props: TodayWidgetProps }[] {
  const out: { date: number; props: TodayWidgetProps }[] = [];
  for (let i = 0; i < WIDGET_DAYS; i++) {
    const at = i === 0 ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push({ date: at.getTime(), props: plistSafe(widgetProps(doc, at, opts)) });
  }
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
