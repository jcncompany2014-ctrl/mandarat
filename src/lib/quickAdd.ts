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
