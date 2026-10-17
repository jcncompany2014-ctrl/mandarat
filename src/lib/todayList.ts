// 오늘 목록 화면(Today.tsx)의 순수 계산 — 색인 탭 · 마감 지남 · 집계 칸 · 빈 상태 · 마감 줄 글.
// React Native에 기대지 않아 Node 테스트에서 바로 부른다(tests/todayList.test.js).
import { daysBetween, kindOf, ymd } from './routine';
import { msg, type Lang } from '../i18n';
import type { MandaratDoc } from '../types';

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
