import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, BackHandler, PanResponder, PixelRatio, Pressable, View } from 'react-native';
import { Text, a11yLangProp } from '../components/AppText';
import { Button, Header } from '../components/common';
import { Icon } from '../components/Icon';
import { DyeMark, Row, Section } from '../components/kit';
import { BlockGrid, PagerMark } from '../components/chart';
import { AREA_BLOCK_CHROME, AREA_PAGE, AreaPage } from './area/AreaPage';
import { FullGrid } from './FullGrid';
import { gridMemory, stepArea, swipeStep, type GridFocus } from './gridMemory';
import { nextStep } from '../lib/nextStep';
import { suggestActions } from '../lib/suggest';
import { GUIDE_FILL_TARGET, firstAreaWithEmpty } from '../lib/pick';
import { areaTitle } from '../lib/areaPage';
import { todayItems } from '../lib/routine';
import { tap } from '../lib/haptics';
import { announce, reducedMotion, screenReader } from '../lib/useReducedMotion';
import { noOrphan } from '../lib/text';
import { usePageScrollTop, useWindowDimensions } from '../lib/screen';
import { CELL_POS, CHART_POS } from '../theme/chart';
import { DUR, EASE } from '../theme/motion';
import { ROLE } from '../theme/type';
import { GEO } from '../theme/tokens';
import type { M } from '../theme/usePalette';
import { usePalette } from '../theme/usePalette';
import { useUIActions, useUIState, type EditorTarget } from '../navigation/ui';
import { totalDone, useActions, useDoc } from '../store/MandaratContext';
import { TID } from '../lib/testIds';
import { useMsg } from '../i18n/react';

/** 처음 화면의 자리(목업 first.html .invite) — 지도 아래 24, 줄 사이 6, 권하는 글 위 18 · 사이 8 · 높이 44, 단추 위 24 */
const INVITE = { top: 24, gap: 6, picksTop: 18, pickGap: 8, pickH: 44, pickPad: 6, pickInner: 3, ctaTop: 24, plus: 16 } as const;
/** 다음 할 일(목업 chart.html .next) — 지도 아래 26, 줄 60, 제목 17/24(fieldTextSmall), 꺾쇠 20 */
const NEXT = { top: 26, row: 60, chevron: 20 } as const;
/** 크게 본 채로 이웃 영역으로 넘길 때 새 쪽이 들어오는 거리 */
const SLIDE = 24;

/** 실천 칸 (ti, ai)의 9×9 자리 [줄, 칸] */
function cellAt(ti: number, ai: number): [number, number] {
  const b = CHART_POS[ti];
  const s = CELL_POS[ai];
  return [Math.floor(b / 3) * 3 + Math.floor(s / 3), (b % 3) * 3 + (s % 3)];
}

/** 편집 창이 고치는 칸의 9×9 자리 — 핵심 목표는 가운데, 영역 이름은 바깥 블록의 가운데, 실천은 그 칸(목업 editor.png) */
function editorCell(editor: EditorTarget | null): [number, number] | null {
  if (!editor) return null;
  if (editor.kind === 'center') return [4, 4];
  if (editor.kind === 'action') return cellAt(editor.ti, editor.ai);
  const b = CHART_POS[editor.ti];
  return b == null ? null : [Math.floor(b / 3) * 3 + 1, (b % 3) * 3 + 1];
}

/** 가운데 블록에서 편집 창이 고치는 자리(0~8) — 핵심 목표는 가운데, 영역 이름은 그 영역의 둘레 칸 */
function coreSlot(editor: EditorTarget | null): number | null {
  if (!editor || editor.kind === 'action') return null;
  return editor.kind === 'center' ? 4 : CHART_POS[editor.ti] ?? null;
}

// ── 다음 할 일 ─────────────────────────────────────────────────────────────────

/** 다음 할 일 — 지금 가장 의미 있는 한 칸을 하나만, 60pt 줄 하나로(제목 · 영역 · 꺾쇠) */
const NextStepRow = memo(function NextStepRow({ M }: { M: M }) {
  const { doc, clock } = useDoc();
  const m = useMsg();
  const { openAction, openEditor } = useUIActions();
  // 문서·날짜(clock)가 그대로면 다시 찾지 않는다
  const step = useMemo(() => nextStep(doc, new Date()), [doc, clock]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!step) return null;
  const th = doc.themes[step.ti];
  const area = areaTitle(doc, step.ti);
  const empty = step.kind === 'empty';
  const blanks = doc.themes.reduce((s, t) => s + t.actions.filter((a) => !a.text.trim()).length, 0);
  const title = empty ? m.chart.nextBlanks({ n: blanks, area }) : th.actions[step.ai].text.trim();
  return (
    <View style={{ marginTop: NEXT.top, paddingHorizontal: GEO.gutter }}>
      <Section M={M} label={m.chart.next} />
      <Row
        M={M}
        bare
        title={title}
        area={empty ? undefined : step.ti}
        areaName={empty ? undefined : area}
        titleStyle={ROLE.fieldTextSmall}
        trailing={<Icon name="chevR" size={NEXT.chevron} color={M.ink} />}
        onPress={() => {
          tap();
          if (empty) openEditor({ kind: 'action', ti: step.ti, ai: step.ai, seq: true });
          else openAction(step.ti, step.ai);
        }}
        accessibilityLabel={empty ? m.chart.nextStepSay({ title }) : m.chart.nextStepAreaSay({ title, area })}
        style={{ minHeight: NEXT.row }}
      />
    </View>
  );
});

// ── 처음 화면 ──────────────────────────────────────────────────────────────────

/** 권하는 글 낱칸 — 누르면 먹 테두리 칸에 그대로 적힌다 */
function SuggestTile({ M, text, n, onPick }: { M: M; text: string; n: number; onPick: (text: string) => void }) {
  const m = useMsg();
  return (
    <Pressable
      onPress={() => onPick(text)}
      accessibilityRole="button"
      accessibilityLabel={m.chart.suggestSay({ text, n })}
      {...a11yLangProp()}
      style={({ pressed }) => ({
        flex: 1, minWidth: 0, height: INVITE.pickH, borderRadius: GEO.rChip, backgroundColor: M.tile,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: INVITE.pickInner, paddingHorizontal: INVITE.pickPad,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name="plus" size={INVITE.plus} color={M.print} />
      <Text style={[ROLE.segment, { color: M.ink, flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {text}
      </Text>
    </Pressable>
  );
}

/**
 * 처음 화면(목업 first.png) — 쓴 칸이 8칸이 되기 전. 먹 테두리 칸이 어디인지('■ 건강 · 1번 칸부터'),
 * 묻는 말, 안내, 권하는 글 셋(누르면 그 칸에 적히고 테두리가 다음 빈 칸으로), '직접 쓰기'(그 칸의 편집 창, 차례로 쓰기).
 */
const FirstRun = memo(function FirstRun({ M, ti, ai, area, taken, onPick, onWrite }: {
  M: M;
  ti: number;
  ai: number;
  area: string;
  /** 이 영역에 이미 적은 글(줄바꿈으로 이은 것) — 권하는 글에서 뺀다 */
  taken: string;
  onPick: (text: string) => void;
  onWrite: () => void;
}) {
  const m = useMsg();
  const picks = useMemo(() => {
    const have = new Set(taken.split('\n').filter(Boolean));
    return suggestActions(area).filter((t) => !have.has(t)).slice(0, 3);
  }, [area, taken]);
  return (
    <View style={{ marginTop: INVITE.top, paddingHorizontal: GEO.gutter }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <DyeMark M={M} area={ti} />
        <Text style={[ROLE.label, { color: M.print, flexShrink: 1 }]} numberOfLines={1}>{m.chart.startFrom({ area, n: ai + 1 })}</Text>
      </View>
      <Text accessibilityRole="header" style={[ROLE.prompt, { color: M.ink, marginTop: INVITE.gap }]}>
        {noOrphan(m.chart.startPrompt({ area }))}
      </Text>
      <Text style={[ROLE.note, { color: M.print, marginTop: INVITE.gap }]}>{m.chart.startNote}</Text>
      {picks.length > 0 && (
        <View style={{ flexDirection: 'row', gap: INVITE.pickGap, marginTop: INVITE.picksTop }}>
          {picks.map((t) => <SuggestTile key={t} M={M} text={t} n={ai + 1} onPick={onPick} />)}
        </View>
      )}
      <Button M={M} label={m.chart.startWrite} onPress={onWrite} style={{ marginTop: INVITE.ctaTop }} />
    </View>
  );
});

// ── 가운데 블록 크게 ───────────────────────────────────────────────────────────

/**
 * 가운데 블록 크게 — 핵심 목표(누르면 고치기)와 둘레 여덟 영역 이름(누르면 그 영역을 크게).
 * 머리: ‹ 만다라트 · 핵심 목표 · 24/64 · 고치기 글리프.
 */
function CoreZoom({ M, onBack, onArea, headRef, maxBlock }: {
  M: M;
  onBack: () => void;
  onArea: (ti: number) => void;
  headRef: React.Ref<View>;
  maxBlock?: number;
}) {
  const m = useMsg();
  const { doc, clock } = useDoc();
  const { openEditor } = useUIActions();
  const { editor } = useUIState();
  const { width: winW } = useWindowDimensions();
  const goal = doc.centerGoal.trim();
  const todayKeys = useMemo(() => new Set(todayItems(doc, new Date()).map((it) => it.key)), [doc, clock]); // eslint-disable-line react-hooks/exhaustive-deps
  const editGoal = useCallback(() => { tap(); openEditor({ kind: 'center' }); }, [openEditor]);
  const measure = Math.max(0, winW - GEO.gutter * 2);
  const blockW = Math.floor(Math.min(measure, AREA_PAGE.blockMax, maxBlock ?? Infinity));
  const left = PixelRatio.roundToNearestPixel(Math.max(0, (measure - blockW) / 2));
  return (
    <View>
      <Header
        M={M}
        back={m.chart.tabTitle}
        onBack={onBack}
        title={goal || m.chart.goalPrompt}
        written={!!goal}
        figure={`${totalDone(doc)}/64`}
        action={{ glyph: 'pencil', onPress: editGoal, label: m.chart.editGoal }}
      />
      <View style={{ paddingHorizontal: GEO.gutter }}>
        <BlockGrid
          themes={doc.themes}
          goal={doc.centerGoal}
          block="core"
          width={blockW}
          todayKeys={todayKeys}
          focus={coreSlot(editor)}
          onRing={onArea}
          onHead={editGoal}
          onHeadLong={editGoal}
          headRef={headRef}
          testID={TID.gridTable}
          style={{ marginTop: AREA_PAGE.blockTop, marginLeft: left }}
        />
        <View
          accessible
          accessibilityLabel={m.chart.centerBlock}
          {...a11yLangProp()}
          style={{ height: AREA_PAGE.pagerH, marginTop: AREA_PAGE.pagerTop, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: AREA_PAGE.pagerGap }}
        >
          <PagerMark block="core" />
          <Text style={[ROLE.label, { color: M.print }]} numberOfLines={1}>{m.chart.centerBlock}</Text>
        </View>
      </View>
    </View>
  );
}

// ── 화면 ──────────────────────────────────────────────────────────────────────

/**
 * 만다라트 탭 — 색 지도 한 장(영역 이름과 핵심 목표만)과 다음 할 일. 쓴 칸이 8칸이 되기 전에는 처음 화면.
 * 블록을 누르면 그 영역을 크게: 같은 탭 안에서 영역 화면(AreaPage — 머리 · 블록 · 넘기기 · 이번 주 습관)으로 바뀐다.
 * 크게 본 블록은 gridMemory.focus에 남아 탭을 오가도 그대로. 옆으로 밀거나 넘기기 줄로 이웃 영역, ‹ 만다라트로 지도.
 * availH: 펼침(V5-A)에서 이 쪽이 스크롤 없이 보여 줄 수 있는 높이 — 지도 · 블록이 그 안에 들어가게 줄인다. 폰 · 한 단은 없다.
 * onFocusArea: 크게 보는 영역 블록 — 펼침의 오른쪽 쪽이 그 영역의 나머지(습관 · 실천)를 연다.
 */
export function GridScreen({ availH, onFocusArea }: { availH?: number; onFocusArea?: (ti: number | null) => void } = {}) {
  const M = usePalette();
  const m = useMsg();
  const { doc, clock } = useDoc();
  const { setActionText } = useActions();
  const { openEditor, openShare } = useUIActions();
  // 편집 창이 열려 있으면 그 칸에 먹 테두리(시트 뒤 지도) — 값이 같으면 같은 배열
  const { editor } = useUIState();
  const editKey = editor ? JSON.stringify(editor) : '';
  const editCell = useMemo(() => editorCell(editor), [editKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const [focus, setFocus] = useState<GridFocus | null>(gridMemory.focus);
  const focusRef = useRef(focus);
  focusRef.current = focus;
  // 바뀐 쪽(지도 ↔ 크게 보기)이 떠오르는 값 · 이웃 영역으로 넘길 때 옆에서 들어오는 값
  const show = useRef(new Animated.Value(1)).current;
  // 쪽이 바뀌면(지도 ↔ 크게 보기 · 이웃 영역) 맨 위에서 — 영역 화면(Detail)이 영역을 넘길 때와 같다
  const scrollTop = usePageScrollTop();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    onFocusArea?.(typeof focus === 'number' ? focus : null);
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps

  // 화면 읽기 초점 — 크게 보면 블록의 가운데 칸(영역 이름 · 핵심 목표)으로, 접으면 지도 위 줄로.
  // 새 쪽이 자리 잡은 뒤(150ms) 옮겨야 초점이 화면 맨 위로 튀지 않는다
  const headRef = useRef<View>(null);
  const folioRef = useRef<View>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusLater = (get: () => View | null) => {
    if (!screenReader()) return;
    if (focusTimer.current) clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => {
      focusTimer.current = null;
      const node = get();
      if (!node) return;
      try { AccessibilityInfo.sendAccessibilityEvent(node, 'focus'); } catch {}
    }, 150);
  };
  useEffect(() => () => { if (focusTimer.current) clearTimeout(focusTimer.current); }, []);

  const appear = (ms: number) => {
    if (reducedMotion()) { show.setValue(1); return; }
    show.setValue(0);
    Animated.timing(show, { toValue: 1, duration: ms, easing: EASE.out, useNativeDriver: true }).start();
  };
  const say = (f: GridFocus) => announce(f === 'c' ? m.chart.zoomCenterSay : m.chart.zoomBlockSay({ name: areaTitle(doc, f) }));

  const open = (f: GridFocus) => {
    tap();
    scrollTop();
    gridMemory.focus = f;
    gridMemory.zoomedOnce = true;
    slide.setValue(0);
    setFocus(f);
    say(f);
    focusLater(() => headRef.current);
    appear(DUR.gentle);
  };
  const close = () => {
    tap();
    scrollTop();
    gridMemory.focus = null;
    announce(m.chart.wholeSay);
    slide.setValue(0);
    setFocus(null);
    focusLater(() => folioRef.current);
    appear(DUR.base);
  };
  /** 크게 본 채로 다른 블록으로 — from: 새 쪽이 들어오는 쪽(1 오른쪽, -1 왼쪽, 0 제자리에서 떠오름) */
  const switchTo = (f: GridFocus, from: 1 | -1 | 0 = 0) => {
    tap();
    scrollTop();
    gridMemory.focus = f;
    setFocus(f);
    say(f);
    focusLater(() => headRef.current);
    if (reducedMotion()) { show.setValue(1); slide.setValue(0); return; }
    if (!from) { appear(DUR.base); return; }
    slide.setValue(SLIDE * from);
    Animated.timing(slide, { toValue: 0, duration: DUR.base, easing: EASE.out, useNativeDriver: true }).start();
  };
  const step = (d: 1 | -1) => {
    const f = focusRef.current;
    if (typeof f !== 'number') return;
    switchTo(stepArea(f, d), d);
  };

  // 지도 · 크게 보기에 넘기는 함수는 고정 — 최신 함수를 ref로 부른다(지도 · 블록이 체크마다 다시 그려지지 않게)
  const latest = useRef({ open, close, step, switchTo });
  latest.current = { open, close, step, switchTo };
  const openBlock = useCallback((b: GridFocus) => latest.current.open(b), []);
  const closeZoom = useCallback(() => latest.current.close(), []);
  const stepZoom = useCallback((d: 1 | -1) => latest.current.step(d), []);
  const pickArea = useCallback((ti: number) => latest.current.switchTo(ti), []);

  // 크게 본 영역 — 옆으로 밀면 이웃 영역으로(세로 스크롤과 겹치지 않게 가로로 분명히 민 때만)
  const swipe = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => typeof focusRef.current === 'number' && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, g) => {
      const d = swipeStep(g.dx, g.vx);
      if (d) latest.current.step(d);
    },
  }), []);

  // 안드로이드 뒤로 가기는 먼저 지도로
  useEffect(() => {
    if (focus == null) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { latest.current.close(); return true; });
    return () => sub.remove();
  }, [focus]);

  const pageStyle = useMemo(() => ({ opacity: show, transform: [{ translateX: slide }] }), [show, slide]);

  // 펼침: 블록이 쪽 높이에 들어가게, 왼쪽 쪽은 블록까지(나머지는 오른쪽 쪽의 영역 화면)
  const spread = availH != null;
  const maxBlock = spread ? Math.max(0, availH - AREA_BLOCK_CHROME) : undefined;

  // ── 지도 ──
  const goal = doc.centerGoal.trim();
  const written = doc.themes.reduce((s, t) => s + t.actions.filter((a) => a.text.trim()).length, 0);
  const start = written < GUIDE_FILL_TARGET;
  const startTi = start ? firstAreaWithEmpty(doc) : -1;
  const startAi = startTi >= 0 ? doc.themes[startTi].actions.findIndex((a) => !a.text.trim()) : -1;
  const startCell = useMemo(
    () => (startTi >= 0 && startAi >= 0 ? cellAt(startTi, startAi) : null),
    [startTi, startAi],
  );
  const todayKeys = useMemo(() => new Set(todayItems(doc, new Date()).map((it) => it.key)), [doc, clock]); // eslint-disable-line react-hooks/exhaustive-deps
  const startArea = startTi >= 0 ? areaTitle(doc, startTi) : '';
  const taken = startTi >= 0 ? doc.themes[startTi].actions.map((a) => a.text.trim()).filter(Boolean).join('\n') : '';
  const startRef = useRef({ ti: startTi, ai: startAi });
  startRef.current = { ti: startTi, ai: startAi };
  const onPick = useCallback((text: string) => {
    const { ti, ai } = startRef.current;
    if (ti < 0 || ai < 0) return;
    tap();
    setActionText(ti, ai, text);
  }, [setActionText]);
  const onWrite = useCallback(() => {
    const { ti, ai } = startRef.current;
    if (ti < 0 || ai < 0) return;
    tap();
    openEditor({ kind: 'action', ti, ai, seq: true });
  }, [openEditor]);
  const editGoal = () => { tap(); openEditor({ kind: 'center' }); };

  if (focus != null) {
    return (
      <Animated.View {...swipe.panHandlers} onAccessibilityEscape={closeZoom} style={pageStyle}>
        {focus === 'c' ? (
          <CoreZoom M={M} onBack={closeZoom} onArea={pickArea} headRef={headRef} maxBlock={maxBlock} />
        ) : (
          <AreaPage
            ti={focus}
            part={spread ? 'block' : 'all'}
            onBack={closeZoom}
            back={m.chart.tabTitle}
            backTestID={TID.detailBack}
            onStep={stepZoom}
            headRef={headRef}
            maxBlock={maxBlock}
            blockTestID={TID.gridTable}
          />
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={pageStyle}>
      <Header
        M={M}
        eyebrow={m.chart.coreGoal}
        title={goal || m.chart.goalPrompt}
        written={!!goal}
        action={start
          ? { glyph: 'pencil', onPress: editGoal, label: m.chart.editGoal }
          : { glyph: 'share', onPress: openShare, label: m.chart.shareSay, testID: TID.gridShare }}
      />
      <FullGrid
        M={M}
        themes={doc.themes}
        goal={doc.centerGoal}
        todayKeys={todayKeys}
        start={start}
        focus={editCell ?? startCell}
        availH={availH}
        onOpen={openBlock}
        folioRef={folioRef}
      />
      {start && startTi >= 0 && startAi >= 0 ? (
        <FirstRun M={M} ti={startTi} ai={startAi} area={startArea} taken={taken} onPick={onPick} onWrite={onWrite} />
      ) : (
        <NextStepRow M={M} />
      )}
    </Animated.View>
  );
}
