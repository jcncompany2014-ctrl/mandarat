import React from 'react';
import type { View } from 'react-native';
import { Icon } from '../Icon';
import { Row } from './Row';
import type { M } from '../../theme/usePalette';

type GlyphName = React.ComponentProps<typeof Icon>['name'];

/**
 * 무언가를 여는 줄(S.linkRow) — 상자 칸에 글리프 24(기본 먹, tone 'print'면 인쇄 회색), 제목 · 정보,
 * 오른쪽 값(있으면, 제목 줄 위) + 먹 꺾쇠 16. 꺾쇠는 늘 먹(회색은 누를 수 없다는 뜻).
 * glyph 대신 lead로 아무 그림(위치 표 같은 것)을 놓을 수 있다.
 */
export function LinkRow({
  M, glyph, glyphTone = 'ink', lead, title, meta, value, onPress, divider = false, pressRef, testID, accessibilityLabel, accessibilityHint,
}: {
  M: M;
  glyph?: GlyphName;
  glyphTone?: 'ink' | 'print';
  lead?: React.ReactNode;
  title: string;
  meta?: string;
  value?: string;
  onPress: () => void;
  divider?: boolean;
  pressRef?: React.Ref<View>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  return (
    <Row
      M={M}
      title={title}
      meta={meta}
      right={value}
      lead={lead ?? (glyph ? <Icon name={glyph} size={24} color={glyphTone === 'print' ? M.print : M.ink} /> : null)}
      trailing={<Icon name="chevR" size={16} color={M.ink} style={{ marginRight: -4 }} />}
      divider={divider}
      onPress={onPress}
      pressRef={pressRef}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    />
  );
}
