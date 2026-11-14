// 한 해 › 보관함 — 지난 표를 목차처럼 머리카락 선 사이 줄로(새것부터). 목록은 늘 보인다(무료). 디자인 A(year.png와 같은 부품).
// 한 줄: 작은 지도(L1, 56pt) · 해 · 기간 · 핵심 목표 · '64칸 중 n칸 달성 · n일 기록'. 누르면 지난 표 한 장(프로) — 없으면 프로 안내.
// onOpen: 이 화면 안에서 다른 쪽을 연다(지난 표 한 장 · 그 해 돌아보기) — Year가 안쪽 뒤로 가기 줄에 쌓는다.
import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, a11yLangProp } from '../../components/AppText';
import { RowDivider, pressedRow } from '../../components/common';
import { Icon } from '../../components/Icon';
import { ColourMap } from '../../components/chart';
import { GEO } from '../../theme/tokens';
import { ROLE } from '../../theme/type';
import type { M } from '../../theme/usePalette';
import { useUIActions } from '../../navigation/ui';
import { useDoc } from '../../store/MandaratContext';
import { usePro } from '../../store/ProContext';
import { archiveAccess, yearLabel } from '../../lib/archive';
import { posterDone } from '../../lib/poster';
import { TID } from '../../lib/testIds';
import { tap } from '../../lib/haptics';
import { useMsg } from '../../i18n/react';
import type { Messages } from '../../i18n';
import type { YearView } from '../../lib/contracts';
import type { ArchivedChart } from '../../types';

const GUTTER = GEO.gutter;
/** 줄 왼쪽의 작은 지도(L1) 폭 */
const MINI = 56;
/** 처음에 보이는 줄 수 — 지난 표는 200장까지 쌓이므로 '더 보기'로 이만큼씩 펼친다 */
export const SHELF_PAGE = 24;

/** 'YYYY-MM-DD' → 그날 0시 */
export function dayOf(key: string): Date {
  const [y, mo, d] = key.split('-').map(Number);
  return new Date(y, mo - 1, d);
}

/** 기록한 날 — 지난 표의 dayLog는 그 표의 기간만큼 잘려 있다 */
export function recordDays(a: Pick<ArchivedChart, 'dayLog'>): number {
  let n = 0;
  for (const k in a.dayLog) if ((a.dayLog[k]?.length ?? 0) > 0) n++;
  return n;
}

/** 보관함 순서 — 나중에 닫은 표가 위에 */
export function shelfOrder(list: readonly ArchivedChart[]): ArchivedChart[] {
  return [...list].sort((a, b) => (a.to === b.to ? b.from.localeCompare(a.from) : b.to.localeCompare(a.to)));
}

export const YearShelf = memo(function YearShelf({ M, onOpen }: { M: M; onOpen: (v: YearView) => void }) {
  const m = useMsg();
  const { doc } = useDoc();
  const { owned } = usePro();
  const { openPro } = useUIActions();
  const open = archiveAccess(owned).open;
  const list = useMemo(() => shelfOrder(doc.archives ?? []), [doc.archives]);
  const [shown, setShown] = useState(SHELF_PAGE);
  // 줄을 누르면 — 열 수 있으면 지난 표 한 장, 아니면 프로 안내(누를 때만 연다)
  const pick = useCallback((id: string) => (open ? onOpen({ kind: 'sheet', id }) : openPro('archive')), [open, onOpen, openPro]);

  if (list.length === 0) {
    return (
      <View style={{ paddingHorizontal: GUTTER, marginTop: 18 }}>
        <Text style={[ROLE.rowTitle, { color: M.ink }]}>{m.year.shelfNone}</Text>
        <Text style={[ROLE.note, { color: M.print, marginTop: 4 }]}>{m.year.shelfNoneSub}</Text>
      </View>
    );
  }

  const rows = list.slice(0, shown);
  const left = list.length - rows.length;
  return (
    <View style={{ paddingHorizontal: GUTTER, paddingBottom: 24, marginTop: 10 }}>
      {rows.map((a, i) => (
        <ShelfRow key={a.id} M={M} m={m} archive={a} locked={!open} first={i === 0} onPick={pick} />
      ))}
      {left > 0 && (
        <Pressable
          onPress={() => { tap(); setShown((n) => n + SHELF_PAGE); }}
          testID={TID.yearShelfMore}
          accessibilityRole="button"
          accessibilityLabel={m.year.shelfMore({ n: Math.min(left, SHELF_PAGE) })}
          {...a11yLangProp()}
          style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center' }, pressed ? pressedRow(M) : null]}
        >
          <RowDivider M={M} inset={0} />
          <Text style={[ROLE.quiet, { color: M.ink }]}>{m.year.shelfMore({ n: Math.min(left, SHELF_PAGE) })}</Text>
        </Pressable>
      )}
    </View>
  );
});

/** 보관함 한 줄 — 작은 지도와 세 줄. 잠겼으면 오른쪽에 '프로', 열리면 꺾쇠 */
const ShelfRow = memo(function ShelfRow({ M, m, archive: a, locked, first, onPick }: {
  M: M;
  m: Messages;
  archive: ArchivedChart;
  locked: boolean;
  first: boolean;
  onPick: (id: string) => void;
}) {
  const label = yearLabel(a.from, a.to);
  const range = m.fmt.range({ from: dayOf(a.from), to: dayOf(a.to) });
  const goal = a.centerGoal.trim();
  const line = m.year.shelfLine({ n: posterDone(a), days: recordDays(a) });
  return (
    <Pressable
      testID={TID.yearShelfRow(a.id)}
      onPress={() => { tap(); onPick(a.id); }}
      accessibilityRole="button"
      accessibilityLabel={[label, range, goal, line, locked ? m.common.proMark : ''].filter(Boolean).join(', ')}
      {...a11yLangProp()}
      accessibilityHint={locked ? m.year.shelfLockedHint : undefined}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, minHeight: MINI + 24 },
        pressed ? pressedRow(M) : null,
      ]}
    >
      {!first && <RowDivider M={M} inset={0} />}
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <ColourMap themes={a.themes} level="L1" width={MINI} defer />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[ROLE.rowTitle, { color: M.ink }]} numberOfLines={1}>
          {label}
          <Text style={[ROLE.rowMeta, { color: M.ink2 }]}>{`  ${range}`}</Text>
        </Text>
        {!!goal && <Text style={[ROLE.body, { color: M.ink }]} numberOfLines={2}>{goal}</Text>}
        <Text style={[ROLE.meta, { color: M.ink2 }]} numberOfLines={2}>{line}</Text>
      </View>
      {locked
        ? <Text style={[ROLE.rowRight, { color: M.print }]}>{m.common.proMark}</Text>
        : <Icon name="chevR" size={16} color={M.ink} />}
    </Pressable>
  );
});
