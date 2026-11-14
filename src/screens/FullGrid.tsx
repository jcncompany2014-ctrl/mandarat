import React, { memo } from 'react';
import { PixelRatio, View } from 'react-native';
import { useWindowDimensions } from '../lib/screen';
import { Text, a11yLangProp } from '../components/AppText';
import { ColourMap, MAP_MAX } from '../components/chart';
import { KIT_TYPE } from '../components/kit';
import { ROLE } from '../theme/type';
import { GEO } from '../theme/tokens';
import type { M } from '../theme/usePalette';
import type { Theme } from '../types';
import { TID } from '../lib/testIds';
import { useMsg } from '../i18n/react';

/** 지도 묶음의 자리(목업 chart.html .sheet) — 머리 아래 18, 위 줄 20, 지도 위 12 · 아래 10, 아래 한 줄 20 */
export const SHEET = { top: 18, line: 20, mapTop: 12, mapBottom: 10, figureGap: 4 } as const;

/** 펼침에서 지도 밖이 쓰는 높이 — 머리 72 · 위 18 · 위 줄 20 · 지도 위 12 · 아래 10 · 아래 한 줄 20 */
const GRID_CHROME = GEO.header + SHEET.top + SHEET.line + SHEET.mapTop + SHEET.mapBottom + SHEET.line;

const tabular = { fontVariant: ['tabular-nums' as const] };

/** 블록 → 지도 블록 단추의 testID */
const blockTestID = (b: number | 'c') => TID.gridBlock(b);

/**
 * 만다라트 탭의 지도 한 장(목업 chart.png · first.png) — 위 줄('2026 만다라트' · '달성 24/64칸'),
 * 색 지도 L2(영역 이름과 핵심 목표만, 실천은 색만), 아래 한 줄('영역을 누르면 실천 여덟 칸이 보여요').
 * 블록을 누르면 그 영역을 크게(onOpen) — 크게 본 모습은 GridScreen이 영역 화면(AreaPage)으로 그린다.
 * start: 처음(쓴 칸이 8칸 전) — 위 줄이 '쓴 칸 0/64', 다음 빈 칸에 먹 테두리(focus), 아래 한 줄 없음.
 * availH: 펼침(V5-A)에서 이 쪽이 스크롤 없이 보여 줄 수 있는 높이 — 지도가 그 안에 들어가게 줄인다. 폰 · 한 단은 없다.
 */
export const FullGrid = memo(function FullGrid({
  M, themes, goal, todayKeys, start, focus, availH, onOpen, folioRef,
}: {
  M: M;
  themes: readonly Theme[];
  goal: string;
  /** 오늘 할 일 'ti-ai' — 블록 단추의 화면 읽기 '오늘 n칸' */
  todayKeys?: ReadonlySet<string>;
  /** 처음 화면(쓴 칸 8칸 전) */
  start: boolean;
  /** 먹 테두리를 두를 칸 [줄, 칸] — 처음 화면의 다음 빈 칸 */
  focus?: readonly [number, number] | null;
  availH?: number;
  onOpen: (b: number | 'c') => void;
  /** 크게 보기를 닫은 뒤 화면 읽기 초점을 돌려줄 자리(위 줄) */
  folioRef?: React.Ref<View>;
}) {
  const m = useMsg();
  const { width: winW } = useWindowDimensions();
  const measure = Math.max(0, winW - GEO.gutter * 2);
  // 지도 폭 — 본문 폭(아이패드 520까지), 펼침에서는 쪽 높이에 들어가게
  const fitW = availH != null ? fitMapW(measure, availH) : measure;
  const mapW = Math.floor(Math.min(fitW, MAP_MAX));
  const mapLeft = PixelRatio.roundToNearestPixel(Math.max(0, (measure - mapW) / 2));

  let written = 0;
  let done = 0;
  for (const th of themes) {
    for (const a of th.actions) {
      if (a.done) done++;
      if (a.text.trim()) written++;
    }
  }
  const n = start ? written : done;

  return (
    <View style={{ marginTop: SHEET.top, paddingHorizontal: GEO.gutter }}>
      {/* 위 줄 — 양식 이름과 칸 수(한 덩어리로 읽는다) */}
      <View
        ref={folioRef}
        accessible
        accessibilityLabel={`${m.chart.formName({ y: new Date().getFullYear() })}${m.chart.sep}${start ? m.chart.writtenOf64Say({ n }) : m.chart.doneOf64Say({ done: n })}`}
        {...a11yLangProp()}
        style={{ height: SHEET.line, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}
      >
        <Text style={[ROLE.label, { color: M.print, flexShrink: 1 }]} numberOfLines={1}>{m.chart.formName({ y: new Date().getFullYear() })}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SHEET.figureGap }}>
          <Text style={[ROLE.label, { color: M.print }]} numberOfLines={1}>{start ? m.chart.writtenFolio : m.chart.done}</Text>
          {/* 처음은 '쓴 칸 0/64'(칸이 앞에 있다), 그 뒤는 '달성 24/64칸' */}
          <Text style={[KIT_TYPE.wordOn, tabular, { color: M.ink }]} numberOfLines={1} maxFontSizeMultiplier={1.4}>
            {start ? `${n}/64` : m.chart.of64({ n })}
          </Text>
        </View>
      </View>

      {/* 지도 — 온 픽셀에 놓는다. testID는 지도 바깥 그대로(도구가 이 틀의 왼쪽 위 블록을 누른다) */}
      <View testID={TID.gridTable} style={{ marginTop: SHEET.mapTop, marginLeft: mapLeft, width: mapW, alignSelf: 'flex-start' }}>
        <ColourMap
          themes={themes}
          goal={goal}
          level="L2"
          width={mapW}
          focus={focus}
          todayKeys={todayKeys}
          onPressBlock={onOpen}
          accessibilityHint={m.chart.mapBlockHint}
          blockTestID={blockTestID}
        />
      </View>

      {!start && (
        <View style={{ height: SHEET.line, marginTop: SHEET.mapBottom, justifyContent: 'center' }}>
          <Text style={[ROLE.note, { color: M.print }]}>{m.chart.mapNote}</Text>
        </View>
      )}
    </View>
  );
});

/** 펼침 쪽 높이 availH에 지도(정사각형)가 들어가는 폭 — 본문 폭보다 넓어지지 않는다 */
export function fitMapW(measure: number, availH: number): number {
  return Math.max(0, Math.min(measure, Math.floor(availH - GRID_CHROME)));
}
