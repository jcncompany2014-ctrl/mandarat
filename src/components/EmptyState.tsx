import React from 'react';
import { View } from 'react-native';
import { Text } from './AppText';
import { Icon } from './Icon';
import { Pop } from './Reveal';
import type { M } from '../theme/usePalette';

/**
 * 빈 상태 공통 표현 — 옅은 원 안의 아이콘 + 제목 + (선택)설명을 가운데 정렬한다.
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
  return (
    <View
      accessible
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={{ alignItems: 'center', paddingVertical: compact ? 24 : 36, paddingHorizontal: 24 }}
    >
      <Pop>
        <View style={{ width: compact ? 48 : 56, height: compact ? 48 : 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 14, backgroundColor: M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
          <Icon name={icon} size={compact ? 22 : 24} color={M.faint} />
        </View>
      </Pop>
      <Text style={{ color: M.ink, fontWeight: '700', fontSize: 15, textAlign: 'center' }}>{title}</Text>
      {subtitle && (
        <Text style={{ color: M.faint, fontSize: 12.5, marginTop: 5, textAlign: 'center', lineHeight: 18 }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}
