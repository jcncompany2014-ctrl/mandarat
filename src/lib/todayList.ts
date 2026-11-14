// 오늘 목록 화면(Today.tsx)의 순수 계산 — 색인 탭 · 마감 지남 · 집계 칸 · 빈 상태 · 마감 줄 글,
// 디자인 A(S3)의 자리 수치 · 중점 먼저 · 접은 줄 · 마감 글 · 이번 주 막대.
// React Native에 기대지 않아 Node 테스트에서 바로 부른다(tests/todayList.test.js · tests/a-s3.test.js).
import { daysBetween, kindOf, weekDates, ymd } from './routine';
import { msg, type Lang } from '../i18n';
import type { MandaratDoc } from '../types';

/**
 * 오늘 화면의 자리(pt) — 목업 docs/design/mockups/a/today.html · dayclose.html.
 * 화면 여백(24) · 줄(54) · 구역 머리(18 + 6)는 GEO · kit의 값을 그대로 쓴다.
 */
export const TODAY_SPACE = {
  /** 머리 아래 거르기 줄(또는 첫 줄) */
  filterTop: 6,
  /** 마지막 줄 아래 '실천에서 더 고르기' 줄 */
  moreTop: 6,
  /** 하루 마감 — 머리 아래 큰 숫자, 숫자 아래 한 문장, 문장 아래 글 */
  heroTop: 30,
  promptTop: 4,
  noteTop: 2,
  /** 하루 마감 아래 '오늘 할 일'(접은 줄) */
  foldTop: 36,
  /** 접은 줄의 영역 이름 사이 · 영역 표시와 이름 사이 */
  foldAreaGap: 10,
  foldDyeGap: 4,
  /** 기분 · 한 줄 묶음 — 위 · 이름 아래 · 두 칸 사이 */
  module: 28,
  labelGap: 8,
  fieldGap: 20,
  /** 한 줄 칸 높이 */
  line: 52,
  /** 이번 주 막대 — 위 · 머리 아래 */
  week: 32,
  weekHead: 6,
  /** 연속 기록 · 보드 — 머리 아래 첫 구역, 구역 사이 */
  viewTop: 18,
  viewGap: 24,
  /** 연속 기록 줄 아래 요일 칸 아래 여백 */
  daysBottom: 8,
  /** 마음가짐 줄 사이 · 줄과 점수 칸 사이 */
  mindGap: 18,
  mindRate: 4,
} as const;

/** 마지막 하나를 체크하고 목록이 한 줄로 접히기까지 — 체크 획(230ms) · 먹선(450ms)이 그어진 뒤, Root의 마감 촉감(650ms)과 같은 때 */
export const CLOSE_WAIT = 650;

/** 이번 주 중점 줄을 맨 위로 — 나머지는 목록 순서 그대로. 끝낸 줄도 제자리에 둔다(아래로 내리지 않는다) */
export function focusFirst<T extends { key: string }>(items: readonly T[], focus: readonly string[]): T[] {
  if (focus.length === 0) return items.slice();
  const set = new Set(focus);
  return [...items.filter((x) => set.has(x.key)), ...items.filter((x) => !set.has(x.key))];
}

/** 접은 목록 한 줄의 제목 — 앞 두 줄의 글 + '외 n개' */
export function foldTitle(texts: readonly string[], l?: Lang): string {
  const t = msg(l).today;
  const head = texts.map((s) => s.trim()).filter(Boolean).slice(0, 2);
  return t.foldTitle({ names: head.join(t.listSep), n: Math.max(0, texts.length - head.length) });
}

/**
 * 하루 마감 아래 글 — '열 가지를 모두 했어요 · 오후 9:40 마감'.
 * 마감 시각은 이 화면에서 마감했을 때만 안다(다른 화면에서 마감했거나 앱을 다시 켰으면 앞말만).
 */
export function closeNote(total: number, at: Date | null, l?: Lang): string {
  const m = msg(l);
  const all = m.today.closeAll({ n: total });
  if (!at) return all;
  return `${all}${m.core.dot}${m.today.closeAt({ time: m.fmt.time({ h: at.getHours(), m: at.getMinutes() }) })}`;
}

/** 이번 주 막대의 수 — 월~일 그날 남긴 기록 수(홈과 같은 셈), 아직 오지 않은 날은 null */
export function weekBarCounts(dayLog: MandaratDoc['dayLog'], now: Date): (number | null)[] {
  const tk = ymd(now);
  return weekDates(now).map((d) => {
    const k = ymd(d);
    return k > tk ? null : (dayLog[k] ?? []).length;
  });
}

/** 월요일부터 i번째 날의 요일 번호(0 = 일요일) */
export const weekDow = (i: number): number => (i + 1) % 7;

/** 이번 주 막대의 화면 읽기 — '이번 주 16번, 월요일 3번, 화요일 3번, 수요일 10번, 오늘'(아직 오지 않은 날은 빼고) */
export function weekBarsLabel(counts: readonly (number | null)[], todayIndex: number, l?: Lang): string {
  const m = msg(l);
  const total = counts.reduce<number>((s, n) => s + (n ?? 0), 0);
  const days = counts.flatMap((n, i) => {
    if (n == null) return [];
    const day = m.fmt.dowLong({ i: weekDow(i) });
    const times = m.fmt.times({ n });
    return [i === todayIndex ? m.today.weekDayToday({ day, times }) : m.today.weekDay({ day, times })];
  });
  return [`${m.today.weekTitle} ${m.fmt.times({ n: total })}`, ...days].join(m.core.listSep);
}

/** 집계 네모를 그리는 최대 개수 — 이보다 많으면 가는 막대 하나로 */
export const TALLY_MAX = 30;

/** 색인 탭 한 칸 — 오늘 할 일이 하나라도 있는 영역과 그 개수(실천 줄 + 직접 추가) */
export interface AreaTab {
  ti: number;
  count: number;
}

/** 오늘 할 일이 있는 영역만, 영역 순서대로 — 개수는 남은 일과 다 한 일을 모두 센다 */
export function todayAreaTabs(items: readonly { ti: number }[], extras: readonly { ti: number }[]): AreaTab[] {
  const counts = new Map<number, number>();
  for (const x of [...items, ...extras]) counts.set(x.ti, (counts.get(x.ti) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([ti, count]) => ({ ti, count }));
}

/** 고른 영역의 할 일이 0개가 되면(지웠거나 오늘에서 뺐으면) '전체'로 돌아간다 */
export function effectiveArea(selected: number | null, tabs: readonly AreaTab[]): number | null {
  if (selected == null) return null;
  return tabs.some((t) => t.ti === selected && t.count > 0) ? selected : null;
}

/** 마감이 지났는데 아직 끝내지 않은 한 번짜리 실천인가 */
export function isOverdue(doc: Pick<MandaratDoc, 'themes'>, item: { ti: number; ai: number }, now: Date): boolean {
  const a = doc.themes[item.ti]?.actions[item.ai];
  if (!a || kindOf(a) !== 'once' || !a.due || a.done) return false;
  return daysBetween(ymd(now), a.due) < 0;
}

/** 집계 칸 — 30개까지는 네모 하나씩, 넘으면 막대 */
export function tallyShape(total: number): 'boxes' | 'bar' | 'none' {
  if (total <= 0) return 'none';
  return total > TALLY_MAX ? 'bar' : 'boxes';
}

/**
 * 오늘 할 일이 하나도 없을 때 무엇을 보여 줄지.
 * - 'fill': 만다라트에 적은 칸이 없다 → '만다라트 채우기'
 * - 'pick': 적은 칸이 있고 오늘에 담을 수 있는 실천이 남았다 → '실천에서 고르기'
 * - 'allIn': 담을 수 있는 건 다 담았다 → '오늘 할 일을 다 담았어요'
 */
export function todayEmptyKind(doc: Pick<MandaratDoc, 'themes'>, canPick: boolean): 'fill' | 'pick' | 'allIn' {
  const filled = doc.themes.some((th) => th.actions.some((a) => a.text.trim().length > 0));
  if (!filled) return 'fill';
  return canPick ? 'pick' : 'allIn';
}

/** 마감 줄 아래 글 — 왼쪽 '10월 14일 수요일 마감', 오른쪽 '10 / 10', 화면 읽기 한 마디 */
export function dayCloseText(now: Date, total: number, l?: Lang): { left: string; right: string; speech: string } {
  const m = msg(l);
  const day = m.fmt.dateLong({ d: now });
  return {
    left: m.today.closeLeft({ day }),
    right: `${total} / ${total}`,
    speech: m.today.closeSpeech({ day, n: total }),
  };
}
