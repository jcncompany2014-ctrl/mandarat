// '오늘 할 일 추가'와 '오늘 할 일 고르기' 시트의 판단 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
import type { MandaratDoc } from '../types';
import { pickSections, type PickRow, type PickSection } from './pick';
import { msg, type Lang } from '../i18n';

/** 빈 입력칸 아래에 보여 줄, 이 영역에서 아직 담지 않은 실천 수 */
export const QUICK_PICK_MAX = 3;

/**
 * 이 영역에서 오늘 할 일로 바로 담을 수 있는 칸(아직 담지 않았고 저절로 담기지도 않은 것) — 칸 순서로 최대 max개.
 */
export function areaPicks(
  doc: Pick<MandaratDoc, 'themes' | 'todayKeys' | 'dayLog'>,
  ti: number,
  today: Date,
  max = QUICK_PICK_MAX,
): PickRow[] {
  const sec = pickSections(doc, today).find((s) => s.ti === ti);
  return sec ? sec.rows.filter((r) => r.state === 'off').slice(0, max) : [];
}

/** 이 영역에서 글자가 없는 첫 칸(없으면 -1) — 입력한 글을 바로 적어 넣을 자리 */
export function firstEmptyCell(doc: Pick<MandaratDoc, 'themes'>, ti: number): number {
  const th = doc.themes[ti];
  return th ? th.actions.findIndex((a) => !a.text.trim()) : -1;
}

/** 담기 시트 입력칸 위에 보여 줄, 이 시트에서 담은 줄 수(짧은 목록 — 시트가 키보드 위에서 자라지 않게) */
export const QUICK_LINES_MAX = 3;

/**
 * 이 시트를 연 뒤에 담은 줄(직접 적은 할 일) — 담은 순서로, 마지막 max개(맨 아래가 방금 담은 줄).
 * before: 시트를 열 때 이미 있던 할 일의 id. 문서에서 읽으므로 지우거나 끝낸 것도 그대로 따라간다.
 */
export function sheetLines<T extends { id: string }>(
  extras: readonly T[],
  before: ReadonlySet<string>,
  max = QUICK_LINES_MAX,
): T[] {
  const added = extras.filter((x) => !before.has(x.id));
  return max > 0 ? added.slice(-max) : [];
}

/**
 * '어느 영역의 일인가요?' 줄 오른쪽의 한 가지 — 고른 영역에 매인다.
 * - 입력칸이 비어 있고 이 영역에 담을 만한 실천이 있으면 'pick'('커리어 실천에서 고르기 ›' — 고르기 시트를 그 영역으로)
 * - 글을 적었고 이 영역에 빈 칸이 있으면 'write'(그 글을 만다라트 빈 칸에 적기, ai는 그 칸)
 * - 그 밖에는 null(아무것도 놓지 않는다)
 */
export type QuickAside = { kind: 'pick' } | { kind: 'write'; ai: number } | null;

export function quickAside(
  doc: Pick<MandaratDoc, 'themes' | 'todayKeys' | 'dayLog'>,
  ti: number,
  text: string,
  today: Date,
): QuickAside {
  if (text.trim()) {
    const ai = firstEmptyCell(doc, ti);
    return ai >= 0 ? { kind: 'write', ai } : null;
  }
  return areaPicks(doc, ti, today, 1).length > 0 ? { kind: 'pick' } : null;
}

export interface PickListRow extends PickRow {
  /** 지난주를 닫으며 고른 이번 주 중점 칸 */
  focus: boolean;
}

/**
 * 고를 수 있는 줄만(담김·안 담김) — 이번 주 중점 칸(고른 순서)을 먼저, 나머지는 칸 순서대로.
 * 저절로 담긴 줄은 고를 수 없으므로 빼고 autoLine으로 한 줄에 알린다.
 */
export function choosableRows(sec: Pick<PickSection, 'rows'>, priority: readonly string[]): PickListRow[] {
  const rank = new Map(priority.map((k, i) => [k, i] as const));
  const rows = sec.rows
    .filter((r) => r.state !== 'auto')
    .map((r) => ({ ...r, focus: rank.has(`${r.ti}-${r.ai}`) }));
  const first = rows.filter((r) => r.focus).sort((a, b) => rank.get(`${a.ti}-${a.ai}`)! - rank.get(`${b.ti}-${b.ai}`)!);
  return [...first, ...rows.filter((r) => !r.focus)];
}

/** '저절로 담김 3 · 아침 스트레칭, 물 2L 외 1' — 저절로 담긴 칸이 없으면 '' */
export function autoLine(sec: Pick<PickSection, 'autoCount' | 'autoNames'>, l?: Lang): string {
  if (sec.autoCount <= 0) return '';
  const t = msg(l).today;
  const names = sec.autoNames.slice(0, 2);
  const more = sec.autoCount - names.length;
  return `${t.autoLine({ n: sec.autoCount, names: names.join(t.listSep) })}${more > 0 ? t.autoMore({ n: more }) : ''}`;
}
