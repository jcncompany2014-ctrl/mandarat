// 표 이미지(공유용 인쇄 한 장)의 내용 — 81칸 각각에 무엇을 어떻게 찍을지 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// 그리기는 components/ChartPoster.tsx가 맡는다. 자리 규칙은 theme/chart.ts의 chartCell을 그대로 따른다.
import type { MandaratDoc } from '../types';
import { chartCell } from '../theme/chart';
import { countInfo } from './kinds';
import { kindOf } from './routine';

/** 공유 이미지 한 장의 크기(pt) — 1080×1350으로 3배 찍는다(인스타그램 세로 4:5) */
export const POSTER_W = 360;
export const POSTER_H = 450;
/** 내보내는 그림의 픽셀 크기 */
export const POSTER_PX = { width: 1080, height: 1350 } as const;

/** 칸 하나 */
export interface PosterCell {
  row: number;
  col: number;
  /** 영역 번호(가운데 칸은 -1) */
  ti: number;
  /** core: 핵심 목표 · head: 영역 이름표 · action: 적어 둔 실천 · empty: 아직 안 적은 칸(손으로 쓸 자리) */
  kind: 'core' | 'head' | 'action' | 'empty';
  text: string;
  /** 영역 색(가운데 칸은 '') */
  color: string;
  /** 달성 — 영역 색으로 칠하고 흰 글씨. 빈 표에서는 늘 false */
  done: boolean;
  /** 쌓기 실천의 찬 만큼(0~100) — 맨 아래 2pt 막대. 막대가 없으면 null(빈 표·달성한 칸·다른 유형) */
  barPct: number | null;
  /** 이름표 칸의 그 영역 달성 비율(0~100) — 빈 표에서는 null */
  headPct: number | null;
  /** 영역 이름을 아직 짓지 않아 '영역 n'으로 찍히는 이름표 */
  unnamed: boolean;
}

/** '2026. 10. 13.' — 인쇄물 머리의 날짜(연도는 오늘에서 계산한다) */
export function posterDate(d: Date): string {
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

/** 81칸을 읽는 순서(줄마다 왼쪽에서 오른쪽)로. blank: 글만 남기고 칠·막대를 모두 뺀다(손으로 채우는 빈 표) */
export function posterCells(doc: Pick<MandaratDoc, 'centerGoal' | 'themes'>, blank: boolean): PosterCell[] {
  const out: PosterCell[] = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const c = chartCell(row, col);
      if (!c) continue;
      if (c.kind === 'core') {
        out.push({ row, col, ti: -1, kind: 'core', text: doc.centerGoal.trim(), color: '', done: false, barPct: null, headPct: null, unnamed: false });
        continue;
      }
      const th = doc.themes[c.ti];
      if (c.kind === 'head') {
        const name = th?.title.trim() ?? '';
        const written = th ? th.actions.filter((a) => a.text.trim()) : [];
        const done = written.filter((a) => a.done).length;
        out.push({
          row, col, ti: c.ti, kind: 'head', text: name || `영역 ${c.ti + 1}`, color: th?.color ?? '', done: false, barPct: null,
          headPct: blank ? null : Math.round((done / 8) * 100), unnamed: !name,
        });
        continue;
      }
      const a = th?.actions[c.ai];
      const text = a?.text.trim() ?? '';
      if (!a || !text) {
        out.push({ row, col, ti: c.ti, kind: 'empty', text: '', color: th?.color ?? '', done: false, barPct: null, headPct: null, unnamed: false });
        continue;
      }
      const done = !blank && !!a.done;
      const barPct = !blank && !done && kindOf(a) === 'count' ? countInfo(a).pct : null;
      out.push({ row, col, ti: c.ti, kind: 'action', text, color: th.color, done, barPct: barPct && barPct > 0 ? barPct : null, headPct: null, unnamed: false });
    }
  }
  return out;
}

/** 8칸을 모두 달성한 영역 번호들 — 그 블록에 금색 테두리를 두른다(빈 표에서는 없다) */
export function posterFinished(doc: Pick<MandaratDoc, 'themes'>, blank: boolean): number[] {
  if (blank) return [];
  const out: number[] = [];
  doc.themes.forEach((th, ti) => {
    if (th.actions.length > 0 && th.actions.every((a) => a.text.trim() && a.done)) out.push(ti);
  });
  return out;
}

/** 적어 둔 실천 중 달성한 칸 수 — 표 아래 '64칸 중 n칸' */
export function posterDone(doc: Pick<MandaratDoc, 'themes'>): number {
  return doc.themes.reduce((s, th) => s + th.actions.filter((a) => a.text.trim() && a.done).length, 0);
}
