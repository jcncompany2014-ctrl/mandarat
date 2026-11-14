import React, { memo, useState } from 'react';
import { View } from 'react-native';
import { Text, a11yLangProp } from './AppText';
import { ROLE } from '../theme/type';
import type { M } from '../theme/usePalette';
import { HEAT_TONES } from '../lib/statsView';
import { msg, type Lang } from '../i18n';
import type { YearCalendarRow } from '../lib/yearReview';

/** 달 이름 칸 폭 */
export const LEDGER_LABEL_W = 30;
/** 칸 사이(타일 사이의 틈) · 타일 모서리 */
const LEDGER_GAP = 1.5;
const LEDGER_RADIUS = 2;
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

/**
 * 한 해 장부 — 달마다 한 줄(13줄까지) × 31칸. 칸은 타일(모서리 2, 사이 1.5): 기록 없는 날 tile,
 * 그날 기록 수의 진하기(dayBin)마다 printMid → printEdge → ink2 → ink(통계의 최근 10주와 같은 차례, lib/statsView HEAT_TONES).
 * 그달에 없는 날(2월 30일 등)은 칸을 그리지 않는다. 화면 읽기는 줄마다 '2026년 10월, 기록한 날 12일'.
 */
export const YearLedger = memo(function YearLedger({ M, rows }: { M: M; rows: readonly YearCalendarRow[] }) {
  const [width, setWidth] = useState(0);
  const cell = ledgerCellSize(width || 340);
  const lines = ledgerLines(rows);
  const tones = HEAT_TONES.map((t) => M[t]);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {lines.map((ln) => (
        <View
          key={ln.month}
          accessible
          accessibilityLabel={ln.speech}
          {...a11yLangProp()}
          style={{ flexDirection: 'row', alignItems: 'center', height: cell }}
        >
          <Text style={[ROLE.meta, { width: LEDGER_LABEL_W, lineHeight: Math.max(cell, 12), color: M.print }]} maxFontSizeMultiplier={1.2} numberOfLines={1}>
            {ln.label}
          </Text>
          {ln.cells.slice(0, ln.length).map((c, d) => (
            <View key={d} style={{ width: cell, height: cell, padding: LEDGER_GAP / 2 }}>
              <View style={{ flex: 1, borderRadius: LEDGER_RADIUS, backgroundColor: tones[c ?? 0] ?? M.tile }} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
});

/** 장부 위 작은 제목 — '달마다 기록한 날' */
export function YearLedgerHead({ M, title }: { M: M; title: string }) {
  return <Text style={[ROLE.label, { color: M.print, marginBottom: 6 }]}>{title}</Text>;
}
