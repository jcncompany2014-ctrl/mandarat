import React, { memo, useMemo } from 'react';
import { PixelRatio, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text, a11yLangProp } from './AppText';
import { ROLE } from '../theme/type';
import type { M } from '../theme/usePalette';
import { HEAT_TONES } from '../lib/statsView';
import { msg, type Lang } from '../i18n';
import type { YearCalendarRow } from '../lib/yearReview';
import { roundRectPath } from '../lib/tilePath';

/** 달 이름 칸 폭 */
export const LEDGER_LABEL_W = 30;
/** 칸 사이(타일 사이의 틈) · 타일 모서리 */
const LEDGER_GAP = 1.5;
const LEDGER_RADIUS = 2;
/** 달 줄 사이 — 줄 간격(칸 + 사이)이 16pt 아래로 내려가지 않게: 폰의 10pt 칸에서도 달 이름(13pt)끼리 붙지 않는다 */
const LEDGER_ROW_PITCH = 16;
function ledgerRowGap(cell: number): number {
  return Math.max(3, LEDGER_ROW_PITCH - cell);
}
/** 한 칸 한 변 — 폰에서 10pt 안팎, 아이패드 단(600pt)에서 16pt까지 넓혀 단을 채운다. 좁아도 6pt 아래로는 줄이지 않는다 */
export function ledgerCellSize(width: number): number {
  return Math.max(6, Math.min(16, Math.floor((width - LEDGER_LABEL_W) / 31)));
}

export interface LedgerLine {
  month: string;
  /** 줄 머리 '10월' — 소리(speech)로는 해까지 '2026년 10월' */
  label: string;
  /** 화면 읽기가 한 줄을 읽는 말 */
  speech: string;
  /** 그달에 있는 날 수(28~31) */
  length: number;
  /** 1일~31일 진하기 — 없는 날 null */
  cells: (number | null)[];
  /** 기록이 있는 날 수 */
  days: number;
}

/** yearCalendar 줄 → 장부 줄(머리 · 읽는 말) — 13달 · 윤년 2월 29일도 그대로 */
export function ledgerLines(rows: readonly YearCalendarRow[], l?: Lang): LedgerLine[] {
  const m = msg(l).year;
  return rows.map((r) => {
    const y = Number(r.month.slice(0, 4));
    const mo = Number(r.month.slice(5, 7));
    const days = r.cells.filter((c) => (c ?? 0) > 0).length;
    const length = r.cells.filter((c) => c !== null).length;
    return {
      month: r.month,
      label: m.monthShort({ m: mo }),
      speech: m.monthSpeech({ label: m.monthLong({ y, m: mo }), n: days }),
      length,
      cells: r.cells,
      days,
    };
  });
}

/** 장부의 칸 그림 — 바깥 크기와, 진하기(0 기록 없음 ~ 4)마다 그 칸들을 이은 길 하나 */
export interface LedgerPicture {
  width: number;
  height: number;
  /** 진하기 차례(HEAT_TONES) — 그 진하기의 칸이 없으면 빈 글 */
  paths: string[];
}

/**
 * 장부의 칸을 진하기마다 길 하나로 — 줄 i는 위에서 rowGap + i × (칸 + rowGap), 칸 d는 달 이름 칸 다음 d × 칸,
 * 타일은 그 안쪽 0.75(사이 1.5), 모서리 2. 타일의 네 변은 기기 픽셀(ratio)에 맞춘다 — 칸마다 View를 둘 때
 * 레이아웃이 맞춰 주던 것과 같은 자리라 변이 번지지 않는다. 그달에 없는 날(null)은 그리지 않는다.
 */
export function ledgerPicture(lines: readonly Pick<LedgerLine, 'cells' | 'length'>[], cell: number, ratio: number): LedgerPicture {
  const k = ratio > 0 ? ratio : 1;
  const snap = (v: number) => Math.round(v * k) / k;
  const rowGap = ledgerRowGap(cell);
  const paths = HEAT_TONES.map(() => '');
  lines.forEach((ln, i) => {
    const top = rowGap + i * (cell + rowGap);
    const y0 = snap(top + LEDGER_GAP / 2);
    const y1 = snap(top + cell - LEDGER_GAP / 2);
    for (let d = 0; d < ln.length; d++) {
      const left = LEDGER_LABEL_W + d * cell;
      const x0 = snap(left + LEDGER_GAP / 2);
      const x1 = snap(left + cell - LEDGER_GAP / 2);
      const bin = ln.cells[d] ?? 0;
      // 모르는 진하기는 기록 없는 날의 색(tile)으로
      paths[bin > 0 && bin < paths.length ? bin : 0] += roundRectPath(x0, y0, x1 - x0, y1 - y0, LEDGER_RADIUS);
    }
  });
  return { width: LEDGER_LABEL_W + 31 * cell, height: lines.length * (cell + rowGap), paths };
}

/**
 * 한 해 장부 — 달마다 한 줄(13줄까지) × 31칸. 칸은 타일(모서리 2, 사이 1.5): 기록 없는 날 tile,
 * 그날 기록 수의 진하기(dayBin)마다 printMid → printEdge → ink2 → ink(통계의 최근 10주와 같은 차례, lib/statsView HEAT_TONES).
 * 그달에 없는 날(2월 30일 등)은 칸을 그리지 않는다. 화면 읽기는 줄마다 '2026년 10월, 기록한 날 12일'.
 * 칸 400여 개는 그림 한 장(Svg)에 진하기마다 길 하나로 그린다(ledgerPicture) — 줄마다 남는 것은 달 이름과 읽는 말뿐이다.
 * width: 장부를 놓는 폭(본문 폭) — 칸 크기를 여기서 바로 정한다(놓인 뒤 재서 다시 그리지 않는다).
 */
export const YearLedger = memo(function YearLedger({ M, rows, width }: { M: M; rows: readonly YearCalendarRow[]; width: number }) {
  const cell = ledgerCellSize(width);
  const lines = ledgerLines(rows);
  const rowGap = ledgerRowGap(cell);
  const tones = HEAT_TONES.map((t) => M[t]);
  const ratio = PixelRatio.get();
  // 칸 그림은 달력(rows) · 칸 크기 · 픽셀 배율이 같으면 다시 만들지 않는다(lines는 rows에서 나온 것)
  const pic = useMemo(() => ledgerPicture(lines, cell, ratio), [rows, cell, ratio]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View>
      {/* 칸 — 줄들 뒤에 깔린 그림 한 장. 화면 읽기는 아래 줄이 말한다 */}
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        <Svg width={pic.width} height={pic.height}>
          {pic.paths.map((d, bin) => (d ? <Path key={bin} d={d} fill={tones[bin] ?? M.tile} /> : null))}
        </Svg>
      </View>
      {lines.map((ln) => (
        <View
          key={ln.month}
          accessible
          accessibilityLabel={ln.speech}
          {...a11yLangProp()}
          style={{ flexDirection: 'row', alignItems: 'center', height: cell, marginTop: rowGap }}
        >
          <Text style={[ROLE.meta, { width: LEDGER_LABEL_W, lineHeight: cell + rowGap, color: M.print }]} maxFontSizeMultiplier={1.2} numberOfLines={1}>
            {ln.label}
          </Text>
        </View>
      ))}
    </View>
  );
});

/** 장부 위 작은 제목 — '달마다 기록한 날' */
export function YearLedgerHead({ M, title }: { M: M; title: string }) {
  return <Text style={[ROLE.label, { color: M.print, marginBottom: 6 }]}>{title}</Text>;
}
