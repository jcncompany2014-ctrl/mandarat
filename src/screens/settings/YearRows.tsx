// 설정 › 기록 — 한 해: 새 표 시작하기(한 해 마무리) · 지난 표 보관함.
// 한 해 마무리와 보관함 목록은 무료다(docs/v2/plan.md §2.9) — 지난 표를 여는 것만 프로(V3-D).
import React from 'react';
import { View } from 'react-native';
import { LineRow } from '../../components/common';
import { TID } from '../../lib/testIds';
import { tap } from '../../lib/haptics';
import { useUIActions } from '../../navigation/ui';
import { useDoc } from '../../store/MandaratContext';
import { useMsg } from '../../i18n/react';
import type { M } from '../../theme/usePalette';
import { SubHead } from './rows';

export function YearRows({ M }: { M: M }) {
  const m = useMsg();
  const { openYearClose, openYear } = useUIActions();
  const { doc } = useDoc();
  const n = doc.archives?.length ?? 0;
  const shelfSub = n > 0 ? m.year.archiveCount({ n }) : m.year.shelfEmpty;
  return (
    <>
      <SubHead M={M} label={m.year.settingsHead} />
      <View testID={TID.setYearClose}>
        <LineRow
          M={M}
          first
          title={m.year.start}
          right="chevron"
          accessibilityRole="button"
          accessibilityLabel={m.year.start}
          onPress={() => { tap(); openYearClose(); }}
        />
      </View>
      <View testID={TID.setYearShelf}>
        <LineRow
          M={M}
          last
          title={m.year.shelf}
          sub={shelfSub}
          right="chevron"
          accessibilityRole="button"
          accessibilityLabel={`${m.year.shelf}, ${shelfSub}`}
          onPress={() => { tap(); openYear({ kind: 'shelf' }); }}
        />
      </View>
    </>
  );
}
