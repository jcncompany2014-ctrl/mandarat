import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Modal, PixelRatio, Platform, ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { PaperColumn } from '../components/WebColumn';
import { useWindowDimensions } from '../lib/screen';
import { MODAL_ORIENTATIONS, useLayout } from '../lib/screen';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Text, a11yLangProp } from '../components/AppText';
import { ROLE } from '../theme/type';
import { GEO } from '../theme/tokens';
import { announce } from '../lib/useReducedMotion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, IconBtn, QuietAction } from '../components/common';
import { DyeMark } from '../components/kit';
import { MinuteGrid } from '../components/chart';
import { TID } from '../lib/testIds';
import { noOrphan } from '../lib/text';
import { usePalette } from '../theme/usePalette';
import { useUIActions, useUIState } from '../navigation/ui';
import { useMandarat, dateKey } from '../store/MandaratContext';
import { success, tap } from '../lib/haptics';
import { doneOn, kindOf } from '../lib/routine';
import {
  FOCUS_TOTAL, TALLY_BOXES, clockParts, elapsedOf, filledBoxes, finishLabel, fmtClock, focusOutcome, leftOfMs, minutesToRecord,
} from '../lib/focusClock';
import { FOCUS_DONE_LINGER_MS, focusProps, focusStartOf } from '../lib/focusActivity';
import { notifier } from '../lib/notifier';
import { focusLive } from '../widgets/focusLive';
import { useLang, useMsg } from '../i18n/react';

// 25분 집중 — 탭 막대 없이 화면 전체를 덮는 종이 한 장(목업 docs/design/mockups/a/focus.png · build-plan §1, O4).
// 머리(영역 · 25분 집중 / 실천 글 / 닫기 글리프) → 5×5 분 칸(MinuteGrid) → 남은 시간 · 끝나는 시각 → 엄지 자리의 단추.
// 시계 · 기록 · 알림 · 화면 켜 두기 · Live Activity는 예전 그대로 — 바뀐 것은 그림뿐이다.

/** 화면을 켜 두는 표시 — 다른 곳의 켜 두기와 섞이지 않게 이름을 붙인다 */
const KEEP_AWAKE_TAG = 'focus';
/** 이 글자 배율부터 멈추기·끝내기 버튼을 위아래로 쌓는다(나란히 두면 글이 잘린다) */
const STACK_SCALE = 1.35;
/** 분 칸의 가장 큰 폭 — 아이패드 단(640)에서도 지도(min(본문, 520))만큼만 */
const GRID_MAX = 520;
/** 분 칸의 가장 작은 폭 — 이보다 좁아질 높이면 본문이 스크롤된다 */
const GRID_MIN = 160;
/** 분 칸과 남은 시간 사이(목업 .field margin-top) */
const FIELD_GAP = 32;
/** 높이가 모자라도 위·아래에 남기는 여백 */
const AIR_MIN = 12;
/** 남는 높이 중 분 칸 위로 주는 몫 — 목업은 머리 아래 64 · 단추 위 90(≈ 0.42), 위는 64를 넘지 않는다 */
const AIR_TOP = 0.42;
const AIR_TOP_MAX = 64;

export function FocusTimer() {
  const { focus } = useUIState();
  // 앱이 꺼지며 잠금 화면에 남은 Live Activity를 처음 한 번 치운다(세션이 열려 있으면 그 세션 것이다)
  const openRef = useRef(!!focus);
  openRef.current = !!focus;
  useEffect(() => {
    if (!openRef.current) focusLive.endAll();
  }, []);
  if (!focus) return null;
  // 세션마다 새로 그려 늘 25:00에서 시작한다(닫혀 있는 동안 시간이 흐르지 않게)
  return <FocusSession ti={focus.ti} ai={focus.ai} />;
}

function keepAwake(on: boolean) {
  // 화면 켜 두기는 덤 — 기기가 거절해도 타이머는 벽시계로 그대로 간다
  try {
    const p = on ? activateKeepAwakeAsync(KEEP_AWAKE_TAG) : deactivateKeepAwake(KEEP_AWAKE_TAG);
    p.catch(() => {});
  } catch {
    // 무시
  }
}

function FocusSession({ ti, ai }: { ti: number; ai: number }) {
  const M = usePalette();
  const insets = useSafeAreaInsets();
  const { closeFocus } = useUIActions();
  const { fontScale } = useWindowDimensions();
  const layout = useLayout();
  const stack = fontScale >= STACK_SCALE;
  const { doc, toggleDone, toggleRoutineToday, addFocusMinutes } = useMandarat();
  const m = useMsg();
  const lang = useLang();
  const th0 = doc.themes[ti];
  const a0 = th0?.actions[ai];
  const areaName = th0 ? th0.title || m.sheet.areaFallback({ n: ti + 1 }) : '';
  // 알림·Live Activity가 읽는 지금 값 — 효과는 run·finished가 바뀔 때만 돌므로 ref로 넘긴다
  const textRef = useRef('');
  textRef.current = a0?.text.trim() ?? '';
  const msgRef = useRef(m);
  msgRef.current = m;

  const [left, setLeft] = useState(FOCUS_TOTAL);
  const [run, setRun] = useState(true);
  const finished = left <= 0;
  /** 끝나는 시각(ms) — 돌기 시작할 때·다시 이을 때 한 번 정한다(멈춘 동안은 쓰지 않는다) */
  const [endsAt, setEndsAt] = useState(0);

  // 벽시계: 도는 동안은 끝날 시각을, 멈춘 동안은 남은 ms를 들고 있는다
  const endAtRef = useRef(0);
  const remainingMsRef = useRef(FOCUS_TOTAL * 1000);
  const runRef = useRef(true);
  runRef.current = run && !finished;

  /** 지금 남은 초 — 렌더를 기다리지 않고 시계에서 바로 읽는다(닫기·언마운트 때) */
  const currentLeft = useCallback(
    () => leftOfMs(runRef.current ? endAtRef.current - Date.now() : remainingMsRef.current),
    [],
  );

  useEffect(() => {
    if (!run || finished) return;
    endAtRef.current = Date.now() + remainingMsRef.current;
    setEndsAt(endAtRef.current);
    const tick = () => {
      remainingMsRef.current = Math.max(0, endAtRef.current - Date.now());
      setLeft(leftOfMs(remainingMsRef.current));
    };
    tick();
    const id = setInterval(tick, 500);
    // 잠금을 풀고 돌아오면 다음 박자를 기다리지 않고 바로 맞춘다.
    // 도는 채로 앱을 떠나면 끝날 시각에 알림을 걸어 두고(허락이 있을 때만, 묻지 않는다), 돌아오면 거둔다.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        notifier.focusEnd(null).catch(() => {});
        tick();
      } else if (s === 'background') {
        notifier.focusEnd(endAtRef.current, msgRef.current.live.doneTitle, textRef.current).catch(() => {});
      }
    });
    return () => {
      clearInterval(id);
      sub.remove();
      // 멈춤·끝·닫기 — 걸어 둔 알림은 거둔다
      notifier.focusEnd(null).catch(() => {});
      // 멈추는 순간까지 흐른 시간을 남긴다(다음 박자 전에 멈춰도 잃지 않게)
      remainingMsRef.current = Math.max(0, endAtRef.current - Date.now());
    };
  }, [run, finished]);

  // 도는 동안만 화면을 켜 둔다 — 멈춤·끝·닫기·언마운트에서 끈다
  useEffect(() => {
    if (!run || finished) return;
    keepAwake(true);
    return () => keepAwake(false);
  }, [run, finished]);

  // ── 잠금 화면·다이내믹 아일랜드(Live Activity) ─────────────────────────────────
  // 세션마다 한 번 띄우고(start) 한 번 끝낸다(end): 25분을 채우면 '마쳤어요'를 5분 남기고, 닫기·언마운트면 바로 지운다.
  // 'idle' 아직 · 'live' 떠 있음 · 'none' 기기가 못 띄움 · 'ended' 끝냄
  // 색은 영역 번호(ti)로 토큰의 dye를 고른다(무드 · 포인트 컬러는 더 넘기지 않는다, build-plan §4.1)
  const liveRef = useRef<'idle' | 'live' | 'none' | 'ended'>('idle');
  const liveInfo = useRef({ area: areaName, ti, lang });
  liveInfo.current = { area: areaName, ti, lang };
  useEffect(() => {
    const st = liveRef.current;
    if (st === 'none' || st === 'ended') return;
    const info = liveInfo.current;
    const endAt = finished ? Date.now() : run ? endAtRef.current : Date.now() + remainingMsRef.current;
    const props = focusProps({
      text: textRef.current, area: info.area, ti: info.ti, lang: info.lang,
      startAt: focusStartOf(endAt), endAt, pausedLeft: run || finished ? null : remainingMsRef.current, done: finished,
    });
    if (finished) {
      if (st === 'live') focusLive.end(props, FOCUS_DONE_LINGER_MS);
      liveRef.current = 'ended';
      return;
    }
    if (st === 'idle') {
      if (run) liveRef.current = focusLive.start(props) ? 'live' : 'none';
      return;
    }
    focusLive.update(props);
  }, [run, finished]);
  // 닫기·언마운트 — 아직 떠 있으면 바로 지운다(개발 모드의 두 번 마운트는 다시 띄울 수 있게 'idle'로)
  useEffect(() => () => {
    if (liveRef.current === 'live') {
      focusLive.end();
      liveRef.current = 'idle';
    }
  }, []);

  // ── 기록: 어떻게 나가든 집중한 분은 남긴다(한 번만) ──────────────────────────
  const recordedRef = useRef(false);
  const addRef = useRef(addFocusMinutes);
  addRef.current = addFocusMinutes;
  const record = useCallback(() => {
    if (recordedRef.current) return;
    const m = minutesToRecord(elapsedOf(currentLeft()));
    // 0분은 기록할 것이 없다 — 표시도 하지 않아 개발 모드의 두 번 마운트가 기록을 막지 않게
    if (m <= 0) return;
    recordedRef.current = true;
    addRef.current(m);
  }, [currentLeft]);
  useEffect(() => () => record(), [record]);

  // ── 25분을 다 채웠을 때 ─────────────────────────────────────────────────────
  const firedRef = useRef(false);
  useEffect(() => {
    if (!finished || firedRef.current) return;
    firedRef.current = true;
    success();
    announce(msgRef.current.focus.finished);
  }, [finished]);

  // ── 분 칸 ───────────────────────────────────────────────────────────────────
  const elapsed = elapsedOf(left);
  const filled = finished ? TALLY_BOXES : filledBoxes(elapsed);
  // 지금 분이 얼마나 찼는가 — 분이 바뀔 때·멈추고 이을 때만 새로 넘긴다(칸은 그때만 읽는다, 초마다 다시 그리지 않게)
  const frac = useMemo(() => (finished ? 0 : (elapsed % 60) / 60), [filled, run, finished]);

  // 본문 높이에 맞춰 분 칸의 폭을 정한다 — 폰 본문 폭(342)이 기본, 낮은 화면(375×667)·큰 글자에서는 줄어든다
  const [body, setBody] = useState<{ w: number; h: number } | null>(null);
  const [readH, setReadH] = useState(0);
  const onBody = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const w = Math.floor(width - 2 * GEO.gutter);
    const h = Math.floor(height);
    setBody((b) => (b && b.w === w && b.h === h ? b : { w, h }));
  }, []);
  const onReadout = useCallback((e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    setReadH((r) => (Math.abs(r - h) < 1 ? r : h));
  }, []);
  const measure = body ? body.w : layout.width - 2 * GEO.gutter;
  const fitH = body && readH > 0 ? body.h - readH - FIELD_GAP - 2 * AIR_MIN : Infinity;
  const gridW = Math.floor(Math.max(GRID_MIN, Math.min(measure, GRID_MAX, fitH)));
  const free = body && readH > 0 ? body.h - gridW - FIELD_GAP - readH : 0;
  const padTop = free > 0 ? PixelRatio.roundToNearestPixel(Math.min(AIR_TOP_MAX, free * AIR_TOP)) : 0;
  const padLeft = PixelRatio.roundToNearestPixel(Math.max(0, (measure - gridW) / 2));

  const th = doc.themes[ti];
  const a = th?.actions[ai];
  if (!th || !a) return null;

  const kind = kindOf(a);
  const outcome = focusOutcome(kind, { done: a.done, checkedToday: doneOn(doc.dayLog, `${ti}-${ai}`, dateKey()) });
  const label = finishLabel(outcome, finished, lang);
  const running = run && !finished;

  const close = () => {
    record();
    closeFocus();
  };

  const finish = () => {
    record();
    // 한 번은 칸의 달성으로, 습관은 오늘 체크로(쌓기·마음가짐은 얼마나 했는지 몰라 시간만 남긴다)
    if (outcome === 'check') toggleRoutineToday(ti, ai);
    else if (outcome === 'done') toggleDone(ti, ai);
    closeFocus();
  };

  const toggleRun = () => {
    if (finished) return;
    tap();
    // VoiceOver에는 바뀐 결과를 읽어 준다(안드로이드는 시계 위 이름표의 live region이 읽는다)
    if (Platform.OS === 'ios') announce(run ? m.focus.cuePaused : m.focus.resumed);
    setRun((r) => !r);
  };

  // 시계 위 이름표 — 도는 중 '남은 시간', 멈추면 '잠시 멈췄어요'(먹), 다 채우면 '끝났어요'
  const cue = finished ? m.focus.cueDone : run ? m.focus.left : m.focus.cuePaused;
  const clockA11y = finished
    ? m.focus.fullClockA11y
    : (run ? m.focus.timerLeft : m.focus.timerLeftPaused)({ mins: Math.floor(left / 60), secs: left % 60 });
  // 끝나는 시각 — 도는 동안만(멈춘 동안은 정해지지 않는다)
  const ends = running && endsAt > 0 ? clockParts(endsAt, lang) : null;
  // 그만하기 — 다 채운 뒤 끝내기가 이미 '닫기'면 두 번 적지 않는다(자리는 남겨 단추가 움직이지 않게)
  const showQuiet = !(finished && outcome === 'time');

  return (
    <Modal visible animationType="fade" onRequestClose={close} statusBarTranslucent supportedOrientations={MODAL_ORIENTATIONS}>
      <PaperColumn bg={M.paper}>
      <View
        style={{ flex: 1, backgroundColor: M.paper, paddingTop: insets.top }}
        // 두 손가락 두 번 톡톡 — 멈춤·계속, 문지르기 — 닫기(기록은 남긴다)
        onMagicTap={toggleRun}
        onAccessibilityEscape={close}
      >
        {/* 머리(A.header) — 위 줄: 영역 표시 + '커리어 · 25분 집중', 제목: 실천 글, 오른쪽: 닫기(아래 꺾쇠) */}
        <View style={{ marginHorizontal: GEO.gutter, minHeight: GEO.header, paddingTop: 12 }}>
          <View style={{ height: 18, flexDirection: 'row', alignItems: 'center', paddingRight: 48 }}>
            <DyeMark M={M} area={ti} />
            <Text style={{ ...ROLE.folio, color: M.print, flexShrink: 1 }} numberOfLines={1} maxFontSizeMultiplier={1.4}>
              {m.focus.eyebrow({ area: areaName })}
            </Text>
          </View>
          <Text accessibilityRole="header" style={{ ...ROLE.title, color: M.ink, paddingRight: 48 }} numberOfLines={2}>
            {noOrphan(a.text || m.focus.textFallback)}
          </Text>
          <View style={{ position: 'absolute', right: -10, top: 26 }}>
            <IconBtn M={M} name="down" label={m.common.close} onPress={close} />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: GEO.gutter, paddingTop: padTop, paddingBottom: AIR_MIN }}
          onLayout={onBody}
          alwaysBounceVertical={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: gridW, marginLeft: padLeft }}>
            <MinuteGrid
              width={gridW}
              area={ti}
              done={filled}
              frac={frac}
              running={running}
              accessibilityLabel={m.focus.tallyA11y({ n: filled })}
            />
            <View onLayout={onReadout} style={{ marginTop: FIELD_GAP }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View style={{ gap: 2, flexShrink: 1 }}>
                  <Text
                    // 안드로이드: 멈춤·계속·끝남이 바뀔 때 읽는다(이 글은 그때만 바뀐다)
                    accessibilityLiveRegion="polite"
                    style={{ ...ROLE.label, color: running || finished ? M.print : M.ink }}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.4}
                  >
                    {cue}
                  </Text>
                  <Text
                    // 멈추면 숫자를 한 단 흐리게(ink2, 종이 위 4.5:1 이상) — 움직임 없이도 도는 중과 다르게
                    style={{ ...ROLE.clock, color: running || finished ? M.ink : M.ink2 }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    maxFontSizeMultiplier={1.2}
                    accessibilityRole="timer"
                    accessibilityLabel={clockA11y}
                  >
                    {finished ? m.focus.fullClock : fmtClock(left)}
                  </Text>
                </View>
                {ends && (
                  <View
                    accessible
                    accessibilityLabel={m.focus.endsAtA11y({ time: ends.text })}
                    {...a11yLangProp()}
                    style={{ alignItems: 'flex-end', gap: 2, paddingBottom: 6, marginLeft: 12 }}
                  >
                    <Text style={{ ...ROLE.label, color: M.print }} numberOfLines={1} maxFontSizeMultiplier={1.4}>{m.focus.endsAt}</Text>
                    <Text style={{ ...ROLE.figureField, color: M.ink }} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                      {!!ends.pre && <Text style={{ fontFamily: ROLE.unit.fontFamily, fontSize: ROLE.unit.fontSize, color: M.ink2 }}>{`${ends.pre} `}</Text>}
                      {ends.time}
                      {!!ends.post && <Text style={{ fontFamily: ROLE.unit.fontFamily, fontSize: ROLE.unit.fontSize, color: M.ink2 }}>{` ${ends.post}`}</Text>}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{ ...ROLE.note, color: M.print, marginTop: 10 }}>{m.focus.footnote}</Text>
            </View>
          </View>
        </ScrollView>

        {/* 엄지 자리 — 멈추기(옅은 면) · 끝내고 했어요(먹), 아래 가운데 그만하기. 글자를 크게 키우면 위아래로 쌓는다 */}
        <View style={{ paddingHorizontal: GEO.gutter, paddingTop: 8, paddingBottom: Math.max(30, insets.bottom) }}>
          <View style={{ flexDirection: stack ? 'column' : 'row', alignItems: 'stretch', gap: 10 }}>
            {!finished && (
              <Button
                M={M}
                variant="tint"
                glyph={run ? 'pause' : undefined}
                label={run ? m.focus.pause : m.focus.resume}
                onPress={toggleRun}
                testID={TID.focusPause}
                style={stack ? undefined : { flex: 1, paddingHorizontal: 12 }}
              />
            )}
            <Button
              M={M}
              label={label}
              onPress={finish}
              testID={TID.focusFinish}
              style={stack ? undefined : { flex: 1, paddingHorizontal: 12 }}
            />
          </View>
          <View style={{ marginTop: 10, minHeight: 44, alignItems: 'center' }}>
            {showQuiet && (
              <QuietAction
                M={M}
                foot
                label={finished ? m.common.close : m.focus.stop}
                onPress={close}
                testID={TID.focusClose}
                style={{ paddingHorizontal: 16 }}
              />
            )}
          </View>
        </View>
      </View>
      </PaperColumn>
    </Modal>
  );
}
