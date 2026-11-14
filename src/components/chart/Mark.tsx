// 마크(L0) — 표에서 늘 그대로인 부분: 가운데 핵심 목표(core)와 둘레 여덟 영역 색(build-plan §3 G · 목업 A.mark heart · icon-mark.js AI.app).
// heart: 16~40pt(온보딩 · 설정 정보 · 오류 화면 · 공유 이미지 발). app: 앱 아이콘 그림 — 종이 바탕에 여백을 두고 가운데에(스플래시).
// 수는 geometry(MARK_HEART · MARK_APP · markTiles) — 아이콘 PNG를 그리는 도구(N2)도 같은 수를 쓴다.
import React, { memo } from 'react';
import { PixelRatio, View, type StyleProp, type ViewStyle } from 'react-native';
import { usePalette } from '../../theme/usePalette';
import type { Tokens } from '../../theme/tokens';
import { markTiles, type MarkVariant } from './geometry';

export { MARK_APP, MARK_HEART, markTiles, type MarkTile, type MarkVariant } from './geometry';

export interface MarkProps {
  /** 'heart'(기본) 아홉 칸만 · 'app' 종이 바탕 + 여백(앱 아이콘 그림) */
  variant?: MarkVariant;
  /** 한 변(pt) */
  size: number;
  /** 색 — 없으면 지금 팔레트. 스플래시(시스템 모드) · 공유 이미지(늘 LIGHT)처럼 팔레트 밖에서 그릴 때 */
  tokens?: Pick<Tokens, 'paper' | 'core' | 'dye'>;
  style?: StyleProp<ViewStyle>;
}

/** 마크 — 그림일 뿐이라 화면 읽기에서 숨긴다(이름은 옆 글이 말한다) */
export const Mark = memo(function Mark({ variant = 'heart', size, tokens, style }: MarkProps) {
  const P = usePalette();
  const T = tokens ?? P;
  const g = markTiles(variant, size, PixelRatio.get());
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      pointerEvents="none"
      style={[{ width: g.size, height: g.size, backgroundColor: g.ground ? T.paper : undefined }, style]}
    >
      {g.tiles.map((t, i) => (
        <View
          key={i}
          style={{
            position: 'absolute', left: t.x, top: t.y, width: t.w, height: t.h, borderRadius: t.radius,
            backgroundColor: t.ti < 0 ? T.core : T.dye[t.ti],
          }}
        />
      ))}
    </View>
  );
});
