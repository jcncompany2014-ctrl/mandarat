// 위치 표시 — 블록 하나를 작은 3×3으로(시트 머리: 목업 parts-sheets.js S.locator · editor.png · sheet.png),
// 그리고 넘기기 줄의 표 위치(블록 아홉을 3×3: block.png 'locator 1/8'). 둘 다 그림일 뿐 — 이름은 부르는 쪽이 말한다.
import React, { memo } from 'react';
import { PixelRatio, View, type StyleProp, type ViewStyle } from 'react-native';
import { usePalette } from '../../theme/usePalette';
import { CELL_POS, CHART_POS } from '../../theme/chart';
import { actionState } from '../../lib/mapCells';
import { LOCATOR, PAGER_MARK, locatorGeometry, pagerGeometry } from './geometry';
import type { Theme } from '../../types';

export interface LocatorProps {
  themes: readonly Theme[];
  /** 영역 번호(0~7), 또는 'core'(가운데 블록: 가운데 core, 둘레 여덟 영역 색) */
  block: number | 'core';
  /** 먹 테두리를 두를 칸 — 실천 번호(0~7) · 'head'(가운데: 영역 이름 · 핵심 목표) · 가운데 블록에서는 영역 번호. 없으면 없음 */
  at?: number | 'head' | null;
  /** 한 변(pt, 기본 36) */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * 블록 하나의 위치 표시 — 지도와 같은 그림을 작게: 가운데 = 영역 색(가운데 블록은 core), 달성 = washL1,
 * 적은 칸 = tint, 빈 칸 = tile, 고른 칸 = 1.5 먹 테두리.
 */
export const Locator = memo(function Locator({ themes, block, at, size = LOCATOR.size, style }: LocatorProps) {
  const P = usePalette();
  const ratio = PixelRatio.get();
  const g = locatorGeometry(size, ratio);
  const ring = Math.max(1, Math.round(LOCATOR.ring * ratio)) / ratio;
  const ringSlot = at == null ? -1 : at === 'head' ? 4 : CELL_POS[at] ?? -1;
  const th = block === 'core' ? null : themes[block];
  const tiles = [];
  for (let slot = 0; slot < 9; slot++) {
    const col = slot % 3;
    const row = Math.floor(slot / 3);
    let bg: string;
    if (block === 'core') {
      const ti = slot === 4 ? -1 : slot < 4 ? slot : slot - 1;
      bg = ti < 0 ? P.core : P.dye[ti];
    } else if (slot === 4) {
      bg = P.dye[block];
    } else {
      const s = actionState(th?.actions[slot < 4 ? slot : slot - 1]);
      bg = s === 'done' ? P.washL1[block] : s === 'written' ? P.tint[block] : P.tile;
    }
    tiles.push(
      <View
        key={slot}
        style={{
          position: 'absolute', left: g.pos[col], top: g.pos[row], width: g.cells[col], height: g.cells[row], borderRadius: g.radius,
          backgroundColor: bg,
          ...(slot === ringSlot ? { borderWidth: ring, borderColor: P.ink } : null),
        }}
      />,
    );
  }
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      pointerEvents="none"
      style={[{ width: g.size, height: g.size }, style]}
    >
      {tiles}
    </View>
  );
});

/**
 * 표 위의 자리(22pt) — 블록 아홉을 3×3: 이 블록 = 영역 색, 가운데 = core, 나머지 = printRule.
 * 넘기기 줄('‹ 모험 · ▦ 1/8 · 커리어 ›')에 숫자와 함께.
 */
export const PagerMark = memo(function PagerMark({ block, size = PAGER_MARK.size, style }: {
  /** 영역 번호(0~7) 또는 'core' */
  block: number | 'core';
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const P = usePalette();
  const ratio = PixelRatio.get();
  const g = pagerGeometry(size, ratio);
  const here = block === 'core' ? 4 : CHART_POS[block];
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      pointerEvents="none"
      style={[{ width: g.size, height: g.size }, style]}
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((slot) => {
        const col = slot % 3;
        const row = Math.floor(slot / 3);
        const bg = slot === 4 ? P.core : slot === here && block !== 'core' ? P.dye[block] : P.printRule;
        return (
          <View
            key={slot}
            style={{
              position: 'absolute', left: g.pos[col], top: g.pos[row], width: g.cells[col], height: g.cells[row], borderRadius: g.radius,
              backgroundColor: bg,
            }}
          />
        );
      })}
    </View>
  );
});
