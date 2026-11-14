// 한 해 › 지난 표 한 장 — 보관함에서 연 지난 표를 표 그대로(프로, 디자인 A · year.png와 같은 부품).
// 인쇄된 한 줄(2025년 지난 표 / 기간) · 색 지도(L2, 닫은 날의 모습) · '64칸 중 n칸 달성 · n일 기록'.
// 아래에 영역 여덟 줄 — 줄을 누르면 그 영역의 아홉 칸(크게 본 블록, 읽기만)을 그 자리에서 펼친다.
// 맨 아래 '이 해 돌아보기 ›'(안쪽 쪽으로) · '인쇄용 PDF ›'. 잠겼으면 줄 하나와 '프로 알아보기'만.
// 공유 이미지 · 인쇄(ChartPoster)는 O5가 맡는다 — 여기서는 화면에 그리는 것만 ColourMap · BlockGrid로.
import React, { memo, useCallback, useState } from 'react';
import { PixelRatio, Pressable, View } from 'react-native';
import { Text, a11yLangProp } from '../../components/AppText';
import { RowDivider, pressedRow } from '../../components/common';
import { Icon } from '../../components/Icon';
import { DyeMark, InLink, Section } from '../../components/kit';
import { BlockGrid, ColourMap, MAP_MAX } from '../../components/chart';
import { useWindowDimensions } from '../../lib/screen';
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
import { YearShelf, dayOf, recordDays } from './YearShelf';

const GUTTER = GEO.gutter;
const SECTION_GAP = GEO.sectionGap;
/** 펼친 영역 블록의 가장 넓은 폭(§4.4) */
const BOARD_MAX = 480;

export const YearSheet = memo(function YearSheet({ M, id, onOpen }: { M: M; id: string; onOpen: (v: YearView) => void }) {
  const { doc } = useDoc();
  const { owned } = usePro();
  const a = (doc.archives ?? []).find((x) => x.id === id);
  // 없는 지난 표(지워졌거나 다른 기기의 링크) — 보관함을 보인다
  if (!a) return <YearShelf M={M} onOpen={onOpen} />;
  if (!archiveAccess(owned).open) return <LockedSheet M={M} archive={a} />;
  return <SheetPage M={M} archive={a} onOpen={onOpen} />;
});

function SheetPage({ M, archive: a, onOpen }: { M: M; archive: ArchivedChart; onOpen: (v: YearView) => void }) {
  const m = useMsg();
  const { openPrint } = useUIActions();
  const { width: winW } = useWindowDimensions();
  const contentW = Math.max(0, winW - GUTTER * 2);
  const mapW = Math.min(contentW, MAP_MAX);
  const mapLeft = PixelRatio.roundToNearestPixel((contentW - mapW) / 2);
  const [area, setArea] = useState<number | null>(null);
  const toggle = useCallback((ti: number) => setArea((cur) => (cur === ti ? null : ti)), []);

  const label = yearLabel(a.from, a.to);
  const range = m.fmt.range({ from: dayOf(a.from), to: dayOf(a.to) });
  const done = posterDone(a);

  return (
    <View testID={TID.yearSheet} style={{ paddingBottom: 24, paddingHorizontal: GUTTER, marginTop: 18 }}>
      {/* 인쇄된 한 줄 — 어느 해의 표인지 · 기간 */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: 12 }}>
        <Text style={[ROLE.label, { color: M.print }]} accessibilityRole="header">{m.year.sheetFolio({ label })}</Text>
        <Text style={[ROLE.label, { color: M.print }]}>{range}</Text>
      </View>
      {/* 표 한 장 — 닫은 날의 모습(이름과 목표만) */}
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={m.year.sheetSpeech({ label, goal: a.centerGoal.trim(), n: done })}
        {...a11yLangProp()}
        style={{ marginTop: 12, marginLeft: mapLeft }}
      >
        <ColourMap themes={a.themes} goal={a.centerGoal} level="L2" width={mapW} />
      </View>
      <Text style={[ROLE.meta, { color: M.ink2, marginTop: 10 }]}>{m.year.shelfLine({ n: done, days: recordDays(a) })}</Text>

      <Section M={M} label={m.year.areasTitle} style={{ marginTop: SECTION_GAP }} />
      <View>
        {a.themes.map((th, ti) => (
          <AreaRow
            key={ti}
            M={M}
            m={m}
            ti={ti}
            title={th.title.trim()}
            done={th.actions.filter((x) => x.text.trim() && x.done).length}
            written={th.actions.filter((x) => x.text.trim()).length}
            open={area === ti}
            first={ti === 0}
            onToggle={toggle}
          >
            {area === ti && (
              <View style={{ paddingTop: 4, paddingBottom: 14, alignItems: 'center' }}>
                <BlockGrid themes={a.themes} goal={a.centerGoal} block={ti} width={Math.min(contentW, BOARD_MAX)} />
              </View>
            )}
          </AreaRow>
        ))}
      </View>

      <View style={{ marginTop: SECTION_GAP, gap: 26, alignItems: 'flex-start' }}>
        <InLink M={M} label={m.year.sheetReview} onPress={() => onOpen({ kind: 'review', id: a.id })} testID={TID.yearSheetReview} />
        <View testID={TID.yearPrint}>
          <InLink M={M} label={m.year.printLink} onPress={() => openPrint({ archiveId: a.id })} />
        </View>
      </View>
    </View>
  );
}

/** 영역 줄 하나 — 영역 표시 · 이름 · 'n칸 중 m칸 달성' · 꺾쇠. 누르면 아래에 그 영역의 아홉 칸을 펼치고 접는다 */
const AreaRow = memo(function AreaRow({ M, m, ti, title, done, written, open, first, onToggle, children }: {
  M: M;
  m: Messages;
  ti: number;
  title: string;
  done: number;
  written: number;
  open: boolean;
  first: boolean;
  onToggle: (ti: number) => void;
  children?: React.ReactNode;
}) {
  const name = title || m.year.areaUnnamed({ n: ti + 1 });
  const line = m.year.areaLine({ n: done, of: written });
  return (
    <View>
      {!first && <RowDivider M={M} inset={0} />}
      <Pressable
        onPress={() => { tap(); onToggle(ti); }}
        testID={TID.yearSheetArea(ti)}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${line}`}
        {...a11yLangProp()}
        accessibilityHint={open ? m.year.areaCloseHint : m.year.areaOpenHint}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [
          { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: GEO.row, paddingVertical: 8 },
          pressed ? pressedRow(M) : null,
        ]}
      >
        <DyeMark M={M} area={ti} style={{ marginRight: 0 }} />
        <Text style={[ROLE.rowTitle, { flex: 1, color: title ? M.ink : M.ink2 }]} numberOfLines={2}>{name}</Text>
        <Text style={[ROLE.rowRight, { color: M.ink2 }]}>{line}</Text>
        <Icon name="chevR" size={16} color={M.ink} style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }} />
      </Pressable>
      {children}
    </View>
  );
});

/** 잠긴 지난 표 — 보관함 줄 하나(해 · 기간 · 핵심 목표 · '프로')와 안내, '프로 알아보기'(누를 때만 연다) */
function LockedSheet({ M, archive: a }: { M: M; archive: ArchivedChart }) {
  const m = useMsg();
  const { openPro } = useUIActions();
  const label = yearLabel(a.from, a.to);
  const range = m.fmt.range({ from: dayOf(a.from), to: dayOf(a.to) });
  const goal = a.centerGoal.trim();
  return (
    <View testID={TID.yearSheet} style={{ paddingHorizontal: GUTTER, marginTop: 18 }}>
      <View
        accessible
        accessibilityLabel={[label, range, goal, m.common.proMark].filter(Boolean).join(', ')}
        {...a11yLangProp()}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: GEO.row, paddingVertical: 8 }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[ROLE.rowTitle, { color: M.ink }]}>{`${label}${m.core.dot}${range}`}</Text>
          {!!goal && <Text style={[ROLE.rowMeta, { color: M.ink2 }]} numberOfLines={2}>{goal}</Text>}
        </View>
        <Text style={[ROLE.rowRight, { color: M.print }]}>{m.common.proMark}</Text>
      </View>
      <Text style={[ROLE.note, { color: M.print, marginTop: 8, marginBottom: 14 }]}>{m.year.sheetLocked}</Text>
      <InLink M={M} label={m.year.lockedLink} onPress={() => openPro('archive')} testID={TID.yearLockedPro} />
    </View>
  );
}
