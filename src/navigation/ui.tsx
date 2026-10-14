import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { announce, screenReader } from '../lib/useReducedMotion';

export type Screen = 'dashboard' | 'grid' | 'detail' | 'today' | 'stats' | 'settings';

/** 탭바 높이(아래 안전 영역 제외) — 위 여백 8 + 탭 한 칸 44. 토스트처럼 바닥에 붙는 것은 이 위에 선다 */
export const TAB_BAR_H = 52;

/**
 * 시트·모달이 모두 닫힌 뒤 다음 것을 띄우기까지 기다리는 시간(ms).
 * iOS는 내려가는 중인 모달 옆에 새 모달을 띄우지 못한다(아무 말 없이 무시된다).
 */
const OVERLAY_GAP = 380;

/** 밀려 들어오는 화면(뒤로 가기가 있는 화면) */
function isDeep(s: Screen): boolean {
  return s === 'detail' || s === 'settings';
}
/** 어디서 왔는지 모를 때 돌아갈 곳 — 설정은 홈에서, 영역 화면은 만다라트에서 열린다 */
function defaultFrom(s: Screen): Screen {
  return s === 'settings' ? 'dashboard' : 'grid';
}

export type EditorTarget =
  | { kind: 'center' }
  /** seq: 저장하면 다음 칸(영역·실천)으로 이어서 쓴다 */
  | { kind: 'theme'; ti: number; seq?: boolean }
  | { kind: 'action'; ti: number; ai: number; seq?: boolean };

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  /** 보이는 시간(ms). 없으면 되돌리기가 있을 때 8초, 없을 때 3초 */
  duration?: number;
}

export interface Toast {
  /** 만든 시각(ms) — 같은 순간에 둘이 생겨도 겹치지 않게 1씩 밀어 쓴다 */
  id: number;
  message: string;
  action?: ToastAction;
  duration?: number;
}

/** 마무리 페이지의 종류 — 지금은 64칸을 다 이룬 'bloom' 하나(하루 마감은 모달 없이 그 자리에서) */
export type CelebrateKind = 'bloom';

export interface RitualTarget {
  week: string;
  readOnly?: boolean;
}

/** 화면·시트가 무엇을 보이는지 — 바뀔 때마다 새 값 */
export interface UIState {
  screen: Screen;
  ti: number;
  /** 지금 화면(상세·설정)을 연 탭 — 뒤로 가면 여기로 돌아가고, 탭바도 이 탭을 켜 둔다 */
  from: Screen;
  sheet: { ti: number; ai: number } | null;
  focus: { ti: number; ai: number } | null;
  quick: boolean;
  /** 빠른 추가를 열 때 고를 영역(없으면 null — 마지막으로 쓴 영역) */
  quickTi: number | null;
  /** 만다라트 실천 중 오늘 할 일을 여러 개 고르는 시트 */
  pick: boolean;
  celebrate: CelebrateKind | null;
  editor: EditorTarget | null;
  /** 한 주 돌아보기 — week는 돌아볼 주의 월요일 'YYYY-MM-DD', readOnly면 지난 기록을 첫 쪽만 본다 */
  ritual: RitualTarget | null;
  /** 만다라트 표를 그림 한 장으로 공유하는 시트 */
  share: boolean;
  /** 오늘 할 일을 다 해서 하루를 마감한 날(YYYY-MM-DD) — 하루에 한 번만 마감한다 */
  closedDay: string | null;
  /** 마감할 때마다 1씩 오른다 — 화면이 이 값이 바뀌는 걸 보고 마감 줄을 긋는다 */
  dayCloseTick: number;
}

/**
 * 화면을 옮기고 시트를 여닫는 함수들 — 처음 한 번 만들어 앱이 도는 내내 같은 객체.
 * 이것만 쓰는 화면은 시트가 열리거나 토스트가 떠도 다시 그려지지 않는다.
 */
export interface UIActions {
  go: (screen: Screen, ti?: number) => void;
  /** 상세·설정에서 연 곳으로 돌아간다(탭 화면에서는 아무 일도 하지 않는다) */
  back: () => void;

  /**
   * 열린 시트·모달이 모두 닫히고 OVERLAY_GAP이 지난 뒤 fn을 부른다(열린 게 없으면 바로).
   * 시트에서 다른 시트·타이머·편집 창을 열 때 — 한 번에 하나만 화면에 있게.
   */
  afterOverlays: (fn: () => void) => void;

  openAction: (ti: number, ai: number) => void;
  closeSheet: () => void;

  /** 실천 시트를 닫고, 시트가 다 내려간 뒤 집중 타이머를 연다 */
  startFocus: (ti: number, ai: number) => void;
  closeFocus: () => void;

  openQuick: (ti?: number) => void;
  closeQuick: () => void;

  openPick: () => void;
  closePick: () => void;

  /** 64칸을 다 이룬 마무리 페이지 — 다른 시트가 열려 있으면 그것이 닫힌 뒤에 뜬다 */
  fireCelebrate: (kind?: CelebrateKind) => void;
  closeCelebrate: () => void;

  openEditor: (e: EditorTarget) => void;
  closeEditor: () => void;

  /** 다른 시트가 열려 있으면 그것이 닫힌 뒤에 뜬다 */
  openRitual: (week: string, readOnly?: boolean) => void;
  closeRitual: () => void;

  /** 다른 시트가 열려 있으면 그것이 닫힌 뒤에 뜬다 */
  openShare: () => void;
  closeShare: () => void;

  markDayClosed: (day: string) => void;

  showToast: (message: string, action?: ToastAction, opts?: ToastOptions) => void;
  /** id를 주면 그 토스트일 때만 숨긴다(새 토스트를 실수로 지우지 않게) */
  hideToast: (id?: number) => void;
  /** 지금 떠 있는 토스트 — 누를 때·효과 안에서 읽는 용도(그리는 데 쓰면 바뀌어도 다시 그려지지 않는다) */
  getToast: () => Toast | null;
}

/** 예전 모양 그대로(상태 + 함수들 + 토스트) — 새 코드는 useUIState · useUIActions · useToast를 쓴다 */
export interface UICtx extends UIState, UIActions {
  toast: Toast | null;
}

const StateCtx = createContext<UIState | null>(null);
const ActionsCtx = createContext<UIActions | null>(null);
// 토스트는 따로 — 체크마다 뜨는 토스트가 화면·시트 상태를 쓰는 곳을 다시 그리지 않게
const ToastCtx = createContext<Toast | null>(null);


let lastToastId = 0;
function nextToastId(): number {
  lastToastId = Math.max(Date.now(), lastToastId + 1);
  return lastToastId;
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [ti, setTi] = useState(0);
  const [fromState, setFromState] = useState<Screen | null>(null);
  const [sheet, setSheet] = useState<{ ti: number; ai: number } | null>(null);
  const [focus, setFocus] = useState<{ ti: number; ai: number } | null>(null);
  const [quick, setQuick] = useState(false);
  const [quickTi, setQuickTi] = useState<number | null>(null);
  const [pick, setPick] = useState(false);
  const [celebrate, setCelebrate] = useState<CelebrateKind | null>(null);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [ritual, setRitual] = useState<RitualTarget | null>(null);
  const [share, setShare] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [closedDay, setClosedDay] = useState<string | null>(null);
  const [dayCloseTick, setDayCloseTick] = useState(0);

  // ── 화면 이동 ──────────────────────────────────────────────────────────────
  // 같은 틱에 go가 두 번 불려도 맞게 — 지금 화면·출발 탭은 ref로 바로 갱신한다
  const screenRef = useRef<Screen>('dashboard');
  const fromRef = useRef<Screen | null>(null);

  const go = useCallback((s: Screen, nextTi = 0) => {
    const cur = screenRef.current;
    // 탭에서 상세·설정으로 들어갈 때만 출발 탭을 적어 둔다(상세 → 상세로 영역을 넘길 땐 그대로)
    if (isDeep(s) && !isDeep(cur)) {
      fromRef.current = cur;
      setFromState(cur);
    }
    screenRef.current = s;
    setScreen(s);
    setTi(nextTi);
  }, []);

  const back = useCallback(() => {
    const cur = screenRef.current;
    if (!isDeep(cur)) return;
    go(fromRef.current ?? defaultFrom(cur));
  }, [go]);

  // ── 겹치지 않는 시트(오버레이 대기열) ──────────────────────────────────────
  // 새 오버레이를 추가하는 패키지는 아래 anyOpen에 자기 상태를 더한다.
  const anyOpen = !!(sheet || focus || editor || pick || quick || celebrate || ritual || share);
  const anyOpenRef = useRef(anyOpen);
  anyOpenRef.current = anyOpen;
  const queue = useRef<(() => void)[]>([]);
  const [queued, setQueued] = useState(0);
  const closedAt = useRef(0);
  const wasOpen = useRef(false);

  const afterOverlays = useCallback((fn: () => void) => {
    queue.current.push(fn);
    setQueued((n) => n + 1);
  }, []);

  useEffect(() => {
    if (anyOpen) {
      wasOpen.current = true;
      return;
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      closedAt.current = Date.now();
    }
    if (queue.current.length === 0) return;
    const wait = Math.max(0, OVERLAY_GAP - (Date.now() - closedAt.current));
    const t = setTimeout(() => {
      const run = queue.current.splice(0);
      run.forEach((fn) => {
        try {
          fn();
        } catch (e) {
          console.warn('afterOverlays', e);
        }
      });
    }, wait);
    return () => clearTimeout(t);
  }, [anyOpen, queued]);

  const openAction = useCallback((t: number, a: number) => setSheet({ ti: t, ai: a }), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const startFocus = useCallback((t: number, a: number) => {
    setSheet(null);
    afterOverlays(() => setFocus({ ti: t, ai: a }));
  }, [afterOverlays]);
  const closeFocus = useCallback(() => setFocus(null), []);

  // onPress={openQuick}처럼 이벤트가 넘어와도 영역 번호로 착각하지 않게 숫자만 받는다
  const openQuick = useCallback((t?: number) => {
    setQuickTi(typeof t === 'number' && t >= 0 && t < 8 ? t : null);
    setQuick(true);
  }, []);
  const closeQuick = useCallback(() => {
    setQuick(false);
    setQuickTi(null);
  }, []);

  const openPick = useCallback(() => setPick(true), []);
  const closePick = useCallback(() => setPick(false), []);

  const fireCelebrate = useCallback((kind: CelebrateKind = 'bloom') => {
    if (anyOpenRef.current) afterOverlays(() => setCelebrate(kind));
    else setCelebrate(kind);
  }, [afterOverlays]);
  const closeCelebrate = useCallback(() => setCelebrate(null), []);

  const openEditor = useCallback((e: EditorTarget) => setEditor(e), []);
  const closeEditor = useCallback(() => setEditor(null), []);

  const openRitual = useCallback((week: string, readOnly?: boolean) => {
    if (typeof week !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(week)) return;
    const target: RitualTarget = readOnly ? { week, readOnly: true } : { week };
    if (anyOpenRef.current) afterOverlays(() => setRitual(target));
    else setRitual(target);
  }, [afterOverlays]);
  const closeRitual = useCallback(() => setRitual(null), []);

  const openShare = useCallback(() => {
    if (anyOpenRef.current) afterOverlays(() => setShare(true));
    else setShare(true);
  }, [afterOverlays]);
  const closeShare = useCallback(() => setShare(false), []);

  // 웹 미리보기·화면 캡처용 손잡이 — window.__ui.openRitual('YYYY-MM-DD')
  useEffect(() => {
    if (Platform.OS !== 'web' || !__DEV__) return;
    const g = globalThis as { __ui?: Record<string, unknown> };
    g.__ui = { ...(g.__ui ?? {}), openRitual, closeRitual };
  }, [openRitual, closeRitual]);

  // ── 하루 마감 ────────────────────────────────────────────────────────────
  const closedRef = useRef<string | null>(null);
  const markDayClosed = useCallback((day: string) => {
    if (closedRef.current === day) return;
    closedRef.current = day;
    setClosedDay(day);
    setDayCloseTick((n) => n + 1);
  }, []);

  // ── 토스트 ───────────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, action?: ToastAction, opts?: ToastOptions) => {
    setToast({ id: nextToastId(), message, action, duration: opts?.duration });
    // 스크린리더로 한 번만 읽는다 — Snackbar는 시트 안팎에 두 번 놓이므로 거기서 읽으면 두 번 들린다.
    // 안드로이드는 Snackbar의 accessibilityLiveRegion이 읽어 주므로 여기서는 iOS만.
    if (Platform.OS === 'ios' && screenReader()) {
      announce(action ? `${message}. ${action.label} 가능` : message);
    }
  }, []);
  const hideToast = useCallback((id?: number) => setToast((t) => (id === undefined || t?.id === id ? null : t)), []);
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const getToast = useCallback(() => toastRef.current, []);

  const from = fromState ?? defaultFrom(screen);

  const state = useMemo<UIState>(
    () => ({ screen, ti, from, sheet, focus, quick, quickTi, pick, celebrate, editor, ritual, share, closedDay, dayCloseTick }),
    [screen, ti, from, sheet, focus, quick, quickTi, pick, celebrate, editor, ritual, share, closedDay, dayCloseTick],
  );

  // 함수는 모두 고정 — 이 객체도 처음 한 번만 만들어진다
  const actions = useMemo<UIActions>(
    () => ({
      go, back, afterOverlays,
      openAction, closeSheet, startFocus, closeFocus,
      openQuick, closeQuick, openPick, closePick,
      fireCelebrate, closeCelebrate, openEditor, closeEditor,
      openRitual, closeRitual, openShare, closeShare,
      markDayClosed, showToast, hideToast, getToast,
    }),
    [
      go, back, afterOverlays, openAction, closeSheet, startFocus, closeFocus, openQuick, closeQuick, openPick, closePick,
      fireCelebrate, closeCelebrate, openEditor, closeEditor, openRitual, closeRitual, openShare, closeShare,
      markDayClosed, showToast, hideToast, getToast,
    ],
  );

  return (
    <ActionsCtx.Provider value={actions}>
      <StateCtx.Provider value={state}>
        <ToastCtx.Provider value={toast}>{children}</ToastCtx.Provider>
      </StateCtx.Provider>
    </ActionsCtx.Provider>
  );
}

const MISSING = 'useUI must be used within UIProvider';

/** 화면·시트 상태 — 화면을 옮기거나 시트를 여닫을 때 다시 그려진다(토스트에는 그대로) */
export function useUIState(): UIState {
  const c = useContext(StateCtx);
  if (!c) throw new Error(MISSING);
  return c;
}

/** 화면을 옮기고 시트를 여닫는 함수들 — 늘 같은 객체라 이것만 쓰면 다시 그려지지 않는다 */
export function useUIActions(): UIActions {
  const c = useContext(ActionsCtx);
  if (!c) throw new Error(MISSING);
  return c;
}

/** 지금 토스트 — 토스트가 뜨고 질 때만 다시 그려진다 */
export function useToast(): Toast | null {
  return useContext(ToastCtx);
}

/** 상태 + 함수들 + 토스트 한꺼번에(예전 모양) — 그중 무엇이 바뀌어도 다시 그려진다 */
export function useUI(): UICtx {
  const state = useUIState();
  const actions = useUIActions();
  const toast = useToast();
  return useMemo<UICtx>(() => ({ ...state, ...actions, toast }), [state, actions, toast]);
}
