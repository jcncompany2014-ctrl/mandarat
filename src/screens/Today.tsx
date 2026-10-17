import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Animated, Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { ProgressBar } from '../components/ProgressBar';
import { useSettle } from '../lib/useSettle';
import { animateLayout } from '../lib/layoutAnim';
import { Header, IndexTabs, RowDivider, TextTabs, pressedRow, type IndexTabItem } from '../components/common';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { MoodRow } from '../components/MoodRow';
import { TodayRow, TODAY_ROW_INSET } from '../components/TodayRow';
import { WeekCaption } from '../components/WeekStrip';
import { alertInk } from '../components/KindBits';
import { mix } from '../theme/moods';
import { EASE } from '../theme/motion';
import { NUM } from '../theme/type';
import type { M } from '../theme/usePalette';
import { usePalette } from '../theme/usePalette';
import { useUIActions, useUIState } from '../navigation/ui';
import { useActions, useDoc, dateKey } from '../store/MandaratContext';
import { tap } from '../lib/haptics';
import { reducedMotion, useIncreaseContrast } from '../lib/useReducedMotion';
import { useTodayCheck } from '../lib/useTodayCheck';
import { orderedTodayItems, type TodayItem } from '../lib/routine';
import { canPickAny, firstAreaWithEmpty } from '../lib/pick';
import { weekdayIndex } from '../lib/marks';
import { checkEdge } from '../components/Check';
import { todaySummary } from '../lib/a11y';
import { MGMT_LABEL } from '../lib/copy';
import { fmtDateLong } from '../lib/text';
import { dayCloseText, effectiveArea, isOverdue, tallyShape, todayAreaTabs, todayEmptyKind } from '../lib/todayList';
import type { Mgmt, TodayExtra } from '../types';
import { sameIgnoringHandlers, sameProps } from '../lib/sameProps';
import { TID } from '../lib/testIds';
import { showGridAt } from './gridMemory';
import { MindWeek, TodayKanban, TodayStreak } from './TodayModes';

/** 보기 방식 — 저장 값은 그대로, 화면에는 MGMT_LABEL(목록 · 연속 기록 · 보드) */
const MODES: readonly Mgmt[] = ['일일 체크', '습관 스트릭', '칸반'];

// 값이 같으면 다시 그리지 않는 머리·탭·기분 줄 — 체크할 때마다 문서가 바뀌어도 그대로
const PureHeader = memo(Header);
const PureTextTabs = memo(TextTabs) as typeof TextTabs;
const PureMoodRow = memo(MoodRow);
const PureWeekCaption = memo(WeekCaption);
// 영역 색인 — 칸(items)은 값으로 비교하고, onChange는 같은 뜻의 새 함수여도 그대로(고른 영역만 바꾼다)
const PureIndexTabs = memo(IndexTabs, (a, b) => {
  const { items: ia, ...ra } = a;
  const { items: ib, ...rb } = b;
  return sameIgnoringHandlers(ra, rb) && ia.length === ib.length && ia.every((x, i) => sameProps(x, ib[i]));
});

/**
 * 오늘 — 인쇄된 기록표 한 쪽.
 * 머리(날짜 · 오늘) → 글자 탭(목록 · 연속 기록 · 보드) → 보기 → 모든 보기 아래 같은 마무리(마음가짐 · 오늘 기분 · 한 줄).
 * 보기 방식은 여기서만 고른다(설정에는 없다).
 */
export const Today = memo(function Today() {
  const M = usePalette();
  const { doc, clock } = useDoc();
  const { setSetting } = useActions();
  const tc = useTodayCheck();
  const mgmt = doc.settings.mgmt;
  const now = new Date();
  // 날이 바뀌면 다시 센다(문서가 그대로여도 오늘이 달라지면 목록이 바뀐다)
  const day = dateKey(now);
  const list = useMemo(() => orderedTodayItems(doc, new Date()), [doc, day, clock]); // eslint-disable-line react-hooks/exhaustive-deps

  // 두 손가락 두 번 탭(매직 탭) — 남은 일 중 맨 위 하나를 체크한다
  const onMagicTap = () => {
    const it = list.find((i) => !i.done);
    if (it) { tc.toggle(it); return; }
    const x = doc.todayExtra.find((e) => !e.done);
    if (x) tc.toggleExtra(x);
  };
  const onMode = useCallback((v: Mgmt) => { tap(); animateLayout(); setSetting('mgmt', v); }, [setSetting]);
  const meta = doc.dayMeta[day];

  return (
    <View onMagicTap={onMagicTap}>
      <PureHeader M={M} sub={fmtDateLong(now)} kr="오늘" />
      <View style={{ paddingHorizontal: 20, paddingBottom: 6 }}>
        <PureTextTabs M={M} options={MODES} value={mgmt} labels={MGMT_LABEL} onChange={onMode} testID={TID.todayModes} />
      </View>
      {mgmt === '습관 스트릭' ? <TodayStreak M={M} /> : mgmt === '칸반' ? <TodayKanban M={M} /> : <TodayList M={M} list={list} />}
      <DayBlock M={M} day={day} mood={meta?.mood} reflection={meta?.reflection ?? ''} />
    </View>
  );
});

// ── 목록 ──────────────────────────────────────────────────────────────────────

type Row = { key: string; done: boolean; it?: TodayItem; x?: TodayExtra };

function TodayList({ M, list }: { M: M; list: TodayItem[] }) {
  const { doc, clock } = useDoc();
  const { openAction, openPick } = useUIActions();
  const now = new Date();
  const extra = doc.todayExtra;
  const { held, hold } = useSettle();
  // '+ 고르기' 점선 네모 — 빈 체크 칸과 같은 테두리(대비 증가에서는 더 진하게)
  const edge = checkEdge(M.dark, useIncreaseContrast());

  const done = list.filter((it) => it.done).length + extra.filter((x) => x.done).length;
  const total = list.length + extra.length;
  const complete = total > 0 && done === total;
  // 아직 오늘 목록에 없는 실천이 남아 있으면 고를 수 있다
  const canPick = useMemo(() => canPickAny(doc, new Date()), [doc, clock]); // eslint-disable-line react-hooks/exhaustive-deps

  // 색인 — 오늘 할 일이 있는 영역만. 고른 영역이 비면 '전체'로
  const tabs = useMemo(() => todayAreaTabs(list, extra), [list, extra]);
  const [picked, setPicked] = useState<number | null>(null);
  const area = effectiveArea(picked, tabs);
  useEffect(() => {
    if (picked != null && area == null) setPicked(null);
  }, [picked, area]);
  // 다 한 날엔 '했어요' 묶음을 접어 마감 두 줄이 첫 화면에 그어지게 — 하나라도 풀면 다시 펼친다
  const [doneOpen, setDoneOpen] = useState(false);
  useEffect(() => { if (!complete) setDoneOpen(false); }, [complete]);

  if (total === 0) return <TodayEmpty M={M} canPick={canPick} />;

  const rows: Row[] = [
    ...list.filter((it) => area == null || it.ti === area).map((it) => ({ key: `b${it.key}`, done: it.done, it })),
    ...extra.filter((x) => area == null || x.ti === area).map((x) => ({ key: `x${x.id}`, done: x.done, x })),
  ];
  // 방금 체크한 줄은 잠깐 제자리에 — 체크 획과 먹선을 본 뒤 '했어요' 묶음으로 내려간다
  const sunk = (r: Row) => r.done && !held.has(r.key);
  const pending = rows.filter((r) => !sunk(r));
  const finished = rows.filter(sunk);
  // 마감한 날엔 '실천에서 더 고르기' 줄을 빼고(위 '고르기'로 충분하다) 마감 두 줄을 바로 잇는다
  const showPick = canPick && area == null && !complete;
  // 요일 글자는 그 아래 줄에 이번 주 칸이 있을 때만 — 남은 습관 위, 또는 펼친 '했어요' 묶음 머리 아래
  const pendingHabit = pending.some((r) => r.it?.kind === 'habit');
  const doneHabit = finished.some((r) => r.it?.kind === 'habit');
  const canFold = complete && finished.length > FOLD_MIN;
  const fold = canFold && !doneOpen;

  const onPick = () => { tap(); openPick(); };
  const tabItems: IndexTabItem[] = [
    { key: 'all', label: '전체', count: total },
    ...tabs.map((t) => ({ key: String(t.ti), label: doc.themes[t.ti]?.title.trim() || `영역 ${t.ti + 1}`, color: doc.themes[t.ti]?.color, count: t.count })),
  ];

  const renderRow = (r: Row, variant: 'list' | 'done', divider: boolean) => {
    const it = r.it;
    return (
      <ListRow
        key={r.key}
        M={M}
        rowKey={r.key}
        item={it ?? r.x!}
        variant={variant}
        divider={divider}
        overdue={!!it && variant === 'list' && !r.done && isOverdue(doc, it, now)}
        onOpen={it ? () => openAction(it.ti, it.ai) : undefined}
        hold={hold}
      />
    );
  };

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
      <Counter M={M} done={done} total={total} complete={complete} canPick={canPick} summary={todaySummary(doc, now)} onPick={onPick} />

      {tabs.length > 1 && (
        <View style={{ marginBottom: 4 }}>
          <PureIndexTabs
            M={M}
            items={tabItems}
            value={area == null ? 'all' : String(area)}
            onChange={(k) => { tap(); animateLayout(); setPicked(k === 'all' ? null : Number(k)); }}
          />
        </View>
      )}

      {/* 습관 줄의 이번 주 칸 위에 요일 글자 — 오른쪽 81pt 칸에 맞춘다 */}
      {pendingHabit && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingBottom: 5 }}>
          <PureWeekCaption M={M} todayIndex={weekdayIndex(now)} />
        </View>
      )}

      {rows.length === 0 && (
        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line, minHeight: 54, justifyContent: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: M.sub }}>이 영역은 오늘 할 일이 없어요</Text>
        </View>
      )}

      {/* 한 배열로 그려야 줄이 '했어요' 묶음 위아래로 옮겨 갈 때 다시 만들어지지 않고 미끄러진다 */}
      <View>
        {[
          ...(pending.length > 0 || showPick
            ? [<View key="pending-top" style={{ height: 1, backgroundColor: M.line }} />]
            : []),
          ...pending.map((r, i) => renderRow(r, 'list', i > 0)),
          ...(showPick
            ? [
                <Pressable
                  key="pick"
                  onPress={() => { tap(); openPick(); }}
                  accessibilityRole="button"
                  accessibilityLabel="실천에서 더 고르기"
                  style={({ pressed }) => [
                    { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
                    pressed ? pressedRow(M) : null,
                  ]}
                >
                  {pending.length > 0 && <RowDivider M={M} inset={TODAY_ROW_INSET} />}
                  <View
                    style={{
                      width: 26, height: 26, borderRadius: 7, borderWidth: edge.width > 1.6 ? 2 : 1.4, borderStyle: 'dashed', borderColor: edge.color,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon name="plus" size={13} color={M.sub} sw={2} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: M.sub }} numberOfLines={1}>실천에서 더 고르기</Text>
                </Pressable>,
              ]
            : []),
          ...(pending.length > 0 || showPick
            ? [<View key="pending-bottom" style={{ height: 1, backgroundColor: M.line }} />]
            : []),
          ...(finished.length > 0
            ? [
                <DoneHead
                  key="done-head"
                  M={M}
                  count={finished.length}
                  gapAbove={pending.length > 0 || showPick}
                  fold={canFold ? fold : undefined}
                  onToggle={() => { tap(); animateLayout(); setDoneOpen((o) => !o); }}
                />,
              ]
            : []),
          ...(!pendingHabit && doneHabit && !fold
            ? [
                <View key="done-caption" style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 6, paddingBottom: 5 }}>
                  <PureWeekCaption M={M} todayIndex={weekdayIndex(now)} />
                </View>,
              ]
            : []),
          ...(fold ? [] : finished.map((r, i) => renderRow(r, 'done', i > 0))),
        ]}
      </View>

      <DayClose M={M} complete={complete} total={total} />
    </View>
  );
}

/** 다 한 날 '했어요'가 이보다 많으면 접는다 — 마감 두 줄이 SE 첫 화면 안에 그어지도록 */
const FOLD_MIN = 3;

/**
 * '했어요 n' 묶음 머리 — 글자 뒤로 괘선 하나. fold가 있으면(다 한 날, 접을 만큼 많을 때) 눌러서 접고 펼친다.
 */
const DoneHead = memo(function DoneHead({ M, count, gapAbove, fold, onToggle }: {
  M: M; count: number; gapAbove: boolean; fold?: boolean; onToggle: () => void;
}) {
  const toggle = useRef(onToggle);
  toggle.current = onToggle;
  const head = (
    <>
      <Text style={{ fontSize: 12.5, fontWeight: '800', color: M.sub, ...NUM }}>했어요 {count}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: M.line }} />
    </>
  );
  const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginTop: gapAbove ? 22 : 0 };
  if (fold === undefined) {
    return (
      <View accessible accessibilityRole="header" accessibilityLabel={`했어요 ${count}개`} style={[row, { marginBottom: 2 }]}>
        {head}
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => toggle.current()}
      accessibilityRole="button"
      accessibilityLabel={`했어요 ${count}개`}
      accessibilityState={{ expanded: !fold }}
      hitSlop={{ top: 8, bottom: 8 }}
      style={({ pressed }) => [row, { minHeight: 44 }, pressed ? { opacity: 0.5 } : null]}
    >
      {head}
      <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub }}>{fold ? '펼치기' : '접기'}</Text>
    </Pressable>
  );
}, (a, b) => a.M === b.M && a.count === b.count && a.gapAbove === b.gapAbove && a.fold === b.fold);

/**
 * 목록의 한 줄 — 마감이 지난 줄은 여백에 붉은 세로 줄. 값이 같으면 다시 그리지 않는다
 * (함수는 누를 때만 읽으므로 부모가 새로 만들어 넘겨도 그대로 — TodayRow와 같은 규칙).
 */
const ListRow = memo(function ListRow({ M, rowKey, item, variant, divider, overdue, onOpen, hold }: {
  M: M;
  rowKey: string;
  item: TodayItem | TodayExtra;
  variant: 'list' | 'done';
  divider: boolean;
  overdue: boolean;
  onOpen?: () => void;
  hold: (key: string) => void;
}) {
  return (
    <View>
      {/* 마감 지남 — 여백에 붉은 세로 줄 하나 */}
      {overdue && (
        <View pointerEvents="none" style={{ position: 'absolute', left: -10, top: 12, bottom: 12, width: 2, backgroundColor: alertInk(M) }} />
      )}
      <TodayRow
        M={M}
        item={item}
        variant={variant}
        divider={divider}
        onOpen={onOpen}
        // 체크할 땐 잠깐 붙잡고, 풀 땐 바로 부드럽게 위로
        onCheck={(wasDone) => { if (wasDone) animateLayout(); else hold(rowKey); }}
      />
    </View>
  );
}, (a, b) => sameIgnoringHandlers(a, b) && !a.onOpen === !b.onOpen);

// ── 집계 — 큰 숫자 + 할 일 수만큼의 네모 ─────────────────────────────────────

const TALLY_BOX = 10;
const TALLY_GAP = 3;

/** summary: 화면 읽기로 읽을 오늘 요약(todaySummary) — 값이 같으면 다시 그리지 않는다(onPick은 누를 때만 쓴다) */
const Counter = memo(function Counter({ M, done, total, complete, canPick, summary, onPick }: {
  M: M; done: number; total: number; complete: boolean; canPick: boolean; summary: string; onPick: () => void;
}) {
  const pick = useRef(onPick);
  pick.current = onPick;
  const shape = tallyShape(total);
  const pendingBorder = mix(M.bg, M.ink, 0.3);
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View
          accessible
          accessibilityLabel={summary}
          style={{ flex: 1, minWidth: 0 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ fontSize: 34, lineHeight: 40, fontWeight: '800', color: M.ink, letterSpacing: -0.5, ...NUM }} maxFontSizeMultiplier={1.35}>
              {done}
            </Text>
            <Text style={{ fontSize: 17, fontWeight: '600', color: M.sub, ...NUM }} maxFontSizeMultiplier={1.35}>
              {` / ${total}`}
            </Text>
          </View>
        </View>
        {canPick && (
          <Pressable
            onPress={() => pick.current()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="고르기"
            accessibilityHint="만다라트 실천에서 오늘 할 일을 골라요"
            style={({ pressed }) => ({ minHeight: 32, justifyContent: 'center', marginBottom: 2, opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub }}>고르기</Text>
          </Pressable>
        )}
      </View>

      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ marginTop: 8 }}>
        {shape === 'boxes' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: TALLY_GAP }}>
            {Array.from({ length: total }, (_, i) => (
              <View
                key={i}
                style={i < done
                  ? { width: TALLY_BOX, height: TALLY_BOX, borderRadius: 2, backgroundColor: M.ink }
                  : { width: TALLY_BOX, height: TALLY_BOX, borderRadius: 2, borderWidth: 1, borderColor: pendingBorder }}
              />
            ))}
          </View>
        )}
        {shape === 'bar' && (
          <ProgressBar pct={(done / total) * 100} height={3} radius={1.5} color={M.ink} track={pendingBorder} />
        )}
        {complete && (
          <Text style={{ fontSize: 13, fontWeight: '600', color: M.ink, marginTop: 8 }}>오늘 다 했어요</Text>
        )}
      </View>
    </View>
  );
}, (a, b) => {
  const { onPick: _a, ...ra } = a;
  const { onPick: _b, ...rb } = b;
  return sameProps(ra, rb);
});

// ── 빈 목록 ───────────────────────────────────────────────────────────────────

function TodayEmpty({ M, canPick }: { M: M; canPick: boolean }) {
  const { doc } = useDoc();
  const { openPick, go } = useUIActions();
  const kind = todayEmptyKind(doc, canPick);
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 }}>
      {kind === 'fill' && (
        <EmptyState
          variant="paper"
          M={M}
          lines={['만다라트 칸을 채우면 여기 담겨요']}
          action={{
            label: '만다라트 채우기',
            onPress: () => {
              tap();
              const ti = firstAreaWithEmpty(doc);
              showGridAt(ti >= 0 ? ti : null);
              go('grid');
            },
          }}
        />
      )}
      {kind === 'pick' && (
        <EmptyState
          variant="paper"
          M={M}
          lines={['오늘 할 일을 아직 담지 않았어요']}
          action={{ label: '실천에서 고르기', onPress: () => { tap(); openPick(); } }}
        />
      )}
      {kind === 'allIn' && <EmptyState variant="paper" M={M} lines={['오늘 할 일을 다 담았어요']} />}
    </View>
  );
}

// ── 하루 마감 — 장부의 두 줄 ──────────────────────────────────────────────────

/** 마감 줄이 그어지는 시간 · 체크 획이 끝날 때까지 기다리는 시간(Root의 마감 촉감 650ms에 끝난다) · 지우는 시간 */
const CLOSE_MS = 420;
const CLOSE_DELAY = 230;
const RETRACT_MS = 160;
/** 다 찼는데 마감 신호(dayCloseTick)가 오지 않으면 — 지워서 다 찼거나 오늘 이미 마감한 날 — 이만큼 뒤 그냥 그려 둔다 */
const TICK_WAIT = 150;

const DayClose = memo(function DayClose({ M, complete, total }: { M: M; complete: boolean; total: number }) {
  const { dayCloseTick } = useUIState();
  const mountTick = useRef(dayCloseTick);
  const prevTick = useRef(dayCloseTick);
  const wasComplete = useRef(complete);
  const [shown, setShown] = useState(complete);
  const t = useRef(new Animated.Value(complete ? 1 : 0)).current;
  const wait = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tickChanged = dayCloseTick !== prevTick.current;
    prevTick.current = dayCloseTick;
    const became = complete && !wasComplete.current;
    wasComplete.current = complete;
    const clearWait = () => { if (wait.current) { clearTimeout(wait.current); wait.current = null; } };

    if (!complete) {
      clearWait();
      if (reducedMotion()) { t.setValue(0); setShown(false); return; }
      const a = Animated.timing(t, { toValue: 0, duration: RETRACT_MS, easing: EASE.in, useNativeDriver: true });
      a.start(({ finished }) => { if (finished) setShown(false); });
      return () => a.stop();
    }

    // 이번에 화면에 있는 동안 마감했다 — 왼쪽에서 오른쪽으로 긋는다
    if (tickChanged && dayCloseTick !== mountTick.current) {
      clearWait();
      setShown(true);
      if (reducedMotion()) { t.setValue(1); return; }
      t.setValue(0);
      const a = Animated.timing(t, { toValue: 1, duration: CLOSE_MS, delay: CLOSE_DELAY, easing: EASE.out, useNativeDriver: true });
      a.start();
      return () => a.stop();
    }

    // 막 다 찼다 — Root가 곧 마감 신호를 보낼 수 있으니 잠깐 기다렸다가, 오지 않으면 그려 둔 채로
    if (became) {
      setShown(true);
      if (reducedMotion()) { t.setValue(1); return; }
      t.setValue(0);
      clearWait();
      wait.current = setTimeout(() => { wait.current = null; t.setValue(1); }, TICK_WAIT);
    }
  }, [complete, dayCloseTick, t]);

  useEffect(() => () => { if (wait.current) clearTimeout(wait.current); }, []);

  if (!shown) return null;
  const text = dayCloseText(new Date(), total);
  return (
    <View style={{ marginTop: 14 }} accessible accessibilityLabel={text.speech}>
      <Animated.View style={{ transformOrigin: 'left', transform: [{ scaleX: t }] }}>
        <View style={{ height: 1, backgroundColor: M.ink }} />
        <View style={{ height: 1, marginTop: 2, backgroundColor: M.ink }} />
      </Animated.View>
      <Animated.View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8, opacity: t }}>
        <Text style={{ fontSize: 13, fontWeight: '500', color: M.sub }} numberOfLines={1}>{text.left}</Text>
        <Text style={{ fontSize: 17, fontWeight: '700', color: M.ink, ...NUM }}>{text.right}</Text>
      </Animated.View>
    </View>
  );
});

// ── 모든 보기 아래 — 마음가짐 · 오늘 기분 · 한 줄 ─────────────────────────────

/** 오늘 기분과 한 줄은 값으로 받는다 — 체크로 문서가 바뀌어도 이 묶음은 다시 그리지 않는다(마음가짐은 MindWeek가 따로 본다) */
const DayBlock = memo(function DayBlock({ M, day, mood, reflection }: { M: M; day: string; mood?: number; reflection: string }) {
  const { setDayMood } = useActions();
  const onMood = useCallback((i: number) => setDayMood(i, day), [setDayMood, day]);
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
      <MindWeek M={M} />
      <View style={{ marginTop: 28 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: M.ink, marginBottom: 10 }} accessibilityRole="header">오늘 기분</Text>
        <PureMoodRow M={M} value={mood} onPick={onMood} />
      </View>
      <View style={{ marginTop: 24 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: M.ink, marginBottom: 2 }} accessibilityRole="header">한 줄</Text>
        <Reflection key={day} M={M} stored={reflection} />
      </View>
    </View>
  );
});

/** 저장을 미루는 시간 — 글자마다 문서 전체를 다시 저장하지 않게 */
const IDLE_MS = 400;

/**
 * 한 줄 회고 — 괘선 한 줄(아랫줄만). 쓰는 동안은 화면 안에서만 들고 있다가
 * 400ms 쉬면 · 칸을 떠나면 · 화면을 벗어나면 · 앱이 뒤로 가면 저장한다.
 * 저장할 날은 칸을 누른 그날 — 자정을 넘겨 써도 어제의 한 줄로 남는다.
 * 쓰고 있지 않을 때만 저장된 글(백업 불러오기 등)로 다시 맞춘다.
 */
const Reflection = memo(function Reflection({ M, stored }: { M: M; stored: string }) {
  const { setDayReflection } = useActions();
  const [draft, setDraft] = useState(stored);
  const draftRef = useRef(stored);
  const dirty = useRef(false);
  const focused = useRef(false);
  const dayRef = useRef(dateKey());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = useRef(setDayReflection);
  save.current = setDayReflection;

  const commit = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (!dirty.current) return;
    dirty.current = false;
    save.current(draftRef.current, dayRef.current);
  }, []);

  useEffect(() => {
    if (focused.current || dirty.current) return;
    draftRef.current = stored;
    setDraft(stored);
  }, [stored]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s !== 'active') commit(); });
    return () => { sub.remove(); commit(); };
  }, [commit]);

  return (
    <TextInput
      value={draft}
      onFocus={() => { focused.current = true; dayRef.current = dateKey(); }}
      onBlur={() => { focused.current = false; commit(); }}
      onChangeText={(v) => {
        draftRef.current = v;
        setDraft(v);
        dirty.current = true;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(commit, IDLE_MS);
      }}
      accessibilityLabel="오늘 한 줄"
      placeholder="오늘 한 줄"
      placeholderTextColor={M.sub}
      maxLength={120}
      returnKeyType="done"
      style={{ borderBottomWidth: 1, borderColor: M.line, paddingVertical: 10, paddingHorizontal: 0, color: M.ink, fontSize: 15 }}
    />
  );
});
