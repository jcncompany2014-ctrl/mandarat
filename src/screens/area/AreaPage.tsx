// 영역 화면 하나(build-plan §1 block.png · §4.8 '영역 화면과 81칸의 크게 보기는 한 AreaPage') —
// 머리(‹ 돌아갈 곳 · 영역 이름 · 4/8 · ···) · 크게 본 블록(실천 여덟 칸의 글) · 넘기기 줄(‹ 이전 · 표 위치 1/8 · 다음 ›)
// · 이번 주 습관 표 · 그 밖의 실천(한 번 · 쌓기 · 마음가짐) 줄.
// 만다라트 탭의 크게 보기(GridScreen)와 영역 화면(Detail)이 함께 쓴다. 펼침에서는 왼쪽 쪽이 블록(part 'block'),
// 오른쪽 쪽이 나머지(part 'rest')를 맡는다 — 같은 블록이 두 번 보이지 않게.
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { PixelRatio, Pressable, View, type AccessibilityActionEvent } from 'react-native';
import { Text, a11yLangProp } from '../../components/AppText';
import { Header, Sheet, SheetHeader, useSheetDismiss } from '../../components/common';
import { Icon } from '../../components/Icon';
import { CheckBox, LinkRow, Row, Section } from '../../components/kit';
import { BlockGrid, Locator, PagerMark, type BlockCellInfo } from '../../components/chart';
import { HabitWeek } from './HabitWeek';
import { ROLE } from '../../theme/type';
import { GEO } from '../../theme/tokens';
import { CELL_POS } from '../../theme/chart';
import { usePalette, type M as Palette } from '../../theme/usePalette';
import { useWindowDimensions } from '../../lib/screen';
import { useUIActions, useUIState, type EditorTarget } from '../../navigation/ui';
import { useActions, useDoc, themeProgress } from '../../store/MandaratContext';
import { check as checkHaptic, tap, uncheck as uncheckHaptic } from '../../lib/haptics';
import { kindLine } from '../../lib/kinds';
import { doneOn, kindOf, routineWeekCount, todayItems, weekDates } from '../../lib/routine';
import { areaTitle, neighborArea, rowLabelFor, rowStatus } from '../../lib/areaPage';
import { areaWeek } from '../../lib/areaWeek';
import { TID } from '../../lib/testIds';
import { useMsg } from '../../i18n/react';
import type { Action, MandaratDoc } from '../../types';

/** 자리(목업 block.html) — 블록은 머리 아래 18, 폭은 본문(아이패드 480까지). 넘기기 줄 44(위 6), 구역 사이 20 */
export const AREA_PAGE = { blockTop: 18, blockMax: 480, pagerTop: 6, pagerH: 44, pagerGap: 8, sectionTop: 20 } as const;

/** 펼침에서 블록 쪽이 쓰는 높이(머리 72 · 위 18 · 넘기기 줄 6 + 44 · 아래 8) — 블록이 쪽 높이에 들어가게 */
export const AREA_BLOCK_CHROME = GEO.header + AREA_PAGE.blockTop + AREA_PAGE.pagerTop + AREA_PAGE.pagerH + 8;

/** 'all' 휴대폰 · 영역 화면 전부 · 'block' 펼침 왼쪽(머리 · 블록 · 넘기기) · 'rest' 펼침 오른쪽(머리 · 습관 · 그 밖의 실천) */
export type AreaPart = 'all' | 'block' | 'rest';

export interface AreaPageProps {
  ti: number;
  part?: AreaPart;
  /** 뒤로 가기 — 없으면(펼침 오른쪽) 머리 위 줄에 '영역 1 / 8' */
  onBack?: () => void;
  /** 뒤로 가기 옆 이름 — 크게 보기는 '만다라트', 영역 화면은 비워 두면 온 곳(탭)의 이름 */
  back?: string;
  backTestID?: string;
  /** 이웃 영역으로 — 없으면 넘기기 줄의 앞뒤 글이 없다 */
  onStep?: (d: 1 | -1) => void;
  /** 처음 그릴 때 화면 읽기 초점을 제목으로(밀려 들어오는 영역 화면) */
  focusTitle?: boolean;
  /** 블록의 가운데 칸(영역 이름) — 크게 볼 때 화면 읽기 초점을 옮길 자리 */
  headRef?: React.Ref<View>;
  /** 블록의 가장 큰 폭 — 펼침에서 쪽 높이에 맞출 때 */
  maxBlock?: number;
  /** 블록의 testID — 만다라트 탭의 크게 보기는 TID.gridTable(지도 · 크게 보기 어느 쪽이든 탭의 표) */
  blockTestID?: string;
}

const tabular = { fontVariant: ['tabular-nums' as const] };

/** 편집 창이 이 블록의 칸을 고치는 중이면 그 자리(0~8) — 시트 뒤 블록의 그 칸에 먹 테두리(목업 editor.png) */
export function editorSlot(editor: EditorTarget | null, ti: number): number | null {
  if (!editor || editor.kind === 'center' || editor.ti !== ti) return null;
  return editor.kind === 'action' ? CELL_POS[editor.ai] ?? null : 4;
}

/** 블록 안 자리 순서(CELL_POS)로 — 습관이 아닌 글 있는 칸(한 번 · 쌓기 · 마음가짐) */
function otherCells(doc: Pick<MandaratDoc, 'themes'>, ti: number): number[] {
  const th = doc.themes[ti];
  if (!th) return [];
  return th.actions
    .map((a, ai) => ({ a, ai }))
    .filter(({ a }) => !!a?.text.trim() && kindOf(a) !== 'habit')
    .sort((x, y) => (CELL_POS[x.ai] ?? x.ai) - (CELL_POS[y.ai] ?? y.ai))
    .map(({ ai }) => ai);
}

export const AreaPage = memo(function AreaPage({
  ti, part = 'all', onBack, back, backTestID, onStep, focusTitle, headRef, maxBlock, blockTestID,
}: AreaPageProps) {
  const M = usePalette();
  const m = useMsg();
  const { doc, clock } = useDoc();
  const { toggleDone, toggleHabitOn } = useActions();
  const { openAction, openEditor } = useUIActions();
  const { editor } = useUIState();
  const { width: winW } = useWindowDimensions();
  const [more, setMore] = useState(false);
  const th = doc.themes[ti];
  const p = themeProgress(th);
  const title = areaTitle(doc, ti);
  const showBlock = part !== 'rest';
  const showRest = part !== 'block';

  // 오늘 할 일과 그중 오늘 한 것 — 블록의 오늘 점 · 화면 읽기 '오늘 했어요'
  const items = useMemo(() => todayItems(doc, new Date()), [doc, clock]); // eslint-disable-line react-hooks/exhaustive-deps
  const todayKeys = useMemo(() => new Set(items.map((it) => it.key)), [items]);
  const doneToday = useMemo(() => new Set(items.filter((it) => it.done).map((it) => it.key)), [items]);
  // 이번 주 습관 표 — 문서 · 날짜가 그대로면 다시 세지 않는다
  const week = useMemo(() => areaWeek(doc, ti, new Date()), [doc, ti, clock]); // eslint-disable-line react-hooks/exhaustive-deps
  const others = useMemo(() => otherCells(doc, ti), [doc, ti]);

  // 누르기는 고정된 함수로 — 최신 문서는 ref로(블록 · 줄이 체크마다 다시 그려지지 않게)
  const docRef = useRef(doc);
  docRef.current = doc;
  const onCell = useCallback((ai: number) => {
    tap();
    if (docRef.current.themes[ti]?.actions[ai]?.text.trim()) openAction(ti, ai);
    else openEditor({ kind: 'action', ti, ai });
  }, [ti, openAction, openEditor]);
  const onCellLong = useCallback((ai: number) => openEditor({ kind: 'action', ti, ai }), [ti, openEditor]);
  const onHead = useCallback(() => { tap(); openEditor({ kind: 'theme', ti }); }, [ti, openEditor]);
  const onHabit = useCallback((ai: number, date: string) => {
    if (doneOn(docRef.current.dayLog, `${ti}-${ai}`, date)) uncheckHaptic();
    else checkHaptic();
    toggleHabitOn(ti, ai, date);
  }, [ti, toggleHabitOn]);
  const onRowToggle = useCallback((ai: number) => {
    const a = docRef.current.themes[ti]?.actions[ai];
    if (!a) return;
    if (a.done) uncheckHaptic();
    else checkHaptic();
    toggleDone(ti, ai);
  }, [ti, toggleDone]);

  // 칸 아래 한 줄 — 달성하지 않은 습관의 '이번 주 0/3'(목업 block.png)
  const extra = useCallback((c: BlockCellInfo) => {
    if (c.kind !== 'action' || c.state !== 'written') return null;
    const a = docRef.current.themes[c.ti]?.actions[c.ai];
    if (!a || kindOf(a) !== 'habit') return null;
    const w = routineWeekCount(docRef.current, c.ti, c.ai, new Date());
    return m.chart.weekCount({ done: w.done, total: w.planned });
  }, [doc, clock, m]); // eslint-disable-line react-hooks/exhaustive-deps
  // 칸의 유형 한 줄을 소리로(달성한 칸 · 빈 칸은 없음)
  const speech = useCallback((c: BlockCellInfo) => (
    c.kind === 'action' && c.state === 'written' ? kindLine(docRef.current, c.ti, c.ai, new Date())?.speech ?? null : null
  ), [doc, clock]); // eslint-disable-line react-hooks/exhaustive-deps
  const cellTestID = useCallback((c: BlockCellInfo) => (c.kind === 'action' ? TID.gridCell(c.ti, c.ai) : undefined), []);

  const measure = Math.max(0, winW - GEO.gutter * 2);
  const blockW = Math.floor(Math.min(measure, AREA_PAGE.blockMax, maxBlock ?? Infinity));
  const blockLeft = PixelRatio.roundToNearestPixel(Math.max(0, (measure - blockW) / 2));
  const week7 = weekDates(new Date());

  return (
    <View>
      <Header
        M={M}
        back={back}
        onBack={onBack}
        backTestID={backTestID}
        eyebrow={onBack ? undefined : m.chart.areaOf({ n: ti + 1 })}
        title={title}
        written={!!th.title.trim()}
        figure={`${p.done}/8`}
        action={{ glyph: 'dots', onPress: () => { tap(); setMore(true); }, label: m.chart.areaMore }}
        focusTitle={focusTitle}
      />
      <View style={{ paddingHorizontal: GEO.gutter }}>
        {showBlock && (
          <>
            <BlockGrid
              themes={doc.themes}
              block={ti}
              width={blockW}
              todayKeys={todayKeys}
              doneToday={doneToday}
              focus={editorSlot(editor, ti)}
              extra={extra}
              speech={speech}
              onCell={onCell}
              onCellLong={onCellLong}
              onHead={onHead}
              onHeadLong={onHead}
              headRef={headRef}
              testID={blockTestID}
              cellTestID={cellTestID}
              style={{ marginTop: AREA_PAGE.blockTop, marginLeft: blockLeft }}
            />
            <Pager M={M} doc={doc} ti={ti} onStep={onStep} />
          </>
        )}
        {showRest && p.filled === 0 && (
          <Text style={[ROLE.note, { color: M.print, marginTop: showBlock ? AREA_PAGE.sectionTop : AREA_PAGE.blockTop }]}>{m.chart.emptyHint}</Text>
        )}
        {showRest && week.rows.length > 0 && (
          <View style={{ marginTop: showBlock ? AREA_PAGE.sectionTop : AREA_PAGE.blockTop }}>
            <Section M={M} label={m.chart.habitWeek} note={m.fmt.range({ from: week7[0], to: week7[6] })} />
            <HabitWeek M={M} ti={ti} week={week} onToggle={onHabit} />
          </View>
        )}
        {showRest && others.length > 0 && (
          <View style={{ marginTop: week.rows.length > 0 ? GEO.sectionGap : showBlock ? AREA_PAGE.sectionTop : AREA_PAGE.blockTop }}>
            <Section M={M} label={m.chart.otherActions} />
            {others.map((ai, n) => {
              const a = th.actions[ai];
              const line = kindLine(doc, ti, ai, new Date());
              return (
                <ActionRow
                  key={ai}
                  M={M}
                  ti={ti}
                  ai={ai}
                  a={a}
                  divider={n > 0}
                  status={rowStatus(doc, ti, ai, new Date())}
                  label={rowLabelFor(a, ai, line)}
                  onOpen={onCell}
                  onToggle={onRowToggle}
                />
              );
            })}
          </View>
        )}
      </View>
      {more && <AreaMore M={M} ti={ti} onClose={() => setMore(false)} />}
    </View>
  );
});

/**
 * 넘기기 줄(목업 .pager) — ‹ 이전 영역 이름 · 표 위의 자리(블록 아홉 3×3) + '1 / 8' · 다음 영역 이름 ›.
 * 앞뒤는 반씩 나눠 가운데 표시가 늘 가운데에. onStep이 없으면 가운데만.
 */
const Pager = memo(function Pager({ M, doc, ti, onStep }: {
  M: Palette;
  doc: Pick<MandaratDoc, 'themes'>;
  ti: number;
  onStep?: (d: 1 | -1) => void;
}) {
  const m = useMsg();
  const prev = areaTitle(doc, neighborArea(ti, -1));
  const next = areaTitle(doc, neighborArea(ti, 1));
  return (
    <View style={{ height: AREA_PAGE.pagerH, marginTop: AREA_PAGE.pagerTop, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
        {onStep && (
          <PagerLink M={M} label={prev} speech={m.chart.prevAreaSay({ name: prev })} dir={-1} onPress={() => onStep(-1)} />
        )}
      </View>
      <View
        accessible
        accessibilityLabel={m.chart.areaOrdinalSay({ n: ti + 1 })}
        {...a11yLangProp()}
        style={{ flexDirection: 'row', alignItems: 'center', gap: AREA_PAGE.pagerGap, paddingHorizontal: AREA_PAGE.pagerGap }}
      >
        <PagerMark block={ti} />
        <Text style={[ROLE.label, tabular, { color: M.print }]} maxFontSizeMultiplier={1.3}>{`${ti + 1} / 8`}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}>
        {onStep && (
          <PagerLink M={M} label={next} speech={m.chart.nextAreaSay({ name: next })} dir={1} onPress={() => onStep(1)} />
        )}
      </View>
    </View>
  );
});

/** 넘기기 줄의 이웃 영역 — 꺾쇠 16 + 이름(700 14, 먹), 44 높이 */
function PagerLink({ M, label, speech, dir, onPress }: {
  M: Palette; label: string; speech: string; dir: 1 | -1; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={speech}
      {...a11yLangProp()}
      style={({ pressed }) => ({
        height: AREA_PAGE.pagerH, maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 2,
        marginLeft: dir < 0 ? -6 : 0, marginRight: dir > 0 ? -4 : 0, opacity: pressed ? 0.5 : 1,
      })}
    >
      {dir < 0 && <Icon name="chevL" size={16} color={M.ink} />}
      <Text style={[ROLE.wordOn, { color: M.ink, flexShrink: 1 }]} numberOfLines={1}>{label}</Text>
      {dir > 0 && <Icon name="chevR" size={16} color={M.ink} />}
    </Pressable>
  );
}

/**
 * 그 밖의 실천 한 줄(kit Row) — 한 번은 체크 칸(칸 달성을 바꾼다), 쌓기 · 마음가짐은 빈 상자 칸(여기서 체크하지 않는다).
 * 오른쪽은 지금의 상태 한 마디(lib/areaPage rowStatus: '달성' · '7/12권' · '4점' · 'D-2'). 달성한 줄도 긋지 않는다(한 모습).
 * 줄을 누르면 실천 시트. 화면 읽기: 줄 한 덩어리 + 한 번은 '달성으로 표시' 동작.
 */
const ActionRow = memo(function ActionRow({ M, ti, ai, a, divider, status, label, onOpen, onToggle }: {
  M: Palette;
  ti: number;
  ai: number;
  a: Action;
  divider: boolean;
  status: string;
  label: string;
  onOpen: (ai: number) => void;
  onToggle: (ai: number) => void;
}) {
  const m = useMsg();
  const once = kindOf(a) === 'once';
  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'toggle') onToggle(ai);
    else if (e.nativeEvent.actionName === 'activate') onOpen(ai);
  };
  return (
    <Row
      M={M}
      title={a.text.trim()}
      right={status || undefined}
      lead={once ? <CheckBox M={M} state={a.done ? 'done' : 'open'} area={ti} onPress={() => onToggle(ai)} accessibilityLabel={label} /> : null}
      divider={divider}
      onPress={() => onOpen(ai)}
      accessibilityLabel={label}
      accessibilityHint={m.chart.rowHint}
      accessibilityActions={once ? [{ name: 'activate' }, { name: 'toggle', label: a.done ? m.chart.undoDone : m.chart.markDone }] : undefined}
      onAccessibilityAction={once ? onAction : undefined}
    />
  );
});

/** ··· — 이 영역에서 할 수 있는 일(영역 이름 고치기 · 빈 칸 채우기)을 작은 시트의 줄로 */
function AreaMore({ M, ti, onClose }: { M: Palette; ti: number; onClose: () => void }) {
  const m = useMsg();
  const { doc } = useDoc();
  return (
    <Sheet
      M={M}
      onClose={onClose}
      ownClose
      pad
      header={(
        <SheetHeader
          M={M}
          leading={<Locator themes={doc.themes} block={ti} />}
          title={areaTitle(doc, ti)}
          dye={M.dye[ti]}
          sub={m.chart.areaOf({ n: ti + 1 })}
        />
      )}
    >
      <AreaMoreRows M={M} ti={ti} />
    </Sheet>
  );
}

function AreaMoreRows({ M, ti }: { M: Palette; ti: number }) {
  const m = useMsg();
  const dismiss = useSheetDismiss();
  const { afterOverlays, openEditor } = useUIActions();
  const { doc } = useDoc();
  const empty = doc.themes[ti]?.actions.findIndex((a) => !a.text.trim()) ?? -1;
  // 시트가 다 내려간 뒤에 편집 창을 연다(한 번에 하나만)
  const choose = (fn: () => void) => {
    tap();
    afterOverlays(fn);
    dismiss(true);
  };
  return (
    <>
      <LinkRow M={M} glyph="pencil" title={m.chart.editAreaName} onPress={() => choose(() => openEditor({ kind: 'theme', ti }))} />
      {empty >= 0 && (
        <LinkRow
          M={M}
          glyph="plus"
          title={m.chart.fillAction({ n: empty + 1 })}
          divider
          onPress={() => choose(() => openEditor({ kind: 'action', ti, ai: empty, seq: true }))}
        />
      )}
    </>
  );
}
