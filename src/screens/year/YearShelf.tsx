// 한 해 › 보관함 — 지난 표 목록. V4-B가 채운다(그때까지는 괘선 한 줄).
// onOpen: 이 화면 안에서 다른 쪽을 연다(지난 표 한 장 · 그 해 돌아보기) — Year가 안쪽 뒤로 가기 줄에 쌓는다.
import React, { memo } from 'react';
import { View } from 'react-native';
import { Text } from '../../components/AppText';
import { RHYTHM, TYPE } from '../../theme/type';
import type { M } from '../../theme/usePalette';
import type { YearView } from '../../lib/contracts';
import { useMsg } from '../../i18n/react';

export const YearShelf = memo(function YearShelf({ M }: { M: M; onOpen: (v: YearView) => void }) {
  const m = useMsg();
  return <RuledLine M={M} text={m.year.loading} />;
});

/** 괘선 사이 한 줄 — 아직 채우지 않은 쪽 */
export function RuledLine({ M, text }: { M: M; text: string }) {
  return (
    <View style={{ paddingHorizontal: RHYTHM.gutter }}>
      <View style={{ minHeight: 48, justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line, paddingHorizontal: 2 }}>
        <Text style={{ ...TYPE.caption, color: M.sub }}>{text}</Text>
      </View>
    </View>
  );
}
