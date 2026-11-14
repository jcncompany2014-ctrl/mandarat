// 이번 주 쌓은 막대(통계 · stats.png) — 날마다 그날 한 일의 영역 번호(0~7)를, 그 주에 많이 한 영역부터 쌓는다
// (맨 아래가 그 주에 가장 많이 한 영역 — 막대마다 같은 순서라 색이 층으로 읽힌다).
// React · RN 의존 없는 순수 모듈(단위 테스트 대상). 그리기는 components/chart WeekBars variant 'stack'.
import type { MandaratDoc } from '../types';

/** 기록 키의 영역 번호 — 칸 '3-5' · 직접 추가한 할 일 '3-xabc' · 떼어 둔 기록 '3-xh…' 모두 앞자리. 영역이 아니면 null */
export function areaOfKey(key: string): number | null {
  const m = /^([0-7])-/.exec(key);
  return m ? Number(m[1]) : null;
}

export interface WeekStack {
  /** 영역별 그 주(오늘까지) 수 — 8칸 */
  counts: number[];
  /** 영역 번호를 쌓는 차례 — 많이 한 영역부터, 같으면 영역 번호 순 */
  order: number[];
  /** 날마다(월요일부터) 쌓을 영역 번호, 맨 아래부터 — 아직 오지 않은 날은 null */
  days: (number[] | null)[];
}

/**
 * 한 주 일곱 날(weekReview().days)의 쌓은 막대. 그날 키마다 칸 하나(한 일 하나)이고,
 * 영역 순서는 그 주 전체 수로 정한다 — 그래서 모든 막대가 같은 층 순서를 갖는다.
 */
export function weekStack(
  dayLog: MandaratDoc['dayLog'],
  days: readonly { date: string; future: boolean }[],
): WeekStack {
  const counts = new Array<number>(8).fill(0);
  const perDay = days.map((d) => {
    if (d.future) return null;
    const out: number[] = [];
    for (const k of dayLog[d.date] ?? []) {
      const ti = areaOfKey(k);
      if (ti === null) continue;
      out.push(ti);
      counts[ti]++;
    }
    return out;
  });
  const order = [0, 1, 2, 3, 4, 5, 6, 7].sort((a, b) => counts[b] - counts[a] || a - b);
  const rank = new Array<number>(8);
  order.forEach((ti, i) => { rank[ti] = i; });
  return {
    counts,
    order,
    days: perDay.map((list) => (list ? [...list].sort((a, b) => rank[a] - rank[b]) : null)),
  };
}
