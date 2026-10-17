import React, { useMemo, useRef } from 'react';
import { Platform, View, useWindowDimensions as useRNWindowDimensions } from 'react-native';
import { PageSize, useLayout } from '../lib/screen';

/** 웹과 아이패드는 처음부터 단으로 감싼다 */
const ALWAYS_WRAP = Platform.OS === 'web' || (Platform.OS === 'ios' && (Platform as { isPad?: boolean }).isPad === true);

/**
 * 종이 한 단 — 넓은 창에서 앱을 한 단 폭(웹 480 · 아이패드 최대 640)으로 가운데에 세운다.
 * 바깥은 bg로 칠하고, 창이 단보다 넓을 때만 좌우에 가는 괘선(edge)을 긋는다.
 * 단 안에서는 useWindowDimensions()(lib/screen)가 단의 폭을 돌려준다(PageSize).
 * 폰(아이폰·좁은 안드로이드)에서는 아무것도 감싸지 않는다(구조가 그대로).
 * 아이패드는 처음부터 늘 감싼다 — 분할 화면을 1/3 ↔ 1/2로 옮겨 폰 ↔ 한 단을 오가도 트리가 같아
 * 화면이 다시 마운트되지 않는다(폰 폭에서는 단 폭 = 창 폭). 다른 기기도 한 번 넓어져 감싼 뒤에는 그대로 둔다.
 * spread(V5-A)는 아직 한 단으로 그린다.
 */
export function PaperColumn({ bg, edge, children }: { bg: string; edge?: string; children: React.ReactNode }) {
  const { width } = useRNWindowDimensions();
  const layout = useLayout();
  const page = useMemo(() => ({ width: layout.width }), [layout.width]);
  const wrapped = useRef(ALWAYS_WRAP);
  if (layout.kind !== 'phone') wrapped.current = true;
  if (!wrapped.current) return <>{children}</>;
  const wide = width > layout.width;
  return (
    <PageSize.Provider value={page}>
      <View style={{ flex: 1, backgroundColor: bg }}>
        <View
          style={[
            { flex: 1, width: '100%', maxWidth: layout.width, alignSelf: 'center' },
            wide && edge ? { borderLeftWidth: 1, borderRightWidth: 1, borderColor: edge } : null,
          ]}
        >
          {children}
        </View>
      </View>
    </PageSize.Provider>
  );
}

/** 예전 이름 — 이미 쓰는 곳이 그대로 돌게 남겨 둔다 */
export const WebColumn = PaperColumn;
