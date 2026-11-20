// 작은 색 지도(L1)를 그림 한 장으로 — 한 해 돌아보기의 액자 넷 · 보관함 줄의 지도(디자인 A · year.png).
// ColourMap L1과 같은 자리(chart/geometry mapGeometry) · 같은 색(mapFill)을 Svg 하나에 색마다 길 하나로 그린다:
// 칸마다 View 하나(81개)를 두지 않는다 — 액자 넷이 324개, 보관함 한 쪽(24줄)이 1,944개였다.
// 글이 없고 누를 수 없는 지도만 맡는다. 이름이 든 지도(L2) · 블록을 누르는 지도는 ColourMap.
import React, { memo, useMemo } from 'react';
import { PixelRatio, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { a11yLangProp } from '../../components/AppText';
import { mapFill, mapGeometry } from '../../components/chart';
import { usePalette } from '../../theme/usePalette';
import { useMsg } from '../../i18n/react';
import { mapCells, mapKey } from '../../lib/mapCells';
import { tilePaths } from '../../lib/tilePath';
import type { Theme } from '../../types';

/**
 * 작은 색 지도 한 장 — 크기는 ColourMap L1과 같다(cell: 칸 크기, 또는 width: 바깥 폭).
 * 자리는 기기 픽셀에 맞춘 값이라 부르는 쪽은 지도를 온 픽셀에 놓는다. 화면 읽기: 그림 하나, '64칸 중 n칸 달성'.
 */
export const MapThumb = memo(function MapThumb({ themes, width, cell }: {
  /** 여덟 영역 — 그 표의 닫은 날(또는 그날까지)의 모습 */
  themes: readonly Theme[];
  /** 바깥 폭(pt) — cell 대신 줄 수 있다 */
  width?: number;
  /** 칸 크기(pt) — 바깥 = 9c + 6(c < 11이면 + 4) */
  cell?: number;
}) {
  const P = usePalette();
  const m = useMsg();
  const g = mapGeometry({ level: 'L1', width, cell, ratio: PixelRatio.get() });
  // 칸의 상태(mapKey)가 같으면 다시 세지 않는다 — L1은 글을 그리지 않으니 이름 · 목표가 바뀌어도 그림은 같다
  const key = mapKey({ themes });
  const pic = useMemo(() => {
    const cells = mapCells({ themes, centerGoal: '' });
    const paths = tilePaths(
      cells.map((c) => ({ x: g.pos[c.col], y: g.pos[c.row], w: g.cells[c.col], h: g.cells[c.row], fill: mapFill(c, P, 'L1') })),
      g.radius,
    );
    return { paths, done: cells.reduce((s, c) => s + (c.kind === 'action' && c.state === 'done' ? 1 : 0), 0) };
  }, [key, g, P]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={m.chart.markSay({ done: pic.done })}
      {...a11yLangProp()}
      style={{ width: g.size, height: g.size }}
    >
      <Svg width={g.size} height={g.size}>
        {pic.paths.map((p) => <Path key={p.fill} d={p.d} fill={p.fill} />)}
      </Svg>
    </View>
  );
});
