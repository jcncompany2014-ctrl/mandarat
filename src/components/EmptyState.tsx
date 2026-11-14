import React from 'react';
import { Pressable, View } from 'react-native';
import { Text, a11yLangProp } from './AppText';
import { Icon } from './Icon';
import { RowDivider, pressedRow } from './common';
import { GEO } from '../theme/tokens';
import { ROLE } from '../theme/type';
import type { M } from '../theme/usePalette';

type EmptyAction = { label: string; onPress: () => void };

/** 빈 줄 1~3개 + (선택) 누르는 글 한 줄 */
type PaperProps = {
  /** 모양은 하나뿐 — 부르는 곳이 적어 둔 이름을 그대로 받는다 */
  variant?: 'paper';
  M: M;
  /** 빈 줄에 적힌 말 1~3줄(넘치면 앞의 셋만) */
  lines: string[];
  action?: EmptyAction;
};

/**
 * 빈 상태 — 아직 채우지 않은 목록 줄처럼(A.row 뼈대). 줄마다 점선 빈 칸(아직 아무것도 없는 칸)과 인쇄 색 글.
 * action은 그 아래 줄에 누르는 글(먹 + 꺾쇠). 아이콘 그림 · 가운데 정렬 · 색 단추 없음.
 */
export function EmptyState(props: PaperProps) {
  return <PaperEmpty {...props} />;
}

/** 빈 칸 한 변(체크 칸과 같은 24) · 칸과 글 사이(줄과 같은 14) */
const BOX = 24;
const GAP = 14;

function PaperEmpty({ M, lines, action }: PaperProps) {
  const shown = lines.slice(0, 3);
  const text = BOX + GAP; // 글이 시작하는 자리(38) — 줄 사이 선과 누르는 글을 여기에 맞춘다
  return (
    <View>
      {shown.length > 0 && (
        <View accessible accessibilityLabel={shown.join('. ')} {...a11yLangProp()}>
          {shown.map((line, i) => (
            <View
              key={`${i}-${line}`}
              style={{ minHeight: GEO.row, flexDirection: 'row', alignItems: 'center', gap: GAP, paddingVertical: 8 }}
            >
              {i > 0 && <RowDivider M={M} inset={text} />}
              {/* 빈 칸 — 빈 체크 칸과 같은 가장자리(printEdge: 종이 위 3:1 이상, 대비 증가에서는 팔레트가 더 진하게)를 점선으로 */}
              <View style={{ width: BOX, height: BOX, borderRadius: GEO.rCheck, borderWidth: 1.5, borderStyle: 'dashed', borderColor: M.printEdge }} />
              <Text style={{ ...ROLE.rowTitle, flex: 1, color: M.print }}>{line}</Text>
            </View>
          ))}
        </View>
      )}
      {action && (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          {...a11yLangProp()}
          style={({ pressed }) => [
            {
              minHeight: GEO.row, flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 8,
              paddingLeft: shown.length > 0 ? text : 0,
            },
            pressed ? pressedRow(M) : null,
          ]}
        >
          {shown.length > 0 && <RowDivider M={M} inset={text} />}
          <Text style={{ ...ROLE.link, color: M.ink }}>{action.label}</Text>
          <Icon name="chevR" size={16} color={M.ink} />
        </Pressable>
      )}
    </View>
  );
}
