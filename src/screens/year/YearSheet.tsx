// 한 해 › 지난 표 한 장 — 보관함에서 연 지난 표를 인쇄된 한 장처럼(프로). 공유 이미지와 같은 표(ChartPoster)를 쪽 폭으로,
// 날짜는 닫은 날. 아래에 영역 여덟 줄의 장부 — 줄을 누르면 그 영역의 아홉 칸(읽기만, 닫은 날 기준)을 그 자리에서 펼친다.
// 맨 아래 '이 해 돌아보기 ›'(안쪽 쪽으로) · '인쇄용 PDF ›'. 잠겼으면 줄 하나와 '프로 알아보기'만.
import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, a11yLangProp } from '../../components/AppText';
import { RowDivider, groupEdge, pressedRow } from '../../components/common';
import { ChartPoster } from '../../components/ChartPoster';
import { ChartBoard } from '../../components/ChartBoard';
import { useWindowDimensions } from '../../lib/screen';
import { NUM, RHYTHM, TYPE } from '../../theme/type';
import type { M } from '../../theme/usePalette';
import { useUIActions } from '../../navigation/ui';
import { useDoc } from '../../store/MandaratContext';
import { usePro } from '../../store/ProContext';
import { archiveAccess, archiveAsDoc, yearLabel } from '../../lib/archive';
import { POSTER_W, posterDone } from '../../lib/poster';
import { TID } from '../../lib/testIds';
import { tap } from '../../lib/haptics';
import { useMsg } from '../../i18n/react';
import type { Messages } from '../../i18n';
import type { YearView } from '../../lib/contracts';
import type { ArchivedChart, MandaratDoc } from '../../types';
import { YearShelf, dayOf, recordDays } from './YearShelf';

const GUTTER = RHYTHM.gutter;
/** 표 그림의 가장 넓은 폭 — 아이패드에서도 한 장이 한눈에 들어오게 */
const SHEET_MAX = 720;
/** 펼친 영역 보드의 가장 넓은 폭 */
const BOARD_MAX = 420;

/** 쪽 폭에 맞춘 표 그림의 배율 — 모든 치수가 이 배율로(글자가 흐려지지 않게 transform을 쓰지 않는다) */
export function sheetScale(contentW: number): number {
  return Math.min(contentW, SHEET_MAX) / POSTER_W;
}

export const YearSheet = memo(function YearSheet({ M, id, onOpen }: { M: M; id: string; onOpen: (v: YearView) => void }) {
  const { doc } = useDoc();
  const { owned } = usePro();
  const a = (doc.archives ?? []).find((x) => x.id === id);
  // 없는 지난 표(지워졌거나 다른 기기의 링크) — 보관함을 보인다
  if (!a) return <YearShelf M={M} onOpen={onOpen} />;
  if (!archiveAccess(owned).open) return <LockedSheet M={M} archive={a} />;
  return <SheetPage M={M} doc={doc} archive={a} onOpen={onOpen} />;
});

function SheetPage({ M, doc, archive: a, onOpen }: { M: M; doc: MandaratDoc; archive: ArchivedChart; onOpen: (v: YearView) => void }) {
  const m = useMsg();
  const { openPrint } = useUIActions();
  const { width: winW } = useWindowDimensions();
  const contentW = Math.max(0, winW - GUTTER * 2);
  const scale = sheetScale(contentW);
  const closed = useMemo(() => dayOf(a.to), [a.to]);
  // 표 그림과 영역 보드가 읽는 문서 — 지난 표의 영역 · 목표에 지금의 보기 설정(칸 모서리)
  const poster = useMemo(() => ({ centerGoal: a.centerGoal, themes: a.themes, settings: doc.settings }), [a, doc.settings]);
  const view = useMemo(() => archiveAsDoc(a, doc.settings), [a, doc.settings]);
  const [area, setArea] = useState<number | null>(null);
  const toggle = useCallback((ti: number) => setArea((cur) => (cur === ti ? null : ti)), []);

  const label = yearLabel(a.from, a.to);
  const range = m.fmt.range({ from: dayOf(a.from), to: closed });
  const done = posterDone(a);

  return (
    <View testID={TID.yearSheet} style={{ paddingBottom: 24 }}>
      {/* 인쇄된 한 장 — 종이 가장자리만 가는 선으로 */}
      <View style={{ paddingHorizontal: GUTTER, alignItems: 'center' }}>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={m.year.sheetSpeech({ label, goal: a.centerGoal.trim(), n: done })}
          {...a11yLangProp()}
          style={{ borderWidth: 1, borderColor: M.line }}
        >
          <ChartPoster doc={poster} now={closed} gold={M.accent} scale={scale} />
        </View>
      </View>
      <View style={{ paddingHorizontal: GUTTER, marginTop: 12 }}>
        <Text style={[{ ...TYPE.caption, fontWeight: '600', color: M.sub }, NUM]}>{`${label}${m.core.dot}${range}`}</Text>
        <Text style={[{ ...TYPE.caption, color: M.sub, marginTop: 2 }, NUM]}>{m.year.shelfLine({ n: done, days: recordDays(a) })}</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, paddingTop: 34, paddingBottom: 12, minHeight: 44 }}>
        <Text style={{ flex: 1, ...TYPE.section, color: M.ink }} accessibilityRole="header">{m.year.areasTitle}</Text>
      </View>
      <View style={{ paddingHorizontal: GUTTER }}>
        {a.themes.map((th, ti) => (
          <AreaRow
            key={ti}
            M={M}
            m={m}
            ti={ti}
            title={th.title.trim()}
            color={th.color}
            done={th.actions.filter((x) => x.text.trim() && x.done).length}
            written={th.actions.filter((x) => x.text.trim()).length}
            open={area === ti}
            first={ti === 0}
            last={ti === a.themes.length - 1}
            onToggle={toggle}
          >
            {area === ti && (
              <View style={{ paddingTop: 4, paddingBottom: 14, alignItems: 'center' }}>
                <View style={{ width: Math.min(contentW, BOARD_MAX) }}>
                  <ChartBoard M={M} doc={view} ti={ti} asOf={closed} readOnly />
                </View>
              </View>
            )}
          </AreaRow>
        ))}
      </View>

      <View style={{ paddingHorizontal: GUTTER, marginTop: RHYTHM.sectionTop }}>
        <SheetLink M={M} text={m.year.sheetReview} onPress={() => onOpen({ kind: 'review', id: a.id })} testID={TID.yearSheetReview} />
        <View testID={TID.yearPrint}>
          <SheetLink M={M} text={m.year.printLink} onPress={() => openPrint({ archiveId: a.id })} />
        </View>
      </View>
    </View>
  );
}

/** 영역 장부 한 줄 — 색 줄 · 이름 · 'n칸 중 m칸 달성'. 누르면 아래에 그 영역의 아홉 칸을 펼치고 접는다 */
const AreaRow = memo(function AreaRow({ M, m, ti, title, color, done, written, open, first, last, onToggle, children }: {
  M: M;
  m: Messages;
  ti: number;
  title: string;
  color: string;
  done: number;
  written: number;
  open: boolean;
  first: boolean;
  last: boolean;
  onToggle: (ti: number) => void;
  children?: React.ReactNode;
}) {
  const name = title || m.year.areaUnnamed({ n: ti + 1 });
  const line = m.year.areaLine({ n: done, of: written });
  return (
    <View style={groupEdge(M, first, last)}>
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
          { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 10, paddingHorizontal: 2 },
          pressed ? pressedRow(M) : null,
        ]}
      >
        {/* 영역 색 — 표의 이름표처럼 가는 세로줄 하나 */}
        <View style={{ width: 3, height: 22, backgroundColor: color }} />
        <Text style={{ flex: 1, ...TYPE.rowTitle, color: M.ink, fontWeight: title ? '700' : '500' }} numberOfLines={2}>{name}</Text>
        <Text style={[{ fontSize: 13, fontWeight: '600', color: M.sub }, NUM]}>{line}</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: M.sub, transform: [{ rotate: open ? '90deg' : '0deg' }] }}>›</Text>
      </Pressable>
      {children}
    </View>
  );
});

/** 종이 위 글 링크 한 줄 — 돌아보기의 '인쇄용 PDF ›'와 같은 꼴 */
function SheetLink({ M, text, onPress, testID }: { M: M; text: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      onPress={() => { tap(); onPress(); }}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={text}
      {...a11yLangProp()}
      hitSlop={6}
      style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', opacity: pressed ? 0.5 : 1 })}
    >
      <Text style={{ fontSize: 14, fontWeight: '700', color: M.ink }}>{`${text} ›`}</Text>
    </Pressable>
  );
}

/** 잠긴 지난 표 — 보관함 줄 하나(해 · 기간 · 핵심 목표 · '프로')와 안내, '프로 알아보기'(누를 때만 연다) */
function LockedSheet({ M, archive: a }: { M: M; archive: ArchivedChart }) {
  const m = useMsg();
  const { openPro } = useUIActions();
  const label = yearLabel(a.from, a.to);
  const range = m.fmt.range({ from: dayOf(a.from), to: dayOf(a.to) });
  const goal = a.centerGoal.trim();
  return (
    <View testID={TID.yearSheet} style={{ paddingHorizontal: GUTTER }}>
      <View
        accessible
        accessibilityLabel={[label, range, goal, m.common.proMark].filter(Boolean).join(', ')}
        {...a11yLangProp()}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 12, paddingHorizontal: 2, borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[{ ...TYPE.rowTitle, color: M.ink }, NUM]}>{`${label}${m.core.dot}${range}`}</Text>
          {!!goal && <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, marginTop: 2 }} numberOfLines={2}>{goal}</Text>}
        </View>
        <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub }}>{m.common.proMark}</Text>
      </View>
      <Text style={{ ...TYPE.caption, color: M.sub, marginTop: 12 }}>{m.year.sheetLocked}</Text>
      <SheetLink M={M} text={m.year.lockedLink} onPress={() => openPro('archive')} testID={TID.yearLockedPro} />
    </View>
  );
}
