import React, { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, a11yLangProp } from './AppText';
import { NUM, TYPE } from '../theme/type';
import { fade } from '../theme/moods';
import { legibleMark } from '../theme/chart';
import type { M } from '../theme/usePalette';
import { msg, type Lang } from '../i18n';
import type { YearCalendarRow } from '../lib/yearReview';

/** 기록 진하기 0~4 → 포인트 색 농도(%) — 1·2단계를 30·50보다 올려 옅은 두 단계도 서로 갈린다 */
export const HEAT_FILL = [0, 40, 60, 75, 90] as const;
/** 달 이름 칸 폭 */
export const LEDGER_LABEL_W = 30;
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
 * 한 해 장부 — 달마다 한 줄(13줄까지) × 31칸. 칸은 그날 기록 수의 진하기(dayBin)로 포인트 색을 칠하고,
 * 칸 사이에는 머리카락 괘선. 그달에 없는 날(2월 30일 등)은 칸을 그리지 않는다.
 * 화면 읽기는 줄마다 '2026년 10월, 기록한 날 12일'.
 */
export const YearLedger = memo(function YearLedger({ M, rows }: { M: M; rows: readonly YearCalendarRow[] }) {
  const [width, setWidth] = useState(0);
  const cell = ledgerCellSize(width || 340);
  const lines = ledgerLines(rows);
  const rule = StyleSheet.hairlineWidth;
  // 칠한 칸의 테두리 — 종이 위 3:1, 1pt(머리카락 괘선으로는 기록한 날이 보이지 않는다 — 옅은 단계도 칸 자리가 보이게)
  const inkEdge = legibleMark(M.gold, M.bg, M);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {lines.map((ln) => (
        <View
          key={ln.month}
          accessible
          accessibilityLabel={ln.speech}
          {...a11yLangProp()}
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}
        >
          <Text
            style={{ width: LEDGER_LABEL_W, fontSize: 11, lineHeight: 14, fontWeight: '600', color: M.sub, ...NUM }}
            maxFontSizeMultiplier={1.2}
            numberOfLines={1}
          >
            {ln.label}
          </Text>
          <View style={{ flexDirection: 'row', borderTopWidth: rule, borderBottomWidth: rule, borderLeftWidth: rule, borderColor: M.line }}>
            {ln.cells.slice(0, ln.length).map((c, d) => (
              <View
                key={d}
                style={{
                  width: cell, height: cell, borderRightWidth: rule, borderColor: M.line,
                  backgroundColor: c ? fade(M.gold, HEAT_FILL[c]) : 'transparent',
                }}
              >
                {!!c && <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderWidth: 1, borderColor: inkEdge }} />}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
});

/** 장부 위 작은 제목 — '달마다 기록한 날' */
export function YearLedgerHead({ M, title }: { M: M; title: string }) {
  return <Text style={{ ...TYPE.caption, fontWeight: '600', color: M.sub, marginBottom: 6 }}>{title}</Text>;
}
