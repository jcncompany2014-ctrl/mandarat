import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MandaratDoc, Settings, Theme } from '../types';
import { blankDoc, migrate, sampleThemes, scaffoldThemes } from '../data/defaults';

const STORAGE_KEY = 'mandarat:doc:v1';

// ── date helpers ──────────────────────────────────────────────────────────────
export function dateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
  // progress
  toggleDone: (ti: number, ai: number) => void;
  // today
  toggleToday: (key: string) => void;
  inToday: (key: string) => boolean;
  addExtra: (ti: number, text: string) => void;
  toggleExtra: (id: string) => void;
  // day meta
  setDayMood: (mood: number) => void;
  setDayReflection: (text: string) => void;
  // settings
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  // data management
  loadSample: () => void;
  resetAll: () => void;
}

const MandaratCtx = createContext<Ctx | null>(null);

export function MandaratProvider({ children }: { children: React.ReactNode }) {
  const [doc, setDoc] = useState<MandaratDoc>(() => blankDoc());
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // load once
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setDoc(migrate(JSON.parse(raw)));
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

  const toggleDone = useCallback(
    (ti: number, ai: number) =>
      update((d) => {
        const nowDone = !d.themes[ti].actions[ai].done;
        const key = `${ti}-${ai}`;
        const today = dateKey();
        const log = { ...d.dayLog };
        const todays = new Set(log[today] ?? []);
        if (nowDone) todays.add(key);
        else todays.delete(key);
        log[today] = [...todays];
        return {
          ...d,
          dayLog: log,
          themes: d.themes.map((t, i) =>
            i === ti
              ? { ...t, actions: t.actions.map((a, j) => (j === ai ? { ...a, done: nowDone } : a)) }
              : t,
          ),
        };
      }),
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
        todayExtra: [...d.todayExtra, { id: String(Date.now()), ti, text: text.trim(), done: false }],
      })),
    [update],
  );

  const toggleExtra = useCallback(
    (id: string) =>
      update((d) => ({
        ...d,
        todayExtra: d.todayExtra.map((x) => (x.id === id ? { ...x, done: !x.done } : x)),
      })),
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

  const value = useMemo<Ctx>(
    () => ({
      doc, ready, completeOnboarding, setCenterGoal, setThemeTitle, setActionText, setActionNote,
      toggleDone, toggleToday, inToday, addExtra, toggleExtra, setDayMood, setDayReflection,
      setSetting, loadSample, resetAll,
    }),
    [
      doc, ready, completeOnboarding, setCenterGoal, setThemeTitle, setActionText, setActionNote,
      toggleDone, toggleToday, inToday, addExtra, toggleExtra, setDayMood, setDayReflection,
      setSetting, loadSample, resetAll,
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
