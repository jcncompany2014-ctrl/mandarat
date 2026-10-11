import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MandaratDoc, Settings, Theme, TodayExtra } from '../types';
import { blankDoc, migrate, sampleThemes, scaffoldThemes } from '../data/defaults';
import { extraLogKey, isRoutine, normalizeDays, rolloverToday, sameDays, setDayLog, toggleDayLog, ymd } from '../lib/routine';

const STORAGE_KEY = 'mandarat:doc:v1';

// ── date helpers ──────────────────────────────────────────────────────────────
export function dateKey(d = new Date()): string {
  return ymd(d);
}

export function lastNDates(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(dateKey(d));
  }
  return out;
}

// ── context shape ─────────────────────────────────────────────────────────────
interface Ctx {
  doc: MandaratDoc;
  ready: boolean;
  // onboarding
  completeOnboarding: (goal: string) => void;
  // editing
  setCenterGoal: (goal: string) => void;
  setThemeTitle: (ti: number, title: string) => void;
  setActionText: (ti: number, ai: number, text: string) => void;
  setActionNote: (ti: number, ai: number, note: string) => void;
  /** 반복 요일 설정 (빈 배열이면 루틴 해제) */
  setActionDays: (ti: number, ai: number, days: number[]) => void;
  // progress
  toggleDone: (ti: number, ai: number) => void;
  /** 루틴의 오늘 체크만 토글 (영구 달성 done은 그대로) */
  toggleRoutineToday: (ti: number, ai: number) => void;
  addFocusMinutes: (minutes: number) => void;
  // today
  toggleToday: (key: string) => void;
  inToday: (key: string) => boolean;
  addExtra: (ti: number, text: string) => void;
  toggleExtra: (id: string) => void;
  removeExtra: (id: string) => void;
  /** 지운 할 일을 원래 자리로 되살린다 (되돌리기) — day: 지울 때의 날짜 */
  restoreExtra: (x: TodayExtra, index: number, logged: boolean, day: string) => void;
  // day meta
  setDayMood: (mood: number) => void;
  setDayReflection: (text: string) => void;
  // settings
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  // data management
  loadSample: () => void;
  applyTemplate: (centerGoal: string, themes: Theme[]) => void;
  resetAll: () => void;
  replaceDoc: (d: MandaratDoc) => void;
  /** 편집 횟수 — 통째 되돌리기 전에 그 사이 다른 변경이 있었는지 확인하는 데 쓴다 */
  revision: () => number;
  /** 저장소를 읽거나 쓰지 못해 이번 실행의 변경을 저장하지 않는 중 */
  storageError: boolean;
}

const MandaratCtx = createContext<Ctx | null>(null);

export function MandaratProvider({ children }: { children: React.ReactNode }) {
  const [doc, setDoc] = useState<MandaratDoc>(() => blankDoc());
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;
  const revRef = useRef(0);
  // 저장본을 읽지 못했다면(저장소 오류) 빈 문서로 덮어쓰지 않도록 이번 세션은 저장하지 않는다
  const blockSave = useRef(false);

  // load once
  useEffect(() => {
    (async () => {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(STORAGE_KEY);
      } catch (e) {
        console.warn('Mandarat load failed', e);
        blockSave.current = true;
      }
      if (raw) {
        try {
          setDoc(rolloverToday(migrate(JSON.parse(raw)), dateKey()));
        } catch (e) {
          // 깨진 저장본은 따로 보관해 두고 새로 시작한다 — 보관도 못 하면 원본을 덮어쓰지 않는다
          console.warn('Mandarat parse failed — keeping a copy', e);
          try {
            await AsyncStorage.setItem(`${STORAGE_KEY}:corrupt`, raw);
          } catch {
            blockSave.current = true;
          }
        }
      }
      if (blockSave.current) setStorageError(true);
      setReady(true);
    })();
  }, []);

  // debounced persist
  useEffect(() => {
    if (!ready || blockSave.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(doc)).catch((e) =>
        console.warn('Mandarat save failed', e),
      );
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [doc, ready]);

  // flush immediately when the app goes to background (avoid losing the last <300ms of edits)
  useEffect(() => {
    if (!ready || blockSave.current) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(docRef.current)).catch((e) =>
          console.warn('Mandarat flush failed', e),
        );
      }
    });
    return () => sub.remove();
  }, [ready]);

  // 날짜가 바뀌면 '오늘' 목록 정리 — 앱으로 돌아올 때 + 켜 둔 채 자정을 넘길 때(1분 간격 확인)
  useEffect(() => {
    if (!ready) return;
    const roll = () => setDoc((d) => rolloverToday(d, dateKey()));
    roll();
    const timer = setInterval(roll, 60_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') roll();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [ready]);

  const update = useCallback((fn: (d: MandaratDoc) => MandaratDoc) => {
    revRef.current += 1;
    setDoc((d) => fn(d));
  }, []);
  const revision = useCallback(() => revRef.current, []);

  const editThemes = useCallback(
    (ti: number, fn: (t: Theme) => Theme) =>
      update((d) => ({ ...d, themes: d.themes.map((t, i) => (i === ti ? fn(t) : t)) })),
    [update],
  );

  const completeOnboarding = useCallback(
    (goal: string) => update((d) => ({ ...d, centerGoal: goal.trim() || '나의 핵심 목표', onboarded: true })),
    [update],
  );

  const setCenterGoal = useCallback(
    (goal: string) => update((d) => ({ ...d, centerGoal: goal })),
    [update],
  );

  const setThemeTitle = useCallback(
    (ti: number, title: string) => editThemes(ti, (t) => ({ ...t, title })),
    [editThemes],
  );

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

  // 새로 루틴이 되는 날을 since로 남긴다(그 전 날은 놓친 날이 아님).
  // 이미 루틴이면 요일을 고쳐도 since를 유지 — 요일 칩을 껐다 켜도 이번 주 기록이 흔들리지 않게
  const setActionDays = useCallback(
    (ti: number, ai: number, days: number[]) =>
      editThemes(ti, (t) => ({
        ...t,
        actions: t.actions.map((a, i) => {
          if (i !== ai || sameDays(a.days, days)) return a;
          const next = normalizeDays(days);
          const { days: _d, since: _s, ...rest } = a;
          if (next.length === 0) return rest;
          const since = isRoutine(a) ? a.since : dateKey();
          return { ...rest, days: next, ...(since ? { since } : {}) };
        }),
      })),
    [editThemes],
  );

  const toggleRoutineToday = useCallback(
    (ti: number, ai: number) =>
      update((d) => ({ ...d, dayLog: toggleDayLog(d.dayLog, `${ti}-${ai}`, dateKey()) })),
    [update],
  );

  const toggleDone = useCallback(
    (ti: number, ai: number) =>
      update((d) => {
        const a = d.themes[ti]?.actions[ai];
        if (!a) return d;
        const nowDone = !a.done;
        // 루틴의 칸 달성은 하루 체크와 별개 — 루틴이 아닐 때만 오늘 실천 기록에 남긴다
        const dayLog = isRoutine(a) ? d.dayLog : setDayLog(d.dayLog, `${ti}-${ai}`, dateKey(), nowDone);
        return {
          ...d,
          dayLog,
          themes: d.themes.map((t, i) =>
            i === ti
              ? { ...t, actions: t.actions.map((x, j) => (j === ai ? { ...x, done: nowDone } : x)) }
              : t,
          ),
        };
      }),
    [update],
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

  const inToday = useCallback((key: string) => doc.todayKeys.includes(key), [doc.todayKeys]);

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

  const setDayMood = useCallback(
    (mood: number) =>
      update((d) => {
        const k = dateKey();
        return { ...d, dayMeta: { ...d.dayMeta, [k]: { ...d.dayMeta[k], mood } } };
      }),
    [update],
  );

  const setDayReflection = useCallback(
    (text: string) =>
      update((d) => {
        const k = dateKey();
        return { ...d, dayMeta: { ...d.dayMeta, [k]: { ...d.dayMeta[k], reflection: text } } };
      }),
    [update],
  );

  const setSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) =>
      update((d) => ({ ...d, settings: { ...d.settings, [key]: value } })),
    [update],
  );

  const loadSample = useCallback(
    () =>
      update((d) => {
        const tk = dateKey();
        return {
          ...d,
          centerGoal: d.centerGoal || '2026 최고의 나',
          // 예시 루틴은 오늘부터 시작 — 이번 주 지난 날이 놓친 날로 보이지 않게
          themes: sampleThemes().map((t) => ({
            ...t,
            actions: t.actions.map((a) => (isRoutine(a) ? { ...a, since: tk } : a)),
          })),
          // 예시의 달성 칸을 오늘 기록에 더한다(기존 기록은 지우지 않고, 루틴은 체크하지 않는다)
          dayLog: { ...d.dayLog, [tk]: [...new Set([...(d.dayLog[tk] ?? []), ...sampleDoneKeys()])] },
          onboarded: true,
        };
      }),
    [update],
  );

  const resetAll = useCallback(
    () =>
      update((d) => ({
        ...blankDoc(),
        settings: d.settings, // keep look-and-feel
      })),
    [update],
  );

  const applyTemplate = useCallback(
    (centerGoal: string, themes: Theme[]) =>
      update((d) => ({
        ...d,
        centerGoal: centerGoal || d.centerGoal,
        themes,
        todayKeys: [],
        todayExtra: [],
        onboarded: true,
      })),
    [update],
  );

  // 통째로 바꿀 때(되돌리기·백업 불러오기)도 오늘 날짜 기준으로 정리해 둔다
  const replaceDoc = useCallback((d: MandaratDoc) => {
    revRef.current += 1;
    setDoc(rolloverToday(d, dateKey()));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      doc, ready, completeOnboarding, setCenterGoal, setThemeTitle, setActionText, setActionNote, setActionDays,
      toggleDone, toggleRoutineToday, addFocusMinutes, toggleToday, inToday, addExtra, toggleExtra, removeExtra, restoreExtra, setDayMood, setDayReflection,
      setSetting, loadSample, applyTemplate, resetAll, replaceDoc, revision, storageError,
    }),
    [
      doc, ready, completeOnboarding, setCenterGoal, setThemeTitle, setActionText, setActionNote, setActionDays,
      toggleDone, toggleRoutineToday, addFocusMinutes, toggleToday, inToday, addExtra, toggleExtra, removeExtra, restoreExtra, setDayMood, setDayReflection,
      setSetting, loadSample, applyTemplate, resetAll, replaceDoc, revision, storageError,
    ],
  );

  return <MandaratCtx.Provider value={value}>{children}</MandaratCtx.Provider>;
}

function sampleDoneKeys(): string[] {
  const keys: string[] = [];
  sampleThemes().forEach((t, ti) =>
    t.actions.forEach((a, ai) => {
      if (a.done && !isRoutine(a)) keys.push(`${ti}-${ai}`);
    }),
  );
  return keys;
}

export function useMandarat(): Ctx {
  const ctx = useContext(MandaratCtx);
  if (!ctx) throw new Error('useMandarat must be used within MandaratProvider');
  return ctx;
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

/** Consecutive days (ending today or yesterday) with at least one completion. */
export function overallStreak(doc: MandaratDoc): number {
  let streak = 0;
  const today = new Date();
  // allow today to be empty without breaking a streak that ran through yesterday
  let started = (doc.dayLog[dateKey(today)] ?? []).length > 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const has = (doc.dayLog[dateKey(d)] ?? []).length > 0;
    if (i === 0 && !has) {
      started = false;
      continue; // skip empty today
    }
    if (has) {
      streak++;
      started = true;
    } else if (started) {
      break;
    } else {
      break;
    }
  }
  return streak;
}

/** Per-theme streak based on theme-tagged completions in the day log. */
export function themeStreak(doc: MandaratDoc, ti: number): { cur: number; best: number; week: number[] } {
  const prefix = `${ti}-`;
  const dayHas = (k: string) => (doc.dayLog[k] ?? []).some((x) => x.startsWith(prefix));
  // current streak
  let cur = 0;
  const today = new Date();
  for (let i = 0; i < 400; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const has = dayHas(dateKey(d));
    if (i === 0 && !has) continue;
    if (has) cur++;
    else break;
  }
  // best streak over the recorded window
  let best = 0, run = 0;
  const days = lastNDates(120);
  for (const k of days) {
    if (dayHas(k)) {
      run++;
      best = Math.max(best, run);
    } else run = 0;
  }
  best = Math.max(best, cur);
  const week = lastNDates(7).map((k) => (dayHas(k) ? 1 : 0));
  return { cur, best, week };
}
