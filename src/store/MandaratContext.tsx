import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MandaratDoc, Settings, Theme, TodayExtra, WeekReviewEntry } from '../types';
import { DATE_RE, blankDoc, cleanClosedDays, cleanReviewEntry, cleanReviews, isMondayKey, migrate, sampleThemes } from '../data/defaults';
import { extraLogKey, isRoutine, kindOf, rolloverToday, setDayLog, toggleDayLog, ymd } from '../lib/routine';
import { addCount as addCountTo, clearedAction, rateWeek, sameConfig, configOf, toggleCountToday, type KindConfig } from '../lib/kinds';
import { activeStreak, archiveAllCells, archiveCellLog, areaStreak, configCell, detachReviewPicks, toggleCellDone } from '../lib/history';
import { summarize, type BackupSummary } from '../lib/backup';
import { MOODS, withAccent, type Palette } from '../theme/moods';
import { GOLD } from '../theme/palette';
import { EDITOR_DRAFT_KEY } from '../lib/editorDraft';
import { resetDoc, startNewChart as nextChart, type NewChartMode } from '../lib/archive';

const STORAGE_KEY = 'mandarat:doc:v1';
/** 하루 한 번 남기는 저장본 'mandarat:snap:YYYY-MM-DD' */
const SNAP_PREFIX = 'mandarat:snap:';
/** 저장본은 최근 7일치만 */
const SNAP_KEEP = 7;

/**
 * 편집 창이 적어 둔 쓰던 글을 지운다 — 문서를 통째로 바꾸면(예시·초기화·템플릿·되돌리기·백업) 그 글은 지난 칸의 것이다.
 * 적어 둔 글은 칸 자리('a0-7')로만 찾으므로, 남겨 두면 바뀐 칸에 지난 글을 '이어서 쓰기'로 권한다
 */
function dropEditorDraft() {
  AsyncStorage.removeItem(EDITOR_DRAFT_KEY).catch(() => {});
}

// ── date helpers ──────────────────────────────────────────────────────────────
export function dateKey(d = new Date()): string {
  return ymd(d);
}

// ── 저장소 읽기 ───────────────────────────────────────────────────────────────
type StoredRead = { ok: true; raw: string | null } | { ok: false; error: unknown };

function readStored(): Promise<StoredRead> {
  return AsyncStorage.getItem(STORAGE_KEY).then(
    (raw): StoredRead => ({ ok: true, raw }),
    (error: unknown): StoredRead => ({ ok: false, error }),
  );
}

// 앱이 뜨자마자(폰트를 읽는 동안) 저장본 읽기를 시작해 첫 화면을 앞당긴다.
// 읽기 실패는 '저장본 없음'과 구분해 둔다 — 실패를 빈 문서로 오해해 덮어쓰지 않게.
let bootRead: Promise<StoredRead> | null = readStored();

/** 미리 읽어 둔 결과는 처음 한 번만 — 오류 화면에서 다시 시도하는 등 다시 마운트되면 새로 읽는다(오래된 저장본으로 덮지 않게) */
function takeStoredRead(): Promise<StoredRead> {
  const p = bootRead ?? readStored();
  bootRead = null;
  return p;
}

function snapDayOf(key: string): string | null {
  if (!key.startsWith(SNAP_PREFIX)) return null;
  const day = key.slice(SNAP_PREFIX.length);
  return DATE_RE.test(day) ? day : null;
}

function parseSnapshot(raw: string | null): MandaratDoc | null {
  if (!raw) return null;
  try {
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** 돌아보기 기록이 있을 때만 중점 칸을 떼어 낸다(없던 필드를 만들지 않게) */
function withPicksDetached(d: MandaratDoc, key?: string): Partial<Pick<MandaratDoc, 'reviews'>> {
  return d.reviews ? { reviews: detachReviewPicks(d.reviews, key) } : {};
}

/** 지난 날 습관 체크를 바꿀 수 있는가 — 글이 있는 습관이고, 습관을 정한 날(since) ~ 오늘 사이 */
function canToggleHabitOn(d: MandaratDoc, ti: number, ai: number, day: string): boolean {
  const a = d.themes[ti]?.actions[ai];
  if (!a || !a.text.trim() || kindOf(a) !== 'habit' || !DATE_RE.test(day)) return false;
  return day <= dateKey() && (!a.since || day >= a.since);
}

// ── context shape ─────────────────────────────────────────────────────────────
export interface SnapshotInfo {
  /** 저장본을 남긴 날 'YYYY-MM-DD' */
  day: string;
  summary: BackupSummary;
}

/** 문서와 저장 상태 — 문서가 바뀔 때마다 새 값 */
export interface DocState {
  doc: MandaratDoc;
  ready: boolean;
  /** 저장소를 읽거나 쓰지 못해 이번 실행의 변경을 저장하지 않는 중 */
  storageError: boolean;
  /** 마지막 저장이 실패했다 — 다음 변경 때 다시 저장해 보고, 성공하면 거짓으로 돌아온다 */
  saveFailed: boolean;
  /** 읽지 못한 저장본을 따로 보관해 둔 저장소 키 — 이번 실행에서 그런 일이 있었을 때만 */
  recoveredCopy: string | null;
  /**
   * 시계 눈금 — 자정과 일요일 18:00(한 주 돌아보기가 열리는 때), 앱으로 돌아올 때 바뀐다.
   * 문서가 그대로여도 '지금'에 기대는 화면(돌아보기 권하기 · 오늘 날짜)이 다시 그려지게, 시간에 기대는 useMemo의 의존성에 넣는다.
   */
  clock: number;
}

/**
 * 문서를 바꾸는 함수들 — 처음 한 번 만들어 앱이 도는 내내 같은 객체.
 * 이것만 쓰는 화면·줄은 체크·글쓰기로 문서가 바뀌어도 다시 그려지지 않는다.
 */
export interface Actions {
  /** 지금 문서 — 누를 때 읽는 용도(그리는 데 쓰면 바뀌어도 다시 그려지지 않는다) */
  getDoc: () => MandaratDoc;
  // onboarding
  /** 온보딩 마치기 — 목표를 비워 두면 빈 채로 둔다(자리표시 글을 목표로 저장하지 않는다) */
  completeOnboarding: (goal: string) => void;
  // editing
  setCenterGoal: (goal: string) => void;
  /** 영역 이름 고치기 — 8영역을 정한 것으로 표시한다 */
  setThemeTitle: (ti: number, title: string) => void;
  /** 이름을 고치지 않고 지금 8영역 그대로 쓰기로 했을 때 */
  markAreasSet: () => void;
  setActionText: (ti: number, ai: number, text: string) => void;
  setActionNote: (ti: number, ai: number, note: string) => void;
  /** 실천 유형과 그 값(요일·주 N회·목표·마감) — 바뀐 게 없으면 아무것도 하지 않는다 */
  setActionConfig: (ti: number, ai: number, cfg: KindConfig) => void;
  /** 칸 비우기 — 글·유형 값·달성을 지우고(메모는 남김) 오늘 목록에서도 뺀다. 지난 기록은 지우지 않고 칸에서 떼어 둔다 */
  clearAction: (ti: number, ai: number) => void;
  // progress
  toggleDone: (ti: number, ai: number) => void;
  /** 습관의 오늘 체크만 토글 (영구 달성 done은 그대로) */
  toggleRoutineToday: (ti: number, ai: number) => void;
  /** 습관의 지난 날(습관을 정한 날 ~ 오늘) 체크를 토글 — 그 밖의 날·습관이 아닌 칸은 무시 */
  toggleHabitOn: (ti: number, ai: number, day: string) => void;
  /** 목록의 체크 — 유형에 맞게: 습관은 오늘 체크, 쌓기는 한 번 더하기/오늘 것 되돌리기, 한 번은 달성 */
  checkToday: (ti: number, ai: number) => void;
  /** 쌓기 수를 더하거나 뺀다(오늘 기록에 남는다) */
  addCount: (ti: number, ai: number, delta: number) => void;
  /** 마음가짐 점수(0이면 지움) — on이 속한 주(기본: 이번 주) */
  rateMind: (ti: number, ai: number, score: number, on?: Date) => void;
  addFocusMinutes: (minutes: number) => void;
  // today
  toggleToday: (key: string) => void;
  addExtra: (ti: number, text: string) => void;
  toggleExtra: (id: string) => void;
  removeExtra: (id: string) => void;
  /** 지운 할 일을 원래 자리로 되살린다 (되돌리기) — day: 지울 때의 날짜 */
  restoreExtra: (x: TodayExtra, index: number, logged: boolean, day: string) => void;
  /** 오늘 할 일을 다 해 하루를 마감한 날을 남긴다(이미 있으면 그대로) — 홈의 이번 주 칸이 지난 날에도 표시한다 */
  markClosedDay: (day: string) => void;
  // day meta — day: 'YYYY-MM-DD' (기본: 오늘). 자정을 넘겨 쓴 글이 다음 날로 가지 않게 쓰기 시작한 날을 넘긴다
  setDayMood: (mood: number, day?: string) => void;
  setDayReflection: (text: string, day?: string) => void;
  // weekly close
  /** 한 주 돌아보기 저장 — week: 돌아본 주의 월요일 'YYYY-MM-DD' */
  saveReview: (week: string, entry: WeekReviewEntry) => void;
  // settings
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  // data management
  loadSample: () => void;
  /** 템플릿으로 바꾸기 — centerGoal을 ''로 넘기면 지금 목표를 그대로 둔다 */
  applyTemplate: (centerGoal: string, themes: Theme[]) => void;
  /** 처음부터 다시 — 보기 설정과 지난 표는 남긴다(archive.resetDoc) */
  resetAll: () => void;
  replaceDoc: (d: MandaratDoc) => void;
  /**
   * 지금 표를 지난 표로 닫고 새 표를 시작한다(archive.startNewChart) — 같은 지난 표가 이미 있거나
   * 오늘 닫고 시작한 표를 오늘 또 닫으려 하면 아무것도 바꾸지 않고 false
   */
  startNewChart: (mode: NewChartMode, opts: { goal: string; note: string }) => boolean;
  /** 편집 횟수 — 통째 되돌리기 전에 그 사이 다른 변경이 있었는지 확인하는 데 쓴다 */
  revision: () => number;
  /** 보관 안내를 닫는다(보관한 사본은 지우지 않는다) */
  dismissRecovered: () => void;
  /** 하루 한 번 남긴 저장본 목록 — 최근 날 먼저(최대 7개) */
  listSnapshots: () => Promise<SnapshotInfo[]>;
  /** 그날의 저장본 — 없거나 읽지 못하면 null */
  readSnapshot: (day: string) => Promise<MandaratDoc | null>;
}

/** 예전 모양 그대로(문서 + 함수들 + inToday) — 새 코드는 useDoc · useActions를 쓴다 */
export interface Ctx extends DocState, Actions {
  inToday: (key: string) => boolean;
}

const DocCtx = createContext<DocState | null>(null);
const ActionsCtx = createContext<Actions | null>(null);
/** 저장본을 다 읽었는지만 — 문서가 바뀔 때는 다시 그리지 않는다(첫 화면 문지기용) */
const ReadyCtx = createContext(false);

// ── palette ───────────────────────────────────────────────────────────────────
/** 지금 고른 종이(무드) 팔레트 + 포인트 컬러 */
export type PaletteValue = Palette & { accent: string };

const DEFAULT_PALETTE: PaletteValue = withAccent(MOODS['연꽃'], GOLD);
// 팔레트는 문서와 따로 — 체크·글쓰기처럼 색과 무관한 변경에는 같은 객체를 돌려줘 화면이 다시 그려지지 않게
const PaletteCtx = createContext<PaletteValue>(DEFAULT_PALETTE);

export function MandaratProvider({ children }: { children: React.ReactNode }) {
  const [doc, setDoc] = useState<MandaratDoc>(() => blankDoc());
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [recoveredCopy, setRecoveredCopy] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 아직 쓰지 않은 변경이 있다(디바운스 대기 중) */
  const pendingSave = useRef(false);
  /**
   * 가장 최근 문서 — 바꿀 때마다 바로(그리기 전에) 맞춘다. 같은 순간에 이어지는 변경과 내려갈 때의 저장이
   * 아직 그려지지 않은 변경까지 함께 보게(그린 문서만 보면 한 박자 늦은 문서를 저장한다).
   */
  const latest = useRef(doc);
  const commit = useCallback((next: MandaratDoc) => {
    latest.current = next;
    setDoc(next);
  }, []);
  const revRef = useRef(0);
  // 저장본을 읽지 못했다면(저장소 오류) 빈 문서로 덮어쓰지 않도록 이번 세션은 저장하지 않는다
  const blockSave = useRef(false);
  /** 이번 실행에서 저장본(하루 한 번)을 챙긴 날 */
  const snapDay = useRef<string | null>(null);

  // 하루의 첫 저장 뒤에 그 내용을 'mandarat:snap:날짜'로 한 벌 더 남기고, 최근 7일치만 둔다.
  // 실패해도 본 저장에는 영향이 없다(같은 날 다시 시도하지 않는다).
  const snapshot = useCallback(async (d: MandaratDoc, json: string) => {
    const day = dateKey();
    if (!d.onboarded || snapDay.current === day) return;
    snapDay.current = day;
    try {
      const keys = await AsyncStorage.getAllKeys();
      const snaps = keys.filter((k) => k.startsWith(SNAP_PREFIX));
      const mine = `${SNAP_PREFIX}${day}`;
      // 지난 표는 저장본에 넣지 않는다(7벌 × 지난 표 여러 장이 저장소를 채우지 않게) — 되살릴 때 지금 것을 다시 붙인다(readSnapshot)
      if (!snaps.includes(mine)) await AsyncStorage.setItem(mine, d.archives ? JSON.stringify({ ...d, archives: undefined }) : json);
      const keep = new Set(
        [...new Set([...snaps, mine])].filter((k) => snapDayOf(k) !== null).sort().reverse().slice(0, SNAP_KEEP),
      );
      const drop = snaps.filter((k) => !keep.has(k));
      if (drop.length > 0) await AsyncStorage.multiRemove(drop);
    } catch (e) {
      console.warn('[store] daily snapshot failed', e);
    }
  }, []);

  const persist = useCallback(
    (d: MandaratDoc) => {
      const json = JSON.stringify(d);
      return AsyncStorage.setItem(STORAGE_KEY, json).then(
        () => {
          setSaveFailed(false);
          void snapshot(d, json);
        },
        (e) => {
          console.warn('[store] save failed', e);
          setSaveFailed(true);
        },
      );
    },
    [snapshot],
  );

  // load once
  useEffect(() => {
    let alive = true;
    (async () => {
      const read = await takeStoredRead();
      let loaded: MandaratDoc | null = null;
      if (!read.ok) {
        console.warn('[store] load failed', read.error);
        blockSave.current = true;
      } else if (read.raw) {
        try {
          loaded = rolloverToday(migrate(JSON.parse(read.raw)), dateKey());
        } catch (e) {
          // 깨진 저장본은 지우지 않고 따로 보관해 두고 새로 시작한다 — 보관도 못 하면 원본을 덮어쓰지 않는다
          console.warn('[store] unreadable doc — kept a copy', e);
          const copyKey = `${STORAGE_KEY}:corrupt:${Date.now()}`;
          try {
            await AsyncStorage.setItem(copyKey, read.raw);
            if (alive) setRecoveredCopy(copyKey);
          } catch {
            blockSave.current = true;
          }
        }
      }
      if (!alive) return;
      if (loaded) commit(loaded);
      if (blockSave.current) setStorageError(true);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [commit]);

  // debounced persist
  useEffect(() => {
    if (!ready || blockSave.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    pendingSave.current = true;
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      pendingSave.current = false;
      void persist(doc);
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [doc, ready, persist]);

  // 내려갈 때(오류 화면 등) 아직 쓰지 않은 변경이 있으면 바로 쓴다
  useEffect(
    () => () => {
      if (pendingSave.current && !blockSave.current) {
        pendingSave.current = false;
        void persist(latest.current);
      }
    },
    [persist],
  );

  // 내려갈 때 바로 쓴다(300ms 안의 마지막 변경을 잃지 않게). 같은 순간 다른 듣는 곳(오늘의 한 줄 글 등)이
  // 먼저 문서에 넣을 수 있게 마이크로태스크로 미룬 뒤, 그때의 가장 최근 문서(latest)를 쓴다.
  // AppState는 듣는 곳을 한 번에(같은 동기 흐름에서) 모두 부르므로 마이크로태스크는 그 뒤에 돈다.
  // setTimeout(0)은 쓰지 않는다 — 웹에서 다른 주소로 떠날 때(visibilitychange 직후) 버려진다
  useEffect(() => {
    if (!ready || blockSave.current) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        queueMicrotask(() => {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = null;
          pendingSave.current = false;
          void persist(latest.current);
        });
      }
    });
    return () => sub.remove();
  }, [ready, persist]);

  // 날짜가 바뀌면 '오늘' 목록 정리 — 처음 읽었을 때와 앱으로 돌아올 때. 켜 둔 채 자정을 넘기는 것은 아래 시계 눈금이 맡는다
  useEffect(() => {
    if (!ready) return;
    const roll = () => commit(rolloverToday(latest.current, dateKey()));
    roll();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') roll();
    });
    return () => sub.remove();
  }, [ready, commit]);

  // 시계 눈금 — 다음 자정(+250ms)과 일요일 18:00 중 먼저 오는 때에 맞춰 다시 건다. 자정에는 '오늘' 정리도 그때 바로.
  const [clock, setClock] = useState(0);
  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const arm = () => {
      if (timer) clearTimeout(timer);
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() + 250;
      const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((7 - now.getDay()) % 7), 18).getTime();
      const next = sunday > now.getTime() ? Math.min(midnight, sunday) : midnight;
      // setTimeout은 2^31-1ms를 넘기면 바로 불리므로, 길어도 하루를 넘지 않는 위 값만 쓴다
      timer = setTimeout(() => {
        commit(rolloverToday(latest.current, dateKey()));
        setClock((c) => c + 1);
        arm();
      }, Math.max(1000, next - now.getTime()));
    };
    arm();
    // 긴 타이머는 기기가 잠든 동안 멈추고 시간대 변경도 모른다 — 화면을 켜 둔 채 날짜가 바뀐 것을 1분마다 확인한다.
    // 날짜가 그대로면 아무것도 하지 않는다(저장·다시 그리기 없음). 시계를 되돌린 날도 rolloverToday가 오늘로 맞춰 다시 돌지 않는다
    const guard = setInterval(() => {
      const k = dateKey();
      if (k === latest.current.todayDate) return;
      commit(rolloverToday(latest.current, k));
      setClock((c) => c + 1);
      arm();
    }, 60_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setClock((c) => c + 1);
        arm();
      }
    });
    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(guard);
      sub.remove();
    };
  }, [ready, commit]);

  const update = useCallback((fn: (d: MandaratDoc) => MandaratDoc) => {
    revRef.current += 1;
    commit(fn(latest.current));
  }, [commit]);
  const revision = useCallback(() => revRef.current, []);

  const editThemes = useCallback(
    (ti: number, fn: (t: Theme) => Theme) =>
      update((d) => ({ ...d, themes: d.themes.map((t, i) => (i === ti ? fn(t) : t)) })),
    [update],
  );

  // 지금 표는 오늘 시작 — 이 표의 집중 시간은 지금까지의 것을 빼고 센다(한 해 돌아보기 · 지난 표)
  const completeOnboarding = useCallback(
    (goal: string) =>
      update((d) => ({ ...d, centerGoal: goal.trim(), onboarded: true, chartStart: dateKey(), focusStart: d.focusMinutes ?? 0 })),
    [update],
  );

  const setCenterGoal = useCallback(
    (goal: string) => update((d) => ({ ...d, centerGoal: goal })),
    [update],
  );

  const setThemeTitle = useCallback(
    (ti: number, title: string) =>
      update((d) => ({ ...d, areasSet: true, themes: d.themes.map((t, i) => (i === ti ? { ...t, title } : t)) })),
    [update],
  );

  const markAreasSet = useCallback(() => {
    if (latest.current.areasSet) return;
    update((d) => (d.areasSet ? d : { ...d, areasSet: true }));
  }, [update]);

  const setActionText = useCallback(
    (ti: number, ai: number, text: string) =>
      editThemes(ti, (t) => ({ ...t, actions: t.actions.map((a, i) => (i === ai ? { ...a, text } : a)) })),
    [editThemes],
  );

  const setActionNote = useCallback(
    (ti: number, ai: number, note: string) =>
      editThemes(ti, (t) => ({ ...t, actions: t.actions.map((a, i) => (i === ai ? { ...a, note } : a)) })),
    [editThemes],
  );

  // 새로 습관이 되는 날을 since로 남긴다(그 전 날은 놓친 날이 아님).
  // 이미 습관이면 요일을 고쳐도 since를 유지하고 지난 일정을 남긴다 — 지난 날은 그때 일정으로 센다(applyConfig)
  const setActionConfig = useCallback(
    (ti: number, ai: number, cfg: KindConfig) => {
      const a = latest.current.themes[ti]?.actions[ai];
      // 유형을 적어 두지 않은 이전 칸도 같은 설정이면 그대로 — 아무것도 안 바꾼 저장이 되돌리기를 막지 않게
      if (!a || (kindOf(a) === cfg.kind && sameConfig(configOf(a), cfg))) return;
      update((d) => configCell(d, ti, ai, cfg, dateKey(), Date.now()));
    },
    [update],
  );

  // 칸을 비우면 그 칸의 지난 기록은 지우지 않고 떼어 둔다 — 같은 칸에 새로 쓴 실천이 이전 체크를 이어받지 않게.
  // 히트맵·주간 합계·영역 연속 기록에는 그대로 남는다(src/lib/history.ts)
  const clearAction = useCallback(
    (ti: number, ai: number) =>
      update((d) => {
        const key = `${ti}-${ai}`;
        return {
          ...d,
          todayKeys: d.todayKeys.filter((k) => k !== key),
          dayLog: archiveCellLog(d.dayLog, key, Date.now()),
          ...withPicksDetached(d, key),
          themes: d.themes.map((t, i) => (i === ti ? { ...t, actions: t.actions.map((x, j) => (j === ai ? clearedAction(x) : x)) } : t)),
        };
      }),
    [update],
  );

  const toggleRoutineToday = useCallback(
    (ti: number, ai: number) =>
      update((d) => ({ ...d, dayLog: toggleDayLog(d.dayLog, `${ti}-${ai}`, dateKey()) })),
    [update],
  );

  const toggleHabitOn = useCallback(
    (ti: number, ai: number, day: string) => {
      if (!canToggleHabitOn(latest.current, ti, ai, day)) return;
      update((d) => (canToggleHabitOn(d, ti, ai, day) ? { ...d, dayLog: toggleDayLog(d.dayLog, `${ti}-${ai}`, day) } : d));
    },
    [update],
  );

  const addCount = useCallback(
    (ti: number, ai: number, delta: number) => update((d) => addCountTo(d, ti, ai, delta, dateKey())),
    [update],
  );

  const rateMind = useCallback(
    (ti: number, ai: number, score: number, on: Date = new Date()) => update((d) => rateWeek(d, ti, ai, score, on)),
    [update],
  );

  // 달성은 오늘 기록에, 풀면 달성을 남겼던 날의 기록을 뺀다(한 번·마음가짐) — src/lib/history.ts toggleCellDone
  const toggleDone = useCallback(
    (ti: number, ai: number) => update((d) => toggleCellDone(d, ti, ai, dateKey())),
    [update],
  );

  const checkToday = useCallback(
    (ti: number, ai: number) => {
      const a = latest.current.themes[ti]?.actions[ai];
      if (!a) return;
      const kind = kindOf(a);
      if (kind === 'habit') toggleRoutineToday(ti, ai);
      else if (kind === 'count') update((d) => toggleCountToday(d, ti, ai, dateKey()));
      else if (kind === 'once') toggleDone(ti, ai);
    },
    [toggleRoutineToday, toggleDone, update],
  );

  const addFocusMinutes = useCallback(
    (minutes: number) =>
      update((d) => ({ ...d, focusMinutes: (d.focusMinutes ?? 0) + Math.max(0, Math.round(minutes)) })),
    [update],
  );

  const toggleToday = useCallback(
    (key: string) =>
      update((d) => {
        const set = new Set(d.todayKeys);
        if (set.has(key)) set.delete(key);
        else set.add(key);
        return { ...d, todayKeys: [...set] };
      }),
    [update],
  );

  const addExtra = useCallback(
    (ti: number, text: string) =>
      update((d) => ({
        ...d,
        todayExtra: [
          ...d.todayExtra,
          { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, ti, text: text.trim(), done: false },
        ],
      })),
    [update],
  );

  // 직접 추가한 할 일도 완료하면 그날 기록(dayLog)에 남겨 연속 기록·히트맵에 반영한다
  const toggleExtra = useCallback(
    (id: string) =>
      update((d) => {
        const x = d.todayExtra.find((e) => e.id === id);
        if (!x) return d;
        const done = !x.done;
        return {
          ...d,
          todayExtra: d.todayExtra.map((e) => (e.id === id ? { ...e, done } : e)),
          dayLog: setDayLog(d.dayLog, extraLogKey(x.ti, x.id), dateKey(), done),
        };
      }),
    [update],
  );

  const removeExtra = useCallback(
    (id: string) =>
      update((d) => {
        const x = d.todayExtra.find((e) => e.id === id);
        if (!x) return d;
        return {
          ...d,
          todayExtra: d.todayExtra.filter((e) => e.id !== id),
          dayLog: setDayLog(d.dayLog, extraLogKey(x.ti, x.id), dateKey(), false),
        };
      }),
    [update],
  );

  // 그 사이의 다른 변경은 건드리지 않고 지운 할 일만 되살린다.
  // 기록은 지운 날짜로 되돌리고, 그새 날짜가 바뀌었으면 끝낸 일은 목록에 다시 넣지 않는다(하루 정리와 같게)
  const restoreExtra = useCallback(
    (x: TodayExtra, index: number, logged: boolean, day: string) =>
      update((d) => {
        if (d.todayExtra.some((e) => e.id === x.id)) return d;
        const dayLog = logged ? setDayLog(d.dayLog, extraLogKey(x.ti, x.id), day, true) : d.dayLog;
        if (x.done && day !== dateKey()) return { ...d, dayLog };
        const list = [...d.todayExtra];
        list.splice(Math.max(0, Math.min(index, list.length)), 0, x);
        return { ...d, todayExtra: list, dayLog };
      }),
    [update],
  );

  const markClosedDay = useCallback(
    (day: string) => {
      if (!DATE_RE.test(day) || latest.current.closedDays?.includes(day)) return;
      update((d) => (d.closedDays?.includes(day) ? d : { ...d, closedDays: cleanClosedDays([...(d.closedDays ?? []), day]) }));
    },
    [update],
  );

  const setDayMood = useCallback(
    (mood: number, day: string = dateKey()) => {
      if (!DATE_RE.test(day)) return;
      update((d) => ({ ...d, dayMeta: { ...d.dayMeta, [day]: { ...d.dayMeta[day], mood } } }));
    },
    [update],
  );

  const setDayReflection = useCallback(
    (text: string, day: string = dateKey()) => {
      if (!DATE_RE.test(day)) return;
      update((d) => ({ ...d, dayMeta: { ...d.dayMeta, [day]: { ...d.dayMeta[day], reflection: text } } }));
    },
    [update],
  );

  // 돌아보기는 저장본 검증과 같은 규칙으로 다듬어 넣고(중점 3칸·메모 120자), 최근 104주만 둔다
  const saveReview = useCallback(
    (week: string, entry: WeekReviewEntry) => {
      const clean = cleanReviewEntry(entry);
      if (!clean || !isMondayKey(week)) return;
      update((d) => ({ ...d, reviews: cleanReviews({ ...(d.reviews ?? {}), [week]: clean }) }));
    },
    [update],
  );

  const setSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) =>
      update((d) => ({ ...d, settings: { ...d.settings, [key]: value } })),
    [update],
  );

  // 예시로 채우기 — 예시의 달성 칸을 오늘 한 것처럼 기록하지 않는다(오늘·이번 주 숫자가 거짓이 되지 않게).
  // 지난 칸 기록은 지우지 않고 떼어 두고, 오늘 담아 둔 실천은 비운다(직접 추가한 할 일은 남긴다)
  const loadSample = useCallback(
    () => {
      dropEditorDraft();
      update((d) => {
        const tk = dateKey();
        return {
          ...d,
          centerGoal: d.centerGoal.trim() ? d.centerGoal : '건강·일·관계 모두 챙기기',
          // 예시 습관은 오늘부터 시작 — 이번 주 지난 날이 놓친 날로 보이지 않게
          themes: sampleThemes().map((t) => ({
            ...t,
            actions: t.actions.map((a) => (isRoutine(a) ? { ...a, since: tk } : a)),
          })),
          todayKeys: [],
          dayLog: archiveAllCells(d.dayLog, Date.now()),
          ...withPicksDetached(d),
          areasSet: true,
          onboarded: true,
        };
      });
    },
    [update],
  );

  const resetAll = useCallback(
    () => {
      dropEditorDraft();
      update((d) => resetDoc(d)); // keep look-and-feel and past charts
    },
    [update],
  );

  // 차트를 통째로 바꾸면 이전 칸 기록은 칸에서 떼어 둔다(지우지 않음). 목표는 ''를 넘기면 그대로
  const applyTemplate = useCallback(
    (centerGoal: string, themes: Theme[]) => {
      dropEditorDraft();
      update((d) => ({
        ...d,
        centerGoal: centerGoal || d.centerGoal,
        themes,
        todayKeys: [],
        todayExtra: [],
        dayLog: archiveAllCells(d.dayLog, Date.now()),
        ...withPicksDetached(d),
        areasSet: true,
        onboarded: true,
      }));
    },
    [update],
  );

  // 통째로 바꿀 때(되돌리기·백업 불러오기)도 오늘 날짜 기준으로 정리해 둔다
  const replaceDoc = useCallback((d: MandaratDoc) => {
    dropEditorDraft();
    revRef.current += 1;
    commit(rolloverToday(d, dateKey()));
  }, [commit]);

  // 지난 표로 닫고 새 표 — 먼저 계산해 보고, 같은 지난 표가 이미 있으면(오늘 시작한 표) 아무것도 바꾸지 않는다
  const startNewChart = useCallback(
    (mode: NewChartMode, opts: { goal: string; note: string }): boolean => {
      const next = nextChart(latest.current, mode, new Date(), opts);
      if (!next) return false;
      dropEditorDraft();
      update(() => next);
      return true;
    },
    [update],
  );

  const dismissRecovered = useCallback(() => setRecoveredCopy(null), []);

  const listSnapshots = useCallback(async (): Promise<SnapshotInfo[]> => {
    try {
      const keys = (await AsyncStorage.getAllKeys()).filter((k) => snapDayOf(k) !== null);
      if (keys.length === 0) return [];
      const out: SnapshotInfo[] = [];
      for (const [key, raw] of await AsyncStorage.multiGet(keys)) {
        const day = snapDayOf(key);
        const d = parseSnapshot(raw);
        if (day && d) out.push({ day, summary: summarize(d) });
      }
      return out.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
    } catch (e) {
      console.warn('[store] snapshot list failed', e);
      return [];
    }
  }, []);

  const readSnapshot = useCallback(async (day: string): Promise<MandaratDoc | null> => {
    if (!DATE_RE.test(day)) return null;
    try {
      const d = parseSnapshot(await AsyncStorage.getItem(`${SNAP_PREFIX}${day}`));
      // 저장본에는 지난 표가 없다 — 지금 지난 표를 다시 붙여 되살려도 잃지 않게
      const archives = latest.current.archives;
      return d && archives ? { ...d, archives } : d;
    } catch (e) {
      console.warn('[store] snapshot read failed', e);
      return null;
    }
  }, []);

  const getDoc = useCallback(() => latest.current, []);

  // 함수는 모두 고정 — 이 객체도 처음 한 번만 만들어진다
  const actions = useMemo<Actions>(
    () => ({
      getDoc, completeOnboarding, setCenterGoal, setThemeTitle, markAreasSet, setActionText, setActionNote, setActionConfig, clearAction,
      toggleDone, toggleRoutineToday, toggleHabitOn, checkToday, addCount, rateMind, addFocusMinutes, toggleToday, addExtra, toggleExtra,
      removeExtra, restoreExtra, markClosedDay, setDayMood, setDayReflection, saveReview, setSetting, loadSample, applyTemplate, resetAll,
      replaceDoc, startNewChart, revision, dismissRecovered, listSnapshots, readSnapshot,
    }),
    [
      getDoc, completeOnboarding, setCenterGoal, setThemeTitle, markAreasSet, setActionText, setActionNote, setActionConfig, clearAction,
      toggleDone, toggleRoutineToday, toggleHabitOn, checkToday, addCount, rateMind, addFocusMinutes, toggleToday, addExtra, toggleExtra,
      removeExtra, restoreExtra, markClosedDay, setDayMood, setDayReflection, saveReview, setSetting, loadSample, applyTemplate, resetAll,
      replaceDoc, startNewChart, revision, dismissRecovered, listSnapshots, readSnapshot,
    ],
  );

  const state = useMemo<DocState>(
    () => ({ doc, ready, storageError, saveFailed, recoveredCopy, clock }),
    [doc, ready, storageError, saveFailed, recoveredCopy, clock],
  );

  const { mood, accent } = doc.settings;
  // goldInk는 지금 고른 포인트 컬러에서 만든다 — 어떤 색을 골라도 글자 대비 4.5:1 이상
  const palette = useMemo<PaletteValue>(() => withAccent(MOODS[mood], accent), [mood, accent]);

  return (
    <ActionsCtx.Provider value={actions}>
      <DocCtx.Provider value={state}>
        <ReadyCtx.Provider value={ready}>
          <PaletteCtx.Provider value={palette}>{children}</PaletteCtx.Provider>
        </ReadyCtx.Provider>
      </DocCtx.Provider>
    </ActionsCtx.Provider>
  );
}

const MISSING = '[store] the doc context is missing — render inside the store provider';

/** 문서와 저장 상태 — 문서가 바뀔 때마다 다시 그려진다 */
export function useDoc(): DocState {
  const ctx = useContext(DocCtx);
  if (!ctx) throw new Error(MISSING);
  return ctx;
}

/** 저장본을 다 읽었는지 — 처음 한 번만 바뀐다. 문서가 바뀌어도 다시 그려지지 않는다 */
export function useReady(): boolean {
  return useContext(ReadyCtx);
}

/** 문서를 바꾸는 함수들 — 늘 같은 객체라 이것만 쓰면 문서가 바뀌어도 다시 그려지지 않는다 */
export function useActions(): Actions {
  const ctx = useContext(ActionsCtx);
  if (!ctx) throw new Error(MISSING);
  return ctx;
}

/** 문서 + 함수들 한꺼번에(예전 모양) — 문서가 바뀔 때마다 다시 그려진다 */
export function useMandarat(): Ctx {
  const state = useDoc();
  const actions = useActions();
  const { todayKeys } = state.doc;
  return useMemo<Ctx>(
    () => ({ ...state, ...actions, inToday: (key: string) => todayKeys.includes(key) }),
    [state, actions, todayKeys],
  );
}

/** 지금 팔레트 — 무드·포인트 컬러가 바뀔 때만 새 객체(그 밖의 문서 변경에는 같은 객체) */
export function usePaletteValue(): PaletteValue {
  return useContext(PaletteCtx);
}

// ── derived selectors (pure, used across screens) ────────────────────────────
export function themeProgress(theme: Theme) {
  const filled = theme.actions.filter((a) => a.text.trim());
  const done = theme.actions.filter((a) => a.done).length;
  const total = 8;
  return { done, total, pct: Math.round((done / total) * 100), filled: filled.length };
}

export function totalDone(doc: MandaratDoc): number {
  return doc.themes.reduce((s, t) => s + t.actions.filter((a) => a.done).length, 0);
}

/** 하나라도 한 날이 이어진 날 수(오늘 또는 어제까지) — 상한 없이 센다. 계산은 src/lib/history.ts activeStreak */
export function overallStreak(doc: Pick<MandaratDoc, 'dayLog'>, now: Date = new Date()): number {
  return activeStreak(doc.dayLog, now);
}

/**
 * 영역별 연속 기록 — 현재·최고 연속 일수와 이번 주(월~일) 기록 여부. 계산은 src/lib/history.ts areaStreak.
 */
export function themeStreak(doc: Pick<MandaratDoc, 'dayLog'>, ti: number, now: Date = new Date()): { cur: number; best: number; week: number[] } {
  return areaStreak(doc.dayLog, ti, now);
}
