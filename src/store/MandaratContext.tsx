import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MandaratDoc, Settings, Theme } from '../types';
import { blankDoc, migrate, sampleThemes, scaffoldThemes } from '../data/defaults';
import { extraLogKey, isRoutine, normalizeDays, rolloverToday, setDayLog, toggleDayLog, ymd } from '../lib/routine';

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
}

const MandaratCtx = createContext<Ctx | null>(null);

export function MandaratProvider({ children }: { children: React.ReactNode }) {
  const [doc, setDoc] = useState<MandaratDoc>(() => blankDoc());
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;

  // load once
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setDoc(rolloverToday(migrate(JSON.parse(raw)), dateKey()));
        }
      } catch (e) {
        console.warn('Mandarat load failed', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // debounced persist
  useEffect(() => {
    if (!ready) return;
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
    if (!ready) return;
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

  const update = useCallback((fn: (d: MandaratDoc) => MandaratDoc) => setDoc((d) => fn(d)), []);

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

  const setActionDays = useCallback(
    (ti: number, ai: number, days: number[]) =>
      editThemes(ti, (t) => ({
        ...t,
        actions: t.actions.map((a, i) => {
          if (i !== ai) return a;
          const next = normalizeDays(days);
          const { days: _drop, ...rest } = a;
          return next.length > 0 ? { ...rest, days: next } : rest;
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
      update((d) => ({
        ...d,
        centerGoal: d.centerGoal || '2026 최고의 나',
        themes: sampleThemes(),
        // rebuild today's log so stats reflect the sample's done items
        dayLog: { ...d.dayLog, [dateKey()]: sampleDoneKeys() },
        onboarded: true,
      })),
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

  const replaceDoc = useCallback((d: MandaratDoc) => setDoc(d), []);

  const value = useMemo<Ctx>(
    () => ({
      doc, ready, completeOnboarding, setCenterGoal, setThemeTitle, setActionText, setActionNote, setActionDays,
      toggleDone, toggleRoutineToday, addFocusMinutes, toggleToday, inToday, addExtra, toggleExtra, removeExtra, setDayMood, setDayReflection,
      setSetting, loadSample, applyTemplate, resetAll, replaceDoc,
    }),
    [
      doc, ready, completeOnboarding, setCenterGoal, setThemeTitle, setActionText, setActionNote, setActionDays,
      toggleDone, toggleRoutineToday, addFocusMinutes, toggleToday, inToday, addExtra, toggleExtra, removeExtra, setDayMood, setDayReflection,
      setSetting, loadSample, applyTemplate, resetAll, replaceDoc,
    ],
  );

  return <MandaratCtx.Provider value={value}>{children}</MandaratCtx.Provider>;
}

function sampleDoneKeys(): string[] {
  const keys: string[] = [];
  sampleThemes().forEach((t, ti) =>
    t.actions.forEach((a, ai) => {
      if (a.done) keys.push(`${ti}-${ai}`);
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
