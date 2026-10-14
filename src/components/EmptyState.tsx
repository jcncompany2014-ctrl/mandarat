import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './AppText';
import { Icon } from './Icon';
import { RowDivider, groupEdge, pressedRow } from './common';
import { readableOn } from '../theme/palette';
import type { M } from '../theme/usePalette';
import type { IconName } from '../types';

type EmptyAction = { label: string; onPress: () => void };

/** 가운데 정렬(예전 모양) — 아이콘 + 제목 + 설명. 쓰는 곳이 모두 paper로 옮기면 W4-B에서 지운다 */
type CenterProps = {
  variant?: 'center';
  M: M;
  icon: IconName;
  title: string;
  subtitle?: string;
  compact?: boolean;
  action?: EmptyAction;
};

/** 수첩의 빈 줄 — 빈 칸 네모가 있는 괘선 줄 1~3개 + (선택) 글자 버튼 한 줄 */
type PaperProps = {
  variant: 'paper';
  M: M;
  /** 빈 줄에 적힌 말 1~3줄(넘치면 앞의 셋만) */
  lines: string[];
  action?: EmptyAction;
};

/**
 * 빈 상태.
 * - variant 'paper': 아직 채우지 않은 수첩 줄처럼 — 왼쪽 정렬 괘선 줄마다 점선 네모 칸(아직 아무것도 없는 칸)과 회색 글.
 *   action은 그 아래 줄에 글자 버튼('만다라트 채우기 ›')으로. 아이콘·가운데 정렬·색 버튼 없음.
 * - 그 밖(예전 모양): 가운데 정렬 아이콘 + 제목 + 설명. 바탕 칠한 동그라미 없이.
 */
export function EmptyState(props: CenterProps | PaperProps) {
  if (props.variant === 'paper') return <PaperEmpty {...props} />;
  return <CenterEmpty {...props} />;
}

/** 점선 네모 칸의 한 변 · 칸과 글 사이 */
const BOX = 26;
const GAP = 12;

function PaperEmpty({ M, lines, action }: PaperProps) {
  const shown = lines.slice(0, 3);
  const text = BOX + GAP; // 글이 시작하는 자리 — 줄 사이 선과 버튼 글자를 여기에 맞춘다
  return (
    <View>
      {shown.length > 0 && (
        <View accessible accessibilityLabel={shown.join('. ')}>
          {shown.map((line, i) => (
            <View
              key={`${i}-${line}`}
              style={{
                ...groupEdge(M, i === 0, i === shown.length - 1 && !action),
                minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: GAP, paddingVertical: 10,
              }}
            >
              {i > 0 && <RowDivider M={M} inset={text} />}
              <View style={{ width: BOX, height: BOX, borderRadius: 7, borderWidth: 1.4, borderStyle: 'dashed', borderColor: M.faint }} />
              <Text style={{ flex: 1, fontSize: 15, lineHeight: 21, fontWeight: '600', color: M.sub }}>{line}</Text>
            </View>
          ))}
        </View>
      )}
      {action && (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={({ pressed }) => [
            {
              ...groupEdge(M, shown.length === 0, true),
              minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
              paddingLeft: shown.length > 0 ? text : 0,
            },
            pressed ? pressedRow(M) : null,
          ]}
        >
          {shown.length > 0 && <RowDivider M={M} inset={text} />}
          <Text style={{ fontSize: 15, fontWeight: '700', color: M.ink }}>{`${action.label} ›`}</Text>
        </Pressable>
      )}
    </View>
  );
}

function CenterEmpty({ M, icon, title, subtitle, compact, action }: CenterProps) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: compact ? 24 : 36, paddingHorizontal: 24 }}>
      {/* 버튼은 따로 눌러야 하므로 설명 묶음 밖에 둔다 */}
      <View accessible accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title} style={{ alignItems: 'center' }}>
        <View style={{ marginBottom: 12 }}>
          <Icon name={icon} size={compact ? 22 : 24} color={M.sub} />
        </View>
        <Text style={{ color: M.ink, fontWeight: '700', fontSize: 15, textAlign: 'center' }}>{title}</Text>
        {subtitle && (
          <Text style={{ color: M.sub, fontSize: 13, marginTop: 5, textAlign: 'center', lineHeight: 18 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {action && (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={({ pressed }) => ({
            marginTop: 16, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: 18, borderRadius: 12, backgroundColor: M.accent, opacity: pressed ? 0.85 : 1,
          })}
        >
          <Icon name="plus" size={15} color={readableOn(M.accent)} sw={2.4} />
          <Text style={{ fontSize: 14, fontWeight: '800', color: readableOn(M.accent) }}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}
