import React from 'react';
import { Text, View } from 'react-native';
import { Icon } from './Icon';
import { MandalaArt } from './MandalaArt';
import type { M } from '../theme/usePalette';

/**
 * 빈 상태 공통 표현. 연꽃 만다라 문양을 은은한 배경으로 깔고 그 위에
 * 아이콘 + 제목 + (선택)설명을 중앙 정렬한다. 모든 화면에서 동일한 톤을 유지한다.
 */
export function EmptyState({
  M, icon, title, subtitle, compact,
}: {
  M: M;
  icon: Parameters<typeof Icon>[0]['name'];
  title: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const ring = compact ? 76 : 104;
  return (
    <View
      accessible
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={{ alignItems: 'center', paddingVertical: compact ? 24 : 36, paddingHorizontal: 24 }}
    >
      <View style={{ width: ring, height: ring, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <View style={{ position: 'absolute' }} pointerEvents="none">
          <MandalaArt size={ring} stroke={M.gold} opacity={M.dark ? 0.18 : 0.16} />
        </View>
        <Icon name={icon} size={compact ? 22 : 26} color={M.faint} />
      </View>
      <Text style={{ color: M.sub, fontWeight: '700', fontSize: 14.5, textAlign: 'center' }}>{title}</Text>
      {subtitle && (
        <Text style={{ color: M.faint, fontSize: 12.5, marginTop: 5, textAlign: 'center', lineHeight: 18 }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}
