import React from 'react';
import { View } from 'react-native';
import { Text } from './AppText';
import { Icon } from './Icon';
import { Pop } from './Reveal';
import { Pressy } from './Pressy';
import { readableOn } from '../theme/palette';
import type { M } from '../theme/usePalette';

/**
 * 빈 상태 공통 표현 — 옅은 원 안의 아이콘 + 제목 + (선택)설명을 가운데 정렬한다.
 * action을 주면 바로 다음 행동으로 이어지는 버튼을 아래에 둔다.
 */
export function EmptyState({
  M, icon, title, subtitle, compact, action,
}: {
  M: M;
  icon: Parameters<typeof Icon>[0]['name'];
  title: string;
  subtitle?: string;
  compact?: boolean;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: compact ? 24 : 36, paddingHorizontal: 24 }}>
      {/* 버튼은 따로 눌러야 하므로 설명 묶음 밖에 둔다 */}
      <View accessible accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title} style={{ alignItems: 'center' }}>
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
      {action && (
        <Pressy
          onPress={action.onPress}
          scaleTo={0.96}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 14, backgroundColor: M.accent }}
        >
          <Icon name="plus" size={15} color={readableOn(M.accent)} sw={2.4} />
          <Text style={{ fontSize: 14, fontWeight: '800', color: readableOn(M.accent) }}>{action.label}</Text>
        </Pressy>
      )}
    </View>
  );
}
