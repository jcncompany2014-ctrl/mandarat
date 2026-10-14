import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './AppText';
import { RowDivider, groupEdge, pressedRow } from './common';
import { checkBorder } from '../lib/marks';
import type { M } from '../theme/usePalette';

type EmptyAction = { label: string; onPress: () => void };

/** 수첩의 빈 줄 — 빈 칸 네모가 있는 괘선 줄 1~3개 + (선택) 글자 버튼 한 줄 */
type PaperProps = {
  /** 모양은 하나뿐 — 부르는 곳이 적어 둔 이름을 그대로 받는다 */
  variant?: 'paper';
  M: M;
  /** 빈 줄에 적힌 말 1~3줄(넘치면 앞의 셋만) */
  lines: string[];
  action?: EmptyAction;
};

/**
 * 빈 상태 — 아직 채우지 않은 수첩 줄처럼. 왼쪽 정렬 괘선 줄마다 점선 네모 칸(아직 아무것도 없는 칸)과 회색 글.
 * action은 그 아래 줄에 글자 버튼('만다라트 채우기 ›')으로. 아이콘·가운데 정렬·색 버튼 없음.
 */
export function EmptyState(props: PaperProps) {
  return <PaperEmpty {...props} />;
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
              {/* 빈 칸 네모는 보이라고 그린 표시 — 종이 위 3:1 이상(M.faint는 2.1~2.5:1) */}
              <View style={{ width: BOX, height: BOX, borderRadius: 7, borderWidth: 1.4, borderStyle: 'dashed', borderColor: checkBorder(M.dark) }} />
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
