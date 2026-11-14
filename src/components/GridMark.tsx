// 예전 이름 그대로 — 화면들이 웨이브 2에서 components/chart로 옮겨 갈 때까지 같은 props로 새 그림을 그린다(build-plan §3 G).
// GridMark → Mark(heart), MiniChart → ColourMap L1.
import React, { memo } from 'react';
import { ColourMap } from './chart/ColourMap';
import { Mark } from './chart/Mark';
import type { CellShape, MandaratDoc, Theme } from '../types';

/**
 * 만다라트 마크 — 가운데 핵심 목표 둘레에 영역 색 여덟(Mark heart). 로고 자리(정보 · 오류 화면)에 쓴다.
 * color · center는 예전 이름 — 색은 토큰(dye · core)에서 온다.
 */
export function GridMark({ size = 48 }: { size?: number; /** @deprecated */ color?: string; /** @deprecated */ center?: string }) {
  return <Mark variant="heart" size={size} />;
}

const NO_THEMES: readonly Theme[] = [];

/**
 * 내 만다라트 81칸, 작게 — 색 지도 L1(components/chart/ColourMap). 홈 머리 · 한 해 액자 · 지난 표 · 64칸 축하.
 * - size: 바깥 폭(pt). 칸 크기는 그 안에 맞춘다.
 * - onPressBlock: 블록 아홉이 각각 단추 — 바깥 블록은 영역 번호, 가운데 블록은 'c'.
 * - todayKeys · doneToday: 그리지 않고 화면 읽기 말에만(지도에는 오늘 표시가 없다).
 * - animate: 처음 그릴 때 220ms 페이드(동작 줄이기면 없음). fresh는 예전 이름.
 * - doc · cellShape · square · dark · ink는 예전 이름 — 받기만 한다.
 */
export const MiniChart = memo(function MiniChart({
  doc, themes: themesProp, size = 132, onPressBlock, todayKeys, doneToday, animate, accessibilityHint,
}: {
  /** 예전 모양 — themes를 넘기면 쓰지 않는다 */
  doc?: Pick<MandaratDoc, 'themes' | 'settings'>;
  themes?: readonly Theme[];
  /** @deprecated 칸 모서리 설정은 더 쓰지 않는다 */
  cellShape?: CellShape;
  size?: number;
  /** @deprecated 팔레트는 usePalette()로 읽는다 */
  dark?: boolean;
  /** @deprecated 가운데 칸 색은 토큰 core */
  ink?: string;
  /** @deprecated 칸 모서리 설정은 더 쓰지 않는다 */
  square?: boolean;
  onPressBlock?: (b: number | 'c') => void;
  /** 오늘 할 일인 칸 'ti-ai' — 화면 읽기 말에만 */
  todayKeys?: ReadonlySet<string>;
  /** 그중 오늘 한 칸 'ti-ai' — 화면 읽기 말에만 */
  doneToday?: ReadonlySet<string>;
  /** @deprecated animate와 함께 쓰던 새 달성 칸 — 지금은 지도 전체가 한 번 페이드한다 */
  fresh?: ReadonlySet<string>;
  animate?: 'bloom' | 'fresh';
  /** 누르면 무엇을 하는지 — 화면 읽기용(onPressBlock이 있을 때) */
  accessibilityHint?: string;
}) {
  const themes = themesProp ?? doc?.themes ?? NO_THEMES;
  return (
    <ColourMap
      level="L1"
      themes={themes}
      width={size}
      todayKeys={todayKeys}
      doneToday={doneToday}
      onPressBlock={onPressBlock}
      accessibilityHint={accessibilityHint}
      fade={!!animate}
    />
  );
});
