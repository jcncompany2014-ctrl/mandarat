// 표 이미지(공유용 한 장)와 인쇄물이 함께 읽는 81칸의 내용, 그리고 표 이미지의 자리 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// 그리기는 components/ChartPoster.tsx(표 이미지) · lib/printSheet.ts(인쇄물)가 맡는다. 칸 자리는 theme/chart.ts의 chartCell.
// 표 이미지는 디자인 A의 share.png(build-plan §1): 4:5(540×675pt = 1080×1350px), 늘 밝은 토큰(LIGHT) —
// 머리 '2026 핵심 목표' · 핵심 목표(제목) · 오른쪽 '24/64칸' · L2 색 지도(본문 폭 468) · 발에 마크 + '만다라트' · 날짜.
import type { MandaratDoc } from '../types';
import { chartCell } from '../theme/chart';
import { PRETENDARD_GLYPHS, textWidth } from './labelFit';
import { mapLabel, type MapLabel, type MapLabelKind } from '../components/chart/geometry';
import { lang as currentLang, msg, type Lang } from '../i18n';

/** 공유 이미지 한 장의 크기(pt) — 인스타그램 세로 4:5 */
export const POSTER_W = 540;
export const POSTER_H = 675;
/** 내보내는 그림의 픽셀 크기 */
export const POSTER_PX = { width: 1080, height: 1350 } as const;
/** 그림 1pt가 몇 픽셀인가(2) — 지도의 틈은 이 픽셀에 맞춘다(ShareChart가 어느 기기에서나 1080×1350으로 찍는다) */
export const POSTER_RATIO = POSTER_PX.width / POSTER_W;

/** 공유 이미지의 자리(pt, scale 1) — 목업 share.html의 값 */
export const POSTER = {
  /** 좌우 여백 · 위 · 아래 */
  pad: 36,
  top: 34,
  bottom: 30,
  /** 머리 줄 '2026 핵심 목표' — 600 15/20 print */
  eyebrowFs: 15,
  eyebrowLh: 20,
  /** 머리 줄 아래 → 제목 줄 */
  headGap: 4,
  /** 핵심 목표(제목) — 700, 한 줄에 들도록 44에서 28까지, 그래도 넘치면 28/34 두 줄. 자간 −0.035em */
  goalSizes: [44, 40, 36, 32, 28],
  goalLineRatio: 54 / 44,
  goalTwoLine: 28,
  goalTracking: -0.035,
  /** 제목 줄 오른쪽 '24/64' 700 24/30(−0.02em) + 단위 '칸' 600 14/18 ink2, 사이 3 */
  figFs: 24,
  figLh: 30,
  figTracking: -0.02,
  unitFs: 14,
  unitLh: 18,
  unitGap: 3,
  /** 제목과 숫자 사이 */
  figGap: 16,
  /** 제목 줄 → 지도 */
  mapTop: 22,
  /** 발 줄 — 24 높이: 마크 22 + 8 + '만다라트'(700 16/20, −0.01em, printStrong) · 날짜(500 14/20, print) */
  footH: 24,
  mark: 22,
  markGap: 8,
  wordFs: 16,
  wordLh: 20,
  wordTracking: -0.01,
  dateFs: 14,
  dateLh: 20,
} as const;

/** 지도의 폭 — 본문 폭 그대로(540 − 36 × 2) */
export const POSTER_MAP = POSTER_W - POSTER.pad * 2;

/**
 * 지도 글자의 배율 — 지도의 이름은 33pt 칸(만다라트 탭, 10/12)에 맞춰 둔 크기라, 피드(360pt 폭)에서도 9pt쯤으로 읽히게
 * share.png 그대로 키운다: 영역 이름 13/16(× 1.3) · 핵심 목표 13.5/16(× 13.5/11).
 * 줄은 칸을 배율로 줄인 상자에서 나누고(mapLabel) 글자만 키운다 — 화면의 지도와 같은 자리에서 끊긴다('자기 / 계발').
 */
export const POSTER_LABEL: Readonly<Record<MapLabelKind, number>> = { head: 1.3, core: 13.5 / 11 };

/** 지도 칸 하나의 글 — 칸(w × h pt)에 맞춘 mapLabel을 배율만큼 키운 것 */
export function posterLabel(text: string, kind: MapLabelKind, w: number, h: number, l: Lang = currentLang()): MapLabel {
  const k = POSTER_LABEL[kind];
  const lab = mapLabel(text, kind, w / k, h / k, l);
  return { ...lab, fs: lab.fs * k, lh: Math.round(lab.lh * k), letterSpacing: Math.round(lab.letterSpacing * k * 100) / 100 };
}

/**
 * 그림의 치수(pt) — 모두 scale에서 나온다. scale 1이 공유 이미지(540×675) 그대로,
 * 미리보기 · 지난 표처럼 다른 크기로 그릴 때는 글자까지 같은 비율로(transform으로 늘리지 않아 글자가 흐려지지 않는다).
 */
export function posterMetrics(scale = 1) {
  const s = scale;
  return {
    width: POSTER_W * s,
    height: POSTER_H * s,
    pad: POSTER.pad * s,
    top: POSTER.top * s,
    bottom: POSTER.bottom * s,
    eyebrowFs: POSTER.eyebrowFs * s,
    eyebrowLh: POSTER.eyebrowLh * s,
    headGap: POSTER.headGap * s,
    figFs: POSTER.figFs * s,
    figLh: POSTER.figLh * s,
    figTracking: POSTER.figTracking * POSTER.figFs * s,
    unitFs: POSTER.unitFs * s,
    unitLh: POSTER.unitLh * s,
    unitGap: POSTER.unitGap * s,
    figGap: POSTER.figGap * s,
    map: POSTER_MAP * s,
    mapTop: POSTER.mapTop * s,
    footH: POSTER.footH * s,
    mark: POSTER.mark * s,
    markGap: POSTER.markGap * s,
    wordFs: POSTER.wordFs * s,
    wordLh: POSTER.wordLh * s,
    wordTracking: POSTER.wordTracking * POSTER.wordFs * s,
    dateFs: POSTER.dateFs * s,
    dateLh: POSTER.dateLh * s,
    /** 목표가 없을 때 손으로 적을 밑줄 */
    underline: 0.75 * s,
  };
}

export type PosterMetrics = ReturnType<typeof posterMetrics>;

/** 제목 줄 오른쪽 '24/64' — 빈 표에는 없다 */
export function posterFigure(done: number): string {
  return `${done}/64`;
}

/** 핵심 목표(제목)의 크기 — scale 1의 pt. lines는 1(한 줄에 든다) 또는 2(28/34 두 줄, 넘치면 말줄임표) */
export interface PosterGoal { fs: number; lh: number; letterSpacing: number; lines: 1 | 2 }

/**
 * 제목이 숫자 옆 한 줄에 드는 가장 큰 크기 — 44 · 40 · 36 · 32 · 28, 안 되면 28/34 두 줄.
 * figure: 오른쪽 숫자 글('24/64', 빈 표는 ''), unit: 그 뒤 단위('칸'). 폭은 Pretendard 어림(labelFit)으로 잰다.
 */
export function posterGoal(goal: string, figure: string, unit: string, l: Lang = currentLang()): PosterGoal {
  const t = goal.trim().replace(/\s+/g, ' ');
  const figW = figure
    ? textWidth(figure, POSTER.figFs, PRETENDARD_GLYPHS, l) + POSTER.unitGap + textWidth(unit, POSTER.unitFs, PRETENDARD_GLYPHS, l) + POSTER.figGap
    : 0;
  const room = POSTER_MAP - figW;
  const make = (fs: number, lines: 1 | 2): PosterGoal => ({
    fs, lh: Math.round(fs * POSTER.goalLineRatio), letterSpacing: Math.round(POSTER.goalTracking * fs * 100) / 100, lines,
  });
  for (const fs of POSTER.goalSizes) {
    if (textWidth(t, fs, PRETENDARD_GLYPHS, l) <= room) return make(fs, 1);
  }
  return make(POSTER.goalTwoLine, 2);
}

/** 칸 하나 — 인쇄물이 81칸을 이 순서(줄마다 왼쪽에서 오른쪽)로 찍는다 */
export interface PosterCell {
  row: number;
  col: number;
  /** 영역 번호(가운데 칸은 -1) — 색은 토큰의 dye[ti] · wash[ti] · tint[ti] */
  ti: number;
  /** core: 핵심 목표 · head: 영역 이름표(가운데 블록 둘레 포함) · action: 적어 둔 실천 · empty: 아직 안 적은 칸(손으로 쓸 자리) */
  kind: 'core' | 'head' | 'action' | 'empty';
  text: string;
  /** 달성 — 빈 표에서는 늘 false */
  done: boolean;
  /** 영역 이름을 아직 짓지 않아 '영역 n'으로 찍히는 이름표 */
  unnamed: boolean;
}

/** '2026. 10. 13.' — 표 이미지 발의 날짜(연도는 오늘에서 계산한다) */
export function posterDate(d: Date, l?: Lang): string {
  return msg(l).chart.posterDate({ y: d.getFullYear(), m: d.getMonth() + 1, n: d.getDate() });
}

/** 81칸을 읽는 순서(줄마다 왼쪽에서 오른쪽)로. blank: 이름표와 목표만 남기고 실천은 모두 빈 칸(손으로 채우는 빈 표) */
export function posterCells(doc: Pick<MandaratDoc, 'centerGoal' | 'themes'>, blank: boolean, l?: Lang): PosterCell[] {
  const out: PosterCell[] = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const c = chartCell(row, col);
      if (!c) continue;
      if (c.kind === 'core') {
        out.push({ row, col, ti: -1, kind: 'core', text: doc.centerGoal.trim(), done: false, unnamed: false });
        continue;
      }
      const th = doc.themes[c.ti];
      if (c.kind === 'head') {
        const name = th?.title.trim() ?? '';
        out.push({ row, col, ti: c.ti, kind: 'head', text: name || msg(l).chart.areaN({ n: c.ti + 1 }), done: false, unnamed: !name });
        continue;
      }
      const a = th?.actions[c.ai];
      const text = blank ? '' : a?.text.trim() ?? '';
      if (!a || !text) {
        out.push({ row, col, ti: c.ti, kind: 'empty', text: '', done: false, unnamed: false });
        continue;
      }
      out.push({ row, col, ti: c.ti, kind: 'action', text, done: !!a.done, unnamed: false });
    }
  }
  return out;
}

/** 8칸을 모두 달성한 영역 번호들 — 인쇄물은 그 블록에 먹 테두리를 두른다(빈 표에서는 없다) */
export function posterFinished(doc: Pick<MandaratDoc, 'themes'>, blank: boolean): number[] {
  if (blank) return [];
  const out: number[] = [];
  doc.themes.forEach((th, ti) => {
    if (th.actions.length > 0 && th.actions.every((a) => a.text.trim() && a.done)) out.push(ti);
  });
  return out;
}

/** 적어 둔 실천 중 달성한 칸 수 — 표 이미지의 '24/64' · 인쇄물의 '64칸 중 n칸 달성' */
export function posterDone(doc: Pick<MandaratDoc, 'themes'>): number {
  return doc.themes.reduce((s, th) => s + th.actions.filter((a) => a.text.trim() && a.done).length, 0);
}
