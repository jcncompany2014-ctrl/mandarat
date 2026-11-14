import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text, a11yLangProp } from '../components/AppText';
import { PrimaryButton, Sheet, SheetHeader, useSheetDismiss } from '../components/common';
import { CheckBox, DyeMark, FilterLine, ROW, Row, SECTION, type FilterItem } from '../components/kit';
import { EmptyState } from '../components/EmptyState';
import { GEO } from '../theme/tokens';
import { ROLE } from '../theme/type';
import { usePalette } from '../theme/usePalette';
import type { M } from '../theme/usePalette';
import { useUIActions, useUIState } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import { firstAreaWithEmpty, pickFilterStart, pickSections, pickShown, type PickFilter, type PickSection } from '../lib/pick';
import { autoLine, choosableRows, type PickListRow } from '../lib/quickAdd';
import { weekPriority } from '../lib/ritual';
import { todayProgress } from '../lib/routine';
import { showGridAt } from '../screens/gridMemory';
import { check, tap, uncheck } from '../lib/haptics';
import { useMsg } from '../i18n/react';

/** 거르기 줄 아래 · 영역 묶음 사이 */
const AFTER_FILTER = 4;
const FIRST_GAP = 8;

/**
 * 다음에 열리는 고르기 시트가 처음 보여 줄 영역 — 담기 시트의 '커리어 실천에서 고르기'가 열기 직전에 정하고,
 * 시트가 열리며 지운다(다른 곳에서 열면 늘 '전체').
 */
const startAt: { ti: number | null } = { ti: null };

export function pickAreaNext(ti: number): void {
  startAt.ti = ti;
}

/**
 * 만다라트 실천 중 오늘 할 것을 한 번에 여러 개 고른다 — 고르는 즉시 오늘 목록에 담긴다.
 * 디자인 A: 부품 시트(머리 줄 + 닫기), 영역 거르기 줄(전체 · ■건강 2 · …), 줄마다 '오늘에 담김' 칸(고름 = 먹 테두리 + 작은 먹 획),
 * 아래 주 단추(담은 수 · 다 골랐어요; 아직 하나도 없으면 조용한 닫기).
 */
export function PickToday() {
  const { pick } = useUIState();
  if (!pick) return null;
  return <PickSheet />;
}

function PickSheet() {
  const M = usePalette();
  const m = useMsg();
  const { closePick } = useUIActions();
  const { doc } = useMandarat();
  const now = new Date();
  const sections = pickSections(doc, now);
  // 오늘 화면과 같은 수(직접 추가한 할 일·이미 끝낸 일 포함)
  const total = todayProgress(doc, now).total;
  return (
    <Sheet
      M={M}
      onClose={closePick}
      maxHeightPct={0.88}
      ownClose
      pad
      header={<SheetHeader M={M} title={m.today.pickTitle} sub={m.today.pickSub} />}
      footer={sections.length > 0 ? <PickFooter M={M} total={total} /> : null}
    >
      <PickBody M={M} />
    </Sheet>
  );
}

function PickFooter({ M, total }: { M: M; total: number }) {
  const m = useMsg();
  const dismiss = useSheetDismiss();
  // 아직 하나도 담지 않았으면 '오늘 0개 · 다 골랐어요'라고 말하지 않는다 — 조용한 닫기(첫 칸을 고르면 바로 주 단추로)
  if (total === 0) return <PrimaryButton M={M} tone="quiet" label={m.common.close} onPress={() => { tap(); dismiss(); }} />;
  return (
    <PrimaryButton
      M={M}
      label={m.today.pickDone({ n: total })}
      accessibilityLabel={m.today.pickDoneLabel({ n: total })}
      onPress={() => { tap(); dismiss(); }}
    />
  );
}

function PickBody({ M }: { M: M }) {
  const m = useMsg();
  const { doc, toggleToday } = useMandarat();
  const { go, afterOverlays } = useUIActions();
  const dismiss = useSheetDismiss();
  const now = new Date();
  const sections = pickSections(doc, now);
  const priority = weekPriority(doc, now);
  const filled = doc.themes.some((th) => th.actions.some((a) => a.text.trim()));
  const emptyArea = firstAreaWithEmpty(doc);
  // 담기 시트가 정해 둔 영역은 처음 한 번만 읽고(순수하게), 열린 뒤에 지운다
  const [want] = useState(() => startAt.ti);
  useEffect(() => {
    startAt.ti = null;
  }, []);
  const [chosen, setChosen] = useState<PickFilter>(() => pickFilterStart(sections, want));
  const filter = chosen === 'all' ? 'all' : pickFilterStart(sections, Number(chosen));
  const shown = pickShown(sections, filter);
  const nameOf = (ti: number) => doc.themes[ti]?.title.trim() || m.today.areaFallback({ n: ti + 1 });

  const fill = () => {
    tap();
    dismiss();
    afterOverlays(() => {
      showGridAt(emptyArea >= 0 ? emptyArea : null);
      go('grid');
    });
  };

  if (sections.length === 0) {
    return (
      <View style={{ marginTop: FIRST_GAP }}>
        <EmptyState
          M={M}
          variant="paper"
          lines={[filled ? m.today.pickNoneLeft : m.today.pickNoneFilled]}
          action={emptyArea >= 0 ? { label: m.today.fillChart, onPress: fill } : undefined}
        />
      </View>
    );
  }

  const items: FilterItem<PickFilter>[] = [
    { key: 'all', label: m.today.all },
    ...sections.map((sec) => {
      const name = nameOf(sec.ti);
      return {
        key: `${sec.ti}` as PickFilter,
        label: name,
        area: sec.ti,
        count: sec.inToday > 0 ? sec.inToday : undefined,
        a11yLabel: m.today.pickSectionLabel({ name, n: sec.inToday }),
      };
    }),
  ];
  // 한 영역만 볼 때는 영역 머리가 거르기 줄의 되풀이라 그리지 않는다
  const heads = filter === 'all';

  return (
    <View style={{ paddingBottom: 8 }}>
      {sections.length > 1 && (
        <FilterLine M={M} items={items} value={filter} onChange={setChosen} bleed={GEO.sheet.pad} style={{ marginBottom: AFTER_FILTER }} />
      )}
      {shown.map((sec, i) => (
        <PickArea
          key={sec.ti}
          M={M}
          sec={sec}
          name={nameOf(sec.ti)}
          priority={priority}
          head={heads}
          first={i === 0}
          onToggle={(r) => {
            if (r.state === 'on') uncheck();
            else check();
            toggleToday(`${r.ti}-${r.ai}`);
          }}
        />
      ))}
    </View>
  );
}

/** 한 영역의 고를 줄 — 머리(영역 표시 + 이름 · 오늘 n), 줄들, 저절로 담긴 줄 한 줄 */
function PickArea({
  M, sec, name, priority, head, first, onToggle,
}: {
  M: M;
  sec: PickSection;
  name: string;
  priority: readonly string[];
  head: boolean;
  first: boolean;
  onToggle: (r: PickListRow) => void;
}) {
  const m = useMsg();
  const rows = choosableRows(sec, priority);
  const auto = autoLine(sec);
  return (
    <View style={{ marginTop: first ? FIRST_GAP : GEO.sectionGap }}>
      {head && (
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel={m.today.pickSectionLabel({ name, n: sec.inToday })}
          {...a11yLangProp()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: SECTION.h, marginBottom: SECTION.gap }}
        >
          <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' }}>
            <DyeMark M={M} area={sec.ti} />
            <Text style={[ROLE.section, { flexShrink: 1, color: M.printStrong }]} numberOfLines={1}>{name}</Text>
          </View>
          <Text style={[ROLE.meta, { color: M.ink2 }]} numberOfLines={1}>{m.today.pickSectionCount({ n: sec.inToday })}</Text>
        </View>
      )}
      {rows.map((r, i) => (
        <PickRowView key={r.ai} M={M} r={r} divider={i > 0} onToggle={() => onToggle(r)} />
      ))}
      {!!auto && (
        <Text
          style={[ROLE.note, { marginTop: rows.length ? 4 : 0, paddingLeft: rows.length ? ROW.inset : 0, color: M.print }]}
          numberOfLines={1}
          accessibilityLabel={m.today.autoLineLabel({ line: auto })}
        >
          {auto}
        </Text>
      )}
    </View>
  );
}

/**
 * 고를 줄 하나(A.row) — 칸은 '오늘에 담김'(고름: 먹 테두리 + 작은 먹 획)과 빈 칸 둘뿐. 했어요(영역 칠 + 펜 획)와 헷갈리지 않게.
 * 정한 것 한 줄(주 3회 · 6/12권 · 마감 D-3)은 정보 줄, 이번 주 중점은 오른쪽에 인쇄된 '중점'. 줄 어디를 눌러도 담고 뺀다.
 */
function PickRowView({ M, r, divider, onToggle }: { M: M; r: PickListRow; divider: boolean; onToggle: () => void }) {
  const m = useMsg();
  const on = r.state === 'on';
  // 유형 한 줄은 소리 말(r.say) — '6/12권'·'마감 D-3'을 날짜·글자로 읽지 않게
  const label = [r.text, r.focus ? m.today.weekFocus : '', r.say].filter(Boolean).join(m.today.listSep);
  return (
    <Row
      M={M}
      title={r.text}
      titleLines={2}
      meta={r.hint || undefined}
      lead={<CheckBox M={M} state={on ? 'chosen' : 'open'} />}
      right={r.focus ? m.today.weekFocusMark : undefined}
      rightTone="print"
      divider={divider}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      aria-checked={on}
      accessibilityLabel={label}
    />
  );
}
